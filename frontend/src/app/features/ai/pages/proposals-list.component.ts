import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule, MatChipListboxChange } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgentActionStatus } from '../models/ai.models';
import { AiProposalsApiService } from '../services/ai-proposals-api.service';
import { AiStore } from '../store/ai.store';
import { AdminStore } from '../../admin/store/admin.store';

interface StatusInfo {
  value: AgentActionStatus;
  label: string;
  color: string;
  icon: string;
  description: string;
}

const STATUS_MAP: StatusInfo[] = [
  { value: 'PROPOSED', label: 'Proposed', color: '#fef3c7', icon: 'pending_actions', description: 'The AI agent suggested this change. It needs to be submitted for approval or directly approved/rejected.' },
  { value: 'APPROVED', label: 'Approved', color: '#dcfce7', icon: 'check_circle', description: 'A reviewer approved the change. It can now be executed to apply it to the system.' },
  { value: 'REJECTED', label: 'Rejected', color: '#fee2e2', icon: 'block', description: 'A reviewer rejected the proposed change. No action was taken.' },
  { value: 'EXECUTED', label: 'Executed', color: '#e0e7ff', icon: 'task_alt', description: 'The approved change was applied to the system successfully.' },
  { value: 'FAILED', label: 'Failed', color: '#f3f4f6', icon: 'error_outline', description: 'Execution was attempted but failed. Review the error and retry or discard.' },
];

@Component({
  selector: 'app-proposals-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
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
          <h1>Action Proposals</h1>
          <p class="subtitle">
            The human-in-the-loop safety gate for AI actions. Every write operation
            the AI agent suggests — creating templates, updating campaigns, mapping integrations —
            appears here as a proposal that must be reviewed and approved before it takes effect.
          </p>
        </div>
      </header>

      @if (!workspaceId()) {
        <div class="welcome-empty">
          <mat-icon class="welcome-icon">approval</mat-icon>
          <h2>Select a workspace</h2>
          <p>Choose a workspace from the top bar to view action proposals.</p>
        </div>
      } @else {
        <!-- EMPTY / ONBOARDING -->
        @if (!loading() && !proposals().length && !statusFilter()) {
          <div class="onboard">
            <section class="what-section">
              <h2 class="sec-title">What are Action Proposals?</h2>
              <p class="sec-desc">
                When the AI agent wants to make a change — create a governance template,
                update a campaign budget, or map an integration — it doesn't do it directly.
                Instead, it creates an <strong>Action Proposal</strong> describing the exact
                change it wants to make. A human reviewer must then <strong>approve</strong>
                and <strong>execute</strong> the proposal for it to take effect.
              </p>
              <p class="sec-desc">
                This ensures full control: you see exactly what the AI proposes, review
                the payload, and decide whether to proceed.
              </p>
            </section>

            <section class="lifecycle-section">
              <h2 class="sec-title">Proposal lifecycle</h2>
              <div class="lifecycle-row">
                @for (s of statusInfos; track s.value; let last = $last) {
                  <div class="lc-step">
                    <div class="lc-badge" [style.background]="s.color"><mat-icon>{{ s.icon }}</mat-icon></div>
                    <strong>{{ s.label }}</strong>
                    <p>{{ s.description }}</p>
                  </div>
                  @if (!last) {
                    <mat-icon class="lc-arrow">arrow_forward</mat-icon>
                  }
                }
              </div>
            </section>

            <section class="source-section">
              <h2 class="sec-title">Where do proposals come from?</h2>
              <div class="source-grid">
                <div class="source-card">
                  <mat-icon>chat</mat-icon>
                  <strong>AI Chat</strong>
                  <p>In Tool-assisted mode, when you ask the agent to "create a template" or "update a campaign", it proposes the action here.</p>
                  <a mat-stroked-button routerLink="/ai/chat" class="src-link"><mat-icon>open_in_new</mat-icon> AI Chat</a>
                </div>
                <div class="source-card">
                  <mat-icon>account_tree</mat-icon>
                  <strong>Workflows</strong>
                  <p>Workflow steps of type PROPOSE_ACTION automatically create proposals when the workflow runs.</p>
                  <a mat-stroked-button routerLink="/ai/workflows" class="src-link"><mat-icon>open_in_new</mat-icon> Workflows</a>
                </div>
                <div class="source-card">
                  <mat-icon>code</mat-icon>
                  <strong>API / AiFacade</strong>
                  <p>Backend modules can call <code>AiFacade.proposeAction()</code> to create proposals programmatically.</p>
                </div>
              </div>
            </section>

            <section class="roles-section">
              <h2 class="sec-title">Who can do what?</h2>
              <div class="roles-grid">
                <div class="role-card">
                  <mat-icon>edit</mat-icon>
                  <strong>Editors</strong>
                  <p>Can submit proposals for approval. Cannot approve or execute.</p>
                </div>
                <div class="role-card">
                  <mat-icon>gavel</mat-icon>
                  <strong>Approvers</strong>
                  <p>Can approve or reject proposals. Cannot execute.</p>
                </div>
                <div class="role-card">
                  <mat-icon>admin_panel_settings</mat-icon>
                  <strong>Admins</strong>
                  <p>Full control — can submit, approve, reject, and execute proposals.</p>
                </div>
              </div>
            </section>

            <div class="empty-hint-box">
              <mat-icon>info</mat-icon>
              <span>
                No proposals yet. Start an <a routerLink="/ai/chat"><strong>AI Chat</strong></a>
                conversation in Tool-assisted mode and ask the agent to create or update
                something — the proposal will appear here.
              </span>
            </div>
          </div>
        } @else {
          <!-- FILTERS -->
          <mat-card class="filter-card">
            <div class="filter-row">
              <span class="lbl">Status</span>
              <mat-chip-listbox [value]="statusFilter()" (change)="onStatusChip($event)" class="chip-row">
                <mat-chip-option [value]="''">All</mat-chip-option>
                @for (s of statusInfos; track s.value) {
                  <mat-chip-option [value]="s.value" [matTooltip]="s.description">{{ s.label }}</mat-chip-option>
                }
              </mat-chip-listbox>
            </div>
            @if (statusFilter()) {
              <button mat-button class="clear-btn" (click)="clearFilter()"><mat-icon>filter_alt_off</mat-icon> Clear</button>
            }
          </mat-card>

          @if (loading()) {
            <div class="centered"><mat-spinner diameter="40" /></div>
          } @else if (!proposals().length) {
            <mat-card class="empty-card">
              <mat-icon>search_off</mat-icon>
              <h2>No proposals match</h2>
              <p>No proposals with status <strong>{{ statusFilter() }}</strong> in this workspace.</p>
              <button mat-stroked-button (click)="clearFilter()"><mat-icon>filter_alt_off</mat-icon> Clear filter</button>
            </mat-card>
          } @else {
            <!-- TABLE (desktop) -->
            <mat-card class="table-card">
              <table mat-table [dataSource]="proposals()" class="tbl">
                <ng-container matColumnDef="title">
                  <th mat-header-cell *matHeaderCellDef>Title</th>
                  <td mat-cell *matCellDef="let row">
                    <a [routerLink]="['/ai/proposals', row.id]" class="link">{{ row.title }}</a>
                    @if (row.description) {
                      <span class="row-desc">{{ row.description }}</span>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="actionType">
                  <th mat-header-cell *matHeaderCellDef>Action type</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="action-badge">{{ row.actionType }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let row">
                    <mat-chip [class]="chipClass(row.status)" [matTooltip]="statusTooltip(row.status)">
                      <mat-icon class="chip-icon">{{ statusIcon(row.status) }}</mat-icon>
                      {{ row.status || '—' }}
                    </mat-chip>
                  </td>
                </ng-container>
                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef>Created</th>
                  <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'mediumDate' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="cols"></tr>
                <tr mat-row *matRowDef="let row; columns: cols" class="row-click" [routerLink]="['/ai/proposals', row.id]"></tr>
              </table>
            </mat-card>

            <!-- CARDS (mobile) -->
            <div class="card-grid">
              @for (row of proposals(); track row.id) {
                <mat-card class="p-card" [routerLink]="['/ai/proposals', row.id]">
                  <div class="pc-top">
                    <strong>{{ row.title }}</strong>
                    <mat-chip [class]="chipClass(row.status)">{{ row.status }}</mat-chip>
                  </div>
                  <div class="pc-meta">
                    <span class="action-badge">{{ row.actionType }}</span>
                    <span>{{ row.createdAt | date: 'mediumDate' }}</span>
                  </div>
                </mat-card>
              }
            </div>
          }
        }

        <!-- footer -->
        <div class="footer-hint">
          <mat-icon>shield</mat-icon>
          <span>
            Proposals are the platform's <strong>human-in-the-loop</strong> safety layer.
            The AI agent can never make write changes directly — it always proposes, and you decide.
            All proposal actions are recorded in the <strong>audit log</strong>.
          </span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 32px; max-width: 1100px; margin: 0 auto; }

    .page-header { margin-bottom: 20px; }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .subtitle { margin: 6px 0 0; color: #6b7280; font-size: 14px; max-width: 700px; line-height: 1.5; }

    .welcome-empty { text-align: center; padding: 48px 24px; }
    .welcome-icon { font-size: 52px; width: 52px; height: 52px; color: #3f51b5; opacity: .7; margin-bottom: 12px; }
    .welcome-empty h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
    .welcome-empty p { margin: 0; color: #6b7280; font-size: 14px; }
    .centered { display: flex; justify-content: center; padding: 40px; }

    /* onboarding */
    .onboard { max-width: 960px; }
    .sec-title { font-size: 16px; font-weight: 600; margin: 0 0 8px; color: #111; }
    .sec-desc { margin: 0 0 10px; font-size: 14px; color: #4b5563; line-height: 1.55; }
    .what-section { margin-bottom: 28px; }

    .lifecycle-section { margin-bottom: 28px; }
    .lifecycle-row { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; }
    .lc-step { flex: 1; min-width: 140px; }
    .lc-badge { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; margin-bottom: 6px; }
    .lc-badge mat-icon { font-size: 20px; width: 20px; height: 20px; color: #374151; }
    .lc-step strong { display: block; font-size: 13px; margin-bottom: 4px; }
    .lc-step p { margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4; }
    .lc-arrow { font-size: 20px; width: 20px; height: 20px; color: #d1d5db; margin-top: 10px; }

    .source-section { margin-bottom: 28px; }
    .source-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .source-card { padding: 16px 18px; border: 1px solid rgba(0,0,0,.08); border-radius: 10px; background: #fafbfc; }
    .source-card mat-icon { font-size: 22px; width: 22px; height: 22px; color: #3f51b5; margin-bottom: 4px; }
    .source-card strong { display: block; font-size: 13px; margin-bottom: 4px; }
    .source-card p { margin: 0 0 8px; font-size: 12px; color: #6b7280; line-height: 1.4; }
    .source-card code { background: #f3f4f6; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
    .src-link { font-size: 12px !important; }
    .src-link mat-icon { font-size: 14px; width: 14px; height: 14px; }

    .roles-section { margin-bottom: 28px; }
    .roles-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
    .role-card { padding: 14px 16px; border: 1px solid rgba(0,0,0,.08); border-radius: 10px; background: #f5f7ff; }
    .role-card mat-icon { font-size: 22px; width: 22px; height: 22px; color: #3f51b5; margin-bottom: 4px; }
    .role-card strong { display: block; font-size: 13px; margin-bottom: 4px; }
    .role-card p { margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4; }

    .empty-hint-box {
      display: flex; gap: 10px; align-items: flex-start; padding: 14px 16px;
      background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
    }
    .empty-hint-box mat-icon { color: #2563eb; font-size: 20px; width: 20px; height: 20px; margin-top: 1px; flex-shrink: 0; }
    .empty-hint-box span { font-size: 13px; color: #1e3a5f; line-height: 1.5; }
    .empty-hint-box a { color: #2563eb; text-decoration: none; }
    .empty-hint-box a:hover { text-decoration: underline; }

    /* filters */
    .filter-card { padding: 12px 16px !important; margin-bottom: 14px; }
    .filter-row { display: flex; flex-direction: column; gap: 6px; }
    .lbl { font-size: 11px; font-weight: 600; text-transform: uppercase; color: #6b7280; }
    .chip-row { display: flex; flex-wrap: wrap; gap: 4px; }
    .clear-btn { font-size: 12px; margin-top: 4px; }

    .empty-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 32px !important; }
    .empty-card mat-icon { font-size: 48px; width: 48px; height: 48px; color: #9ca3af; margin-bottom: 12px; }

    /* table */
    .table-card { overflow: auto; margin-bottom: 16px; }
    .tbl { width: 100%; }
    .link { font-weight: 600; color: #3f51b5; text-decoration: none; }
    .link:hover { text-decoration: underline; }
    .row-desc { display: block; font-size: 12px; color: #6b7280; margin-top: 2px; max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .action-badge { font-size: 12px; font-family: ui-monospace, monospace; background: #f3f4f6; color: #374151; padding: 2px 8px; border-radius: 4px; }
    .chip-icon { font-size: 14px !important; width: 14px !important; height: 14px !important; margin-right: 4px; }
    .row-click { cursor: pointer; }
    .row-click:hover { background: rgba(0,0,0,.04); }
    mat-chip.st-proposed { --mdc-chip-container-color: #fef3c7; color: #92400e; }
    mat-chip.st-approved { --mdc-chip-container-color: #dcfce7; color: #166534; }
    mat-chip.st-rejected { --mdc-chip-container-color: #fee2e2; color: #991b1b; }
    mat-chip.st-executed { --mdc-chip-container-color: #e0e7ff; color: #3730a3; }
    mat-chip.st-failed { --mdc-chip-container-color: #f3f4f6; color: #6b7280; }
    mat-chip.st-none { --mdc-chip-container-color: #f3f4f6; color: #4b5563; }

    /* mobile cards */
    .card-grid { display: none; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; margin-bottom: 16px; }
    @media (max-width: 900px) {
      .table-card { display: none; }
      .card-grid { display: grid; }
      .p-card { cursor: pointer; transition: box-shadow .15s; }
      .p-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); }
      .pc-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
      .pc-top strong { font-size: 15px; }
      .pc-meta { font-size: 12px; color: #6b7280; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    }

    .footer-hint {
      max-width: 960px; margin: 12px 0 0; display: flex; gap: 10px; align-items: flex-start;
      padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
    }
    .footer-hint mat-icon { color: #2563eb; font-size: 20px; width: 20px; height: 20px; margin-top: 1px; flex-shrink: 0; }
    .footer-hint span { font-size: 13px; color: #1e3a5f; line-height: 1.5; }
  `],
})
export class ProposalsListComponent {
  private admin = inject(AdminStore);
  private aiStore = inject(AiStore);
  private api = inject(AiProposalsApiService);
  readonly workspaceId = this.admin.selectedWorkspaceId;
  readonly proposals = this.aiStore.proposals;
  readonly loading = signal(false);
  readonly statusFilter = signal<string>('');
  readonly statuses: AgentActionStatus[] = ['PROPOSED', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED'];
  readonly statusInfos = STATUS_MAP;
  readonly cols = ['title', 'actionType', 'status', 'createdAt'];

  private seq = 0;

  constructor() {
    effect(() => {
      const ws = this.workspaceId();
      const st = this.statusFilter();
      if (!ws) {
        this.aiStore.setProposals([]);
        return;
      }
      const s = ++this.seq;
      this.loading.set(true);
      this.api.list(ws, st || undefined).subscribe({
        next: (list) => {
          if (s !== this.seq) return;
          this.aiStore.setProposals(list);
          this.loading.set(false);
        },
        error: () => {
          if (s !== this.seq) return;
          this.loading.set(false);
        },
      });
    }, { allowSignalWrites: true });
  }

  onStatusChip(ev: MatChipListboxChange): void {
    const v = ev.value;
    this.statusFilter.set(typeof v === 'string' ? v : '');
  }

  clearFilter(): void {
    this.statusFilter.set('');
  }

  chipClass(st: AgentActionStatus | null | undefined): string {
    if (!st) return 'st-none';
    return 'st-' + st.toLowerCase();
  }

  statusTooltip(st: AgentActionStatus | null | undefined): string {
    if (!st) return '';
    return STATUS_MAP.find((s) => s.value === st)?.description ?? '';
  }

  statusIcon(st: AgentActionStatus | null | undefined): string {
    if (!st) return 'help_outline';
    return STATUS_MAP.find((s) => s.value === st)?.icon ?? 'help_outline';
  }
}
