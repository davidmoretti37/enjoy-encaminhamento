# 🔄 Migration History & Database Evolution

## Overview

This document tracks all database migrations applied to the recruitment platform, documenting the evolution from MySQL/Drizzle to Supabase/PostgreSQL and the implementation of the franchise structure.

---

## Migration Timeline

### 000_cleanup.sql
**Date:** 2025-01-10
**Status:** ✅ Completed
**Purpose:** Clean slate - Remove all existing tables, types, and policies

**What it does:**
- Drops all 10 existing tables (notifications, documents, feedback, payments, contracts, applications, jobs, candidates, companies, users)
- Drops all enum types (17 types including user_role, job_type, application_status, etc.)
- Drops all custom functions
- Drops all RLS policies
- Provides fresh start for new schema

**When to run:** Only when doing a complete database reset

```sql
-- Example of cleanup
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
-- ... drops all tables
DROP TYPE IF EXISTS user_role CASCADE;
-- ... drops all enums
```

---

### 001_initial_schema.sql
**Date:** 2025-01-10
**Status:** ✅ Completed
**Purpose:** Create complete PostgreSQL schema with Supabase best practices

**What it does:**
- Creates 10 core tables: users, companies, candidates, jobs, applications, contracts, feedback, payments, documents, notifications
- Creates 16 enum types for type safety
- Sets up UUID primary keys (Supabase best practice)
- Implements Row Level Security (RLS) policies for all tables
- Creates indexes for performance
- Sets up triggers for updated_at columns
- Implements proper foreign key constraints

**Key Tables Created:**

1. **users** - Core user authentication and roles
   - Links to Supabase auth.users
   - Stores role, profile info, timestamps

2. **companies** - Company/School profiles
   - Company details, size, industry
   - Status tracking (active, inactive, pending)

3. **candidates** - Candidate profiles
   - Personal info, education, skills
   - Work experience, languages
   - Availability and preferences

4. **jobs** - Job postings
   - Job details, requirements, benefits
   - Status tracking (open, closed, filled)
   - AI match scoring support

5. **applications** - Job applications
   - Candidate-job relationship
   - Application status pipeline
   - Interview scheduling

6. **contracts** - Employment contracts
   - Contract terms, dates, salary
   - Digital signature support
   - Contract type (CLT, internship, menor aprendiz)

7. **feedback** - Monthly performance reviews
   - Performance ratings
   - Comments and notes
   - Action tracking

8. **payments** - Financial tracking
   - Payment records
   - Status and method tracking
   - Due dates and amounts

9. **documents** - Document management
   - File storage references
   - Document types and categories

10. **notifications** - User notifications
    - Notification delivery
    - Read/unread tracking

**RLS Policies:**
- Users can only see their own data
- Companies can manage their jobs and applications
- Candidates can see their applications and contracts
- Admins have full access

---

### 002_franchise_structure.sql (DEPRECATED)
**Date:** 2025-01-10
**Status:** ❌ Failed - Do not use
**Purpose:** First attempt to implement franchise hierarchy

**Issue encountered:**
```
ERROR: 0A000: cannot alter type of a column used in a policy definition
```

**Why it failed:**
- Attempted to ALTER the role column type while RLS policies were referencing it
- PostgreSQL doesn't allow altering enum types when they're used in active policies

**Lesson learned:** Must drop policies before altering enum-based columns

---

### 002_franchise_structure_fixed.sql (DEPRECATED)
**Date:** 2025-01-10
**Status:** ❌ Failed - Do not use
**Purpose:** Second attempt with policy dropping

**Issue encountered:**
```
ERROR: 42703: column "role" does not exist
LINE 63: CASE role::text
```

**Why it failed:**
- Dropped policies successfully
- But the ALTER TYPE approach still caused issues
- Column reference was lost during type change

**Lesson learned:** Need a different approach - temporary column strategy

---

### 002_franchise_v3.sql ✅ **CURRENT VERSION**
**Date:** 2025-01-10
**Status:** ✅ Ready to use
**Purpose:** Successfully implement franchise hierarchy with temporary column technique

**What it does:**

1. **Drops all RLS policies** (31 policies)
   - Cleanly removes all policy dependencies
   - Allows safe column manipulation

2. **Uses temporary column technique**
   ```sql
   -- Step 1: Add temporary text column
   ALTER TABLE public.users ADD COLUMN role_text TEXT;

   -- Step 2: Copy existing role values
   UPDATE public.users SET role_text = role::text;

   -- Step 3: Drop the role column
   ALTER TABLE public.users DROP COLUMN role;

   -- Step 4: Drop old enum type
   DROP TYPE IF EXISTS user_role CASCADE;

   -- Step 5: Create new enum with franchise roles
   CREATE TYPE user_role AS ENUM ('super_admin', 'affiliate', 'school', 'candidate');

   -- Step 6: Add role column back with new type
   ALTER TABLE public.users ADD COLUMN role user_role NOT NULL DEFAULT 'candidate';

   -- Step 7: Migrate data with proper mapping
   UPDATE public.users SET role = CASE role_text
     WHEN 'admin' THEN 'super_admin'::user_role
     WHEN 'company' THEN 'school'::user_role
     WHEN 'candidate' THEN 'candidate'::user_role
     WHEN 'staff' THEN 'affiliate'::user_role
     ELSE 'candidate'::user_role
   END;

   -- Step 8: Drop temporary column
   ALTER TABLE public.users DROP COLUMN role_text;
   ```

3. **Creates affiliates table**
   - Affiliate profiles (recruiters/franchise partners)
   - Region and commission rate tracking
   - Created by super_admin
   - Links to user account

4. **Renames companies → schools**
   - More appropriate naming for educational recruitment
   - Updates all column names (company_name → school_name)
   - Renames enum types (company_size → school_size)

5. **Adds affiliate relationships**
   - schools.affiliate_id → Links school to managing affiliate
   - schools.created_by → Tracks who created the school
   - contracts.affiliate_id → Links contracts to affiliate
   - jobs.posted_by_user_id → Tracks job poster

6. **Updates all foreign key references**
   - company_id → school_id in jobs, contracts, payments, feedback
   - Maintains referential integrity

7. **Creates new indexes**
   ```sql
   CREATE INDEX idx_schools_affiliate_id ON public.schools(affiliate_id);
   CREATE INDEX idx_affiliates_user_id ON public.affiliates(user_id);
   CREATE INDEX idx_jobs_posted_by_user_id ON public.jobs(posted_by_user_id);
   ```

8. **Recreates all RLS policies with franchise logic**
   - Super admins can see everything
   - Affiliates can see their schools and related data
   - Schools can see their own data
   - Candidates can see their own applications

9. **Example RLS policy:**
   ```sql
   CREATE POLICY "Schools, affiliates, and super admins can view" ON public.schools
     FOR SELECT USING (
       auth.uid() = user_id OR
       EXISTS (SELECT 1 FROM public.affiliates WHERE id = schools.affiliate_id AND user_id = auth.uid()) OR
       EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
     );
   ```

**New Hierarchy:**
```
Super Admin (Franchise Owner)
└── Affiliate 1 (Recruiter)
    ├── School A
    │   ├── Job 1
    │   │   └── Applications
    │   └── Job 2
    └── School B
        └── Job 3
```

---

## How to Run Migrations

### Prerequisites
1. Supabase project created
2. Access to SQL Editor: https://app.supabase.com/project/YOUR_PROJECT/sql

### Step-by-Step Process

#### 1. Clean Database (if needed)
```sql
-- Run 000_cleanup.sql
-- Only if you need to reset everything
```

#### 2. Create Initial Schema
```sql
-- Run 001_initial_schema.sql
-- Creates all tables, types, policies
```

#### 3. Implement Franchise Structure
```sql
-- Run 002_franchise_v3.sql
-- Updates roles, creates affiliates, renames companies to schools
```

#### 4. Verify Migration
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should see: affiliates, applications, candidates, contracts, documents,
--             feedback, jobs, notifications, payments, schools, users

-- Check new roles exist
SELECT DISTINCT role FROM public.users;
-- Should see: super_admin, affiliate, school, candidate

-- Check schools table (not companies)
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'companies';
-- Should return 0

SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'schools';
-- Should return 1
```

#### 5. Create Super Admin User
```sql
-- Update your admin user
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'admin@agencianacional.com';

-- Or insert if doesn't exist
INSERT INTO public.users (id, email, role, name, phone, created_at, updated_at)
VALUES (
  'your-auth-user-id',
  'admin@agencianacional.com',
  'super_admin',
  'Admin User',
  '+1234567890',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
```

---

## Current Schema State

### Tables (10)
1. users
2. affiliates ⭐ NEW
3. schools (formerly companies)
4. candidates
5. jobs
6. applications
7. contracts
8. feedback
9. payments
10. documents
11. notifications

### Enums (16)
- user_role: `super_admin`, `affiliate`, `school`, `candidate` ⭐ UPDATED
- school_size: `1-10`, `11-50`, `51-200`, `201-500`, `500+` ⭐ RENAMED
- school_status: `active`, `inactive`, `pending` ⭐ RENAMED
- job_type: `CLT`, `internship`, `menor_aprendiz`, `temporary`
- job_mode: `remote`, `hybrid`, `onsite`
- contract_type: `CLT`, `internship`, `menor_aprendiz`, `temporary`
- application_status: `pending`, `reviewing`, `interviewing`, `offered`, `accepted`, `rejected`, `withdrawn`
- payment_status: `pending`, `paid`, `failed`, `refunded`
- payment_method: `credit_card`, `debit`, `bank_transfer`, `boleto`, `pix`
- feedback_rating: `excellent`, `good`, `average`, `poor`, `very_poor`
- document_category: `contract`, `certificate`, `identification`, `resume`, `other`
- notification_type: `application`, `job`, `contract`, `payment`, `system`
- education_level: `fundamental`, `medio`, `superior_cursando`, `superior_completo`, `pos_graduacao`, `mestrado`, `doutorado`
- experience_level: `none`, `junior`, `mid`, `senior`, `expert`
- language_level: `basic`, `intermediate`, `advanced`, `fluent`, `native`
- availability: `immediate`, `two_weeks`, `one_month`, `negotiable`

### RLS Policies
- 31 total policies covering all tables
- Franchise hierarchy permissions implemented
- Super admin has full access
- Affiliates can manage their schools
- Schools can manage their jobs and applications
- Candidates can manage their profiles and applications

---

## Rollback Procedures

### If Migration Fails

1. **Identify what was created:**
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e';
```

2. **Run cleanup:**
```sql
-- Use 000_cleanup.sql to remove everything
```

3. **Start fresh:**
```sql
-- Run 001_initial_schema.sql
-- Then run 002_franchise_v3.sql
```

### Partial Rollback (Franchise → Original)

If you need to revert franchise changes:

```sql
-- 1. Rename schools back to companies
ALTER TABLE public.schools RENAME TO companies;
ALTER TABLE public.companies RENAME COLUMN school_name TO company_name;
ALTER TABLE public.companies RENAME COLUMN school_size TO company_size;
ALTER TYPE school_size RENAME TO company_size;
ALTER TYPE school_status RENAME TO company_status;

-- 2. Rename foreign keys back
ALTER TABLE public.jobs RENAME COLUMN school_id TO company_id;
ALTER TABLE public.contracts RENAME COLUMN school_id TO company_id;
ALTER TABLE public.payments RENAME COLUMN school_id TO company_id;
ALTER TABLE public.feedback RENAME COLUMN school_id TO company_id;

-- 3. Remove franchise columns
ALTER TABLE public.companies DROP COLUMN affiliate_id;
ALTER TABLE public.companies DROP COLUMN created_by;
ALTER TABLE public.jobs DROP COLUMN posted_by_user_id;
ALTER TABLE public.contracts DROP COLUMN affiliate_id;

-- 4. Drop affiliates table
DROP TABLE public.affiliates CASCADE;

-- 5. Revert roles
-- Use same temporary column technique from 002_franchise_v3.sql
-- but map: super_admin→admin, school→company
```

---

## Troubleshooting Common Issues

### Issue: "cannot alter type of a column used in a policy"
**Solution:** Always drop policies before altering enum-based columns. See 002_franchise_v3.sql for proper approach.

### Issue: "column does not exist" after enum change
**Solution:** Use temporary column technique to preserve data during type changes.

### Issue: RLS blocks all queries
**Solution:** Check if policies were recreated. Run verification queries:
```sql
SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';
```

### Issue: Foreign key constraint violations
**Solution:** Ensure child records are updated before parent table changes:
```sql
-- Check for orphaned records
SELECT j.id, j.school_id FROM jobs j
LEFT JOIN schools s ON j.school_id = s.id
WHERE s.id IS NULL;
```

---

## Future Migrations

### Planned Enhancements

1. **Candidate Testing System**
   - Add tests table
   - Add test_results table
   - Add questionnaires table

2. **AI Matching Configuration**
   - Add matching_rules table
   - Add matching_logs table
   - Add scoring_weights table

3. **Contract Templates**
   - Add contract_templates table
   - Add template_variables table

4. **Payment Gateway Integration**
   - Add payment_methods table (stored payment info)
   - Add subscriptions table
   - Add invoices table

5. **Communication Logs**
   - Add emails_sent table
   - Add sms_sent table
   - Add whatsapp_messages table

### Migration Best Practices

1. **Always test in development first**
2. **Back up production database before migrations**
3. **Use transactions for complex migrations**
4. **Document all changes**
5. **Version migrations sequentially**
6. **Include rollback procedures**
7. **Test RLS policies after migrations**
8. **Verify data integrity after completion**

---

## References

- **Supabase URL:** https://jpdqxjaosattvzjjumxz.supabase.co
- **SQL Editor:** https://app.supabase.com/project/jpdqxjaosattvzjjumxz/sql
- **Table Editor:** https://app.supabase.com/project/jpdqxjaosattvzjjumxz/editor
- **Auth Users:** https://app.supabase.com/project/jpdqxjaosattvzjjumxz/auth/users

---

## Summary

✅ **Completed Migrations:**
- 000_cleanup.sql - Database reset
- 001_initial_schema.sql - Initial PostgreSQL schema
- 002_franchise_v3.sql - Franchise structure implementation

🎯 **Current State:**
- Franchise hierarchy fully implemented
- 10 tables with complete RLS policies
- 16 enum types for type safety
- Super Admin → Affiliates → Schools → Candidates structure

📝 **Next Steps:**
- Implement candidate testing system
- Add AI matching tables
- Create contract template system
- Integrate payment gateway tables
