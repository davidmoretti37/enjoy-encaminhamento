# Recruitment Platform

AI-powered B2B2C recruitment platform connecting regional agencies with companies and candidates.

## Architecture Overview

```
Admin (top-level)
  └── Agencies (regional recruitment offices)
        ├── Companies (employers)
        └── Candidates (job seekers)
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite, Tailwind CSS, Radix UI |
| Backend | Node.js, Express, tRPC 11 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT) |
| AI/LLM | OpenRouter API |
| Email | Nodemailer (SMTP) |

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
pnpm dev
```

The app runs at `http://localhost:5001`

## User Roles

| Role | Description | Dashboard |
|------|-------------|-----------|
| `admin` | Top-level administrators | `/admin/dashboard` |
| `agency` | Regional recruitment offices | `/agency/dashboard` |
| `company` | Employers posting jobs | `/company/portal` |
| `candidate` | Job seekers | `/candidate` |

## Project Structure

```
recruitment-platform/
├── backend/
│   ├── _core/              # Server entry, auth, config
│   ├── db/                 # Database operations
│   │   ├── agencies.ts     # Agency (region) operations
│   │   ├── companies.ts
│   │   ├── candidates.ts
│   │   ├── jobs.ts
│   │   └── ...
│   ├── routers/            # tRPC API routers
│   │   ├── agency.ts       # Agency management
│   │   ├── company.ts
│   │   ├── candidate.ts
│   │   ├── job.ts
│   │   ├── matching.ts     # AI matching
│   │   └── ...
│   ├── services/
│   │   └── matching/       # AI matching pipeline
│   └── supabase/
│       └── migrations/     # Database schema
│
├── frontend/
│   └── src/
│       ├── pages/          # Page components
│       ├── components/     # Reusable UI
│       └── lib/            # Utilities
│
└── .env                    # Configuration
```

## API Routers

| Router | Purpose |
|--------|---------|
| `auth` | Login, signup, session |
| `agency` | Regional office management |
| `company` | Employer portal |
| `candidate` | Job seeker profiles |
| `job` | Job postings |
| `application` | Job applications |
| `matching` | AI candidate matching |
| `contract` | Employment contracts |
| `batch` | Candidate batches |
| `outreach` | Email & scheduling |

## AI Matching System

4-stage pipeline:
1. **Vector Retrieval** - Semantic similarity search
2. **Soft Scoring** - 9 weighted factors (skills, location, education, etc.)
3. **Bidirectional Matching** - Candidate preference alignment
4. **LLM Re-Ranking** - AI refinement of top candidates

Weight profiles: `balanced`, `technical`, `customer_facing`, `entry_level`, `leadership`

## Environment Variables

### Required
```
SUPABASE_URL=your-project-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Optional
```
# AI Matching
OPENROUTER_API_KEY=your-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email
SMTP_PASS=your-app-password

# Meetings
ZOOM_ACCOUNT_ID=...
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Run production build |
| `pnpm check` | TypeScript type checking |
| `pnpm test` | Run tests |

## Database Migrations

Migrations are in `backend/supabase/migrations/`. Key migration:
- `048_school_to_agency_rename.sql` - Renames schools→agencies

Run migrations in Supabase SQL Editor.

## License

MIT
