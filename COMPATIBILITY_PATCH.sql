-- Run this once AFTER Part 7
-- Keeps the current signup page compatible with the new schema.

CREATE OR REPLACE FUNCTION public.student_exists(
    p_email TEXT,
    p_student_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE (p_email IS NOT NULL AND LOWER(email)=LOWER(TRIM(p_email)))
           OR (p_student_code IS NOT NULL AND (student_code=TRIM(p_student_code) OR phone_number=TRIM(p_student_code)))
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_exists(TEXT,TEXT) TO anon, authenticated;
