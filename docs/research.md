# Research & Intelligence

This module captures competitive intelligence, audience research, and evidence-backed insights in a workspace. It combines **structured data** (competitors, sources, snapshots, insights) with **AI-assisted analysis** that is tied to provenance so teams can trust what they publish.

---

## Module overview and purpose

Research & Intelligence helps marketing and strategy teams:

- Track **competitors** and their digital footprint (website, social handles, linked sources).
- Store **research sources** (URLs, files, manual notes, integration-backed resources) and **snapshots** (point-in-time captures of content).
- Produce **insights** (draft or published) with optional **evidence** rows pointing at snapshots.
- Run **AI workflows** (summarize, extract competitor themes, cluster keywords, draft personas, weekly digest) through the same **AI Platform** (`AiFacade`) used elsewhere in the suite.
- Link research artifacts to **campaigns, templates, governance assets, and integrations** via **research links**.

All workspace-scoped APIs live under:

`/api/v1/workspaces/{workspaceId}/research/...`

---

## Data model (plain language)

| Concept | What it is | Relationships |
|--------|------------|---------------|
| **Competitor** | A named competitor in the workspace (name, site, tags, status). | Optional **external handles** (platform + handle + URL). |
| **Research source** | A durable “where we got this from”: URL, uploaded file reference, manual note, or row tied to an **integration account/resource**. | Belongs to workspace; may reference a **competitor** and/or **integration** entities. |
| **Source snapshot** | A **captured moment** of content from a source: text, summary, optional structured `raw_json`, sentiment, tags, content hash. | Always belongs to one **source**; many snapshots over time show change. |
| **Insight** | A structured finding (category, type, title, summary, details JSON, confidence, status). | May reference a **competitor**; **insight evidence** rows tie an insight to one or more **snapshots**. |
| **Insight evidence** | A row linking an insight to a snapshot, with citation text/URL and optional JSON. | Unique per (insight, snapshot)—one evidence row per snapshot per insight. |
| **Keyword cluster** | A named grouping of keywords (JSON), optional intent, metrics JSON, optional link to a snapshot that seeded it. | Workspace-scoped. |
| **Persona research** | A persona card (pains, objections, motivations, channels as JSON arrays, language, sentiment) optionally linked to a primary snapshot. | Used for audience modeling from research. |
| **Watchlist** | Saved query + type + optional competitor; supports refresh jobs. | Drives recurring or manual collection. |
| **Research job** | Async job record (type, status, input/stats JSON) for ingestion and AI operations. | Auditable trail for long-running work. |
| **Research digest report** | Stored output of the **weekly digest** workflow (title, period, narrative text, JSON payload). | May reference an AI prompt run. |
| **Research link** | Maps a **research entity** (competitor, source, snapshot, insight, keyword cluster, persona) to another module’s entity (campaign, template, ruleset, brand asset, integration account, workspace). | Enables cross-module traceability. |
| **Research AI run link** | Connects an AI **prompt run** (or workflow-derived run) to a **produced artifact** (summary, insight draft, cluster, persona, digest) and records which **snapshot IDs** were in scope. | Central to provenance and audit. |

---

## Source types and snapshot types

### Source types (`SourceType`)

| Value | Meaning |
|-------|---------|
| `URL` | Web address as the primary locator. |
| `FILE_UPLOAD` | Content referenced by `file_url` (or similar). |
| `MANUAL` | Hand-entered or curated without automated fetch. |
| `INTEGRATION_RESOURCE` | Linked to `integration_account_id` / `integration_resource_id` for synced external objects. |
| `NOTE` | Free-form note text with optional metadata. |

### Snapshot types (`SnapshotType`)

| Value | Typical use |
|-------|-------------|
| `WEB_PAGE` | Scraped or pasted page content. |
| `AD_LIBRARY_ENTRY` | Ad transparency / library captures. |
| `SOCIAL_POST` | Social content snapshot. |
| `SEARCH_RESULT` | SERP or search-related capture. |
| `KEYWORD_DATA` | SEO/keyword tool exports. |
| `REVIEW` | Reviews or ratings text. |
| `TRANSCRIPT` | Call or interview transcript. |
| `PDF` | Document text extracted from PDF. |
| `IMAGE` | Image-oriented capture (metadata or OCR context). |
| `VIDEO_METADATA` | Video title/description/transcript snippets. |
| `CUSTOM` | Anything that does not fit the above. |

Snapshot type describes **the shape of the capture**, not the source system. The **source** record explains **where** the data came from (URL, file, integration, etc.).

---

## Evidence and provenance model

### Why published insights require evidence

**Publishing** an insight is restricted to **org admin** or **workspace admin** roles and is **blocked** unless the insight has **at least one evidence row**. This enforces that “official” findings are anchored to **primary material** (snapshots), not only model prose.

Evidence rows store:

- `snapshot_id` — the captured content backing the claim.
- `citation_text` / `citation_url` — how to quote or locate the passage.
- `evidence_json` — optional structured extras.

**Draft** insights can exist without evidence; teams add evidence, then a publisher promotes to **PUBLISHED** when ready.

### Provenance chain

```
Research source → Source snapshot(s) → Insight evidence → Insight (DRAFT → PUBLISHED)
```

AI-generated competitor insights **attach evidence** from the model output when snapshot IDs are valid; invalid or hallucinated IDs are ignored at persistence time (see citation validation below).

---

## AI-powered features

| Feature | Prompt / workflow | What it does |
|---------|-------------------|--------------|
| **Summarize snapshot** | `research.snapshot_summarize` | Reads snapshot text (truncated for safety), returns JSON summary, key points, entities, sentiment; updates snapshot summary fields; records `ResearchAiRunLink` with type `SNAPSHOT_SUMMARY`. |
| **Extract competitor insights** | `research.extract_competitor_insights` | Takes competitor + selected snapshots (must belong to that competitor’s sources); creates **draft** `Insight` rows and **evidence** from structured model output. |
| **Cluster keywords** | `research.cluster_keywords` | From a snapshot’s text or a pasted keyword list, creates `KeywordCluster` rows and links runs to originating snapshot IDs when applicable. |
| **Draft persona** | `research.draft_persona` | Builds `PersonaResearch` from snapshot excerpts with JSON arrays for pains, objections, motivations, channels. |
| **Weekly digest** | Workflow `research.weekly_digest` + prompt `research.weekly_digest_narrative` | Runs tools to list recent snapshots and published insights, loads brand context, then generates a narrative digest stored as `ResearchDigestReport`. |

Each operation that uses `AiFacade.runPrompt` creates an **`AiPromptRun`**; the service also writes **`ResearchAiRunLink`** rows to connect runs to artifacts and snapshot IDs used as input.

---

## RBAC: roles and permissions

Workspace membership roles are enforced via `PermissionService`. Research uses these checks:

| Permission helper | Roles allowed |
|-------------------|----------------|
| `requireResearchRead` | `ORG_ADMIN`, `WORKSPACE_ADMIN`, `EDITOR`, `ANALYST`, `VIEWER` |
| `requireResearchAnalyst` | `ORG_ADMIN`, `WORKSPACE_ADMIN`, `EDITOR`, `ANALYST` |
| `requireResearchAiUse` | Same as analyst — AI summarize, extract, cluster, persona, digest |
| `requireResearchManagement` | `ORG_ADMIN`, `WORKSPACE_ADMIN`, `EDITOR` |
| `requireResearchPublish` | `ORG_ADMIN`, `WORKSPACE_ADMIN` only |

### Typical operations by role

| Activity | VIEWER | ANALYST | EDITOR | WORKSPACE_ADMIN / ORG_ADMIN |
|----------|--------|---------|--------|------------------------------|
| View competitors, sources, snapshots, insights, jobs, digests | Yes | Yes | Yes | Yes |
| Create/update sources, snapshots, insights (draft), ingest URL/file | No | Yes | Yes | Yes |
| Run AI research actions | No | Yes | Yes | Yes |
| Create/update competitors, watchlists, clusters, personas (per service rules) | No | Varies¹ | Yes | Yes |
| Publish insights | No | No | No | Yes |
| Delete/archive high-impact entities (per service) | No | Limited | Often yes | Yes |

¹ Some create/update paths require **analyst**; destructive operations often require **management** (editor-level or above). Publishing insights is limited to **workspace admin** and **org admin** (not editor or analyst).

---

## API endpoint reference

Base prefix: **`/api/v1/workspaces/{workspaceId}/research`**

### Core resources

| Method | Path |
|--------|------|
| GET/POST | `/competitors` |
| GET/PATCH/DELETE | `/competitors/{competitorId}` |
| GET/POST | `/competitors/{competitorId}/handles` |
| DELETE | `/competitors/{competitorId}/handles/{handleId}` |
| GET/POST | `/sources` |
| GET/PATCH/DELETE | `/sources/{sourceId}` |
| GET/POST | `/snapshots` |
| GET/DELETE | `/snapshots/{snapshotId}` |
| POST | `/ingest/url`, `/ingest/file` |
| GET/POST | `/watchlists` |
| GET/PATCH/DELETE | `/watchlists/{watchlistId}` |
| POST | `/watchlists/{watchlistId}/refresh` |
| GET | `/jobs`, `/jobs/{jobId}` |
| GET/POST | `/insights` |
| GET/PATCH/DELETE | `/insights/{insightId}` |
| POST | `/insights/{insightId}/publish`, `/insights/{insightId}/archive` |
| GET/POST | `/insights/{insightId}/evidence` |
| DELETE | `/insights/{insightId}/evidence/{evidenceId}` |
| GET/POST | `/keyword-clusters` |
| GET/PATCH/DELETE | `/keyword-clusters/{clusterId}` |
| GET/POST | `/personas` |
| GET/PATCH/DELETE | `/personas/{personaId}` |
| GET | `/digests`, `/digests/{digestId}` |
| GET/POST | `/links` |
| DELETE | `/links/{linkId}` |

### AI (`/research/ai`)

| Method | Path |
|--------|------|
| POST | `/ai/snapshots/{snapshotId}/summarize` |
| POST | `/ai/competitors/{competitorId}/extract` |
| POST | `/ai/keywords/cluster` |
| POST | `/ai/personas/draft` |
| POST | `/ai/digest/run` |
| GET | `/ai/links?producedEntityType=&producedEntityId=` |

Request and response shapes for common calls are illustrated in [api.md](api.md#research--intelligence-api).

---

## Best practices for research workflows

1. **Define competitors first**, then attach **sources** with `competitor_id` where relevant so snapshot lineage rolls up to the right entity.
2. **Prefer snapshots over ad-hoc notes** for anything that might need to be cited or replayed; use `SnapshotType` consistently so reporting and digests stay meaningful.
3. **Before AI extract**, ensure snapshots are tied to sources that reference the target competitor—the API validates this.
4. **Add evidence manually** if the model missed a citation; publishing still requires at least one evidence row.
5. **Use research links** to connect published insights or personas to **campaigns** or **templates** so downstream teams see rationale.
6. **Run weekly digest** after a week of captured snapshots and **published** insights so the narrative step has real inputs (workflow filters insights by status).
7. **Monitor research jobs** for failed AI or ingestion runs and retry after fixing source data.

---

## Cross-module integration points

| Module | Integration |
|--------|-------------|
| **Governance** | Weekly digest workflow calls `governance.getEffectiveBrandProfile` for brand context; research links can reference `BRAND_ASSET` and templates/rulesets where configured. |
| **Campaigns** | `ResearchLink` supports `linkedEntityType` = `CAMPAIGN` to tie insights, personas, or snapshots to a campaign record. |
| **Integrations** | Sources may reference `integration_account_id` and `integration_resource_id`; linked entity type `INTEGRATION_ACCOUNT` in research links. |
| **AI platform** | All research prompts are **org-scoped approved** `AiPromptTemplate` rows; runs persist as `AiPromptRun`. Workflows use `AiWorkflowService` (`research.weekly_digest`). Tools: `research.listRecentSnapshots`, `research.listRecentInsights`, `research.getSnapshot`, `research.getCompetitor`. |

For architecture detail, see [architecture.md](architecture.md#research--intelligence-module). For AI integration, see [ai.md](ai.md#how-research-module-uses-aifacade). For prompt JSON contracts, see [prompts/research.md](prompts/research.md).
