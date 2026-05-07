# Creative Studio

User-facing module for managing creative **assets**, structured **copy artifacts**, **variant sets**, **usage** against campaigns and other entities, **cross-entity links**, **render presets**, and **folder** organization. It integrates with **Governance** (rule checks on copy), **Research** (personas, insights, keyword clusters in AI inputs), and the **AI platform** (`AiPromptRun`, provenance via `creative_ai_run_links`).

Backend package: `com.avyukt.marketsuite.creative`. REST routes are listed under [Creative Studio API](api.md#creative-studio-api) in `api.md`. Prompt JSON contracts: [prompts/creative.md](prompts/creative.md).

---

## Overview

Creative Studio is workspace-scoped. Teams register **creative assets** (URL-first MVP: `source_url` / `file_url` point at the same or related URLs), author **copy artifacts** (ad copy, lists, scripts, briefs), optionally group outputs in **variant sets**, record **where** creatives are used (campaigns, sponsored units, templates, social surfaces via typed usage rows), and maintain lightweight **links** between arbitrary entities for traceability.

**AI** features run approved prompt templates through `AiFacade.runPrompt`, persist results as copy rows or action proposals, and write **`creative_ai_run_links`** so every generation is tied to an `AiPromptRun` and optional citation JSON.

---

## Data model

| Table | Purpose |
|-------|---------|
| **creative_assets** | Workspace creative files/metadata: type, status, visibility, name, description, `source_type` (default `URL`), `source_url`, `file_url`, dimensions, tags (`JSONB` array), `meta_json`, audit fields. |
| **creative_asset_versions** | Immutable versions per asset: `version_number`, `version_type`, `file_url`, checksum, dimensions, `meta_json`. Unique `(asset_id, version_number)`. |
| **creative_copy_artifacts** | Structured copy: `type` (`CopyArtifactType`), `status` (`CopyStatus`), `content_text`, `content_json`, optional `template_id`, `rule_set_id`, `disclaimer_ids`, **`governance_check_run_id`**. |
| **creative_variant_sets** | Named bundle tied to a parent entity (`parent_entity_type`, `parent_entity_id`) with `strategy` and `parameters_json`. |
| **creative_variants** | Rows in a set: `variant_index`, `entity_type`, `entity_id` (e.g. `COPY_ARTIFACT` + UUID), optional `score`, `notes`. |
| **creative_usages** | **Usage tracking**: which **creative** entity (`creative_entity_type`, `creative_entity_id`) is used by which **consuming** entity (`used_entity_type`, `used_entity_id`), plus `relation_type` and `context_json`. Unique per workspace and relation. |
| **creative_links** | Directed relationships (`from_entity_type`/`id` → `to_entity_type`/`id`) with `relation_type` and `note` (e.g. research ↔ creative). |
| **creative_render_presets** | Per-workspace named **render** presets (`preset` enum) with `constraints_json` for export/delivery rules. |
| **creative_ai_run_links** | **AI provenance**: `ai_prompt_run_id`, optional conversation/message IDs, `produced_entity_type`, `produced_entity_id`, `input_context_json`, `citations_json`. |
| **creative_folders** | Folder tree: `name`, optional `parent_folder_id`. |
| **creative_asset_folder_map** | Many-to-many **asset ↔ folder** membership. |

**Campaign integration:** `sponsored_units` may reference `copy_artifact_id` and `asset_id` (FKs added in the Creative Studio migration) for first-class wiring from units to Creative Studio entities.

---

## Asset lifecycle and URL-only MVP

- **Statuses** (`AssetStatus`): **DRAFT → ACTIVE → ARCHIVED**.
- **URL-only MVP:** Assets default to `source_type = URL`; both `source_url` and `file_url` are stored (often the same URL in early deployments). Version rows carry `file_url` for each snapshot.
- **Versioning:** `creative_asset_versions` append new rows with monotonically increasing `version_number`; the asset’s current view is driven by service logic and the latest version metadata.

---

## Copy artifact types

`CopyArtifactType` includes:

- **AD_COPY** — Headline/body/CTA-style ad text.
- **HOOK_LIST**, **ANGLE_LIST**, **CTA_LIST** — Brainstorm lists (often produced together by the hooks/angles/CTAs AI flow).
- **VIDEO_SCRIPT**, **STORYBOARD** — Video-oriented structured copy (`STORYBOARD` available for future/storyboard flows).
- **UGC_BRIEF** — Creator briefs and guidelines.
- **SOCIAL_CAPTION**, **LANDING_COPY**, **EMAIL_COPY**, **SMS_COPY** — Channel-specific artifacts.

Copy **status** (`CopyStatus`) for governance workflows: **DRAFT**, **IN_REVIEW**, **APPROVED**, **REJECTED**, **ARCHIVED** (distinct from asset statuses).

---

## Usage tracking

`creative_usages` answers: “This **creative** (asset or copy artifact) is **used by** this **entity** in this **way**.”

Typical `used_entity_type` / `creative_entity_type` values align with other modules (string identifiers), for example:

- **Campaigns** — e.g. `CAMPAIGN` as `used_entity` with creatives as `creative_entity`.
- **Sponsored units** — direct FKs on `sponsored_units` plus optional usage rows for reporting.
- **Templates** — governance `ContentTemplate` or related IDs as `used_entity`.
- **Social posts** — platform post or internal post entities as `used_entity`.

List APIs require either filters on the **creative** side (`creativeEntityType` + `creativeEntityId`) **or** the **used** side (`usedEntityType` + `usedEntityId`), not both.

---

## Governance integration

- **`CreativeCopyService.runGovernanceCheck`** loads the artifact, builds a **content payload** JSON from `content_text` and `content_json`, and calls **`GovernanceCheckService.runChecks`** with `entityType = COPY_ARTIFACT`, the copy id, optional `rule_set_id` from the artifact, **platform** (`PlatformType`), and **language**.
- The returned **`GovernanceCheckRunResponse.id`** is stored on the artifact as **`governance_check_run_id`**.
- **`CreativeAiService.generateCopyVariants`** optionally runs the same governance path **per generated variant** when `ruleSetId` is present in the request, updating each new artifact’s `governance_check_run_id` and returning statuses in the API response.

---

## AI generation flows (five capabilities)

All routes require **`requireCreativeAiUse`** (see RBAC). Implementation: `CreativeAiService`.

| Capability | Prompt template | Effect |
|------------|-----------------|--------|
| Generate ad copy variants | `creative.generate_ad_copy_variants` | Parses `variants[]` from model JSON; creates **AD_COPY** (or requested type) artifacts, a **variant set** + **variants**, optional governance per variant, **`CreativeAiRunLink`** per artifact with citation JSON from variants. |
| Hooks / angles / CTAs | `creative.generate_hooks_angles_ctas` | Creates three artifacts: **HOOK_LIST**, **ANGLE_LIST**, **CTA_LIST**; links each to the same **`AiPromptRun`**. |
| Video script | `creative.generate_video_script` | One **VIDEO_SCRIPT** artifact; AI run link. |
| UGC brief | `creative.generate_ugc_brief` | One **UGC_BRIEF** artifact; AI run link. |
| Enrich asset metadata | `creative.enrich_asset_metadata` | Runs prompt from asset fields; creates an **`AiActionProposal`** (`ENRICH_ASSET_METADATA` / `CREATIVE_ASSET`) for human review; **`CreativeAiRunLink`** with `produced_entity_type` **`ASSET_METADATA_ENRICHMENT`** and `produced_entity_id` = asset id. |

---

## AI provenance

**`creative_ai_run_links`** connects:

- **`ai_prompt_run_id`** → `AiPromptRun` (full model output and metadata).
- **`produced_entity_type` / `produced_entity_id`** → e.g. `COPY_ARTIFACT`, or `ASSET_METADATA_ENRICHMENT` for enrichment proposals.
- **`input_context_json`** — Serialized input sent to the template.
- **`citations_json`** — e.g. insight citations extracted from ad-copy variants.

`GET .../creative/ai/links` lists links for the workspace, filterable by produced entity.

---

## RBAC

| Role | Creative read | Manage assets/copy/links/usage/folders | Run Creative AI |
|------|---------------|------------------------------------------|-----------------|
| **ORG_ADMIN**, **WORKSPACE_ADMIN**, **EDITOR** | Yes | Yes (`requireCreativeManagement`) | Yes (`requireCreativeAiUse`) |
| **ANALYST** | Yes (`requireCreativeRead`) | No | Yes |
| **VIEWER** | Yes | No | No |

**APPROVER** is not included in the default Creative read/management AI checks; use org/workspace admin or editor workflows for management. **`requireCreativeApproval`** exists for future approval-specific endpoints.

---

## Cross-module integration

| Module | Integration |
|--------|-------------|
| **Workspace / Identity** | All entities scoped by `workspace_id` / `org_id`; membership and JWT; audit logs on create/update/AI actions. |
| **Governance** | `GovernanceCheckService` on copy checks and post-generation checks; `template_id`, `rule_set_id`, `disclaimer_ids` on artifacts. |
| **Research** | AI inputs may include `personaResearchId`, `keywordClusterId`, comma-separated `insightIds` (ad copy); personas/insights inform prompts. |
| **Campaign** | `sponsored_units.copy_artifact_id` / `asset_id`; `creative_usages` for campaign/social/template links. |
| **AI platform** | `AiFacade.runPrompt`, `AiPromptRun`, optional `AiActionProposal` for asset enrichment; tools: `creative.searchAssets`, `creative.getAsset`, `creative.searchCopyArtifacts`, `creative.getCopyArtifact`, `creative.listUsageForCreative`. |

For broader AI architecture, see [ai.md](ai.md) and [architecture.md](architecture.md).
