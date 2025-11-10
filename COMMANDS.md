# Useful Commands Reference

## Kill Processes on Ports

### Kill specific ports (5000, 5001)
```bash
lsof -ti:5000,5001 | xargs kill -9
```

### Kill all Node processes
```bash
pkill -f node
```

### Kill process on a single port
```bash
lsof -ti:5000 | xargs kill -9
```

### Find what's running on a port
```bash
lsof -i:5000
```

## Development Commands

### Start dev server
```bash
npm run dev
```

### Build for production
```bash
npm run build
```

### Start production server
```bash
npm start
```

### Type checking
```bash
npm run check
```

### Format code
```bash
npm run format
```

### Run tests
```bash
npm test
```

## Port Management

### List all ports in use
```bash
lsof -i -P -n | grep LISTEN
```

### Kill all processes on ports 3000-6000
```bash
for port in {3000..6000}; do lsof -ti:$port | xargs kill -9 2>/dev/null; done
```

## Quick Restart

### Kill and restart dev server
```bash
lsof -ti:5000,5001 | xargs kill -9 && npm run dev
```

## Troubleshooting

### Clear npm cache
```bash
npm cache clean --force
```

### Reinstall dependencies
```bash
rm -rf node_modules package-lock.json && npm install --legacy-peer-deps
```

### Clear Vite cache
```bash
rm -rf node_modules/.vite
```

### Full reset
```bash
lsof -ti:5000,5001 | xargs kill -9
rm -rf node_modules package-lock.json node_modules/.vite
npm install --legacy-peer-deps
npm run dev
```

## Supabase Commands (if using CLI)

### Login to Supabase
```bash
npx supabase login
```

### Link to project
```bash
npx supabase link --project-ref jpdqxjaosattvzjjumxz
```

### Pull database types
```bash
npx supabase gen types typescript --project-id jpdqxjaosattvzjjumxz > server/types/database.ts
```

## Git Commands

### Initialize git (if not done)
```bash
git init
```

### Add all files
```bash
git add .
```

### Commit
```bash
git commit -m "Migrated to Supabase"
```

### Check status
```bash
git status
```

## macOS Specific

### Kill all Node/npm processes
```bash
killall node
```

### Free up port forcefully
```bash
sudo lsof -ti:5000 | xargs sudo kill -9
```

---

**Pro Tip:** Save this file for quick reference!
