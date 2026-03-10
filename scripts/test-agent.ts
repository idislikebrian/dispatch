/**
 * test-agent.ts
 *
 * Simulates a live agent sending heartbeats, events, and cost records
 * to a running Dispatch instance every 5 seconds.
 *
 * Usage:
 *   npm run test-agent
 *   BASE_URL=http://localhost:3001 npm run test-agent
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const ACTION_MESSAGES = [
  "Processed incoming webhook",
  "Synced CRM contacts",
  "Generated weekly summary",
  "Cleared notification queue",
  "Indexed new documents",
  "Ran health check",
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(4));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function post(path: string, body: unknown): Promise<void> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const ts = new Date().toISOString();
  if (res.ok) {
    console.log(`[${ts}] POST ${path} → ${res.status}`);
  } else {
    console.error(`[${ts}] POST ${path} → ${res.status} ${text}`);
  }
}

async function tick(): Promise<void> {
  const inputTokens = randomInt(100, 5000);
  const outputTokens = randomInt(50, 2000);
  const costUsd = randomFloat(0.001, 0.05);

  await post("/api/ingest/heartbeat", {
    agentName: "test-agent",
    status: "online",
  });

  await post("/api/ingest/event", {
    agentName: "test-agent",
    type: "action",
    message: pick(ACTION_MESSAGES),
    project: "Experimental",
  });

  await post("/api/ingest/cost", {
    agentName: "test-agent",
    model: "claude-sonnet-4",
    inputTokens,
    outputTokens,
    costUsd,
    project: "Experimental",
  });
}

console.log(`test-agent starting → ${BASE_URL}`);
console.log("Press Ctrl+C to stop.\n");

// Run immediately, then on an interval
tick();
setInterval(tick, 5_000);
