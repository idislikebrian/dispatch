import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const policyPath = new URL("../docs/delegated-authority-policy.md", import.meta.url);
const planPath = new URL("../docs/production-migration-deployment-plan-p0-p4.md", import.meta.url);

const levels = [
  { id: "P0", name: "Observe", mutation: false, approval: false },
  { id: "P1", name: "Draft", mutation: false, approval: true },
  { id: "P2", name: "Prepare", mutation: true, approval: true },
  { id: "P3", name: "Supervised verify", mutation: false, approval: true },
  { id: "P4", name: "Execute", mutation: true, approval: true },
] as const;

test("models a monotonic P0-P4 authority ladder with explicit approvals", () => {
  assert.deepEqual(levels.map((level) => level.id), ["P0", "P1", "P2", "P3", "P4"]);
  assert.equal(levels[0].mutation, false);
  assert.equal(levels[0].approval, false);
  assert.equal(levels[4].mutation, true);
  assert.equal(levels[4].approval, true);
  assert.ok(levels.every((level, index) => index === 0 || level.approval));
});

test("policy keeps production mutation outside this review package", async () => {
  const policy = await readFile(policyPath, "utf8");
  assert.match(policy, /\*\*Not granted by this document\.\*\*/);
  assert.match(policy, /Brian's explicit, operation-specific approval/);
  assert.match(policy, /Dispatch is observation-only/);
  assert.match(policy, /preview is not an apply authorization/);
});

test("migration plan has reconciliation, security, compatibility, rollback, and acceptance gates", async () => {
  const plan = await readFile(planPath, "utf8");
  for (const required of [
    "Existing database reconciliation",
    "Endpoint security gate",
    "Backward compatibility",
    "Deployment and rollback sequence",
    "Acceptance tests",
    "`npm run db:check` passes",
    "never with `prisma db push`",
    "no test sends private conversation content",
  ]) {
    assert.match(plan, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

