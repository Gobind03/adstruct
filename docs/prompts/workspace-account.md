# Prompt Templates: Workspace & Account Management

## 1. Suggest RBAC Roles for My Team

### Description
Given a team structure and responsibilities, suggest optimal RBAC role assignments.

### Inputs (JSON)
```json
{
  "orgName": "string",
  "teamMembers": [
    {
      "name": "string",
      "email": "string",
      "responsibilities": "string",
      "currentTitle": "string"
    }
  ],
  "workspaces": [
    {
      "name": "string",
      "description": "string"
    }
  ]
}
```

### Output Schema (JSON)
```json
{
  "recommendations": [
    {
      "email": "string",
      "suggestedRole": "ORG_ADMIN | WORKSPACE_ADMIN | EDITOR | ANALYST | APPROVER | VIEWER",
      "scope": "org | workspace",
      "workspaceName": "string | null",
      "reasoning": "string"
    }
  ],
  "warnings": ["string"],
  "bestPractices": ["string"]
}
```

### Safety Notes
- Do not include passwords or authentication tokens in inputs.
- Do not recommend giving ORG_ADMIN to more than 2-3 people.
- Always recommend principle of least privilege.

---

## 2. Generate Onboarding Invite Message

### Description
Generate a personalized invite email message for a new team member.

### Inputs (JSON)
```json
{
  "inviterName": "string",
  "inviteeName": "string",
  "inviteeEmail": "string",
  "orgName": "string",
  "role": "string",
  "workspaceName": "string | null",
  "inviteLink": "string",
  "customMessage": "string | null"
}
```

### Output Schema (JSON)
```json
{
  "subject": "string",
  "htmlBody": "string",
  "plainTextBody": "string"
}
```

### Safety Notes
- Do not include the raw invite token in the email body beyond the link.
- Do not include any passwords or sensitive credentials.
- The invite link should be the only authentication mechanism referenced.

---

## 3. Summarize Audit Changes Last 7 Days

### Description
Given a set of audit log entries, produce a human-readable summary of changes.

### Inputs (JSON)
```json
{
  "orgName": "string",
  "dateRange": {
    "from": "ISO 8601 date string",
    "to": "ISO 8601 date string"
  },
  "auditEntries": [
    {
      "action": "CREATE | UPDATE | DELETE | ARCHIVE | RESTORE | ACCEPT | REVOKE",
      "entityType": "ORGANIZATION | WORKSPACE | USER | MEMBERSHIP | TEAM | INVITE",
      "entityId": "string",
      "actorUserId": "string",
      "beforeJson": "string | null",
      "afterJson": "string | null",
      "createdAt": "ISO 8601 date string"
    }
  ],
  "userDirectory": {
    "userId": "displayName"
  }
}
```

### Output Schema (JSON)
```json
{
  "summary": "string",
  "highlights": [
    {
      "category": "string",
      "description": "string",
      "count": "number"
    }
  ],
  "detailedChanges": [
    {
      "date": "string",
      "actor": "string",
      "action": "string",
      "description": "string"
    }
  ],
  "riskFlags": ["string"]
}
```

### Safety Notes
- Do not include raw JSON diffs in the summary; summarize meaningful changes.
- Flag suspicious patterns (e.g., bulk role escalations, mass deletions).
- Do not expose password hashes or token hashes from audit entries.
