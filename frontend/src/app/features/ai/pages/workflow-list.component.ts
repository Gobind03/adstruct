import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiWorkflowDefinition } from '../models/ai.models';
import { AiWorkflowsApiService } from '../services/ai-workflows-api.service';
import { AiStore } from '../store/ai.store';
import { AdminStore } from '../../admin/store/admin.store';

interface StepTypeInfo {
  type: string;
  icon: string;
  label: string;
  description: string;
}

const STEP_TYPES: StepTypeInfo[] = [
  {
    type: 'TOOL',
    icon: 'build',
    label: 'Tool step',
    description: 'Call an internal tool — research insights, campaign data, governance checks, integration listings — and feed the output into subsequent steps.',
  },
  {
    type: 'LLM',
    icon: 'auto_awesome',
    label: 'LLM step',
    description: 'Run an approved Prompt Template against the configured LLM provider. Variables from previous steps are injected automatically.',
  },
  {
    type: 'PROPOSE_ACTION',
    icon: 'approval',
    label: 'Propose Action step',
    description: 'Create an Action Proposal that requires human approval before being applied — ensuring write operations are never auto-executed.',
  },
];

interface SampleWorkflow {
  name: string;
  description: string;
  icon: string;
  steps: string[];
}

const SAMPLE_WORKFLOWS: SampleWorkflow[] = [
  {
    name: 'Weekly Optimisation Brief',
    icon: 'insights',
    description: 'Gather latest research insights, pull active campaign metrics, then generate a summary brief with recommended next actions.',
    steps: ['TOOL: research.searchInsights', 'TOOL: ads.listCampaigns', 'LLM: Summarise findings'],
  },
  {
    name: 'Compliant Sponsored Snippets',
    icon: 'verified',
    description: 'Fetch brand profile and governance rules, generate ad-copy variants, run compliance checks, and propose approved drafts.',
    steps: ['TOOL: governance.getBrandProfile', 'LLM: Generate copy variants', 'TOOL: governance.runCheck', 'PROPOSE_ACTION: Create template drafts'],
  },
  {
    name: 'Competitive Research Digest',
    icon: 'search',
    description: 'Search workspace research snapshots, extract key themes, classify by topic, and produce a structured digest.',
    steps: ['TOOL: research.searchInsights', 'LLM: Extract themes', 'LLM: Classify topics', 'LLM: Generate digest'],
  },
];

@Component({
  selector: 'app-workflow-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <!-- ===== HEADER ===== -->
      <header class="page-header">
        <div>
          <h1>AI Workflows</h1>
          <p class="subtitle">
            Multi-step automated pipelines that chain tools, LLM prompts, and action proposals
            into a single, repeatable flow — from data gathering to content generation to
            approval-ready proposals.
          </p>
        </div>
        @if (canCreate()) {
          <button mat-flat-button color="primary" (click)="createStub()">
            <mat-icon>add</mat-icon>
            Create Workflow
          </button>
        }
      </header>

      @if (!orgId()) {
        <div class="welcome-empty">
          <mat-icon class="welcome-icon">account_tree</mat-icon>
          <h2>Select an organization</h2>
          <p>Choose an organization from the top bar to view and manage workflows.</p>
        </div>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (!workflows().length) {
        <!-- ===== ONBOARDING ===== -->
        <div class="onboard">
          <section class="what-section">
            <h2 class="sec-title">What are AI Workflows?</h2>
            <p class="sec-desc">
              A workflow is a sequence of <strong>steps</strong> that the AI agent executes in order.
              Each step can read workspace data (via tools), call an LLM with a prompt template,
              or propose a write action for human approval. Steps can pass outputs forward
              using <code>{{'{{previousStep.output.field}}'}}</code> variable binding.
            </p>
            <p class="sec-desc">
              Workflows let you automate repetitive multi-step tasks — like generating a weekly
              performance brief or producing compliant ad-copy drafts — with a single click.
            </p>
          </section>

          <section class="types-section">
            <h2 class="sec-title">Step types</h2>
            <div class="types-grid">
              @for (st of stepTypes; track st.type) {
                <div class="type-card">
                  <mat-icon>{{ st.icon }}</mat-icon>
                  <strong>{{ st.label }}</strong>
                  <span class="type-code">{{ st.type }}</span>
                  <p>{{ st.description }}</p>
                </div>
              }
            </div>
          </section>

          <section class="examples-section">
            <h2 class="sec-title">Example workflows</h2>
            <p class="sec-sub">These illustrate common patterns. Create your own to match your team's needs.</p>
            <div class="examples-grid">
              @for (ex of sampleWorkflows; track ex.name) {
                <div class="example-card">
                  <div class="ex-head"><mat-icon>{{ ex.icon }}</mat-icon><strong>{{ ex.name }}</strong></div>
                  <p>{{ ex.description }}</p>
                  <div class="ex-steps">
                    @for (s of ex.steps; track s; let i = $index) {
                      <span class="ex-step">
                        <span class="step-num">{{ i + 1 }}</span>
                        {{ s }}
                      </span>
                    }
                  </div>
                </div>
              }
            </div>
          </section>

          <section class="how-section">
            <h2 class="sec-title">How it connects to the platform</h2>
            <div class="how-grid">
              <div class="how-card">
                <mat-icon>auto_awesome</mat-icon>
                <strong>Prompt Library</strong>
                <p>LLM steps reference <strong>Approved</strong> prompt templates. Create templates first, then use them in workflows.</p>
                <a mat-stroked-button routerLink="/ai/prompts" class="how-link"><mat-icon>open_in_new</mat-icon> Prompt Library</a>
              </div>
              <div class="how-card">
                <mat-icon>build</mat-icon>
                <strong>Tools Catalog</strong>
                <p>Tool steps call read-only internal APIs — research, campaigns, governance, integrations.</p>
                <a mat-stroked-button routerLink="/ai/tools" class="how-link"><mat-icon>open_in_new</mat-icon> Tools Catalog</a>
              </div>
              <div class="how-card">
                <mat-icon>approval</mat-icon>
                <strong>Action Proposals</strong>
                <p>PROPOSE_ACTION steps create approval requests. Review and execute them from the Proposals page.</p>
                <a mat-stroked-button routerLink="/ai/proposals" class="how-link"><mat-icon>open_in_new</mat-icon> Proposals</a>
              </div>
              <div class="how-card">
                <mat-icon>chat</mat-icon>
                <strong>AI Chat</strong>
                <p>In <em>Workflow</em> mode, the chat agent can trigger workflows conversationally.</p>
                <a mat-stroked-button routerLink="/ai/chat" class="how-link"><mat-icon>open_in_new</mat-icon> AI Chat</a>
              </div>
            </div>
          </section>

          <div class="cta-block">
            @if (canCreate()) {
              <button mat-flat-button color="primary" (click)="createStub()"><mat-icon>add</mat-icon> Create your first workflow</button>
            }
          </div>
        </div>
      } @else {
        <!-- ===== WORKFLOW TABLE ===== -->
        <mat-card class="table-card">
          <table mat-table [dataSource]="workflows()" class="wf-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">
                <a class="name-link" [routerLink]="['/ai/workflows', row.id]">{{ row.name }}</a>
                @if (row.description) {
                  <span class="row-desc">{{ row.description }}</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="steps">
              <th mat-header-cell *matHeaderCellDef>Steps</th>
              <td mat-cell *matCellDef="let row">
                <span class="step-count">{{ stepCount(row) }} steps</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="scope">
              <th mat-header-cell *matHeaderCellDef>Scope</th>
              <td mat-cell *matCellDef="let row">
                <mat-chip class="scope-chip"
                          [matTooltip]="row.scope === 'ORG' ? 'Available to all workspaces in this org' : 'Scoped to a specific workspace'">
                  {{ row.scope }}
                </mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let row">
                <mat-chip [class]="'st-' + row.status.toLowerCase()"
                          [matTooltip]="statusTooltip(row.status)">{{ row.status }}</mat-chip>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"
                class="row-click" [routerLink]="['/ai/workflows', row.id]"
                tabindex="0" (keydown.enter)="open(row)"></tr>
          </table>
        </mat-card>

        <!-- mobile cards -->
        <div class="card-grid">
          @for (row of workflows(); track row.id) {
            <mat-card class="wf-card" [routerLink]="['/ai/workflows', row.id]">
              <div class="wfc-top">
                <strong>{{ row.name }}</strong>
                <mat-chip [class]="'st-' + row.status.toLowerCase()">{{ row.status }}</mat-chip>
              </div>
              @if (row.description) { <p class="wfc-desc">{{ row.description }}</p> }
              <div class="wfc-meta">
                <span>{{ stepCount(row) }} steps</span>
                <mat-chip class="scope-chip">{{ row.scope }}</mat-chip>
              </div>
            </mat-card>
          }
        </div>
      }

      <!-- footer -->
      <div class="footer-hint">
        <mat-icon>info</mat-icon>
        <span>
          Workflow steps execute sequentially. Each step's output is available to the next via variable binding.
          <strong>PROPOSE_ACTION</strong> steps create approval requests — write operations are never auto-executed.
          Go to <a routerLink="/ai/tools"><strong>Tools Catalog</strong></a> to see available tool names.
        </span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 32px; max-width: 1100px; margin: 0 auto; }

    .page-header { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 16px; margin-bottom: 20px; align-items: flex-start; }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .subtitle { margin: 6px 0 0; color: #6b7280; font-size: 14px; max-width: 660px; line-height: 1.5; }

    .welcome-empty { text-align: center; padding: 48px 24px; }
    .welcome-icon { font-size: 52px; width: 52px; height: 52px; color: #3f51b5; opacity: .7; margin-bottom: 12px; }
    .welcome-empty h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
    .welcome-empty p { margin: 0; color: #6b7280; font-size: 14px; }
    .centered { display: flex; justify-content: center; padding: 48px; }

    /* onboarding */
    .onboard { max-width: 960px; }
    .sec-title { font-size: 16px; font-weight: 600; margin: 0 0 8px; color: #111; }
    .sec-desc { margin: 0 0 10px; font-size: 14px; color: #4b5563; line-height: 1.55; }
    .sec-desc code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-size: 13px; }
    .sec-sub { margin: 0 0 12px; font-size: 13px; color: #6b7280; }
    .what-section { margin-bottom: 28px; }

    .types-section { margin-bottom: 28px; }
    .types-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .type-card { padding: 16px 18px; border: 1px solid rgba(0,0,0,.08); border-radius: 10px; background: #f5f7ff; }
    .type-card mat-icon { font-size: 22px; width: 22px; height: 22px; color: #3f51b5; margin-bottom: 4px; }
    .type-card strong { display: block; font-size: 14px; margin-bottom: 2px; }
    .type-code { display: inline-block; font-size: 11px; font-family: ui-monospace, monospace; background: #e0e7ff; color: #3730a3; padding: 1px 6px; border-radius: 4px; margin-bottom: 6px; }
    .type-card p { margin: 0; font-size: 12.5px; color: #6b7280; line-height: 1.45; }

    .examples-section { margin-bottom: 28px; }
    .examples-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .example-card { padding: 16px 18px; border: 1px solid rgba(0,0,0,.08); border-radius: 10px; background: #fafbfc; }
    .ex-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .ex-head mat-icon { font-size: 20px; width: 20px; height: 20px; color: #3f51b5; }
    .ex-head strong { font-size: 14px; }
    .example-card p { margin: 0 0 10px; font-size: 12.5px; color: #4b5563; line-height: 1.45; }
    .ex-steps { display: flex; flex-direction: column; gap: 4px; }
    .ex-step { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #374151; }
    .step-num { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 50%; background: #e0e7ff; color: #3730a3; font-size: 11px; font-weight: 700; flex-shrink: 0; }

    .how-section { margin-bottom: 28px; }
    .how-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
    .how-card { padding: 14px 16px; border: 1px solid rgba(0,0,0,.08); border-radius: 10px; background: #fafbfc; }
    .how-card mat-icon { font-size: 22px; width: 22px; height: 22px; color: #3f51b5; margin-bottom: 4px; }
    .how-card strong { display: block; font-size: 13px; margin-bottom: 4px; }
    .how-card p { margin: 0 0 8px; font-size: 12px; color: #6b7280; line-height: 1.4; }
    .how-link { font-size: 12px !important; }
    .how-link mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .cta-block { text-align: center; padding-top: 4px; }

    /* table */
    .table-card { overflow: auto; margin-bottom: 16px; }
    .wf-table { width: 100%; }
    .name-link { font-weight: 600; color: #3f51b5; text-decoration: none; }
    .name-link:hover { text-decoration: underline; }
    .row-desc { display: block; font-size: 12px; color: #6b7280; margin-top: 2px; max-width: 340px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .step-count { font-size: 13px; color: #374151; }
    .row-click { cursor: pointer; }
    .row-click:hover { background: rgba(0,0,0,.04); }
    .scope-chip { font-size: 11px !important; }
    mat-chip.st-draft { --mdc-chip-container-color: #e0e7ff; color: #3730a3; }
    mat-chip.st-approved { --mdc-chip-container-color: #dcfce7; color: #166534; }
    mat-chip.st-archived { --mdc-chip-container-color: #f3f4f6; color: #6b7280; }

    /* mobile cards */
    .card-grid { display: none; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-bottom: 16px; }
    @media (max-width: 900px) {
      .table-card { display: none; }
      .card-grid { display: grid; }
      .wf-card { cursor: pointer; transition: box-shadow .15s; }
      .wf-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); }
      .wfc-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px; }
      .wfc-top strong { font-size: 15px; }
      .wfc-desc { margin: 0 0 6px; font-size: 12px; color: #6b7280; line-height: 1.4; }
      .wfc-meta { font-size: 12px; color: #6b7280; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    }

    .footer-hint {
      max-width: 960px; margin: 12px 0 0; display: flex; gap: 10px; align-items: flex-start;
      padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
    }
    .footer-hint mat-icon { color: #2563eb; font-size: 20px; width: 20px; height: 20px; margin-top: 1px; flex-shrink: 0; }
    .footer-hint span { font-size: 13px; color: #1e3a5f; line-height: 1.5; }
    .footer-hint a { color: #2563eb; text-decoration: none; }
    .footer-hint a:hover { text-decoration: underline; }
  `],
})
export class WorkflowListComponent {
  private admin = inject(AdminStore);
  private aiStore = inject(AiStore);
  private api = inject(AiWorkflowsApiService);
  private router = inject(Router);

  readonly orgId = this.admin.selectedOrgId;
  readonly workspaceId = this.admin.selectedWorkspaceId;
  readonly workflows = this.aiStore.workflows;
  readonly loading = signal(false);
  readonly columns = ['name', 'steps', 'scope', 'status'];

  readonly stepTypes = STEP_TYPES;
  readonly sampleWorkflows = SAMPLE_WORKFLOWS;

  private seq = 0;

  readonly canCreate = computed(() => {
    const org = this.orgId() ?? undefined;
    const ws = this.workspaceId() ?? undefined;
    return (
      this.admin.hasRole('ORG_ADMIN', org, ws) ||
      this.admin.hasRole('WORKSPACE_ADMIN', org, ws) ||
      this.admin.hasRole('EDITOR', org, ws)
    );
  });

  constructor() {
    effect(() => {
      const oid = this.orgId();
      const ws = this.workspaceId();
      if (!oid) {
        this.aiStore.setWorkflows([]);
        return;
      }
      const s = ++this.seq;
      this.loading.set(true);
      this.api.list(oid, { workspaceId: ws ?? undefined }).subscribe({
        next: (list) => {
          if (s !== this.seq) return;
          this.aiStore.setWorkflows(list);
          this.loading.set(false);
        },
        error: () => {
          if (s !== this.seq) return;
          this.loading.set(false);
        },
      });
    }, { allowSignalWrites: true });
  }

  stepCount(wf: AiWorkflowDefinition): number {
    try {
      const arr = JSON.parse(wf.stepsJson);
      return Array.isArray(arr) ? arr.length : 0;
    } catch { return 0; }
  }

  statusTooltip(status: string): string {
    switch (status) {
      case 'DRAFT': return 'Work in progress — can be edited freely';
      case 'APPROVED': return 'Reviewed and ready for use';
      case 'ARCHIVED': return 'No longer in active use';
      default: return '';
    }
  }

  open(row: AiWorkflowDefinition): void {
    void this.router.navigate(['/ai/workflows', row.id]);
  }

  createStub(): void {
    void this.router.navigate(['/ai/workflows', 'new']);
  }
}
