# AI Platform Layer

This document describes the Marketing Suite **AI Platform Layer**: how LLM calls are routed, how tools and workflows run, how safety and approvals fit in, and how other backend modules can reuse the same capabilities through `AiFacade`.

## Architecture overview

The AI layer is implemented as a Spring module under `com.avyukt.marketsuite.ai`. It sits between HTTP controllers and external LLM APIs, and it shares integration and identity services with the rest of the monolith.

### Major responsibilities

| Area | Role |
|------|------|
| **Gateway** | `LlmGatewayRouter` dispatches `LlmRequest` to provider-specific gateways (`OpenAiGateway`, `PerplexityGateway`, `CustomHttpGateway`, `MockGateway`). Keys are resolved via `SecretStore` using metadata such as `secretRef` from the linked integration account. |
| **Tools** | Tool definitions are exposed per workspace (`AiToolsController`). In **TOOL_ASSISTED** mode, `AiConversationService` can run deterministic tool steps and attach digests to the LLM context. High-risk tools should remain gated by proposals and permissions, not invoked blindly from user text alone. |
| **Workflows** | `AiWorkflowService` runs multi-step definitions (`AiWorkflowsController`) using org-scoped definitions and workspace context. |
| **Safety** | `AiSafetyService` applies workspace **content policy** (JSON) and **regex redaction rules** to model inputs/outputs. Policy and rules are managed under `/workspaces/{id}/ai/safety`. |
| **Approvals** | **Prompt templates** follow DRAFT → submit → APPROVED/ARCHIVED. Only **APPROVED** templates are eligible for programmatic runs via `AiFacade.runPrompt`. **Action proposals** capture suggested side effects (create/update entities) for human approve/reject/execute flows (`AiActionProposalsController`). |

### Request path (conceptual)

1. User or module initiates an AI operation (chat message, prompt run, workflow run).
2. `PermissionService` checks org/workspace AI permissions (`requireAiUse`, `requireAiOrgManagement`, etc.).
3. `AiProviderSelectionService` picks the org’s `AiProviderConfig` (and workspace preferences for allowed models).
4. Messages are built, secrets are attached as metadata, safety redaction runs on sensitive strings.
5. `LlmGatewayRouter.route` calls the correct gateway; response text/JSON is redacted again before persistence and API responses.

---

## How to add a new LLM provider gateway

1. **Extend `LlmProviderType`** (Java enum) and ensure the Angular `LlmProviderType` union stays aligned for admin UI.
2. **Implement a gateway** similar to `OpenAiGateway`: accept `LlmRequest`, resolve credentials from `request.metadata()` (typically `secretRef` → `SecretStore.retrieve`), map messages to the vendor API, and return `LlmResponse` (text, optional JSON, token usage).
3. **Register the gateway** in `LlmGatewayRouter.route` with a new `switch` branch.
4. **Wire provider configs**: org admins create `AiProviderConfig` rows pointing at an `IntegrationAccount` whose secrets back the `secretRef`. Optional: add UI wizard steps in `ProviderSettingsComponent`.
5. **Tests**: add unit tests for the gateway (HTTP client mocked) and an integration test path if the suite uses `MOCK` or a test container.

Keep gateways free of business rules; selection, safety, and auditing belong in services and controllers.

---

## How to add a new tool safely

1. **Define the tool** in the catalog (database seed or migration + `AiToolDefinition` semantics): name, description, JSON schema for arguments, and `ToolRiskLevel` (`READ_ONLY`, `SAFE_WRITE`, `HIGH_RISK_WRITE`).
2. **Implement execution** in the service layer that the agent/tool runner calls. Enforce **idempotency** and **authorization** inside that service (do not trust model-produced IDs without checks).
3. **Workspace policy**: workspace admins can restrict **allowed tools** via safety policy JSON (`allowedTools`). Denied tools must not execute even if the model requests them.
4. **High-risk writes**: prefer emitting an **`AiActionProposal`** (via `AiFacade.proposeAction` or internal services) and require **APPROVE** + **EXECUTE** instead of direct application of model output.
5. **Audit**: log tool invocations and outcomes where the platform already audits AI entities (`AuditService`).

---

## Reusing `AiFacade` from other modules

`AiFacade` (`com.avyukt.marketsuite.ai.service.AiFacade`) is the supported **cross-module entry point** for:

- Running an **approved** prompt by name or UUID with merged JSON input and context.
- Starting a **conversation** with optional context map persisted as `contextJson`.
- Appending a **user message** and receiving the assistant reply (same path as the REST controller).
- Creating an **action proposal** tied to a conversation and workspace.

### Inject and call from another `@Service`

```java
@Service
@RequiredArgsConstructor
public class CampaignCopyAssistantService {

    private final AiFacade aiFacade;

    public void runSnippetPrompt(UUID workspaceId, String productName) {
        String inputJson = "{\"productName\":\"" + productJsonEscape(productName) + "\"}";
        var run = aiFacade.runPrompt(workspaceId, "sponsored_snippet_variants_v2", inputJson, Map.of());
        // Persist or map run.getOutputJson() / getOutputText() as needed
    }

    private static String productJsonEscape(String s) {
        // use ObjectMapper or proper JSON building in production
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
```

### Start a headless chat turn sequence

```java
UUID convId = aiFacade.startConversation(workspaceId, "Campaign Q4 review", Map.of("campaignId", campaignId.toString()));
AiMessage reply = aiFacade.appendMessage(convId, "Summarize risks for approvers.");
```

### Raise a proposal for human approval

```java
aiFacade.proposeAction(
    workspaceId,
    convId,
    "Update sponsored unit headline",
    "UPDATE_SPONSORED_UNIT",
    "SPONSORED_UNIT",
    sponsoredUnitId,
    "{\"headline\":\"New headline from model\"}");
```

Always pass **workspace** and **conversation** that belong together; the facade validates workspace ownership of the conversation.

---

## Security and redaction design

- **Secrets**: API keys and tokens live in the **integration** secret store, referenced by `secretRef`. They are not echoed in LLM prompts as plain text; gateways pull them at call time.
- **Redaction**: `AiSafetyService.redactSecrets(workspaceId, text)` runs **workspace redaction rules** (regex → replacement) on strings that will be shown or stored as user-visible assistant content. Policy JSON can include banned phrases and blocked topics interpreted by higher-level checks (depending on deployment).
- **Content policy**: Stored as `policyJson` per workspace; the Angular **Safety** screen edits structured fields or raw JSON. Invalid regex in custom redaction rules may be rejected by the API.
- **Approvals**: Prompt runs from `AiFacade` require **APPROVED** templates in the same organization. Governance’s **AI rewrite** endpoint uses the same stack under a dedicated controller (`AiRewriteController`).

---

## Related HTTP surface

See [API reference – AI Platform API](api.md#ai-platform-api) for paths, methods, and short descriptions per controller.

For local setup, see [local-dev.md](local-dev.md).

---

## How Research Module Uses AiFacade

The Research & Intelligence module (`com.avyukt.marketsuite.research`) uses the same AI Platform as chat and governance: **approved prompt templates**, **`AiFacade.runPrompt`**, and for the weekly digest, **`AiWorkflowService`** with an org-scoped workflow definition. End-user-oriented documentation: [research.md](research.md); template JSON and guardrails: [prompts/research.md](prompts/research.md).

### Integration pattern

1. **Permission**: Each AI entry point calls `PermissionService.requireResearchAiUse` (workspace roles: org admin, workspace admin, editor, or analyst — not viewer).
2. **Job record**: Long-running flows create a `ResearchJob` (e.g. `AI_SUMMARIZE_SNAPSHOT`, `AI_EXTRACT_INSIGHTS`) and mark it started/completed/failed for observability.
3. **Prompt execution**: The service builds a JSON string for the template variables and invokes:

   `aiFacade.runPrompt(workspaceId, "research.<template_name>", inputJson, Map.of())`

   Template names include `research.snapshot_summarize`, `research.extract_competitor_insights`, `research.cluster_keywords`, and `research.draft_persona`.
4. **Output handling**: Responses are parsed as JSON where possible; fields are mapped to domain entities (snapshot summary update, new insights with evidence, keyword clusters, persona research).
5. **Audit**: `AuditService` logs actions such as `RESEARCH_AI_SUMMARIZE`, `RESEARCH_AI_EXTRACT`, etc.

Weekly digest does **not** call `runPrompt` directly for the whole flow: it calls **`aiWorkflowService.run(workspaceId, workflowDefId, inputJson, null)`** for definition **`research.weekly_digest`**, which orchestrates **read-only tools** plus one **LLM** step.

### Prompt templates used

| Template name | Role |
|---------------|------|
| `research.snapshot_summarize` | Summarize one snapshot; update snapshot summary fields. |
| `research.extract_competitor_insights` | Emit structured insights + evidence for a competitor. |
| `research.cluster_keywords` | Group keywords into clusters (from snapshot text or freeform list). |
| `research.draft_persona` | Fill persona JSON arrays from snapshot excerpts. |
| `research.weekly_digest_narrative` | Narrative digest JSON inside the weekly workflow. |

Workflow definition **`research.weekly_digest`** chains tools (`research.listRecentSnapshots`, `research.listRecentInsights`, `governance.getEffectiveBrandProfile`) with the narrative prompt step.

### Provenance tracking via ResearchAiRunLink

After a successful run, **`ProvenanceService.createAiRunLinkSimple`** (or equivalent) persists **`ResearchAiRunLink`** with:

- **`produced_entity_type`**: `SNAPSHOT_SUMMARY`, `INSIGHT_DRAFT`, `KEYWORD_CLUSTER`, `PERSONA_RESEARCH`, or `DIGEST_REPORT`
- **`produced_entity_id`**: UUID of the snapshot (for summary context), insight, cluster, persona, or digest report
- **`snapshot_ids`**: JSON array of snapshot UUIDs that were inputs to the operation

This gives a reversible trail from an artifact back to which **AiPromptRun** produced it and which **snapshots** were in scope. List links: `GET /api/v1/workspaces/{workspaceId}/research/ai/links`.

### Citation validation flow

1. Services compute the **allowed** snapshot ID set (e.g. single ID for summarize; user-selected IDs for extract/persona).
2. **`ProvenanceService.validateCitationSnapshotIds`** walks the parsed JSON: either top-level **`citations`** or **`insights[].evidence[]`**.
3. Each **`snapshotId`** must be a valid UUID in the allowed set. Invalid or unknown IDs are **logged** and skipped; for extract, **`InsightEvidence`** rows are only created when the ID is valid.

This matches template **guardrails** (“do not invent facts; cite snapshot IDs”) with server-side enforcement at persistence time.

### Weekly digest workflow description

1. Caller **`POST .../research/ai/digest/run`** with `periodStart` and `periodEnd` (ISO dates).
2. Service resolves workflow definition **`research.weekly_digest`** for the org.
3. **`AiWorkflowService.run`** executes steps: fetch recent snapshots, fetch **published** insights in the window, load **effective brand profile**, then run **`research.weekly_digest_narrative`** with period + tool output context.
4. On success, a **`ResearchDigestReport`** row stores title, period, `content_text`, and `content_json`; a **`ResearchAiRunLink`** ties the digest to the workflow’s prompt run when available.

For HTTP details and example payloads, see [api.md](api.md#research--intelligence-api).
