# Quick Start Guide - Supabase Migration

## 🚀 Get Started in 5 Minutes

### Step 1: Run SQL Migration (2 minutes)

1. **Open Supabase Dashboard**
   - Visit: https://app.supabase.com/project/jpdqxjaosattvzjjumxz
   - Login with your Supabase account

2. **Navigate to SQL Editor**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Run the Migration**
   - Open the file: `supabase/migrations/001_initial_schema.sql`
   - Copy ALL contents (Cmd+A, Cmd+C)
   - Paste into Supabase SQL Editor
   - Click **Run** button (or Cmd+Enter)
   - Wait ~10 seconds for execution

4. **Verify Success**
   - Go to **Table Editor** in left sidebar
   - You should see 10 tables: users, companies, candidates, jobs, applications, contracts, feedback, payments, documents, notifications

### Step 2: Start Development Server (1 minute)

```bash
# Install dependencies (if not done)
npm install --legacy-peer-deps

# Start the server
npm run dev
```

Server starts at http://localhost:5000

### Step 3: Set Up Authentication (2 minutes)

1. **Enable Email Auth**
   - Go to Supabase Dashboard → **Authentication** → **Providers**
   - Enable **Email** provider
   - Save changes

2. **Test Signup** (you'll need to create a login UI or use Supabase Auth UI)
   ```typescript
   // For now, you can test auth with Supabase API directly
   // Or use Supabase Auth UI components
   ```

### Step 4: Create Admin User

After your first signup, make yourself admin:

1. Go to **Authentication** → **Users** in Supabase dashboard
2. Copy your user ID
3. Go to **SQL Editor**
4. Run:
   ```sql
   UPDATE public.users
   SET role = 'admin'
   WHERE id = 'paste-your-user-id-here';
   ```

## ✅ You're Ready!

The platform is now running on Supabase with:
- ✅ PostgreSQL database with 10 tables
- ✅ Row Level Security (RLS) enabled
- ✅ Authentication ready
- ✅ All backend APIs working

## Next Steps

1. **Build Login UI** - Create signup/login forms using Supabase Auth
2. **Test Features** - Try creating companies, jobs, candidates, applications
3. **Set Up Storage** - Configure Supabase Storage for file uploads
4. **Deploy** - Deploy to Vercel/Netlify when ready

## Need Help?

- See `MIGRATION_INSTRUCTIONS.md` for detailed guide
- See `SUPABASE_MIGRATION_SUMMARY.md` for complete overview
- Check Supabase Dashboard logs for any errors

## Common Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run type checking
npm run check

# Format code
npm run format
```

## Environment Variables

Already configured in `.env`:
```
SUPABASE_URL=https://jpdqxjaosattvzjjumxz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Optional**: Add service role key for admin operations
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

**That's it!** Your recruitment platform is now powered by Supabase. 🎉
