# Marketing Suite — Functional Document

> **What this document is**: a business-functional walkthrough of the Marketing Suite product. It explains *what* every capability does, *why* a real user would reach for it, *what business outcome* it drives, and *how the moving parts come together* in real-world scenarios. It is written for product, sales, customer success, implementation partners, QA, and new joiners — anyone who needs to understand the platform without diving into code.
>
> **What this document is not**: a technical specification, an API reference, or an SDK guide. For those, see `architecture.md`, `api.md`, `ai.md`, `creative.md`, `research.md`, and `integrations.md`.

---

## Table of Contents

1. [The Product in One Page](#1-the-product-in-one-page)
2. [Who Uses the Suite — Personas in Real Companies](#2-who-uses-the-suite--personas-in-real-companies)
3. [End-to-End Real-World Scenarios](#3-end-to-end-real-world-scenarios)
4. [Functional Walkthrough — Module by Module](#4-functional-walkthrough--module-by-module)
   - 4.1 [Tenancy: Organizations, Workspaces & People](#41-tenancy-organizations-workspaces--people)
   - 4.2 [Integrations Hub: Connecting the Outside World](#42-integrations-hub-connecting-the-outside-world)
   - 4.3 [Conversation Campaigns: Where Spend Happens](#43-conversation-campaigns-where-spend-happens)
   - 4.4 [Measurement: What Actually Performed](#44-measurement-what-actually-performed)
   - 4.5 [Creative Studio: Producing Ads at Scale](#45-creative-studio-producing-ads-at-scale)
   - 4.6 [Brand & Content Governance: Saying No, Faster](#46-brand--content-governance-saying-no-faster)
   - 4.7 [Research & Intelligence: Knowing the Market](#47-research--intelligence-knowing-the-market)
   - 4.8 [The AI Platform: A Trusted Coworker, Not a Cowboy](#48-the-ai-platform-a-trusted-coworker-not-a-cowboy)
5. [Common User Journeys](#5-common-user-journeys)
6. [Decision Cookbook — "When Do I Use What?"](#6-decision-cookbook--when-do-i-use-what)
7. [Business Impact: How Each Capability Moves a Number](#7-business-impact-how-each-capability-moves-a-number)
8. [Compliance, Trust & Audit Story](#8-compliance-trust--audit-story)
9. [Operational Realities, Limits & Pitfalls](#9-operational-realities-limits--pitfalls)
10. [Glossary in Plain English](#10-glossary-in-plain-english)

---

# 1. The Product in One Page

## 1.1 What the Marketing Suite is, in one sentence

> The Marketing Suite is a **single workspace** where a marketing team plans paid-media campaigns, generates ads with AI, enforces brand and legal rules, monitors competitors, runs the actual buys across many ad platforms, and watches the results — without juggling six tools.

## 1.2 The problem it solves

A modern marketing organization typically owns the following pain:

- The brand team writes a 40-page brand book in PDF. **Nobody opens it.** Six months later half the social posts violate it.
- The ads team logs into Meta Business Manager, Google Ads, TikTok Ads Manager, LinkedIn Campaign Manager, and Pinterest Ads — **five separate UIs, five sets of credentials, five copies of every campaign brief**.
- The analytics team exports CSVs from each ad platform, joins them in a spreadsheet, and sends a Monday morning slide deck. **The data is always 48 hours old.**
- The research team monitors competitors in Notion, Slack threads, and screenshots. **Six months later nobody can find the original source for the "Acme dropped their price by 20%" claim.**
- The legal team gets pulled in at the very end. **Campaigns ship two weeks late** because legal flagged "guaranteed returns" wording.
- A new ChatGPT-style ad surface launches. **Nobody owns it** because it's nobody's tool.
- Someone uses ChatGPT to draft an ad. The AI hallucinates a regulator-banned claim. **The ad runs.** Three weeks later there is a fine.

The Marketing Suite directly addresses each of these pains:

| Pain | What replaces it |
|---|---|
| Brand book PDF nobody reads | Brand profile lives in the system; every AI generation and every human edit can be auto-checked against it. |
| Five ad-platform UIs | One Integrations Hub with 28+ connectors. Connect once at the org, map to many workspaces. |
| Stale CSV reports | Sync jobs and webhooks pump real-time platform metrics into the campaign detail page. |
| Lost competitor research | Every research finding is linked to a captured snapshot; published claims require evidence. |
| Late legal review | Governance rule engine runs deterministic checks at create time, not approval time. |
| New conversational ad surfaces | First-class CHATGPT_ADS and PERPLEXITY_ADS providers. |
| Hallucinated AI ads | Approved-template-only AI runs, regex secret redaction, and an "AI proposes — human approves" pattern for any write action. |

## 1.3 What success looks like for a customer

A customer that has fully adopted the Marketing Suite typically reports:

- **30–60% faster campaign launch** because creative + governance happen in one tool.
- **Near-zero brand-violation incidents** because every AI artifact is rule-checked at the moment of creation.
- **Hours, not days, of analyst time per week** because reports are continuously synced rather than CSV-imported.
- **A complete audit trail** from "this is the spend the CFO is asking about" all the way back to "this is the snapshot of the competitor pricing page that inspired the campaign brief."
- **AI as an everyday coworker**, not a side experiment, because every AI action is bounded by approved prompts, workspace safety policy, and human-in-the-loop approvals.

---

# 2. Who Uses the Suite — Personas in Real Companies

To make the rest of this document concrete, here are six people we will refer to throughout. Each one is grounded in real customer types, with a real job, a real frustration, and a real reason they reach for the suite.

## 2.1 Anika Sharma — Performance Marketer at *BlossomNest*

- **Company**: BlossomNest, a direct-to-consumer home-decor brand. ₹40 Cr ARR. Sells in India and the US.
- **Role**: EDITOR in two workspaces (India Market, US Market). Reports to the Brand Lead.
- **Daily reality**: Runs 4–6 campaigns simultaneously on Meta, Google, TikTok, and (newly) ChatGPT Ads. Lives in spreadsheets reconciling spend.
- **Why she uses the suite**: To stop opening four tabs. To get AI-drafted hooks she can ship in an hour. To show the Founder a Monday-morning dashboard that already includes yesterday's numbers.

## 2.2 Rohan Mehta — Brand Lead at *PolarisFin*

- **Company**: PolarisFin, a fintech offering mutual funds and a stock-trading app. SEBI-regulated.
- **Role**: WORKSPACE_ADMIN of "Mutual Funds" workspace.
- **Daily reality**: Every campaign needs SEBI-mandated disclaimers ("Mutual fund investments are subject to market risks…"). Every claim needs to be defensible. The compliance team gets escalated to in 30% of launches.
- **Why he uses the suite**: To codify SEBI rules **once** as a rule set, then have the system block any copy that says "guaranteed returns" before it ever gets to compliance review.

## 2.3 Priya Iyer — Competitive Intelligence Analyst at *Vertex SaaS*

- **Company**: Vertex SaaS, a B2B analytics platform competing with five named competitors.
- **Role**: ANALYST.
- **Daily reality**: Monitors competitor pricing pages, blog posts, ad libraries, and conference talks. Writes a Monday morning "What our competitors did this week" digest. Half her time is screen-shotting and another half is writing.
- **Why she uses the suite**: To capture sources once and have AI summarize them; to extract insights with citations she can defend; to ship the Monday digest in 30 minutes instead of half a day.

## 2.4 Marcus Chen — Founder at *CloudReach Agency*

- **Company**: CloudReach Agency, a 12-person digital marketing agency serving 8 client brands.
- **Role**: ORG_ADMIN of CloudReach's own org and an invited `WORKSPACE_ADMIN` in each client's org.
- **Daily reality**: Onboards a new junior account exec every quarter. Each junior needs access to 3–4 client workspaces — but only specific ones, and never billing.
- **Why he uses the suite**: To grant scoped access fast, see who-changed-what across all clients, and prove SOC2-style audit trails when a client asks.

## 2.5 Sara Khanna — Compliance Reviewer at *MediCare Plus*

- **Company**: MediCare Plus, a healthcare service provider. Regulated under medical-claim advertising rules.
- **Role**: APPROVER.
- **Daily reality**: Reviews about 25 ads per week. Half come in late on Friday afternoons. She is the person who says "you cannot say 'cures'."
- **Why she uses the suite**: To work from a single approval queue rather than email threads, to see the AI's reasoning for each piece of copy, and to deny risky AI proposals before they touch live campaigns.

## 2.6 Dev Patel — IT / RevOps at *Saraswati Industries*

- **Company**: Saraswati Industries, a B2B manufacturer running LinkedIn-led demand generation.
- **Role**: ORG_ADMIN.
- **Daily reality**: Owns OAuth credentials, secret rotations, and "why is the dashboard not updating" calls.
- **Why he uses the suite**: To centrally manage every platform connection, rotate webhook secrets without losing data, and diagnose when a platform integration goes red.

These six come back throughout the rest of the document.

---

# 3. End-to-End Real-World Scenarios

These eight worked scenarios show the suite in action. Each one is a complete narrative — what the user wants, what they click, what the system does, and what the business outcome is.

## 3.1 Scenario A — The Holiday Sprint

> **Anika needs to launch a Diwali flash-sale campaign across Meta, Google Ads, TikTok, and ChatGPT Ads in five days.**

### Day 1 (Monday): Setup

Anika opens the suite. Her sidebar already shows **BlossomNest → India Market** as the selected workspace because the Brand Lead pre-configured it.

She first checks **Integrations → Accounts** to confirm Meta, Google Ads, TikTok, and ChatGPT Ads are all `CONNECTED` (green chip). The Meta token was refreshed automatically yesterday — she sees `lastValidatedAt: 23 hours ago`. ChatGPT Ads is API-key based; Dev set it up months ago.

She heads to **Campaigns → New Campaign** and starts the wizard:
- **Name**: "Diwali Flash Sale 2026"
- **Objective**: PURCHASE
- **Daily budget**: ₹50,000
- **Window**: Oct 30 – Nov 5
- **Pacing**: STANDARD

The campaign saves as DRAFT. Nothing runs yet.

### Day 2 (Tuesday): Creative production

Anika needs **8 ad variants** across the four platforms. Historically this took her three days. She opens **Creative Studio → AI Generator** and picks "Generate ad copy variants":

- **Topic**: "20% off festive bedsheets and table linen"
- **Persona**: She picks an existing `PersonaResearch` row called "Working mom, 28-40, urban India, household decision maker" — built last quarter from scraped reviews.
- **Insights**: She attaches a published `Insight` titled "Indian buyers respond to family-gathering imagery better than discount-only copy" — it has two evidence rows linking to ad library snapshots.
- **Keyword cluster**: "festive home decor".
- **Platforms**: META, GOOGLE_ADS, TIKTOK, CHATGPT_ADS.
- **Language**: en-IN.
- **Number of variants**: 8.
- **Rule set**: "BlossomNest India Compliance" — workspace-level rule set forbidding guaranteed-result language and requiring price-anchor disclaimers.

She clicks Generate. Behind the scenes the suite:

1. Builds an input JSON with the persona's pains/objections/motivations, the insight's evidence-cited summary, the keyword list, the brand profile (BlossomNest's voice tone is FRIENDLY, primary color the warm coral hex), and the rule set.
2. Calls the approved prompt template `creative.generate_ad_copy_variants` through the AI gateway.
3. Parses the resulting JSON: 8 variant objects, each with a headline, body, and CTA.
4. Creates 8 `CreativeCopyArtifact` rows with status DRAFT.
5. **Runs the governance rule engine on each variant** because she supplied a rule set.
6. One variant says "Guaranteed lowest price for the season" — the rule engine flags it `BLOCK` (banned phrase: "guaranteed"). The artifact is created but its `governanceCheckRunId` points to a FAIL run.
7. Creates a `CreativeVariantSet` with all 8 variants and writes a `CreativeAiRunLink` per artifact tying it back to the AI run for provenance.

Anika sees a result table: 7 variants PASS, 1 variant FAIL with a clear "guaranteed" flag. She rewrites the failing variant manually and reruns the governance check on it. PASS.

### Day 3 (Wednesday): Sponsored units

Anika moves to **Campaigns → Diwali Flash Sale 2026 → Sponsored Units**. She creates four sponsored units (one per platform):

- For each unit, she picks a `copyArtifactId` from her newly-generated variants and an `assetId` (an existing `CreativeAsset` of a video shot last week, status ACTIVE, version 2).
- She fills in the landing URL, CTA text, and platform-specific snippet.

Each unit saves as DRAFT and is sent for approval (`POST /approvals/submit` happens behind a button click). An `ApprovalWorkflow` row is created with `entityType="SPONSORED_UNIT"` and `state=IN_REVIEW`.

### Day 3 evening: Approval

The Brand Lead opens **Approvals**, sees four pending items, reviews the AI's reasoning (the assistant message that produced the copy is linked from the artifact), approves all four with a one-line note. The units flip to APPROVED.

### Day 4 (Thursday): Mapping & launch

Anika activates the campaign (DRAFT → ACTIVE).

For the campaign to receive **synced metrics**, the internal campaign must be linked to the corresponding external campaign on each platform. Anika goes to **Integrations → Campaign Reports**, sees the four external campaigns the system already discovered (because the connector pulled them in this morning's sync), and uses the **Quick Map** button to bind each external campaign to her internal one.

The moment she creates the mapping, the system runs a backfill: every existing `CampaignReportData` row with that external campaign ID is retroactively linked to her internal campaign. Her **Synced Metrics** tab on the campaign detail page now shows historical rows even though her campaign was created today.

### Day 5–7: Real-time operations

The Meta integration has a webhook configured (Dev did this months ago). Every time Meta pushes a campaign-update event, the suite verifies the HMAC-SHA256 signature, parses the payload, upserts a `CampaignReportData` row, and — because the entity mapping exists — links it to Anika's internal campaign and propagates the platform's status into her campaign's status.

So when Meta auto-pauses a creative for low CTR at 11 pm, Anika sees `ACTIVE → PAUSED` on her campaign detail by 11:01 pm. She doesn't need to log into Meta Business Manager.

Google Ads is webhook-less — but the daily sync job pulls metrics every 6 hours. TikTok has a sync job too. ChatGPT Ads is API-key based and reports through its own connector.

### Outcome

- **Time to launch**: 4 days from idea to live campaign instead of 10–12.
- **Brand-violation risk**: 1 caught at AI generation, 0 reached production.
- **Reporting**: Anika's Sunday status email is a screenshot of the suite's Synced Metrics tab. Numbers are <1 hour old.

## 3.2 Scenario B — The Compliance Tightrope

> **Rohan needs to launch the "PolarisFin Tax Saver Fund" campaign while satisfying SEBI mutual-fund-advertising rules.**

### Setting up the rule once

Rohan creates a workspace-level `BrandRuleSet` called "SEBI Mutual Fund Compliance":

- Rule 1: `BANNED_PHRASE`, severity BLOCK, pattern `guaranteed returns`. Reason: SEBI prohibits guaranteed-return language for mutual funds.
- Rule 2: `BANNED_PHRASE`, severity BLOCK, pattern `risk[- ]free`.
- Rule 3: `REQUIRED_DISCLAIMER`, severity BLOCK, parameters say content must reference the disclaimer with key `SEBI_MUTUAL_FUND_RISK`.
- Rule 4: `CLAIM_RESTRICTION`, severity WARN, pattern `\bbest\b`. Reason: subjective claims should be substantiated.
- Rule 5: `PLATFORM_POLICY` for Google Ads, severity WARN, restricting CTA language to Google's approved list.

He also creates the `Disclaimer` row, key `SEBI_MUTUAL_FUND_RISK`, default English text "Mutual fund investments are subject to market risks. Read all scheme-related documents carefully." He adds a Hindi localization for the India Market workspace.

### One-time template

Rohan creates a `ContentTemplate` of type `AD_COPY` named "Tax Saver Fund — Q4". He picks the rule set, attaches `defaultDisclaimerIds: ["<SEBI_MUTUAL_FUND_RISK uuid>"]`, drafts content with placeholder variables like `{returnRange}` and `{minInvestment}`, and submits it. The submission creates an `ApprovalWorkflow(entityType="TEMPLATE", state=IN_REVIEW)`.

A WORKSPACE_ADMIN approves it. Status is now APPROVED, version 1.

### Daily use — copy generation that respects the rules

Whenever Rohan or his team generates ad copy in Creative Studio, they pick the same rule set. The AI's prompt context already includes the brand profile (FORMAL voice, conservative language). When the AI proposes a variant containing "best returns of the season", governance check returns WARN. When it proposes "guaranteed monthly income", governance check returns FAIL.

The team **never touches risky copy** because the system rejects it at the moment of creation, not at the moment of legal review.

### What if a rule is wrong?

Six weeks in, SEBI publishes a new circular forbidding "tax-free returns" wording. Rohan adds Rule 6 (`BANNED_PHRASE`, BLOCK, pattern "tax[- ]free returns"). Every existing approved template is unaffected. But every new copy artifact created with this rule set will check against the updated rules. Older templates can also be rerun manually from the **Governance Checks** screen.

### The AI Rewrite escape hatch

When the legal review still flags something the rule engine didn't (an emerging risk), Rohan opens **Governance → AI Rewrite**, pastes the offending paragraph, and the AI returns a compliant alternative. The output passes through the same rule engine again before being saved — so the AI cannot launder a banned phrase.

### Outcome

- **Compliance escalation rate**: dropped from 30% of launches to <3%.
- **Time to ship a compliant ad**: hours instead of days.
- **Audit defense**: every published copy has a `governanceCheckRunId` proving it passed the rule engine on a specific date with a specific rule set version.

## 3.3 Scenario C — The Monday Morning Intelligence Brief

> **Priya delivers a weekly competitive digest to the founder by 9 am every Monday.**

### Wednesday — capturing the world

Priya watches her five competitors: Acme, Bolt, Crest, Drift, and Echo. She is alerted (via Slack channel watching, outside the suite) that Acme published a new pricing page and Bolt ran a new ad campaign in Google's ad library.

She visits **Research → Sources → New URL Source** and ingests `https://acme.example/pricing` as a `WEB_PAGE` snapshot under competitor "Acme". She does the same for Bolt's ad library entry as an `AD_LIBRARY_ENTRY` snapshot.

Each ingest creates a `ResearchSource`, a `SourceSnapshot` (raw text captured), and a `ResearchJob(SNAPSHOT_IMPORT)` for observability.

### Thursday — AI summarization

Priya opens the Acme snapshot and clicks **Summarize with AI**.

Behind the scenes the suite calls `research.snapshot_summarize` and updates the snapshot with:

- A 3-sentence summary.
- A list of key points: "Pro tier $99/mo (was $79/mo)", "Enterprise still sales-led", "New 14-day free trial added".
- Extracted entities: "Pro", "Enterprise", "Free Trial".
- Sentiment: NEUTRAL.

A `ResearchAiRunLink(SNAPSHOT_SUMMARY)` is written so she — or anyone — can later see exactly which AI run produced this summary, what was sent in, what came out, when, and by whom.

### Thursday afternoon — extract insights

She picks the two Acme snapshots and clicks **Extract competitor insights** (`POST /research/ai/competitors/{acmeId}/extract`).

The suite validates that both snapshots belong to sources owned by Acme, sends them through `research.extract_competitor_insights`, and parses the result. The model returns three insights:

1. "Acme raised Pro pricing from $79 to $99 (+25%)" — evidence cites snapshot A.
2. "Acme added a 14-day free trial" — evidence cites snapshot A.
3. "Acme is consolidating brand voice toward enterprise buyers" — evidence cites snapshot B.

The suite creates three `Insight` rows (DRAFT) with `InsightEvidence` rows pointing back to the snapshots. **If the model had hallucinated a snapshot ID**, the system silently drops that evidence — invalid IDs cannot create rows.

The fourth insight the model proposed referenced an imaginary snapshot. It was logged as skipped. This is the suite's anti-hallucination guardrail in action.

### Friday — review and publish

Priya reviews the three insights. She agrees with two and edits the third's title. For all three she clicks **Publish**.

**Publish requires `requireResearchPublish`** which is ORG_ADMIN or WORKSPACE_ADMIN only. Priya is an ANALYST, so the button is grayed out. She pings her manager, who is a workspace admin. The manager publishes them.

**The publish action additionally requires at least one `InsightEvidence` row.** Both insights have evidence, so they pass. If she had created an insight by hand without attaching a snapshot, publish would fail.

### Monday morning — the digest

At 8 am Monday, Priya opens **Research → Digests → Run Weekly Digest**, sets period Oct 21–Oct 27. The suite invokes the `research.weekly_digest` workflow:

1. Tool call: `research.listRecentSnapshots` — returns 12 snapshots from last 7 days.
2. Tool call: `research.listRecentInsights` — returns the 5 insights *published* in the period (drafts excluded).
3. Tool call: `governance.getEffectiveBrandProfile` — returns Vertex SaaS's brand voice and language defaults.
4. LLM call: `research.weekly_digest_narrative` — produces a multi-paragraph digest with sections "What competitors did", "Audience signals", "Strategic implications".

A `ResearchDigestReport` row stores the title, period, narrative text, and the structured JSON. A `ResearchAiRunLink(DIGEST_REPORT)` ties it back to the workflow run.

Priya copies the markdown into an email and sends it to the founder by 9 am.

### What the founder gets — and trusts

Every claim in the digest can be clicked back to:
- → an insight (with confidence level and category)
- → an evidence row
- → a snapshot
- → the original source URL captured on a specific date

This is what makes leadership trust competitive intelligence. There are no anonymous claims; everything is sourced.

## 3.4 Scenario D — The Agency Onboarding

> **Marcus hires Tara as a junior account exec. He needs to give her access to three client workspaces in three different orgs without giving her billing access.**

### The structure

CloudReach has its **own** organization in the suite. It also receives invites into its clients' orgs.

- Client A — "Acme Beverages": CloudReach is granted `WORKSPACE_ADMIN` in the "Acme USA" workspace only.
- Client B — "Beta Beverages": CloudReach is granted `WORKSPACE_ADMIN` in two of Beta's three workspaces.
- Client C — "Crimson Cosmetics": CloudReach has org-level `WORKSPACE_ADMIN` (because Crimson outsources entirely).

Marcus is a `WORKSPACE_ADMIN` (or `ORG_ADMIN` in Crimson's case) in each of these.

### Inviting Tara

Marcus is in three of these orgs. For each, he goes to **Admin → Invites → New Invite** and creates an invite for `tara@cloudreach.example` with role `EDITOR`, scoped to a specific workspace.

Each invite generates a 7-day token, sends an email with a link, and records the invite as PENDING. The raw token is never stored — only its BCrypt hash. Marcus cannot read the token after sending; if Tara loses the email he must resend.

Tara clicks the link, fills in name and password. Her single user account is created (status ACTIVE). For each invite acceptance, a `Membership(user=Tara, org=X, workspace=Y, role=EDITOR)` row is created. She now has three memberships and can see three workspaces in her workspace selector.

### What Tara can and cannot do

As an EDITOR scoped to specific workspaces:

| Action | Result |
|---|---|
| Edit campaigns in those workspaces | ✓ |
| Run AI generation flows | ✓ (Editors and Analysts both can) |
| See members of those workspaces | ✓ |
| Invite new people | ✗ (`canManageMembers` returns false) |
| Approve sponsored units | ✗ |
| Publish research insights | ✗ (only workspace/org admins) |
| Access client billing or OAuth configs | ✗ |
| Switch to another client's workspace she wasn't invited to | ✗ |

When she tries to access something out of scope, she gets a 403 Problem Detail JSON. The frontend hides the menu items entirely so she doesn't see what she can't do.

### Quarterly audit

A client asks: "Show me everything CloudReach changed in our workspace last month."

Marcus opens **Admin → Audit Log**, filters by `actorUserId = Tara`, date range = last 30 days. He sees every CREATE / UPDATE / DELETE / ARCHIVE / APPROVE action with before/after JSON snapshots and timestamps. He exports this as a CSV and sends it to the client.

Audit logs are append-only. Tara could not delete her own actions even if she wanted to.

## 3.5 Scenario E — The Approval Bottleneck

> **Sara reviews 25 ads and 12 AI proposals every Tuesday. Some are mutations to live campaigns. She is the human-in-the-loop.**

### Two kinds of things to approve

Sara opens **Approvals**. She sees two types of pending items mixed together:

1. **Sponsored units submitted for approval** (status IN_REVIEW). These wait for an APPROVER, WORKSPACE_ADMIN, or ORG_ADMIN.
2. **AI Action Proposals** (status PROPOSED). Created when an AI flow wants to make a change to live data.

### Reviewing an AI proposal

One proposal says: "Update sponsored unit headline from 'Get Care Today' to 'Trusted Care Within 24 Hours'." It was generated by an editor running a creative AI flow.

Sara opens it and sees:

- The AI's reasoning (drawn from the conversation that produced the proposal).
- The exact diff: old field vs. new field.
- The `targetEntityId` (sponsored unit UUID) so she can navigate to it.
- The original conversation, citations, brand profile context.

She approves it. Status flips PROPOSED → APPROVED.

### Approval and execution are separate

Approving a proposal does **not** apply the change. Execution is a second permission gate (`requireAiActionExecution`) restricted to `ORG_ADMIN` or `WORKSPACE_ADMIN`. This is intentional: the approver vouches for the *content*; the executor vouches for the *timing*.

A workspace admin clicks Execute. The system applies the headline change to the sponsored unit, status flips APPROVED → EXECUTED, and `executedAt` is recorded.

If execution fails — say the sponsored unit was deleted while waiting for approval — status flips to FAILED with the error captured.

### Rejecting

A second proposal says "Remove disclaimer from medical-claim ad." Sara rejects with a one-line note: "This disclaimer is required by FDA Section X." The proposal is REJECTED (terminal). The AI cannot retry this exact action; it would have to propose something different.

### The audit value

Three months later, regulators ask: "Who approved this specific change at this specific time?" Sara's name, timestamp, and notes are on every audit log row tied to the proposal. The chain is: AI conversation → AI proposal → approval → execution → audit log → entity change. **Five linked records, all immutable.**

## 3.6 Scenario F — When the Webhooks Go Quiet

> **Dev gets a 9 am Slack message from Anika: "Synced metrics haven't updated since midnight. Did Meta break?"**

### Diagnosis

Dev opens **Integrations → Health**. He sees:

- Meta account: overallStatus `WARNING`. Warnings include "Last sync over 24 hours ago" and "Webhook in error state".
- Google Ads, TikTok, ChatGPT Ads: HEALTHY.

He clicks the Meta account. The webhook tab shows status `ERROR` with errorMessage "Signature verification failed at 02:14 UTC".

### What happened

A teammate rotated Meta's app secret in the platform's developer dashboard yesterday but didn't sync the change in the suite. Every webhook delivery since then has failed signature verification — the suite logged each as a FAILED `WebhookDelivery` and put the webhook into ERROR.

### Recovery

Dev clicks **Rotate Secret**, copies the new `whsec_…` value, and pastes it into the Meta dashboard. The webhook moves back to ACTIVE on next inbound delivery.

But what about the lost data?

The sync job is the safety net. Sync jobs are independent of webhooks. Dev runs a one-off sync: **Sync Jobs → Create → Account=Meta, mode=FULL**. The job moves QUEUED → RUNNING. It pulls every campaign report row for the last 7 days and upserts them into `campaign_report_data`. Because the entity mappings already exist, every row is auto-linked to the correct internal campaign. The `Synced Metrics` tab catches up by 9:30 am.

### Important property

`campaign_report_data` is keyed by `(integration_account_id, external_campaign_id, report_date)`. The sync job's upserts for already-present dates simply overwrite with the latest numbers. There is no risk of double-counting. Webhooks and sync jobs are two paths into the **same** table.

### Outcome

- 90 minutes of stale data, fully reconciled.
- A re-rotated secret.
- A `WebhookDelivery` log showing exactly when the failures started and stopped.

## 3.7 Scenario G — The Multi-Market Brand

> **BlossomNest launches the same product in the US and India. Same brand, different market, different language, different disclaimers.**

### Org-level baseline

The marketing director sets up the org-level `OrgBrandProfile`:

- Display name "BlossomNest"
- Primary color #E8794A (warm coral)
- Voice tone FRIENDLY
- Default language `en`
- Supported languages `["en", "en-IN", "hi"]`

This is the **inheritable baseline**.

### Workspace overrides

Each market has its own workspace with a `WorkspaceBrandProfile` whose `overridesJson` selectively overrides:

| Workspace | Override |
|---|---|
| US Market | `{}` (no overrides — uses org defaults) |
| India Market | `{"defaultLanguage":"en-IN","voiceTone":"PROFESSIONAL"}` (Indian customers prefer slightly more formal language for the brand voice) |

When any module needs the effective profile, it calls `getEffectiveProfile(workspaceId)`. The merge is deterministic: org base + workspace overrides, with overrides winning. The same brand color comes through both markets, but the voice differs.

### Disclaimers per market

A "Returns Policy" disclaimer is created at the org level. It has two `DisclaimerLocalization` rows:

- `en`: "30-day return policy applies to unused items only."
- `hi`: "30 दिनों की वापसी नीति केवल अप्रयुक्त वस्तुओं पर लागू होती है।"

The India Market's content templates reference the Hindi text; the US Market's templates reference English.

### Platform constraints surface differently

When a creative is being authored for X (Twitter) in either workspace, the suite shows the seeded platform constraint TEXT_LENGTH=280 to the editor and the rule engine enforces it on save. The Indian team in particular keeps hitting the limit because Devanagari text takes more characters per word; they often shorten messages. The 280 limit is non-negotiable platform policy and the suite shows them why.

### Outcome

- Two markets, one brand identity.
- No copy-paste of brand rules.
- Localizations isolated; an edit to the Hindi disclaimer doesn't touch English.
- Auditable: any change to org-level profile shows up in the audit log under the org admin's name.

## 3.8 Scenario H — The Pivot

> **A startup decides mid-quarter to reposition from "tools for solo developers" to "tools for engineering teams." Marketing has 6 weeks to pivot every campaign and ad.**

### Step 1: Research informs the pivot

The strategy team uses Research → Personas → Draft persona to generate a new "Engineering Team Lead" persona from selected snapshots of recent customer interview transcripts. They then publish 4 insights about the team-buyer journey.

### Step 2: Brand profile shift

The brand lead opens **Brand Profile → Organization Defaults**:

- `voiceTone` PROFESSIONAL → TECHNICAL
- `voiceGuidelinesText` updated to explain the new positioning
- New `dontListText`: "Do not refer to single-user workflows. Do not say 'developer' when you mean 'team'."

Save. Audited. The change is now visible in every workspace via inheritance unless that workspace has explicit overrides.

### Step 3: Rule set update

The team adds a new `BrandRule` to the existing rule set:

- `BANNED_PHRASE`, severity WARN, pattern `\bsolo developer\b`. Reason: violates new positioning.

Existing approved templates are unchanged. New copy creation will be flagged.

### Step 4: Template versioning

The team finds the canonical "Hero ad copy" template (status APPROVED, version 1). They click **New Version** which clones it as version 2, status DRAFT, with `parentTemplateId` pointing at version 1. They edit the body, submit, get approved.

Both versions exist forever. Older campaigns referencing v1 still resolve. New campaigns reference v2.

### Step 5: Re-running governance on existing creatives

Marketing has 200 existing copy artifacts in the workspace. The team uses the **Governance → Checks** screen to bulk re-run governance against the updated rule set. The system creates fresh `GovernanceCheckRun` rows for each artifact. About 35 artifacts come back WARN because they contain "solo developer." The team prioritizes those for rewrite.

### Step 6: AI rewrite assists

For each flagged artifact, the team clicks **AI Rewrite**. The AI proposes a new version maintaining the original intent without the flagged phrase. The output is automatically rule-checked again before being saved. Of the 35, 30 are saved as-is from the AI; 5 need manual edits.

### Outcome

- 6-week pivot completed in 4 weeks.
- No regressions: the rule set + governance check guarantees that no copy slips back into old positioning.
- Full traceability: every rewritten artifact has a `CreativeAiRunLink` to the rewrite run plus a new `governanceCheckRunId`.

---

# 4. Functional Walkthrough — Module by Module

This section explains *what* each module does in business terms, *why* a user would reach for it, *how* the pieces fit together, and *what could go wrong*. It assumes you read Section 3.

## 4.1 Tenancy: Organizations, Workspaces & People

### What it is

The tenancy layer is the multi-tenant skeleton. Everything else hangs off it.

- **Organization** = a customer (a brand, a holding company, an agency). Owns its members, billing posture, OAuth credentials, and brand identity.
- **Workspace** = an operating unit *inside* an organization. Typically per market, per brand line, per product, or per region. Holds its own campaigns, creatives, research, integration mappings, brand overrides, AI safety policy, and governance artifacts.
- **Membership** = the join row that says "this user has *this role* in *this org and optionally this workspace*."
- **Team** = an organizational grouping for collaboration / notifications. Does not by itself confer permissions.
- **Invite** = a token-based onboarding flow that creates a user + membership.

### Why this structure

The same SaaS tool is consumed differently by:

- **A solo brand** that wants one workspace and four people.
- **A multi-brand consumer goods company** that wants 12 workspaces (one per brand line) under one organization.
- **An agency** that has its own org plus invites into 8 client orgs.

The two-level org/workspace structure handles all three without forcing one model.

### Roles and what they actually mean

| Role | Plain-English meaning |
|---|---|
| **ORG_ADMIN** | "I run this account. I can do anything." Used by the buyer, the head of marketing, the platform owner. |
| **WORKSPACE_ADMIN** | "I run this market/brand line. I can manage everything inside this workspace including who is in it, but I can't create new workspaces or touch billing." |
| **EDITOR** | "I make things. I create campaigns, write copy, run AI, build research. I cannot manage people or approve high-risk changes." |
| **APPROVER** | "I am the gate. I review what others made and decide what ships. I don't make things myself." Used by compliance, legal, brand. |
| **ANALYST** | "I read and analyze. I can read campaigns and reports, build research, run AI summarizers. I cannot edit live ads or approve things." |
| **VIEWER** | "I'm a stakeholder. I look at dashboards." |

### A subtle point — org-level vs. workspace-level membership

A `Membership` row with `workspace = NULL` is an **organization-level** role. An ORG_ADMIN with NULL workspace is an admin of *every* workspace in that org. A WORKSPACE_ADMIN with NULL workspace is a workspace admin of *every* workspace in that org. This is how Marcus's CloudReach configuration grants org-wide access in Crimson Cosmetics with one row instead of one per workspace.

A workspace-scoped membership applies only to that one workspace.

### Invitations done right

The invite flow does three things that matter:

1. The raw token is shown **once**, in the email. The system stores only its BCrypt hash. Lose the email and the admin must resend (a new token is generated; the old one becomes invalid).
2. Default 7-day TTL. After expiry the invite is dead even if the URL is intact.
3. Acceptance creates the user and the membership atomically. If the email already maps to a user, the existing user's password is **reset** to the one supplied during acceptance. This is intentional for self-serve recovery flows; if your security model dislikes it, accept with a different email.

### Audit log

Every CREATE / UPDATE / DELETE / ARCHIVE / APPROVE / ACCEPT / REVOKE action across **every module** writes a row to the audit log with:

- `actorUserId` — who did it (extracted from the JWT principal).
- `action` — what they did.
- `entityType` and `entityId` — what they did it to.
- `beforeJson` and `afterJson` — full state snapshots so you can see exactly what changed.
- `createdAt` — when, in UTC.

The audit log is **append-only**. There is no UI or API to delete an audit row. This is what makes it usable as a compliance artifact.

### Where it shows up in the UI

- Sidebar workspace selector — switching workspaces re-scopes everything else.
- `/admin/orgs`, `/admin/workspaces`, `/admin/members`, `/admin/teams`, `/admin/invites`, `/admin/audit`.

### What can go wrong

- **You created a workspace with a duplicate name** → 409 Conflict; names are unique per org.
- **You revoked an invite that was already accepted** → no effect; only PENDING invites can be revoked.
- **A user has multiple memberships** → all roles apply additively. The most permissive wins on every check.

## 4.2 Integrations Hub: Connecting the Outside World

### What it is

The Integrations Hub is the bridge between the suite and 28+ external platforms across nine categories: Ads, Social Publishing, Analytics, Commerce, CRM, Messaging, Assets/DAMs, Data Warehouses, CDPs, plus generic Custom and LLM providers.

It is responsible for:

1. **Catalog** — what platforms are supported and how they authenticate.
2. **Account connection** — OAuth flows or API-key entry, secret storage.
3. **Resource discovery** — listing the things inside a connected account (ad accounts, pages, properties, drives).
4. **Mapping** — linking external resources to workspaces, and external campaigns to internal campaigns.
5. **Sync jobs** — batch pulling of campaign metrics.
6. **Webhooks** — real-time inbound events from platforms that support them.
7. **Health diagnostics** — am I still connected? Is data flowing?

### Why it is the most critical module

Without integrations, almost no business value can flow:

- Campaigns can be authored but not bought against external platforms.
- Creatives have nowhere to deploy.
- Reports stay empty.
- AI cannot be powered by external models.

Customers typically start their evaluation here, and customer success teams typically debug here.

### The mental model

```
Platform (e.g. Meta)                  Org-level
   ↓                                  ↓
IntegrationProvider                   IntegrationAccount  (connected once per org)
                                          ↓
                                      IntegrationResource  (e.g. specific ad account)
                                          ↓
                                      WorkspaceIntegration  (mapped to workspace)
                                          ↓
                                      PlatformEntityMapping  (internal campaign ↔ external campaign)
                                          ↓
                                      CampaignReportData     (metrics flow here)
```

### How OAuth feels for the user

Anika clicks "Connect with Meta" in **Providers Catalog**. Behind the scenes:

1. The suite generates a single-use 32-byte random state token (CSRF protection).
2. It builds the auth URL with Meta's `client_id`, the redirect URI, scopes, and the state.
3. The browser opens a popup to facebook.com.
4. Anika authorizes.
5. Meta redirects to the suite's callback URL with `code` and `state`.
6. The suite verifies the state token (must exist, not expired, not already used), exchanges the code for tokens, encrypts them in the secret store, creates the `IntegrationAccount` with status CONNECTED, and redirects to the Accounts page.

The state token is single-use and has a 10-minute TTL. If Anika steps away for 15 minutes mid-flow, the callback fails with an explicit "Invalid or expired OAuth state" error.

### How API-key connections feel

For ChatGPT Ads or Klaviyo, Dev opens **New Account**, picks the provider, and pastes the API key. The suite encrypts the key with AES-256-GCM and stores only an opaque reference on the account row. The API key is never returned in any API response from the suite — even GET on the account returns `{ secretRef: "platform-…" }` and never the key itself.

### Resource discovery

After connecting an account, Anika clicks **Discover Resources**. The connector calls the platform's "list my ad accounts / pages / properties" API. Each returned item is upserted as an `IntegrationResource` with type AD_ACCOUNT, PAGE, PIXEL, PROPERTY, etc. and status ENABLED. Disabled resources can be hidden.

### Workspace mappings

She then maps a specific Meta ad account to her **India Market** workspace via **Workspace Mappings**. She can mark it as the default Meta integration for that workspace. A workspace can have one default integration per platform; the rest are non-default but still usable.

### Entity mappings — the magic moment

Once an account is connected and resources are mapped, the suite is already pulling external campaigns into `CampaignReportData` (with `internalCampaignId = NULL`). On the **Campaign Reports** page, every external campaign is visible. When Anika clicks **Quick Map** to bind an external campaign to an internal campaign, the system runs a SQL backfill: every existing report row with that external campaign ID is retroactively populated with `internalCampaignId`. From that moment on, the **Synced Metrics** tab on her campaign detail page lights up, including historical data that pre-dates the mapping.

### Sync jobs

Sync jobs are the batch path. They are appropriate when:

- The platform doesn't support webhooks (Google Ads in many configurations, GA4, TikTok).
- You need a backfill (catching up after a webhook outage).
- You want to be belt-and-suspenders even where webhooks exist.

A sync job moves QUEUED → RUNNING → SUCCESS / FAILED / PARTIAL. PARTIAL means "I pulled some rows but had errors on others; check the stats JSON." Sync jobs always update the account's `lastSyncAt` so the health dashboard can see freshness.

### Webhooks

Webhooks are the real-time path. They are critical when latency matters — an ad pause on Meta needs to surface in the suite within seconds for an active operator.

The webhook receive pipeline:

1. Inbound POST with the platform's payload and signature header.
2. Find the account this webhook belongs to (matching by platform and active webhook config).
3. Verify the signature. Meta uses HMAC-SHA256 in `X-Hub-Signature-256`. Google uses a JWT bearer token. **A failed signature is treated as hostile**: the webhook is marked ERROR, a FAILED `WebhookDelivery` row is logged, and **no data is persisted**.
4. Parse the payload via the connector.
5. Upsert each row into `campaign_report_data`. Mappings auto-resolve.
6. Update timestamps. Log a SUCCESS or PARTIAL `WebhookDelivery`.

Webhooks can be paused (status INACTIVE) without deletion. Inactive webhooks silently ignore inbound events.

### Secret rotation without losing data

Dev needs to rotate Meta's webhook signing secret. He clicks **Rotate Secret**. The suite:

1. Generates a fresh 32-byte secret prefixed `whsec_`.
2. Stores it under a new secret reference.
3. Deletes the old secret.
4. Updates the webhook record's `secretRef`.
5. Returns the new value (the only time it is exposed) so Dev can paste it into the Meta dashboard.

He must update Meta's dashboard quickly — incoming events using the old secret will fail signature verification until he does. The sync job can backfill any gap.

### Health diagnostics — the operations dashboard

The Health page summarizes every account: **HEALTHY** / **WARNING** / **CRITICAL** / **DISCONNECTED**.

A WARNING is shown when any of these is true:

- Never validated since connection.
- Last validated more than 7 days ago.
- Never synced.
- Last synced more than 24 hours ago.
- One or more sync jobs failed.
- Webhook is in ERROR state.

CRITICAL is the harder failure: account in ERROR or REVOKED. DISCONNECTED is the soft state of "we let it expire."

### The OAuth admin escape hatch

OAuth client credentials (client_id / client_secret) are configured **per platform per organization**. They ship `enabled = false` with placeholder values. An ORG_ADMIN must paste the real credentials into `/admin/oauth-configs` and flip enabled to `true` before users can connect that platform. This is by design: a platform on the catalog is *available* but not necessarily *enabled*.

### What can go wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| "Cannot connect to Meta" in Providers | OAuth config disabled or missing secret | ORG_ADMIN edits `/admin/oauth-configs/META` |
| Synced metrics tab is empty | No entity mapping | Use Quick Map on Campaign Reports |
| Webhook stopped flowing | Signature mismatch | Rotate secret on both sides; run a sync job to backfill |
| Sync job fails repeatedly | Token revoked on platform side | Reconnect the account; tokens get re-issued |
| One ad account missing in resource list | Discovery permission scope issue | Reconnect with broader scopes |

## 4.3 Conversation Campaigns: Where Spend Happens

### What it is

The Campaigns module is where actual paid-media activity is planned, organized, and measured. The "conversation" prefix is intentional: the suite is built for both classic ad surfaces and the emerging conversational ad surfaces (ChatGPT Ads, Perplexity Ads), but the same campaign object covers all of them.

### The mental model

```
ConversationCampaign
   ├── workspace (where it lives)
   ├── integrationAccount (which platform it's running on)
   ├── objective (AWARENESS / CONSIDERATION / LEAD / PURCHASE / RETENTION)
   ├── budgets (daily and/or lifetime)
   ├── start/end dates
   ├── pacing mode (STANDARD / ACCELERATED)
   ├── status (DRAFT → ACTIVE → PAUSED → ACTIVE → ARCHIVED)
   │
   ├── many TargetSet rows (intent + topics + geo + negatives)
   │
   ├── many SponsoredUnit rows
   │     ├── type (SPONSORED_PLACEMENT or SPONSORED_FOLLOWUP_QUESTION)
   │     ├── headline + body + CTA + landing URL + disclaimer
   │     ├── optional copyArtifactId → CreativeCopyArtifact
   │     ├── optional assetId → CreativeAsset
   │     └── status (DRAFT / APPROVED / REJECTED)
   │
   └── (read-only) synced metrics from CampaignReportData via mapping
```

### Status lifecycle and what each transition means

- **DRAFT**: Campaign exists but is not running. Anyone with EDITOR rights can create.
- **ACTIVE**: Campaign is running. Sync jobs and webhooks may be flowing data.
- **PAUSED**: Campaign is temporarily off. Status can be toggled back.
- **ARCHIVED**: Terminal state. The campaign is preserved for history but cannot be re-activated.

The suite enforces transitions: you cannot go directly from PAUSED to ARCHIVED without an explicit archive action; you cannot pause something that is DRAFT. These guards prevent illegal state and keep the lifecycle audit-friendly.

### How sponsored units anchor creatives to campaigns

A `SponsoredUnit` is the actual ad unit that runs on a platform. It carries the headline, body, CTA, landing URL, and disclaimer that the user sees. Two important columns are nullable:

- `copyArtifactId` → links the unit's text to a `CreativeCopyArtifact` in the Creative Studio. The unit's display text is rendered from the artifact at delivery time.
- `assetId` → links the unit's visual to a `CreativeAsset`.

These are **not foreign keys**. The intent is loose coupling: a unit may carry inline content alone, or reference creative entities, or both. If a referenced creative is archived, the unit still has its inline copy.

### Targeting

A campaign can have multiple `TargetSet` rows, each describing one segment with:

- `intentType` — the high-level conversational intent (LEARN / COMPARE / DECIDE / BUY / SUPPORT). Useful for AI-surface bidding logic where the platform exposes intent signals.
- `topicsJson` — flexible JSONB array of topics, keywords, or vendor-specific shapes.
- `geoJson` — geographic targeting (countries, regions, lat-lng radius).
- `negativeTopicsJson` — exclusions.

Multiple sets allow segment-level testing (e.g. "students in Mumbai who are LEARNing about budgeting" vs. "professionals in Bengaluru who are DECIDING").

### Approval workflow — the polymorphic gate

The same `ApprovalWorkflow` machine is used by sponsored units, content templates, and AI proposals. The state machine is:

```
DRAFT  ─submit→  IN_REVIEW  ─approve→  APPROVED
                     │
                     └─reject→  REJECTED
```

`POST /approvals/submit` creates the workflow. Any APPROVER, WORKSPACE_ADMIN, or ORG_ADMIN can approve or reject. The submitter cannot self-approve.

For sponsored units, the unit's `status` mirrors the workflow: APPROVED unit means the workflow is APPROVED, REJECTED means rejected, otherwise DRAFT.

### Synced metrics as a first-class campaign tab

Once an entity mapping links an internal campaign to an external one, the campaign detail page surfaces a **Synced Metrics** tab that is read-only and continuously updated. It shows summary cards (total spend, impressions, clicks, conversions) and a per-day breakdown. The empty state guides the user to Quick Map if no data is flowing yet.

This tab uses the *same* `CampaignReportData` rows that the Campaign Reports page uses; the difference is filtering by `internalCampaignId`.

### What can go wrong

- **An EDITOR cannot pause an ACTIVE campaign.** They can — pause/activate/archive require EDITOR or above. What an EDITOR cannot do is approve a sponsored unit they themselves submitted.
- **The campaign is ACTIVE but Synced Metrics is empty.** The mapping is missing. Quick-map from Campaign Reports.
- **Sponsored units stay in DRAFT.** The submitter forgot to submit; or the workflow is IN_REVIEW and waiting for an approver.
- **The status of an internal campaign keeps flipping unexpectedly.** The external platform is reporting status changes and the system propagates them. This is a feature, not a bug. To stop, delete the entity mapping.

## 4.4 Measurement: What Actually Performed

### What it is and why it's separate

Measurement carries first-party event data — impressions, clicks, landing visits, and conversions captured directly by the customer's own properties or pipelines. It is intentionally separate from the platform-reported metrics in `CampaignReportData`.

There are two streams:

| Stream | Source | Use case |
|---|---|---|
| **AdEvents** (this module) | Customer's own server / tag pipeline | Ground-truth conversion tracking, owned-property metrics |
| **CampaignReportData** (Integrations) | Sync jobs and webhooks from ad platforms | Platform's view of spend / impressions / clicks |

Why the separation? Because the two streams **do not always agree**, and they shouldn't be silently joined. Meta's reported conversion count is not the same as your own server-side conversion log. Reconciling them is an analyst workflow, not an auto-merge. Both are preserved.

### Event types

- `IMPRESSION` — the ad was rendered.
- `CLICK` — the user clicked.
- `LANDING_VISIT` — the user landed on the destination page.
- `CONVERSION` — the user did the thing you cared about (purchase, signup, lead form).

### Privacy posture

The event row carries `sessionId`, `userAgent`, and `ipHash` — never a raw IP. `metaJson` is a free-form JSONB column where the customer may store additional first-party attributes (revenue, product SKU, custom dimensions). The customer is responsible for not storing sensitive PII there; the suite does not validate the contents.

### What you can do with it

`GET /api/v1/events/summary` is a daily aggregation grouped by campaign and event type. Typical use:

- Daily funnel: count of IMPRESSION → CLICK → LANDING_VISIT → CONVERSION per campaign.
- Weekday-vs-weekend pattern.
- Comparing first-party CONVERSION count against the platform-reported `conversions` field on `CampaignReportData`.

The frontend's **Analytics** screen at `/events` renders this with date filters.

### What it is not

It is not a full BI tool. It does not do user-level cohorting, retention curves, or attribution modeling out of the box. It does provide the raw ingestion + daily summary that downstream BI tools can query.

## 4.5 Creative Studio: Producing Ads at Scale

### What problem it solves

Creative production is a bottleneck for every marketing organization. The team needs many variants — headline A/B/C/D, three platforms each, two languages, four audiences — and traditional tools fragment this across a DAM, a Google Doc, a copy.ai prompt, a Figma file, and a brand-review email thread.

The Creative Studio collapses this into one workspace-scoped system: **assets + structured copy + variants + AI generation + governance + provenance + folders**, all linked.

### The mental model

```
CreativeFolder (tree)
   ↑
CreativeAsset (image/video/UGC clip/document/audio)
   ├── CreativeAssetVersion (immutable history)
   ├── CreativeUsage rows (where this asset is used)
   └── CreativeAssetFolderMap (which folders contain it)

CreativeCopyArtifact (structured copy)
   ├── governance_check_run_id (link to compliance verdict)
   ├── ruleSetId (which rules to check against)
   └── disclaimerIds[]

CreativeVariantSet (named bundle)
   └── CreativeVariant rows (links to artifacts/assets, ranked by score)

CreativeLink (any-to-any cross-entity link)
CreativeRenderPreset (per-platform export constraints)
CreativeAiRunLink (AI provenance)
```

### Asset lifecycle

**DRAFT → ACTIVE → ARCHIVED**

- DRAFT: just registered, not yet vetted or approved for use.
- ACTIVE: usable; campaigns can reference it.
- ARCHIVED: read-only; campaigns retaining the reference still work, but new units shouldn't pick this asset.

`CreativeAssetVersion` rows preserve the full history. Version 2 of a video doesn't overwrite version 1 — both remain. This matters for audit ("which version of the holiday video actually ran on Black Friday?").

### Copy artifact lifecycle

**DRAFT → IN_REVIEW → APPROVED / REJECTED → ARCHIVED**

Reviewing copy uses the same `ApprovalWorkflow` machinery as sponsored units and templates.

### Copy artifact types — the universe of structured copy

| Type | What it is |
|---|---|
| AD_COPY | Headline + body + CTA |
| HOOK_LIST | Brainstorm of opening hooks |
| ANGLE_LIST | Strategic angles for an offer |
| CTA_LIST | Call-to-action variants |
| SOCIAL_CAPTION | Caption for organic/social posts |
| VIDEO_SCRIPT | Scene-by-scene script |
| STORYBOARD | Visual storyboard outline |
| UGC_BRIEF | Creator-facing brief and guidelines |
| LANDING_COPY | Post-click landing page text |
| EMAIL_COPY | Email body |
| SMS_COPY | Short message text |

Each type carries `contentText` (human-readable) and `contentJson` (structured). Generators populate both.

### The five AI generation flows — detailed walkthrough

#### Flow 1: Generate ad copy variants

User intent: "Give me 8 ad copy variants for our spring sale, in en-IN, optimized for Meta and Google Ads, drawing on our 'urban Indian mother' persona."

What happens:

1. The frontend builds a request with the chosen brand profile, persona, insights, keyword cluster, platform list, language, tone, and rule set.
2. The system calls the approved prompt template `creative.generate_ad_copy_variants` through `AiFacade`.
3. Output is parsed JSON listing N variants, each with structured copy.
4. Each variant becomes a `CreativeCopyArtifact` (DRAFT, type AD_COPY by default but settable).
5. A `CreativeVariantSet` is created bundling them, with `strategy = AI_GENERATED`.
6. Per-variant `CreativeVariant` rows record the order and link to artifacts.
7. **If a rule set was provided**, the governance engine runs on each artifact's content; the run id is stored on the artifact.
8. A `CreativeAiRunLink` is written per artifact, referencing the AI run, the input context JSON, and any citations the model produced.

The team gets back: a list of artifact IDs, the variant set ID, governance statuses (PASS/WARN/FAIL per variant), the AI run ID for full provenance, and the AI link IDs.

#### Flow 2: Hooks, angles, CTAs

User intent: "Give me brainstorm fuel — 10 hooks, 10 angles, 10 CTAs for this product."

What happens:

1. The prompt `creative.generate_hooks_angles_ctas` is called.
2. The output JSON has three arrays.
3. **Three** copy artifacts are created — one HOOK_LIST, one ANGLE_LIST, one CTA_LIST — each with the items joined by newlines in `contentText` and the full JSON in `contentJson`.
4. All three share the same AI prompt run; three `CreativeAiRunLink` rows tie them to the same run.

This is the daily brainstorming flow. Editors keep the lists they like and discard the rest.

#### Flow 3: Video script

User intent: "Write a 30-second video script for TikTok pitching our face cream to skincare-curious 18-25 year olds."

What happens:

1. `creative.generate_video_script` is called with the product, persona, duration, platform.
2. One `CreativeCopyArtifact` of type VIDEO_SCRIPT is created.
3. Name auto-formatted: `"<product> — Video script"`.
4. `contentText` carries the script; `contentJson` carries the full structured output (scenes, on-screen text, B-roll suggestions).

#### Flow 4: UGC brief

User intent: "Generate a creator brief for a UGC partner reviewing our protein bar."

What happens:

1. `creative.generate_ugc_brief` produces a brief.
2. One `CreativeCopyArtifact` of type UGC_BRIEF is created.
3. The brief includes deliverables, talking points, do's and don'ts.

#### Flow 5: Asset metadata enrichment — different from the others

User intent: "I uploaded a video. Use AI to suggest tags, description, and quality warnings."

What happens — and **this flow is intentionally different**:

1. The system calls `creative.enrich_asset_metadata`.
2. The AI proposes new metadata.
3. **No metadata is auto-applied.** Instead, the system creates an `AiActionProposal` with `actionType = ENRICH_ASSET_METADATA` and the proposed payload.
4. A human (admin or approver) reviews the proposal in the **Action Proposals** queue.
5. If approved and executed, the metadata change is applied.

This is the human-in-the-loop principle at its purest. AI suggests; humans approve; system executes. There is no path where AI silently mutates a creative asset.

### Why the AI-run links matter

`CreativeAiRunLink` rows are not mere logging. They are the audit trail that lets a reviewer six months later answer questions like:

- "Which of our headlines were AI-generated?"
- "What inputs did the AI have when it produced this UGC brief?"
- "Show me every artifact this prompt template ever produced."

`GET /workspaces/{ws}/creative/ai/links?producedEntityType=COPY_ARTIFACT&producedEntityId=<uuid>` answers all of these.

### Tools the AI agents can call when shopping for creatives

The Creative Studio registers five **read-only** tools the AI conversation/workflow agents can call:

- `creative.searchAssets` — find assets by name/type.
- `creative.getAsset` — fetch one asset.
- `creative.searchCopyArtifacts` — find copy by name/type/status.
- `creative.getCopyArtifact` — fetch one artifact.
- `creative.listUsageForCreative` — "where is this used?"

Notice all are READ_ONLY. Agents cannot mutate the Creative Studio directly; mutations go through proposals or explicit user actions.

### Folders & render presets

Folders are a tree (`parentFolderId`); the asset-folder relationship is many-to-many (`creative_asset_folder_map`). A team can put the same logo in /Brand/Logos and /Templates/Hero Templates without copying.

Render presets capture export constraints per platform (Meta Story 1080×1920, max 60s) so the export tooling knows what to produce.

### What can go wrong

- **AI generates a variant that fails governance.** It still creates the artifact (DRAFT) so the user can see it; the governance run id flags FAIL. The user can edit and re-check.
- **AI proposes asset metadata enrichment but the user does not approve.** Proposal sits in PROPOSED forever (or REJECTED). The asset is unchanged.
- **Copy artifact references a deleted template.** No FK constraint; the `templateId` is stored loosely. UI will show "(referenced template not found)."

## 4.6 Brand & Content Governance: Saying No, Faster

### Why this module exists

Most brand and compliance failures don't happen because someone deliberately violated a rule. They happen because:

- The brand book is a 40-page PDF that nobody opens during creative work.
- The rule was applied at the wrong moment — at final review, not at the moment of writing.
- AI-generated content amplifies the volume far beyond what a manual review pipeline can handle.

The Governance module makes brand and compliance **machine-enforced at creation time** rather than at approval time.

### The mental model

```
OrgBrandProfile  (org-level baseline)
       ↓ inherited
WorkspaceBrandProfile  (workspace overrides)
       ↓ merged
EffectiveBrandProfile  (what AI prompts and human authors actually see)

BrandRuleSet  (a named bundle of rules)
       ↓ contains many
BrandRule  (banned phrase, required disclaimer, claim restriction, etc.)
       ↓ runs against
content payload  (copy artifact text/json, sponsored unit text, etc.)
       ↓ produces
GovernanceCheckRun  (status PASS / WARN / FAIL with itemized findings)

Disclaimer  +  DisclaimerLocalization  (multilingual legal text)
ContentTemplate  (reusable governed copy with version chain)
PlatformConstraint  (read-only seeded platform limits like X 280 chars)
```

### Brand profile inheritance — one principle, two markets

The `OrgBrandProfile` carries display name, primary/secondary/accent colors, fonts, voice tone (one of PROFESSIONAL / FRIENDLY / PREMIUM / TECHNICAL / PLAYFUL / MINIMAL / CUSTOM), do-list/don't-list text, default language, and supported languages.

Each workspace can have a `WorkspaceBrandProfile` whose `overridesJson` selectively overrides any of these fields.

When any module asks "what is the effective brand profile for workspace W?", the system performs a deterministic merge: org base + workspace overrides; overrides win. Examples:

- Org default voiceTone = FRIENDLY. India workspace overridesJson = `{"voiceTone":"PROFESSIONAL"}`. Effective: PROFESSIONAL.
- Org default supportedLanguages = `["en"]`. India workspace overridesJson = `{"supportedLanguages":["en-IN","hi"]}`. Effective: `["en-IN","hi"]`.
- Org default primaryColor = `#E8794A`. No override. Effective: `#E8794A`.

This pattern lets a multi-market brand define its identity once and adapt locally without duplication.

### The deterministic rule engine — why "deterministic" matters

The governance check engine is **non-AI**. The same input always produces the same output. That is the design choice that makes it usable as a compliance artifact:

- A run on October 1 producing PASS is reproducible on October 31 with the same content + rule set version.
- An auditor can re-run a check independently and verify.
- Adding AI to the engine would compromise this property.

The engine evaluates each rule by type:

| Rule type | What it checks |
|---|---|
| BANNED_PHRASE | Content does not contain forbidden text (literal contains or regex) |
| REQUIRED_DISCLAIMER | Content references a specific disclaimer key |
| CLAIM_RESTRICTION | Content does not make a restricted claim (regex pattern) |
| PLATFORM_POLICY | Content respects platform-specific rules |
| TARGETING_RESTRICTION | Targeting fields satisfy domain rules |
| VISUAL_RESTRICTION | Visual asset metadata respects limits |
| LINK_RESTRICTION | URLs respect domain allowlists |
| CTA_RESTRICTION | CTA value is in approved list |
| LOCALIZATION_RULE | Localization keys exist for required languages |
| DATA_PRIVACY_RULE | Content does not leak privacy-sensitive identifiers |

Each rule has a severity:

- **INFO** — informational, not blocking.
- **WARN** — author should reconsider but can ship.
- **BLOCK** — content is not allowed to ship as-is.

### Severity aggregation — the simple rule of thumb

After every rule fires, findings are aggregated:

- Any BLOCK finding ⇒ overall status **FAIL**.
- Any WARN finding (no BLOCKs) ⇒ overall status **WARN**.
- Only INFO findings (or none) ⇒ overall status **PASS**.

A `GovernanceCheckRun` row records the entityType, entityId, ruleSetId, status, and a JSONB `findingsJson` array detailing every finding. This row's UUID is what gets stored on `CreativeCopyArtifact.governanceCheckRunId` and is queryable forever.

### Disclaimers and localizations

A `Disclaimer` has a stable workspace- or org-unique `key` (e.g. `SEBI_MUTUAL_FUND_RISK`, `FDA_MEDICAL_CLAIM`, `RETURNS_POLICY`). The `defaultText` is in the org's default language. `DisclaimerLocalization` rows attach translations keyed by language code.

Why a `key` and not a UUID reference for templates? Stability. A workspace can swap localizations and retitle the disclaimer; downstream content keeps working as long as the key is preserved.

### Content templates — the governed reusable

`ContentTemplate` is reusable copy with a lifecycle:

```
DRAFT  ─submit→  IN_REVIEW  ─approve→  APPROVED  ─new-version→  (clone DRAFT v2, parentTemplateId chain)
                     │
                     └─reject→  REJECTED

Any state  ─archive→  ARCHIVED
```

Two important behaviors:

1. Templates can attach a default rule set and default disclaimer IDs. Any copy generated from this template carries those forward unless explicitly removed.
2. New versions clone the previous version with `parentTemplateId` set. The whole evolution chain is queryable. Older campaigns referencing v1 keep working.

`POST /orgs/{orgId}/templates/{id}/record-usage` is called by other modules when a template is used. This builds a usage history that informs decisions like "is this template still actively used? Can we deprecate version 1?"

### AI rewrite — the assistive escape hatch

`POST /workspaces/{ws}/governance/ai/rewrite` runs an AI prompt that takes:

- The content draft.
- The effective brand profile.
- The relevant rule set.

It returns a rewritten version aimed at fixing WARN/BLOCK findings while preserving meaning. **The output is then re-checked through the same deterministic engine before being saved.** This means the AI cannot launder a banned phrase by rewording it cleverly; if the rewritten version still fails, it gets rejected.

### Platform constraints — read-only seeded reference

Seeded constraints include things like:

- X (Twitter): TEXT_LENGTH 280 chars.
- Meta: TEXT_LENGTH recommended 125, max 63206; HASHTAG_LIMIT.
- LinkedIn: TEXT_LENGTH 3000.
- Google Ads: headline 30 chars, description 90 chars.
- TikTok: caption 2200 chars.
- Pinterest: title 100, description 500.

These are not editable. They are the platform's hard rules. The frontend uses them to show character counters and limit warnings; the rule engine uses them to enforce on save.

### What can go wrong

- **A regex in a rule is invalid.** The rule create call rejects with a clear error from `validatePattern()`. No rule with bad regex is ever stored.
- **A workspace overrides the brand voice but the AI prompt still uses org voice.** The prompt context always uses `getEffectiveProfile(workspaceId)`. If you see this, something is wrong.
- **A required disclaimer rule fires but the localization is missing for the target language.** The check fails; the author either adds the localization or relaxes the rule.
- **An AI rewrite produces something that still fails the rule.** It is not saved. The author sees the failure and edits manually.

## 4.7 Research & Intelligence: Knowing the Market

### Why this module exists

Marketing decisions are intuition + evidence. The intuition is the marketer's job. The evidence — what competitors are doing, what audiences are saying, what keywords are trending — is research. Today this work is fragmented: screenshots in Slack, links in Notion, PDFs in Drive, claims in heads.

The Research module is built around one principle: **every claim that ships should be traceable to primary material**. AI does heavy lifting, but it cannot be the source of truth. Snapshots are.

### The mental model

```
Competitor (named entity)
   └── CompetitorExternalHandle (twitter, linkedin, etc.)

ResearchSource (URL, file, manual note, integration resource)
   └── SourceSnapshot (point-in-time capture: WEB_PAGE, AD_LIBRARY_ENTRY, SOCIAL_POST, …)
        └── (raw text, raw JSON, sentiment, summary text, tags)

Insight (DRAFT or PUBLISHED)
   ├── category (COMPETITOR / TREND / AUDIENCE / KEYWORD / CREATIVE)
   ├── insightType (one of 18 specifics)
   ├── confidence (LOW / MEDIUM / HIGH)
   └── many InsightEvidence rows
        └── each tied to a snapshot (with citationText, citationUrl)

KeywordCluster (named group of keywords with intent + metrics)
PersonaResearch (audience persona with pains/objections/motivations/channels)

Watchlist (saved monitoring config; type = COMPETITOR/TOPIC/KEYWORD/CREATOR/BRAND_TERM)
ResearchJob (async job record with QUEUED/RUNNING/SUCCESS/FAILED status)
ResearchDigestReport (stored output of weekly digest)

ResearchLink (cross-module link; e.g. insight → campaign)
ResearchAiRunLink (provenance for AI-produced research artifacts)
```

### Source types and snapshot types — what they each mean

A `ResearchSource` describes **where** information came from:

| Source type | Use case |
|---|---|
| URL | Web URL the team monitors (pricing page, blog, etc.) |
| FILE_UPLOAD | Document or asset uploaded |
| MANUAL | Hand-entered note (no automated fetch) |
| INTEGRATION_RESOURCE | Tied to an `IntegrationAccount` / `IntegrationResource` (e.g. a synced Drive folder) |
| NOTE | Free-form note |

A `SourceSnapshot` describes **what** was captured at a moment in time:

| Snapshot type | What it captures |
|---|---|
| WEB_PAGE | Scraped or pasted page content |
| AD_LIBRARY_ENTRY | An ad transparency entry |
| SOCIAL_POST | A social post |
| SEARCH_RESULT | A SERP capture |
| KEYWORD_DATA | SEO/keyword tool export |
| REVIEW | Reviews or ratings text |
| TRANSCRIPT | Call or interview transcript |
| PDF | PDF text |
| IMAGE | Image with OCR-extracted context |
| VIDEO_METADATA | Video title/description/transcript snippets |
| CUSTOM | Anything that doesn't fit |

Crucially, the source is *where it came from*; the snapshot is *what it looks like*. A single source can have many snapshots over time, capturing change.

### The provenance chain that makes published claims trustworthy

```
ResearchSource → SourceSnapshot(s) → InsightEvidence → Insight (DRAFT → PUBLISHED)
```

Three rules enforce trust:

1. **Cross-workspace isolation**: a snapshot can only be referenced by entities in its own workspace.
2. **Competitor coherence**: when AI extracts competitor insights, every input snapshot's source must already reference that competitor.
3. **Citation validation**: AI output JSON is parsed for `citations[]` or `insights[].evidence[]`. Each `snapshotId` must be a valid UUID in the allowed input set. **Hallucinated IDs are silently dropped — no evidence row is ever created from an invalid ID.**

This is the suite's hardest line of defense against hallucinated AI claims.

### Insight publish — the strictest gate in the system

`POST /research/insights/{id}/publish` enforces two gates:

1. The actor has `requireResearchPublish` — i.e. ORG_ADMIN or WORKSPACE_ADMIN. EDITOR and ANALYST cannot publish.
2. The insight has at least one `InsightEvidence` row.

Both gates exist because **published insights become institutional knowledge**. They appear in weekly digests, they get linked to campaigns via `ResearchLink`, they inform creative briefs. An unsubstantiated published insight pollutes downstream decisions for months.

The "evidence required" rule means an insight must point to at least one snapshot — primary material the team actually saw. Without this rule, an admin could publish "Acme is going out of business" with zero proof and have it cited later.

### The five AI flows in research

| Flow | Endpoint | What it produces |
|---|---|---|
| Summarize a snapshot | `POST /research/ai/snapshots/{id}/summarize` | Updates the snapshot with a summary, key points, entities, sentiment. Writes a `ResearchAiRunLink(SNAPSHOT_SUMMARY)`. |
| Extract competitor insights | `POST /research/ai/competitors/{id}/extract` | Creates DRAFT insights with evidence rows pointing to validated input snapshots. |
| Cluster keywords | `POST /research/ai/keywords/cluster` | Creates `KeywordCluster` rows from a keyword list or a snapshot. |
| Draft a persona | `POST /research/ai/personas/draft` | Creates a `PersonaResearch` row with structured pains/objections/motivations/channels. |
| Run weekly digest | `POST /research/ai/digest/run` | Runs the `research.weekly_digest` workflow: lists recent snapshots and *published* insights, loads the brand profile, calls the narrative prompt, stores a `ResearchDigestReport`. |

The weekly digest is a workflow, not a single prompt — it chains read-only tool calls (`research.listRecentSnapshots`, `research.listRecentInsights`, `governance.getEffectiveBrandProfile`) with a final narrative LLM step. This matters because it shows the AI Platform's workflow capability in a real customer flow.

### Watchlists and refresh jobs

A `Watchlist` saves a monitoring intent: "watch competitor Acme weekly", "watch keyword 'enterprise pricing' daily." Refreshing a watchlist creates a `ResearchJob(REFRESH_WATCHLIST)` for observability. Long-running operations (ingestion, AI extraction, weekly digest) all create `ResearchJob` rows, so the team can see what's queued and what failed.

### Cross-module links

`ResearchLink` is the formal "this insight informs that campaign" connection. Supported types include:

- INSIGHT → CAMPAIGN (this insight is why we built this campaign)
- PERSONA → TEMPLATE (this template targets this persona)
- INSIGHT → BRAND_ASSET (this insight informs how we use this asset)
- COMPETITOR → INTEGRATION_ACCOUNT (we monitor this competitor through this integration)

Combined with `ResearchAiRunLink`, the full chain becomes:

```
Source snapshot → AI extract run → Insight → Research link → Campaign
```

Six months later, a team can answer "why does this campaign target this segment?" by walking the chain backward to a snapshot from a date.

### Research AI tools available to chat agents

- `research.listRecentSnapshots` — last 7 days, paginated.
- `research.listRecentInsights` — by status, paginated.
- `research.getSnapshot` — by id.
- `research.getCompetitor` — full profile and handles.

A chat agent in TOOL_ASSISTED mode can answer "What did Acme launch this week?" by calling these tools and summarizing — never by guessing.

### What can go wrong

- **AI extracts an insight and points to a snapshot ID that doesn't exist.** The evidence row is silently dropped. The insight may end up with fewer evidence rows than the model claimed. Inspect the `ResearchAiRunLink` to see what was sent and what was received.
- **An EDITOR tries to publish an insight.** They get 403. Only org/workspace admins can publish.
- **An admin tries to publish an insight with zero evidence.** They get 409 Business error. Add evidence first.
- **Snapshot from workspace A is referenced by an insight in workspace B.** Rejected at validation; cross-workspace isolation is enforced.

## 4.8 The AI Platform: A Trusted Coworker, Not a Cowboy

### Why this module is the most carefully designed one

AI is fundamentally non-deterministic. It can hallucinate. It can leak secrets if you let it. It can make a mutation that someone would have wanted reviewed. The AI Platform treats these failure modes as first-class concerns, not afterthoughts.

The four guardrails are:

1. **Only approved prompt templates run programmatically.** Drafts cannot run.
2. **Workspace safety policy and redaction rules apply to every model call.**
3. **Tool calls are gated by a per-workspace allowed-tool list and per-tool risk levels.**
4. **Any write action surfaces as an action proposal** that requires explicit human approval and execution by separate people.

### The four agent modes

| Mode | What it does | Typical use |
|---|---|---|
| **CHAT_ONLY** | Pure LLM call, no tools, no proposals | Quick questions, brainstorming |
| **TOOL_ASSISTED** | Iterative loop where the model can call read-only tools, results feed back into context | Most chats: "summarize last week's campaigns", "find me ad copies that mention our top persona" |
| **WORKFLOW** | Deterministic multi-step plan executed via `AiWorkflowService` | Weekly digest, scheduled reports |
| **(Programmatic via `AiFacade`)** | Internal services calling `AiFacade.runPrompt(...)` directly | The five Creative AI flows, the five Research AI flows, the AI Rewrite governance flow |

### Prompt template lifecycle

Prompts have lifecycles because they have material consequences:

```
DRAFT  ─submit→  (review)  ─approve→  APPROVED  ─archive→  ARCHIVED
```

`AiFacade.runPrompt` only resolves APPROVED templates. This means an experimental DRAFT prompt cannot be invoked by a service that thinks it's calling production. Every prompt that runs in production has been through review.

Templates carry version numbers. New versions clone with parentTemplateId, preserving history.

### LLM gateway routing — pluggable provider support

The `LlmGatewayRouter` is a thin switch on `LlmProviderType`:

- **OPENAI** → OpenAI Chat Completions API.
- **PERPLEXITY** → Perplexity API.
- **CUSTOM_HTTP** → arbitrary HTTP endpoint (gated by `app.ai.enable-custom-http`).
- **MOCK** → canned responses (used in tests).

A new provider is added by extending the enum, implementing a gateway, registering a router branch, and creating `AiProviderConfig` rows referencing an `IntegrationAccount` whose `secretRef` points to the API key.

Customers can mix providers per workspace. Workspace A might prefer GPT-4 for everything; workspace B might use Perplexity for research summarization (because it cites sources well) and a custom endpoint for creative.

### Provider selection — org config + workspace preferences + model whitelist

When something needs to call an LLM, the resolution is:

1. If the call specifies an explicit `providerConfigId`, use that (after permission check).
2. Else find the workspace's default `AiWorkspaceProviderPreference`.
3. Else fall back to the org's first enabled `AiProviderConfig`.
4. Else throw a Business error.

Additionally, if the workspace preference defines `allowedModels`, requested models outside the whitelist are rejected. This lets a workspace say "we trust gpt-4o and gpt-4-turbo here; nothing else."

### Safety service — three jobs

`AiSafetyService` does three things on every call:

1. **Redaction** of secrets from any string that will be persisted or shown:
   - Workspace regex rules (e.g. `sk-[A-Za-z0-9]{20,}` → `[REDACTED_API_KEY]`).
   - Built-in patterns: API keys, Bearer tokens, AWS keys, password=… style env-var leaks.
2. **Content classification** before sending to the LLM:
   - If the message contains a banned phrase from `policyJson.bannedPhrases`, return BLOCK.
   - If it touches a blocked topic, return BLOCK.
   - The conversation gets a deterministic refusal in place of the LLM response.
3. **Tool permission** when the model wants to call a tool:
   - Is the tool in the workspace's `allowedTools` list?
   - Has this turn already exceeded `maxToolCallsPerTurn`?
   - For HIGH_RISK_WRITE tools, is the user an admin?

The default seeded policy is conservative:

```json
{
  "bannedPhrases": ["password", "api key", "secret key", "access token"],
  "blockedTopics": ["medical diagnosis", "financial advice", "legal counsel"],
  "allowedTools": ["research.*", "governance.*", "integrations.*", "ads.*", "actions.propose"],
  "maxToolCallsPerTurn": 3,
  "requireApprovalForWrites": true
}
```

A healthcare customer would tighten `bannedPhrases`. A financial services customer would add specific regulator-flagged terms. Each workspace can edit independently.

### Action proposals — the most important pattern in the suite

When AI suggests something that would mutate data, the system creates an `AiActionProposal` instead of writing.

```
PROPOSED  ─submit/approve→  APPROVED  ─execute→  EXECUTED
   │                                                 │
   ├─reject→  REJECTED                              └─error→  FAILED
```

Three distinct permission gates:

- **Approve**: APPROVER, WORKSPACE_ADMIN, ORG_ADMIN.
- **Execute**: ORG_ADMIN, WORKSPACE_ADMIN. (Approver alone cannot execute.)
- **Reject**: same as approve.

The separation of approve and execute is intentional. The approver vouches for the *content*; the executor vouches for the *timing*. In regulated environments these can be different people.

The proposal carries:

- `actionType` — what to do (e.g. `UPDATE_SPONSORED_UNIT`, `ENRICH_ASSET_METADATA`).
- `targetEntityType` and `targetEntityId` — what to do it to.
- `payloadJson` — the proposed change.
- `requestedByUser` — who initiated.
- `reviewedByUser` and `reviewNotes` — the approver's verdict.
- `executedAt` — when it actually took effect.

This is the audit chain. A regulator asking "who approved this change?" gets every detail.

### `AiFacade` — the cross-module entry point

Internal services don't talk to AI controllers. They talk to `AiFacade`, which exposes:

- `runPrompt(workspaceId, promptNameOrId, inputJson, context)` — only resolves APPROVED templates. Returns the run.
- `startConversation(workspaceId, title, context)` — creates a conversation in TOOL_ASSISTED mode by default.
- `appendMessage(conversationId, userMessage)` — same path as the chat controller.
- `proposeAction(workspaceId, conversationId, title, actionType, targetEntityType, targetEntityId, payloadJson)` — emit a proposal.

The Research and Creative modules use `AiFacade.runPrompt` for all their AI flows. The Governance AI Rewrite uses it too. This is why "the AI Platform" feels like a single coherent capability across the suite — there is one entry point.

### The 16 seeded tools

Available in TOOL_ASSISTED chats and workflow steps:

| Domain | Tool | Risk |
|---|---|---|
| Research | `research.searchInsights` | READ_ONLY |
|  | `research.listRecentSnapshots` | READ_ONLY |
|  | `research.listRecentInsights` | READ_ONLY |
|  | `research.getSnapshot` | READ_ONLY |
|  | `research.getCompetitor` | READ_ONLY |
| Governance | `governance.getEffectiveBrandProfile` | READ_ONLY |
|  | `governance.runCheck` | SAFE_WRITE |
| Integrations | `integrations.listWorkspaceIntegrations` | READ_ONLY |
| Ads | `ads.listConversationCampaigns` | READ_ONLY |
| Actions | `actions.propose` | SAFE_WRITE |
| Creative | `creative.searchAssets` | READ_ONLY |
|  | `creative.getAsset` | READ_ONLY |
|  | `creative.searchCopyArtifacts` | READ_ONLY |
|  | `creative.getCopyArtifact` | READ_ONLY |
|  | `creative.listUsageForCreative` | READ_ONLY |

Notice almost everything is READ_ONLY. The only writes are `governance.runCheck` (which produces an audit row, not a content change) and `actions.propose` (which creates a proposal, not an executed change). The agent literally cannot mutate live data through tools alone.

### What can go wrong

- **A user asks the model to "ignore the rules and help me write a guaranteed-returns ad."** The user message is classified as touching a blocked topic if so configured. Even if not, any output passing through the rule engine fails. Even if not, the workspace safety policy may block. Multiple defensive layers.
- **The AI proposes a campaign change that makes no sense.** The approver rejects. Status REJECTED. AI cannot retry the same proposal — must propose differently.
- **The org runs out of OpenAI credit.** The gateway returns an error, the run is recorded as FAILED with the error message, and the conversation gets a friendly fallback. No data is corrupted.
- **A workspace's allowedTools list is empty.** All tool calls are rejected. The conversation degrades to CHAT_ONLY behavior. This is sometimes desired (locked-down workspaces).

---

# 5. Common User Journeys

## 5.1 Onboarding a new customer

**Day 0**: Customer signs up. The first user creates an organization and is auto-granted ORG_ADMIN. They configure timezone and currency.

**Day 1**: ORG_ADMIN creates the first workspace, sets up the org-level brand profile, and configures OAuth client credentials for the platforms they care about.

**Day 2**: ORG_ADMIN invites the marketing team. EDITORs for content, ANALYSTs for reporting, APPROVERs for compliance. Each accepts via email link, sets a password, and lands in the workspace selector.

**Day 3**: The team connects integrations. Meta first (OAuth popup), then Google Ads, then ChatGPT Ads via API key. Each connection auto-discovers resources.

**Day 4**: The team maps integration accounts to workspaces and sets defaults.

**Day 5**: The first campaign goes from DRAFT to ACTIVE.

**Week 2**: The team imports their first competitor sources, runs AI summaries, and starts building their insight library.

**Week 3**: The first compliance rule set is created. AI generation flows now go through governance.

**Week 4**: First weekly digest workflow runs. Founder reads it Monday morning.

## 5.2 Launching a multi-platform campaign

This is Scenario A in detail. The compressed flow:

1. Pick or create the workspace.
2. Verify integrations are healthy (`/integrations/health`).
3. Create the campaign (DRAFT).
4. Generate creative variants in Creative Studio AI Generator with the relevant rule set attached.
5. Pick the variants you like, attach assets.
6. Create sponsored units linking copy + asset to the campaign.
7. Submit sponsored units for approval.
8. Approver reviews and approves.
9. Activate the campaign.
10. Map external campaigns to internal in Campaign Reports.
11. Watch synced metrics flow into the campaign detail.

## 5.3 Running a Monday morning intelligence brief

This is Scenario C. The recurring flow:

1. Capture sources/snapshots throughout the week (manual or via watchlist refresh).
2. Run AI summarize on new snapshots.
3. Run AI extract for each tracked competitor.
4. Review, edit, and publish high-confidence insights (admin only; evidence required).
5. On Monday, run the weekly digest workflow.
6. Share the digest output.

## 5.4 Handling a compliance escalation

A regulator publishes new restrictions on a specific phrase Friday afternoon. The team must update Saturday morning.

1. ORG_ADMIN or WORKSPACE_ADMIN edits the relevant `BrandRuleSet` to add a new BANNED_PHRASE rule.
2. Open Governance Checks → re-run checks against existing copy artifacts in batch.
3. Identify flagged artifacts (status WARN or FAIL).
4. Use AI Rewrite to suggest fixes; manually edit where needed.
5. Resubmit affected templates / sponsored units for approval.
6. Audit log shows everything: who added the rule, when, what fired, who edited.

## 5.5 Adding a new platform connection

A team wants to add LinkedIn Ads.

1. ORG_ADMIN goes to `/admin/oauth-configs/LINKEDIN`, pastes client_id and client_secret, sets enabled = true.
2. An ad-team member opens **Providers Catalog**, clicks Connect on LinkedIn.
3. Authorizes in popup. Account created CONNECTED.
4. Discovers resources (ad accounts).
5. Maps to workspace, sets as default.
6. Optionally creates a sync job and / or a webhook.
7. Health page shows HEALTHY.

## 5.6 Pivoting brand voice

Scenario H in detail.

1. Update `OrgBrandProfile` voiceTone and don't-list.
2. Update the rule set to add new banned phrases reflecting the pivot.
3. Bulk re-run governance on existing artifacts.
4. Use AI Rewrite where automatic.
5. Manually fix where not.
6. Create new versions of canonical templates (parentTemplateId chain preserved).
7. Train the team via the suite's UI hints (do/don't list shown in editors).

## 5.7 Investigating data freshness

Scenario F in detail.

1. Open `/integrations/health`.
2. Identify failing accounts.
3. Check webhook status; rotate secret if needed.
4. Run a sync job to backfill.
5. Verify Synced Metrics tab updates.

## 5.8 Audit defense

A client asks: "Show me everything that happened in our workspace last quarter, who did it, and what changed."

1. Open `/admin/audit`.
2. Filter by workspaceId, dateFrom, dateTo.
3. Export.

The audit log is the single source of truth and is append-only.

---

# 6. Decision Cookbook — "When Do I Use What?"

## 6.1 Sync job vs. webhook

| Use sync jobs when… | Use webhooks when… |
|---|---|
| The platform doesn't support webhooks | Latency matters (you want to see pauses within seconds) |
| You need a backfill | The platform supports signed webhooks |
| You want a daily / hourly digest | High volume (don't want to poll) |
| You're recovering from an outage | You already have a webhook configured |

In practice, run **both** for any platform that supports webhooks. Webhooks for real-time, sync jobs as a daily safety net.

## 6.2 AI generation vs. manual authoring

| Use AI generation when… | Author manually when… |
|---|---|
| You need brainstorm fuel (many variants) | The copy is high-stakes (homepage hero, board-level message) |
| The pattern is well-defined (hooks/angles/CTAs, video script) | Voice is so specific that the AI can't capture it |
| You want metadata enrichment | You need a single perfect line |
| You're iterating quickly | You have legal review on every line anyway |

## 6.3 Org-level vs. workspace-level brand rule

| Org-level rule | Workspace-level rule |
|---|---|
| Applies to every workspace | Applies to one workspace only |
| Brand-defining ("never say 'cheap'") | Market-specific ("this disclaimer for India only") |
| Created once by ORG_ADMIN | Created by WORKSPACE_ADMIN per workspace |

Org-level rule sets can also be **cloned to workspace** as a starting point and then customized.

## 6.4 INFO vs. WARN vs. BLOCK severity

| Severity | When to use |
|---|---|
| INFO | "FYI, this is suboptimal." (e.g. CTA could be stronger) |
| WARN | "This is risky but not forbidden." (e.g. subjective claim) |
| BLOCK | "This cannot ship." (e.g. regulator-banned phrase) |

A run with one BLOCK fails. A run with one WARN warns. Use BLOCK only for true do-not-ship rules; otherwise authors get desensitized.

## 6.5 AI conversation mode picker

| Mode | When to use |
|---|---|
| CHAT_ONLY | Quick brainstorm, ideation, "explain this concept" |
| TOOL_ASSISTED | "Look at our data and tell me…" — when the agent needs to search, fetch, or run governance |
| WORKFLOW | Recurring scheduled tasks like the weekly digest |
| Programmatic via `AiFacade` | Inside the platform itself (Creative AI flows, Research AI flows, AI Rewrite) |

## 6.6 Insight DRAFT vs. PUBLISHED

| State | Meaning |
|---|---|
| DRAFT | "I'm exploring this. It might not be true." |
| PUBLISHED | "This is institutional knowledge. Cite it." |

Only ORG_ADMIN or WORKSPACE_ADMIN can publish, and only with at least one evidence row. DRAFT is permissive; PUBLISHED is consequential.

## 6.7 When AI should write vs. propose

| Auto-write | Propose for human approval |
|---|---|
| Producing DRAFT artifacts (AI cannot ship a DRAFT) | Mutating an existing artifact |
| Updating snapshot summary fields | Changing campaign budget |
| Creating new insight DRAFTs | Updating sponsored unit headline on a live campaign |
| Generating variants in a new variant set | Enriching live asset metadata |

Default rule of thumb: **if the change is visible to end-users or affects spend, propose.**

---

# 7. Business Impact: How Each Capability Moves a Number

## 7.1 Capability → KPI mapping

| Suite capability | Business KPI it moves | Why |
|---|---|---|
| Multi-platform integrations | Campaign ops time per launch ↓ 30–60% | One UI replaces five. |
| Creative AI generation | Time-to-creative ↓ 50–80% | Hooks, angles, CTAs, scripts in minutes. |
| Governance rule engine | Compliance escalations ↓ to <5% | Rules block at create time, not review time. |
| Real-time webhooks | Time-to-detect-anomaly ↓ from days to seconds | Status changes propagate instantly. |
| Synced metrics tab | Analyst hours per week ↓ 5–10 | No more CSV reconciliation. |
| Research provenance chain | Trust in published claims ↑ | Every claim cites a snapshot. |
| Weekly digest workflow | Time-to-leadership-update ↓ from half a day to 30 min | One button, structured output. |
| Action proposals | AI-induced incidents ↓ to ~0 | Human-in-the-loop on every write. |
| Workspace brand inheritance | Brand consistency across markets ↑ | One source of truth, market-level adaptation. |
| Audit log | SOC2 / regulator audit prep ↓ from weeks to hours | Single export, append-only. |

## 7.2 Where each role spends time

| Role | Primary suite areas | Time saved (rough) |
|---|---|---|
| Performance Marketer (EDITOR) | Campaigns, Creative AI, Synced Metrics | 10–15 hrs/week |
| Brand Lead (WORKSPACE_ADMIN) | Brand Profile, Rule Sets, Templates | 5 hrs/week |
| Analyst | Research, AI summaries, weekly digest | 8–12 hrs/week |
| Compliance (APPROVER) | Approvals queue, AI Proposals | Roughly 50% reduction in late-cycle escalations |
| Agency Founder (ORG_ADMIN) | Admin, Audit Log, Health | Audit prep cycle minutes vs days |
| IT / RevOps (ORG_ADMIN) | Integrations Health, OAuth Configs | Triage time minutes vs hours |

## 7.3 What value is hard to put a number on

- The cultural shift from "AI is risky" to "AI is a coworker we approve work from" — once teams trust the suite's guardrails, AI adoption widens dramatically.
- The permanence of provenance — six months later, when leadership asks "why did we go after this segment?", the suite answers without anyone going to Slack archaeology.
- The reduction in "context loss when a person leaves" — the audit log and provenance links capture the *why*, not just the *what*.

---

# 8. Compliance, Trust & Audit Story

## 8.1 What auditors typically ask

- Who has access to which data?
- Who changed this thing? When? What was it before?
- Where did this claim come from?
- Did this content pass our compliance rules at the time it was published?
- Are credentials rotated? Encrypted at rest?
- Are AI-generated decisions reviewable?

The suite has answers for each.

## 8.2 How the suite answers each

| Question | Answer in the suite |
|---|---|
| Who has access? | Memberships table, queryable per org / workspace. RBAC matrix is documented. |
| Who changed this? | Audit log (append-only, BCrypt-hashed actor lookup, before/after JSON). |
| Where did this claim come from? | Insight → InsightEvidence → SourceSnapshot → ResearchSource. |
| Did content pass compliance? | `governance_check_run_id` on every copy artifact, with full findings. |
| Are credentials rotated? | Webhook secret rotation endpoint; OAuth token auto-refresh; rotation audited. |
| Are credentials encrypted? | Yes, AES-256-GCM at rest; opaque references only on entity rows. |
| Are AI decisions reviewable? | Every AI-produced artifact has a `*AiRunLink` row with full input context and citations. Action proposals are explicitly approved by humans before execution. |

## 8.3 The trust ledger

Three records, in three different tables, are the suite's "trust ledger":

1. **Audit log** — every change.
2. **AI run links** (`CreativeAiRunLink`, `ResearchAiRunLink`) — every AI-produced artifact.
3. **Governance check runs** — every compliance verdict.

A workspace's full audit defense is built by joining these three on entity IDs and time ranges.

## 8.4 Built-in privacy posture

- IPs are hashed before storage (`AdEvent.ipHash`).
- Secrets are never returned in any GET response.
- Webhook signing secrets are exposed only at registration / rotation moment.
- AI redaction patterns scrub common API key shapes from anything stored or surfaced.

## 8.5 The shared-responsibility line

The suite encrypts secrets at rest and enforces transport-level auth. The suite does **not**:

- Encrypt at the column level beyond secrets.
- Verify identity providers (the customer trusts JWT claims).
- Provide GDPR data-subject deletion flows out of the box.
- Provide a SIEM integration out of the box.

These are typically deployment-specific and would be addressed via the suite's audit-log feed and customer-side tooling.

---

# 9. Operational Realities, Limits & Pitfalls

## 9.1 Things that surprise new users

- **The synced metrics tab is empty until a mapping is created.** Customers often think the platform is broken. It is not — the rows exist in `campaign_report_data`, but they aren't linked to an internal campaign. Quick-map fixes it instantly with backfill.
- **An invited user already exists if they were invited to another workspace before.** Acceptance resets their password to whatever they typed. Some customers expect "no, the existing user must log in with their old password." This is a deliberate self-serve choice.
- **The AI cannot mutate live data through tools.** Customers occasionally ask "can the agent just update my campaign?" The answer is: only via an action proposal that a human approves and executes. This is by design.
- **Insight publishing requires evidence.** Some teams build "thesis" insights without snapshots. Those cannot be published without first attaching at least one evidence row.
- **Banned phrase rules are case-insensitive substring matches by default.** A rule banning "guaranteed" also flags "guaranteed-best", "Guaranteed", "GUARANTEED". Add specific patterns or regex if you want different behavior.

## 9.2 Things to watch operationally

- **OAuth token refresh** runs eagerly when a token is within 5 minutes of expiry. If the refresh fails (revoked credential on platform side), the account goes to ERROR. Reconnect.
- **Webhook signature failures** put the webhook in ERROR. The sync job is the safety net. Rotate the secret on both sides; the webhook recovers on next valid delivery.
- **The OAuth state token has a 10-minute TTL.** Users who walk away mid-flow get an "invalid state" error and must restart.
- **Default safety policy is conservative.** New workspaces seed with banned phrases like "password", "api key", "secret key", "access token" and blocked topics like "medical diagnosis", "financial advice", "legal counsel". Edit per workspace if your business legitimately needs to discuss these.
- **The custom HTTP LLM gateway is gated by `app.ai.enable-custom-http`.** It ships disabled. Enable only after security review.
- **The audit log can grow large.** Pagination is built in, but operationally you should plan for archival or column-level compression in long-running deployments.

## 9.3 Things that are intentionally simple in v1

- The asset model is URL-first. `sourceUrl` and `fileUrl` are often the same value. Native blob storage with multipart uploads is not part of the v1 contract.
- The measurement module's `/events/summary` is a daily aggregation only. No hourly granularity, no user-level cohorting.
- The brand rule engine is regex-based for BANNED_PHRASE and CLAIM_RESTRICTION. More sophisticated NLP-based rules (intent, sentiment, similarity) are a roadmap item, not v1.
- The watchlist refresh creates a job but does not auto-fetch by default — current implementation focuses on manual + integration-resource-driven captures.

## 9.4 What scales smoothly and what needs attention

| Scales smoothly | Watch as you grow |
|---|---|
| Read-heavy workloads (campaigns, reports, conversations) — Postgres handles well | Audit log writes (every mutation) |
| Read-only AI tools — they're cached or simple queries | Webhook delivery volume — rate-limit on inbound |
| Per-workspace isolation — no cross-tenant fan-out | Sync job parallelism — currently single-job-at-a-time per account |

---

# 10. Glossary in Plain English

| Term | Plain meaning |
|---|---|
| **Organization** | A customer account. Owns workspaces, members, billing posture. |
| **Workspace** | An operating unit inside an organization (a market, a brand line, a product). |
| **Membership** | One person's role in one (org, workspace?) pair. |
| **Org-level membership** | A membership with no workspace — applies to every workspace in the org. |
| **Integration account** | A connected platform credential set, owned at the org. |
| **Resource** | A discoverable thing inside an integration account (ad account, page, drive). |
| **Workspace integration** | An account (and optional resource) mapped to a workspace. |
| **Entity mapping** | A binding between an internal entity (campaign) and an external one (Meta campaign 23851234567890). |
| **Sync job** | A batch pull of metrics from a platform. |
| **Webhook** | A real-time push from a platform. |
| **Campaign** | A planned paid-media activity. |
| **Sponsored unit** | An actual ad placement, holding the headline/body/CTA/landing URL/disclaimer. |
| **Target set** | A targeting segment within a campaign (intent + topics + geo + negatives). |
| **Approval workflow** | A reusable polymorphic approve/reject machine for sponsored units, templates, and proposals. |
| **Asset** | A creative file or URL (image, video, document, audio). |
| **Asset version** | An immutable snapshot of an asset's content at a point in time. |
| **Copy artifact** | Structured ad copy with text and JSON forms. |
| **Variant set** | A named bundle of copy/asset variants. |
| **Folder** | A tree node for organizing assets. |
| **Render preset** | A platform-specific export configuration. |
| **Brand profile** | Brand identity (colors, fonts, voice, languages). |
| **Effective brand profile** | Org base + workspace overrides, merged. |
| **Rule set** | A named bundle of brand/compliance rules. |
| **Rule** | A single check — banned phrase, required disclaimer, etc. |
| **Disclaimer** | Reusable legal text with localizations. |
| **Content template** | Reusable governed copy with version chain. |
| **Governance check run** | A compliance verdict on a piece of content with itemized findings. |
| **Platform constraint** | A platform's hard limit (e.g. X 280 chars). |
| **Competitor** | A tracked rival in a workspace. |
| **Research source** | "Where the information came from." |
| **Source snapshot** | "What it looked like at this moment." |
| **Insight** | A structured finding from research. |
| **Evidence** | A snapshot citation backing an insight. |
| **Keyword cluster** | A named group of related keywords. |
| **Persona research** | An audience persona derived from research. |
| **Watchlist** | A saved monitoring intent. |
| **Research job** | Async job record for ingestion / AI / refresh. |
| **Digest report** | Stored output of the weekly digest workflow. |
| **AI conversation** | A multi-turn dialogue session. |
| **AI prompt template** | A reusable, approved prompt blueprint. |
| **AI prompt run** | One execution of a prompt with full input/output recorded. |
| **AI workflow** | A multi-step plan of prompt + tool calls. |
| **AI action proposal** | A pending change requiring human approval and execution. |
| **AI tool** | A read-only or low-risk function the agent can invoke. |
| **Provider config** | An LLM provider configuration (OpenAI, Perplexity, etc.). |
| **Workspace provider preference** | A workspace's default LLM provider, model whitelist, and policy. |
| **Safety policy** | A workspace's banned phrases, blocked topics, allowed tools. |
| **Redaction rule** | A workspace regex that scrubs secrets from AI inputs/outputs. |
| **AiFacade** | The internal API other modules use to invoke AI. |
| **Audit log** | Append-only record of every state-changing action. |
| **Correlation ID** | A request-tracing identifier propagated through logs. |
| **Secret store** | The encrypted credential vault (AES-256-GCM). |
| **Permission helper** | A method like `requireResearchPublish` that throws if the user can't do the thing. |

---

## Document version

- **Version**: 2.0 — functional rewrite with real-world scenarios.
- **Generated**: 2026-04-30.
- **Source baseline**: `marketing-suite/` working tree (backend Java 21 + Angular 17 + PostgreSQL 16).
- **Audience**: cross-functional internal use; product, sales, customer success, implementation partners, QA, new joiners.
- **Maintenance**: re-generate when modules are added or major lifecycle changes ship.
