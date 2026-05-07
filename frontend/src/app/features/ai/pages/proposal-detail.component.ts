import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs/operators';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgentActionStatus, AiActionProposal } from '../models/ai.models';
import { AiProposalsApiService } from '../services/ai-proposals-api.service';
import { AiStore } from '../store/ai.store';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '../../../core/services/notification.service';
import { JsonViewerComponent } from '../components/json-viewer.component';

@Component({
  selector: 'app-proposal-detail',
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
    MatStepperModule,
    MatTooltipModule,
    JsonViewerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="toolbar">
        <button mat-button routerLink="/ai/proposals"><mat-icon>arrow_back</mat-icon> Action Proposals</button>
        @if (p()) {
          <mat-chip [class]="chipClass(p()!.status)" class="crumb-chip">{{ p()!.status }}</mat-chip>
        }
      </div>

      @if (!workspaceId()) {
        <div class="hint-empty">
          <mat-icon>workspaces</mat-icon>
          <h2>Select a workspace</h2>
          <p>Choose a workspace from the top bar to view this proposal.</p>
        </div>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (!p()) {
        <mat-card class="hint"><p>Proposal not found.</p></mat-card>
      } @else {
        <!-- HEADER -->
        <div class="head">
          <div>
            <h1>{{ p()!.title }}</h1>
            <p class="sub">{{ p()!.description || 'No description provided by the agent.' }}</p>
          </div>
        </div>

        <!-- WHAT IS THIS -->
        <div class="context-banner">
          <mat-icon>info</mat-icon>
          <div>
            <strong>What is this proposal?</strong>
            <p>
              The AI agent suggested a <strong>{{ p()!.actionType }}</strong> action
              targeting <strong>{{ p()!.targetEntityType || 'the system' }}</strong>.
              Review the payload below to see exactly what will change, then approve or reject.
              @if (p()!.status === 'APPROVED') {
                Once executed, the change is applied to the system.
              }
            </p>
          </div>
        </div>

        <!-- DETAILS -->
        <mat-card class="card">
          <h2>Proposal details</h2>
          <div class="detail-grid">
            <div>
              <span class="k">Action type</span>
              <span class="v action-badge">{{ p()!.actionType }}</span>
              <span class="k-hint">{{ actionTypeHint() }}</span>
            </div>
            <div>
              <span class="k">Target entity</span>
              <span class="v">{{ p()!.targetEntityType || '—' }}</span>
              @if (p()!.targetEntityId) {
                <span class="v-sub">ID: {{ p()!.targetEntityId }}</span>
              }
            </div>
            <div>
              <span class="k">Conversation</span>
              @if (p()!.conversationId) {
                <a class="v conv-link" [routerLink]="['/ai/chat']">
                  <mat-icon>chat</mat-icon> View conversation
                </a>
              } @else {
                <span class="v">—</span>
              }
            </div>
            <div>
              <span class="k">Created</span>
              <span class="v">{{ p()!.createdAt | date: 'medium' }}</span>
            </div>
            <div>
              <span class="k">Last updated</span>
              <span class="v">{{ p()!.updatedAt | date: 'medium' }}</span>
            </div>
          </div>
        </mat-card>

        <!-- PAYLOAD -->
        <mat-card class="card">
          <div class="payload-head">
            <h2>Payload</h2>
            <span class="payload-hint">This is the exact data the agent wants to apply. Review it carefully before approving.</span>
          </div>
          <app-json-viewer [json]="p()!.payloadJson || '{}'" />
        </mat-card>

        <!-- LIFECYCLE STEPPER -->
        <mat-card class="card">
          <h2>Lifecycle</h2>
          <p class="lifecycle-intro">{{ lifecycleHint() }}</p>
          <mat-stepper [linear]="false" [selectedIndex]="stepIndex()" class="stepper">
            <mat-step [completed]="isDone('PROPOSED')" label="Proposed">
              <ng-template matStepLabel>
                <span matTooltip="The AI agent created this proposal">Proposed</span>
              </ng-template>
            </mat-step>
            <mat-step [completed]="isDone('APPROVED') || isDone('EXECUTED')" label="Approved">
              <ng-template matStepLabel>
                <span matTooltip="A reviewer approved the proposed change">Approved</span>
              </ng-template>
            </mat-step>
            <mat-step [completed]="isDone('EXECUTED')" label="Executed">
              <ng-template matStepLabel>
                <span matTooltip="The approved change was applied to the system">Executed</span>
              </ng-template>
            </mat-step>
          </mat-stepper>
          @if (p()!.status === 'REJECTED') {
            <div class="rejected-banner"><mat-icon>block</mat-icon> This proposal was <strong>rejected</strong> by a reviewer.</div>
          }
          @if (p()!.status === 'FAILED') {
            <div class="failed-banner"><mat-icon>error_outline</mat-icon> Execution <strong>failed</strong>. Review the error and consider retrying.</div>
          }
        </mat-card>

        <!-- REVIEW NOTES -->
        @if (p()!.reviewNotes) {
          <mat-card class="card">
            <h2>Review notes</h2>
            <pre class="notes">{{ p()!.reviewNotes }}</pre>
          </mat-card>
        }

        <!-- REJECT PANEL -->
        @if (showRejectPanel()) {
          <mat-card class="card reject-panel">
            <h3>Reject this proposal</h3>
            <p class="reject-desc">Explain why this proposal should not proceed. The requester will see your notes.</p>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Rejection notes (optional)</mat-label>
              <textarea matInput rows="3" [(ngModel)]="rejectNotes" placeholder="e.g. Budget too high, needs revised copy, etc."></textarea>
              <mat-hint>Provide context so the requester understands the rejection reason</mat-hint>
            </mat-form-field>
            <div class="reject-actions">
              <button mat-button type="button" (click)="cancelReject()">Cancel</button>
              <button mat-flat-button color="warn" (click)="confirmReject()" [disabled]="busy()">Confirm rejection</button>
            </div>
          </mat-card>
        }

        <!-- ACTIONS -->
        <div class="actions">
          @if (canSubmit() && p()!.status === 'PROPOSED') {
            <button mat-stroked-button (click)="submit()" [disabled]="busy()"
                    matTooltip="Submit this proposal into the approval workflow for a reviewer to act on">
              <mat-icon>send</mat-icon> Submit for approval
            </button>
          }
          @if (canApprove() && p()!.status === 'PROPOSED') {
            <button mat-flat-button color="primary" (click)="approve()" [disabled]="busy()"
                    matTooltip="Approve this proposal — it can then be executed to apply the change">
              <mat-icon>check_circle</mat-icon> Approve
            </button>
          }
          @if (canApprove() && (p()!.status === 'PROPOSED' || p()!.status === 'APPROVED')) {
            <button mat-stroked-button color="warn" (click)="openReject()" [disabled]="busy() || showRejectPanel()"
                    matTooltip="Reject this proposal — the change will not be applied">
              <mat-icon>block</mat-icon> Reject
            </button>
          }
          @if (canExecute() && p()!.status === 'APPROVED') {
            <button mat-flat-button color="accent" (click)="execute()" [disabled]="busy()"
                    matTooltip="Execute this approved proposal — applies the change to the system (irreversible)">
              <mat-icon>play_arrow</mat-icon> Execute
            </button>
          }
        </div>

        <!-- PERMISSION HINT -->
        @if (!canApprove() && !canExecute() && p()!.status === 'PROPOSED') {
          <div class="perm-hint">
            <mat-icon>lock</mat-icon>
            <span>You don't have permission to approve or execute proposals. Contact a workspace admin or approver.</span>
          </div>
        }

        <!-- WHAT HAPPENS NEXT -->
        <div class="next-section">
          <h2 class="next-title"><mat-icon>lightbulb</mat-icon> What happens when executed?</h2>
          <p class="next-desc">{{ executeExplanation() }}</p>
        </div>

        <!-- RELATED -->
        <div class="related-bar">
          <mat-icon>link</mat-icon>
          <span>
            <a routerLink="/ai/chat"><strong>AI Chat</strong></a> — start conversations that create proposals ·
            <a routerLink="/ai/workflows"><strong>Workflows</strong></a> — automate proposal creation with PROPOSE_ACTION steps ·
            <a routerLink="/ai/proposals"><strong>All Proposals</strong></a> — view the full queue
          </span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 40px; max-width: 860px; margin: 0 auto; }

    .toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .crumb-chip { font-size: 11px !important; min-height: 22px !important; padding: 0 8px !important; }
    mat-chip.st-proposed { --mdc-chip-container-color: #fef3c7; color: #92400e; }
    mat-chip.st-approved { --mdc-chip-container-color: #dcfce7; color: #166534; }
    mat-chip.st-rejected { --mdc-chip-container-color: #fee2e2; color: #991b1b; }
    mat-chip.st-executed { --mdc-chip-container-color: #e0e7ff; color: #3730a3; }
    mat-chip.st-failed { --mdc-chip-container-color: #f3f4f6; color: #6b7280; }
    mat-chip.st-none { --mdc-chip-container-color: #f3f4f6; color: #4b5563; }

    .hint-empty { text-align: center; padding: 48px 24px; }
    .hint-empty mat-icon { font-size: 52px; width: 52px; height: 52px; color: #3f51b5; opacity: .7; margin-bottom: 12px; }
    .hint-empty h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
    .hint-empty p { margin: 0; color: #6b7280; font-size: 14px; }
    .hint { padding: 24px; text-align: center; }
    .centered { display: flex; justify-content: center; padding: 48px; }

    .head { margin-bottom: 16px; }
    h1 { margin: 0; font-size: 1.4rem; font-weight: 700; }
    .sub { color: #6b7280; margin: 6px 0 0; font-size: 14px; line-height: 1.5; }

    .context-banner {
      display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; margin-bottom: 16px;
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;
    }
    .context-banner mat-icon { font-size: 22px; width: 22px; height: 22px; color: #16a34a; flex-shrink: 0; margin-top: 2px; }
    .context-banner strong { display: block; font-size: 14px; margin-bottom: 4px; }
    .context-banner p { margin: 0; font-size: 13px; color: #374151; line-height: 1.5; }

    .card { padding: 16px 20px !important; margin-bottom: 16px; }
    .card h2, .card h3 { margin: 0 0 10px; font-size: 1rem; font-weight: 700; }

    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 600px) { .detail-grid { grid-template-columns: 1fr; } }
    .k { display: block; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 600; margin-bottom: 2px; }
    .k-hint { display: block; font-size: 11px; color: #9ca3af; margin-top: 2px; }
    .v { font-size: 14px; color: #111; }
    .v-sub { display: block; font-size: 12px; color: #6b7280; font-family: ui-monospace, monospace; margin-top: 2px; }
    .action-badge { display: inline-block; font-size: 13px; font-family: ui-monospace, monospace; background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 4px; }
    .conv-link { display: inline-flex; align-items: center; gap: 4px; color: #3f51b5; text-decoration: none; font-size: 13px; font-weight: 500; }
    .conv-link:hover { text-decoration: underline; }
    .conv-link mat-icon { font-size: 16px; width: 16px; height: 16px; }

    .payload-head { margin-bottom: 10px; }
    .payload-hint { display: block; font-size: 12px; color: #6b7280; margin-top: 2px; }

    .lifecycle-intro { margin: 0 0 10px; font-size: 13px; color: #4b5563; line-height: 1.45; }
    .stepper { background: transparent; }
    .rejected-banner, .failed-banner {
      display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; margin: 12px 0 0;
      padding: 10px 12px; border-radius: 8px;
    }
    .rejected-banner { background: #fef2f2; color: #991b1b; }
    .failed-banner { background: #fffbeb; color: #92400e; }
    .rejected-banner mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .failed-banner mat-icon { font-size: 18px; width: 18px; height: 18px; }

    .notes { white-space: pre-wrap; margin: 0; font-size: 13px; font-family: inherit; background: #f9fafb; padding: 10px 12px; border-radius: 6px; }

    .reject-panel { border: 1px solid #fecaca !important; }
    .reject-desc { margin: 0 0 10px; font-size: 13px; color: #4b5563; }
    .reject-panel .full { width: 100%; }
    .reject-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }

    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; margin-bottom: 16px; }
    .actions mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    .perm-hint {
      display: flex; gap: 8px; align-items: center; padding: 10px 14px; margin-bottom: 16px;
      background: #f3f4f6; border-radius: 8px; font-size: 12px; color: #6b7280;
    }
    .perm-hint mat-icon { font-size: 16px; width: 16px; height: 16px; color: #9ca3af; }

    .next-section { margin-bottom: 16px; }
    .next-title { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; margin: 0 0 6px; color: #111; }
    .next-title mat-icon { font-size: 20px; width: 20px; height: 20px; color: #f59e0b; }
    .next-desc { margin: 0; font-size: 13px; color: #4b5563; line-height: 1.5; }

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
export class ProposalDetailComponent {
  private route = inject(ActivatedRoute);
  private admin = inject(AdminStore);
  private aiStore = inject(AiStore);
  private api = inject(AiProposalsApiService);
  private notify = inject(NotificationService);

  private readonly idParam = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('proposalId'))),
    { initialValue: this.route.snapshot.paramMap.get('proposalId') },
  );

  readonly workspaceId = this.admin.selectedWorkspaceId;
  readonly p = signal<AiActionProposal | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly showRejectPanel = signal(false);
  rejectNotes = '';

  private readonly ACTION_TYPE_HINTS: Record<string, string> = {
    UPDATE_CAMPAIGN_BUDGET: 'Modifies the budget of an existing ad campaign.',
    CREATE_TEMPLATE: 'Creates a new governance template draft.',
    MAP_INTEGRATION: 'Maps a new integration account to a workspace.',
    CREATE_INSIGHT: 'Creates a new research insight draft.',
    CREATE_SPONSORED_UNIT: 'Creates a new sponsored content unit draft.',
  };

  private readonly EXECUTE_EXPLANATIONS: Record<string, string> = {
    CREATE_TEMPLATE: 'A new governance template will be created in Draft status with the payload content. You can review and publish it from the Governance module.',
    CREATE_INSIGHT: 'A new research insight will be created in Draft status. You can review it in the Research module.',
    CREATE_SPONSORED_UNIT: 'A new sponsored content unit draft will be created. Review it in the Conversational Ads module.',
    UPDATE_CAMPAIGN_BUDGET: 'The campaign budget will be updated to the value specified in the payload. This change takes effect immediately.',
    MAP_INTEGRATION: 'The specified integration account will be mapped to the workspace.',
  };

  readonly stepIndex = computed(() => {
    const st = this.p()?.status;
    if (st === 'REJECTED') return 0;
    if (st === 'PROPOSED') return 0;
    if (st === 'APPROVED') return 1;
    if (st === 'EXECUTED' || st === 'FAILED') return 2;
    return 0;
  });

  readonly canSubmit = computed(() => {
    const org = this.admin.selectedOrgId() ?? undefined;
    const ws = this.workspaceId() ?? undefined;
    return (
      this.admin.hasRole('ORG_ADMIN', org, ws) ||
      this.admin.hasRole('WORKSPACE_ADMIN', org, ws) ||
      this.admin.hasRole('EDITOR', org, ws)
    );
  });

  readonly canApprove = computed(() => {
    const org = this.admin.selectedOrgId() ?? undefined;
    const ws = this.workspaceId() ?? undefined;
    return (
      this.admin.hasRole('ORG_ADMIN', org, ws) ||
      this.admin.hasRole('WORKSPACE_ADMIN', org, ws) ||
      this.admin.hasRole('APPROVER', org, ws)
    );
  });

  readonly canExecute = computed(() => {
    const org = this.admin.selectedOrgId() ?? undefined;
    const ws = this.workspaceId() ?? undefined;
    return (
      this.admin.hasRole('ORG_ADMIN', org, ws) ||
      this.admin.hasRole('WORKSPACE_ADMIN', org, ws) ||
      this.admin.hasRole('EDITOR', org, ws)
    );
  });

  constructor() {
    effect(() => {
      const id = this.idParam();
      const ws = this.workspaceId();
      if (!id || !ws) { this.loading.set(false); return; }
      this.loading.set(true);
      this.api.get(ws, id).subscribe({
        next: (x) => {
          this.p.set(x);
          this.aiStore.upsertProposal(x);
          this.loading.set(false);
        },
        error: () => {
          this.p.set(null);
          this.loading.set(false);
          this.notify.error('Failed to load proposal');
        },
      });
    }, { allowSignalWrites: true });
  }

  actionTypeHint(): string {
    const at = this.p()?.actionType;
    if (!at) return '';
    return this.ACTION_TYPE_HINTS[at] ?? 'Performs the specified action on the target entity.';
  }

  lifecycleHint(): string {
    const st = this.p()?.status;
    switch (st) {
      case 'PROPOSED': return 'This proposal is waiting for review. Submit it for approval, or approve/reject directly if you have permission.';
      case 'APPROVED': return 'This proposal has been approved. Click Execute to apply the change to the system.';
      case 'EXECUTED': return 'This proposal has been executed. The change has been applied.';
      case 'REJECTED': return 'This proposal was rejected by a reviewer and no action was taken.';
      case 'FAILED': return 'Execution was attempted but failed. You can review the error and try again.';
      default: return '';
    }
  }

  executeExplanation(): string {
    const at = this.p()?.actionType;
    if (!at) return 'The payload data will be applied to the system.';
    return this.EXECUTE_EXPLANATIONS[at] ?? `The ${at} action will be applied using the payload data shown above. The exact effect depends on the action type.`;
  }

  chipClass(st: AgentActionStatus | null | undefined): string {
    if (!st) return 'st-none';
    return 'st-' + st.toLowerCase();
  }

  isDone(phase: AgentActionStatus): boolean {
    const st = this.p()?.status;
    if (!st) return false;
    const order: AgentActionStatus[] = ['PROPOSED', 'APPROVED', 'EXECUTED'];
    const idx = order.indexOf(phase);
    const cur = order.indexOf(st);
    if (st === 'REJECTED') return phase === 'PROPOSED';
    if (cur < 0) return false;
    return cur >= idx;
  }

  submit(): void {
    const ws = this.workspaceId(); const id = this.idParam();
    if (!ws || !id) return;
    this.busy.set(true);
    this.api.submit(ws, id).subscribe({
      next: (x) => { this.p.set(x); this.aiStore.upsertProposal(x); this.busy.set(false); this.notify.success('Submitted for approval'); },
      error: () => { this.busy.set(false); this.notify.error('Submit failed'); },
    });
  }

  approve(): void {
    const ws = this.workspaceId(); const id = this.idParam();
    if (!ws || !id) return;
    this.busy.set(true);
    this.api.approve(ws, id, '').subscribe({
      next: (x) => { this.p.set(x); this.aiStore.upsertProposal(x); this.busy.set(false); this.notify.success('Approved'); },
      error: () => { this.busy.set(false); this.notify.error('Approve failed'); },
    });
  }

  openReject(): void { this.showRejectPanel.set(true); }
  cancelReject(): void { this.showRejectPanel.set(false); }

  confirmReject(): void {
    const ws = this.workspaceId(); const id = this.idParam();
    if (!ws || !id) return;
    this.busy.set(true);
    this.api.reject(ws, id, this.rejectNotes.trim() || undefined).subscribe({
      next: (x) => {
        this.p.set(x); this.aiStore.upsertProposal(x); this.busy.set(false);
        this.showRejectPanel.set(false); this.rejectNotes = '';
        this.notify.success('Rejected');
      },
      error: () => { this.busy.set(false); this.notify.error('Reject failed'); },
    });
  }

  execute(): void {
    const ws = this.workspaceId(); const id = this.idParam();
    if (!ws || !id) return;
    this.busy.set(true);
    this.api.execute(ws, id).subscribe({
      next: (x) => { this.p.set(x); this.aiStore.upsertProposal(x); this.busy.set(false); this.notify.success('Executed successfully'); },
      error: () => { this.busy.set(false); this.notify.error('Execute failed'); },
    });
  }
}
