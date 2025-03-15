-- First, disable RLS to ensure clean state
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view profiles from same institution" ON public.user_profiles;

-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policies
CREATE POLICY "Enable read for users"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Enable insert for users"
    ON public.user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "Enable update for users"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Enable delete for users"
    ON public.user_profiles FOR DELETE
    TO authenticated
    USING (id = auth.uid()); 