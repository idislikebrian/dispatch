import assert from "node:assert/strict";
import test from "node:test";
import { diagnoseOfficeDashboard500 } from "../lib/diagnostics/office-dashboard";

test("reproduces the office dashboard 500 cause without a database", () => {
  const result = diagnoseOfficeDashboard500({
    modelsInSchema: ["Agent", "AgentHeartbeat"],
    tablesInMigrations: ["User", "Workspace", "LogEntry"],
    routeModels: ["Agent"],
  });

  assert.equal(result.reproduced, true);
  assert.equal(result.endpoint, "/api/agents");
  assert.equal(result.code, "P2021");
  assert.deepEqual(result.missingTables, ["Agent"]);
});

test("does not report a missing-table diagnosis when migrations cover the route", () => {
  const result = diagnoseOfficeDashboard500({
    modelsInSchema: ["Agent"],
    tablesInMigrations: ["Agent"],
    routeModels: ["Agent"],
  });

  assert.equal(result.reproduced, false);
  assert.deepEqual(result.missingTables, []);
});
