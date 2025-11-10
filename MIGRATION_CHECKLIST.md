# Supabase Migration Checklist

Complete these steps to finish your migration to Supabase.

## ✅ Completed (by migration script)

- [x] Installed @supabase/supabase-js
- [x] Created Supabase SQL schema file
- [x] Created server Supabase client configuration
- [x] Migrated all database helper functions
- [x] Updated tRPC routers to use new database module
- [x] Updated tRPC context for Supabase Auth
- [x] Created client Supabase configuration
- [x] Created authentication helper functions
- [x] Created Login page component
- [x] Updated routing to include login page
- [x] Created .env file with your credentials
- [x] Removed old MySQL/Drizzle files
- [x] Created comprehensive documentation

## 🔲 Action Required (you need to do these)

### 1. Run SQL Migration in Supabase Dashboard

**Priority: HIGH** - Nothing will work without this!

1. Open: https://app.supabase.com/project/jpdqxjaosattvzjjumxz
2. Navigate to: **SQL Editor** (left sidebar)
3. Click: **New Query**
4. Open file: `supabase/migrations/001_initial_schema.sql`
5. Copy entire contents (Cmd+A, Cmd+C)
6. Paste into SQL Editor
7. Click: **Run** (or press Cmd+Enter)
8. Wait for completion (~10 seconds)
9. Verify: Go to **Table Editor** - you should see 10 tables

**Status**: [ ] Completed

### 2. Enable Authentication in Supabase

**Priority: HIGH** - Users can't sign up without this!

1. In Supabase dashboard, go to: **Authentication** → **Providers**
2. Enable **Email** provider
3. (Optional) Enable OAuth providers (Google, GitHub, etc.)
4. Save changes

**Status**: [ ] Completed

### 3. Test the Application

**Priority: HIGH** - Make sure everything works!

```bash
# Start the development server
npm run dev
```

Visit: http://localhost:5000

Test these flows:

1. **Landing Page**
   - [ ] Page loads correctly
   - [ ] "Entrar" button goes to /login

2. **Login/Signup**
   - [ ] Visit http://localhost:5000/login
   - [ ] Signup tab appears
   - [ ] Can create account (check email for confirmation)
   - [ ] Login tab works
   - [ ] OAuth buttons show (even if not configured)

3. **After Login**
   - [ ] Redirects to /dashboard
   - [ ] Can see company or candidate dashboard
   - [ ] User data is loaded

**Status**: [ ] Completed

### 4. Create Your First Admin User

**Priority: MEDIUM** - You need an admin to manage the platform

After creating your first user account:

1. Go to: **Authentication** → **Users** in Supabase dashboard
2. Copy your user ID
3. Go to: **SQL Editor**
4. Run this query (replace with your ID):
   ```sql
   UPDATE public.users
   SET role = 'admin'
   WHERE id = 'your-user-id-here';
   ```

**Status**: [ ] Completed

### 5. Configure Email Settings (Optional but Recommended)

**Priority: MEDIUM** - For production, you need real emails

By default, Supabase uses dummy emails. To send real emails:

1. Go to: **Authentication** → **Email Templates**
2. Configure SMTP settings or use Supabase's email service
3. Customize email templates

**Status**: [ ] Completed

### 6. Set Up Storage Buckets (Optional)

**Priority: LOW** - Only if you need file uploads

If you want to use Supabase Storage instead of AWS S3:

1. Go to: **Storage** in Supabase dashboard
2. Create buckets:
   - `resumes` - For candidate resumes
   - `company-logos` - For company logos
   - `contracts` - For contract documents
   - `documents` - For general documents
3. Set bucket policies (public or private)

**Status**: [ ] Completed

### 7. Update File Upload Logic (Optional)

**Priority: LOW** - Only if using Supabase Storage

Replace AWS S3 upload logic with Supabase Storage:

```typescript
// Old (AWS S3)
await s3.upload({ ... });

// New (Supabase Storage)
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload(filePath, file);
```

**Status**: [ ] Completed

### 8. Configure Production Environment

**Priority: MEDIUM** - Before deploying

1. Get your Supabase Service Role key:
   - Go to: **Settings** → **API**
   - Copy `service_role` key
   - Add to `.env`:
     ```
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
     ```

2. For production deployment:
   - Set environment variables on your hosting platform
   - Update CORS settings in Supabase dashboard
   - Configure redirect URLs for OAuth

**Status**: [ ] Completed

### 9. Test All Features

**Priority: HIGH** - Before going live

Test each feature thoroughly:

- [ ] Company Registration
  - [ ] Create company profile
  - [ ] View company dashboard
  - [ ] Company stats display correctly

- [ ] Job Management
  - [ ] Create job posting
  - [ ] Edit job posting
  - [ ] View job applications
  - [ ] Update application status

- [ ] Candidate Features
  - [ ] Create candidate profile
  - [ ] Browse jobs
  - [ ] Apply to job
  - [ ] View application status

- [ ] Contracts
  - [ ] Create contract
  - [ ] View contract details
  - [ ] Update contract status

- [ ] Notifications
  - [ ] Notifications are created
  - [ ] Can mark as read
  - [ ] Unread count updates

- [ ] Authentication
  - [ ] Login works
  - [ ] Logout works
  - [ ] Session persists on refresh
  - [ ] Protected routes work

**Status**: [ ] Completed

### 10. Set Up Monitoring (Recommended)

**Priority: LOW** - For production

In Supabase dashboard:

1. **Database** → Monitor query performance
2. **Authentication** → Check auth logs
3. **Logs** → Set up log retention
4. **Reports** → Review usage reports

**Status**: [ ] Completed

## 📊 Progress Tracker

Count your completed tasks:

- Tasks completed: _____ / 10
- Ready for testing: Yes / No
- Ready for production: Yes / No

## ❓ Troubleshooting

### SQL Migration Failed
- Copy error message
- Run migration line by line to find the problem
- Check PostgreSQL syntax (different from MySQL)

### Auth Not Working
- Verify token is sent in request headers
- Check browser console for errors
- Verify email provider is enabled

### Database Connection Failed
- Check SUPABASE_URL and SUPABASE_ANON_KEY in .env
- Verify project is not paused (free tier pauses after 7 days)
- Check network connectivity

### RLS Blocking Queries
- Temporarily disable RLS for testing:
  ```sql
  ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
  ```
- Review RLS policies
- Use service role key for admin operations

## 📚 Documentation Reference

- **QUICKSTART.md** - 5-minute guide
- **MIGRATION_INSTRUCTIONS.md** - Detailed instructions
- **SUPABASE_MIGRATION_SUMMARY.md** - Complete overview
- **README.md** - Project documentation

## 🎉 Success!

When you've completed all high-priority tasks:

1. You can sign up/login users
2. Companies can post jobs
3. Candidates can apply
4. Contracts can be created
5. All data is stored in Supabase
6. RLS policies are working

**You're ready to build out the rest of your features!** 🚀

---

**Questions?** Check the documentation or Supabase Dashboard logs.
