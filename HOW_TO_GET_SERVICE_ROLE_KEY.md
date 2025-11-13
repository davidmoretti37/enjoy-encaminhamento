# How to Get Your Supabase Service Role Key

## Why You Need This Key

The service role key is required for admin operations that need to bypass Row Level Security (RLS) policies, such as:
- Creating affiliate invitations
- Managing affiliate accounts
- Other admin-level database operations

Without this key, the system will use the anon key which enforces RLS policies, causing errors like:
- `new row violates row-level security policy for table "affiliate_invitations"`
- `Invalid API key`

## Steps to Get the Service Role Key

1. **Go to your Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard

2. **Select Your Project**
   - Click on your project: `jpdqxjaosattvzjjumxz`

3. **Go to Project Settings**
   - Click the gear icon (⚙️) in the left sidebar
   - Or go to: Settings → API

4. **Copy the Service Role Key**
   - Scroll down to the "Project API keys" section
   - Find the **service_role** key (NOT the anon key)
   - It will be labeled as "secret" - this is normal
   - Click the "Copy" button next to it
   - **⚠️ IMPORTANT**: This key is sensitive - treat it like a password!

5. **Add It to Your .env File**
   - Open `/Users/david/Downloads/recruitment-platform/.env`
   - Find the line that says `# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here`
   - Uncomment it and replace with your actual key:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_actual_key_here...
   ```

6. **Restart the Server**
   - Stop the current server (Ctrl+C in the terminal running npm)
   - Run `npm run dev` again
   - The server will now use the service role key for admin operations

## Security Note

**NEVER** commit the service role key to version control (git). The `.env` file should already be in `.gitignore`, but double-check to ensure your service role key stays private.

## Verification

After adding the key and restarting:
1. Go to the Affiliate Management page (`/admin/affiliates`)
2. Click "Convidar Novo Franqueado"
3. Fill in the form and submit
4. The invitation should be created successfully without errors

If you still see errors after adding the key:
- Make sure you copied the **service_role** key, not the anon key
- Make sure there are no extra spaces before or after the key
- Make sure you restarted the server after adding the key
- Check the server console for any error messages
