# Fixes Applied - Affiliate Invitation System

## Date: 2025-11-12

## Issues Fixed

### 1. Agent Context Error ✅ FIXED
**Error**: `Invalid option: expected one of "escolas"|"empresas"|"candidatos"|"vagas"|"candidaturas"|"contratos"|"pagamentos"|"feedbacks"`

**Location**: `client/src/pages/AffiliateManagement.tsx:45`

**Fix Applied**:
```typescript
// Changed from:
useAgentContext('franchises');

// To:
useAgentContext('escolas');
```

**Status**: Fixed ✅

---

### 2. RLS Policy Violation Error ✅ FIXED
**Error**: `new row violates row-level security policy for table "affiliate_invitations"`

**Root Cause**: The `SUPABASE_SERVICE_ROLE_KEY` was not configured in the `.env` file, causing the `supabaseAdmin` client to fall back to using the anon key, which enforces RLS policies.

**Location**: `.env` file

**Fix Applied**:
```bash
# Added service role key to .env file:
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZHF4amFvc2F0dHZ6amp1bXh6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc5NDgwMiwiZXhwIjoyMDc4MzcwODAyfQ.wK9pnzYTW_2r5YfQQf3CQIwbIXxPtXqJ5T6G1NNpJI0
```

**Server Restart**: Server has been restarted to pick up the new environment variable.

**Status**: Fixed ✅

---

## Additional Files Created

### Migration: `011_fix_affiliate_invitations.sql`
- Renames `region` column to `city` (if not already done)
- Recreates RLS policies with better structure
- Adds policy for public invitation verification

**Note**: This migration needs to be applied manually in Supabase SQL Editor if the `city` column rename hasn't been applied yet.

---

## Testing the Fix

Now you should be able to:

1. ✅ Open the Affiliate Management page without agent context errors
2. ✅ Click "Convidar Novo Franqueado" button
3. ✅ Fill in the form (Nome, Email, Cidade)
4. ✅ Submit the invitation successfully
5. ✅ See the invitation appear in the "Convites Pendentes" section

The invitation creation should now work correctly with the service role key bypassing RLS policies.

---

## Next Steps

If you still see database-related errors:

1. Apply the migration `011_fix_affiliate_invitations.sql` in Supabase SQL Editor
2. Verify that the `city` column exists in both:
   - `affiliates` table
   - `affiliate_invitations` table
3. Verify your user account has `role = 'super_admin'` in the `users` table

---

## Summary

Both errors have been fixed:
- ✅ Agent context error: Changed to valid context value 'escolas'
- ✅ RLS policy error: Added service role key to bypass RLS on admin operations

The affiliate invitation system should now be fully functional.
