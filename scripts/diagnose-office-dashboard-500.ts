import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { diagnoseOfficeDashboard500 } from "../lib/diagnostics/office-dashboard";

async function main(): Promise<void> {
  const root = process.cwd();
  const schema = await readFile(join(root, "prisma/schema.prisma"), "utf8");
  const migrationEntries = await readdir(join(root, "prisma/migrations"), { withFileTypes: true });
  const migrationSql = (await Promise.all(
    migrationEntries.filter((entry) => entry.isDirectory())
      .map((entry) => readFile(join(root, "prisma/migrations", entry.name, "migration.sql"), "utf8")),
  )).join("\n");

  const modelsInSchema = [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].map((match) => match[1]);
  const tablesInMigrations = [...migrationSql.matchAll(/CREATE TABLE "([^"]+)"/g)].map((match) => match[1]);
  const diagnosis = diagnoseOfficeDashboard500({
    modelsInSchema,
    tablesInMigrations,
    // /api/agents queries Agent and related telemetry through Prisma.
    routeModels: ["Agent"],
  });

  console.log(JSON.stringify({ ...diagnosis, checked: { schema: "prisma/schema.prisma", migrations: "prisma/migrations", databaseConnected: false } }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
