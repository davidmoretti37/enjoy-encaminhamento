# 🏢 Franchise Structure Migration Guide

## Overview

This migration transforms your platform from a simple company→candidate structure to a **franchise model**:

```
Super Admin (You)
  ├── Affiliate 1
  │   ├── School A
  │   ├── School B
  │   └── School C
  ├── Affiliate 2
  │   ├── School D
  │   └── School E
  └── (and so on...)
```

## 📊 New Structure

### Roles
1. **Super Admin** - You (sees everything, creates affiliates)
2. **Affiliate** - Recruiters (manages their assigned schools)
3. **School** - Companies (posts jobs, hires candidates)
4. **Candidate** - Job seekers (applies to jobs)

### Key Changes
- ✅ `companies` table renamed to `schools`
- ✅ New `affiliates` table added
- ✅ `schools` now have `affiliate_id` (which affiliate manages them)
- ✅ `jobs` now have `posted_by_user_id` (who posted: school or affiliate)
- ✅ User roles updated: `admin`→`super_admin`, `company`→`school`, `staff`→`affiliate`

## 🚀 How to Run the Migration

### Step 1: Run the Migration SQL

1. Open Supabase SQL Editor: https://app.supabase.com/project/jpdqxjaosattvzjjumxz/sql
2. Copy the contents of `supabase/migrations/002_franchise_structure.sql`
3. Paste and click **Run**
4. Wait ~15 seconds for completion

### Step 2: Update Your Admin User

Your existing admin user needs to be converted to super_admin:

```sql
-- This happens automatically in the migration, but verify:
SELECT id, email, role FROM public.users WHERE email = 'admin@agencianacional.com';

-- Should show role = 'super_admin'
```

## 📋 Permission Matrix

| Action | Super Admin | Affiliate | School | Candidate |
|--------|-------------|-----------|--------|-----------|
| Create affiliates | ✅ | ❌ | ❌ | ❌ |
| Assign schools to affiliates | ✅ | ❌ | ❌ | ❌ |
| Create school accounts | ✅ | ✅ (their schools) | ❌ | ❌ |
| Post jobs | ✅ | ✅ (their schools) | ✅ (own school) | ❌ |
| View all candidates | ✅ | ✅ | ❌ | ❌ |
| View matched candidates | ✅ | ✅ (their schools) | ✅ (own jobs) | ❌ |
| Select candidate for hire | ✅ | ✅ (their schools) | ✅ (own jobs) | ❌ |
| Generate contracts | ✅ | ✅ (their schools) | ❌ | ❌ |
| Apply to jobs | ❌ | ❌ | ❌ | ✅ |

## 🔄 Workflows

### Workflow 1: Onboarding a New School

1. **Super Admin** creates an Affiliate account (or affiliate already exists)
2. **Affiliate** (or Super Admin) creates School login
3. **Affiliate** gives credentials to School
4. **School** logs in and can start posting jobs

### Workflow 2: Posting a Job

**Option A: School Posts Directly**
1. School logs in → Creates job
2. AI matches candidates overnight
3. School reviews matched applications
4. School selects candidate

**Option B: Affiliate Posts for School**
1. Affiliate logs in → Posts job on behalf of school
2. AI matches candidates
3. School gets notified
4. School reviews and selects candidate

### Workflow 3: Hiring Process

1. Job is posted (by affiliate or school)
2. AI runs nightly matching → scores candidates
3. School (or affiliate) sees top matched candidates
4. School selects candidate to hire
5. Affiliate generates contract
6. Contract signed (manual for MVP)
7. Contract stored in system

## 🗄️ Database Changes

### New Tables

**`affiliates`**
```sql
id, user_id, name, contact_email, contact_phone,
region, commission_rate, is_active, created_by,
created_at, updated_at
```

### Updated Tables

**`schools` (formerly companies)**
- Added `affiliate_id` - which affiliate manages this school
- Added `created_by` - who created this school account
- Renamed `company_name` → `school_name`
- Renamed `company_size` → `school_size`

**`jobs`**
- Added `posted_by_user_id` - tracks who posted (school or affiliate)
- Renamed `company_id` → `school_id`

**`contracts`**
- Added `affiliate_id` - which affiliate manages this contract
- Renamed `company_id` → `school_id`

**`payments`**
- Renamed `company_id` → `school_id`

**`feedback`**
- Renamed `company_id` → `school_id`

## 🔐 Row Level Security (RLS)

The migration includes comprehensive RLS policies:

### Affiliates
- Can view their own profile
- Can view their assigned schools
- Can view jobs for their schools
- Can view candidates matched to their schools' jobs

### Schools
- Can view their own profile
- Can view/create/update their own jobs
- Can view candidates matched to their jobs
- Cannot see other schools' data

### Candidates
- Can view their own profile
- Can view open jobs
- Can apply to jobs
- Cannot see other candidates

## 🎯 Next Steps After Migration

### 1. Create Your First Affiliate

As super admin, create an affiliate:

```sql
-- Create affiliate user
INSERT INTO public.users (id, email, role, name)
VALUES (
  gen_random_uuid(),
  'affiliate@example.com',
  'affiliate',
  'First Affiliate'
);

-- Get the user ID
SELECT id FROM public.users WHERE email = 'affiliate@example.com';

-- Create affiliate profile
INSERT INTO public.affiliates (user_id, name, contact_email, created_by)
VALUES (
  'USER_ID_FROM_ABOVE',
  'Affiliate Name',
  'affiliate@example.com',
  'YOUR_SUPER_ADMIN_USER_ID'
);
```

### 2. Assign Schools to Affiliate

```sql
-- Update existing schools to be managed by affiliate
UPDATE public.schools
SET affiliate_id = 'AFFILIATE_ID'
WHERE id = 'SCHOOL_ID';
```

### 3. Test the Flow

1. Login as super admin - should see everything
2. Login as affiliate - should see only their schools
3. Login as school - should see only their data
4. Login as candidate - should see open jobs

## 🐛 Troubleshooting

### Migration fails with "relation already exists"
**Solution**: Run cleanup first if this is a retry
```sql
DROP TABLE IF EXISTS public.affiliates CASCADE;
```

### Old company references causing errors
**Solution**: The migration automatically handles renaming. If issues persist, check:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'companies';
```
Should return no results (table was renamed to `schools`).

### RLS blocking queries
**Solution**: Verify your user role:
```sql
SELECT id, email, role FROM public.users WHERE id = auth.uid();
```

## ✅ Verification Checklist

After migration, verify:

- [ ] `affiliates` table exists
- [ ] `schools` table exists (companies renamed)
- [ ] `schools` table has `affiliate_id` column
- [ ] `jobs` table has `posted_by_user_id` column
- [ ] `jobs.school_id` exists (company_id renamed)
- [ ] User roles are: super_admin, affiliate, school, candidate
- [ ] Your admin user is now `super_admin`
- [ ] RLS policies are active

Check with:
```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'schools' AND table_schema = 'public';

-- Check user roles
SELECT DISTINCT role FROM public.users;
```

## 📚 Additional Resources

- **Database schema**: `supabase/migrations/002_franchise_structure.sql`
- **Type definitions**: `server/types/database.ts`
- **Original documentation**: See project README.md

---

**Questions or Issues?** Check the Supabase dashboard logs or review the migration SQL file for details.
