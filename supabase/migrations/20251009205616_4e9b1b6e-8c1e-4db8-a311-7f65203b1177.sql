-- Create pins table for storing memory locations
CREATE TABLE public.pins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  pin_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  share_token TEXT UNIQUE,
  radius INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create files table for storing file metadata
CREATE TABLE public.files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pin_id UUID NOT NULL REFERENCES public.pins(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pins
-- Anyone can view public pins
CREATE POLICY "Public pins are viewable by everyone"
ON public.pins
FOR SELECT
USING (is_public = true);

-- Authenticated users can view their own pins
CREATE POLICY "Users can view their own pins"
ON public.pins
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Anyone can view pins with valid share token
CREATE POLICY "Pins with share token are viewable"
ON public.pins
FOR SELECT
USING (share_token IS NOT NULL);

-- Anyone can create pins (for anonymous users)
CREATE POLICY "Anyone can create pins"
ON public.pins
FOR INSERT
WITH CHECK (true);

-- Users can update their own pins
CREATE POLICY "Users can update their own pins"
ON public.pins
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own pins
CREATE POLICY "Users can delete their own pins"
ON public.pins
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for files
-- Anyone can view files of public pins
CREATE POLICY "Files of public pins are viewable"
ON public.files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pins
    WHERE pins.id = files.pin_id
    AND pins.is_public = true
  )
);

-- Anyone can view files of pins with share token
CREATE POLICY "Files of shared pins are viewable"
ON public.files
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.pins
    WHERE pins.id = files.pin_id
    AND pins.share_token IS NOT NULL
  )
);

-- Authenticated users can view files of their own pins
CREATE POLICY "Users can view files of their own pins"
ON public.files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.pins
    WHERE pins.id = files.pin_id
    AND pins.user_id = auth.uid()
  )
);

-- Anyone can insert files (for anonymous users)
CREATE POLICY "Anyone can insert files"
ON public.files
FOR INSERT
WITH CHECK (true);

-- Create storage bucket for memory files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'memory-files',
  'memory-files',
  true,
  52428800,
  ARRAY['image/*', 'video/*', 'audio/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Storage policies for memory-files bucket
CREATE POLICY "Public files are accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'memory-files');

CREATE POLICY "Anyone can upload files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'memory-files');

CREATE POLICY "Anyone can update their files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'memory-files');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pins_updated_at
BEFORE UPDATE ON public.pins
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for location-based queries
CREATE INDEX idx_pins_location ON public.pins(lat, lng);
CREATE INDEX idx_pins_share_token ON public.pins(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX idx_files_pin_id ON public.files(pin_id);