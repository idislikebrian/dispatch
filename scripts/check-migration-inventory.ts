import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

async function main(): Promise<void> {
  const root = process.cwd();
  const schema = await readFile(join(root, "prisma/schema.prisma"), "utf8");
  const migrationEntries = await readdir(join(root, "prisma/migrations"), { withFileTypes: true });
  const migrationSql = (await Promise.all(
    migrationEntries.filter((entry) => entry.isDirectory())
      .map((entry) => readFile(join(root, "prisma/migrations", entry.name, "migration.sql"), "utf8")),
  )).join("\n");
  const models = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((match) => match[1]);
  const tables = new Set([...migrationSql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]));
  const missing = models.filter((model) => !tables.has(model));

  if (missing.length > 0) {
    console.error(`Migration inventory check failed. Models without a CREATE TABLE migration: ${missing.join(", ")}`);
    console.error("This repository-only check does not connect to a database; apply reviewed migrations explicitly after resolving drift.");
    process.exitCode = 1;
    return;
  }
  console.log(`Migration inventory check passed for ${models.length} model(s).`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
