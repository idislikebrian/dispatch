import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

async function main(): Promise<void> {
  const root = process.cwd();
  const git = (args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
  const hashFile = async (path: string) => createHash("sha256").update(await readFile(join(root, path))).digest("hex");
  const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { scripts?: Record<string, string> };
  const build = packageJson.scripts?.build ?? "";

  if (build.includes("db push")) {
    throw new Error("Release safety check failed: build script contains prisma db push");
  }

  const commit = git(["rev-parse", "HEAD"]);
  const migrationsIndex = git(["ls-files", "-s", "prisma/migrations"]);
  const receipt = {
  format: 1,
  generatedAt: new Date().toISOString(),
  gitCommit: commit,
  gitBranch: git(["branch", "--show-current"]),
  schemaSha256: await hashFile("prisma/schema.prisma"),
  migrationsTreeSha256: migrationsIndex ? createHash("sha256").update(migrationsIndex).digest("hex") : null,
  buildCommand: build,
  databaseMutationInBuild: false,
  };

  const expectedSha = process.env.RELEASE_COMMIT_SHA;
  if (expectedSha && expectedSha !== commit) {
    throw new Error(`Release provenance mismatch: expected ${expectedSha}, found ${commit}`);
  }

  const writeIndex = process.argv.indexOf("--write");
  if (writeIndex >= 0) {
    const output = process.argv[writeIndex + 1];
    if (!output) throw new Error("--write requires a path");
    const outputPath = join(root, output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
    console.log(`Wrote release provenance receipt: ${output}`);
  } else {
    console.log(JSON.stringify(receipt, null, 2));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
