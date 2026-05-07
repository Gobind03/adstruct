# Creative Studio — AI prompt templates

Approved org-level templates are seeded in migration `V13__creative_studio.sql`. Runtime calls use `AiFacade.runPrompt(workspaceId, "<name>", inputJson, …)`.

Each section lists: **name**, **purpose**, **input schema**, **output schema**, **example input**, **example output**.

---

## 1. `creative.generate_ad_copy_variants`

**Purpose:** Generate multiple ad copy variants from brand context, template hints, persona, keywords, insights, platform, language, tone, and constraints.

### Input schema

```json
{
  "type": "object",
  "properties": {
    "numVariants": { "type": "integer" },
    "brandProfile": { "type": "object" },
    "template": { "type": "object" },
    "persona": { "type": "object" },
    "keywords": { "type": "array" },
    "insights": { "type": "array" },
    "platformType": { "type": "string" },
    "language": { "type": "string" },
    "tone": { "type": "string" },
    "constraints": { "type": "object" }
  }
}
```

The HTTP API (`POST .../creative/ai/copy/generate`) builds this from `GenerateCopyRequest` (e.g. `templateId`, `personaResearchId`, `keywordClusterId`, `insightIds` as comma-separated IDs, `platformType`, `language`, `toneOverride`, `numVariants`). Empty objects/arrays are sent when optional IDs are omitted.

### Output schema

```json
{
  "type": "object",
  "properties": {
    "variants": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "primaryText": { "type": "string" },
          "headline": { "type": "string" },
          "description": { "type": "string" },
          "cta": { "type": "string" },
          "notes": { "type": "string" },
          "citations": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "type": { "type": "string" },
                "id": { "type": "string" }
              }
            }
          }
        }
      }
    },
    "recommendedDisclaimers": { "type": "array" },
    "assumptions": { "type": "array" }
  }
}
```

### Example input

```json
{
  "numVariants": 2,
  "brandProfile": {},
  "template": { "id": "f1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11" },
  "persona": { "id": "a2222222-2222-4222-8222-222222222222" },
  "keywords": ["b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33"],
  "insights": ["i1111111-1111-4111-8111-111111111111"],
  "platformType": "META",
  "language": "en",
  "tone": "PROFESSIONAL",
  "constraints": {}
}
```

### Example output

```json
{
  "variants": [
    {
      "headline": "Save more on spring renewals",
      "primaryText": "Compare plans and switch in minutes. No hidden fees.",
      "description": "Limited-time pricing for qualified accounts.",
      "cta": "Get quote",
      "notes": "Aligns with finance disclaimer set",
      "citations": [{ "type": "INSIGHT", "id": "i1111111-1111-4111-8111-111111111111" }]
    },
    {
      "headline": "Spring savings for your team",
      "primaryText": "Bundle seats and save. Talk to sales today.",
      "description": "",
      "cta": "Contact sales",
      "notes": "",
      "citations": []
    }
  ],
  "recommendedDisclaimers": ["FINANCE_RISK"],
  "assumptions": ["Audience is B2B finance buyers"]
}
```

---

## 2. `creative.generate_hooks_angles_ctas`

**Purpose:** Produce brainstorm lists of hooks, marketing angles, and short CTAs.

### Input schema

```json
{
  "type": "object",
  "properties": {
    "topic": { "type": "string" },
    "persona": { "type": "object" },
    "insights": { "type": "array" },
    "language": { "type": "string" }
  }
}
```

The current service implementation sends `topic`, empty `persona`, empty `insights`, and `language` from `GenerateHooksRequest`.

### Output schema

```json
{
  "type": "object",
  "properties": {
    "hooks": { "type": "array", "items": { "type": "string" } },
    "angles": { "type": "array", "items": { "type": "string" } },
    "ctas": { "type": "array", "items": { "type": "string" } }
  }
}
```

### Example input

```json
{
  "topic": "Launching a new AI analytics dashboard for SMBs",
  "persona": {},
  "insights": [],
  "language": "en"
}
```

### Example output

```json
{
  "hooks": [
    "Still exporting CSVs every Monday?",
    "Your dashboard should answer questions, not create them."
  ],
  "angles": [
    "Time saved for ops teams",
    "Confidence from real-time anomaly alerts"
  ],
  "ctas": ["See demo", "Start trial", "Compare plans"]
}
```

---

## 3. `creative.generate_video_script`

**Purpose:** Generate a full video script with optional per-scene breakdown and duration.

### Input schema

```json
{
  "type": "object",
  "properties": {
    "product": { "type": "string" },
    "offer": { "type": "string" },
    "durationSeconds": { "type": "integer" },
    "platformType": { "type": "string" },
    "language": { "type": "string" },
    "persona": { "type": "object" }
  }
}
```

### Output schema

```json
{
  "type": "object",
  "properties": {
    "script": { "type": "string" },
    "scenes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "scene": { "type": "integer" },
          "visual": { "type": "string" },
          "audio": { "type": "string" },
          "caption": { "type": "string" }
        }
      }
    },
    "durationSeconds": { "type": "integer" }
  }
}
```

### Example input

```json
{
  "product": "Acme Analytics",
  "offer": "20% off first year",
  "durationSeconds": 30,
  "platformType": "YOUTUBE",
  "language": "en",
  "persona": { "id": "a2222222-2222-4222-8222-222222222222" }
}
```

### Example output

```json
{
  "script": "Open on a cluttered spreadsheet. VO: 'Monday used to mean exports.' Cut to clean dashboard...",
  "scenes": [
    { "scene": 1, "visual": "Over-the-shoulder spreadsheet", "audio": "Monday used to mean exports.", "caption": "Still doing manual reports?" },
    { "scene": 2, "visual": "Product UI hover on anomaly", "audio": "Acme spots issues before your standup.", "caption": "Real-time alerts" }
  ],
  "durationSeconds": 30
}
```

---

## 4. `creative.generate_ugc_brief`

**Purpose:** Generate a structured UGC creator brief (deliverables, guidelines, talking points).

### Input schema

```json
{
  "type": "object",
  "properties": {
    "product": { "type": "string" },
    "deliverables": { "type": "array" },
    "language": { "type": "string" },
    "tone": { "type": "string" }
  }
}
```

Note: the HTTP API passes `deliverables` as a **string** in `GenerateUgcBriefRequest`; adjust prompts or clients if you require a strict array at model input.

### Output schema

```json
{
  "type": "object",
  "properties": {
    "briefTitle": { "type": "string" },
    "objective": { "type": "string" },
    "deliverables": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "format": { "type": "string" },
          "description": { "type": "string" },
          "duration": { "type": "string" }
        }
      }
    },
    "guidelines": {
      "type": "object",
      "properties": {
        "dos": { "type": "array", "items": { "type": "string" } },
        "donts": { "type": "array", "items": { "type": "string" } }
      }
    },
    "talkingPoints": { "type": "array", "items": { "type": "string" } }
  }
}
```

The backend may also accept a top-level **`brief`** string for plain-text extraction when present.

### Example input

```json
{
  "product": "Acme Analytics mobile app",
  "deliverables": "1 vertical 30s TikTok, 3 Instagram Stories",
  "language": "en",
  "tone": "FRIENDLY"
}
```

### Example output

```json
{
  "briefTitle": "Acme Analytics — March UGC sprint",
  "objective": "Drive trial signups from SMB operators",
  "deliverables": [
    { "format": "TikTok vertical", "description": "Hook in first 2s showing before/after", "duration": "30s" },
    { "format": "Instagram Story (x3)", "description": "Feature carousel + swipe-up CTA", "duration": "15s each" }
  ],
  "guidelines": {
    "dos": ["Show real product UI", "Mention trial CTA"],
    "donts": ["No competitor names", "No income claims"]
  },
  "talkingPoints": ["Saved 4 hours a week on reporting", "Alerts before issues hit customers"]
}
```

---

## 5. `creative.enrich_asset_metadata`

**Purpose:** Suggest tags, formats, quality warnings, and alt text for a creative asset without removing existing tags.

### Input schema

```json
{
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "description": { "type": "string" },
    "assetType": { "type": "string" },
    "currentTags": { "type": "array" },
    "sourceUrl": { "type": "string" },
    "platformType": { "type": "string" },
    "language": { "type": "string" }
  }
}
```

### Output schema

```json
{
  "type": "object",
  "properties": {
    "suggestedTags": { "type": "array", "items": { "type": "string" } },
    "suggestedFormats": { "type": "array", "items": { "type": "string" } },
    "qualityWarnings": { "type": "array", "items": { "type": "string" } },
    "altText": { "type": "string" }
  }
}
```

### Example input

```json
{
  "name": "Spring hero banner",
  "description": "Promo banner for US market",
  "assetType": "IMAGE",
  "currentTags": ["spring", "promo"],
  "sourceUrl": "https://cdn.example.com/assets/spring-hero.png",
  "platformType": "META",
  "language": "en"
}
```

### Example output

```json
{
  "suggestedTags": ["US", "display", "1080x1080", "seasonal"],
  "suggestedFormats": ["META_FEED", "META_STORY"],
  "qualityWarnings": ["Text-heavy safe zone may clip on Stories"],
  "altText": "Spring sale graphic with 20% off messaging on pastel background"
}
```
