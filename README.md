# Dispatch

AI-native dispatch system for distributed teams.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Runtime:** React 19
- **Language:** TypeScript (strict mode)
- **Database:** Neon Postgres + Prisma ORM
- **Styling:** CSS Modules (no Tailwind utilities in components)
- **UI:** shadcn/ui primitives

## Quickstart

```bash
# Clone and install
git clone <repo-url> && cd dispatch
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and SESSION_SECRET

# Generate the client and apply reviewed migrations explicitly
npm run db:generate
npm run db:migrate:deploy
npm run build

# Start the app
npm start        # Production
npm run dev      # Development
```

See [DEPLOY.md](./DEPLOY.md) for detailed deployment instructions.

## Project Structure

```
/app
  /(dashboard)       # Route group for authenticated pages
    /tasks           # Task management
    /content         # Content workflows
    /memory          # Knowledge base
    /team            # Team coordination
    /office          # Virtual office
/components
  /features          # Feature-specific components
/lib
  /db                # Database utilities
  /auth              # Authentication
  /agents            # AI agent integrations
  /services          # Business logic
/prisma              # Database schema & migrations
/types               # Shared TypeScript types
/public              # Static assets
```

## Environment

```
DATABASE_URL="postgresql://...neon.tech/..."
```

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Create/apply a local development migration
npm run db:migrate:deploy # Apply committed migrations in a release environment
npm run db:check     # Check schema/migration drift (no database connection)
npm run db:studio    # Open Prisma Studio
npm run test:synthetic # Focused tests; no database or deployment
npm run diagnose:office-500 # Reproduce the office telemetry 500 diagnosis locally
npm run release:check # Validate release provenance inputs
npm run release:receipt # Write an ignored JSON provenance receipt
```

`npm run build` never mutates a database. Do not use `prisma db push` for a
release. Review and apply committed migrations with `db:migrate:deploy` as a
separate, explicitly authorized operation. `db:check` is repository-only and
does not prove that a connected database is current.

## Rules

- CSS Modules only — no Tailwind utility classes in components
- Strict TypeScript everywhere
- Feature-based component organization
- Minimal dependencies
