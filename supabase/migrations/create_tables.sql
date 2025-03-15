-- Create institutions table
CREATE TABLE IF NOT EXISTS institutions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  institution_name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role_name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create pricing_tiers table
CREATE TABLE IF NOT EXISTS pricing_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tier_name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create user_profiles table to extend auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  institution_id UUID REFERENCES institutions(id),
  role_id UUID REFERENCES roles(id),
  pricing_tier_id UUID REFERENCES pricing_tiers(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert default roles
INSERT INTO roles (role_name) VALUES
  ('Researcher/Faculty'),
  ('Communications/Marketing'),
  ('Co-op Student'),
  ('Other')
ON CONFLICT (role_name) DO NOTHING;

-- Insert default pricing tier
INSERT INTO pricing_tiers (tier_name) VALUES
  ('free')
ON CONFLICT (tier_name) DO NOTHING;

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_user_profile();

-- Create function to handle user profile creation/update
CREATE OR REPLACE FUNCTION handle_user_profile() 
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Create trigger to create user profile after user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_profile(); 