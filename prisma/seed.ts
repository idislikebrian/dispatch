import { PrismaClient, Project } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Dispatch database...');

  // ─── Agents ────────────────────────────────────────────────────────────────

  const agentDefs = [
    { name: 'OpenClaw', type: 'openclaw', project: Project.Experimental },
    { name: 'June', type: 'openclaw', project: Project.Experimental },
    { name: 'Kimi Sub-Agent', type: 'subagent', project: Project.Cobalt },
  ];

  const agentRecords: Record<string, string> = {}; // name -> id

  for (const def of agentDefs) {
    const agent = await prisma.agent.upsert({
      where: { name: def.name },
      update: {},
      create: def,
    });
    agentRecords[def.name] = agent.id;
    console.log(`  ✓ Agent: ${def.name} (${agent.id})`);
  }

  // ─── Heartbeats ────────────────────────────────────────────────────────────

  const heartbeatDefs = [
    { agentName: 'OpenClaw', status: 'online' },
    { agentName: 'June', status: 'idle' },
    { agentName: 'Kimi Sub-Agent', status: 'offline' },
  ];

  for (const hb of heartbeatDefs) {
    await prisma.agentHeartbeat.create({
      data: {
        agentId: agentRecords[hb.agentName],
        status: hb.status,
        metadata: { source: 'seed' },
      },
    });
    console.log(`  ✓ Heartbeat: ${hb.agentName} → ${hb.status}`);
  }

  // ─── Events ────────────────────────────────────────────────────────────────

  const eventDefs = [
    {
      agentName: 'OpenClaw',
      type: 'info',
      message: 'System initialized successfully.',
      project: Project.Experimental,
    },
    {
      agentName: 'OpenClaw',
      type: 'action',
      message: 'Started dispatch-backend-agent subagent.',
      project: Project.Experimental,
    },
    {
      agentName: 'June',
      type: 'info',
      message: 'Observing daily workday patterns.',
      project: Project.Experimental,
    },
    {
      agentName: 'June',
      type: 'warning',
      message: 'Post cadence approaching daily limit.',
      project: Project.Experimental,
    },
    {
      agentName: 'Kimi Sub-Agent',
      type: 'action',
      message: 'Completed Cobalt CRM sync task.',
      project: Project.Cobalt,
    },
    {
      agentName: 'Kimi Sub-Agent',
      type: 'error',
      message: 'Failed to fetch Airtable records: rate limit exceeded.',
      project: Project.Cobalt,
    },
  ];

  const eventIds: string[] = [];
  for (const ev of eventDefs) {
    const event = await prisma.agentEvent.create({
      data: {
        agentId: agentRecords[ev.agentName],
        type: ev.type,
        message: ev.message,
        project: ev.project,
        metadata: { source: 'seed' },
      },
    });
    eventIds.push(event.id);
    console.log(`  ✓ Event [${ev.type}]: ${ev.message.slice(0, 50)}`);
  }

  // ─── Cost Events ───────────────────────────────────────────────────────────

  const costDefs = [
    {
      agentName: 'OpenClaw',
      model: 'claude-opus-4.6',
      inputTokens: 1200,
      outputTokens: 450,
      costUsd: 0.0234,
      eventId: eventIds[0],
      project: Project.Experimental,
    },
    {
      agentName: 'OpenClaw',
      model: 'claude-sonnet-4.5',
      inputTokens: 800,
      outputTokens: 320,
      costUsd: 0.0089,
      eventId: eventIds[1],
      project: Project.Experimental,
    },
    {
      agentName: 'Kimi Sub-Agent',
      model: 'claude-sonnet-4.5',
      inputTokens: 2100,
      outputTokens: 980,
      costUsd: 0.0315,
      eventId: eventIds[4],
      project: Project.Cobalt,
    },
  ];

  for (const ce of costDefs) {
    await prisma.agentCostEvent.create({
      data: {
        agentId: agentRecords[ce.agentName],
        model: ce.model,
        inputTokens: ce.inputTokens,
        outputTokens: ce.outputTokens,
        costUsd: ce.costUsd,
        eventId: ce.eventId,
        project: ce.project,
        metadata: { source: 'seed' },
      },
    });
    console.log(`  ✓ Cost: ${ce.agentName} / ${ce.model} → $${ce.costUsd}`);
  }

  console.log('\n✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
