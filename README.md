# 🎯 Recruitment Platform - Franchise Management System

A comprehensive recruitment and contract management platform built for the Brazilian market, featuring AI-powered candidate matching, digital signatures, automated billing, and franchise management.

---

## 🌟 Project Overview

This platform enables recruitment franchises to manage the entire hiring lifecycle:

- **Super Admins** manage the franchise network
- **Affiliates** (franchisees) manage their schools
- **Schools** (companies) post jobs and hire candidates
- **Candidates** register, take tests, and apply for jobs

**Current Status:** ~40% complete | Foundation ready, building features

---

## 🏗️ Architecture

### Tech Stack

**Frontend:**
- React 19 + TypeScript
- Vite (build tool)
- TailwindCSS + shadcn/ui
- tRPC (type-safe APIs)
- React Query (data fetching)

**Backend:**
- Node.js + Express
- tRPC server
- TypeScript

**Database:**
- Supabase (PostgreSQL)
- Row Level Security (RLS)
- Real-time subscriptions

**Infrastructure:**
- Supabase Auth (authentication)
- Supabase Storage (file storage)
- Supabase Edge Functions (serverless)

### Hierarchy Structure

```
Super Admin (Franchise Owner)
└── Affiliate (Franchisee/Recruiter)
    └── School (Company)
        └── Job Posting
            └── Candidates
                └── Applications
                    └── Contracts
```

---

## 📁 Project Structure

```
recruitment-platform/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── lib/           # Utilities (Supabase client, auth helpers)
│   │   └── main.tsx       # App entry point
│   └── package.json
├── server/                 # Node.js backend
│   ├── routers/           # tRPC routers (API endpoints)
│   ├── lib/               # Business logic
│   ├── types/             # TypeScript types
│   ├── _core/             # Core utilities (context, auth)
│   ├── db.ts              # Database queries
│   └── index.ts           # Server entry point
├── supabase/              # Database migrations
│   └── migrations/
│       ├── 000_cleanup.sql           # Reset database
│       ├── 001_initial_schema.sql    # Initial schema
│       └── 002_franchise_v3.sql      # Franchise structure
├── docs/                   # Documentation
│   ├── PROJECT_STATUS.md             # Current vs specification
│   ├── MIGRATION_HISTORY.md          # Database evolution
│   └── DEVELOPMENT_ROADMAP.md        # Feature roadmap
├── .env                    # Environment variables
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- Git

### 1. Clone & Install

```bash
cd /Users/david/Downloads/recruitment-platform
npm install
```

### 2. Environment Setup

Create `.env` file (already exists, verify these values):

```bash
# Supabase
SUPABASE_URL=https://jpdqxjaosattvzjjumxz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Vite (client-side)
VITE_SUPABASE_URL=https://jpdqxjaosattvzjjumxz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_TITLE=Recrutamento

# Server
PORT=3000
```

### 3. Database Setup

Run migrations in Supabase SQL Editor:
https://app.supabase.com/project/jpdqxjaosattvzjjumxz/sql

**Option A: Fresh Setup**
```sql
-- 1. Clean database (if needed)
-- Copy contents of supabase/migrations/000_cleanup.sql

-- 2. Create schema
-- Copy contents of supabase/migrations/001_initial_schema.sql

-- 3. Add franchise structure
-- Copy contents of supabase/migrations/002_franchise_v3.sql
```

**Option B: Quick Setup (if clean database)**
```sql
-- Just run 001 and 002 in sequence
```

### 4. Create Super Admin

After migrations, create your admin user:

```sql
-- Replace with your auth user ID from Supabase Auth dashboard
UPDATE public.users
SET role = 'super_admin'
WHERE id = 'your-user-id-here';

-- Or insert new user
INSERT INTO public.users (id, email, role, name, phone, created_at, updated_at)
VALUES (
  'your-auth-user-id',
  'admin@agencianacional.com',
  'super_admin',
  'Admin User',
  '+5511999999999',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
```

### 5. Start Development

```bash
# Terminal 1: Start backend
npm run dev

# Terminal 2: Start frontend
npm run dev:client
```

Open browser: http://localhost:5173

---

## 📊 Current Features

### ✅ Implemented

**Core Infrastructure:**
- [x] PostgreSQL database with 10 tables
- [x] Supabase authentication (email/password + OAuth)
- [x] Role-based access control (4 roles)
- [x] Row Level Security policies
- [x] Franchise hierarchy (Super Admin → Affiliates → Schools)
- [x] Type-safe API with tRPC
- [x] Modern UI with shadcn/ui components

**User Management:**
- [x] User registration and login
- [x] Role assignment (super_admin, affiliate, school, candidate)
- [x] User profiles
- [x] Password reset

**Company/School Management:**
- [x] School registration
- [x] School profiles
- [x] Affiliate assignment

**Job Management:**
- [x] Job posting (basic)
- [x] Job listing
- [x] Job details
- [x] Application tracking

**Basic Dashboards:**
- [x] Admin dashboard (basic stats)
- [x] Company dashboard (jobs, applications)
- [x] Candidate profile

### ❌ Not Yet Implemented (Priority Order)

**Phase 1 - MVP (4-6 weeks):**
- [ ] Candidate registration portal with tests
- [ ] AI-powered candidate matching
- [ ] Email automation system
- [ ] Enhanced job management UI
- [ ] Basic contract generation

**Phase 2 - Automation (6-8 weeks):**
- [ ] Digital signature integration (DocuSign)
- [ ] Payment gateway (Stripe)
- [ ] Automated feedback system
- [ ] WhatsApp notifications

**Phase 3 - Advanced (8-12 weeks):**
- [ ] Sales funnel & CRM
- [ ] Company capture automation
- [ ] Advanced analytics
- [ ] Ministry of Labor integration (Brazil)
- [ ] Document portal

See `docs/DEVELOPMENT_ROADMAP.md` for detailed feature breakdown.

---

## 📚 Documentation

### Core Documents

- **[PROJECT_STATUS.md](docs/PROJECT_STATUS.md)** - Current vs specification comparison
- **[MIGRATION_HISTORY.md](docs/MIGRATION_HISTORY.md)** - Database evolution and migration guide
- **[DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md)** - Feature roadmap and timeline

### Database Documentation

**Tables (10):**
1. `users` - User accounts and roles
2. `affiliates` - Franchise partners (NEW)
3. `schools` - Companies/hiring organizations (renamed from companies)
4. `candidates` - Job seekers
5. `jobs` - Job postings
6. `applications` - Job applications
7. `contracts` - Employment contracts
8. `feedback` - Performance reviews
9. `payments` - Financial transactions
10. `documents` - Document storage
11. `notifications` - User notifications

**Roles:**
- `super_admin` - Franchise owner (full access)
- `affiliate` - Franchisee/recruiter (manages schools)
- `school` - Company (posts jobs, hires candidates)
- `candidate` - Job seeker (applies to jobs)

### API Documentation

All API endpoints are type-safe via tRPC. See `server/routers/` for available endpoints.

**Example Router Structure:**
```typescript
// server/routers/jobs.ts
export const jobsRouter = router({
  getAll: publicProcedure.query(async () => {...}),
  getById: publicProcedure.input(z.string()).query(async ({ input }) => {...}),
  create: protectedProcedure.input(jobSchema).mutation(async ({ input, ctx }) => {...}),
  update: protectedProcedure.input(updateJobSchema).mutation(async ({ input, ctx }) => {...}),
  delete: protectedProcedure.input(z.string()).mutation(async ({ input, ctx }) => {...}),
});
```

---

## 🔐 Security

### Row Level Security (RLS)

All tables have RLS policies that enforce:
- Users can only see their own data
- Affiliates can see their schools' data
- Schools can see their jobs and applications
- Super admins can see everything

**Example Policy:**
```sql
CREATE POLICY "Schools, affiliates, and super admins can view" ON public.schools
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.affiliates WHERE id = schools.affiliate_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'super_admin')
  );
```

### Authentication

- Supabase Auth handles all authentication
- JWT tokens for API authentication
- OAuth support (Google, GitHub)
- Email verification
- Password reset

---

## 🧪 Testing

### Manual Testing Workflow

1. **Test User Registration:**
   - Register as candidate
   - Register as school
   - Verify email

2. **Test Job Posting:**
   - Login as school
   - Create job posting
   - Verify job appears in listing

3. **Test Application:**
   - Login as candidate
   - Apply to job
   - Verify application appears in school dashboard

4. **Test Admin Features:**
   - Login as super_admin
   - View all schools/candidates/jobs
   - Create affiliate
   - Assign school to affiliate

### Future: Automated Testing

```bash
# Unit tests (not yet implemented)
npm test

# E2E tests (not yet implemented)
npm run test:e2e
```

---

## 🐛 Troubleshooting

### Common Issues

**1. "Invalid URL" Error**
- Ensure all `VITE_` prefixed env vars are set
- Restart dev server after changing .env

**2. "Access Denied" on Dashboard**
- Check user role in Supabase Auth dashboard
- Run SQL to update user role to super_admin

**3. Stuck Node Processes**
```bash
# Kill all Node/TSX processes
pkill -f tsx && pkill -f node && pkill -f vite
```

**4. Database Migration Fails**
- Ensure you're using `002_franchise_v3.sql` (not v1 or v2)
- Check for existing conflicting data
- Run `000_cleanup.sql` if needed to reset

**5. tRPC Errors**
- Check that backend is running on port 3000
- Verify Supabase credentials in .env
- Check browser console for detailed error

### Debug Mode

```bash
# Backend with detailed logging
DEBUG=* npm run dev

# Check Supabase logs
# Visit: https://app.supabase.com/project/jpdqxjaosattvzjjumxz/logs/explorer
```

---

## 📈 Performance

### Current Optimizations

- Database indexes on foreign keys
- tRPC request batching
- React Query caching
- Supabase connection pooling

### Future Optimizations (Phase 3)

- [ ] Redis caching layer
- [ ] CDN for static assets
- [ ] Database query optimization
- [ ] Code splitting for client bundle
- [ ] Lazy loading for images

---

## 🚢 Deployment

### Recommended Hosting

**Frontend:**
- Vercel (recommended)
- Netlify
- Cloudflare Pages

**Backend:**
- Railway
- Render
- Fly.io
- DigitalOcean App Platform

**Database:**
- Supabase (already hosted)

### Environment Variables for Production

```bash
# Production .env
NODE_ENV=production
SUPABASE_URL=https://jpdqxjaosattvzjjumxz.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key (backend only)

# Add when implementing features:
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...
STRIPE_SECRET_KEY=sk_live_...
DOCUSIGN_CLIENT_ID=...
WHATSAPP_API_KEY=...
```

### Deployment Checklist

- [ ] Set up production Supabase project (or use current)
- [ ] Run migrations on production database
- [ ] Configure environment variables
- [ ] Set up custom domain
- [ ] Configure SSL certificate
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure backup strategy
- [ ] Test all user flows in production
- [ ] Set up uptime monitoring

---

## 🤝 Contributing

### Development Workflow

1. Create feature branch
   ```bash
   git checkout -b feature/candidate-testing
   ```

2. Make changes

3. Test locally

4. Commit with descriptive message
   ```bash
   git commit -m "feat: add candidate testing portal"
   ```

5. Push and create PR
   ```bash
   git push origin feature/candidate-testing
   ```

### Commit Convention

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Maintenance tasks

---

## 📞 Support

### Project Resources

- **Supabase Dashboard:** https://app.supabase.com/project/jpdqxjaosattvzjjumxz
- **SQL Editor:** https://app.supabase.com/project/jpdqxjaosattvzjjumxz/sql
- **Auth Users:** https://app.supabase.com/project/jpdqxjaosattvzjjumxz/auth/users

### Getting Help

1. Check documentation in `docs/` folder
2. Review troubleshooting section above
3. Check Supabase logs
4. Review browser console errors

---

## 📝 License

Proprietary - All rights reserved

---

## 🎯 Next Steps

### This Week
1. ✅ Complete database migration to franchise structure
2. ✅ Document current state vs specification
3. ✅ Create development roadmap
4. [ ] Choose AI provider for matching
5. [ ] Set up email service (Resend)
6. [ ] Start Phase 1.1: Candidate Registration Portal

### This Month
- [ ] Complete candidate registration with tests (Phase 1.1 & 1.2)
- [ ] Implement AI matching system (Phase 1.3)
- [ ] Set up email automation (Phase 1.4)
- [ ] Launch MVP beta

### This Quarter
- [ ] Complete Phase 1 (MVP)
- [ ] Onboard 10 beta schools
- [ ] Gather user feedback
- [ ] Start Phase 2 (automation & integrations)

See `docs/DEVELOPMENT_ROADMAP.md` for complete timeline.

---

**Built with ❤️ for the Brazilian recruitment market**
