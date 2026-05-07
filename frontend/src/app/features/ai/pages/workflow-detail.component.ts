import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule, MatDrawer } from '@angular/material/sidenav';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiWorkflowDefinition } from '../models/ai.models';
import { AiWorkflowsApiService } from '../services/ai-workflows-api.service';
import { AiStore } from '../store/ai.store';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '../../../core/services/notification.service';
import { JsonViewerComponent } from '../components/json-viewer.component';

interface ParsedStep {
  index: number;
  type: string;
  icon: string;
  label: string;
  detail: string;
  raw: Record<string, unknown>;
}

const STEP_ICON: Record<string, string> = {
  TOOL: 'build',
  LLM: 'auto_awesome',
  PROPOSE_ACTION: 'approval',
};

const STEP_LABEL: Record<string, string> = {
  TOOL: 'Tool call',
  LLM: 'LLM prompt',
  PROPOSE_ACTION: 'Propose action',
};

const SAMPLE_STEPS_JSON = `[
  {
    "type": "TOOL",
    "tool": "research.searchInsights",
    "inputTemplate": { "q": "latest trends", "limit": 5 }
  },
  {
    "type": "LLM",
    "promptTemplateId": "<prompt-id>",
    "inputTemplate": { "insights": "{{previousStep.output}}" }
  },
  {
    "type": "PROPOSE_ACTION",
    "actionType": "CREATE_TEMPLATE",
    "payloadTemplate": { "name": "Generated brief", "content": "{{previousStep.output}}" }
  }
]`;

@Component({
  selector: 'app-workflow-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSidenavModule,
    MatTooltipModule,
    JsonViewerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-drawer-container class="drawer-wrap" [hasBackdrop]="true">
      <!-- ===== RUN DRAWER ===== -->
      <mat-drawer #runDrawer mode="over" position="end" class="run-drawer">
        <div class="drawer-head">
          <h2>Run workflow</h2>
          <button mat-icon-button type="button" (click)="runDrawerRef()?.close()"><mat-icon>close</mat-icon></button>
        </div>
        <div class="drawer-intro">
          <p>
            Execute all steps in sequence against the LLM provider configured for your workspace.
            Provide any initial input values the first step needs as JSON.
          </p>
        </div>

        <div class="drawer-body">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Input JSON</mat-label>
            <textarea matInput rows="10" [(ngModel)]="runInputJson" placeholder='{ "topic": "Q3 campaign" }'></textarea>
            <mat-hint>JSON object with initial variables for the first step — subsequent steps receive outputs automatically</mat-hint>
          </mat-form-field>

          @if (!workspaceId()) {
            <div class="run-warn">
              <mat-icon>warning</mat-icon>
              <span>Select a <strong>workspace</strong> from the top bar before running a workflow.</span>
            </div>
          }

          <button mat-flat-button color="primary" (click)="run()" [disabled]="runBusy() || !workspaceId()">
            @if (runBusy()) { <mat-spinner diameter="20" /> } @else { <mat-icon>play_arrow</mat-icon> Execute }
          </button>

          @if (runResult()) {
            <mat-card class="out-card">
              <h3>Output</h3>
              @if (runResult()!.outputJson) {
                <app-json-viewer [json]="runResult()!.outputJson!" />
              }
              @if (runResult()!.errorMessage) {
                <div class="run-error">
                  <mat-icon>error_outline</mat-icon>
                  <span>{{ runResult()!.errorMessage }}</span>
                </div>
              }
              @if (proposalIds().length) {
                <div class="proposal-section">
                  <strong>Proposals created</strong>
                  <p class="proposal-hint">These proposals require approval before being applied.</p>
                  <div class="proposal-links">
                    @for (pid of proposalIds(); track pid) {
                      <a mat-stroked-button [routerLink]="['/ai/proposals', pid]" class="proposal-link">
                        <mat-icon>approval</mat-icon> {{ pid | slice:0:8 }}…
                      </a>
                    }
                  </div>
                </div>
              }
              <div class="run-meta">
                <span>Status: {{ runResult()!.status }}</span>
              </div>
            </mat-card>
          }
        </div>
      </mat-drawer>

      <!-- ===== MAIN CONTENT ===== -->
      <mat-drawer-content>
        <div class="page">
          <div class="toolbar">
            <button mat-button routerLink="/ai/workflows"><mat-icon>arrow_back</mat-icon> Workflows</button>
            @if (!isNew() && wf()) {
              <span class="crumb">{{ wf()!.name }}</span>
              <mat-chip [class]="'st-' + (wf()!.status || '').toLowerCase()" class="crumb-chip">{{ wf()!.status }}</mat-chip>
            } @else if (isNew()) {
              <span class="crumb">New workflow</span>
            }
          </div>

          @if (!orgId()) {
            <div class="hint-empty">
              <mat-icon>business</mat-icon>
              <h2>Select an organization</h2>
              <p>Choose an organization from the top bar to manage workflows.</p>
            </div>
          } @else if (loading()) {
            <div class="centered"><mat-spinner diameter="40" /></div>
          } @else if (isNew()) {
            <!-- ===== CREATE FORM ===== -->
            <div class="create-intro">
              <mat-icon>account_tree</mat-icon>
              <div>
                <strong>Create a new workflow</strong>
                <p>
                  Define a sequence of steps the AI agent will execute in order. Each step can be a
                  <strong>TOOL</strong> call (read workspace data), an <strong>LLM</strong> call
                  (run a prompt template), or a <strong>PROPOSE_ACTION</strong>
                  (create an approval-required change).
                </p>
              </div>
            </div>

            <mat-card class="card">
              <h1>New workflow</h1>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Name</mat-label>
                <input matInput [(ngModel)]="createName" placeholder="e.g. Weekly Optimisation Brief" />
                <mat-hint>A short, descriptive name visible in the workflow list</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Description</mat-label>
                <textarea matInput rows="2" [(ngModel)]="createDescription"
                          placeholder="What does this workflow automate and when should it be used?"></textarea>
                <mat-hint>Helps teammates understand the workflow's purpose at a glance</mat-hint>
              </mat-form-field>

              <div class="steps-label-row">
                <label>Steps JSON</label>
                <button mat-button type="button" (click)="loadSampleSteps()" class="sample-btn">
                  <mat-icon>content_paste</mat-icon> Load sample
                </button>
              </div>
              <mat-form-field appearance="outline" class="full">
                <textarea matInput rows="14" [(ngModel)]="createStepsJson"
                          placeholder='[{ "type": "TOOL", "tool": "research.searchInsights", "inputTemplate": {} }]'></textarea>
                <mat-hint>JSON array of step objects — see the reference below for step types and fields</mat-hint>
              </mat-form-field>

              <button mat-flat-button color="primary" (click)="create()" [disabled]="createBusy() || !createName.trim()">
                @if (createBusy()) { <mat-spinner diameter="18" /> } @else { Create workflow }
              </button>
            </mat-card>

            <!-- step reference -->
            <section class="ref-section">
              <h2 class="ref-title">Step type reference</h2>
              <div class="ref-grid">
                <mat-card class="ref-card">
                  <div class="ref-head"><mat-icon>build</mat-icon><strong>TOOL</strong></div>
                  <p>Calls an internal read-only tool. Provide the tool name and an input template.</p>
                  <pre class="ref-code">{{ toolStepExample }}</pre>
                  <p class="ref-tools">
                    Available tools:
                    <code>research.searchInsights</code>,
                    <code>governance.getEffectiveBrandProfile</code>,
                    <code>governance.runCheck</code>,
                    <code>integrations.listWorkspaceIntegrations</code>,
                    <code>ads.listConversationCampaigns</code>
                  </p>
                  <a mat-stroked-button routerLink="/ai/tools" class="ref-link"><mat-icon>open_in_new</mat-icon> Tools Catalog</a>
                </mat-card>
                <mat-card class="ref-card">
                  <div class="ref-head"><mat-icon>auto_awesome</mat-icon><strong>LLM</strong></div>
                  <p>Runs an approved prompt template against the workspace's LLM provider. Variables from previous steps are injected.</p>
                  <pre class="ref-code">{{ llmStepExample }}</pre>
                  <a mat-stroked-button routerLink="/ai/prompts" class="ref-link"><mat-icon>open_in_new</mat-icon> Prompt Library</a>
                </mat-card>
                <mat-card class="ref-card">
                  <div class="ref-head"><mat-icon>approval</mat-icon><strong>PROPOSE_ACTION</strong></div>
                  <p>Creates an Action Proposal for human review. The action is never auto-executed.</p>
                  <pre class="ref-code">{{ proposeStepExample }}</pre>
                  <a mat-stroked-button routerLink="/ai/proposals" class="ref-link"><mat-icon>open_in_new</mat-icon> Proposals</a>
                </mat-card>
              </div>
            </section>
          } @else if (!wf()) {
            <mat-card class="hint"><p>Workflow not found.</p></mat-card>
          } @else {
            <!-- ===== VIEW MODE ===== -->
            <div class="head-row">
              <div>
                <h1>{{ wf()!.name }}</h1>
                <p class="desc">{{ wf()!.description || 'No description provided.' }}</p>
              </div>
              <button mat-flat-button color="primary" (click)="openRun()" [disabled]="!workspaceId()"
                      matTooltip="Execute all steps in sequence against your workspace provider">
                <mat-icon>play_arrow</mat-icon> Run Workflow
              </button>
            </div>

            @if (!workspaceId()) {
              <div class="ws-warn">
                <mat-icon>info</mat-icon>
                <span>Select a <strong>workspace</strong> from the top bar to run this workflow.</span>
              </div>
            }

            <!-- visual steps -->
            <mat-card class="card">
              <h2>Steps ({{ parsedSteps().length }})</h2>
              <div class="steps-visual">
                @for (step of parsedSteps(); track step.index; let last = $last) {
                  <div class="step-row">
                    <div class="step-badge">
                      <span class="step-num">{{ step.index + 1 }}</span>
                      <mat-icon>{{ step.icon }}</mat-icon>
                    </div>
                    <div class="step-body">
                      <div class="step-type"><strong>{{ step.label }}</strong><span class="step-type-code">{{ step.type }}</span></div>
                      <p class="step-detail">{{ step.detail }}</p>
                    </div>
                  </div>
                  @if (!last) {
                    <div class="step-connector"><mat-icon>arrow_downward</mat-icon></div>
                  }
                }
              </div>
            </mat-card>

            <!-- raw JSON -->
            <mat-card class="card collapsible">
              <button type="button" class="collapse-toggle" (click)="showRawJson.set(!showRawJson())">
                <mat-icon>{{ showRawJson() ? 'expand_less' : 'expand_more' }}</mat-icon>
                Raw steps JSON
              </button>
              @if (showRawJson()) {
                <div class="raw-json-wrap">
                  <app-json-viewer [json]="wf()!.stepsJson" />
                </div>
              }
            </mat-card>

            <!-- how to use -->
            <section class="usage-section">
              <h2 class="usage-title"><mat-icon>integration_instructions</mat-icon> How to use this workflow</h2>
              <div class="usage-grid">
                <div class="usage-card">
                  <mat-icon>play_circle</mat-icon>
                  <strong>Run from this page</strong>
                  <p>Click <strong>Run Workflow</strong> above, provide input JSON, and the runner will execute all steps in sequence.</p>
                </div>
                <div class="usage-card">
                  <mat-icon>chat</mat-icon>
                  <strong>Trigger from AI Chat</strong>
                  <p>Switch to <strong>Workflow</strong> mode in AI Chat and describe what you need — the agent can invoke this workflow conversationally.</p>
                  <a mat-stroked-button routerLink="/ai/chat" class="uc-link"><mat-icon>open_in_new</mat-icon> AI Chat</a>
                </div>
                <div class="usage-card">
                  <mat-icon>code</mat-icon>
                  <strong>REST API</strong>
                  <p>Call the workflow programmatically:</p>
                  <pre class="api-pre">{{ restApiSnippet() }}</pre>
                </div>
              </div>
            </section>

            <!-- related -->
            <div class="related-bar">
              <mat-icon>link</mat-icon>
              <span>
                <a routerLink="/ai/prompts"><strong>Prompt Library</strong></a> — manage templates referenced by LLM steps ·
                <a routerLink="/ai/tools"><strong>Tools Catalog</strong></a> — see available tool names ·
                <a routerLink="/ai/proposals"><strong>Action Proposals</strong></a> — review proposals created by PROPOSE_ACTION steps
              </span>
            </div>
          }
        </div>
      </mat-drawer-content>
    </mat-drawer-container>
  `,
  styles: [`
    :host { display: block; height: 100%; }
    .drawer-wrap { min-height: 100%; background: transparent; }

    /* run drawer */
    .run-drawer { width: min(500px, 100vw); padding: 16px; }
    .drawer-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .drawer-intro { margin-bottom: 14px; }
    .drawer-intro p { font-size: 13px; color: #4b5563; line-height: 1.5; margin: 0; }
    .drawer-body .full { width: 100%; margin-bottom: 10px; }
    .run-warn {
      display: flex; gap: 8px; align-items: center; padding: 10px 12px; margin-bottom: 10px;
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 12px; color: #92400e;
    }
    .run-warn mat-icon { font-size: 18px; width: 18px; height: 18px; color: #d97706; flex-shrink: 0; }
    .out-card { margin-top: 16px; padding: 14px !important; }
    .out-card h3 { margin: 0 0 8px; font-size: 14px; }
    .run-error { display: flex; gap: 8px; align-items: flex-start; margin-top: 10px; padding: 8px 10px; background: #fef2f2; border-radius: 6px; }
    .run-error mat-icon { color: #dc2626; font-size: 18px; width: 18px; height: 18px; }
    .run-error span { font-size: 12px; color: #991b1b; line-height: 1.4; }
    .run-meta { margin-top: 10px; font-size: 12px; color: #6b7280; }
    .proposal-section { margin-top: 12px; }
    .proposal-section strong { font-size: 13px; }
    .proposal-hint { margin: 2px 0 8px; font-size: 12px; color: #6b7280; }
    .proposal-links { display: flex; flex-wrap: wrap; gap: 6px; }
    .proposal-link { font-size: 12px !important; }
    .proposal-link mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* page */
    .page { padding: 16px 20px 40px; max-width: 920px; margin: 0 auto; }
    .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .crumb { font-weight: 600; color: #374151; }
    .crumb-chip { font-size: 11px !important; min-height: 22px !important; padding: 0 8px !important; }
    mat-chip.st-draft { --mdc-chip-container-color: #e0e7ff; color: #3730a3; }
    mat-chip.st-approved { --mdc-chip-container-color: #dcfce7; color: #166534; }
    mat-chip.st-archived { --mdc-chip-container-color: #f3f4f6; color: #6b7280; }

    .hint-empty { text-align: center; padding: 48px 24px; }
    .hint-empty mat-icon { font-size: 52px; width: 52px; height: 52px; color: #3f51b5; opacity: .7; margin-bottom: 12px; }
    .hint-empty h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
    .hint-empty p { margin: 0; color: #6b7280; font-size: 14px; }
    .hint { padding: 24px; text-align: center; }
    .centered { display: flex; justify-content: center; padding: 48px; }

    /* create */
    .create-intro {
      display: flex; gap: 14px; align-items: flex-start; padding: 16px 18px; margin-bottom: 16px;
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;
    }
    .create-intro mat-icon { font-size: 24px; width: 24px; height: 24px; color: #16a34a; flex-shrink: 0; margin-top: 2px; }
    .create-intro strong { display: block; font-size: 14px; margin-bottom: 4px; }
    .create-intro p { margin: 0; font-size: 13px; color: #374151; line-height: 1.5; }
    .card { padding: 20px !important; margin-bottom: 16px; }
    .card h1, .card h2 { margin: 0 0 12px; font-size: 1.2rem; font-weight: 700; }
    .full { width: 100%; margin-bottom: 10px; }
    .steps-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .steps-label-row label { font-size: 13px; font-weight: 600; color: #374151; }
    .sample-btn { font-size: 12px !important; }
    .sample-btn mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* step reference */
    .ref-section { margin-bottom: 16px; }
    .ref-title { font-size: 16px; font-weight: 600; margin: 0 0 12px; color: #111; }
    .ref-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .ref-card { padding: 16px !important; }
    .ref-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .ref-head mat-icon { font-size: 20px; width: 20px; height: 20px; color: #3f51b5; }
    .ref-head strong { font-size: 14px; font-family: ui-monospace, monospace; }
    .ref-card p { margin: 0 0 8px; font-size: 12.5px; color: #4b5563; line-height: 1.45; }
    .ref-code {
      margin: 0 0 8px; padding: 8px 10px; background: #1e293b; color: #e2e8f0;
      border-radius: 6px; font-size: 11px; line-height: 1.5; overflow-x: auto; white-space: pre-wrap;
    }
    .ref-tools { font-size: 11px !important; color: #6b7280 !important; }
    .ref-tools code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
    .ref-link { font-size: 12px !important; }
    .ref-link mat-icon { font-size: 14px; width: 14px; height: 14px; }

    /* view mode */
    .head-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 1.35rem; font-weight: 700; }
    .desc { color: #6b7280; margin: 6px 0 0; font-size: 14px; line-height: 1.5; }
    .ws-warn {
      display: flex; gap: 8px; align-items: center; padding: 10px 14px; margin-bottom: 14px;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; font-size: 13px; color: #1e3a5f;
    }
    .ws-warn mat-icon { color: #2563eb; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }

    /* visual steps */
    .steps-visual { display: flex; flex-direction: column; }
    .step-row { display: flex; gap: 14px; align-items: flex-start; }
    .step-badge { display: flex; flex-direction: column; align-items: center; gap: 4px; flex-shrink: 0; }
    .step-num {
      display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;
      border-radius: 50%; background: #e0e7ff; color: #3730a3; font-size: 13px; font-weight: 700;
    }
    .step-badge mat-icon { font-size: 20px; width: 20px; height: 20px; color: #3f51b5; }
    .step-body { flex: 1; padding: 4px 0 12px; }
    .step-type { display: flex; align-items: center; gap: 8px; }
    .step-type strong { font-size: 14px; }
    .step-type-code { font-size: 11px; font-family: ui-monospace, monospace; background: #f3f4f6; color: #6b7280; padding: 1px 6px; border-radius: 4px; }
    .step-detail { margin: 4px 0 0; font-size: 13px; color: #4b5563; line-height: 1.45; }
    .step-connector { padding-left: 12px; margin: -4px 0 -2px; }
    .step-connector mat-icon { font-size: 18px; width: 18px; height: 18px; color: #d1d5db; }

    /* collapsible raw json */
    .collapsible { padding: 12px 20px !important; }
    .collapse-toggle {
      display: flex; align-items: center; gap: 6px; background: none; border: none;
      font-size: 13px; font-weight: 600; color: #374151; cursor: pointer; padding: 0;
    }
    .collapse-toggle mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .raw-json-wrap { margin-top: 10px; }

    /* usage */
    .usage-section { margin-top: 20px; margin-bottom: 16px; }
    .usage-title { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 700; margin: 0 0 12px; color: #111; }
    .usage-title mat-icon { font-size: 22px; width: 22px; height: 22px; color: #3f51b5; }
    .usage-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .usage-card { padding: 16px 18px; border: 1px solid rgba(0,0,0,.08); border-radius: 10px; background: #fafbfc; }
    .usage-card mat-icon { font-size: 22px; width: 22px; height: 22px; color: #3f51b5; margin-bottom: 6px; }
    .usage-card strong { display: block; font-size: 14px; margin-bottom: 4px; }
    .usage-card p { margin: 0 0 8px; font-size: 12.5px; color: #4b5563; line-height: 1.45; }
    .uc-link { font-size: 12px !important; }
    .uc-link mat-icon { font-size: 14px; width: 14px; height: 14px; }
    .api-pre {
      margin: 0; padding: 8px 10px; background: #1e293b; color: #e2e8f0;
      border-radius: 6px; font-size: 11px; line-height: 1.5; overflow-x: auto; white-space: pre-wrap;
    }

    .related-bar {
      display: flex; gap: 10px; align-items: flex-start;
      padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
    }
    .related-bar mat-icon { color: #2563eb; font-size: 20px; width: 20px; height: 20px; margin-top: 1px; flex-shrink: 0; }
    .related-bar span { font-size: 13px; color: #1e3a5f; line-height: 1.5; }
    .related-bar a { color: #2563eb; text-decoration: none; }
    .related-bar a:hover { text-decoration: underline; }
  `],
})
export class WorkflowDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private admin = inject(AdminStore);
  private aiStore = inject(AiStore);
  private api = inject(AiWorkflowsApiService);
  private notify = inject(NotificationService);

  readonly runDrawerRef = viewChild<MatDrawer>('runDrawer');

  private readonly wfParam = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('workflowId'))),
    { initialValue: this.route.snapshot.paramMap.get('workflowId') },
  );

  readonly orgId = this.admin.selectedOrgId;
  readonly workspaceId = this.admin.selectedWorkspaceId;

  readonly wf = signal<AiWorkflowDefinition | null>(null);
  readonly loading = signal(true);
  readonly runBusy = signal(false);
  readonly createBusy = signal(false);
  readonly showRawJson = signal(false);
  readonly runResult = signal<import('../models/ai.models').AiWorkflowRun | null>(null);
  runInputJson = '{}';

  createName = '';
  createDescription = '';
  createStepsJson = '[]';

  readonly isNew = computed(() => this.wfParam() === 'new');

  readonly toolStepExample = `{
  "type": "TOOL",
  "tool": "research.searchInsights",
  "inputTemplate": {
    "q": "{{topic}}",
    "limit": 5
  }
}`;

  readonly llmStepExample = `{
  "type": "LLM",
  "promptTemplateId": "<prompt-id>",
  "inputTemplate": {
    "insights": "{{previousStep.output}}"
  }
}`;

  readonly proposeStepExample = `{
  "type": "PROPOSE_ACTION",
  "actionType": "CREATE_TEMPLATE",
  "payloadTemplate": {
    "name": "Generated brief",
    "content": "{{previousStep.output}}"
  }
}`;

  readonly parsedSteps = computed<ParsedStep[]>(() => {
    const w = this.wf();
    if (!w?.stepsJson) return [];
    try {
      const arr = JSON.parse(w.stepsJson) as Record<string, unknown>[];
      if (!Array.isArray(arr)) return [];
      return arr.map((raw, i) => {
        const type = String(raw['type'] || 'UNKNOWN').toUpperCase();
        return {
          index: i,
          type,
          icon: STEP_ICON[type] || 'help_outline',
          label: STEP_LABEL[type] || type,
          detail: this.stepDetail(type, raw),
          raw,
        };
      });
    } catch { return []; }
  });

  readonly proposalIds = computed(() => {
    const j = this.runResult()?.outputJson;
    if (!j?.trim()) return [];
    try {
      const o = JSON.parse(j) as Record<string, unknown>;
      const raw = o['proposalIds'] ?? o['proposals'];
      if (Array.isArray(raw)) return raw.map(String);
      const single = o['proposalId'];
      if (typeof single === 'string') return [single];
    } catch { /* ignore */ }
    return [];
  });

  constructor() {
    effect(() => {
      const id = this.wfParam();
      const oid = this.orgId();
      if (!id) { this.loading.set(false); return; }
      if (id === 'new') { this.wf.set(null); this.loading.set(false); return; }
      if (!oid) { this.loading.set(false); return; }
      this.loading.set(true);
      this.api.get(oid, id).subscribe({
        next: (w) => {
          this.wf.set(w);
          if (w) this.aiStore.upsertWorkflow(w);
          this.loading.set(false);
        },
        error: () => {
          this.wf.set(null);
          this.loading.set(false);
          this.notify.error('Failed to load workflow');
        },
      });
    }, { allowSignalWrites: true });
  }

  loadSampleSteps(): void {
    this.createStepsJson = SAMPLE_STEPS_JSON;
  }

  restApiSnippet(): string {
    const orgId = this.orgId() ?? '<org-id>';
    const wfId = this.wf()?.id ?? '<workflow-id>';
    const wsId = this.workspaceId() ?? '<workspace-id>';
    return `POST /api/v1/orgs/${orgId}/ai/workflows/${wfId}/run?workspaceId=${wsId}
Content-Type: application/json
Authorization: Bearer <token>

{ "inputJson": "{\\"topic\\": \\"Q3 campaign\\"}" }`;
  }

  openRun(): void {
    this.runResult.set(null);
    this.runDrawerRef()?.open();
  }

  run(): void {
    const oid = this.orgId();
    const id = this.wfParam();
    const ws = this.workspaceId();
    if (!oid || !id || id === 'new' || !ws) return;
    let inputJson = this.runInputJson.trim() || '{}';
    try { JSON.parse(inputJson); } catch {
      this.notify.error('Invalid JSON');
      return;
    }
    this.runBusy.set(true);
    this.api.run(oid, id, ws, { inputJson }).subscribe({
      next: (r) => { this.runResult.set(r); this.runBusy.set(false); },
      error: () => { this.runBusy.set(false); this.notify.error('Run failed'); },
    });
  }

  create(): void {
    const oid = this.orgId();
    const ws = this.workspaceId();
    if (!oid) return;
    let stepsJson = this.createStepsJson.trim() || '[]';
    try { JSON.parse(stepsJson); } catch {
      this.notify.error('Steps must be valid JSON');
      return;
    }
    this.createBusy.set(true);
    this.api
      .create(oid, {
        name: this.createName.trim(),
        description: this.createDescription.trim() || null,
        stepsJson,
        scope: ws ? 'WORKSPACE' : 'ORG',
        workspaceId: ws ?? null,
      })
      .subscribe({
        next: (w) => {
          this.aiStore.upsertWorkflow(w);
          this.notify.success('Workflow created');
          this.createBusy.set(false);
          void this.router.navigate(['/ai/workflows', w.id], { replaceUrl: true });
        },
        error: () => { this.createBusy.set(false); this.notify.error('Create failed'); },
      });
  }

  private stepDetail(type: string, raw: Record<string, unknown>): string {
    switch (type) {
      case 'TOOL': {
        const tool = raw['tool'] || 'unknown tool';
        return `Call ${tool}`;
      }
      case 'LLM': {
        const pid = raw['promptTemplateId'];
        return pid ? `Run prompt template ${pid}` : 'Run LLM with inline prompt';
      }
      case 'PROPOSE_ACTION': {
        const at = raw['actionType'] || 'action';
        return `Propose ${at} for human approval`;
      }
      default:
        return JSON.stringify(raw).slice(0, 120);
    }
  }
}
