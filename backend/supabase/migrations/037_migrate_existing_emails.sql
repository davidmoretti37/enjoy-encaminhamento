-- Migration: Migrate existing emails from companies.email to company_emails table

-- Insert existing emails into company_emails table
-- This handles emails that may be separated by newlines, commas, or semicolons
DO $$
DECLARE
    company_record RECORD;
    email_item TEXT;
    email_array TEXT[];
    is_first BOOLEAN;
BEGIN
    -- Loop through all companies that have an email
    FOR company_record IN
        SELECT id, email
        FROM public.companies
        WHERE email IS NOT NULL AND email != ''
    LOOP
        -- Check if this company already has emails in company_emails table
        IF NOT EXISTS (SELECT 1 FROM public.company_emails WHERE company_id = company_record.id) THEN
            -- Split the email field by newlines, commas, and semicolons
            -- First replace all separators with a common one (newline), then split
            email_array := string_to_array(
                regexp_replace(
                    regexp_replace(
                        regexp_replace(company_record.email, E'\\r\\n', E'\n', 'g'),
                        ',', E'\n', 'g'
                    ),
                    ';', E'\n', 'g'
                ),
                E'\n'
            );

            is_first := TRUE;

            -- Insert each email
            FOREACH email_item IN ARRAY email_array
            LOOP
                -- Trim whitespace and skip empty entries
                email_item := TRIM(email_item);

                IF email_item != '' AND email_item ~ '^[^@]+@[^@]+\.[^@]+$' THEN
                    INSERT INTO public.company_emails (company_id, label, email, is_primary)
                    VALUES (
                        company_record.id,
                        CASE WHEN is_first THEN 'Principal' ELSE 'Adicional' END,
                        email_item,
                        is_first
                    );
                    is_first := FALSE;
                END IF;
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- Show count of migrated emails
DO $$
DECLARE
    email_count INTEGER;
    company_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO email_count FROM public.company_emails;
    SELECT COUNT(DISTINCT company_id) INTO company_count FROM public.company_emails;
    RAISE NOTICE 'Migrated % emails for % companies', email_count, company_count;
END $$;
