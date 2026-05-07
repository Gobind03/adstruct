# Governance Prompt Templates

Prompt templates for AI agents interacting with the Brand & Content Governance module. Each template includes input/output JSON schemas and guardrails.

---

## 1) Generate Brand Voice Guidelines

Generate structured brand voice guidelines from high-level inputs.

### Input Schema
```json
{
  "brandName": "string",
  "industry": "string",
  "targetAudience": "string",
  "toneStyle": "PROFESSIONAL | FRIENDLY | PREMIUM | TECHNICAL | PLAYFUL | MINIMAL | CUSTOM",
  "coreValues": ["string"],
  "competitorBrands": ["string"]
}
```

### Output Schema
```json
{
  "voiceGuidelinesText": "string (2-4 paragraphs)",
  "doListText": "string (bullet list of DO guidelines)",
  "dontListText": "string (bullet list of DON'T guidelines)",
  "samplePhrases": ["string"],
  "suggestedToneStyle": "string"
}
```

### Guardrails
- Do not reference competitor brand names negatively
- Do not generate content that makes unsubstantiated claims
- Output must be brand-safe and suitable for all audiences
- No secrets, API keys, or internal references in output

---

## 2) Generate Compliant Ad Copy Variants

Generate ad copy variants that comply with a given ruleset and template structure.

### Input Schema
```json
{
  "templateType": "AD_COPY | SOCIAL_POST",
  "templateContentJson": { "primaryText": "", "headline": "", "description": "" },
  "ruleSetSummary": {
    "bannedPhrases": ["string"],
    "requiredDisclaimers": ["string"],
    "claimRestrictions": ["string"]
  },
  "platformType": "META | GOOGLE_ADS | X | LINKEDIN",
  "platformConstraints": { "maxTextLength": 125, "maxHeadlineLength": 30 },
  "variantCount": 3,
  "product": "string",
  "callToAction": "string"
}
```

### Output Schema
```json
{
  "variants": [
    {
      "primaryText": "string",
      "headline": "string",
      "description": "string",
      "disclaimersIncluded": ["string"],
      "complianceNotes": "string"
    }
  ]
}
```

### Guardrails
- All variants must respect platform character limits
- All banned phrases must be absent from output
- Required disclaimers must be included in every variant
- No unsubstantiated health, financial, or legal claims
- Always include disclaimers when the ruleset requires them

---

## 3) Rewrite Copy to Pass Governance Checks

Rewrite content that failed governance checks to make it compliant.

### Input Schema
```json
{
  "originalContent": "string",
  "findings": [
    {
      "severity": "BLOCK | WARN",
      "ruleId": "uuid",
      "message": "string",
      "evidence": "string",
      "suggestion": "string"
    }
  ],
  "requiredDisclaimers": ["string"],
  "platformConstraints": { "maxTextLength": 280 }
}
```

### Output Schema
```json
{
  "rewrittenContent": "string",
  "changesApplied": [
    {
      "findingMessage": "string",
      "resolution": "string"
    }
  ],
  "disclaimersAdded": ["string"],
  "withinCharacterLimit": true
}
```

### Guardrails
- Must address every BLOCK finding
- Must not introduce new banned phrases
- Must preserve the original intent and meaning where possible
- Must include all required disclaimers
- No secrets or internal data in output

---

## 4) Produce Localized Disclaimers

Translate disclaimers into a target language while preserving legal meaning.

### Input Schema
```json
{
  "disclaimerKey": "string",
  "defaultText": "string (English)",
  "targetLanguage": "string (e.g., hi, es, fr, de, ja)",
  "complianceDomain": "HEALTHCARE | FINANCE | GENERAL",
  "countryContext": "string (e.g., IN, DE, JP)"
}
```

### Output Schema
```json
{
  "language": "string",
  "translatedText": "string",
  "backtranslation": "string (English back-translation for verification)",
  "caveats": "string (any notes about regional legal nuances)"
}
```

### Guardrails
- This is NOT legal advice; output must include a note that legal review is required
- Preserve the meaning and intent of the original disclaimer
- Do not add claims or guarantees not in the original
- Include back-translation for human verification
- No secrets or confidential information

---

## 5) Suggest Rule Additions from Audit Findings

Analyze governance check history and suggest new rules to add.

### Input Schema
```json
{
  "recentCheckRuns": [
    {
      "entityType": "string",
      "status": "PASS | WARN | FAIL",
      "findingsJson": [
        { "severity": "string", "message": "string", "evidence": "string" }
      ]
    }
  ],
  "existingRuleNames": ["string"],
  "complianceDomain": "string"
}
```

### Output Schema
```json
{
  "suggestions": [
    {
      "ruleType": "BANNED_PHRASE | CLAIM_RESTRICTION | REQUIRED_DISCLAIMER",
      "severity": "WARN | BLOCK",
      "name": "string",
      "description": "string",
      "pattern": "string (if BANNED_PHRASE)",
      "rationale": "string"
    }
  ]
}
```

### Guardrails
- Suggestions are explanatory only; they do not auto-create rules
- Do not suggest rules that duplicate existing rule names
- Rationale must reference specific evidence from check runs
- No secrets, PII, or internal data in output

---

## 6) Summarize Policy Risks per Platform

Summarize platform-specific policy risks for a given content piece.

### Input Schema
```json
{
  "contentText": "string",
  "platformTypes": ["META", "GOOGLE_ADS", "X", "LINKEDIN", "TIKTOK"],
  "complianceDomain": "string",
  "targetCountries": ["string"]
}
```

### Output Schema
```json
{
  "platformRisks": [
    {
      "platformType": "string",
      "riskLevel": "LOW | MEDIUM | HIGH",
      "issues": [
        {
          "category": "string (e.g., TEXT_LENGTH, RESTRICTED_CONTENT, TARGETING)",
          "description": "string",
          "recommendation": "string"
        }
      ]
    }
  ],
  "overallRisk": "LOW | MEDIUM | HIGH",
  "summary": "string (1-2 sentence overview)"
}
```

### Guardrails
- Risk assessments are informational, not legal or compliance guarantees
- Must reference known platform policies where possible
- Do not fabricate platform rules
- No secrets, credentials, or internal references in output
- Always recommend human review for HIGH risk items
