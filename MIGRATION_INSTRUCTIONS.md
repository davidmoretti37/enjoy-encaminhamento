# Supabase Migration Instructions

This project has been migrated from MySQL/Drizzle to Supabase (PostgreSQL).

## Step 1: Run the SQL Migration

1. Go to your Supabase dashboard: https://app.supabase.com/project/jpdqxjaosattvzjjumxz
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `supabase/migrations/001_initial_schema.sql`
5. Click **Run** to execute the migration
6. Verify that all tables were created successfully by checking the **Table Editor**

## Step 2: Configure Environment Variables

The `.env` file has been created with your Supabase credentials. If you need to add your service role key:

1. Go to your Supabase dashboard
2. Navigate to **Settings** → **API**
3. Copy the `service_role` key (keep this secret!)
4. Add it to your `.env` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

## Step 3: Authentication Setup

Since this project now uses Supabase Auth, you need to configure authentication:

### Option A: Use Supabase Email/Password Auth

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Enable **Email** provider
3. Users can sign up at: `https://jpdqxjaosattvzjjumxz.supabase.co/auth/v1/signup`

### Option B: Use OAuth Providers (Google, GitHub, etc.)

1. Go to **Authentication** → **Providers**
2. Enable your preferred OAuth provider (Google, GitHub, etc.)
3. Configure the OAuth credentials
4. Update the redirect URLs

### Creating Your First Admin User

After signing up your first user, you need to set them as admin:

1. Get your user ID from **Authentication** → **Users** in the dashboard
2. Go to **SQL Editor** and run:
   ```sql
   UPDATE public.users
   SET role = 'admin'
   WHERE id = 'your-user-id-here';
   ```

Or set the `OWNER_USER_ID` in your `.env` file before the user signs up, and the system will automatically make them an admin.

## Step 4: Update Client Authentication

The client needs to be updated to use Supabase Auth. Here's a sample implementation for login:

```typescript
// In your login component
import { supabase } from '@/lib/supabase';

// Email/Password Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
});

// OAuth Login (e.g., Google)
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: window.location.origin + '/dashboard'
  }
});

// Logout
await supabase.auth.signOut();
```

## Step 5: Update tRPC Client

The tRPC client needs to send the Supabase auth token with requests. Update your tRPC client setup:

```typescript
// client/src/lib/trpc.ts
import { supabase } from './supabase';

const getAuthToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: '/trpc',
      async headers() {
        const token = await getAuthToken();
        return token ? {
          authorization: `Bearer ${token}`,
        } : {};
      },
    }),
  ],
});
```

## Step 6: Test the Migration

1. Install dependencies (if not already done):
   ```bash
   npm install --legacy-peer-deps
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Test the following:
   - [ ] User signup/login works
   - [ ] Company profile creation
   - [ ] Job posting creation
   - [ ] Candidate profile creation
   - [ ] Application submission
   - [ ] Contract creation
   - [ ] Notifications

## Key Changes

### Database
- ✅ Changed from MySQL to PostgreSQL
- ✅ Changed IDs from auto-increment integers to UUIDs
- ✅ Added Row Level Security (RLS) policies
- ✅ Replaced TEXT fields with appropriate types (JSONB for JSON data)
- ✅ Added proper indexes for performance

### Authentication
- ✅ Now using Supabase Auth instead of custom JWT
- ✅ User sessions managed by Supabase
- ✅ Support for multiple OAuth providers

### File Storage
- 📝 Files should now be stored in Supabase Storage instead of S3
- 📝 Update file upload logic to use: `supabase.storage.from('bucket-name').upload()`

### Real-time Features (Optional)
You can now use Supabase's real-time subscriptions for live updates:

```typescript
// Subscribe to new notifications
supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    console.log('New notification!', payload);
  })
  .subscribe();
```

## Rollback (If Needed)

If you need to rollback to the old MySQL/Drizzle setup:

1. Restore the old `server/db.ts` file
2. Update `server/routers.ts` to import from `./db` instead of `./db-supabase`
3. Restore the old `server/_core/context.ts`
4. Remove Supabase dependencies

## Support

For issues or questions:
1. Check Supabase docs: https://supabase.com/docs
2. Check the Supabase dashboard logs
3. Review the migration SQL file for any errors

## Next Steps

1. ✅ Set up Supabase Storage buckets for file uploads
2. ✅ Configure authentication providers
3. ✅ Set up database backups
4. ✅ Configure production environment variables
5. ✅ Set up monitoring and alerts
