# Troubleshooting Guide

## Process Won't Stop / Stuck tsx Process

If you see "Process didn't exit in 5s. Force killing..." repeatedly:

### Solution 1: Kill all Node processes
```bash
pkill -f tsx && pkill -f node && pkill -f vite
```

### Solution 2: Kill specific ports
```bash
lsof -ti:5000,5001 | xargs kill -9
```

### Solution 3: Nuclear option (kills everything Node-related)
```bash
killall node
```

### Solution 4: Restart terminal
Close and reopen your terminal, then:
```bash
npm run dev
```

## Environment Variable Errors

### Error: "Malformed URI sequence" or "%VITE_APP_LOGO%"

**Cause:** Missing environment variables

**Fix:** Make sure your `.env` file has these lines:
```env
VITE_APP_TITLE=Recrutamento
VITE_SUPABASE_URL=https://jpdqxjaosattvzjjumxz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Then restart the server:**
```bash
pkill -f node && npm run dev
```

## Port Already in Use

### Error: "Port 5000 is already in use"

```bash
# Kill the process on port 5000
lsof -ti:5000 | xargs kill -9

# Start again
npm run dev
```

## Database Connection Issues

### Error: "Failed to connect to database"

**Check:**
1. Is Supabase project active? (Free tier pauses after 7 days)
2. Are environment variables correct in `.env`?
3. Did you run the SQL migrations?

**Fix:**
1. Go to https://app.supabase.com/project/jpdqxjaosattvzjjumxz
2. Check if project is paused (click "Resume" if needed)
3. Verify credentials match `.env` file

## Authentication Not Working

### Error: "Auth error" or can't login

**Check:**
1. Email provider enabled in Supabase?
2. SQL migrations ran successfully?
3. User exists in database?

**Fix:**
1. Go to: Authentication → Providers
2. Enable "Email" provider
3. Try signing up again

## SQL Migration Errors

### Error: "relation already exists"

**Fix:** Run cleanup first:
```sql
-- Copy from supabase/migrations/000_cleanup.sql
```

### Error: "syntax error"

**Fix:** Make sure you copied the ENTIRE SQL file, scroll to the bottom to verify.

## Build Errors

### Error: TypeScript errors after migration

```bash
npm run check
```

If you see TypeScript errors, they're likely from old imports. Most should be warnings, not blocking errors.

## Module Not Found

### Error: "Cannot find module @supabase/supabase-js"

```bash
npm install --legacy-peer-deps
```

## Vite Cache Issues

### Page shows old code or errors

```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Restart
npm run dev
```

## Complete Reset

If nothing works, nuclear reset:

```bash
# Kill everything
pkill -f node

# Clean everything
rm -rf node_modules package-lock.json node_modules/.vite

# Reinstall
npm install --legacy-peer-deps

# Start fresh
npm run dev
```

## Common Warnings (Safe to Ignore)

These are normal and won't affect functionality:

- `MaxListenersExceededWarning` (happens during force kills)
- `deprecated` package warnings
- `peer dependency` warnings (that's why we use --legacy-peer-deps)

## Quick Diagnostic

Run this to check everything:

```bash
# Check if ports are in use
lsof -i:5000,5001

# Check environment variables are loaded
cat .env | grep VITE

# Check Node is working
node --version

# Check npm is working
npm --version
```

## Still Stuck?

1. **Check server logs** - Look for the actual error message
2. **Check browser console** - Press F12, look for errors
3. **Check Supabase logs** - Dashboard → Logs → Postgres Logs
4. **Try a different port** - Change PORT=5000 to PORT=3000 in .env

---

**Most Common Issue:** Processes not stopping properly
**Most Common Fix:** `pkill -f node` then restart
