-- Remove foreign key constraint on pins.user_id
-- This allows pins to be created without authenticated users
ALTER TABLE public.pins DROP CONSTRAINT IF EXISTS pins_user_id_fkey;

-- Add a comment to document the design decision
COMMENT ON COLUMN public.pins.user_id IS 'Optional user ID - can be null for unauthenticated device-based pins';