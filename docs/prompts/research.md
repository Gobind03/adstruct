# Research & Intelligence Prompt Templates

Org-scoped templates (seeded in migration `V11__research_module.sql`) used by `ResearchAiService` and the `research.weekly_digest` workflow. Each template has `input_schema_json`, `output_schema_json`, `system_prompt`, `user_prompt_template`, and `guardrails_text` in the database.

---

## Shared guardrails (all research prompts)

The following themes appear in `guardrails_text` across templates:

- **No fabrication** — Do not invent facts; only use provided excerpts, keywords, or tool outputs.
- **Citation discipline** — Where the schema asks for `citations` or `evidence`, entries must reference **valid snapshot IDs** from the input context.
- **Insufficient data** — Return empty arrays (or an honest explanation in `summary` / narrative fields) when the text does not support a claim.
- **Scope** — Stay within the analyst/research use case (no unrelated creative writing, no secrets or credentials).

These align with backend **citation validation** (`ProvenanceService.validateCitationSnapshotIds`): citations whose `snapshotId` is not in the allowed set are logged and **not** used to attach evidence.

---

## Citation format and validation rules

### JSON shape

**Top-level citations** (e.g. summarize, persona):

```json
{
  "citations": [
    { "snapshotId": "uuid", "evidence": "short quote or paraphrase grounded in that snapshot" }
  ]
}
```

**Per-insight evidence** (extract competitor):

```json
{
  "insights": [
    {
      "evidence": [
        {
          "snapshotId": "uuid",
          "citationText": "why this snapshot supports the insight",
          "quote": "optional exact excerpt"
        }
      ]
    }
  ]
}
```

**Cluster output** (optional evidence array in template):

```json
{
  "clusters": [
    {
      "evidence": [{ "snapshotId": "uuid", "evidence": "keywords or rationale" }]
    }
  ]
}
```

### Validation behavior

1. Allowed snapshot IDs are the set passed into the operation (e.g. single snapshot for summarize; user-selected list for extract/persona).
2. Parsed output is scanned for `citations` **or** nested `insights[].evidence[]`.
3. Each `snapshotId` must be a **UUID** present in the allowed set; otherwise a warning is logged and downstream code **skips** invalid references (evidence rows are only created for valid IDs on extract).

---

## 1) `research.snapshot_summarize`

**Purpose:** Produce a structured summary of one snapshot’s text for display and storage in `summary_text` / tags.

### Input schema

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `snapshotId` | string (UUID) | Yes | Echoed for citation alignment. |
| `title` | string | No | Snapshot title. |
| `rawTextExcerpt` | string | Yes | Truncated body (service may cap length). |
| `snapshotType` | string | No | Enum name, e.g. `WEB_PAGE`. |
| `language` | string | No | Default `en`. |

### Output schema

| Field | Type | Notes |
|-------|------|--------|
| `summary` | string | Concise summary. |
| `keyPoints` | string[] | Bullet-style points. |
| `entities` | string[] | Named entities if any. |
| `sentiment` | string | e.g. `POSITIVE`, `NEUTRAL`, `NEGATIVE`, `MIXED`, `UNKNOWN`. |
| `citations` | array | `{ snapshotId, evidence }` per guardrails. |

### Example input

```json
{
  "snapshotId": "a1111111-1111-4111-8111-111111111111",
  "title": "Pricing page",
  "rawTextExcerpt": "Pro plan $99/mo. Enterprise: contact sales.",
  "snapshotType": "WEB_PAGE",
  "language": "en"
}
```

### Example output

```json
{
  "summary": "The page lists Pro at $99/month and routes Enterprise buyers to sales.",
  "keyPoints": ["Pro plan priced at $99/mo", "Enterprise requires sales contact"],
  "entities": ["Pro", "Enterprise"],
  "sentiment": "NEUTRAL",
  "citations": [
    {
      "snapshotId": "a1111111-1111-4111-8111-111111111111",
      "evidence": "Pro plan $99/mo. Enterprise: contact sales."
    }
  ]
}
```

---

## 2) `research.extract_competitor_insights`

**Purpose:** Create draft `Insight` rows with `InsightType` values such as `COMPETITOR_OFFER`, `COMPETITOR_PRICING`, `COMPETITOR_POSITIONING`, backed by evidence.

### Input schema

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `competitorName` | string | Yes | Display name for prompting. |
| `insightTypes` | string | No | Comma-separated list of types requested. |
| `snapshotExcerpts` | string | Yes | Built server-side with snapshot ID headers. |
| `language` | string | No | Default `en`. |

### Output schema

| Field | Type | Notes |
|-------|------|--------|
| `insights` | array | Each item: `insightType`, `title`, `summary`, `details`, `evidence[]`, `confidence`. |

### Example input

```json
{
  "competitorName": "Acme Analytics",
  "insightTypes": "COMPETITOR_OFFER,COMPETITOR_PRICING",
  "snapshotExcerpts": "--- Snapshot ID: b2222222-2222-4222-8222-222222222222 ---\nTitle: Pricing\nWe offer a free tier and Business at $49/user.\n",
  "language": "en"
}
```

### Example output

```json
{
  "insights": [
    {
      "insightType": "COMPETITOR_OFFER",
      "title": "Free tier plus paid Business plan",
      "summary": "Product-led motion with free and $49/user Business.",
      "details": {},
      "evidence": [
        {
          "snapshotId": "b2222222-2222-4222-8222-222222222222",
          "citationText": "Pricing page states free tier and Business pricing",
          "quote": "We offer a free tier and Business at $49/user."
        }
      ],
      "confidence": "HIGH"
    }
  ]
}
```

---

## 3) `research.cluster_keywords`

**Purpose:** Group keywords by intent and theme for `KeywordCluster` rows.

### Input schema

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `keywords` | string | Yes | Newline-separated or blob from snapshot. |
| `context` | string | No | Extra context; may be empty. |
| `language` | string | No | Default `en`. |

### Output schema

| Field | Type | Notes |
|-------|------|--------|
| `clusters` | array | Each: `name`, `intentType`, `keywords`, `metrics`, optional `evidence`. |

### Example input

```json
{
  "keywords": "best crm for small business\ncrm pricing comparison\nwhat is a crm",
  "context": "",
  "language": "en"
}
```

### Example output

```json
{
  "clusters": [
    {
      "name": "Commercial evaluation",
      "intentType": "commercial",
      "keywords": ["best crm for small business", "crm pricing comparison"],
      "metrics": { "avgVolume": 0, "avgCpc": 0, "difficulty": 0 },
      "evidence": []
    },
    {
      "name": "Informational definition",
      "intentType": "informational",
      "keywords": ["what is a crm"],
      "metrics": { "avgVolume": 0, "avgCpc": 0, "difficulty": 0 },
      "evidence": []
    }
  ]
}
```

---

## 4) `research.draft_persona`

**Purpose:** Fill `PersonaResearch` fields from snapshot excerpts.

### Input schema

| Field | Type | Required |
|-------|------|----------|
| `personaName` | string | Yes |
| `snapshotExcerpts` | string | Yes |
| `language` | string | No |

### Output schema

| Field | Type |
|-------|------|
| `name` | string |
| `pains`, `objections`, `motivations`, `channels` | arrays of strings |
| `citations` | array |

### Example input

```json
{
  "personaName": "Ops-heavy SMB buyer",
  "snapshotExcerpts": "--- Snapshot ID: c3333333-3333-4333-8333-333333333333 ---\nI need something that works with Zapier and doesn't need a developer.\n",
  "language": "en"
}
```

### Example output

```json
{
  "name": "Ops-heavy SMB buyer",
  "pains": ["Limited engineering time", "Integration fragility"],
  "objections": ["Too much IT overhead"],
  "motivations": ["Plug-and-play automation"],
  "channels": ["Product hunt", "Zapier ecosystem"],
  "citations": [
    {
      "snapshotId": "c3333333-3333-4333-8333-333333333333",
      "evidence": "Needs Zapier and no developer"
    }
  ]
}
```

---

## 5) `research.weekly_digest_narrative`

**Purpose:** Final LLM step inside workflow `research.weekly_digest` after tools gather recent snapshots, published insights, and brand profile.

### Input schema

| Field | Type | Required |
|-------|------|----------|
| `periodStart` | string (ISO date) | Yes |
| `periodEnd` | string (ISO date) | Yes |
| `recentSnapshots` | string | From tool outputs |
| `recentInsights` | string | From tool outputs |
| `brandContext` | string | From `governance.getEffectiveBrandProfile` |

### Output schema

| Field | Type |
|-------|------|
| `title` | string |
| `highlights`, `risks`, `opportunities`, `recommendedActions` | arrays of strings |
| `narrative` | string — full digest text |

### Example input (illustrative)

```json
{
  "periodStart": "2026-03-24",
  "periodEnd": "2026-03-31",
  "recentSnapshots": "{\"items\":[...]}",
  "recentInsights": "{\"items\":[...]}",
  "brandContext": "{\"voiceTone\":\"PROFESSIONAL\"}"
}
```

### Example output

```json
{
  "title": "Weekly Research Digest",
  "highlights": ["Competitor X added a usage-based tier"],
  "risks": ["Aggressive discounting in SMB segment"],
  "opportunities": ["Position integrations as differentiator"],
  "recommendedActions": ["Update battlecard with new pricing"],
  "narrative": "Over the past week, snapshot activity focused on..."
}
```

---

## Workflow: `research.weekly_digest`

Not a single prompt: an `AiWorkflowDefinition` with steps:

1. `research.listRecentSnapshots` — `days`, `limit`
2. `research.listRecentInsights` — `days`, `status: PUBLISHED`, `limit`
3. `governance.getEffectiveBrandProfile`
4. LLM step using prompt id for `research.weekly_digest_narrative` with period dates and tool outputs as context

The workflow output is persisted as a **Research digest report**; see [research.md](../research.md) and [ai.md](../ai.md#how-research-module-uses-aifacade).
