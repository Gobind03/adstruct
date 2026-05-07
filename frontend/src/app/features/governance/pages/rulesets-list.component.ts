import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { AdminStore } from '@features/admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { RulesetsApiService } from '../services/rulesets-api.service';
import { BrandRuleSetResponse } from '../models/governance.models';

@Component({
  selector: 'app-rulesets-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatMenuModule,
  ],
  template: `
    <!-- Page header -->
    <div class="page-header">
      <h2>Rule Sets</h2>
      <p class="subtitle">
        Rule sets group compliance rules that content must pass before publishing.
        Each set targets a compliance domain (finance, healthcare, legal, etc.) and contains
        individual rules like banned phrases, required disclaimers, and claim restrictions.
      </p>
    </div>

    <!-- Guide banner -->
    @if (showGuide()) {
      <mat-card class="info-banner">
        <mat-card-content>
          <div class="banner-header">
            <div class="banner-title">
              <mat-icon class="banner-icon">school</mat-icon>
              <strong>How Rule Sets work</strong>
            </div>
            <button mat-icon-button (click)="showGuide.set(false)" matTooltip="Dismiss" aria-label="Dismiss guide">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="banner-body">
            <div class="guide-steps">
              <div class="guide-step">
                <div class="step-number">1</div>
                <div>
                  <strong>Create a rule set</strong>
                  <p>Give it a name, choose a domain (e.g. Ad Copy, Social, Legal), and set the scope (org-wide or workspace-specific).</p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">2</div>
                <div>
                  <strong>Add rules inside it</strong>
                  <p>Click into a rule set to add individual rules — banned phrases, required disclaimers, or claim restrictions. Each rule has a severity (INFO, WARN, or BLOCK).</p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">3</div>
                <div>
                  <strong>Run governance checks</strong>
                  <p>Content is validated against these rules via <a routerLink="/governance/checks">Governance Checks</a>. Any BLOCK-severity match fails the check; WARN flags for review.</p>
                </div>
              </div>
            </div>
            <mat-divider></mat-divider>
            <div class="banner-tips">
              <p>
                <mat-icon inline>lightbulb</mat-icon>
                <strong>Tip:</strong> Start with a GENERAL rule set at ORG scope for universal policies, then create domain-specific sets for ad copy or social.
              </p>
              <p>
                <mat-icon inline>content_copy</mat-icon>
                You can <strong>clone</strong> an org-level rule set to a workspace to customize it without affecting the original.
              </p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    } @else {
      <button mat-stroked-button class="show-guide-btn" (click)="showGuide.set(true)">
        <mat-icon>school</mat-icon> Show guide
      </button>
    }

    <!-- Main content -->
    <mat-card>
      <mat-card-content>
        @if (!orgId()) {
          <div class="empty-state">
            <mat-icon class="empty-icon">business</mat-icon>
            <h3>No organization selected</h3>
            <p>Select an organization from the top bar to view and manage rule sets.</p>
          </div>
        } @else {
          <!-- Toolbar -->
          <div class="toolbar">
            <div class="filters">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Status</mat-label>
                <mat-select [formControl]="filterForm.controls.status">
                  <mat-option value="">All statuses</mat-option>
                  <mat-option value="ACTIVE">Active</mat-option>
                  <mat-option value="ARCHIVED">Archived</mat-option>
                </mat-select>
              </mat-form-field>
              <span class="count-label">{{ rulesets().length }} rule set{{ rulesets().length !== 1 ? 's' : '' }}</span>
            </div>
            <button mat-raised-button color="primary" (click)="showCreateForm.set(!showCreateForm())">
              <mat-icon>{{ showCreateForm() ? 'close' : 'add' }}</mat-icon>
              {{ showCreateForm() ? 'Cancel' : 'Create rule set' }}
            </button>
          </div>

          <!-- Create form -->
          @if (showCreateForm()) {
            <mat-card class="create-card">
              <mat-card-content>
                <h3 class="form-title"><mat-icon inline>playlist_add</mat-icon> Create a new rule set</h3>
                <p class="form-help">
                  A rule set is a container for related compliance rules. Choose a domain that describes the type
                  of content these rules will apply to.
                </p>
                <form [formGroup]="createForm" (ngSubmit)="createRuleset()" class="create-form">
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Name</mat-label>
                    <input matInput formControlName="name" placeholder="e.g. Finance Ad Compliance, Social Media Policy" />
                    <mat-hint>A descriptive name that makes it easy to identify this rule set</mat-hint>
                  </mat-form-field>
                  <div class="form-row-2">
                    <mat-form-field appearance="outline">
                      <mat-label>Domain</mat-label>
                      <mat-select formControlName="domain">
                        @for (d of domainOptions; track d.value) {
                          <mat-option [value]="d.value">{{ d.label }}</mat-option>
                        }
                      </mat-select>
                      <mat-hint>What type of content will these rules apply to?</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Scope</mat-label>
                      <mat-select formControlName="scope">
                        <mat-option value="ORG">Organization — applies to all workspaces</mat-option>
                        <mat-option value="WORKSPACE">Workspace — only this workspace</mat-option>
                      </mat-select>
                      <mat-hint>Who can use this rule set?</mat-hint>
                    </mat-form-field>
                  </div>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Description</mat-label>
                    <textarea matInput formControlName="description" rows="2"
                      placeholder="Optional — describe the purpose of this rule set"></textarea>
                    <mat-hint>Helps team members understand when to apply this rule set</mat-hint>
                  </mat-form-field>
                  <div class="form-actions">
                    <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid || creating()">
                      <mat-icon>check</mat-icon> Create rule set
                    </button>
                    <button mat-stroked-button type="button" (click)="showCreateForm.set(false)">Cancel</button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          }

          <!-- Rulesets table -->
          @if (loading()) {
            <div class="spinner-wrap">
              <mat-spinner diameter="36"></mat-spinner>
              <p class="spinner-label">Loading rule sets…</p>
            </div>
          } @else if (rulesets().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">gavel</mat-icon>
              <h3>No rule sets yet</h3>
              @if (filterForm.value.status) {
                <p>No rule sets match your filter. Try changing the status filter or create a new rule set.</p>
              } @else {
                <p>
                  Rule sets define the compliance rules your content must follow. Click "Create rule set" to get started,
                  then add individual rules inside it.
                </p>
              }
            </div>
          } @else {
            <div class="table-container">
              <table mat-table [dataSource]="rulesets()" class="full-width ruleset-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Name</th>
                  <td mat-cell *matCellDef="let row">
                    <a [routerLink]="['/governance/rulesets', row.id]" class="name-link">
                      <mat-icon class="name-icon">rule_folder</mat-icon>
                      <div class="name-text">
                        <strong>{{ row.name }}</strong>
                        @if (row.description) {
                          <span class="name-desc">{{ row.description }}</span>
                        }
                      </div>
                    </a>
                  </td>
                </ng-container>
                <ng-container matColumnDef="domain">
                  <th mat-header-cell *matHeaderCellDef>Domain</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="domain-chip">{{ domainLabel(row.domain) }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="scope">
                  <th mat-header-cell *matHeaderCellDef>Scope</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="scope-chip" [class]="row.scope.toLowerCase()"
                      [matTooltip]="row.scope === 'ORG' ? 'Applies to all workspaces' : 'Workspace-specific'">
                      {{ row.scope === 'ORG' ? 'Organization' : 'Workspace' }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="status-chip" [class]="row.status.toLowerCase()">{{ row.status }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef>Created</th>
                  <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'mediumDate' }}</td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-icon-button [matMenuTriggerFor]="rowMenu" matTooltip="Actions">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #rowMenu="matMenu">
                      <a mat-menu-item [routerLink]="['/governance/rulesets', row.id]">
                        <mat-icon>open_in_new</mat-icon> View &amp; edit rules
                      </a>
                      @if (row.scope === 'ORG' && workspaceId()) {
                        <button mat-menu-item (click)="cloneToWorkspace($event, row)" [disabled]="cloningId() === row.id">
                          <mat-icon>content_copy</mat-icon> Clone to workspace
                        </button>
                      }
                    </mat-menu>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="clickable-row"
                  [routerLink]="['/governance/rulesets', row.id]"></tr>
              </table>
            </div>
          }
        }
      </mat-card-content>
    </mat-card>

    <!-- Related pages -->
    @if (orgId()) {
      <mat-divider class="related-divider"></mat-divider>
      <div class="related-pages">
        <h3>Related</h3>
        <div class="related-grid">
          <a routerLink="/governance/checks" class="related-card">
            <mat-icon>verified</mat-icon>
            <div>
              <strong>Governance Checks</strong>
              <span>Run content against your rule sets to catch violations before publishing.</span>
            </div>
          </a>
          <a routerLink="/governance/disclaimers" class="related-card">
            <mat-icon>description</mat-icon>
            <div>
              <strong>Disclaimers</strong>
              <span>Manage required disclaimer texts that rules can reference.</span>
            </div>
          </a>
          <a routerLink="/governance/templates" class="related-card">
            <mat-icon>article</mat-icon>
            <div>
              <strong>Templates</strong>
              <span>Link rule sets to templates so they're automatically checked on use.</span>
            </div>
          </a>
        </div>
      </div>
    }
  `,
  styles: [`
    h2 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 6px; }
    .subtitle { color: var(--text-muted, #666); margin: 0 0 20px; font-size: 14px; line-height: 1.5; max-width: 680px; }

    .info-banner { margin-bottom: 20px; border-left: 4px solid #1976d2; background: #f5f9ff; }
    .banner-header { display: flex; align-items: center; justify-content: space-between; }
    .banner-title { display: flex; align-items: center; gap: 8px; font-size: 15px; }
    .banner-icon { color: #1976d2; }
    .banner-body { margin-top: 16px; }
    .guide-steps { display: flex; flex-direction: column; gap: 14px; padding: 4px 0 16px; }
    .guide-step { display: flex; gap: 12px; align-items: flex-start; font-size: 13px; line-height: 1.5; }
    .guide-step p { margin: 2px 0 0; color: #555; }
    .guide-step a { color: #1976d2; text-decoration: none; font-weight: 500; }
    .guide-step a:hover { text-decoration: underline; }
    .step-number { flex-shrink: 0; width: 28px; height: 28px; border-radius: 50%; background: #1976d2; color: #fff; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
    .banner-tips { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
    .banner-tips p { margin: 0; font-size: 13px; display: flex; align-items: center; gap: 6px; color: #555; }
    .show-guide-btn { margin-bottom: 16px; font-size: 13px; }
    .show-guide-btn mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    .toolbar { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
    .filters { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    .filter-field { width: 180px; }
    .count-label { font-size: 13px; color: var(--text-muted, #888); padding-top: 12px; }
    .toolbar > button mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    .create-card { margin-bottom: 24px; border: 1px solid #e3f2fd; background: #fafcff; }
    .form-title { font-size: 16px; font-weight: 600; margin: 0 0 4px; display: flex; align-items: center; gap: 6px; }
    .form-title mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .form-help { font-size: 13px; color: var(--text-muted, #888); margin: 0 0 16px; line-height: 1.5; }
    .create-form { display: flex; flex-direction: column; gap: 4px; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; }
    @media (max-width: 700px) { .form-row-2 { grid-template-columns: 1fr; } }
    .full-width { width: 100%; }
    .form-actions { display: flex; gap: 12px; margin-top: 8px; }
    .form-actions mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    .table-container { overflow-x: auto; }
    .ruleset-table { width: 100%; }
    .ruleset-table th { font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
    .clickable-row { cursor: pointer; transition: background 0.1s; }
    .clickable-row:hover { background: #f5f9ff; }
    .name-link { color: inherit; text-decoration: none; display: flex; align-items: center; gap: 10px; }
    .name-link:hover strong { text-decoration: underline; }
    .name-icon { color: #1976d2; font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; }
    .name-text { display: flex; flex-direction: column; gap: 1px; }
    .name-text strong { font-size: 14px; }
    .name-desc { font-size: 12px; color: #999; }
    .domain-chip { font-size: 12px; font-weight: 500; padding: 2px 10px; border-radius: 12px; background: #f3e5f5; color: #6a1b9a; }
    .scope-chip { font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 12px; }
    .scope-chip.org { background: #e3f2fd; color: #1565c0; }
    .scope-chip.workspace { background: #fff3e0; color: #e65100; }
    .status-chip { font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 12px; }
    .status-chip.active { background: #e8f5e9; color: #2e7d32; }
    .status-chip.archived { background: #f5f5f5; color: #888; }

    .spinner-wrap { display: flex; flex-direction: column; align-items: center; padding: 48px; gap: 12px; }
    .spinner-label { font-size: 14px; color: var(--text-muted, #888); }
    .empty-state { text-align: center; padding: 56px 24px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; margin-bottom: 12px; }
    .empty-state h3 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
    .empty-state p { margin: 0; font-size: 14px; color: var(--text-muted, #888); max-width: 460px; margin-inline: auto; line-height: 1.5; }

    .related-divider { margin: 28px 0 20px; }
    .related-pages h3 { font-size: 16px; font-weight: 600; margin: 0 0 4px; }
    .related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; margin-top: 12px; }
    .related-card { display: flex; align-items: flex-start; gap: 12px; padding: 16px; border-radius: 10px; border: 1px solid rgba(0,0,0,.08); text-decoration: none; color: inherit; transition: background 0.15s, border-color 0.15s, box-shadow 0.15s; }
    .related-card:hover { background: #f5f9ff; border-color: #90caf9; box-shadow: 0 2px 8px rgba(25,118,210,.08); }
    .related-card mat-icon { color: #1976d2; flex-shrink: 0; margin-top: 2px; }
    .related-card strong { display: block; font-size: 14px; margin-bottom: 2px; }
    .related-card span { font-size: 12px; color: #777; line-height: 1.4; }
  `],
})
export class RulesetsListComponent implements OnInit, OnDestroy {
  private api = inject(RulesetsApiService);
  private adminStore = inject(AdminStore);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  private filterSub?: Subscription;

  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly cloningId = signal<string | null>(null);
  readonly showGuide = signal(true);
  readonly showCreateForm = signal(false);
  readonly rulesets = signal<BrandRuleSetResponse[]>([]);

  readonly displayedColumns = ['name', 'domain', 'scope', 'status', 'createdAt', 'actions'];

  readonly domainOptions = [
    { value: 'GENERAL', label: 'General' },
    { value: 'HEALTHCARE', label: 'Healthcare' },
    { value: 'FINANCE', label: 'Finance' },
    { value: 'LEGAL', label: 'Legal' },
    { value: 'EDUCATION', label: 'Education' },
    { value: 'REAL_ESTATE', label: 'Real Estate' },
    { value: 'CRYPTO', label: 'Crypto' },
    { value: 'CHILDREN', label: 'Children' },
    { value: 'OTHER', label: 'Other' },
  ];

  orgId = this.adminStore.selectedOrgId;
  workspaceId = this.adminStore.selectedWorkspaceId;

  filterForm = this.fb.group({ status: [''] });

  createForm = this.fb.group({
    scope: ['ORG', Validators.required],
    name: ['', Validators.required],
    domain: ['GENERAL', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    this.filterSub = this.filterForm.valueChanges.pipe(debounceTime(200)).subscribe(() => this.load());
    this.load();
  }

  ngOnDestroy(): void {
    this.filterSub?.unsubscribe();
  }

  domainLabel(value: string): string {
    return this.domainOptions.find((d) => d.value === value)?.label ?? value;
  }

  load(): void {
    const org = this.adminStore.selectedOrgId();
    if (!org) { this.rulesets.set([]); return; }
    const status = this.filterForm.value.status || undefined;
    this.loading.set(true);
    this.api.list(org, undefined, status).subscribe({
      next: (data) => { this.rulesets.set(data); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.notify.error(err.error?.detail || 'Failed to load rulesets'); },
    });
  }

  createRuleset(): void {
    const org = this.adminStore.selectedOrgId();
    if (!org || this.createForm.invalid) return;
    const v = this.createForm.getRawValue();
    const ws = this.adminStore.selectedWorkspaceId();
    this.creating.set(true);
    this.api.create(org, {
      scope: v.scope!,
      workspaceId: v.scope === 'WORKSPACE' && ws ? ws : undefined,
      name: v.name!,
      domain: v.domain!,
      description: v.description || undefined,
    }).subscribe({
      next: (created) => {
        this.creating.set(false);
        this.notify.success('Rule set created');
        this.showCreateForm.set(false);
        this.createForm.reset({ scope: 'ORG', name: '', domain: 'GENERAL', description: '' });
        this.load();
        this.router.navigate(['/governance/rulesets', created.id]);
      },
      error: (err) => { this.creating.set(false); this.notify.error(err.error?.detail || 'Failed to create ruleset'); },
    });
  }

  cloneToWorkspace(event: Event, row: BrandRuleSetResponse): void {
    event.preventDefault();
    event.stopPropagation();
    const org = this.adminStore.selectedOrgId();
    const ws = this.adminStore.selectedWorkspaceId();
    if (!org || !ws) { this.notify.error('Select a workspace first'); return; }
    this.cloningId.set(row.id);
    this.api.cloneToWorkspace(org, row.id, ws).subscribe({
      next: (cloned) => {
        this.cloningId.set(null);
        this.notify.success('Rule set cloned to workspace');
        this.load();
        this.router.navigate(['/governance/rulesets', cloned.id]);
      },
      error: (err) => { this.cloningId.set(null); this.notify.error(err.error?.detail || 'Failed to clone ruleset'); },
    });
  }
}
