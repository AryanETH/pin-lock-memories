-- Create table for location-based statistics (likes, shares, saves)
CREATE TABLE IF NOT EXISTS public.location_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  place_name TEXT NOT NULL,
  likes INTEGER DEFAULT 0 NOT NULL,
  shares INTEGER DEFAULT 0 NOT NULL,
  saves INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(lat, lng)
);

-- Enable RLS
ALTER TABLE public.location_stats ENABLE ROW LEVEL SECURITY;

-- Everyone can view location stats
CREATE POLICY "Location stats are viewable by everyone"
  ON public.location_stats
  FOR SELECT
  USING (true);

-- Anyone can insert new location stats
CREATE POLICY "Anyone can insert location stats"
  ON public.location_stats
  FOR INSERT
  WITH CHECK (true);

-- Anyone can update location stats
CREATE POLICY "Anyone can update location stats"
  ON public.location_stats
  FOR UPDATE
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_location_stats_updated_at
  BEFORE UPDATE ON public.location_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_stats;