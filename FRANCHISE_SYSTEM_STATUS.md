# Franchise System Implementation Status

## ✅ Completed Components

### 1. Database Schema
**File:** `supabase/migrations/009_affiliate_invitations.sql`

Created `affiliate_invitations` table with:
- Email, token, name, region, commission rate
- Created by (super admin who sent invite)
- Expires at, claimed at, claimed by fields
- RLS policies (only super admins can manage)

**Status:** Migration file ready - needs to be applied to database

**How to apply:**
```bash
# Find your psql path
which psql

# Apply migration (adjust path as needed)
PGPASSWORD='your_password' /path/to/psql "your_connection_string" -f supabase/migrations/009_affiliate_invitations.sql
```

### 2. Backend tRPC Routes
**File:** `server/routers.ts` (lines 693-778)

Created complete affiliate router with endpoints:
- `affiliate.getAll` - Get all affiliates (super admin only)
- `affiliate.getById` - Get specific affiliate
- `affiliate.getByUserId` - Get affiliate by user ID
- `affiliate.getInvitations` - Get all pending invitations
- `affiliate.createInvitation` - Send invitation (super admin only)
- `affiliate.verifyInvitation` - Check if token is valid (public)
- `affiliate.acceptInvitation` - Accept and create account (public)
- `affiliate.updateStatus` - Activate/deactivate affiliate
- `affiliate.getSchools` - Get schools in affiliate's region
- `affiliate.getDashboardStats` - Get affiliate's dashboard statistics

### 3. Database Functions
**File:** `server/db.ts` (lines 1356-1632)

Implemented all database operations:
- `getAllAffiliates()` - Fetch all affiliates
- `getAffiliateById()` - Get affiliate by ID
- `getAffiliateByUserId()` - Get affiliate by user ID
- `updateAffiliateStatus()` - Toggle active/inactive
- `getSchoolsByAffiliateId()` - Get schools for an affiliate
- `getAffiliateDashboardStats()` - Calculate dashboard metrics
- `getAllAffiliateInvitations()` - Get all invitations
- `createAffiliateInvitation()` - Create new invitation with unique token
- `verifyAffiliateInvitation()` - Validate token, check expiry
- `acceptAffiliateInvitation()` - Complete signup process:
  - Creates Supabase Auth user
  - Creates user record with 'affiliate' role
  - Creates affiliate profile
  - Marks invitation as claimed

### 4. Admin Management Page
**File:** `client/src/pages/AffiliateManagement.tsx`

Complete admin interface for managing franchises:
- **Hero Header** - Modern slate design
- **4 Summary Cards:**
  - Total Affiliates
  - Active Affiliates
  - Pending Invitations
  - Inactive Affiliates
- **Invite Dialog** - Form to create new invitations:
  - Name, Email, Region, Commission Rate (default 30%)
- **Pending Invitations Section:**
  - Lists all unclaimed invitations
  - Copy invitation link button
  - Shows expiration date
- **Affiliates Table:**
  - Columns: Name, Region, Email, Commission, Status, Registration Date
  - Activate/Deactivate toggle button
  - View details button
- **Search functionality** - Filter by name, region, or email

### 5. Invitation Acceptance Page
**File:** `client/src/pages/AffiliateAcceptInvitation.tsx`

Public page where invited person creates their account:
- **Token verification** - Validates invitation on load
- **Invitation details display:**
  - Name, Email, Region, Commission Rate
- **Password creation form:**
  - Password field (min 6 chars)
  - Confirm password field
  - Optional phone number
- **Benefits section** - Shows what franchisee can do
- **Error handling:**
  - Invalid/expired token
  - Already claimed
  - Password mismatch
- **Success flow:** Creates account → redirects to login

### 6. Routing
**File:** `client/src/App.tsx`

Added routes:
- `/admin/affiliates` - Affiliate management (super admin only)
- `/affiliate/accept/:token` - Public invitation acceptance page

---

## 🔄 Next Steps - Franchise Owner Portal

### To Build:
1. **Franchise Owner Dashboard** (`AffiliateDashboard.tsx`)
2. **Schools Management** for franchise owners
3. **Companies Management** for franchise owners (if needed)
4. **Regional Analytics** and reporting

---

## 🎯 Complete User Flow

### Admin Invites Franchise Owner:
1. Super admin goes to `/admin/affiliates`
2. Clicks "Convidar Novo Franqueado"
3. Fills form: Name, Email, Region, Commission Rate
4. System generates unique invitation token
5. Admin copies invitation link
6. Admin sends link to franchise owner (email/WhatsApp)

### Franchise Owner Accepts:
1. Franchise owner receives link: `/affiliate/accept/{token}`
2. Opens link, sees invitation details
3. Creates password and optionally adds phone
4. Clicks "Aceitar Convite e Criar Conta"
5. System:
   - Creates Supabase Auth account
   - Creates user with role='affiliate'
   - Creates affiliate profile
   - Marks invitation as claimed
6. Redirects to login page
7. Franchise owner logs in with email + password

### Franchise Owner Portal (TODO):
1. Login redirects to `/affiliate/dashboard`
2. See their regional statistics
3. Approve/reject schools in their region
4. Monitor all activity in their territory
5. Track revenue and commissions

---

## 📊 Database Structure

### Tables Used:
1. **`users`** - User accounts (role: 'super_admin' | 'affiliate' | 'school' | 'candidate')
2. **`affiliates`** - Franchise owner profiles
   - Links to users table (user_id)
   - Contains: name, region, commission_rate, is_active
   - Created by super admin
3. **`affiliate_invitations`** - Invitation tokens
   - Email, token, name, region, commission_rate
   - Expires after 7 days
   - Tracks: created_by, claimed_at, claimed_by
4. **`schools`** - Schools in the system
   - Has affiliate_id (foreign key to affiliates)
   - Franchise owner only sees schools where affiliate_id = their ID

### Row Level Security (RLS):
- Already configured in migration `002_franchise_v3.sql`
- Affiliates can only see data for their region
- Super admins see everything

---

## 🚀 How to Test (After Applying Migration)

### 1. Apply Database Migration:
```bash
# Run the affiliate invitations migration
PGPASSWORD='your_password' psql "your_connection_string" -f supabase/migrations/009_affiliate_invitations.sql
```

### 2. Start the Application:
```bash
npm run dev
```

### 3. Test Admin Flow:
1. Login as super admin
2. Navigate to `/admin/affiliates`
3. Click "Convidar Novo Franqueado"
4. Fill: Name="João Silva", Email="joao@test.com", Region="São Paulo Norte", Commission=30
5. Click "Enviar Convite"
6. Click "Copiar Link" on the pending invitation

### 4. Test Franchise Owner Signup:
1. Open invitation link in incognito window (or logout first)
2. Verify invitation details are displayed
3. Create password: "password123"
4. Confirm password: "password123"
5. Add phone: "(11) 98765-4321"
6. Click "Aceitar Convite e Criar Conta"
7. Should redirect to `/login`
8. Login with: joao@test.com / password123

### 5. Verify Account Created:
- Check `users` table - should have new user with role='affiliate'
- Check `affiliates` table - should have new affiliate record
- Check `affiliate_invitations` table - invitation should have claimed_at timestamp

---

## 🔐 Security Features

### ✅ Implemented:
- Invitation tokens are cryptographically secure (UUID + timestamp)
- Tokens expire after 7 days
- Tokens can only be used once (claimed_at check)
- RLS policies prevent unauthorized access
- Super admin role required to create invitations
- Password minimum 6 characters
- Email validation on invitation

### 🔒 Additional Security (Recommended):
- [ ] Email verification after signup
- [ ] Password strength requirements (uppercase, numbers, symbols)
- [ ] Rate limiting on invitation creation
- [ ] Audit log for invitation activities
- [ ] Two-factor authentication for affiliate accounts

---

## 📝 Environment Variables Needed

Make sure you have these in your `.env`:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 🐛 Known Issues / TODO

### Issues:
- [ ] Migration not yet applied to database (needs manual run)
- [ ] Franchise owner dashboard not yet built
- [ ] Schools management for franchises not yet built

### Features to Add:
- [ ] Email notification when invitation is sent
- [ ] Resend invitation functionality
- [ ] Cancel/revoke invitation functionality
- [ ] Franchise owner profile editing
- [ ] Bulk invitation creation
- [ ] Invitation analytics (acceptance rate, time to accept)

---

## 📚 Code Reference

### Key Files:
```
supabase/migrations/
  └── 009_affiliate_invitations.sql     # Database schema

server/
  ├── routers.ts                          # tRPC routes (lines 693-778)
  └── db.ts                               # Database functions (lines 1356-1632)

client/src/
  ├── App.tsx                             # Routes added
  └── pages/
      ├── AffiliateManagement.tsx         # Admin management page
      └── AffiliateAcceptInvitation.tsx   # Public signup page
```

### Component Structure:
```
AffiliateManagement (Admin)
├── Hero Header (slate-900)
├── Summary Cards (4)
│   ├── Total Affiliates
│   ├── Active Affiliates
│   ├── Pending Invitations
│   └── Inactive Affiliates
├── Actions Bar
│   ├── Invite Dialog
│   └── Search Input
├── Pending Invitations (if any)
└── Affiliates Table
    └── Actions: Activate/Deactivate, View

AffiliateAcceptInvitation (Public)
├── Invitation Details Card
├── Password Creation Form
└── Benefits Section
```

---

## ✨ What's Next?

### Immediate Priority:
1. **Apply the database migration** - `009_affiliate_invitations.sql`
2. **Test the invitation flow** end-to-end
3. **Build Franchise Owner Dashboard** - their main portal after login
4. **Build Schools Management** - for franchise owners to approve schools

### Future Enhancements:
- Revenue tracking and commission calculations
- Regional analytics and reports
- Bulk operations (invite multiple franchises, approve multiple schools)
- Advanced permissions (sub-roles, custom permissions)
- Mobile app support

---

## 📞 Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the server logs
3. Verify database migration was applied
4. Verify user has correct role in database
5. Check RLS policies are enabled

---

**Last Updated:** 2025-01-12
**Status:** ✅ Backend Complete | 🔄 Frontend In Progress
**Next Task:** Build Franchise Owner Dashboard
