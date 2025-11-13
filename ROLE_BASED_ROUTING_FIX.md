# Role-Based Dashboard Routing - 403 Error Fix

## Date: 2025-11-12

## Problem Fixed

Franchise owners were getting 403 Forbidden errors when logging in after accepting invitations.

### Root Cause
- All users were redirected to `/dashboard` after login
- `/dashboard` route pointed to `AdminDashboard` component
- `AdminDashboard` makes admin-only API calls that require `role: 'admin'` or `role: 'super_admin'`
- Franchise owners have `role: 'affiliate'`, causing permission errors

### Error Messages
```
403 Forbidden: Admin access required
```

Failing endpoints:
- `dashboard.getStats` (admin only)
- `admin.getStats` (admin only)
- `company.getAll` (admin only)
- `candidate.getAll` (admin only)

## Solution Implemented

### 1. Updated Login.tsx

**Added role-based redirect logic:**

```typescript
// After successful login, redirect based on user role
if (user?.role === 'affiliate') {
  setLocation('/affiliate/dashboard');
} else if (user?.role === 'super_admin' || user?.role === 'admin') {
  setLocation('/admin/dashboard');
} else if (user?.role === 'school') {
  setLocation('/company/dashboard');
} else {
  setLocation('/');
}
```

**Changes made:**
- Line 16: Added `import { useAuth } from '@/_core/hooks/useAuth';`
- Line 23: Added `const { refreshUser } = useAuth();`
- Lines 41-57: Updated `handleLogin` with role-based routing
- Lines 76-88: Updated `handleSignup` with role-based routing

### 2. Updated App.tsx

**Changed admin dashboard route:**

```typescript
// Before:
<Route path={"/dashboard"} component={AdminDashboard} />

// After:
<Route path={"/admin/dashboard"} component={AdminDashboard} />
```

This makes it explicit that `/admin/dashboard` is for admins only.

## Dashboard Routes by Role

After this fix, users are redirected to the appropriate dashboard based on their role:

| Role | Dashboard Route | Component | API Endpoints Used |
|------|----------------|-----------|-------------------|
| `affiliate` | `/affiliate/dashboard` | AffiliateDashboard | `affiliate.getByUserId`, `affiliate.getDashboardStats`, `affiliate.getSchools` |
| `super_admin` | `/admin/dashboard` | AdminDashboard | `dashboard.getStats`, `admin.getStats`, `company.getAll`, `candidate.getAll` |
| `admin` | `/admin/dashboard` | AdminDashboard | Same as super_admin |
| `school` | `/company/dashboard` | CompanyDashboard | Company-specific endpoints |
| `candidate` | `/` | Home | Candidate-specific endpoints |

## Testing the Fix

### Test Case: Franchise Owner Login

1. ✅ Accept invitation at `/affiliate/accept/{token}`
2. ✅ Create account with password
3. ✅ Redirect to `/login`
4. ✅ Login with credentials
5. ✅ **NEW**: Redirect to `/affiliate/dashboard` (not `/dashboard`)
6. ✅ AffiliateDashboard loads successfully
7. ✅ Queries affiliate-specific endpoints (no 403 errors)
8. ✅ See franchise owner dashboard with regional data

### Test Case: Admin Login

1. ✅ Login as admin/super_admin
2. ✅ **NEW**: Redirect to `/admin/dashboard` (not `/dashboard`)
3. ✅ AdminDashboard loads successfully
4. ✅ Queries admin-specific endpoints
5. ✅ See admin dashboard with full platform data

## API Permissions Reference

### Admin-Only Endpoints (require `adminProcedure`)
- `dashboard.getStats`
- `admin.getStats`
- `company.getAll`
- `candidate.getAll`
- And other admin management endpoints

### Affiliate Endpoints (require `protectedProcedure` with affiliate check)
- `affiliate.getByUserId`
- `affiliate.getDashboardStats`
- `affiliate.getSchools`
- `affiliate.getCandidates`
- `affiliate.getJobs`
- `affiliate.getApplications`
- `affiliate.getContracts`
- `affiliate.getPayments`

### How Protection Works

**adminProcedure** (server/routers.ts lines 11-16):
```typescript
const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user || (ctx.user.role !== 'admin' && ctx.user.role !== 'super_admin')) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
```

**Affiliate queries** (server/routers.ts lines 771-776):
```typescript
getByUserId: protectedProcedure.query(async ({ ctx }) => {
  const affiliate = await db.getAffiliateByUserId(ctx.user.id);
  if (!affiliate) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Affiliate not found' });
  }
  return affiliate;
}),
```

## Files Modified

1. **client/src/pages/Login.tsx**
   - Added role-based redirect logic in `handleLogin`
   - Added role-based redirect logic in `handleSignup`
   - Imported `useAuth` hook

2. **client/src/App.tsx**
   - Changed route from `/dashboard` to `/admin/dashboard` for AdminDashboard

## Expected Behavior After Fix

### Franchise Owner Flow
1. Accept invitation → Create account
2. Login → **Automatically redirected to `/affiliate/dashboard`**
3. See AffiliateDashboard with:
   - Regional summary cards (schools, candidates, jobs, contracts)
   - Pending school approvals (if any)
   - Quick action cards
   - Recent schools list
4. **No 403 errors** ✅

### Admin Flow
1. Login as admin → **Automatically redirected to `/admin/dashboard`**
2. See AdminDashboard with:
   - Platform-wide statistics
   - All companies, candidates, jobs
   - Full admin controls
4. **No permission issues** ✅

## Status

✅ **FIXED** - Role-based routing implemented
✅ Franchise owners now see their correct dashboard
✅ No more 403 Forbidden errors for affiliate users
✅ Each role gets their appropriate dashboard and API access
