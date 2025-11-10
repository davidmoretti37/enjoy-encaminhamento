# 🚀 Run Franchise Migration - Quick Guide

## What This Does

Transforms your platform to support:
- **Super Admin** (you) → manages everything
- **Affiliates** (recruiters) → manage their schools
- **Schools** (companies) → post jobs, hire candidates
- **Candidates** → apply to jobs

## Step-by-Step

### 1. Open Supabase SQL Editor

https://app.supabase.com/project/jpdqxjaosattvzjjumxz/sql

### 2. Run the Migration

1. Click **"New Query"**
2. Open file: `supabase/migrations/002_franchise_structure.sql`
3. Copy **ALL** contents
4. Paste into SQL Editor
5. Click **"Run"**
6. Wait ~15 seconds

### 3. Verify Success

Run this to check:

```sql
-- Should see: affiliates, schools (not companies anymore)
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('affiliates', 'schools', 'companies')
ORDER BY table_name;

-- Should show: super_admin, affiliate, school, candidate
SELECT DISTINCT role FROM public.users;

-- Your user should be super_admin now
SELECT id, email, role FROM public.users
WHERE email = 'admin@agencianacional.com';
```

### 4. Update Your Admin to Super Admin (If Needed)

If your user isn't super_admin yet:

```sql
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'admin@agencianacional.com';
```

## ✅ Expected Results

After running, you should have:

- ✅ New `affiliates` table
- ✅ `companies` renamed to `schools`
- ✅ New columns: `schools.affiliate_id`, `jobs.posted_by_user_id`
- ✅ Updated roles: super_admin, affiliate, school, candidate
- ✅ All existing data preserved

## 🎯 What Changed

### Tables Renamed
- `companies` → `schools`
- Column `company_name` → `school_name`
- Column `company_id` → `school_id` (in jobs, contracts, payments, feedback)

### New Features
- Affiliates can manage multiple schools
- Schools belong to an affiliate
- Jobs track who posted them (school or affiliate)
- Full permission system based on hierarchy

## 🐛 Troubleshooting

**Error: "relation already exists"**
→ The migration is idempotent, but if you have conflicts, check what exists:
```sql
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
```

**Error: "cannot alter type"**
→ Migration handles this automatically. If it fails, you may need to manually update:
```sql
-- Check current roles
SELECT DISTINCT role FROM public.users;
```

**Tables not renamed**
→ Check if migration completed:
```sql
-- This should return 0 rows if migration succeeded
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'companies';
```

## 📋 Quick Tests

After migration, test these:

```sql
-- 1. Check affiliates table
SELECT * FROM public.affiliates LIMIT 1;

-- 2. Check schools table (formerly companies)
SELECT id, school_name, affiliate_id FROM public.schools LIMIT 5;

-- 3. Check jobs have new column
SELECT id, school_id, posted_by_user_id FROM public.jobs LIMIT 5;

-- 4. Verify your admin access
SELECT id, email, role FROM public.users
WHERE email = 'admin@agencianacional.com';
```

## 🎉 Done!

Your platform now supports the full franchise structure!

Next steps:
1. Create your first affiliate (see FRANCHISE_MIGRATION.md)
2. Assign schools to affiliates
3. Test the new workflows

---

**Need detailed info?** See `FRANCHISE_MIGRATION.md`
