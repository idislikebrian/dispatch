# Content Pipeline Architecture

## Overview & Purpose

The **Content section** is a **production pipeline monitor** for creative content lifecycle management across platforms and agents. It is **not** a publishing tool, CMS, or content creation system.

### What It Does
- **Observes** the lifecycle of content pieces as they move through production stages
- **Tracks** which agents or humans own each piece
- **Records** transitions between stages (idea → draft → editing → scheduled → published → repurposed → archived)
- **Aggregates** content metrics by stage, project, platform, and owner for dashboard visibility
- **Links** content to agent events for context and causality

### What It Does NOT Do
- Create or edit content directly
- Publish content to platforms (that's handled by agents/tools elsewhere)
- Enforce workflow rules or gates
- Store content bodies or full text
- Manage permissions or access control

### Design Principle
Content is **observational data**. Dispatch simply tracks what happened. The source of truth for actual content lives in the tools and platforms where it's created.

---

## Data Model

### Content Model

```prisma
model Content {
  id             String            @id @default(cuid())
  
  // Metadata
  title          String
  project        Project           // inherited from existing enum: Cobalt, Caminos, HIGHER, Aluminum, Experimental
  platform       ContentPlatform   // substack, warpcast, threads, bluesky, youtube, instagram, other
  stage          ContentStage      // idea, draft, editing, scheduled, published, repurposed, archived
  
  // Ownership
  ownerName      String            // human-readable: "Brian", "June", "Agent-X"
  ownerType      OwnerType         // human | agent
  
  // Context
  summary        String?           // optional one-line summary or metadata
  sourceIdea     String?           // optional: where the idea came from (e.g., "Notes from AI journal entry")
  
  // Relations
  relatedEventId String?           // optional: link to AgentEvent for causality
  relatedEvent   AgentEvent?       @relation(fields: [relatedEventId], references: [id], onDelete: SetNull)
  
  // Timestamps
  scheduledFor   DateTime?         // when we plan to publish/go live
  publishedAt    DateTime?         // when actually published (only set after moving to published stage)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  
  // Indexes
  @@index([project])
  @@index([stage])
  @@index([platform])
  @@index([ownerName])
  @@index([createdAt])
  @@index([project, stage])
}
```

### Enums

```prisma
enum ContentPlatform {
  substack
  warpcast
  threads
  bluesky
  youtube
  instagram
  other
}

enum ContentStage {
  idea
  draft
  editing
  scheduled
  published
  repurposed
  archived
}

enum OwnerType {
  human
  agent
}
```

### Relationships

- **Content.relatedEventId → AgentEvent**: Optional foreign key. Allows linking a content item to a specific agent action (e.g., "agent June drafted a post"). Cascade delete behavior: if the AgentEvent is deleted, the link is cleared (`SetNull`).
- **AgentEvent.content**: Reverse relation. Multiple content items can be associated with the same AgentEvent (though typically 1:1).

### Indexing Strategy

| Index | Rationale |
|-------|-----------|
| `project` | Filter by project in dashboard |
| `stage` | Filter by stage (idea, draft, published, etc.) |
| `platform` | Filter by target platform |
| `ownerName` | Filter by owner (team member or agent name) |
| `createdAt` | Sort by recency; range queries for date windows |
| `(project, stage)` | Common compound query: "all content in Cobalt project by stage" |

---

## API Routes

### 1. POST /api/content
**Create a new content item**

#### Request
```json
{
  "title": "Why I Love Markdown",
  "project": "Cobalt",
  "platform": "substack",
  "stage": "idea",
  "ownerName": "Brian",
  "ownerType": "human",
  "summary": "A personal essay on lightweight writing formats",
  "sourceIdea": "Conversation with team about documentation",
  "relatedEventId": "evt_123abc"  // optional
}
```

#### Response (201 Created)
```json
{
  "id": "c_abc123",
  "title": "Why I Love Markdown",
  "project": "Cobalt",
  "platform": "substack",
  "stage": "idea",
  "ownerName": "Brian",
  "ownerType": "human",
  "summary": "A personal essay on lightweight writing formats",
  "sourceIdea": "Conversation with team about documentation",
  "relatedEventId": "evt_123abc",
  "scheduledFor": null,
  "publishedAt": null,
  "createdAt": "2026-03-13T15:48:00Z",
  "updatedAt": "2026-03-13T15:48:00Z"
}
```

#### Validation
- `title`: required, non-empty string
- `project`: must be a valid Project enum value
- `platform`: must be a valid ContentPlatform value
- `stage`: must be a valid ContentStage value (typically starts as "idea" or "draft")
- `ownerName`: required, non-empty string
- `ownerType`: must be "human" or "agent"
- `relatedEventId`: optional; if provided, must reference an existing AgentEvent

---

### 2. GET /api/content
**List content items with optional filtering and sorting**

#### Query Parameters
- `stage` (optional): single stage value or comma-separated list (e.g., `?stage=draft,editing`)
- `project` (optional): single project (e.g., `?project=Cobalt`)
- `platform` (optional): single platform (e.g., `?platform=substack`)
- `owner` (optional): filter by ownerName (exact or substring; case-insensitive)
- `page` (optional): page number for pagination (default: 1)
- `limit` (optional): items per page (default: 20, max: 100)
- `sort` (optional): sort field and direction (e.g., `?sort=-createdAt`, `?sort=title`)

#### Response (200 OK)
```json
{
  "data": [
    {
      "id": "c_abc123",
      "title": "Why I Love Markdown",
      "project": "Cobalt",
      "platform": "substack",
      "stage": "idea",
      "ownerName": "Brian",
      "ownerType": "human",
      "summary": "A personal essay on lightweight writing formats",
      "sourceIdea": "Conversation with team about documentation",
      "relatedEventId": "evt_123abc",
      "scheduledFor": null,
      "publishedAt": null,
      "createdAt": "2026-03-13T15:48:00Z",
      "updatedAt": "2026-03-13T15:48:00Z"
    }
    // ... more items
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 42,
    "pages": 3
  }
}
```

#### Filter Examples
- `GET /api/content?stage=published,repurposed` — all published or repurposed content
- `GET /api/content?project=Cobalt&stage=draft` — draft items in Cobalt project
- `GET /api/content?owner=June` — all content owned by June
- `GET /api/content?platform=substack&project=HIGHER&sort=-createdAt` — Substack content in HIGHER project, newest first

---

### 3. GET /api/content/summary
**Aggregate counts by stage (for dashboard summary cards)**

#### Query Parameters
- `project` (optional): filter to a specific project

#### Response (200 OK)
```json
{
  "summary": [
    {
      "stage": "idea",
      "count": 8
    },
    {
      "stage": "draft",
      "count": 12
    },
    {
      "stage": "editing",
      "count": 5
    },
    {
      "stage": "scheduled",
      "count": 3
    },
    {
      "stage": "published",
      "count": 34
    },
    {
      "stage": "repurposed",
      "count": 2
    },
    {
      "stage": "archived",
      "count": 15
    }
  ],
  "total": 79
}
```

#### Filter Example
- `GET /api/content/summary?project=Cobalt` — stage distribution within Cobalt project only

---

### 4. PATCH /api/content/:id
**Update a content item (stage transitions, metadata edits)**

#### Request
```json
{
  "stage": "draft",
  "summary": "Updated summary text",
  "scheduledFor": "2026-03-20T10:00:00Z"
}
```

Only fields present in the request are updated. Fields are **immutable** by design:
- `id`, `createdAt` (never updated)
- `project` (set once, not changed)

Fields that **can** be updated:
- `title`
- `stage` (transitional field)
- `summary`
- `sourceIdea`
- `scheduledFor`
- `publishedAt` (typically only updated when stage transitions to "published")
- `ownerName` (if ownership changes hands)
- `ownerType` (if ownership type changes)
- `relatedEventId` (if linking to a new event)

#### Response (200 OK)
```json
{
  "id": "c_abc123",
  "title": "Why I Love Markdown",
  "project": "Cobalt",
  "platform": "substack",
  "stage": "draft",
  "ownerName": "Brian",
  "ownerType": "human",
  "summary": "Updated summary text",
  "sourceIdea": "Conversation with team about documentation",
  "relatedEventId": "evt_123abc",
  "scheduledFor": "2026-03-20T10:00:00Z",
  "publishedAt": null,
  "createdAt": "2026-03-13T15:48:00Z",
  "updatedAt": "2026-03-13T16:00:00Z"
}
```

#### Stage Transition Examples
- **idea → draft**: `PATCH /api/content/c_abc123 { "stage": "draft" }`
- **draft → editing**: `PATCH /api/content/c_abc123 { "stage": "editing" }`
- **editing → scheduled**: `PATCH /api/content/c_abc123 { "stage": "scheduled", "scheduledFor": "2026-03-20T10:00:00Z" }`
- **scheduled → published**: `PATCH /api/content/c_abc123 { "stage": "published", "publishedAt": "2026-03-20T10:00:00Z" }`
- **published → repurposed**: `PATCH /api/content/c_abc123 { "stage": "repurposed" }`
- **archived**: `PATCH /api/content/c_abc123 { "stage": "archived" }`

#### Error Responses
- **400 Bad Request**: Invalid stage value, invalid field update, or immutable field attempted
- **404 Not Found**: Content item does not exist
- **500 Internal Server Error**: Database or constraint violation

---

## UI Components

### 1. Content List View
- **Table** or **card grid** displaying content items
- **Columns**: Title, Project, Platform, Stage (color-coded badge), Owner, CreatedAt
- **Sorting**: By title, stage, platform, owner, date (ascending/descending)
- **Row actions**: Edit, view details, delete (soft archive recommended)
- **Infinite scroll** or **pagination** for large datasets

### 2. Stage Filters
- **Chip/button group** for quick filtering by stage
- Visual differentiation: colors for each stage (idea: gray, draft: yellow, editing: blue, scheduled: orange, published: green, repurposed: purple, archived: black)
- **Multi-select** filter: allows filtering by multiple stages simultaneously
- Display count badge per stage

### 3. Summary Dashboard Cards
- **7 cards** (one per stage) or **tabbed view** showing counts
- **Large count number** in center of each card
- **Trend indicator** (↑ or ↓) if comparing to previous period
- **Click to filter**: clicking a card filters the main list to that stage
- Optional: show % of total

### 4. Owner & Project Filters
- **Dropdown** or **autocomplete** for selecting project(s)
- **Dropdown** or **tag input** for filtering by owner name
- **Platform filter**: dropdown or multi-select chips
- Combined filters work with AND logic

### 5. Create / Edit Modal
- **Form fields**:
  - Title (text input)
  - Project (dropdown, from enum)
  - Platform (dropdown, from enum)
  - Stage (dropdown, from enum)
  - Owner Name (text input)
  - Owner Type (radio: Human | Agent)
  - Summary (textarea, optional)
  - Source Idea (textarea, optional)
  - Related Event ID (optional lookup/dropdown)
  - Scheduled For (datetime picker, optional)
- **Submit** and **Cancel** buttons
- **Validation** feedback: highlight invalid fields, show error messages
- **Immutable fields** (project, id, createdAt) should be read-only in edit mode

### 6. Content Detail View
- **All fields** displayed in a clean, read-only layout (or edit mode if allowed)
- **Linked AgentEvent** displayed if `relatedEventId` is set (show agent name, event type, timestamp)
- **Stage transition history** (future enhancement: log each stage change with timestamp)
- **Quick actions**: Edit, archive, duplicate

---

## Design Principles

### 1. Observational, Not Prescriptive
- Dispatch records what happened; it does not enforce workflows
- No approval gates, no mandatory fields (except title, project, stage, owner)
- Content can move backward through stages if needed (flexibility)

### 2. Agent-First but Human-Readable
- `ownerType` field distinguishes between agent and human creators
- `ownerName` is a simple string, not a foreign key (agents and humans can be referenced without complex relationships)
- `relatedEventId` optional: content can exist without being tied to an agent event

### 3. Platform-Agnostic
- `ContentPlatform` enum is extensible (includes "other" as catch-all)
- Content model does NOT store platform-specific details (those belong in downstream systems)
- Dispatch is the **central view**, not the source of truth

### 4. Minimal Metadata
- No full content body storage (use external URLs or refs if needed)
- `summary` and `sourceIdea` are lightweight context fields
- `scheduledFor` and `publishedAt` are timestamps for lifecycle tracking only

### 5. Fast Queries
- Indexes on frequently-filtered fields (project, stage, platform, owner, date)
- Pagination to avoid large result sets
- Aggregate endpoint (`/summary`) for dashboard without loading all records

### 6. Soft Delete / Archive
- Rather than hard delete, content should transition to "archived" stage
- Enables historical viewing and prevents accidental data loss
- Future: add `deletedAt` if hard deletion becomes necessary

---

## Future Enhancements

1. **Stage Transition Audit Trail**: Log each stage change with user/agent who made it and timestamp
2. **Batch Operations**: Update multiple content items at once (e.g., bulk archive)
3. **Content Linking**: Link related content items (e.g., original + repurposed versions)
4. **Search & Full-Text**: Search by title, summary, or source idea
5. **Webhooks/Events**: Emit events when content moves between stages (for integration with external tools)
6. **Templating**: Pre-defined workflows for common content types or projects
7. **Analytics**: Charts showing content volume, stage distribution, platform trends over time
