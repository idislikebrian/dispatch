# Deployment Guide

This guide covers how to deploy the Dispatch application locally or to Vercel.

## Prerequisites

- Node.js 20+ 
- A Neon Postgres database
- Git

## Local Deployment

### 1. Clone the Repository

```bash
git clone <repository-url>
cd dispatch
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database (Neon Postgres)
DATABASE_URL=postgresql://<user>:<password>@<host>/<database>?sslmode=require

# Session (generate with: openssl rand -base64 32)
SESSION_SECRET=your-generated-secret-here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

To generate a session secret:
```bash
openssl rand -base64 32
```

### 4. Set Up the Database

Push the Prisma schema to your database:

```bash
npx prisma db push
```

### 5. Generate Prisma Client

```bash
npx prisma generate
```

### 6. Build the Application

```bash
npm run build
```

### 7. Start the Application

For production:
```bash
npm start
```

For development:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

---

## Vercel Deployment

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

### Option 2: Deploy via Git Integration

1. Push your code to GitHub/GitLab/Bitbucket
2. Import your repository in the [Vercel Dashboard](https://vercel.com/new)
3. Configure the following environment variables in the Vercel dashboard:
   - `DATABASE_URL` - Your Neon Postgres connection string
   - `SESSION_SECRET` - Generated secret (run `openssl rand -base64 32`)
   - `NEXT_PUBLIC_APP_URL` - Your Vercel deployment URL
   - `NODE_ENV` - Set to `production`

4. Add the build command:
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Vercel Environment Variables

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Neon Postgres connection string | Yes |
| `SESSION_SECRET` | Session secret (32+ chars) | Yes |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` | Yes |
| `NODE_ENV` | `production` | Yes |

---

## Database Setup on Neon

1. Create a new project at [neon.tech](https://neon.tech)
2. Create a new database
3. Get the connection string from the dashboard
4. Use the connection string as `DATABASE_URL`

---

## Post-Deployment Verification

1. Check the application loads without errors
2. Verify database connection (try logging in or creating a task)
3. Check browser console for any client-side errors
4. Verify all environment variables are set correctly

---

## Troubleshooting

### Build Failures

If `npm run build` fails:
- Ensure all environment variables are set
- Run `npx prisma generate` before building
- Check that Node.js 20+ is installed

### Database Connection Issues

- Verify `DATABASE_URL` is correct
- Ensure Neon database allows connections from your IP/Vercel
- Check that SSL mode is enabled in the connection string

### Session Issues

- Ensure `SESSION_SECRET` is set and at least 32 characters
- For production, use a strong randomly generated secret

---

## Useful Commands

```bash
# Database	npx prisma studio          # Open Prisma Studio
npm run db:push             # Push schema changes
npm run db:migrate          # Run migrations

# Development
npm run dev                 # Start dev server
npm run build               # Production build
npm start                   # Start production server
```
