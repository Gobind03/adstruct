import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
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
import { MatRadioModule } from '@angular/material/radio';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { AiWorkspacePreference } from '../models/ai.models';
import { AiPreferencesApiService } from '../services/ai-preferences-api.service';
import { AiProvidersApiService } from '../services/ai-providers-api.service';
import { AiStore } from '../store/ai.store';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '../../../core/services/notification.service';
import { RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';

interface WorkspacePolicy {
  requireApprovalForWrites: boolean;
  maxToolCallsPerTurn: number;
}

@Component({
  selector: 'app-workspace-preferences',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (!workspaceId() || !workspaceName()) {
        <mat-card class="hint"><p>Select a workspace in the shell to edit AI preferences.</p></mat-card>
      } @else {
        <header class="head">
          <h1>AI Preferences for {{ workspaceName() }}</h1>
          <p class="sub">Choose how this workspace uses organization LLM providers and safety policies.</p>
        </header>

        @if (!providers().length) {
          <mat-card class="warn">
            <mat-icon>warning</mat-icon>
            <div>
              <strong>No providers configured</strong>
              <p>Add an AI provider under organization settings before this workspace can run models.</p>
              <a mat-button color="primary" routerLink="/ai/providers">Provider settings</a>
            </div>
          </mat-card>
        }

        @if (loading()) {
          <div class="centered"><mat-spinner diameter="40" /></div>
        } @else {
          <mat-card class="section">
            <h2>Default provider</h2>
            <p class="hint-inline">Pick which org provider configuration this workspace prefers.</p>
            <mat-radio-group class="radio-grid" [(ngModel)]="selectedProviderConfigId" name="prov">
              @for (p of providers(); track p.id) {
                <mat-card class="radio-card" [class.pick]="selectedProviderConfigId === p.id">
                  <mat-radio-button [value]="p.id">
                    <span class="prov-title">{{ p.providerType }}</span>
                    <span class="prov-meta">{{ p.defaultModel }}</span>
                  </mat-radio-button>
                </mat-card>
              }
            </mat-radio-group>
            @if (!providers().length) {
              <p class="muted">No active providers to choose from.</p>
            }
          </mat-card>

          <mat-card class="section">
            <h2>Allowed models</h2>
            <p class="hint-inline">Restrict which model ids members may select (empty allows provider defaults).</p>
            <mat-chip-grid #modelGrid>
              @for (m of modelChips(); track m) {
                <mat-chip-row (removed)="removeModel(m)">{{ m }}<button matChipRemove><mat-icon>cancel</mat-icon></button></mat-chip-row>
              }
              <input
                placeholder="Add model, Enter"
                [matChipInputFor]="modelGrid"
                [matChipInputSeparatorKeyCodes]="sep"
                (matChipInputTokenEnd)="addModelChip($event)"
              />
            </mat-chip-grid>
          </mat-card>

          <mat-card class="section">
            <h2>Policy</h2>
            <mat-checkbox [(ngModel)]="requireApproval" name="appr">
              Require approval for AI write actions
            </mat-checkbox>
            <p class="check-hint">When enabled, destructive or high-risk tool calls create proposals instead of running immediately.</p>
            <mat-form-field appearance="outline" class="num-field">
              <mat-label>Max tool calls per turn</mat-label>
              <input matInput type="number" min="1" max="99" [(ngModel)]="maxToolCalls" name="maxTc" />
              <mat-hint>Caps how many tool invocations a single assistant turn may schedule</mat-hint>
            </mat-form-field>
          </mat-card>

          <div class="save-row">
            <button mat-flat-button color="primary" (click)="save()" [disabled]="saveBusy() || !providers().length">
              @if (saveBusy()) { <mat-spinner diameter="18" /> } @else { Save preferences }
            </button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 40px; max-width: 720px; margin: 0 auto; }
    .hint { padding: 24px; text-align: center; }
    .head { margin-bottom: 20px; }
    h1 { margin: 0; font-size: 1.45rem; font-weight: 600; }
    .sub { margin: 8px 0 0; color: #6b7280; font-size: 14px; }
    .warn {
      display: flex; gap: 12px; align-items: flex-start; margin-bottom: 20px; padding: 14px 16px !important;
      background: #fffbeb; border: 1px solid #fcd34d;
    }
    .warn mat-icon { color: #d97706; }
    .warn p { margin: 4px 0 8px; font-size: 13px; color: #78350f; }
    .centered { display: flex; justify-content: center; padding: 40px; }
    .section { padding: 18px 20px !important; margin-bottom: 16px; }
    .section h2 { margin: 0 0 8px; font-size: 1rem; }
    .hint-inline { margin: 0 0 12px; font-size: 13px; color: #6b7280; }
    .radio-grid { display: flex; flex-direction: column; gap: 8px; }
    .radio-card { padding: 8px 12px !important; cursor: pointer; border: 2px solid transparent; }
    .radio-card.pick { border-color: #3f51b5; background: #f5f7ff; }
    .prov-title { font-weight: 600; display: block; }
    .prov-meta { font-size: 12px; color: #6b7280; }
    .muted { color: #9ca3af; font-size: 13px; }
    .check-hint { font-size: 12px; color: #6b7280; margin: 4px 0 16px 24px; max-width: 560px; line-height: 1.4; }
    .num-field { width: 100%; max-width: 320px; margin-top: 8px; }
    .save-row { margin-top: 8px; }
  `],
})
export class WorkspacePreferencesComponent {
  private admin = inject(AdminStore);
  private aiStore = inject(AiStore);
  private prefApi = inject(AiPreferencesApiService);
  private provApi = inject(AiProvidersApiService);
  private notify = inject(NotificationService);

  readonly workspaceId = this.admin.selectedWorkspaceId;
  readonly workspaceName = computed(() => this.admin.selectedWorkspace()?.name ?? null);
  readonly providers = this.aiStore.providers;

  readonly loading = signal(true);
  readonly saveBusy = signal(false);

  selectedProviderConfigId: string | null = null;
  private _modelChips = signal<string[]>([]);
  readonly modelChips = this._modelChips.asReadonly();
  requireApproval = true;
  maxToolCalls = 8;

  readonly sep = [ENTER, COMMA];

  private activePref = signal<AiWorkspacePreference | null>(null);

  private seq = 0;

  constructor() {
    effect(() => {
      const ws = this.workspaceId();
      const org = this.orgId();
      if (!ws || !org) {
        this.loading.set(false);
        return;
      }
      const s = ++this.seq;
      this.loading.set(true);
      this.provApi.list(org).subscribe({
        next: (list) => {
          if (s !== this.seq) return;
          this.aiStore.setProviders(list);
        },
        error: () => {
          if (s !== this.seq) return;
        },
      });
      this.prefApi.list(ws).subscribe({
        next: (prefs) => {
          if (s !== this.seq) return;
          this.aiStore.setPreferences(prefs);
          const def = prefs.find((p) => p.isDefault) ?? prefs[0] ?? null;
          this.activePref.set(def);
          this.applyPref(def);
          this.loading.set(false);
        },
        error: () => {
          if (s !== this.seq) return;
          this.loading.set(false);
        },
      });
    }, { allowSignalWrites: true });
  }

  private orgId(): string | null {
    return this.admin.selectedOrgId();
  }

  private applyPref(p: AiWorkspacePreference | null): void {
    if (!p) {
      const first = this.aiStore.providers()[0];
      this.selectedProviderConfigId = first?.id ?? null;
      this._modelChips.set([]);
      this.requireApproval = true;
      this.maxToolCalls = 8;
      return;
    }
    this.selectedProviderConfigId = p.providerConfigId;
    this._modelChips.set(this.parseModels(p.allowedModels));
    const pol = this.parsePolicy(p.policyJson);
    this.requireApproval = pol.requireApprovalForWrites;
    this.maxToolCalls = pol.maxToolCallsPerTurn;
  }

  private parseModels(raw: string | null): string[] {
    if (!raw?.trim()) return [];
    try {
      const j = JSON.parse(raw) as unknown;
      if (Array.isArray(j)) return j.map(String).filter(Boolean);
    } catch {
      /* ignore */
    }
    return [];
  }

  private serializeModels(): string {
    return JSON.stringify(this._modelChips());
  }

  private parsePolicy(raw: string | null): WorkspacePolicy {
    const fallback: WorkspacePolicy = { requireApprovalForWrites: true, maxToolCallsPerTurn: 8 };
    if (!raw?.trim()) return fallback;
    try {
      const j = JSON.parse(raw) as Record<string, unknown>;
      return {
        requireApprovalForWrites: Boolean(j['requireApprovalForWrites'] ?? true),
        maxToolCallsPerTurn: Number(j['maxToolCallsPerTurn'] ?? 8) || 8,
      };
    } catch {
      return fallback;
    }
  }

  private serializePolicy(): string {
    return JSON.stringify({
      requireApprovalForWrites: this.requireApproval,
      maxToolCallsPerTurn: this.maxToolCalls,
    });
  }

  addModelChip(ev: MatChipInputEvent): void {
    const v = (ev.value ?? '').trim();
    if (!v || this._modelChips().includes(v)) return;
    this._modelChips.update((m) => [...m, v]);
    ev.chipInput?.clear();
  }

  removeModel(m: string): void {
    this._modelChips.update((x) => x.filter((y) => y !== m));
  }

  save(): void {
    const ws = this.workspaceId();
    const pid = this.selectedProviderConfigId;
    if (!ws || !pid) {
      this.notify.error('Choose a provider');
      return;
    }
    this.saveBusy.set(true);
    const existing = this.activePref();
    const allowedModels = this.serializeModels();
    const policyJson = this.serializePolicy();

    if (existing && existing.providerConfigId === pid) {
      this.prefApi.patch(ws, existing.id, { allowedModels, policyJson }).subscribe({
        next: (p) => {
          this.aiStore.upsertPreference(p);
          this.activePref.set(p);
          this.saveBusy.set(false);
          this.notify.success('Preferences saved');
        },
        error: () => {
          this.saveBusy.set(false);
          this.notify.error('Save failed');
        },
      });
      return;
    }

    this.prefApi
      .create(ws, {
        providerConfigId: pid,
        isDefault: true,
        allowedModels,
        policyJson,
      })
      .pipe(switchMap((p) => this.prefApi.setDefault(ws, p.id)))
      .subscribe({
        next: (p) => {
          this.aiStore.upsertPreference(p);
          this.activePref.set(p);
          this.saveBusy.set(false);
          this.notify.success('Preferences saved');
        },
        error: () => {
          this.saveBusy.set(false);
          this.notify.error('Save failed');
        },
      });
  }
}
