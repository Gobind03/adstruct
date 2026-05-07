import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipListboxChange } from '@angular/material/chips';
import {
  AiPromptTemplate,
  LlmCallPurpose,
  PromptStatus,
} from '../models/ai.models';
import { AiPromptsApiService } from '../services/ai-prompts-api.service';
import { AiStore } from '../store/ai.store';
import { AdminStore } from '../../admin/store/admin.store';

interface PurposeInfo {
  value: LlmCallPurpose;
  label: string;
  icon: string;
  description: string;
}

interface StatusInfo {
  value: PromptStatus;
  label: string;
  color: string;
  description: string;
}

const PURPOSE_MAP: PurposeInfo[] = [
  { value: 'CHAT', label: 'Chat', icon: 'chat', description: 'Conversational prompts for open-ended dialogue with the LLM.' },
  { value: 'SUMMARIZE', label: 'Summarise', icon: 'summarize', description: 'Condense long texts into concise summaries — research snapshots, reports, etc.' },
  { value: 'EXTRACT', label: 'Extract', icon: 'data_object', description: 'Pull structured fields from unstructured content (names, dates, KPIs).' },
  { value: 'CLASSIFY', label: 'Classify', icon: 'label', description: 'Categorise inputs into predefined labels — sentiment, topic, intent.' },
  { value: 'GENERATE', label: 'Generate', icon: 'auto_awesome', description: 'Create new content — ad copy, headlines, template drafts, A/B variants.' },
  { value: 'PLAN', label: 'Plan', icon: 'route', description: 'Multi-step reasoning prompts that produce strategy or action plans.' },
  { value: 'TOOL_ROUTING', label: 'Tool routing', icon: 'alt_route', description: 'Internal use — determines which agent tools should handle a user request.' },
];

const STATUS_MAP: StatusInfo[] = [
  { value: 'DRAFT', label: 'Draft', color: '#e0e7ff', description: 'Work in progress. Can be edited freely. Submit when ready for review.' },
  { value: 'APPROVED', label: 'Approved', color: '#dcfce7', description: 'Reviewed and approved. Available for use in chats, workflows, and the prompt runner.' },
  { value: 'ARCHIVED', label: 'Archived', color: '#f3f4f6', description: 'No longer in use. Kept for historical reference but won\'t appear in active prompt lists.' },
];

@Component({
  selector: 'app-prompt-list',
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
          <h1>Prompt Library</h1>
          <p class="subtitle">
            Reusable, versioned prompt templates that power AI features across the platform —
            from chat conversations and content generation to governance checks and data extraction.
          </p>
        </div>
        @if (canCreate()) {
          <button mat-flat-button color="primary" routerLink="/ai/prompts/new">
            <mat-icon>add</mat-icon>
            Create Prompt
          </button>
        }
      </header>

      @if (!orgId()) {
        <!-- No org selected -->
        <div class="welcome-empty">
          <mat-icon class="welcome-icon">auto_awesome</mat-icon>
          <h2>Select an organization</h2>
          <p>Choose an organization from the top bar to view and manage prompt templates.</p>
        </div>
      } @else {
        <!-- ===== INTRO CARDS (shown when list is empty or first visit) ===== -->
        @if (!loading() && !promptTemplates().length && !hasActiveFilters()) {
          <div class="onboard">
            <section class="what-section">
              <h2 class="section-title">What is the Prompt Library?</h2>
              <p class="section-desc">
                Prompt templates are pre-configured instructions sent to the AI model.
                Each template defines a <strong>system prompt</strong> (the model's personality and rules),
                a <strong>user prompt template</strong> (with <code>{{'{{variables}}'}}</code> that are filled at runtime),
                and optional <strong>guardrails</strong> (extra constraints the model must follow).
              </p>
              <p class="section-desc">
                Templates go through a <strong>Draft → Submit → Approved</strong> lifecycle.
                Only <em>Approved</em> templates are available in AI Chat, Workflows, and the Prompt Runner.
              </p>
            </section>

            <section class="purposes-section">
              <h2 class="section-title">What can you build?</h2>
              <div class="purpose-grid">
                @for (p of purposeInfos; track p.value) {
                  <div class="purpose-card">
                    <mat-icon>{{ p.icon }}</mat-icon>
                    <strong>{{ p.label }}</strong>
                    <p>{{ p.description }}</p>
                  </div>
                }
              </div>
            </section>

            <section class="lifecycle-section">
              <h2 class="section-title">Prompt lifecycle</h2>
              <div class="lifecycle-row">
                @for (s of statusInfos; track s.value; let last = $last) {
                  <div class="lifecycle-step">
                    <span class="lifecycle-badge" [style.background]="s.color">{{ s.label }}</span>
                    <p>{{ s.description }}</p>
                  </div>
                  @if (!last) {
                    <mat-icon class="lifecycle-arrow">arrow_forward</mat-icon>
                  }
                }
              </div>
            </section>

            <div class="empty-cta">
              @if (canCreate()) {
                <button mat-flat-button color="primary" routerLink="/ai/prompts/new">
                  <mat-icon>add</mat-icon>
                  Create your first prompt
                </button>
              }
              <p class="empty-hint">
                Or switch to <strong>AI Chat</strong> to start a conversation — it uses the platform's built-in prompts automatically.
              </p>
            </div>
          </div>
        } @else {
          <!-- ===== FILTERS ===== -->
          <mat-card class="filter-card">
            <div class="filter-row">
              <div class="filter-group">
                <span class="filters-label">Purpose</span>
                <mat-chip-listbox
                  [value]="purposeFilter()"
                  (change)="onPurposeChange($event.value)"
                  class="chip-row"
                >
                  <mat-chip-option [value]="''">All</mat-chip-option>
                  @for (p of purposeInfos; track p.value) {
                    <mat-chip-option [value]="p.value" [matTooltip]="p.description">{{ p.label }}</mat-chip-option>
                  }
                </mat-chip-listbox>
              </div>
              <div class="filter-group">
                <span class="filters-label">Status</span>
                <mat-chip-listbox
                  [value]="statusFilter()"
                  (change)="onStatusChange($event.value)"
                  class="chip-row"
                >
                  <mat-chip-option [value]="''">All</mat-chip-option>
                  @for (s of statusInfos; track s.value) {
                    <mat-chip-option [value]="s.value" [matTooltip]="s.description">{{ s.label }}</mat-chip-option>
                  }
                </mat-chip-listbox>
              </div>
              @if (tagOptions().length) {
                <div class="filter-group">
                  <span class="filters-label">Tag</span>
                  <mat-chip-listbox
                    [value]="tagFilter()"
                    (change)="onTagChange($event.value)"
                    class="chip-row"
                  >
                    <mat-chip-option [value]="''">All tags</mat-chip-option>
                    @for (t of tagOptions(); track t) {
                      <mat-chip-option [value]="t">{{ t }}</mat-chip-option>
                    }
                  </mat-chip-listbox>
                </div>
              }
            </div>
            @if (hasActiveFilters()) {
              <button mat-button class="clear-btn" (click)="clearFilters()">
                <mat-icon>filter_alt_off</mat-icon> Clear filters
              </button>
            }
          </mat-card>

          @if (loading()) {
            <div class="centered"><mat-spinner diameter="40" /></div>
          } @else if (!promptTemplates().length) {
            <mat-card class="empty-card">
              <mat-icon>search_off</mat-icon>
              <h2>No prompts match your filters</h2>
              <p>Try adjusting the purpose, status, or tag filters above.</p>
              <button mat-stroked-button (click)="clearFilters()">
                <mat-icon>filter_alt_off</mat-icon> Clear filters
              </button>
            </mat-card>
          } @else {
            <!-- ===== TABLE (desktop) ===== -->
            <mat-card class="table-card">
              <table mat-table [dataSource]="promptTemplates()" class="prompt-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let row">
                    <a class="name-link" [routerLink]="['/ai/prompts', row.id]">{{ row.name }}</a>
                    @if (row.description) {
                      <span class="row-desc">{{ row.description }}</span>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="purpose">
                  <th mat-header-cell *matHeaderCellDef>Purpose</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="purpose-badge">
                      <mat-icon>{{ purposeIcon(row.purpose) }}</mat-icon>
                      {{ purposeLabel(row.purpose) }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let row">
                    <mat-chip [class]="'status-' + row.status.toLowerCase()"
                              [matTooltip]="statusTooltip(row.status)">{{ row.status }}</mat-chip>
                  </td>
                </ng-container>
                <ng-container matColumnDef="version">
                  <th mat-header-cell *matHeaderCellDef>Version</th>
                  <td mat-cell *matCellDef="let row">v{{ row.version }}</td>
                </ng-container>
                <ng-container matColumnDef="outputFormat">
                  <th mat-header-cell *matHeaderCellDef>Output</th>
                  <td mat-cell *matCellDef="let row">
                    <span [matTooltip]="row.outputFormat === 'JSON' ? 'Returns structured JSON' : 'Returns plain text'">
                      {{ row.outputFormat }}
                    </span>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr
                  mat-row
                  *matRowDef="let row; columns: displayedColumns"
                  class="data-row"
                  [routerLink]="['/ai/prompts', row.id]"
                  tabindex="0"
                  (keydown.enter)="goPrompt(row.id)"
                ></tr>
              </table>
            </mat-card>

            <!-- ===== CARDS (mobile) ===== -->
            <div class="card-grid">
              @for (row of promptTemplates(); track row.id) {
                <mat-card class="prompt-card" [routerLink]="['/ai/prompts', row.id]">
                  <div class="card-top">
                    <span class="card-title">{{ row.name }}</span>
                    <mat-chip [class]="'status-' + row.status.toLowerCase()">{{ row.status }}</mat-chip>
                  </div>
                  @if (row.description) {
                    <p class="card-desc">{{ row.description }}</p>
                  }
                  <div class="card-meta">
                    <span class="purpose-badge"><mat-icon>{{ purposeIcon(row.purpose) }}</mat-icon> {{ purposeLabel(row.purpose) }}</span>
                    <span>v{{ row.version }}</span>
                    <span>{{ row.outputFormat }}</span>
                  </div>
                </mat-card>
              }
            </div>
          }
        }

        <!-- ===== FOOTER INFO ===== -->
        <div class="footer-hint">
          <mat-icon>info</mat-icon>
          <span>
            Prompts support <code>{{'{{variable}}'}}</code> placeholders that are filled at runtime.
            Use the <strong>Run Prompt</strong> button on any approved template to test it with sample inputs.
            Prompts are also used automatically by <strong>AI Chat</strong> and <strong>Workflows</strong>.
          </span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 32px; max-width: 1200px; margin: 0 auto; }

    .page-header {
      display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 16px;
      margin-bottom: 20px;
    }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 700; }
    .subtitle { margin: 6px 0 0; color: #6b7280; font-size: 14px; max-width: 660px; line-height: 1.5; }

    /* welcome (no org) */
    .welcome-empty { text-align: center; padding: 48px 24px; }
    .welcome-icon { font-size: 52px; width: 52px; height: 52px; color: #3f51b5; opacity: .7; margin-bottom: 12px; }
    .welcome-empty h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
    .welcome-empty p { margin: 0; color: #6b7280; font-size: 14px; }

    /* onboard */
    .onboard { max-width: 900px; }
    .section-title { font-size: 16px; font-weight: 600; margin: 0 0 8px; color: #111; }
    .section-desc { margin: 0 0 10px; font-size: 14px; color: #4b5563; line-height: 1.55; }
    .section-desc code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-size: 13px; }

    .what-section { margin-bottom: 28px; }

    .purposes-section { margin-bottom: 28px; }
    .purpose-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
    .purpose-card {
      padding: 14px 16px; border: 1px solid rgba(0,0,0,.08); border-radius: 10px; background: #fafbfc;
    }
    .purpose-card mat-icon { font-size: 22px; width: 22px; height: 22px; color: #3f51b5; margin-bottom: 4px; }
    .purpose-card strong { display: block; font-size: 13px; margin-bottom: 3px; }
    .purpose-card p { margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4; }

    .lifecycle-section { margin-bottom: 28px; }
    .lifecycle-row { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; }
    .lifecycle-step { flex: 1; min-width: 160px; }
    .lifecycle-badge {
      display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; margin-bottom: 6px;
    }
    .lifecycle-step p { margin: 0; font-size: 12px; color: #6b7280; line-height: 1.4; }
    .lifecycle-arrow { font-size: 20px; width: 20px; height: 20px; color: #d1d5db; margin-top: 4px; }

    .empty-cta { text-align: center; padding-top: 8px; }
    .empty-hint { margin: 12px 0 0; font-size: 13px; color: #6b7280; }

    /* filters */
    .filter-card { padding: 14px 16px !important; margin-bottom: 16px; }
    .filter-row { display: flex; flex-direction: column; gap: 10px; }
    .filter-group { display: flex; flex-direction: column; gap: 4px; }
    .filters-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
    .chip-row { display: flex; flex-wrap: wrap; gap: 4px; }
    .clear-btn { margin-top: 6px; font-size: 12px; }

    .centered { display: flex; justify-content: center; padding: 48px; }

    .empty-card {
      display: flex; flex-direction: column; align-items: center; text-align: center; padding: 32px !important;
    }
    .empty-card mat-icon { font-size: 48px; width: 48px; height: 48px; color: #9ca3af; margin-bottom: 12px; }

    /* table */
    .table-card { overflow: auto; margin-bottom: 20px; }
    .prompt-table { width: 100%; }
    .name-link { color: #3f51b5; font-weight: 600; text-decoration: none; }
    .name-link:hover { text-decoration: underline; }
    .row-desc { display: block; font-size: 12px; color: #6b7280; margin-top: 2px; max-width: 340px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .purpose-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; }
    .purpose-badge mat-icon { font-size: 16px; width: 16px; height: 16px; color: #3f51b5; }
    .data-row { cursor: pointer; }
    .data-row:hover { background: rgba(0,0,0,.04); }
    mat-chip.status-draft { --mdc-chip-container-color: #e0e7ff; color: #3730a3; }
    mat-chip.status-approved { --mdc-chip-container-color: #dcfce7; color: #166534; }
    mat-chip.status-archived { --mdc-chip-container-color: #f3f4f6; color: #6b7280; }

    /* mobile cards */
    .card-grid { display: none; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    @media (max-width: 900px) {
      .table-card { display: none; }
      .card-grid { display: grid; }
      .prompt-card { cursor: pointer; transition: box-shadow .15s; }
      .prompt-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,.08); }
      .card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px; }
      .card-title { font-weight: 600; font-size: 15px; }
      .card-desc { margin: 0 0 6px; font-size: 12px; color: #6b7280; line-height: 1.4; }
      .card-meta { font-size: 12px; color: #6b7280; display: flex; flex-wrap: wrap; gap: 8px; }
    }

    .footer-hint {
      max-width: 900px; margin: 20px 0 0; display: flex; gap: 10px; align-items: flex-start;
      padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
    }
    .footer-hint mat-icon { color: #2563eb; font-size: 20px; width: 20px; height: 20px; margin-top: 1px; flex-shrink: 0; }
    .footer-hint span { font-size: 13px; color: #1e3a5f; line-height: 1.5; }
    .footer-hint code { background: #dbeafe; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
  `],
})
export class PromptListComponent {
  private adminStore = inject(AdminStore);
  private aiStore = inject(AiStore);
  private promptsApi = inject(AiPromptsApiService);
  private router = inject(Router);

  readonly orgId = this.adminStore.selectedOrgId;
  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  readonly loading = signal(false);
  readonly purposeFilter = signal<string>('');
  readonly statusFilter = signal<string>('');
  readonly tagFilter = signal<string>('');

  readonly purposeInfos = PURPOSE_MAP;
  readonly statusInfos = STATUS_MAP;

  readonly purposes: LlmCallPurpose[] = PURPOSE_MAP.map((p) => p.value);
  readonly statuses: PromptStatus[] = STATUS_MAP.map((s) => s.value);
  readonly displayedColumns = ['name', 'purpose', 'status', 'version', 'outputFormat'];

  readonly promptTemplates = this.aiStore.promptTemplates;

  readonly tagOptions = computed(() => {
    const set = new Set<string>();
    for (const p of this.aiStore.promptTemplates()) {
      for (const t of this.parseTags(p.tags)) set.add(t);
    }
    return [...set].sort();
  });

  readonly hasActiveFilters = computed(() =>
    !!(this.purposeFilter() || this.statusFilter() || this.tagFilter()),
  );

  readonly canCreate = computed(() => {
    const org = this.orgId() ?? undefined;
    const ws = this.workspaceId() ?? undefined;
    return (
      this.adminStore.hasRole('ORG_ADMIN', org, ws) ||
      this.adminStore.hasRole('WORKSPACE_ADMIN', org, ws) ||
      this.adminStore.hasRole('EDITOR', org, ws)
    );
  });

  private loadSeq = 0;

  constructor() {
    effect(() => {
      const oid = this.orgId();
      const pf = this.purposeFilter();
      const sf = this.statusFilter();
      const tf = this.tagFilter();
      if (!oid) {
        this.aiStore.setPromptTemplates([]);
        return;
      }
      this.load(oid, pf, sf, tf);
    }, { allowSignalWrites: true });
  }

  parseTags(raw: string | null): string[] {
    if (!raw?.trim()) return [];
    try {
      const j = JSON.parse(raw) as unknown;
      if (Array.isArray(j)) return j.map(String).filter(Boolean);
    } catch { /* fall through */ }
    return raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  }

  purposeLabel(p: LlmCallPurpose): string {
    return PURPOSE_MAP.find((x) => x.value === p)?.label ?? p.replace(/_/g, ' ');
  }

  purposeIcon(p: LlmCallPurpose): string {
    return PURPOSE_MAP.find((x) => x.value === p)?.icon ?? 'auto_awesome';
  }

  statusTooltip(s: PromptStatus): string {
    return STATUS_MAP.find((x) => x.value === s)?.description ?? '';
  }

  onPurposeChange(ev: MatChipListboxChange): void {
    const v = ev.value;
    this.purposeFilter.set(typeof v === 'string' ? v : '');
  }

  onStatusChange(ev: MatChipListboxChange): void {
    const v = ev.value;
    this.statusFilter.set(typeof v === 'string' ? v : '');
  }

  onTagChange(ev: MatChipListboxChange): void {
    const v = ev.value;
    this.tagFilter.set(typeof v === 'string' ? v : '');
  }

  clearFilters(): void {
    this.purposeFilter.set('');
    this.statusFilter.set('');
    this.tagFilter.set('');
  }

  goPrompt(id: string): void {
    void this.router.navigate(['/ai/prompts', id]);
  }

  private load(orgId: string, purpose: string, status: string, tag: string): void {
    const seq = ++this.loadSeq;
    this.loading.set(true);
    this.promptsApi
      .list(orgId, {
        purpose: purpose || undefined,
        status: status || undefined,
        tag: tag || undefined,
        workspaceId: this.workspaceId() ?? undefined,
      })
      .subscribe({
        next: (list) => {
          if (seq !== this.loadSeq) return;
          this.aiStore.setPromptTemplates(list);
          this.loading.set(false);
        },
        error: () => {
          if (seq !== this.loadSeq) return;
          this.loading.set(false);
        },
      });
  }
}
