import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { EMPTY, Subscription, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
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
import { BrandRuleResponse, BrandRuleSetResponse } from '../models/governance.models';

interface RuleTypeOption {
  value: string;
  label: string;
  icon: string;
  description: string;
}

const RULE_TYPE_OPTIONS: RuleTypeOption[] = [
  { value: 'BANNED_PHRASE', label: 'Banned Phrase', icon: 'block', description: 'Flag or block content containing specific words or regex patterns' },
  { value: 'REQUIRED_DISCLAIMER', label: 'Required Disclaimer', icon: 'fact_check', description: 'Ensure required disclaimer text is present in the content' },
  { value: 'CLAIM_RESTRICTION', label: 'Claim Restriction', icon: 'warning', description: 'Flag unsubstantiated claims using keyword matching' },
  { value: 'TONE_CHECK', label: 'Tone Check', icon: 'record_voice_over', description: 'Validate content against voice/tone guidelines' },
  { value: 'LINK_CHECK', label: 'Link Check', icon: 'link', description: 'Verify URLs and links meet brand requirements' },
  { value: 'KEYWORD_BLOCK', label: 'Keyword Block', icon: 'text_fields', description: 'Block specific keywords from appearing in content' },
  { value: 'FORMAT_RULE', label: 'Format Rule', icon: 'format_size', description: 'Enforce formatting standards (capitalization, length, etc.)' },
];

interface SeverityOption {
  value: string;
  label: string;
  color: string;
  description: string;
}

const SEVERITY_OPTIONS: SeverityOption[] = [
  { value: 'INFO', label: 'Info', color: '#1976d2', description: 'Informational — logged but does not affect check outcome' },
  { value: 'WARN', label: 'Warning', color: '#e65100', description: 'Warning — flags the content for review but allows it' },
  { value: 'BLOCK', label: 'Block', color: '#c62828', description: 'Block — fails the governance check, content must be fixed' },
];

@Component({
  selector: 'app-ruleset-detail',
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
    <!-- Breadcrumb -->
    <a mat-button routerLink="/governance/rulesets" class="back-link">
      <mat-icon>arrow_back</mat-icon> All Rule Sets
    </a>

    @if (!orgId()) {
      <div class="empty-state">
        <mat-icon class="empty-icon">business</mat-icon>
        <h3>No organization selected</h3>
        <p>Select an organization from the top bar.</p>
      </div>
    } @else if (loadingRuleset()) {
      <div class="spinner-wrap">
        <mat-spinner diameter="36"></mat-spinner>
        <p class="spinner-label">Loading rule set…</p>
      </div>
    } @else if (!ruleset()) {
      <div class="empty-state">
        <mat-icon class="empty-icon">search_off</mat-icon>
        <h3>Rule set not found</h3>
        <p>The rule set may have been deleted or you don't have access. <a routerLink="/governance/rulesets">Go back to all rule sets</a>.</p>
      </div>
    } @else {
      <!-- Header -->
      <div class="header-block">
        <div class="header-info">
          <h2>{{ ruleset()!.name }}</h2>
          <div class="meta-chips">
            <span class="domain-chip">{{ domainLabel(ruleset()!.domain) }}</span>
            <span class="scope-chip" [class]="ruleset()!.scope.toLowerCase()">
              {{ ruleset()!.scope === 'ORG' ? 'Organization' : 'Workspace' }}
            </span>
            <span class="status-chip" [class]="ruleset()!.status.toLowerCase()">{{ ruleset()!.status }}</span>
          </div>
          @if (ruleset()!.description) {
            <p class="desc">{{ ruleset()!.description }}</p>
          }
        </div>
        <div class="header-actions">
          <a mat-raised-button color="primary" routerLink="/governance/checks"
            matTooltip="Run content against this rule set">
            <mat-icon>play_arrow</mat-icon> Run check
          </a>
          <button mat-stroked-button color="warn" (click)="archiveRuleset()" [disabled]="archiving()"
            matTooltip="Archive this rule set — it will no longer be used in governance checks">
            <mat-icon>archive</mat-icon> Archive
          </button>
        </div>
      </div>

      <!-- Rules section -->
      <mat-card class="rules-card">
        <mat-card-content>
          <div class="rules-header">
            <div>
              <h3><mat-icon inline>rule</mat-icon> Rules</h3>
              <p class="section-help">
                Individual compliance rules within this set. Each rule defines what to look for (pattern), how important
                it is (severity), and what action to take when it matches.
              </p>
            </div>
            <button mat-raised-button color="primary" (click)="showAddForm.set(!showAddForm())">
              <mat-icon>{{ showAddForm() ? 'close' : 'add' }}</mat-icon>
              {{ showAddForm() ? 'Cancel' : 'Add rule' }}
            </button>
          </div>

          <!-- Add rule form -->
          @if (showAddForm()) {
            <div class="add-form-wrap">
              <h4>Add a new rule</h4>
              <form [formGroup]="createRuleForm" (ngSubmit)="addRule()" class="rule-form">
                <div class="form-row-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Rule type</mat-label>
                    <mat-select formControlName="ruleType">
                      @for (t of ruleTypeOptions; track t.value) {
                        <mat-option [value]="t.value" [matTooltip]="t.description">
                          <mat-icon>{{ t.icon }}</mat-icon> {{ t.label }}
                        </mat-option>
                      }
                    </mat-select>
                    <mat-hint>{{ selectedRuleTypeDescription('create') }}</mat-hint>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Severity</mat-label>
                    <mat-select formControlName="severity">
                      @for (s of severityOptions; track s.value) {
                        <mat-option [value]="s.value">
                          <span [style.color]="s.color">&#9679;</span> {{ s.label }}
                        </mat-option>
                      }
                    </mat-select>
                    <mat-hint>{{ selectedSeverityDescription('create') }}</mat-hint>
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Name</mat-label>
                  <input matInput formControlName="name" placeholder="e.g. No guaranteed returns, Must include FDIC disclaimer" />
                  <mat-hint>A short, descriptive name for this rule</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Description</mat-label>
                  <input matInput formControlName="description" placeholder="Optional — why this rule exists" />
                  <mat-hint>Explain the business reason so others understand the rule</mat-hint>
                </mat-form-field>
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Pattern</mat-label>
                  <input matInput formControlName="pattern" placeholder="e.g. guaranteed returns, \\b100%\\s+safe\\b" />
                  <mat-hint>Plain text for exact match, or a regex pattern. Used by BANNED_PHRASE and KEYWORD_BLOCK rules.</mat-hint>
                </mat-form-field>
                <div class="form-row-2">
                  <mat-form-field appearance="outline">
                    <mat-label>Parameters JSON</mat-label>
                    <textarea matInput formControlName="parametersJson" rows="3"
                      placeholder='e.g. requiredText: FDIC insured'></textarea>
                    <mat-hint>REQUIRED_DISCLAIMER: requiredText key. CLAIM_RESTRICTION: keywords array.</mat-hint>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Applies to JSON</mat-label>
                    <textarea matInput formControlName="appliesToJson" rows="3"
                      placeholder='e.g. entityTypes: SPONSORED_UNIT'></textarea>
                    <mat-hint>Optional — restrict this rule to specific entity types</mat-hint>
                  </mat-form-field>
                </div>
                <div class="form-actions">
                  <button mat-raised-button color="primary" type="submit" [disabled]="createRuleForm.invalid || savingRule()">
                    <mat-icon>check</mat-icon> Add rule
                  </button>
                  <button mat-stroked-button type="button" (click)="showAddForm.set(false)">Cancel</button>
                </div>
              </form>
            </div>
          }

          <mat-divider></mat-divider>

          <!-- Rules table -->
          @if (loadingRules()) {
            <div class="spinner-wrap inner">
              <mat-spinner diameter="32"></mat-spinner>
              <p class="spinner-label">Loading rules…</p>
            </div>
          } @else if (rules().length === 0) {
            <div class="empty-state-inline">
              <mat-icon>playlist_add</mat-icon>
              <div>
                <strong>No rules yet</strong>
                <p>This rule set is empty. Click "Add rule" above to create your first compliance rule.</p>
              </div>
            </div>
          } @else {
            <div class="table-container">
              <table mat-table [dataSource]="rules()" class="full-width rules-table">
                <ng-container matColumnDef="name">
                  <th mat-header-cell *matHeaderCellDef>Rule</th>
                  <td mat-cell *matCellDef="let row">
                    <div class="rule-name-cell">
                      <mat-icon class="rule-type-icon" [matTooltip]="ruleTypeLabel(row.ruleType)">{{ ruleTypeIcon(row.ruleType) }}</mat-icon>
                      <div>
                        <strong>{{ row.name }}</strong>
                        @if (row.description) {
                          <span class="rule-desc">{{ row.description }}</span>
                        }
                      </div>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="ruleType">
                  <th mat-header-cell *matHeaderCellDef>Type</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="type-label">{{ ruleTypeLabel(row.ruleType) }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="severity">
                  <th mat-header-cell *matHeaderCellDef>Severity</th>
                  <td mat-cell *matCellDef="let row">
                    <span class="severity-chip" [class]="row.severity.toLowerCase()"
                      [matTooltip]="severityDescription(row.severity)">
                      {{ row.severity }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="pattern">
                  <th mat-header-cell *matHeaderCellDef>Pattern</th>
                  <td mat-cell *matCellDef="let row">
                    @if (row.pattern) {
                      <code class="pattern-code">{{ row.pattern }}</code>
                    } @else {
                      <span class="not-set">—</span>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let row">
                    <button mat-icon-button [matMenuTriggerFor]="ruleMenu" matTooltip="Actions">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #ruleMenu="matMenu">
                      <button mat-menu-item (click)="startEdit(row)">
                        <mat-icon>edit</mat-icon> Edit
                      </button>
                      <button mat-menu-item (click)="deleteRule(row)" class="delete-item">
                        <mat-icon color="warn">delete</mat-icon> Delete
                      </button>
                    </mat-menu>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Edit rule panel -->
      @if (editingRule()) {
        <mat-card class="edit-card">
          <mat-card-content>
            <div class="edit-header">
              <h3><mat-icon inline>edit</mat-icon> Editing: {{ editingRule()!.name }}</h3>
              <button mat-icon-button (click)="cancelEdit()" matTooltip="Cancel editing">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <form [formGroup]="editRuleForm" (ngSubmit)="saveEdit()" class="rule-form">
              <div class="form-row-2">
                <mat-form-field appearance="outline">
                  <mat-label>Rule type</mat-label>
                  <mat-select formControlName="ruleType">
                    @for (t of ruleTypeOptions; track t.value) {
                      <mat-option [value]="t.value">
                        <mat-icon>{{ t.icon }}</mat-icon> {{ t.label }}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Severity</mat-label>
                  <mat-select formControlName="severity">
                    @for (s of severityOptions; track s.value) {
                      <mat-option [value]="s.value">
                        <span [style.color]="s.color">&#9679;</span> {{ s.label }}
                      </mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Name</mat-label>
                <input matInput formControlName="name" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <input matInput formControlName="description" />
              </mat-form-field>
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Pattern</mat-label>
                <input matInput formControlName="pattern" />
                <mat-hint>Plain text or regex</mat-hint>
              </mat-form-field>
              <div class="form-row-2">
                <mat-form-field appearance="outline">
                  <mat-label>Parameters JSON</mat-label>
                  <textarea matInput formControlName="parametersJson" rows="3"></textarea>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Applies to JSON</mat-label>
                  <textarea matInput formControlName="appliesToJson" rows="3"></textarea>
                </mat-form-field>
              </div>
              <div class="form-actions">
                <button mat-raised-button color="primary" type="submit" [disabled]="editRuleForm.invalid || savingRule()">
                  <mat-icon>save</mat-icon> Save changes
                </button>
                <button mat-stroked-button type="button" (click)="cancelEdit()">Cancel</button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [`
    .back-link { margin-bottom: 12px; font-size: 14px; }
    .back-link mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    .header-block { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 24px; flex-wrap: wrap; }
    h2 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 8px; }
    .meta-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
    .domain-chip { font-size: 12px; font-weight: 500; padding: 2px 10px; border-radius: 12px; background: #f3e5f5; color: #6a1b9a; }
    .scope-chip { font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 12px; }
    .scope-chip.org { background: #e3f2fd; color: #1565c0; }
    .scope-chip.workspace { background: #fff3e0; color: #e65100; }
    .status-chip { font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 12px; }
    .status-chip.active { background: #e8f5e9; color: #2e7d32; }
    .status-chip.archived { background: #f5f5f5; color: #888; }
    .desc { font-size: 14px; line-height: 1.5; max-width: 600px; margin: 0; color: #555; }
    .header-actions { display: flex; gap: 10px; flex-shrink: 0; }
    .header-actions mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    .rules-card { margin-bottom: 16px; }
    .rules-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
    .rules-header h3 { font-size: 17px; font-weight: 600; margin: 0 0 4px; display: flex; align-items: center; gap: 6px; }
    .rules-header h3 mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .section-help { font-size: 13px; color: var(--text-muted, #888); margin: 0; line-height: 1.5; max-width: 520px; }
    .rules-header > button mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    .add-form-wrap { padding: 20px; border-radius: 10px; background: #fafcff; border: 1px solid #e3f2fd; margin-bottom: 16px; }
    .add-form-wrap h4 { font-size: 15px; font-weight: 600; margin: 0 0 12px; }

    .rule-form { display: flex; flex-direction: column; gap: 4px; }
    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; }
    @media (max-width: 700px) { .form-row-2 { grid-template-columns: 1fr; } }
    .full-width { width: 100%; }
    .form-actions { display: flex; gap: 12px; margin-top: 8px; }
    .form-actions mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    .table-container { overflow-x: auto; margin-top: 16px; }
    .rules-table { width: 100%; }
    .rules-table th { font-size: 12px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.04em; }
    .rule-name-cell { display: flex; align-items: center; gap: 10px; }
    .rule-type-icon { color: #888; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    .rule-name-cell strong { font-size: 14px; display: block; }
    .rule-desc { font-size: 12px; color: #999; display: block; }
    .type-label { font-size: 12px; font-weight: 500; color: #555; }
    .severity-chip { font-size: 11px; font-weight: 700; padding: 2px 10px; border-radius: 12px; }
    .severity-chip.info { background: #e3f2fd; color: #1565c0; }
    .severity-chip.warn { background: #fff3e0; color: #e65100; }
    .severity-chip.block { background: #fce4ec; color: #c62828; }
    .pattern-code { font-family: monospace; font-size: 12px; padding: 2px 8px; border-radius: 4px; background: #f5f5f5; color: #333; }
    .not-set { color: #ccc; }

    .edit-card { margin-top: 16px; border: 2px solid #1976d2; }
    .edit-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .edit-header h3 { font-size: 16px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 6px; }
    .edit-header h3 mat-icon { font-size: 20px; width: 20px; height: 20px; }

    .spinner-wrap { display: flex; flex-direction: column; align-items: center; padding: 48px; gap: 12px; }
    .spinner-wrap.inner { padding: 24px; }
    .spinner-label { font-size: 14px; color: var(--text-muted, #888); }
    .empty-state { text-align: center; padding: 56px 24px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; margin-bottom: 12px; }
    .empty-state h3 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
    .empty-state p { margin: 0; font-size: 14px; color: var(--text-muted, #888); max-width: 420px; margin-inline: auto; line-height: 1.5; }
    .empty-state a { color: #1976d2; }

    .empty-state-inline { display: flex; align-items: flex-start; gap: 14px; padding: 28px 16px; margin-top: 16px; }
    .empty-state-inline mat-icon { font-size: 36px; width: 36px; height: 36px; color: #ccc; flex-shrink: 0; }
    .empty-state-inline strong { font-size: 15px; display: block; margin-bottom: 4px; }
    .empty-state-inline p { font-size: 13px; color: #888; margin: 0; line-height: 1.5; }

    .delete-item { color: #c62828; }
  `],
})
export class RulesetDetailComponent implements OnInit, OnDestroy {
  private api = inject(RulesetsApiService);
  private adminStore = inject(AdminStore);
  private notify = inject(NotificationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  private paramSub?: Subscription;

  readonly loadingRuleset = signal(true);
  readonly loadingRules = signal(false);
  readonly savingRule = signal(false);
  readonly archiving = signal(false);
  readonly showAddForm = signal(false);
  readonly ruleset = signal<BrandRuleSetResponse | null>(null);
  readonly rules = signal<BrandRuleResponse[]>([]);
  readonly editingRule = signal<BrandRuleResponse | null>(null);

  readonly displayedColumns = ['name', 'ruleType', 'severity', 'pattern', 'actions'];
  readonly ruleTypeOptions = RULE_TYPE_OPTIONS;
  readonly severityOptions = SEVERITY_OPTIONS;

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

  createRuleForm = this.fb.group({
    ruleType: ['BANNED_PHRASE', Validators.required],
    severity: ['WARN', Validators.required],
    name: ['', Validators.required],
    description: [''],
    pattern: [''],
    parametersJson: ['{}'],
    appliesToJson: ['{}'],
  });

  editRuleForm = this.fb.group({
    ruleType: ['BANNED_PHRASE', Validators.required],
    severity: ['WARN', Validators.required],
    name: ['', Validators.required],
    description: [''],
    pattern: [''],
    parametersJson: ['{}'],
    appliesToJson: ['{}'],
  });

  ngOnInit(): void {
    this.paramSub = this.route.paramMap
      .pipe(
        map((p) => p.get('id')),
        switchMap((id) => {
          this.loadingRuleset.set(true);
          this.ruleset.set(null);
          this.rules.set([]);
          this.editingRule.set(null);
          const org = this.adminStore.selectedOrgId();
          if (!id || !org) { this.loadingRuleset.set(false); return EMPTY; }
          return this.api.get(org, id);
        }),
      )
      .subscribe({
        next: (rs) => { this.ruleset.set(rs); this.loadingRuleset.set(false); this.loadRules(rs.id); },
        error: (err) => { this.loadingRuleset.set(false); this.notify.error(err.error?.detail || 'Failed to load ruleset'); },
      });
  }

  ngOnDestroy(): void {
    this.paramSub?.unsubscribe();
  }

  domainLabel(value: string): string {
    return this.domainOptions.find((d) => d.value === value)?.label ?? value;
  }

  ruleTypeLabel(value: string): string {
    return RULE_TYPE_OPTIONS.find((t) => t.value === value)?.label ?? value;
  }

  ruleTypeIcon(value: string): string {
    return RULE_TYPE_OPTIONS.find((t) => t.value === value)?.icon ?? 'rule';
  }

  severityDescription(value: string): string {
    return SEVERITY_OPTIONS.find((s) => s.value === value)?.description ?? '';
  }

  selectedRuleTypeDescription(form: 'create' | 'edit'): string {
    const v = form === 'create' ? this.createRuleForm.value.ruleType : this.editRuleForm.value.ruleType;
    return RULE_TYPE_OPTIONS.find((t) => t.value === v)?.description ?? '';
  }

  selectedSeverityDescription(form: 'create' | 'edit'): string {
    const v = form === 'create' ? this.createRuleForm.value.severity : this.editRuleForm.value.severity;
    return SEVERITY_OPTIONS.find((s) => s.value === v)?.description ?? '';
  }

  private loadRules(ruleSetId: string): void {
    this.loadingRules.set(true);
    this.api.listRules(ruleSetId).subscribe({
      next: (list) => { this.rules.set(list); this.loadingRules.set(false); },
      error: (err) => { this.loadingRules.set(false); this.notify.error(err.error?.detail || 'Failed to load rules'); },
    });
  }

  addRule(): void {
    const rs = this.ruleset();
    if (!rs || this.createRuleForm.invalid) return;
    const v = this.createRuleForm.getRawValue();
    this.savingRule.set(true);
    this.api.createRule(rs.id, {
      ruleType: v.ruleType!,
      severity: v.severity!,
      name: v.name!,
      description: v.description || undefined,
      pattern: v.pattern || undefined,
      parametersJson: v.parametersJson || '{}',
      appliesToJson: v.appliesToJson || '{}',
    }).subscribe({
      next: () => {
        this.savingRule.set(false);
        this.notify.success('Rule added');
        this.showAddForm.set(false);
        this.createRuleForm.reset({ ruleType: 'BANNED_PHRASE', severity: 'WARN', name: '', description: '', pattern: '', parametersJson: '{}', appliesToJson: '{}' });
        this.loadRules(rs.id);
      },
      error: (err) => { this.savingRule.set(false); this.notify.error(err.error?.detail || 'Failed to add rule'); },
    });
  }

  startEdit(rule: BrandRuleResponse): void {
    this.editingRule.set(rule);
    this.editRuleForm.patchValue({
      ruleType: rule.ruleType,
      severity: rule.severity,
      name: rule.name,
      description: rule.description ?? '',
      pattern: rule.pattern ?? '',
      parametersJson: rule.parametersJson || '{}',
      appliesToJson: rule.appliesToJson || '{}',
    });
  }

  cancelEdit(): void {
    this.editingRule.set(null);
  }

  saveEdit(): void {
    const rs = this.ruleset();
    const rule = this.editingRule();
    if (!rs || !rule || this.editRuleForm.invalid) return;
    const v = this.editRuleForm.getRawValue();
    this.savingRule.set(true);
    this.api.patchRule(rs.id, rule.id, {
      ruleType: v.ruleType || undefined,
      severity: v.severity || undefined,
      name: v.name || undefined,
      description: v.description || undefined,
      pattern: v.pattern || undefined,
      parametersJson: v.parametersJson || undefined,
      appliesToJson: v.appliesToJson || undefined,
    }).subscribe({
      next: () => { this.savingRule.set(false); this.notify.success('Rule updated'); this.editingRule.set(null); this.loadRules(rs.id); },
      error: (err) => { this.savingRule.set(false); this.notify.error(err.error?.detail || 'Failed to update rule'); },
    });
  }

  deleteRule(rule: BrandRuleResponse): void {
    const rs = this.ruleset();
    if (!rs || !confirm(`Delete rule "${rule.name}"? This cannot be undone.`)) return;
    this.api.deleteRule(rs.id, rule.id).subscribe({
      next: () => {
        this.notify.success('Rule deleted');
        if (this.editingRule()?.id === rule.id) this.editingRule.set(null);
        this.loadRules(rs.id);
      },
      error: (err) => this.notify.error(err.error?.detail || 'Failed to delete rule'),
    });
  }

  archiveRuleset(): void {
    const org = this.adminStore.selectedOrgId();
    const rs = this.ruleset();
    if (!org || !rs || !confirm('Archive this rule set? It will no longer be used in governance checks.')) return;
    this.archiving.set(true);
    this.api.archive(org, rs.id).subscribe({
      next: () => { this.archiving.set(false); this.notify.success('Rule set archived'); this.router.navigate(['/governance/rulesets']); },
      error: (err) => { this.archiving.set(false); this.notify.error(err.error?.detail || 'Failed to archive ruleset'); },
    });
  }
}
