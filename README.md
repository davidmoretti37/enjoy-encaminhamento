# Recruitment Platform

A full-stack recruitment platform built with React, tRPC, Express, and Supabase.

## Tech Stack

- **Frontend**: React 19, Tailwind CSS, Radix UI, React Hook Form
- **Backend**: Express, tRPC, Supabase
- **Database**: PostgreSQL (via Supabase)
- **Testing**: Vitest

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

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with hot reload |
| `pnpm build` | Build for production |
| `pnpm start` | Run production build |
| `pnpm check` | TypeScript type checking |
| `pnpm test` | Run tests |
| `pnpm format` | Format code with Prettier |

## Project Structure

```
recruitment-platform/
├── backend/
│   ├── _core/           # Core server setup
│   │   ├── index.ts     # Express server entry point
│   │   ├── context.ts   # tRPC context (auth)
│   │   ├── env.ts       # Environment configuration
│   │   ├── logger.ts    # Logging & error tracking
│   │   ├── rateLimit.ts # Rate limiting middleware
│   │   └── trpc.ts      # tRPC initialization
│   ├── db/              # Database operations (modular)
│   │   ├── users.ts
│   │   ├── companies.ts
│   │   ├── candidates.ts
│   │   ├── jobs.ts
│   │   ├── applications.ts
│   │   ├── contracts.ts
│   │   ├── schools.ts
│   │   ├── affiliates.ts
│   │   └── ...
│   ├── routers/         # tRPC routers (modular)
│   │   ├── auth.ts
│   │   ├── company.ts
│   │   ├── candidate.ts
│   │   ├── job.ts
│   │   ├── school.ts
│   │   ├── affiliate.ts
│   │   └── ...
│   ├── services/        # Business logic
│   │   └── matching.ts  # AI candidate matching
│   └── __tests__/       # Backend tests
├── frontend/
│   └── src/
│       ├── components/  # React components
│       ├── lib/         # Utilities & hooks
│       └── pages/       # Page components
└── .env.example         # Environment template
```

## Environment Variables

See `.env.example` for all available configuration options.

### Required
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (for admin operations)

### Optional Integrations
- **SMTP**: Email sending (SMTP_HOST, SMTP_USER, SMTP_PASS)
- **Zoom**: Video meetings (ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET)
- **Google**: Calendar/Meet integration (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN)
- **OpenRouter**: AI matching (OPENROUTER_API_KEY)

## User Roles

| Role | Description |
|------|-------------|
| `admin` | Platform administrators |
| `affiliate` | Regional partners who manage schools |
| `school` | Educational institutions |
| `company` | Employers posting jobs |
| `candidate` | Job seekers |

## API

The API uses tRPC with the following routers:

- `auth` - Authentication
- `company` - Company portal
- `candidate` - Candidate profiles
- `job` - Job postings
- `application` - Job applications
- `school` - School management
- `affiliate` - Affiliate management
- `admin` - Admin dashboard
- `outreach` - Email & scheduling
- `contract` - Employment contracts

## Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
npx vitest

# Run with coverage
npx vitest --coverage
```

## Rate Limiting

The API includes rate limiting:
- Global: 1000 requests per 15 minutes per IP
- Auth endpoints: 20 requests per 15 minutes
- Email sending: 50 per hour

## License

MIT
