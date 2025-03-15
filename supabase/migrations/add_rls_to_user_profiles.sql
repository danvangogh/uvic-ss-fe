-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view profiles from same institution" ON public.user_profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
    ON public.user_profiles FOR DELETE
    TO authenticated
    USING (id = auth.uid());

-- Allow users to view profiles from their own institution
CREATE POLICY "Users can view profiles from same institution"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (
        institution_id IN (
            SELECT institution_id 
            FROM public.user_profiles 
            WHERE id = auth.uid()
        )
    ); 