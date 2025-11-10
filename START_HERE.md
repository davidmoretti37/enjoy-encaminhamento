# 🚀 START HERE - Database Setup in 3 Steps

## Step 1: Delete Old Tables (30 seconds)

1. Open Supabase SQL Editor: https://app.supabase.com/project/jpdqxjaosattvzjjumxz/sql
2. Click **"New Query"**
3. Open this file on your computer: `supabase/migrations/000_cleanup.sql`
4. Copy EVERYTHING from that file (Cmd+A, Cmd+C)
5. Paste into SQL Editor
6. Click **"Run"** button (bottom right)
7. Wait for "Success" message

**✅ Done! Old tables deleted.**

---

## Step 2: Create New Tables (1 minute)

1. Click **"New Query"** again
2. Open this file: `supabase/migrations/001_initial_schema.sql`
3. Copy EVERYTHING (it's long! ~800 lines)
4. Paste into SQL Editor
5. Click **"Run"** button
6. Wait ~10 seconds for completion
7. Look for "Success" messages

**✅ Done! New tables created.**

---

## Step 3: Enable Authentication (30 seconds)

1. Click **"Authentication"** in left sidebar
2. Click **"Providers"** at the top
3. Find "Email" and toggle it **ON** (should turn green)
4. Click **"Save"** if there's a save button

**✅ Done! Authentication enabled.**

---

## 🎉 You're Ready!

Now start your app:

```bash
npm run dev
```

Visit: **http://localhost:5000**

Click **"Entrar"** or **"Começar Agora"** to sign up!

---

## 📝 Quick Check

After running migrations, verify in Supabase:

1. Go to **Table Editor** (left sidebar)
2. You should see these 10 tables:
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

If you see all 10 tables → **SUCCESS!** 🎉

---

## 🐛 Something Wrong?

**Tables already exist?**
- Run Step 1 again (000_cleanup.sql)

**SQL error?**
- Make sure you copied the ENTIRE file
- Scroll to bottom to check

**Tables not showing?**
- Refresh the page
- Check SQL Editor for error messages

---

## 🔑 Make Yourself Admin (Optional)

After creating your account:

1. Go to: **Authentication → Users**
2. Copy your user ID
3. Go to: **SQL Editor**
4. Run this (replace with your ID):

```sql
UPDATE public.users
SET role = 'admin'
WHERE id = 'paste-your-user-id-here';
```

---

## 📚 Need More Help?

- **Detailed Guide:** Read `RUN_MIGRATIONS.md`
- **Quick Start:** Read `QUICKSTART.md`
- **Full Docs:** Read `README.md`

---

**That's it! Simple as 1-2-3.** 🚀
