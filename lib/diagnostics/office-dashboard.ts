export type MigrationInventory = {
  modelsInSchema: string[];
  tablesInMigrations: string[];
  routeModels: string[];
};

export type OfficeDashboardDiagnosis = {
  reproduced: boolean;
  endpoint: "/api/agents";
  code: "P2021";
  message: string;
  missingTables: string[];
};

/** Pure diagnosis used by the synthetic test and repository-only CLI. */
export function diagnoseOfficeDashboard500(
  inventory: MigrationInventory,
): OfficeDashboardDiagnosis {
  const migrated = new Set(inventory.tablesInMigrations);
  const missingTables = inventory.routeModels.filter((model) => !migrated.has(model));

  return {
    reproduced: missingTables.length > 0,
    endpoint: "/api/agents",
    code: "P2021",
    message: missingTables.length > 0
      ? `Synthetic Prisma P2021: table(s) ${missingTables.join(", ")} are referenced by /api/agents but absent from checked-in migrations.`
      : "Synthetic P2021 reproduction is not present: all /api/agents tables are represented by checked-in migrations.",
    missingTables,
  };
}
