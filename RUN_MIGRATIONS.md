# 🚀 Run Database Migrations - Step by Step

Follow these steps EXACTLY to set up your database.

## Step 1: Open Supabase SQL Editor

1. Go to: **https://app.supabase.com/project/jpdqxjaosattvzjjumxz**
2. Login to your Supabase account
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"** button (top right)

## Step 2: Delete Everything (Clean Slate)

**⚠️ WARNING: This will delete ALL data in your database!**

1. Open the file: `supabase/migrations/000_cleanup.sql`
2. Copy **ALL** contents (Cmd+A, then Cmd+C or Ctrl+A, Ctrl+C)
3. Paste into the SQL Editor
4. Click **"Run"** button (or press Cmd+Enter / Ctrl+Enter)
5. Wait for it to complete (should take ~2 seconds)
6. You should see: ✅ Success messages

**Expected Output:**
```
DROP TABLE
DROP TABLE
DROP TABLE
...
DROP TYPE
DROP TYPE
...
```

## Step 3: Create Everything Fresh

1. Click **"New Query"** again to get a fresh editor
2. Open the file: `supabase/migrations/001_initial_schema.sql`
3. Copy **ALL** contents (it's a big file - make sure you get everything!)
4. Paste into the SQL Editor
5. Click **"Run"** button
6. Wait for completion (~10-15 seconds)
7. You should see: ✅ Success messages

**Expected Output:**
```
CREATE EXTENSION
CREATE TYPE
CREATE TYPE
...
CREATE TABLE
CREATE TABLE
...
CREATE INDEX
CREATE INDEX
...
CREATE POLICY
CREATE POLICY
...
```

## Step 4: Verify Tables Were Created

1. Click **"Table Editor"** in the left sidebar
2. You should see **10 tables**:
   - ✅ users
   - ✅ companies
   - ✅ candidates
   - ✅ jobs
   - ✅ applications
   - ✅ contracts
   - ✅ feedback
   - ✅ payments
   - ✅ documents
   - ✅ notifications

3. Click on any table (e.g., "users") to see its structure
4. You should see columns like: id, role, name, email, etc.

## Step 5: Verify RLS is Enabled

1. Click on any table in Table Editor
2. Look for **"RLS enabled"** badge (should show green)
3. Click **"View Policies"** to see the security rules

## Step 6: Test Authentication Setup

1. Click **"Authentication"** in the left sidebar
2. Click **"Providers"**
3. **Enable "Email"** provider (toggle switch)
4. Click **"Save"**
5. (Optional) Enable OAuth providers if you want (Google, GitHub, etc.)

## 🎉 Done! Your Database is Ready

Your database now has:
- ✅ 10 tables created
- ✅ All relationships set up
- ✅ Row Level Security (RLS) enabled
- ✅ Security policies configured
- ✅ Indexes for performance
- ✅ Automatic timestamps
- ✅ UUID primary keys

## Next Steps

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Visit the app:**
   ```
   http://localhost:5000
   ```

3. **Test signup:**
   - Click "Entrar" or "Começar Agora"
   - Go to "Cadastrar" tab
   - Fill in the form
   - Create your account!

4. **Make yourself admin:**
   - After signup, go to: Authentication → Users in Supabase
   - Copy your user ID
   - Go back to SQL Editor
   - Run this query (replace YOUR-USER-ID):
   ```sql
   UPDATE public.users
   SET role = 'admin'
   WHERE id = 'YOUR-USER-ID-HERE';
   ```

## 🐛 Troubleshooting

### ❌ Error: "relation already exists"
**Solution:** You didn't run the cleanup script first. Go back to Step 2.

### ❌ Error: "type already exists"
**Solution:** Run the cleanup script again, it will remove everything.

### ❌ Error: "syntax error"
**Solution:** Make sure you copied the ENTIRE file. Scroll to the bottom to verify.

### ❌ Tables not showing up
**Solution:**
1. Refresh the Table Editor page
2. Check SQL Editor for error messages
3. Make sure migration completed successfully

### ❌ RLS policies not working
**Solution:**
1. Verify RLS is enabled (should be automatic)
2. Check policies exist: Table Editor → [table name] → View Policies

### ❌ Authentication not working
**Solution:**
1. Verify Email provider is enabled
2. Check browser console for errors
3. Make sure .env file has correct SUPABASE_URL and SUPABASE_ANON_KEY

## 📝 Quick Reference

### File Locations
```
supabase/migrations/
  ├── 000_cleanup.sql          ← Run FIRST (deletes everything)
  └── 001_initial_schema.sql   ← Run SECOND (creates everything)
```

### Supabase Dashboard Links
- **SQL Editor:** https://app.supabase.com/project/jpdqxjaosattvzjjumxz/sql
- **Table Editor:** https://app.supabase.com/project/jpdqxjaosattvzjjumxz/editor
- **Authentication:** https://app.supabase.com/project/jpdqxjaosattvzjjumxz/auth/users
- **Database:** https://app.supabase.com/project/jpdqxjaosattvzjjumxz/database/tables

## ✅ Verification Checklist

Check these off as you complete them:

- [ ] Ran 000_cleanup.sql successfully
- [ ] Ran 001_initial_schema.sql successfully
- [ ] See 10 tables in Table Editor
- [ ] RLS is enabled on all tables
- [ ] Email authentication is enabled
- [ ] Started dev server with `npm run dev`
- [ ] Can visit http://localhost:5000
- [ ] Can see login/signup page
- [ ] Successfully created a test account
- [ ] Made first user admin (optional)

## 🆘 Still Having Issues?

1. **Check Supabase Logs:**
   - Go to: Logs → Postgres Logs
   - Look for error messages

2. **Verify Project Status:**
   - Make sure project is not paused
   - Free tier projects pause after 7 days of inactivity

3. **Check Migration Files:**
   - Make sure files are complete
   - No missing lines
   - Proper SQL syntax

4. **Contact for Help:**
   - Check Supabase Discord: https://discord.supabase.com
   - Review Supabase docs: https://supabase.com/docs

---

**Need to start over?** Just run the cleanup script again and repeat the process!
