# Agent Integration Guide

Dispatch is an **observation-only** system. It does not execute agents, schedule tasks, or control workflows. It receives data from agents and surfaces it in the Office dashboard. Agents push data in; Dispatch displays it.

---

## Endpoints

### Heartbeat

Agents should send periodic heartbeats to signal they are alive.

```
POST /api/ingest/heartbeat
Content-Type: application/json

{
  "agentName": "my-agent",
  "status": "online",
  "metadata": {}
}
```

**Frequency:** every 5–30 seconds.  
If no heartbeat is received for 60 seconds, the agent is shown as **offline** in the Agent Status Map.

**Status values:** `online` | `offline` | `error`

---

### Events

Agents emit events to describe what they are doing.

```
POST /api/ingest/event
Content-Type: application/json

{
  "agentName": "my-agent",
  "type": "action",
  "message": "Did something",
  "project": "Cobalt",
  "metadata": {}
}
```

**Event types:**

| Type      | Use when                                      |
|-----------|-----------------------------------------------|
| `action`  | Agent performed a task or step                |
| `error`   | Something failed or threw an exception        |
| `info`    | General informational log line                |
| `warning` | Non-fatal issue worth surfacing               |

Events appear in the Activity Feed in real time (polled every 5 seconds).

---

### Cost

Agents report token usage and cost after each LLM call.

```
POST /api/ingest/cost
Content-Type: application/json

{
  "agentName": "my-agent",
  "model": "claude-sonnet-4",
  "inputTokens": 1500,
  "outputTokens": 300,
  "costUsd": 0.012,
  "eventId": "optional-event-id",
  "project": "Cobalt"
}
```

`eventId` is optional. If provided, the cost record is linked to the corresponding event in the Activity Feed.

Cost data is aggregated in the Cost Panel by project and model.

---

### Interrupt Polling

Agents can poll for pending operator commands (interrupts).

```
GET /api/interrupt?agentId=<agent-id>
```

Returns any pending interrupts for the agent and marks them as delivered. Agents should poll this endpoint on the same interval as their heartbeat (every 5–30 seconds).

**Response:**
```json
[
  {
    "id": "clxyz...",
    "type": "pause",
    "message": "optional context",
    "createdAt": "2026-03-10T18:00:00.000Z"
  }
]
```

---

### Sending Interrupts

Operators can send commands to agents via the Interrupt Panel, or programmatically:

```
POST /api/interrupt
Content-Type: application/json

{
  "agentName": "my-agent",
  "type": "pause",
  "message": "optional context"
}
```

**Interrupt types:**

| Type        | Meaning                                      |
|-------------|----------------------------------------------|
| `pause`     | Agent should pause current task              |
| `resume`    | Agent should resume after a pause            |
| `stop`      | Agent should terminate cleanly               |
| `summarize` | Agent should emit a summary event            |
| `custom`    | Arbitrary instruction passed via `message`   |

---

## Projects

The following project labels are supported:

- `Cobalt`
- `Caminos`
- `HIGHER`
- `Aluminum`
- `Experimental`

Pass the project name in the `project` field of event and cost payloads. This is used for filtering and cost aggregation in the dashboard.

---

## Testing

A test agent script is included to simulate agent activity locally:

```bash
npm run test-agent
```

This sends heartbeat, event, and cost payloads to `http://localhost:3000` every 5 seconds. Override the target with:

```bash
BASE_URL=http://localhost:3001 npm run test-agent
```

---

## Notes

- Dispatch does **not** execute agents or control their behavior
- Interrupts are signals only — the agent is responsible for acting on them
- All data is append-only; there is no delete API
- Authentication is not enforced on ingest endpoints by default — restrict at the network or reverse proxy level for production use
