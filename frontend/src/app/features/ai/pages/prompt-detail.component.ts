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
import { map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule, MatDrawer } from '@angular/material/sidenav';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import {
  AiPromptTemplate,
  LlmCallPurpose,
  OutputFormat,
} from '../models/ai.models';
import { AiPromptsApiService } from '../services/ai-prompts-api.service';
import { AiStore } from '../store/ai.store';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '../../../core/services/notification.service';
import { JsonViewerComponent } from '../components/json-viewer.component';

interface PurposeOption {
  value: LlmCallPurpose;
  label: string;
  hint: string;
}

const PURPOSE_OPTIONS: PurposeOption[] = [
  { value: 'CHAT', label: 'Chat', hint: 'Open-ended conversational prompt' },
  { value: 'SUMMARIZE', label: 'Summarise', hint: 'Condense text into a concise summary' },
  { value: 'EXTRACT', label: 'Extract', hint: 'Pull structured fields from unstructured text' },
  { value: 'CLASSIFY', label: 'Classify', hint: 'Categorise input into predefined labels' },
  { value: 'GENERATE', label: 'Generate', hint: 'Create new content (copy, headlines, templates)' },
  { value: 'PLAN', label: 'Plan', hint: 'Multi-step reasoning to produce strategy' },
  { value: 'TOOL_ROUTING', label: 'Tool Routing', hint: 'Internal — decides which agent tools to invoke' },
];

@Component({
  selector: 'app-prompt-detail',
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
    MatSnackBarModule,
    MatTooltipModule,
    JsonViewerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-drawer-container class="drawer-wrap" [hasBackdrop]="true">
      <!-- ===== RUN DRAWER ===== -->
      <mat-drawer #runDrawer mode="over" position="end" class="run-drawer">
        <div class="drawer-head">
          <h2>Run prompt</h2>
          <button mat-icon-button type="button" (click)="closeRun()"><mat-icon>close</mat-icon></button>
        </div>

        <div class="drawer-intro">
          <p>
            Execute this prompt template against an LLM provider configured for your workspace.
            Provide input values as JSON matching the template's <code>{{'{{variables}}'}}</code>.
          </p>
        </div>

        <div class="drawer-body">
          <mat-form-field appearance="outline" class="full">
            <mat-label>Input JSON</mat-label>
            <textarea matInput rows="8" [(ngModel)]="runInputJson" placeholder='{ "key": "value" }'></textarea>
            <mat-hint>
              JSON object whose keys match the <code>{{'{{variable}}'}}</code> placeholders in your user prompt template
            </mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Provider override (optional)</mat-label>
            <input matInput [(ngModel)]="runProviderOverride" placeholder="Leave blank to use workspace default" />
            <mat-hint>UUID of an AI provider config — leave empty to use the workspace's default provider</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full">
            <mat-label>Model override (optional)</mat-label>
            <input matInput [(ngModel)]="runModelOverride" placeholder="e.g. gpt-4o, sonar-medium-online" />
            <mat-hint>Override the default model — e.g. <code>gpt-4o</code>, <code>sonar-medium-online</code></mat-hint>
          </mat-form-field>

          @if (!workspaceId()) {
            <div class="run-warn">
              <mat-icon>warning</mat-icon>
              <span>Select a <strong>workspace</strong> from the top bar before running a prompt.</span>
            </div>
          }

          <button
            mat-flat-button
            color="primary"
            (click)="executeRun()"
            [disabled]="runBusy() || !workspaceId()"
          >
            @if (runBusy()) { <mat-spinner diameter="20" /> } @else { Execute }
          </button>

          @if (lastRun()) {
            <mat-card class="run-out">
              <h3>Output</h3>
              @if (lastRun()!.outputText) {
                <pre class="out-text">{{ lastRun()!.outputText }}</pre>
              }
              @if (lastRun()!.outputJson) {
                <app-json-viewer [json]="lastRun()!.outputJson!" />
              }
              @if (lastRun()!.errorMessage) {
                <div class="run-error">
                  <mat-icon>error_outline</mat-icon>
                  <span>{{ lastRun()!.errorMessage }}</span>
                </div>
              }
              <div class="run-meta">
                @if (lastRun()!.latencyMs != null) { <span>Latency: {{ lastRun()!.latencyMs }} ms</span> }
                @if (lastRun()!.tokenUsageJson) { <span>Tokens: {{ lastRun()!.tokenUsageJson }}</span> }
                <span>Status: {{ lastRun()!.status }}</span>
                @if (lastRun()!.model) { <span>Model: {{ lastRun()!.model }}</span> }
              </div>
            </mat-card>
          }
        </div>
      </mat-drawer>

      <!-- ===== MAIN CONTENT ===== -->
      <mat-drawer-content>
        <div class="page">
          @if (!orgId()) {
            <div class="hint-empty">
              <mat-icon>business</mat-icon>
              <h2>Select an organization</h2>
              <p>Choose an organization from the top bar to create or edit prompt templates.</p>
            </div>
          } @else if (loading()) {
            <div class="centered"><mat-spinner diameter="40" /></div>
          } @else {
            <!-- TOOLBAR -->
            <div class="toolbar">
              <button mat-button routerLink="/ai/prompts"><mat-icon>arrow_back</mat-icon> Prompt Library</button>
              @if (isNew()) {
                <span class="crumb">New template</span>
              } @else if (model()) {
                <span class="crumb">{{ model()!.name }}</span>
                <mat-chip [class]="'status-' + (model()!.status || '').toLowerCase()" class="crumb-chip">{{ model()!.status }}</mat-chip>
              }
            </div>

            <!-- INTRO (create only) -->
            @if (isNew()) {
              <div class="create-intro">
                <mat-icon>auto_awesome</mat-icon>
                <div>
                  <strong>Create a new prompt template</strong>
                  <p>
                    Define a reusable instruction set for the AI model. Each template has a <em>system prompt</em>
                    (the model's role and rules), a <em>user prompt template</em> (with <code>{{'{{variables}}'}}</code>
                    filled at runtime), and optional <em>guardrails</em>. After saving, submit it for review —
                    only <strong>Approved</strong> templates are available in AI Chat and Workflows.
                  </p>
                </div>
              </div>
            }

            <!-- STATUS LIFECYCLE (edit view) -->
            @if (!isNew() && model()) {
              <div class="lifecycle-bar">
                <div class="lc-step" [class.active]="model()!.status === 'DRAFT'">
                  <span class="lc-dot draft"></span> Draft
                </div>
                <mat-icon class="lc-arrow">arrow_forward</mat-icon>
                <div class="lc-step" [class.active]="model()!.status === 'APPROVED'">
                  <span class="lc-dot approved"></span> Approved
                </div>
                <mat-icon class="lc-arrow">arrow_forward</mat-icon>
                <div class="lc-step" [class.active]="model()!.status === 'ARCHIVED'">
                  <span class="lc-dot archived"></span> Archived
                </div>
              </div>
            }

            <!-- FORM -->
            <mat-card class="form-card">
              <div class="form-head">
                <h1>{{ isNew() ? 'Create prompt' : 'Prompt template' }}</h1>
                <div class="head-actions">
                  @if (!readOnly() && !isNew()) {
                    <button mat-stroked-button color="primary" type="button" (click)="openRun()"
                            [disabled]="!workspaceId()"
                            matTooltip="Execute this template against an LLM and inspect the output">
                      <mat-icon>play_arrow</mat-icon> Run Prompt
                    </button>
                  }
                </div>
              </div>

              <div class="form-grid" [class.readonly]="readOnly()">
                <!-- Name -->
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Name</mat-label>
                  <input matInput [(ngModel)]="name" [readonly]="readOnly()" placeholder="e.g. Rewrite copy for compliance" />
                  <mat-hint>A short, descriptive name — visible in dropdowns and the prompt library</mat-hint>
                </mat-form-field>

                <!-- Description -->
                <mat-form-field appearance="outline" class="full">
                  <mat-label>Description</mat-label>
                  <textarea matInput rows="2" [(ngModel)]="description" [readonly]="readOnly()"
                            placeholder="Explain what this prompt does and when to use it"></textarea>
                  <mat-hint>Helps teammates understand the prompt's purpose without reading the full template</mat-hint>
                </mat-form-field>

                <!-- Purpose -->
                <mat-form-field appearance="outline">
                  <mat-label>Purpose</mat-label>
                  <mat-select [(ngModel)]="purpose" [disabled]="readOnly()">
                    @for (p of purposeOptions; track p.value) {
                      <mat-option [value]="p.value">{{ p.label }} — {{ p.hint }}</mat-option>
                    }
                  </mat-select>
                  <mat-hint>{{ activePurposeHint() }}</mat-hint>
                </mat-form-field>

                <!-- Output format -->
                <mat-form-field appearance="outline">
                  <mat-label>Output format</mat-label>
                  <mat-select [(ngModel)]="outputFormat" [disabled]="readOnly()">
                    <mat-option value="TEXT">TEXT — Free-form prose</mat-option>
                    <mat-option value="JSON">JSON — Structured data</mat-option>
                  </mat-select>
                  <mat-hint>
                    @if (outputFormat === 'JSON') {
                      The model will return structured JSON you can parse programmatically
                    } @else {
                      The model will return plain-text output
                    }
                  </mat-hint>
                </mat-form-field>

                <!-- System prompt -->
                <div class="full field-group">
                  <div class="field-label-row">
                    <label>System prompt</label>
                    <span class="field-help"
                          matTooltip="Sets the model's role, personality, and constraints. This is always sent first, before the user message.">
                      <mat-icon>help_outline</mat-icon> What is this?
                    </span>
                  </div>
                  <mat-form-field appearance="outline" class="full">
                    <textarea matInput rows="6" [(ngModel)]="systemPrompt" [readonly]="readOnly()"
                              placeholder="You are a marketing copywriter. Always follow brand voice guidelines. Never disclose internal data."></textarea>
                    <mat-hint>Defines the model's role and constraints. Example: "You are a marketing analyst. Always cite data sources."</mat-hint>
                  </mat-form-field>
                </div>

                <!-- User prompt template -->
                <div class="full field-group">
                  <div class="field-label-row">
                    <label>User prompt template</label>
                    <span class="field-help"
                          [matTooltip]="userPromptTooltip">
                      <mat-icon>help_outline</mat-icon> How do variables work?
                    </span>
                  </div>
                  <mat-form-field appearance="outline" class="full">
                    <textarea matInput rows="6" [(ngModel)]="userPromptTemplate" [readonly]="readOnly()"
                              [placeholder]="userPromptPlaceholder"></textarea>
                    <mat-hint>
                      Use <code>{{'{{variableName}}'}}</code> for dynamic values filled from input JSON at runtime
                    </mat-hint>
                  </mat-form-field>
                </div>

                <!-- Guardrails -->
                <div class="full field-group">
                  <div class="field-label-row">
                    <label>Guardrails (optional)</label>
                    <span class="field-help"
                          matTooltip="Extra constraints appended to the prompt. Use these to set boundaries the model should not cross — e.g. forbidden topics, output length limits.">
                      <mat-icon>help_outline</mat-icon> When to use?
                    </span>
                  </div>
                  <mat-form-field appearance="outline" class="full">
                    <textarea matInput rows="3" [(ngModel)]="guardrailsText" [readonly]="readOnly()"
                              placeholder="Do not mention competitor names. Keep response under 200 words."></textarea>
                    <mat-hint>Additional constraints appended to the prompt — e.g. "Keep response under 200 words"</mat-hint>
                  </mat-form-field>
                </div>

                <!-- Tags -->
                <div class="full field-group">
                  <div class="field-label-row">
                    <label>Tags</label>
                    <span class="field-help"
                          matTooltip="Free-form labels for filtering prompts in the library. Press Enter or comma to add.">
                      <mat-icon>help_outline</mat-icon>
                    </span>
                  </div>
                  <mat-chip-grid #chipGrid [disabled]="readOnly()">
                    @for (tag of tagList(); track tag) {
                      <mat-chip-row (removed)="removeTag(tag)">{{ tag }}<button matChipRemove><mat-icon>cancel</mat-icon></button></mat-chip-row>
                    }
                    <input
                      placeholder="Add tag, press Enter"
                      [matChipInputFor]="chipGrid"
                      [matChipInputSeparatorKeyCodes]="separatorKeys"
                      (matChipInputTokenEnd)="addTag($event)"
                    />
                  </mat-chip-grid>
                </div>
              </div>

              <!-- ACTIONS -->
              @if (!readOnly()) {
                <div class="actions">
                  <button mat-flat-button color="primary" (click)="save()" [disabled]="saveBusy()"
                          matTooltip="Save changes to the prompt template">
                    @if (saveBusy()) { <mat-spinner diameter="18" /> } @else { Save }
                  </button>
                  @if (!isNew() && canSubmit()) {
                    <button mat-stroked-button (click)="submitTpl()" [disabled]="actionBusy()"
                            matTooltip="Submit this draft for review. Once approved, it becomes available in Chat and Workflows.">
                      Submit for review
                    </button>
                  }
                  @if (!isNew() && canApprove()) {
                    <button mat-stroked-button color="accent" (click)="approveTpl()" [disabled]="actionBusy()"
                            matTooltip="Approve this template — makes it available for AI Chat, Workflows, and the Prompt Runner">
                      Approve
                    </button>
                    <button mat-stroked-button (click)="archiveTpl()" [disabled]="actionBusy()"
                            matTooltip="Archive this template — removes it from active use but keeps it for reference">
                      Archive
                    </button>
                  }
                </div>
              }

              @if (readOnly() && !isNew()) {
                <div class="readonly-hint">
                  <mat-icon>lock</mat-icon>
                  <span>You have <strong>read-only</strong> access to this prompt. Editors and admins can modify it.</span>
                </div>
              }
            </mat-card>

            <!-- ===== HOW TO USE THIS TEMPLATE ===== -->
            @if (!isNew() && model()) {
              <section class="usage-section">
                <h2 class="usage-title"><mat-icon>integration_instructions</mat-icon> How to use this template</h2>
                <p class="usage-intro">
                  Once <strong>Approved</strong>, this prompt template can be consumed across the platform.
                  Here are all the ways it connects to the app:
                </p>

                <!-- consumption paths -->
                <div class="usage-grid">
                  <!-- 1 · Run Prompt (inline) -->
                  <div class="usage-card">
                    <div class="uc-head"><mat-icon>play_circle</mat-icon><strong>Run Prompt (this page)</strong></div>
                    <p>
                      Click <strong>Run Prompt</strong> in the top-right to execute this template right here.
                      Provide your input JSON and see the model's output instantly.
                    </p>
                    @if (!readOnly()) {
                      <button mat-stroked-button color="primary" type="button" (click)="openRun()"
                              [disabled]="!workspaceId() || model()!.status !== 'APPROVED'" class="uc-action">
                        <mat-icon>play_arrow</mat-icon> Run now
                      </button>
                    }
                    @if (model()!.status !== 'APPROVED') {
                      <span class="uc-note">Template must be Approved before it can be run.</span>
                    }
                  </div>

                  <!-- 2 · AI Agent Chat -->
                  <div class="usage-card">
                    <div class="uc-head"><mat-icon>chat</mat-icon><strong>AI Agent Chat</strong></div>
                    <p>
                      In <strong>Tool-assisted</strong> mode, the chat agent automatically picks relevant
                      prompt templates based on your message. You can also reference this template by name.
                    </p>
                    <a mat-stroked-button routerLink="/ai/chat" class="uc-action">
                      <mat-icon>open_in_new</mat-icon> Open AI Chat
                    </a>
                    <div class="sample-chat">
                      <span class="sample-label">Sample conversation</span>
                      <div class="sample-msg user"><strong>You:</strong> {{ sampleChatUser() }}</div>
                      <div class="sample-msg assistant"><strong>Agent:</strong> {{ sampleChatAssistant() }}</div>
                    </div>
                  </div>

                  <!-- 3 · Workflows -->
                  <div class="usage-card">
                    <div class="uc-head"><mat-icon>account_tree</mat-icon><strong>Workflows</strong></div>
                    <p>
                      Add an <strong>LLM step</strong> in any workflow and reference this template by ID.
                      The workflow runner fills in variables from previous step outputs automatically.
                    </p>
                    <a mat-stroked-button routerLink="/ai/workflows" class="uc-action">
                      <mat-icon>open_in_new</mat-icon> Open Workflows
                    </a>
                    <div class="sample-code">
                      <span class="sample-label">Workflow step example</span>
                      <pre>{{ workflowStepSnippet() }}</pre>
                    </div>
                  </div>

                  <!-- 4 · Governance Rewrite -->
                  <div class="usage-card">
                    <div class="uc-head"><mat-icon>verified</mat-icon><strong>Governance AI Rewrite</strong></div>
                    <p>
                      The <code>POST /governance/ai/rewrite</code> endpoint uses approved
                      <em>Generate</em>-purpose prompts to rewrite copy so it passes compliance checks.
                    </p>
                    <a mat-stroked-button routerLink="/governance" class="uc-action">
                      <mat-icon>open_in_new</mat-icon> Go to Governance
                    </a>
                  </div>

                  <!-- 5 · API / AiFacade -->
                  <div class="usage-card full-span">
                    <div class="uc-head"><mat-icon>code</mat-icon><strong>Programmatic API (AiFacade)</strong></div>
                    <p>
                      Any backend module can call <code>AiFacade.runPrompt()</code> with this template's
                      name or ID. The facade handles provider selection, safety redaction, and auditing.
                    </p>
                    <div class="sample-code">
                      <span class="sample-label">Java / Spring usage</span>
                      <pre>{{ apiFacadeSnippet() }}</pre>
                    </div>
                    <div class="sample-code">
                      <span class="sample-label">REST API call</span>
                      <pre>{{ restApiSnippet() }}</pre>
                    </div>
                  </div>
                </div>
              </section>

              <!-- sample input/output for this specific prompt -->
              <section class="sample-section">
                <h2 class="usage-title"><mat-icon>science</mat-icon> Sample input &amp; expected output</h2>
                <p class="usage-intro">
                  Based on this template's purpose (<strong>{{ purposeLabel() }}</strong>)
                  and output format (<strong>{{ model()!.outputFormat }}</strong>), here's what a typical
                  run looks like. Use the <strong>Run Prompt</strong> button to try it live.
                </p>
                <div class="sample-io">
                  <div class="sio-block">
                    <span class="sio-label"><mat-icon>input</mat-icon> Sample input JSON</span>
                    <pre>{{ sampleInputJson() }}</pre>
                  </div>
                  <mat-icon class="sio-arrow">arrow_forward</mat-icon>
                  <div class="sio-block">
                    <span class="sio-label"><mat-icon>output</mat-icon> Expected output</span>
                    <pre>{{ sampleOutputText() }}</pre>
                  </div>
                </div>
                @if (!readOnly()) {
                  <button mat-flat-button color="primary" (click)="prefillAndRun()" [disabled]="!workspaceId() || model()!.status !== 'APPROVED'" class="try-btn">
                    <mat-icon>play_arrow</mat-icon> Try with sample input
                  </button>
                }
              </section>
            }

            <!-- TIPS -->
            <div class="tips-bar">
              <mat-icon>lightbulb</mat-icon>
              <div>
                <strong>Tips for effective prompts</strong>
                <ul>
                  <li>Be specific in the system prompt — tell the model its role and constraints upfront.</li>
                  <li>Use <code>{{'{{variables}}'}}</code> in the user template for dynamic inputs (e.g. <code>{{'{{campaign_name}}'}}</code>).</li>
                  <li>Add guardrails for safety: word limits, forbidden topics, required formatting.</li>
                  <li>Choose <strong>JSON</strong> output format when downstream code needs to parse the result.</li>
                  <li>Tag templates so they're easy to find — e.g. <em>ads</em>, <em>governance</em>, <em>research</em>.</li>
                </ul>
              </div>
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
    .run-drawer { width: min(480px, 100vw); padding: 16px; }
    .drawer-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
    .drawer-intro { margin-bottom: 14px; }
    .drawer-intro p { font-size: 13px; color: #4b5563; line-height: 1.5; margin: 0; }
    .drawer-intro code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
    .drawer-body .full { width: 100%; margin-bottom: 10px; }
    .run-warn {
      display: flex; gap: 8px; align-items: center; padding: 10px 12px; margin-bottom: 10px;
      background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 12px; color: #92400e;
    }
    .run-warn mat-icon { font-size: 18px; width: 18px; height: 18px; color: #d97706; flex-shrink: 0; }
    .run-out { margin-top: 16px; padding: 12px !important; }
    .run-out h3 { margin: 0 0 8px; font-size: 14px; }
    .out-text { white-space: pre-wrap; font-size: 13px; margin: 0; }
    .run-error { display: flex; gap: 8px; align-items: flex-start; margin-top: 10px; padding: 8px 10px; background: #fef2f2; border-radius: 6px; }
    .run-error mat-icon { color: #dc2626; font-size: 18px; width: 18px; height: 18px; margin-top: 1px; }
    .run-error span { font-size: 12px; color: #991b1b; line-height: 1.4; }
    .run-meta { margin-top: 8px; font-size: 12px; color: #6b7280; display: flex; flex-direction: column; gap: 4px; }

    /* page */
    .page { padding: 16px 20px 40px; max-width: 900px; margin: 0 auto; }
    .hint-empty { text-align: center; padding: 48px 24px; }
    .hint-empty mat-icon { font-size: 52px; width: 52px; height: 52px; color: #3f51b5; opacity: .7; margin-bottom: 12px; }
    .hint-empty h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
    .hint-empty p { margin: 0; color: #6b7280; font-size: 14px; }
    .centered { display: flex; justify-content: center; padding: 48px; }

    /* toolbar */
    .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .crumb { font-weight: 600; color: #374151; }
    .crumb-chip { font-size: 11px !important; min-height: 22px !important; padding: 0 8px !important; }
    mat-chip.status-draft { --mdc-chip-container-color: #e0e7ff; color: #3730a3; }
    mat-chip.status-approved { --mdc-chip-container-color: #dcfce7; color: #166534; }
    mat-chip.status-archived { --mdc-chip-container-color: #f3f4f6; color: #6b7280; }

    /* create intro */
    .create-intro {
      display: flex; gap: 14px; align-items: flex-start; padding: 16px 18px; margin-bottom: 16px;
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;
    }
    .create-intro mat-icon { font-size: 24px; width: 24px; height: 24px; color: #16a34a; flex-shrink: 0; margin-top: 2px; }
    .create-intro strong { display: block; font-size: 14px; margin-bottom: 4px; }
    .create-intro p { margin: 0; font-size: 13px; color: #374151; line-height: 1.5; }
    .create-intro em { font-style: normal; font-weight: 500; }
    .create-intro code { background: #dcfce7; padding: 1px 5px; border-radius: 4px; font-size: 12px; }

    /* lifecycle bar */
    .lifecycle-bar {
      display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
      padding: 12px 16px; background: #f9fafb; border: 1px solid rgba(0,0,0,.06); border-radius: 10px;
    }
    .lc-step { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #9ca3af; font-weight: 500; }
    .lc-step.active { color: #111; font-weight: 600; }
    .lc-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
    .lc-dot.draft { background: #818cf8; }
    .lc-dot.approved { background: #22c55e; }
    .lc-dot.archived { background: #d1d5db; }
    .lc-arrow { font-size: 18px; width: 18px; height: 18px; color: #d1d5db; }

    /* form card */
    .form-card { padding: 20px !important; }
    .form-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 1.35rem; font-weight: 700; }
    .head-actions { display: flex; gap: 8px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-grid .full { grid-column: 1 / -1; }
    @media (max-width: 700px) { .form-grid { grid-template-columns: 1fr; } }

    .field-group { display: flex; flex-direction: column; gap: 0; }
    .field-label-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .field-label-row label { font-size: 13px; font-weight: 600; color: #374151; }
    .field-help { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: #9ca3af; cursor: help; }
    .field-help mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; align-items: center; }
    .readonly .mat-mdc-input-element { color: #374151; }

    .readonly-hint {
      display: flex; gap: 8px; align-items: center; margin-top: 16px; padding: 10px 12px;
      background: #f3f4f6; border-radius: 8px; font-size: 12px; color: #6b7280;
    }
    .readonly-hint mat-icon { font-size: 16px; width: 16px; height: 16px; color: #9ca3af; }

    /* usage section */
    .usage-section, .sample-section { margin-top: 24px; }
    .usage-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 17px; font-weight: 700; margin: 0 0 6px; color: #111;
    }
    .usage-title mat-icon { font-size: 22px; width: 22px; height: 22px; color: #3f51b5; }
    .usage-intro { margin: 0 0 16px; font-size: 14px; color: #4b5563; line-height: 1.5; }
    .usage-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px;
    }
    .usage-card {
      padding: 16px 18px; border: 1px solid rgba(0,0,0,.08); border-radius: 10px; background: #fafbfc;
    }
    .usage-card.full-span { grid-column: 1 / -1; }
    .uc-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .uc-head mat-icon { font-size: 20px; width: 20px; height: 20px; color: #3f51b5; }
    .uc-head strong { font-size: 14px; }
    .usage-card p { margin: 0 0 10px; font-size: 13px; color: #4b5563; line-height: 1.45; }
    .usage-card code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
    .uc-action { margin-bottom: 10px; font-size: 12px !important; }
    .uc-action mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .uc-note { display: block; font-size: 11px; color: #9ca3af; font-style: italic; }

    .sample-chat { margin-top: 10px; }
    .sample-label {
      display: block; font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .04em; color: #6b7280; margin-bottom: 6px;
    }
    .sample-msg {
      padding: 8px 12px; border-radius: 8px; margin-bottom: 6px;
      font-size: 13px; line-height: 1.45;
    }
    .sample-msg.user { background: #e8eaf6; color: #1a237e; }
    .sample-msg.assistant { background: #f0fdf4; color: #14532d; }
    .sample-msg strong { font-size: 11px; text-transform: uppercase; letter-spacing: .03em; display: block; margin-bottom: 2px; }

    .sample-code { margin-top: 10px; }
    .sample-code pre {
      margin: 0; padding: 10px 12px; background: #1e293b; color: #e2e8f0;
      border-radius: 8px; font-size: 12px; line-height: 1.5; overflow-x: auto;
      white-space: pre-wrap; word-break: break-word;
    }

    /* sample IO */
    .sample-io {
      display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 14px;
    }
    .sio-block { flex: 1; min-width: 250px; }
    .sio-label {
      display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600;
      color: #374151; margin-bottom: 6px;
    }
    .sio-label mat-icon { font-size: 16px; width: 16px; height: 16px; color: #6b7280; }
    .sio-block pre {
      margin: 0; padding: 10px 12px; background: #f8fafc; border: 1px solid rgba(0,0,0,.08);
      border-radius: 8px; font-size: 12px; line-height: 1.5; overflow-x: auto;
      white-space: pre-wrap; word-break: break-word;
    }
    .sio-arrow { font-size: 24px; width: 24px; height: 24px; color: #d1d5db; margin-top: 32px; flex-shrink: 0; }
    @media (max-width: 600px) { .sio-arrow { display: none; } }
    .try-btn mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    /* tips */
    .tips-bar {
      display: flex; gap: 14px; align-items: flex-start; margin-top: 24px; padding: 16px 18px;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
    }
    .tips-bar mat-icon { color: #2563eb; font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; margin-top: 2px; }
    .tips-bar strong { display: block; font-size: 14px; margin-bottom: 6px; color: #1e3a5f; }
    .tips-bar ul { margin: 0; padding-left: 18px; font-size: 13px; color: #1e3a5f; line-height: 1.55; }
    .tips-bar code { background: #dbeafe; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
    .tips-bar em { font-style: normal; color: #3b82f6; }
  `],
})
export class PromptDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orgStore = inject(AdminStore);
  private aiStore = inject(AiStore);
  private api = inject(AiPromptsApiService);
  private notify = inject(NotificationService);

  readonly runDrawer = viewChild<MatDrawer>('runDrawer');

  readonly orgId = this.orgStore.selectedOrgId;
  readonly workspaceId = this.orgStore.selectedWorkspaceId;

  readonly loading = signal(true);
  readonly saveBusy = signal(false);
  readonly actionBusy = signal(false);
  readonly runBusy = signal(false);
  readonly promptId = signal<string | null>(null);
  readonly model = signal<AiPromptTemplate | null>(null);
  readonly lastRun = signal<import('../models/ai.models').AiPromptRun | null>(null);

  private readonly promptIdParam = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('promptId'))),
    { initialValue: this.route.snapshot.paramMap.get('promptId') },
  );

  readonly separatorKeys = [ENTER, COMMA];
  readonly purposeOptions = PURPOSE_OPTIONS;

  name = '';
  description = '';
  purpose: LlmCallPurpose = 'GENERATE';
  outputFormat: OutputFormat = 'TEXT';
  systemPrompt = '';
  userPromptTemplate = '';
  guardrailsText = '';
  private _tags = signal<string[]>([]);
  readonly tagList = this._tags.asReadonly();

  runInputJson = '{}';
  runProviderOverride = '';
  runModelOverride = '';

  readonly formats: OutputFormat[] = ['TEXT', 'JSON'];

  readonly userPromptPlaceholder = 'Rewrite the following ad copy for {{platform}} in {{language}}:\n\n{{original_copy}}';
  readonly userPromptTooltip = 'The message sent on behalf of the user. Use {{variable}} placeholders that are filled at runtime from the input JSON.';

  private readonly SAMPLE_CHATS: Record<LlmCallPurpose, { user: string; assistant: string }> = {
    GENERATE: {
      user: 'Generate 3 ad-copy variants for our new product launch on Instagram',
      assistant: 'I\'ll use the "' + '{{promptName}}' + '" template. Here are 3 variants tailored for Instagram, following your brand voice guidelines...',
    },
    SUMMARIZE: {
      user: 'Summarise the latest research insights for our Q3 campaign',
      assistant: 'Using the "' + '{{promptName}}' + '" template, I pulled your workspace research snapshots. Here\'s a concise summary...',
    },
    EXTRACT: {
      user: 'Extract key metrics from this campaign report',
      assistant: 'I\'ll run the "' + '{{promptName}}' + '" extraction template on your report. Here are the structured fields I found...',
    },
    CLASSIFY: {
      user: 'Classify the sentiment of our latest customer reviews',
      assistant: 'Running "' + '{{promptName}}' + '" against the reviews — here\'s each review categorised as positive, neutral, or negative...',
    },
    CHAT: {
      user: 'Help me brainstorm tagline ideas for our sustainability campaign',
      assistant: 'Great topic! Based on your brand voice profile, here are some tagline directions to explore...',
    },
    PLAN: {
      user: 'Create a 4-week content plan for our product launch',
      assistant: 'Using "' + '{{promptName}}' + '" to build a structured plan. Here\'s a week-by-week breakdown with content types and channels...',
    },
    TOOL_ROUTING: {
      user: 'Show me active campaigns and check their compliance',
      assistant: 'I\'ll route this to the campaign listing tool and then run a governance check on each active campaign...',
    },
  };

  private readonly SAMPLE_INPUTS: Record<LlmCallPurpose, string> = {
    GENERATE: '{\n  "topic": "Product launch",\n  "platform": "Instagram",\n  "tone": "Energetic"\n}',
    SUMMARIZE: '{\n  "source_text": "Full report text here...",\n  "max_length": 200\n}',
    EXTRACT: '{\n  "document": "Campaign report content...",\n  "fields": ["impressions", "CTR", "spend"]\n}',
    CLASSIFY: '{\n  "text": "Customer review text...",\n  "categories": ["positive", "neutral", "negative"]\n}',
    CHAT: '{\n  "context": "Sustainability campaign",\n  "brand": "EcoTech"\n}',
    PLAN: '{\n  "campaign_name": "Product Launch",\n  "duration_weeks": 4,\n  "channels": ["social", "email"]\n}',
    TOOL_ROUTING: '{\n  "user_intent": "list campaigns",\n  "available_tools": ["ads.listCampaigns"]\n}',
  };

  private readonly SAMPLE_OUTPUTS_TEXT: Record<LlmCallPurpose, string> = {
    GENERATE: 'Variant 1: "Launch into something extraordinary."\nVariant 2: "Your next favourite — now live."\nVariant 3: "Made for moments that matter."',
    SUMMARIZE: 'Key findings: Organic reach increased 23% QoQ. Top-performing content type was short-form video. Recommended action: increase video budget by 15%.',
    EXTRACT: '{\n  "impressions": 142000,\n  "CTR": "3.2%",\n  "spend": "$4,200"\n}',
    CLASSIFY: '{\n  "sentiment": "positive",\n  "confidence": 0.92\n}',
    CHAT: '1. "Green by design, sustainable by choice"\n2. "Tomorrow\'s tech, today\'s values"\n3. "Innovation meets responsibility"',
    PLAN: 'Week 1: Teaser content on social\nWeek 2: Email campaign + blog post\nWeek 3: Launch day — paid social + PR\nWeek 4: Retargeting + UGC collection',
    TOOL_ROUTING: '{\n  "tool": "ads.listCampaigns",\n  "input": { "status": "ACTIVE", "limit": 20 }\n}',
  };

  readonly isNew = computed(() => this.promptId() === 'new');

  readonly activePurposeHint = computed(() => {
    const found = PURPOSE_OPTIONS.find((p) => p.value === this.purpose);
    return found ? found.hint : '';
  });

  readonly readOnly = computed(() => {
    if (this.isNew()) return false;
    const org = this.orgStore.selectedOrgId() ?? undefined;
    const ws = this.orgStore.selectedWorkspaceId() ?? undefined;
    return !(
      this.orgStore.hasRole('ORG_ADMIN', org, ws) ||
      this.orgStore.hasRole('WORKSPACE_ADMIN', org, ws) ||
      this.orgStore.hasRole('EDITOR', org, ws)
    );
  });

  readonly canSubmit = computed(() => {
    const org = this.orgStore.selectedOrgId() ?? undefined;
    const ws = this.orgStore.selectedWorkspaceId() ?? undefined;
    return (
      this.orgStore.hasRole('ORG_ADMIN', org, ws) ||
      this.orgStore.hasRole('WORKSPACE_ADMIN', org, ws) ||
      this.orgStore.hasRole('EDITOR', org, ws)
    );
  });

  readonly canApprove = computed(() => {
    const org = this.orgStore.selectedOrgId() ?? undefined;
    const ws = this.orgStore.selectedWorkspaceId() ?? undefined;
    return (
      this.orgStore.hasRole('ORG_ADMIN', org, ws) ||
      this.orgStore.hasRole('WORKSPACE_ADMIN', org, ws) ||
      this.orgStore.hasRole('APPROVER', org, ws)
    );
  });

  constructor() {
    effect(() => {
      const id = this.promptIdParam();
      this.promptId.set(id);
      const oid = this.orgId();
      if (!oid || !id) {
        this.loading.set(false);
        return;
      }
      if (id === 'new') {
        this.resetNew();
        this.loading.set(false);
        return;
      }
      this.load(oid, id);
    }, { allowSignalWrites: true });
  }

  resetNew(): void {
    this.model.set(null);
    this.name = '';
    this.description = '';
    this.purpose = 'GENERATE';
    this.outputFormat = 'TEXT';
    this.systemPrompt = '';
    this.userPromptTemplate = '';
    this.guardrailsText = '';
    this._tags.set([]);
  }

  private load(orgId: string, id: string): void {
    this.loading.set(true);
    this.api.get(orgId, id).subscribe({
      next: (t) => {
        this.model.set(t);
        this.patchForm(t);
        this.aiStore.upsertPromptTemplate(t);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load prompt');
      },
    });
  }

  private patchForm(t: AiPromptTemplate): void {
    this.name = t.name;
    this.description = t.description ?? '';
    this.purpose = t.purpose;
    this.outputFormat = t.outputFormat;
    this.systemPrompt = t.systemPrompt;
    this.userPromptTemplate = t.userPromptTemplate;
    this.guardrailsText = t.guardrailsText ?? '';
    this._tags.set(this.parseTags(t.tags));
  }

  parseTags(raw: string | null): string[] {
    if (!raw?.trim()) return [];
    try {
      const j = JSON.parse(raw) as unknown;
      if (Array.isArray(j)) return j.map(String).filter(Boolean);
    } catch { /* ignore */ }
    return raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }

  serializeTags(): string {
    return JSON.stringify(this._tags());
  }

  addTag(ev: MatChipInputEvent): void {
    const v = (ev.value ?? '').trim();
    if (!v || this._tags().includes(v)) return;
    this._tags.update((t) => [...t, v]);
    ev.chipInput!.clear();
  }

  removeTag(tag: string): void {
    this._tags.update((t) => t.filter((x) => x !== tag));
  }

  save(): void {
    const oid = this.orgId();
    if (!oid || this.readOnly()) return;
    const ws = this.workspaceId();
    this.saveBusy.set(true);
    if (this.isNew()) {
      this.api
        .create(oid, {
          name: this.name.trim(),
          description: this.description || null,
          purpose: this.purpose,
          outputFormat: this.outputFormat,
          systemPrompt: this.systemPrompt,
          userPromptTemplate: this.userPromptTemplate,
          guardrailsText: this.guardrailsText || null,
          tags: this.serializeTags(),
          workspaceId: ws,
        })
        .subscribe({
          next: (t) => {
            this.aiStore.upsertPromptTemplate(t);
            this.notify.success('Prompt created');
            this.saveBusy.set(false);
            void this.router.navigate(['/ai/prompts', t.id], { replaceUrl: true });
          },
          error: () => {
            this.saveBusy.set(false);
            this.notify.error('Save failed');
          },
        });
    } else {
      const id = this.promptId();
      if (!id) return;
      this.api
        .patch(oid, id, {
          name: this.name.trim(),
          description: this.description || null,
          purpose: this.purpose,
          outputFormat: this.outputFormat,
          systemPrompt: this.systemPrompt,
          userPromptTemplate: this.userPromptTemplate,
          guardrailsText: this.guardrailsText || null,
          tags: this.serializeTags(),
        })
        .subscribe({
          next: (t) => {
            this.model.set(t);
            this.aiStore.upsertPromptTemplate(t);
            this.notify.success('Saved');
            this.saveBusy.set(false);
          },
          error: () => {
            this.saveBusy.set(false);
            this.notify.error('Save failed');
          },
        });
    }
  }

  submitTpl(): void {
    const oid = this.orgId();
    const id = this.promptId();
    if (!oid || !id || id === 'new') return;
    this.actionBusy.set(true);
    this.api.submit(oid, id).subscribe({
      next: (t) => {
        this.model.set(t);
        this.aiStore.upsertPromptTemplate(t);
        this.notify.success('Submitted for review');
        this.actionBusy.set(false);
      },
      error: () => {
        this.actionBusy.set(false);
        this.notify.error('Submit failed');
      },
    });
  }

  approveTpl(): void {
    const oid = this.orgId();
    const id = this.promptId();
    if (!oid || !id || id === 'new') return;
    this.actionBusy.set(true);
    this.api.approve(oid, id).subscribe({
      next: (t) => {
        this.model.set(t);
        this.aiStore.upsertPromptTemplate(t);
        this.notify.success('Approved');
        this.actionBusy.set(false);
      },
      error: () => {
        this.actionBusy.set(false);
        this.notify.error('Approve failed');
      },
    });
  }

  archiveTpl(): void {
    const oid = this.orgId();
    const id = this.promptId();
    if (!oid || !id || id === 'new') return;
    this.actionBusy.set(true);
    this.api.archive(oid, id).subscribe({
      next: (t) => {
        this.model.set(t);
        this.aiStore.upsertPromptTemplate(t);
        this.notify.success('Archived');
        this.actionBusy.set(false);
      },
      error: () => {
        this.actionBusy.set(false);
        this.notify.error('Archive failed');
      },
    });
  }

  purposeLabel(): string {
    const found = PURPOSE_OPTIONS.find((p) => p.value === this.model()?.purpose);
    return found ? found.label : this.model()?.purpose ?? '';
  }

  sampleChatUser(): string {
    const p = this.model()?.purpose ?? 'GENERATE';
    return this.SAMPLE_CHATS[p]?.user ?? this.SAMPLE_CHATS['GENERATE'].user;
  }

  sampleChatAssistant(): string {
    const p = this.model()?.purpose ?? 'GENERATE';
    const tpl = this.SAMPLE_CHATS[p]?.assistant ?? this.SAMPLE_CHATS['GENERATE'].assistant;
    return tpl.replace('{{promptName}}', this.model()?.name ?? 'this template');
  }

  workflowStepSnippet(): string {
    const id = this.model()?.id ?? '<prompt-template-id>';
    return `{
  "type": "LLM",
  "promptTemplateId": "${id}",
  "inputTemplate": {
    "topic": "{{previousStep.output.topic}}"
  }
}`;
  }

  apiFacadeSnippet(): string {
    const name = this.model()?.name ?? 'My Prompt';
    return `// In any Spring service
AiResult result = aiFacade.runPrompt(
    workspaceId,
    "${name}",
    Map.of("topic", "Product launch"),
    context
);
String output = result.getOutputText();`;
  }

  restApiSnippet(): string {
    const orgId = this.orgId() ?? '<org-id>';
    const id = this.model()?.id ?? '<prompt-id>';
    const wsId = this.workspaceId() ?? '<workspace-id>';
    return `POST /api/v1/orgs/${orgId}/ai/prompts/${id}/run?workspaceId=${wsId}
Content-Type: application/json
Authorization: Bearer <token>

{
  "inputJson": "{\\"topic\\": \\"Product launch\\"}",
  "modelOverride": null
}`;
  }

  sampleInputJson(): string {
    const p = this.model()?.purpose ?? 'GENERATE';
    return this.SAMPLE_INPUTS[p] ?? this.SAMPLE_INPUTS['GENERATE'];
  }

  sampleOutputText(): string {
    const p = this.model()?.purpose ?? 'GENERATE';
    return this.SAMPLE_OUTPUTS_TEXT[p] ?? this.SAMPLE_OUTPUTS_TEXT['GENERATE'];
  }

  prefillAndRun(): void {
    this.runInputJson = this.sampleInputJson();
    this.openRun();
  }

  openRun(): void {
    this.lastRun.set(null);
    this.runDrawer()?.open();
  }

  closeRun(): void {
    this.runDrawer()?.close();
  }

  executeRun(): void {
    const oid = this.orgId();
    const id = this.promptId();
    const ws = this.workspaceId();
    if (!oid || !id || id === 'new' || !ws) return;
    let inputJson = this.runInputJson.trim() || '{}';
    try {
      JSON.parse(inputJson);
    } catch {
      this.notify.error('Input must be valid JSON');
      return;
    }
    this.runBusy.set(true);
    this.api
      .run(oid, id, ws, {
        inputJson,
        providerOverrideId: this.runProviderOverride.trim() || null,
        modelOverride: this.runModelOverride.trim() || null,
      })
      .subscribe({
        next: (r) => {
          this.lastRun.set(r);
          this.runBusy.set(false);
        },
        error: () => {
          this.runBusy.set(false);
          this.notify.error('Run failed');
        },
      });
  }
}
