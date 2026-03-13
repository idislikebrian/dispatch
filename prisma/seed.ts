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

  // ─── Content Items ─────────────────────────────────────────────────────────

  const contentDefs = [
    {
      title: 'Why I Love Markdown',
      project: Project.Cobalt,
      platform: 'substack' as const,
      stage: 'idea' as const,
      ownerName: 'Brian',
      ownerType: 'human' as const,
      summary: 'A personal essay on lightweight writing formats',
      relatedEventId: null,
    },
    {
      title: 'Introduction to Prisma ORM',
      project: Project.Cobalt,
      platform: 'substack' as const,
      stage: 'draft' as const,
      ownerName: 'Brian',
      ownerType: 'human' as const,
      summary: 'Database modeling basics and best practices',
      relatedEventId: eventIds[1] || null,
    },
    {
      title: 'Daily Observations from Dispatch',
      project: Project.Experimental,
      platform: 'warpcast' as const,
      stage: 'editing' as const,
      ownerName: 'June',
      ownerType: 'agent' as const,
      summary: 'Reflections on agent telemetry patterns',
      relatedEventId: eventIds[2] || null,
    },
    {
      title: 'The Future of AI Agents',
      project: Project.HIGHER,
      platform: 'bluesky' as const,
      stage: 'scheduled' as const,
      ownerName: 'Brian',
      ownerType: 'human' as const,
      summary: 'Exploring autonomous agent design and ethics',
      scheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      relatedEventId: null,
    },
    {
      title: 'Building Real-Time Dashboards with Next.js',
      project: Project.Aluminum,
      platform: 'youtube' as const,
      stage: 'published' as const,
      ownerName: 'OpenClaw Tutorials',
      ownerType: 'agent' as const,
      summary: 'Step-by-step guide to live metrics visualization',
      publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      relatedEventId: eventIds[0] || null,
    },
    {
      title: 'Rethinking Content Distribution',
      project: Project.Caminos,
      platform: 'substack' as const,
      stage: 'published' as const,
      ownerName: 'Brian',
      ownerType: 'human' as const,
      summary: 'Multi-platform strategy for maximum reach',
      publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      relatedEventId: null,
    },
    {
      title: 'Dispatch Telemetry Deep Dive',
      project: Project.Experimental,
      platform: 'threads' as const,
      stage: 'repurposed' as const,
      ownerName: 'June',
      ownerType: 'agent' as const,
      summary: 'Originally a Warpcast thread, now a detailed essay',
      relatedEventId: eventIds[3] || null,
    },
    {
      title: 'Outdated Agent Architecture Notes',
      project: Project.Aluminum,
      platform: 'other' as const,
      stage: 'archived' as const,
      ownerName: 'OpenClaw',
      ownerType: 'agent' as const,
      summary: 'Legacy documentation no longer in use',
      relatedEventId: null,
    },
    {
      title: 'Quick tip: Using Prisma migrations',
      project: Project.Cobalt,
      platform: 'warpcast' as const,
      stage: 'scheduled' as const,
      ownerName: 'Brian',
      ownerType: 'human' as const,
      summary: 'Short-form content for social media',
      scheduledFor: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      relatedEventId: null,
    },
    {
      title: 'Building Scalable APIs with PostgreSQL',
      project: Project.HIGHER,
      platform: 'youtube' as const,
      stage: 'draft' as const,
      ownerName: 'Brian',
      ownerType: 'human' as const,
      summary: 'Video course outline with 12 modules',
      relatedEventId: eventIds[4] || null,
    },
  ];

  for (const content of contentDefs) {
    const item = await prisma.contentItem.create({
      data: {
        title: content.title,
        project: content.project,
        platform: content.platform,
        stage: content.stage,
        ownerName: content.ownerName,
        ownerType: content.ownerType,
        summary: content.summary,
        relatedEventId: content.relatedEventId,
        scheduledFor: content.scheduledFor || null,
        publishedAt: content.publishedAt || null,
      },
    });
    console.log(`  ✓ Content: ${content.title} [${content.stage}]`);
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
