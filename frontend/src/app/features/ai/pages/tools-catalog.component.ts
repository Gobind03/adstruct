import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiToolDefinition, ToolRiskLevel } from '../models/ai.models';
import { AiToolsApiService } from '../services/ai-tools-api.service';
import { AiStore } from '../store/ai.store';
import { AdminStore } from '../../admin/store/admin.store';
import { JsonViewerComponent } from '../components/json-viewer.component';

interface RiskInfo {
  level: ToolRiskLevel;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const RISK_MAP: RiskInfo[] = [
  {
    level: 'READ_ONLY',
    label: 'Read-only',
    icon: 'visibility',
    color: '#dcfce7',
    description: 'Only reads data — never modifies anything. Always safe to invoke.',
  },
  {
    level: 'SAFE_WRITE',
    label: 'Safe write',
    icon: 'edit_note',
    color: '#fef9c3',
    description: 'May create draft entities (e.g. proposals) but cannot modify live data without approval.',
  },
  {
    level: 'HIGH_RISK_WRITE',
    label: 'High-risk write',
    icon: 'warning',
    color: '#fee2e2',
    description: 'Could modify live data. Requires explicit approval and is blocked by default safety policies.',
  },
];

interface ToolGuide {
  name: string;
  module: string;
  moduleIcon: string;
  whatItDoes: string;
  sampleQuestion: string;
  sampleInput: string;
  sampleOutput: string;
}

const TOOL_GUIDES: Record<string, ToolGuide> = {
  'research.searchInsights': {
    name: 'research.searchInsights',
    module: 'Research',
    moduleIcon: 'search',
    whatItDoes: 'Searches your workspace research snapshots and insights by keyword. Returns matching items with titles, summaries, and IDs.',
    sampleQuestion: '"Summarise the latest research insights on competitor pricing"',
    sampleInput: '{ "q": "competitor pricing", "limit": 5 }',
    sampleOutput: '{ "items": [{ "insightId": "...", "title": "...", "summary": "..." }] }',
  },
  'governance.getEffectiveBrandProfile': {
    name: 'governance.getEffectiveBrandProfile',
    module: 'Governance',
    moduleIcon: 'verified',
    whatItDoes: 'Returns the effective brand profile for the workspace — display name, voice tone, supported languages, and style guidelines.',
    sampleQuestion: '"What is our brand voice and tone?"',
    sampleInput: '{ }',
    sampleOutput: '{ "displayName": "Acme Corp", "voiceTone": "Professional", "languages": ["en"] }',
  },
  'governance.runCheck': {
    name: 'governance.runCheck',
    module: 'Governance',
    moduleIcon: 'verified',
    whatItDoes: 'Runs a governance compliance check on content against brand rules, rulesets, and disclaimers. Returns PASS, WARN, or FAIL with findings.',
    sampleQuestion: '"Check if this ad copy passes our compliance rules"',
    sampleInput: '{ "entityType": "TEMPLATE", "entityId": "...", "contentPayloadJson": {...}, "platformType": "META", "language": "en" }',
    sampleOutput: '{ "status": "WARN", "findings": [{ "rule": "...", "message": "..." }] }',
  },
  'integrations.listWorkspaceIntegrations': {
    name: 'integrations.listWorkspaceIntegrations',
    module: 'Integrations',
    moduleIcon: 'hub',
    whatItDoes: 'Lists all integration accounts mapped to this workspace — platform type, account ID, and enabled status.',
    sampleQuestion: '"What integrations do we have connected?"',
    sampleInput: '{ }',
    sampleOutput: '{ "items": [{ "platformType": "META_ADS", "accountId": "...", "enabled": true }] }',
  },
  'ads.listConversationCampaigns': {
    name: 'ads.listConversationCampaigns',
    module: 'Ads',
    moduleIcon: 'campaign',
    whatItDoes: 'Lists ad campaigns in the workspace with optional status filtering. Returns campaign names, statuses, and IDs.',
    sampleQuestion: '"Show me all active campaigns"',
    sampleInput: '{ "status": "ACTIVE", "limit": 20 }',
    sampleOutput: '{ "items": [{ "id": "...", "name": "Summer Sale", "status": "ACTIVE" }] }',
  },
  'actions.propose': {
    name: 'actions.propose',
    module: 'Proposals',
    moduleIcon: 'approval',
    whatItDoes: 'Creates an Action Proposal for a write operation that requires human approval. The agent uses this to suggest changes without auto-executing them.',
    sampleQuestion: '"Create a new template with this copy"',
    sampleInput: '{ "title": "...", "actionType": "CREATE_TEMPLATE", "targetEntityType": "TEMPLATE", "payloadJson": {...} }',
    sampleOutput: '{ "proposalId": "..." }',
  },
};

@Component({
  selector: 'app-tools-catalog',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    JsonViewerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <!-- ===== HEADER ===== -->
      <header class="page-header">
        <div>
          <h1>Tools Catalog</h1>
          <p class="subtitle">
            Agent tools are internal APIs that the AI agent can invoke during conversations and workflow steps.
            They let the agent read your workspace data — research, campaigns, brand profile, integrations —
            and propose write actions for your approval.
          </p>
        </div>
      </header>

      @if (!workspaceId()) {
        <div class="welcome-empty">
          <mat-icon class="welcome-icon">build</mat-icon>
          <h2>Select a workspace</h2>
          <p>Choose a workspace from the top bar to see the tools available to the AI agent.</p>
        </div>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else {
        <!-- RISK LEVELS LEGEND -->
        <section class="risk-section">
          <h2 class="sec-title">Risk levels</h2>
          <p class="sec-desc">Every tool has a risk level that controls how the safety layer handles it.</p>
          <div class="risk-grid">
            @for (r of riskInfos; track r.level) {
              <div class="risk-card" [style.border-left-color]="r.color">
                <mat-icon>{{ r.icon }}</mat-icon>
                <div>
                  <strong>{{ r.label }}</strong>
                  <p>{{ r.description }}</p>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- HOW TOOLS ARE USED -->
        <section class="how-section">
          <h2 class="sec-title">How tools connect to the platform</h2>
          <div class="how-grid">
            <div class="how-card">
              <mat-icon>chat</mat-icon>
              <strong>AI Chat</strong>
              <p>In <strong>Tool-assisted</strong> mode, the agent automatically picks the right tool based on your message. For example, "show my active campaigns" triggers <code>ads.listConversationCampaigns</code>.</p>
              <a mat-stroked-button routerLink="/ai/chat" class="how-link"><mat-icon>open_in_new</mat-icon> AI Chat</a>
            </div>
            <div class="how-card">
              <mat-icon>account_tree</mat-icon>
              <strong>Workflows</strong>
              <p>Workflow steps of type <code>TOOL</code> call these tools by name. The tool output feeds into subsequent steps automatically.</p>
              <a mat-stroked-button routerLink="/ai/workflows" class="how-link"><mat-icon>open_in_new</mat-icon> Workflows</a>
            </div>
            <div class="how-card">
              <mat-icon>shield</mat-icon>
              <strong>Safety policies</strong>
              <p>Workspace safety policies control which tools the agent is allowed to use. Configure the <code>allowedTools</code> allowlist to restrict access.</p>
              <a mat-stroked-button routerLink="/ai/safety" class="how-link"><mat-icon>open_in_new</mat-icon> Safety & Redaction</a>
            </div>
          </div>
        </section>

        <!-- TOOLS LIST -->
        <section class="tools-section">
          <h2 class="sec-title">Available tools ({{ tools().length }})</h2>
          <p class="sec-desc">Click any tool to expand its schemas, usage guide, and example conversation.</p>

          @if (!tools().length) {
            <mat-card class="empty-card">
              <mat-icon>build_circle</mat-icon>
              <h3>No tools found</h3>
              <p>This workspace does not have any tools configured. Tools are seeded automatically when the platform starts.</p>
            </mat-card>
          }

          <div class="tools-list">
            @for (t of tools(); track t.id) {
              <mat-card class="tool-card">
                <div class="tc-head">
                  <div class="tc-title-row">
                    <mat-icon class="tc-module-icon">{{ moduleIcon(t.name) }}</mat-icon>
                    <div>
                      <h3 class="tc-name">{{ t.name }}</h3>
                      <span class="tc-module">{{ moduleName(t.name) }}</span>
                    </div>
                  </div>
                  <div class="tc-badges">
                    <mat-chip [class]="riskClass(t.riskLevel)"
                              [matTooltip]="riskTooltip(t.riskLevel)">
                      <mat-icon class="chip-icon">{{ riskIcon(t.riskLevel) }}</mat-icon>
                      {{ riskLabel(t.riskLevel) }}
                    </mat-chip>
                    <mat-chip [class]="t.enabled ? 'en-on' : 'en-off'"
                              [matTooltip]="t.enabled ? 'This tool is active and available to the agent' : 'This tool is disabled and will not be invoked'">
                      {{ t.enabled ? 'Enabled' : 'Disabled' }}
                    </mat-chip>
                  </div>
                </div>
                <p class="tc-desc">{{ toolGuide(t.name)?.whatItDoes || t.description || 'No description available.' }}</p>

                <!-- sample conversation -->
                @if (toolGuide(t.name)) {
                  <div class="tc-sample">
                    <span class="sample-label">Example in AI Chat</span>
                    <div class="sample-msg user"><strong>You:</strong> {{ toolGuide(t.name)!.sampleQuestion }}</div>
                    <div class="sample-msg assistant"><strong>Agent:</strong> I'll use <code>{{ t.name }}</code> to get that information for you…</div>
                  </div>
                }

                <mat-expansion-panel class="panel">
                  <mat-expansion-panel-header>
                    <mat-panel-title>Schemas & usage</mat-panel-title>
                  </mat-expansion-panel-header>

                  <!-- input schema -->
                  <div class="schema-block">
                    <div class="schema-label"><mat-icon>input</mat-icon> Input schema</div>
                    <app-json-viewer [json]="t.inputSchemaJson || '{}'" />
                    @if (toolGuide(t.name)) {
                      <div class="schema-example">
                        <span class="ex-label">Example input</span>
                        <pre>{{ toolGuide(t.name)!.sampleInput }}</pre>
                      </div>
                    }
                  </div>

                  <!-- output schema -->
                  <div class="schema-block">
                    <div class="schema-label"><mat-icon>output</mat-icon> Output schema</div>
                    <app-json-viewer [json]="t.outputSchemaJson || '{}'" />
                    @if (toolGuide(t.name)) {
                      <div class="schema-example">
                        <span class="ex-label">Example output</span>
                        <pre>{{ toolGuide(t.name)!.sampleOutput }}</pre>
                      </div>
                    }
                  </div>

                  <!-- workflow usage -->
                  <div class="usage-block">
                    <div class="schema-label"><mat-icon>account_tree</mat-icon> Workflow step</div>
                    <pre class="usage-code">{{ workflowSnippet(t.name) }}</pre>
                  </div>
                </mat-expansion-panel>
              </mat-card>
            }
          </div>
        </section>

        <!-- FOOTER -->
        <div class="footer-hint">
          <mat-icon>info</mat-icon>
          <span>
            Tools are <strong>read-only by default</strong>. The only write tool is <code>actions.propose</code>,
            which creates a proposal requiring human approval — it never modifies live data directly.
            Workspace <a routerLink="/ai/safety"><strong>safety policies</strong></a> control which tools the agent can use.
          </span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 40px; max-width: 1100px; margin: 0 auto; }

    .page-header { margin-bottom: 20px; }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .subtitle { margin: 6px 0 0; color: #6b7280; font-size: 14px; max-width: 700px; line-height: 1.5; }

    .welcome-empty { text-align: center; padding: 48px 24px; }
    .welcome-icon { font-size: 52px; width: 52px; height: 52px; color: #3f51b5; opacity: .7; margin-bottom: 12px; }
    .welcome-empty h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
    .welcome-empty p { margin: 0; color: #6b7280; font-size: 14px; }
    .centered { display: flex; justify-content: center; padding: 48px; }

    .sec-title { font-size: 16px; font-weight: 600; margin: 0 0 6px; color: #111; }
    .sec-desc { margin: 0 0 12px; font-size: 13px; color: #6b7280; line-height: 1.5; }

    /* risk legend */
    .risk-section { margin-bottom: 24px; }
    .risk-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
    .risk-card {
      display: flex; gap: 12px; align-items: flex-start;
      padding: 12px 14px; border: 1px solid rgba(0,0,0,.06); border-left: 4px solid; border-radius: 8px; background: #fafbfc;
    }
    .risk-card mat-icon { font-size: 20px; width: 20px; height: 20px; color: #374151; margin-top: 2px; flex-shrink: 0; }
    .risk-card strong { display: block; font-size: 13px; margin-bottom: 2px; }
    .risk-card p { margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4; }

    /* how section */
    .how-section { margin-bottom: 24px; }
    .how-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
    .how-card { padding: 16px 18px; border: 1px solid rgba(0,0,0,.08); border-radius: 10px; background: #fafbfc; }
    .how-card mat-icon { font-size: 22px; width: 22px; height: 22px; color: #3f51b5; margin-bottom: 4px; }
    .how-card strong { display: block; font-size: 14px; margin-bottom: 4px; }
    .how-card p { margin: 0 0 8px; font-size: 12px; color: #6b7280; line-height: 1.4; }
    .how-card code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
    .how-link { font-size: 12px !important; }
    .how-link mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* tools list */
    .tools-section { margin-bottom: 16px; }
    .empty-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 32px !important; }
    .empty-card mat-icon { font-size: 48px; width: 48px; height: 48px; color: #9ca3af; margin-bottom: 12px; }
    .empty-card h3 { margin: 0 0 6px; }

    .tools-list { display: flex; flex-direction: column; gap: 14px; }
    .tool-card { padding: 0 !important; overflow: hidden; }
    .tc-head { padding: 16px 18px 10px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
    .tc-title-row { display: flex; gap: 10px; align-items: flex-start; }
    .tc-module-icon { font-size: 24px; width: 24px; height: 24px; color: #3f51b5; margin-top: 2px; }
    .tc-name { margin: 0; font-size: 15px; font-weight: 700; font-family: ui-monospace, monospace; color: #111; }
    .tc-module { font-size: 11px; color: #6b7280; }
    .tc-badges { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; margin-right: 4px; }
    .tc-desc { margin: 0; padding: 0 18px 12px; font-size: 13px; color: #4b5563; line-height: 1.45; }

    /* sample conversation */
    .tc-sample { padding: 0 18px 12px; }
    .sample-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin-bottom: 6px; }
    .sample-msg { padding: 8px 12px; border-radius: 8px; margin-bottom: 4px; font-size: 13px; line-height: 1.4; }
    .sample-msg.user { background: #e8eaf6; color: #1a237e; }
    .sample-msg.assistant { background: #f0fdf4; color: #14532d; }
    .sample-msg strong { font-size: 11px; text-transform: uppercase; letter-spacing: .03em; display: block; margin-bottom: 2px; }
    .sample-msg code { background: rgba(0,0,0,.06); padding: 1px 5px; border-radius: 3px; font-size: 12px; }

    /* expansion panel */
    .panel { box-shadow: none !important; border-top: 1px solid rgba(0,0,0,.08); }
    .schema-block { margin-bottom: 16px; }
    .schema-label { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: #374151; margin-bottom: 8px; }
    .schema-label mat-icon { font-size: 16px; width: 16px; height: 16px; color: #6b7280; }
    .schema-example { margin-top: 10px; }
    .ex-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin-bottom: 4px; }
    .schema-example pre {
      margin: 0; padding: 8px 10px; background: #1e293b; color: #e2e8f0;
      border-radius: 6px; font-size: 11px; line-height: 1.5; overflow-x: auto; white-space: pre-wrap;
    }

    .usage-block { margin-bottom: 8px; }
    .usage-code {
      margin: 0; padding: 8px 10px; background: #1e293b; color: #e2e8f0;
      border-radius: 6px; font-size: 11px; line-height: 1.5; overflow-x: auto; white-space: pre-wrap;
    }

    mat-chip.risk-low { --mdc-chip-container-color: #dcfce7; color: #166534; }
    mat-chip.risk-med { --mdc-chip-container-color: #fef9c3; color: #854d0e; }
    mat-chip.risk-high { --mdc-chip-container-color: #fee2e2; color: #991b1b; }
    mat-chip.risk-unk { --mdc-chip-container-color: #f3f4f6; color: #4b5563; }
    mat-chip.en-on { --mdc-chip-container-color: #e0e7ff; color: #3730a3; }
    mat-chip.en-off { --mdc-chip-container-color: #f3f4f6; color: #6b7280; }

    .footer-hint {
      max-width: 1100px; display: flex; gap: 10px; align-items: flex-start;
      padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
    }
    .footer-hint mat-icon { color: #2563eb; font-size: 20px; width: 20px; height: 20px; margin-top: 1px; flex-shrink: 0; }
    .footer-hint span { font-size: 13px; color: #1e3a5f; line-height: 1.5; }
    .footer-hint code { background: #dbeafe; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
    .footer-hint a { color: #2563eb; text-decoration: none; }
    .footer-hint a:hover { text-decoration: underline; }
  `],
})
export class ToolsCatalogComponent {
  private admin = inject(AdminStore);
  private aiStore = inject(AiStore);
  private api = inject(AiToolsApiService);

  readonly workspaceId = this.admin.selectedWorkspaceId;
  readonly tools = this.aiStore.tools;
  readonly loading = signal(false);
  readonly riskInfos = RISK_MAP;
  private seq = 0;

  constructor() {
    effect(() => {
      const ws = this.workspaceId();
      if (!ws) {
        this.aiStore.setTools([]);
        return;
      }
      const s = ++this.seq;
      this.loading.set(true);
      this.api.list(ws).subscribe({
        next: (list) => {
          if (s !== this.seq) return;
          this.aiStore.setTools(list);
          this.loading.set(false);
        },
        error: () => {
          if (s !== this.seq) return;
          this.loading.set(false);
        },
      });
    }, { allowSignalWrites: true });
  }

  toolGuide(name: string): ToolGuide | null {
    return TOOL_GUIDES[name] ?? null;
  }

  moduleName(toolName: string): string {
    const guide = TOOL_GUIDES[toolName];
    if (guide) return guide.module + ' module';
    const prefix = toolName.split('.')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1) + ' module';
  }

  moduleIcon(toolName: string): string {
    return TOOL_GUIDES[toolName]?.moduleIcon ?? 'extension';
  }

  riskLabel(r: ToolRiskLevel | null | undefined): string {
    if (!r) return 'Unknown';
    return RISK_MAP.find((x) => x.level === r)?.label ?? r.replace(/_/g, ' ');
  }

  riskIcon(r: ToolRiskLevel | null | undefined): string {
    return RISK_MAP.find((x) => x.level === r)?.icon ?? 'help_outline';
  }

  riskTooltip(r: ToolRiskLevel | null | undefined): string {
    return RISK_MAP.find((x) => x.level === r)?.description ?? '';
  }

  riskClass(r: ToolRiskLevel | null | undefined): string {
    switch (r) {
      case 'READ_ONLY': return 'risk-low';
      case 'SAFE_WRITE': return 'risk-med';
      case 'HIGH_RISK_WRITE': return 'risk-high';
      default: return 'risk-unk';
    }
  }

  workflowSnippet(toolName: string): string {
    const guide = TOOL_GUIDES[toolName];
    const input = guide ? guide.sampleInput : '{ }';
    return `{
  "type": "TOOL",
  "tool": "${toolName}",
  "inputTemplate": ${input}
}`;
  }
}
