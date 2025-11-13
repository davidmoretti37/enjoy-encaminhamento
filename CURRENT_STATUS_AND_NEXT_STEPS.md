# Current Status and Next Steps

## Summary

You encountered errors when trying to access the Affiliate Management page (`/admin/affiliates` or "Escolas" in the sidebar). The errors have been partially diagnosed and documented.

## Errors Encountered

### 1. Agent Context Error ✅ FIXED
**Error**: `Invalid option: expected one of "escolas"|"empresas"|...`

**Status**: **FIXED**
- Changed `useAgentContext('franchises')` to `useAgentContext('escolas')` in AffiliateManagement.tsx:45

### 2. Database Query Error ⚠️ REQUIRES YOUR ACTION
**Error**:
```
GET http://localhost:5001/api/trpc/affiliate.getAll,affiliate.getInvitations?batch=1 500 (Internal Server Error)
```

**Server Logs Show**:
```
[Database] Failed to get affiliate invitations: {
  message: 'Invalid API key',
  hint: 'Double check your Supabase `anon` or `service_role` API key.'
}
```

**Root Cause**: Missing Supabase Service Role Key

The system is trying to query the `affiliates` and `affiliate_invitations` tables using admin privileges, but it doesn't have the service role key configured. Without this key, it falls back to the anon key which has limited permissions due to Row Level Security (RLS) policies.

## What You Need to Do

### Step 1: Get Your Service Role Key

I've created a detailed guide for you: **`HOW_TO_GET_SERVICE_ROLE_KEY.md`**

Quick steps:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy the **service_role** key (the secret one)
5. Add it to `.env` file:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_actual_key_here
   ```
6. Restart the server: `npm run dev`

### Step 2: Apply Database Migration (If Needed)

If you haven't already applied the migration that renames "region" to "city", you need to run:

**File**: `supabase/migrations/010_rename_region_to_city.sql`

**How to apply**:
1. Go to your Supabase Dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the contents of `010_rename_region_to_city.sql`
5. Paste and click "Run"

You may also need to apply: `supabase/migrations/011_fix_affiliate_invitations.sql`

## What Should Work After These Steps

Once you've added the service role key and restarted the server:

1. ✅ Navigate to `/admin/affiliates` or click "Escolas" in sidebar
2. ✅ Page loads without errors showing:
   - Summary cards (Total Franqueados, Ativos, Convites Pendentes, Inativos)
   - "Convidar Novo Franqueado" button
   - Search bar
   - List of existing affiliates (if any)
   - List of pending invitations (if any)

3. ✅ Create new invitation:
   - Click "Convidar Novo Franqueado"
   - Fill in: Nome, Email, Cidade
   - Submit
   - Invitation appears in "Convites Pendentes" section

4. ✅ Copy invitation link:
   - Click "Copiar Link" button next to the invitation
   - Share the link with the franchise owner
   - They can visit the link to accept the invitation

## Current Files Structure

### Database Migrations
- `009_affiliate_invitations.sql` - Creates affiliate_invitations table
- `010_rename_region_to_city.sql` - Renames region to city
- `011_fix_affiliate_invitations.sql` - Fixes RLS policies and column names

### Backend (Server)
- `server/routers.ts` - Contains affiliate endpoints:
  - `affiliate.getAll` - Get all affiliates
  - `affiliate.getInvitations` - Get all invitations
  - `affiliate.createInvitation` - Create new invitation
  - `affiliate.updateStatus` - Activate/deactivate affiliate
  - And more...

- `server/db.ts` - Database functions for affiliate operations

### Frontend (Client)
- `client/src/pages/AffiliateManagement.tsx` - Admin page to manage affiliates
- `client/src/pages/AffiliateDashboard.tsx` - Franchise owner dashboard
- `client/src/pages/AffiliateAcceptInvitation.tsx` - Public invitation acceptance page
- `client/src/pages/AffiliateSchools.tsx` - Franchise owner schools management
- `client/src/pages/AffiliateCandidates.tsx` - Regional candidates view
- `client/src/pages/AffiliateJobs.tsx` - Regional jobs view
- `client/src/pages/AffiliateApplications.tsx` - Regional applications view
- `client/src/pages/AffiliateContracts.tsx` - Regional contracts view
- `client/src/pages/AffiliatePayments.tsx` - Regional payments view with commission

## Documentation
- `FIXES_APPLIED.md` - Summary of fixes applied in this session
- `HOW_TO_GET_SERVICE_ROLE_KEY.md` - Detailed guide to get service role key
- `COMPLETE_FRANCHISE_SYSTEM.md` - Complete documentation of franchise system
- `CURRENT_STATUS_AND_NEXT_STEPS.md` - This file

## Known Issues

1. **DNS/Network Errors** (Unrelated to affiliate system):
   ```
   Error: getaddrinfo ENOTFOUND jpdqxjaosattvzjjumxz.supabase.co
   ```
   This is a separate network connectivity issue that affects Supabase connections. It's intermittent and not related to the affiliate system.

2. **Missing Service Role Key** (Main blocker):
   The affiliate management features won't work until you add the service role key.

## Testing Checklist

After adding the service role key:

- [ ] Open `/admin/affiliates` - should load without errors
- [ ] See 4 summary cards at the top
- [ ] Click "Convidar Novo Franqueado" - dialog opens
- [ ] Fill form and submit - invitation created successfully
- [ ] Invitation appears in "Convites Pendentes" section
- [ ] Click "Copiar Link" - link copied to clipboard
- [ ] Paste link in browser (in incognito/private window) - invitation acceptance page loads
- [ ] Fill in password and submit - account created
- [ ] Login with new account - franchise owner dashboard loads
- [ ] All franchise owner pages work correctly:
  - [ ] Dashboard (`/affiliate/dashboard`)
  - [ ] Schools (`/affiliate/schools`)
  - [ ] Candidates (`/affiliate/candidates`)
  - [ ] Jobs (`/affiliate/jobs`)
  - [ ] Applications (`/affiliate/applications`)
  - [ ] Contracts (`/affiliate/contracts`)
  - [ ] Payments (`/affiliate/payments`)

## Next Steps Summary

1. **Immediate**: Get service role key from Supabase and add to `.env`
2. **Then**: Restart server with `npm run dev`
3. **Test**: Try accessing `/admin/affiliates` again
4. **If still errors**: Check server logs and verify migrations are applied
5. **Success**: Create first affiliate invitation and test the flow

---

**Last Updated**: 2025-11-12
**Status**: Waiting for service role key configuration
