import { existsSync } from 'node:fs';
import { defineConfig } from 'prisma/config';
import { guardPrismaCommand } from './lib/db/destructive-guard';

// A config file turns off Prisma's own .env loading; variables already set win.
if (existsSync('.env')) process.loadEnvFile('.env');

guardPrismaCommand(process.argv.slice(2));

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { seed: 'tsx prisma/seed.ts' },
});
