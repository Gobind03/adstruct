# AI prompt templates (agent & batch use)

Marketing Suite **prompt templates** are org-scoped (optionally workspace-scoped) definitions used for structured LLM calls: chat assistance, governance rewrite, batch generation, and workflows. This document describes the **template format**, **output schemas**, and **example marketing prompts** you can adapt.

## Template format

Each template has:

- **system prompt** — Stable instructions: role, constraints, tone, and how to use tools or JSON.
- **user prompt template** — A string with **`{{variableName}}`** placeholders. At run time, the backend merges **input JSON** (and optional **context** map from `AiFacade`) into these placeholders. Keys in input JSON can also fill variables when the name matches.
- **purpose** (`LlmCallPurpose`) — e.g. `GENERATE`, `SUMMARIZE`, `CHAT`; used for routing and analytics.
- **outputFormat** — `TEXT` or `JSON`. When `JSON`, the platform stores structured output in `outputJson` and may validate against `outputSchemaJson` where configured.
- **inputSchemaJson** / **outputSchemaJson** — Optional JSON Schema (or project convention) documenting fields for builders and validators.

Example user template:

```text
You are helping a marketer for {{brandName}}.

Campaign: {{campaignName}}
Objective: {{objective}}

Produce the deliverable described in the system prompt using only the facts in the JSON below:

{{payload}}
```

Variables not provided should be left blank or called out in guardrails; production templates should specify default behavior.

## Output schemas

| Format | Storage | Typical use |
|--------|---------|-------------|
| **TEXT** | Assistant text / run `outputText` | Narratives, emails, long-form copy. |
| **JSON** | Run `outputJson` | Machine-readable variants, scores, structured plans. Pair with `outputSchemaJson` so UIs and tests know required keys. |

Recommended JSON conventions:

- Use a top-level object with stable keys (`variants`, `summary`, `items`, etc.).
- Avoid wrapping JSON in markdown fences in the model instructions when the API expects raw JSON.
- Include a `version` field when templates evolve.

---

## Ten example marketing prompts

Below, **System** and **User** are abbreviated; replace `{{...}}` with your schema. Set **outputFormat** to `JSON` or `TEXT` as indicated.

### 1. Generate sponsored snippet variants (JSON)

- **Purpose:** `GENERATE` · **Output:** JSON  
- **System:** You output only valid JSON. Schema: `{ "variants": [ { "headline": string, "body": string, "cta": string, "rationale": string } ] }`. Max 5 variants. Comply with brand voice; no unverifiable claims.  
- **User:** Brand voice: `{{voice}}`. Product: `{{product}}`. Constraints: `{{constraintsJson}}`. Audience: `{{audience}}`.

### 2. Summarize research snapshots (JSON)

- **Purpose:** `SUMMARIZE` · **Output:** JSON  
- **System:** Read the research notes and return JSON `{ "bullets": string[], "citationsNeeded": string[], "confidence": "high"|"medium"|"low" }` only.  
- **User:** Research snapshot: `{{researchText}}`. Focus: `{{focus}}`.

### 3. Rewrite copy to pass governance checks (JSON)

- **Purpose:** `GENERATE` · **Output:** JSON  
- **System:** You fix copy to satisfy rules. Output `{ "rewritten": string, "changes": { "from": string, "to": string }[], "remainingIssues": string[] }` only.  
- **User:** Original copy: `{{copy}}`. Rule findings JSON: `{{findingsJson}}`. Required disclaimers: `{{disclaimers}}`.

### 4. Draft campaign experiment hypothesis (TEXT)

- **Purpose:** `PLAN` · **Output:** TEXT  
- **System:** Write a concise experiment brief for stakeholders: hypothesis, primary metric, guardrails, duration, and success criteria. No JSON.  
- **User:** Campaign: `{{campaignName}}`. Historical context: `{{context}}`. Question to test: `{{question}}`.

### 5. Weekly performance narrative (TEXT)

- **Purpose:** `SUMMARIZE` · **Output:** TEXT  
- **System:** Produce a short executive narrative (3 short paragraphs) from metrics; call out anomalies and recommended actions. Neutral tone.  
- **User:** Week of `{{weekStart}}`. Metrics JSON: `{{metricsJson}}`. Prior week comparison: `{{comparisonJson}}`.

### 6. Generate A/B test headlines (JSON)

- **Purpose:** `GENERATE` · **Output:** JSON  
- **System:** Output JSON `{ "headlines": [ { "text": string, "angle": string } ] }` with exactly `{{count}}` items, max 40 characters each unless overridden.  
- **User:** Value prop: `{{valueProp}}`. Taboo phrases: `{{bannedList}}`. Channel: `{{channel}}`.

### 7. Analyze competitor messaging (JSON)

- **Purpose:** `EXTRACT` · **Output:** JSON  
- **System:** From pasted messaging, output `{ "themes": string[], "tone": string, "differentiators": string[], "risks": string[] }` only.  
- **User:** Competitor samples: `{{samples}}`. Our positioning: `{{ourPositioning}}`.

### 8. Create social media calendar (JSON)

- **Purpose:** `PLAN` · **Output:** JSON  
- **System:** Output `{ "weeks": [ { "week": number, "posts": [ { "day": string, "channel": string, "idea": string, "format": string } ] } ] }` for `{{weekCount}}` weeks.  
- **User:** Campaign goals: `{{goals}}`. Themes: `{{themes}}`. Do-not-post dates: `{{blackoutDates}}`.

### 9. Write email subject lines (JSON)

- **Purpose:** `GENERATE` · **Output:** JSON  
- **System:** Output `{ "subjects": [ { "text": string, "intent": string } ] }` with `{{count}}` lines; avoid spam triggers listed in user prompt.  
- **User:** Offer: `{{offer}}`. Audience segment: `{{segment}}`. Spam triggers to avoid: `{{spamTriggers}}`.

### 10. Generate audience persona descriptions (TEXT)

- **Purpose:** `GENERATE` · **Output:** TEXT  
- **System:** Write 2–3 paragraphs per persona: goals, pain points, channels, objections, and messaging hooks. Use clear headings per persona name.  
- **User:** Product: `{{product}}`. Seed data: `{{seedJson}}`. Number of personas: `{{n}}`.

---

## Operational notes

- Templates used from **`AiFacade.runPrompt`** must be **APPROVED** and in the correct **organization**.  
- Prefer **versioning** (new rows or version field) instead of overwriting production templates.  
- For governance-related rewrite, see the dedicated **Governance AI** API and align templates with brand and disclaimer requirements documented in [governance.md](governance.md).
