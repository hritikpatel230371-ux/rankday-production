# RankDay

RankDay is an AI-powered personal productivity and academic command center. It turns a natural-language daily reflection into confirmed activities, tests, syllabus signals, and a deterministic personal rank from 0 to 1000.

The architecture keeps responsibilities separate:

- AI understands what the user said.
- PostgreSQL stores what happened.
- The rank engine calculates what it means.
- Next.js shows it clearly.

## Features

- User registration and email/password authentication with bcrypt password hashes and signed HTTP-only sessions.
- User-owned PostgreSQL data via Prisma ORM.
- AI daily log extraction with Gemini provider and safe mock fallback.
- Editable activity confirmation before anything affects rank.
- Deterministic rank engine with weighting, exam urgency, caps, diminishing returns, consistency, and explanations.
- Dashboard, Daily Log, Activities, Rank, Goals, To-Do, Planner, Exams, Syllabus, Tests, Analytics, AI Insights, Settings, and JSON export.
- Optional sample data for DBMS, Operating Systems, Computer Networks, DSA, exams, goals, tests, activities, and rank history.
- Responsive desktop sidebar and mobile bottom navigation.
- Dark/light theme support.
- Tests for rank logic, exam urgency, score helpers, AI validation, and authorization helper behavior.

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- shadcn-style local UI primitives
- Lucide React
- Recharts
- Zod
- Prisma ORM
- PostgreSQL
- Vitest
- Gemini API with an explicit mock development provider

## Prerequisites

- Node.js 22+
- npm 10+
- Supabase PostgreSQL database or another PostgreSQL-compatible database

## Environment Variables

Set `DATABASE_URL` to the PostgreSQL connection URI copied from your Supabase project's **Connect** dialog. Use the connection method appropriate for your network; do not use the project's HTTPS API URL or publishable key as the database URI.

```bash
# Set DATABASE_URL in both .env.local and .env using your actual Supabase PostgreSQL URI.
AUTH_SECRET="replace-with-a-strong-random-secret"
GEMINI_API_KEY=""
AI_PROVIDER="mock"
APP_NAME="RankDay"
```

Prisma connects directly to PostgreSQL through `DATABASE_URL`; its database operations do not use Supabase API keys. Do not commit `.env.local`.

Next.js loads `.env.local`, while Prisma CLI commands load `.env`. Set the same real `DATABASE_URL` in both files so the application and migration commands use the same database. The project intentionally does not provide a localhost fallback.

The Supabase SSR client helpers use `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. RankDay account authentication and user records use its Prisma-backed PostgreSQL flow; the project does not use Supabase Auth for application accounts.

Set `AI_PROVIDER=gemini` and configure `GEMINI_API_KEY` locally to use Gemini. The app does not silently substitute mock output when Gemini is selected but the key is missing; it returns a setup error instead. Set `AI_PROVIDER=mock` explicitly for development scripts, which are labelled as mock output in the Reel Generator.

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file from the example:

```bash
copy .env.example .env.local
```

Then update `.env.local` and `.env` with the same Supabase PostgreSQL URI and configure a strong local `AUTH_SECRET`:

```env
# Set DATABASE_URL in both .env.local and .env using your actual Supabase PostgreSQL URI.
AUTH_SECRET="replace-with-a-strong-random-development-secret"
GEMINI_API_KEY=""
AI_PROVIDER="mock"
APP_NAME="RankDay"
```

3. Generate Prisma Client and verify the configured schema:

```bash
npx prisma generate
npx prisma validate
npx prisma migrate status
npm run dev
```

Register an account at `/register`, or sign in at `/login`. There is no hardcoded demo login.

The original Prisma schema matched the existing Supabase database. Its schema was baselined without executing the baseline's table-creation SQL, then additive migrations were applied for revocable sessions and private-table Data API hardening. The RankDay tables have RLS enabled, with direct `anon` and `authenticated` table access revoked; future tables and sequences created by Prisma in `public` also do not receive those default grants. Review future migrations and enable RLS for every new exposed-schema table.

The application connects through Prisma using the database owner role, which bypasses RLS. Therefore every application query and mutation must still enforce the signed-in user's ownership server-side. Do not use the database owner credentials from a client or expose them through public environment variables.

To add optional sample records to an account you own, first register the account and set `SEED_USER_EMAIL` in your local environment. Then run `npm run seed`. The seed script never creates an account or sets its password.

## Development Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

Database commands:

```bash
npx prisma generate
# Only run a reviewed migration after verifying it is safe for the target database.
npm run seed
```

## Project Structure

```text
app/                 Next.js routes and API handlers
ai/                  AI provider interface, Gemini provider, mock provider
components/          App shell, forms, charts, UI primitives
lib/                 Auth, Prisma, rank engine, defaults, utilities
prisma/              Schema and seed data
tests/               Vitest coverage for critical logic
validation/          Zod schemas for AI and form/API input
```

## Rank Algorithm

The rank engine lives in `lib/rank-engine`. It accepts structured facts and returns:

- score from 0 to 1000
- daily delta
- component scores
- human-readable reasons

Weighted components:

- Goal completion
- Study progress
- Exam preparedness
- Test performance
- Consistency
- Time management
- Long-term progress

Fairness rules include daily positive/negative caps, bounded score output, exam urgency smoothing, task priority weighting, and a one-bad-day protection cap.

## AI Flow

Daily log processing follows this pipeline:

```text
User paragraph
AI extraction
Zod schema validation
User confirmation
Database transaction
Rank engine
Rank snapshot
```

The LLM never directly changes rank.

## Deployment

The app is designed for:

- Vercel for Next.js
- Supabase, Neon, or any PostgreSQL-compatible database

Set production environment variables in the deployment provider, then run Prisma migrations against the production database.

## Validation Performed

This workspace has been validated with:

```bash
npx prisma generate
npm run typecheck
npm run lint
npm run test
npm run build
```

## Known Limitations

- OAuth/Auth.js provider switching is not implemented; the application uses bcrypt-hashed local credentials with signed HTTP-only sessions.
- Notifications and advanced global search are intentionally not included in the first build.
- CSV export and account deletion UI are planned extensions; JSON export is implemented.
- Database migrations require a reachable PostgreSQL instance through `DATABASE_URL`.
