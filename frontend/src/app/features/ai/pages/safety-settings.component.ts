import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { AiRedactionRule, AiToolDefinition, ToolRiskLevel } from '../models/ai.models';
import { AiSafetyApiService } from '../services/ai-safety-api.service';
import { AiToolsApiService } from '../services/ai-tools-api.service';
import { AiStore } from '../store/ai.store';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '../../../core/services/notification.service';

interface ContentPolicyState {
  bannedPhrases: string[];
  blockedTopics: string[];
  allowedTools: string[];
}

@Component({
  selector: 'app-safety-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (!workspaceId()) {
        <mat-card class="hint"><p>Select a workspace.</p></mat-card>
      } @else {
        <header class="head">
          <h1>Safety &amp; redaction</h1>
          <p class="sub">Content policies and PII-style redaction for AI outputs in this workspace.</p>
        </header>

        <mat-tab-group
          mat-stretch-tabs="false"
          class="tabs"
          [selectedIndex]="activeTab()"
          (selectedIndexChange)="activeTab.set($event)"
        >
          <mat-tab label="Content policy">
            <div class="tab-body">
              @if (policyLoading()) {
                <div class="centered"><mat-spinner diameter="36" /></div>
              } @else {
                <mat-card class="panel">
                  <div class="adv-toggle">
                    <mat-slide-toggle [(ngModel)]="useAdvancedJson" name="adv">Advanced: raw JSON editor</mat-slide-toggle>
                  </div>

                  @if (useAdvancedJson) {
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>policyJson</mat-label>
                      <textarea matInput rows="14" [(ngModel)]="policyRawJson" name="rawpol"></textarea>
                    </mat-form-field>
                  } @else {
                    <h3>Banned phrases</h3>
                    <p class="field-hint">Substrings blocked from model outputs (case-sensitive match on server).</p>
                    <mat-chip-grid #banGrid>
                      @for (x of bannedPhrases(); track x) {
                        <mat-chip-row (removed)="removeBanned(x)">{{ x }}<button matChipRemove><mat-icon>cancel</mat-icon></button></mat-chip-row>
                      }
                      <input
                        [matChipInputFor]="banGrid"
                        [matChipInputSeparatorKeyCodes]="sep"
                        (matChipInputTokenEnd)="addBanned($event)"
                      />
                    </mat-chip-grid>

                    <h3>Blocked topics</h3>
                    <p class="field-hint">Topic labels your reviewers want the agent to avoid.</p>
                    <mat-chip-grid #topicGrid>
                      @for (x of blockedTopics(); track x) {
                        <mat-chip-row (removed)="removeTopic(x)">{{ x }}<button matChipRemove><mat-icon>cancel</mat-icon></button></mat-chip-row>
                      }
                      <input
                        [matChipInputFor]="topicGrid"
                        [matChipInputSeparatorKeyCodes]="sep"
                        (matChipInputTokenEnd)="addTopic($event)"
                      />
                    </mat-chip-grid>

                    <h3>Allowed tools</h3>
                    <p class="field-hint">Uncheck to deny a tool regardless of catalog defaults.</p>
                    <div class="tool-list">
                      @for (t of tools(); track t.id) {
                        <label class="tool-row">
                          <mat-checkbox
                            [checked]="isToolAllowed(t.name)"
                            (change)="toggleTool(t.name, $event.checked)"
                          >
                            {{ t.name }}
                          </mat-checkbox>
                          <mat-chip [class]="riskCls(t.riskLevel)" class="risk-mini">{{ riskLbl(t.riskLevel) }}</mat-chip>
                        </label>
                      }
                      @if (!tools().length) {
                        <p class="muted">No tools loaded.</p>
                      }
                    </div>
                  }

                  <button mat-flat-button color="primary" (click)="savePolicy()" [disabled]="policySaveBusy()">
                    @if (policySaveBusy()) { <mat-spinner diameter="18" /> } @else { Save policy }
                  </button>
                </mat-card>
              }
            </div>
          </mat-tab>

          <mat-tab label="Redaction rules">
            <div class="tab-body">
              <mat-card class="banner">
                <mat-icon>shield</mat-icon>
                <div>
                  <strong>Redaction</strong>
                  <p>
                    Rules run on AI text before it is shown to users. Use regex patterns carefully; invalid patterns may be rejected by the API.
                  </p>
                </div>
              </mat-card>

              @if (rulesLoading()) {
                <div class="centered"><mat-spinner diameter="36" /></div>
              } @else {
                <mat-card class="panel built-in">
                  <h3>Built-in patterns</h3>
                  <p class="muted">These ship with the platform (examples). They are not editable here.</p>
                  <ul>
                    @for (b of builtInRules; track b.name) {
                      <li><code>{{ b.pattern }}</code> → {{ b.replacement }} ({{ b.name }})</li>
                    }
                  </ul>
                </mat-card>

                <mat-card class="panel">
                  <h3>Your rules</h3>
                  <table mat-table [dataSource]="rules()" class="rule-table">
                    <ng-container matColumnDef="name">
                      <th mat-header-cell *matHeaderCellDef>Name</th>
                      <td mat-cell *matCellDef="let row">{{ row.name }}</td>
                    </ng-container>
                    <ng-container matColumnDef="pattern">
                      <th mat-header-cell *matHeaderCellDef>Pattern</th>
                      <td mat-cell *matCellDef="let row"><code>{{ row.pattern }}</code></td>
                    </ng-container>
                    <ng-container matColumnDef="replacement">
                      <th mat-header-cell *matHeaderCellDef>Replacement</th>
                      <td mat-cell *matCellDef="let row">{{ row.replacement }}</td>
                    </ng-container>
                    <ng-container matColumnDef="enabled">
                      <th mat-header-cell *matHeaderCellDef>On</th>
                      <td mat-cell *matCellDef="let row">
                        <mat-slide-toggle
                          [checked]="row.enabled"
                          (change)="toggleRuleEnabled(row, $event.checked)"
                        />
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef></th>
                      <td mat-cell *matCellDef="let row">
                        <button mat-button type="button" (click)="startEditRule(row)">Edit</button>
                        <button mat-button type="button" color="warn" (click)="deleteRule(row)">Delete</button>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="ruleCols"></tr>
                    <tr mat-row *matRowDef="let row; columns: ruleCols"></tr>
                  </table>
                </mat-card>

                <mat-card class="panel">
                  <h3>{{ editingRule() ? 'Edit rule' : 'Add rule' }}</h3>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Name</mat-label>
                    <input matInput [(ngModel)]="formRuleName" name="rn" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Pattern (regex)</mat-label>
                    <input matInput [(ngModel)]="formRulePattern" name="rp" class="mono" />
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Replacement</mat-label>
                    <input matInput [(ngModel)]="formRuleReplacement" name="rr" />
                  </mat-form-field>
                  <mat-checkbox [(ngModel)]="formRuleEnabled" name="re">Enabled</mat-checkbox>
                  <div class="form-actions">
                    @if (editingRule()) {
                      <button mat-button type="button" (click)="cancelRuleForm()">Cancel</button>
                      <button mat-flat-button color="primary" (click)="submitRuleForm()" [disabled]="ruleFormBusy()">Update</button>
                    } @else {
                      <button mat-flat-button color="primary" (click)="submitRuleForm()" [disabled]="ruleFormBusy()">Add rule</button>
                    }
                  </div>
                </mat-card>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 40px; max-width: 960px; margin: 0 auto; }
    .hint { padding: 24px; text-align: center; }
    .head { margin-bottom: 16px; }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .sub { margin: 6px 0 0; color: #6b7280; font-size: 14px; }
    .tabs { margin-top: 8px; }
    .tab-body { padding: 16px 0 24px; }
    .panel { padding: 16px 18px !important; margin-bottom: 16px; }
    .panel h3 { margin: 16px 0 6px; font-size: 14px; font-weight: 600; }
    .panel h3:first-child { margin-top: 0; }
    .field-hint { font-size: 12px; color: #6b7280; margin: 0 0 8px; }
    .adv-toggle { margin-bottom: 16px; }
    .full { width: 100%; margin-bottom: 8px; }
    .tool-list { display: flex; flex-direction: column; gap: 8px; margin: 8px 0 16px; }
    .tool-row { display: flex; align-items: center; gap: 10px; }
    .risk-mini { font-size: 10px !important; min-height: 22px !important; }
    mat-chip.risk-low { --mdc-chip-container-color: #dcfce7; color: #166534; }
    mat-chip.risk-med { --mdc-chip-container-color: #fef9c3; color: #854d0e; }
    mat-chip.risk-high { --mdc-chip-container-color: #fee2e2; color: #991b1b; }
    mat-chip.risk-unk { --mdc-chip-container-color: #f3f4f6; color: #4b5563; }
    .muted { color: #6b7280; font-size: 13px; }
    .centered { display: flex; justify-content: center; padding: 32px; }
    .banner { display: flex; gap: 12px; margin-bottom: 16px; background: #f0fdf4; border: 1px solid #bbf7d0; }
    .banner mat-icon { color: #16a34a; }
    .banner p { margin: 4px 0 0; font-size: 13px; color: #14532d; }
    .built-in ul { margin: 8px 0 0; padding-left: 18px; font-size: 13px; }
    .built-in code { font-size: 12px; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
    .rule-table { width: 100%; }
    .mono { font-family: ui-monospace, monospace; font-size: 13px; }
    .form-actions { margin-top: 12px; display: flex; gap: 8px; }
  `],
})
export class SafetySettingsComponent {
  private admin = inject(AdminStore);
  private aiStore = inject(AiStore);
  private safetyApi = inject(AiSafetyApiService);
  private toolsApi = inject(AiToolsApiService);
  private notify = inject(NotificationService);

  readonly workspaceId = this.admin.selectedWorkspaceId;
  readonly tools = this.aiStore.tools;
  /** Selected tab index (Content policy = 0, Redaction rules = 1). */
  readonly activeTab = signal(0);

  readonly policyLoading = signal(true);
  readonly policySaveBusy = signal(false);
  readonly rulesLoading = signal(true);
  readonly ruleFormBusy = signal(false);

  useAdvancedJson = false;
  policyRawJson = '';

  private _banned = signal<string[]>([]);
  private _topics = signal<string[]>([]);
  private _allowedTools = signal<Set<string>>(new Set());
  readonly bannedPhrases = this._banned.asReadonly();
  readonly blockedTopics = this._topics.asReadonly();

  readonly rules = this.aiStore.redactionRules;
  readonly ruleCols = ['name', 'pattern', 'replacement', 'enabled', 'actions'];

  readonly editingRule = signal<AiRedactionRule | null>(null);
  formRuleName = '';
  formRulePattern = '';
  formRuleReplacement = '[REDACTED]';
  formRuleEnabled = true;

  readonly sep = [ENTER, COMMA];

  readonly builtInRules = [
    { name: 'US phone (example)', pattern: String.raw`\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b`, replacement: '[PHONE]' },
    { name: 'Email (example)', pattern: String.raw`[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}`, replacement: '[EMAIL]' },
  ];

  private policySeq = 0;
  private rulesSeq = 0;

  constructor() {
    effect(() => {
      const ws = this.workspaceId();
      if (!ws) return;
      const p = ++this.policySeq;
      this.policyLoading.set(true);
      this.safetyApi.getPolicy(ws).subscribe({
        next: (pol) => {
          if (p !== this.policySeq) return;
          this.aiStore.setSafetyPolicy(pol);
          this.policyRawJson = pol.policyJson || '{}';
          this.applyPolicyJson(pol.policyJson);
          this.policyLoading.set(false);
        },
        error: () => {
          if (p !== this.policySeq) return;
          this.policyLoading.set(false);
          this.notify.error('Failed to load safety policy');
        },
      });

      const r = ++this.rulesSeq;
      this.rulesLoading.set(true);
      this.safetyApi.listRedactionRules(ws).subscribe({
        next: (list) => {
          if (r !== this.rulesSeq) return;
          this.aiStore.setRedactionRules(list);
          this.rulesLoading.set(false);
        },
        error: () => {
          if (r !== this.rulesSeq) return;
          this.rulesLoading.set(false);
        },
      });

      this.toolsApi.list(ws).subscribe({
        next: (list) => this.aiStore.setTools(list),
        error: () => {
          /* ignore */
        },
      });
    }, { allowSignalWrites: true });
  }

  private applyPolicyJson(raw: string | null): void {
    const st = this.parseContentPolicy(raw);
    this._banned.set(st.bannedPhrases);
    this._topics.set(st.blockedTopics);
    this._allowedTools.set(new Set(st.allowedTools));
  }

  private parseContentPolicy(raw: string | null): ContentPolicyState {
    const empty: ContentPolicyState = { bannedPhrases: [], blockedTopics: [], allowedTools: [] };
    if (!raw?.trim()) return empty;
    try {
      const j = JSON.parse(raw) as Record<string, unknown>;
      const bp = j['bannedPhrases'];
      const bt = j['blockedTopics'];
      const at = j['allowedTools'];
      return {
        bannedPhrases: Array.isArray(bp) ? bp.map(String) : [],
        blockedTopics: Array.isArray(bt) ? bt.map(String) : [],
        allowedTools: Array.isArray(at) ? at.map(String) : [],
      };
    } catch {
      return empty;
    }
  }

  private serializeContentPolicy(): string {
    if (this.useAdvancedJson) {
      try {
        JSON.parse(this.policyRawJson.trim() || '{}');
      } catch {
        this.notify.error('Invalid JSON');
        throw new Error('invalid');
      }
      return this.policyRawJson.trim() || '{}';
    }
    const allNames = this.tools().map((t) => t.name);
    const allowed = new Set(this._allowedTools());
    const allowedTools =
      allowed.size === 0 ? allNames : allNames.filter((n) => allowed.has(n));
    return JSON.stringify({
      bannedPhrases: this._banned(),
      blockedTopics: this._topics(),
      allowedTools,
    });
  }

  addBanned(ev: MatChipInputEvent): void {
    const v = (ev.value ?? '').trim();
    if (!v || this._banned().includes(v)) return;
    this._banned.update((x) => [...x, v]);
    ev.chipInput?.clear();
  }

  removeBanned(x: string): void {
    this._banned.update((b) => b.filter((y) => y !== x));
  }

  addTopic(ev: MatChipInputEvent): void {
    const v = (ev.value ?? '').trim();
    if (!v || this._topics().includes(v)) return;
    this._topics.update((x) => [...x, v]);
    ev.chipInput?.clear();
  }

  removeTopic(x: string): void {
    this._topics.update((b) => b.filter((y) => y !== x));
  }

  isToolAllowed(name: string): boolean {
    const s = this._allowedTools();
    if (s.size === 0) return true;
    return s.has(name);
  }

  toggleTool(name: string, on: boolean): void {
    const cur = new Set(this._allowedTools());
    if (cur.size === 0) {
      for (const t of this.tools()) cur.add(t.name);
    }
    if (on) cur.add(name);
    else cur.delete(name);
    this._allowedTools.set(cur);
  }

  savePolicy(): void {
    const ws = this.workspaceId();
    if (!ws) return;
    let json: string;
    try {
      json = this.serializeContentPolicy();
    } catch {
      return;
    }
    this.policySaveBusy.set(true);
    this.safetyApi.patchPolicy(ws, { policyJson: json }).subscribe({
      next: (pol) => {
        this.aiStore.setSafetyPolicy(pol);
        this.policyRawJson = pol.policyJson || json;
        this.policySaveBusy.set(false);
        this.notify.success('Policy saved');
      },
      error: () => {
        this.policySaveBusy.set(false);
        this.notify.error('Save failed');
      },
    });
  }

  riskLbl(r: ToolRiskLevel | null | undefined): string {
    if (!r) return '?';
    return r.replace(/_/g, ' ');
  }

  riskCls(r: ToolRiskLevel | null | undefined): string {
    switch (r) {
      case 'READ_ONLY':
        return 'risk-low';
      case 'SAFE_WRITE':
        return 'risk-med';
      case 'HIGH_RISK_WRITE':
        return 'risk-high';
      default:
        return 'risk-unk';
    }
  }

  toggleRuleEnabled(row: AiRedactionRule, on: boolean): void {
    const ws = this.workspaceId();
    if (!ws) return;
    this.safetyApi.patchRedactionRule(ws, row.id, { enabled: on }).subscribe({
      next: (r) => this.aiStore.upsertRedactionRule(r),
      error: () => this.notify.error('Update failed'),
    });
  }

  startEditRule(row: AiRedactionRule): void {
    this.editingRule.set(row);
    this.formRuleName = row.name;
    this.formRulePattern = row.pattern;
    this.formRuleReplacement = row.replacement;
    this.formRuleEnabled = row.enabled;
  }

  cancelRuleForm(): void {
    this.editingRule.set(null);
    this.formRuleName = '';
    this.formRulePattern = '';
    this.formRuleReplacement = '[REDACTED]';
    this.formRuleEnabled = true;
  }

  deleteRule(row: AiRedactionRule): void {
    const ws = this.workspaceId();
    if (!ws) return;
    this.safetyApi.deleteRedactionRule(ws, row.id).subscribe({
      next: () => {
        this.aiStore.removeRedactionRule(row.id);
        this.notify.success('Rule deleted');
      },
      error: () => this.notify.error('Delete failed'),
    });
  }

  submitRuleForm(): void {
    const ws = this.workspaceId();
    if (!ws) return;
    const name = this.formRuleName.trim();
    const pattern = this.formRulePattern.trim();
    if (!name || !pattern) {
      this.notify.error('Name and pattern are required');
      return;
    }
    this.ruleFormBusy.set(true);
    const edit = this.editingRule();
    if (edit) {
      this.safetyApi
        .patchRedactionRule(ws, edit.id, {
          name,
          pattern,
          replacement: this.formRuleReplacement,
          enabled: this.formRuleEnabled,
        })
        .subscribe({
          next: (r) => {
            this.aiStore.upsertRedactionRule(r);
            this.ruleFormBusy.set(false);
            this.cancelRuleForm();
            this.notify.success('Rule updated');
          },
          error: () => {
            this.ruleFormBusy.set(false);
            this.notify.error('Update failed');
          },
        });
    } else {
      this.safetyApi
        .createRedactionRule(ws, {
          name,
          pattern,
          replacement: this.formRuleReplacement,
          enabled: this.formRuleEnabled,
        })
        .subscribe({
          next: (r) => {
            this.aiStore.upsertRedactionRule(r);
            this.ruleFormBusy.set(false);
            this.cancelRuleForm();
            this.notify.success('Rule added');
          },
          error: () => {
            this.ruleFormBusy.set(false);
            this.notify.error('Create failed');
          },
        });
    }
  }
}
