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

# Setup database and build
npx prisma db push
npx prisma generate
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
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
```

## Rules

- CSS Modules only — no Tailwind utility classes in components
- Strict TypeScript everywhere
- Feature-based component organization
- Minimal dependencies
