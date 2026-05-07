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
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LlmProviderType, AiProviderConfig } from '../models/ai.models';
import { AiProvidersApiService } from '../services/ai-providers-api.service';
import { AiStore } from '../store/ai.store';
import { AdminStore } from '../../admin/store/admin.store';

type WizardProvider = 'OPENAI' | 'PERPLEXITY' | 'CUSTOM_HTTP';

interface ProviderGuide {
  title: string;
  icon: string;
  description: string;
  keyLabel: string;
  keyPlaceholder: string;
  keyHelp: string;
  keyLink: string;
  keyLinkLabel: string;
  defaultModel: string;
  modelHint: string;
  models: string[];
  endpointNeeded: boolean;
  endpointHelp: string;
  temperatureHint: string;
  maxTokensHint: string;
}

const PROVIDER_GUIDES: Record<WizardProvider, ProviderGuide> = {
  OPENAI: {
    title: 'OpenAI',
    icon: 'smart_toy',
    description: 'Connect to OpenAI\'s GPT models including GPT-4o, GPT-4-turbo, and GPT-3.5-turbo.',
    keyLabel: 'OpenAI API Key',
    keyPlaceholder: 'sk-proj-...',
    keyHelp: 'Your key starts with "sk-" and can be generated from the OpenAI dashboard. It is encrypted with AES-256-GCM before storage and never appears in logs or API responses.',
    keyLink: 'https://platform.openai.com/api-keys',
    keyLinkLabel: 'Get your key at platform.openai.com/api-keys',
    defaultModel: 'gpt-4o-mini',
    modelHint: 'The model used when none is specified. Check OpenAI\'s pricing page for costs per model.',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini', 'o1-preview'],
    endpointNeeded: false,
    endpointHelp: '',
    temperatureHint: 'Controls randomness. 0 = deterministic, 1 = creative. OpenAI recommends 0.7 for creative tasks, 0.2 for factual/analytical tasks.',
    maxTokensHint: 'Maximum tokens in the response. GPT-4o supports up to 16,384 output tokens. Higher values cost more.',
  },
  PERPLEXITY: {
    title: 'Perplexity',
    icon: 'travel_explore',
    description: 'Connect to Perplexity\'s Sonar models with built-in web search and real-time information retrieval.',
    keyLabel: 'Perplexity API Key',
    keyPlaceholder: 'pplx-...',
    keyHelp: 'Your key starts with "pplx-" and can be found in your Perplexity account settings under API. It is encrypted before storage.',
    keyLink: 'https://www.perplexity.ai/settings/api',
    keyLinkLabel: 'Get your key at perplexity.ai/settings/api',
    defaultModel: 'sonar',
    modelHint: 'Perplexity\'s Sonar models include web search results automatically in responses.',
    models: ['sonar', 'sonar-pro', 'sonar-reasoning', 'sonar-reasoning-pro'],
    endpointNeeded: false,
    endpointHelp: '',
    temperatureHint: 'Controls response variety. Lower values give more focused, factual answers. Perplexity recommends 0.2 for search-based queries.',
    maxTokensHint: 'Maximum tokens in the response. Sonar models support up to 4,096 output tokens.',
  },
  CUSTOM_HTTP: {
    title: 'Custom HTTP Endpoint',
    icon: 'http',
    description: 'Connect any OpenAI-compatible API endpoint (e.g., Azure OpenAI, Ollama, vLLM, LiteLLM, or a private deployment).',
    keyLabel: 'API Key / Bearer Token',
    keyPlaceholder: 'your-api-key-or-token',
    keyHelp: 'The authentication token for your custom endpoint. Leave empty if your endpoint does not require authentication.',
    keyLink: '',
    keyLinkLabel: '',
    defaultModel: 'default',
    modelHint: 'The model identifier your endpoint expects. Check your deployment\'s documentation.',
    models: [],
    endpointNeeded: true,
    endpointHelp: 'The base URL of your OpenAI-compatible API. The system will call {base}/chat/completions. Example: https://your-server.com/v1',
    temperatureHint: 'Behavior depends on the model behind your endpoint. Typically 0-1 range.',
    maxTokensHint: 'Max tokens depends on the model deployed at your endpoint.',
  },
};

@Component({
  selector: 'app-provider-settings',
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
    MatSliderModule,
    MatStepperModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <mat-card class="banner">
        <mat-icon>info</mat-icon>
        <div>
          <strong>Organization-wide keys</strong>
          <p>Provider keys are organization-wide. Each workspace can then choose its preferred provider and restrict which models are allowed in Workspace AI Preferences.</p>
        </div>
      </mat-card>

      <header class="head">
        <div>
          <h1>AI Provider Keys</h1>
          <p class="sub">Connect your OpenAI, Perplexity, or custom LLM API keys to enable AI features.</p>
        </div>
        @if (isOrgAdmin() && orgId()) {
          <button mat-flat-button color="primary" type="button" (click)="openWizard()">
            <mat-icon>add</mat-icon>
            Add Provider
          </button>
        }
      </header>

      @if (!orgId()) {
        <mat-card class="hint"><p>Select an organization to manage AI providers.</p></mat-card>
      } @else if (!isOrgAdmin()) {
        <mat-card class="hint"><p>Only organization admins can manage AI provider configuration.</p></mat-card>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (!providers().length && !showWizard()) {
        <mat-card class="empty">
          <mat-icon class="big">vpn_key</mat-icon>
          <h2>Connect your AI providers</h2>
          <p>
            Add your OpenAI or Perplexity API key to enable AI-powered features like Chat, Prompt Library,
            and Workflow automation across all workspaces. Keys are encrypted at rest using AES-256-GCM
            and are never exposed in logs or API responses.
          </p>
          <button mat-flat-button color="primary" (click)="openWizard()">Add Provider</button>
        </mat-card>
      } @else {
        @if (showWizard()) {
          <mat-card class="wizard-card">
            <div class="wizard-toolbar">
              <h2>Add AI Provider</h2>
              <button mat-icon-button type="button" (click)="closeWizard()" matTooltip="Close"><mat-icon>close</mat-icon></button>
            </div>
            <mat-vertical-stepper #stepper>
              <!-- STEP 1: Choose Provider -->
              <mat-step label="Choose Provider">
                <p class="step-desc">Which LLM provider do you want to connect?</p>
                <div class="type-grid">
                  @for (opt of typeOptions; track opt.type) {
                    <mat-card
                      class="type-card"
                      [class.selected]="wizType() === opt.type"
                      (click)="selectType(opt.type)"
                    >
                      <mat-icon>{{ opt.icon }}</mat-icon>
                      <h3>{{ opt.title }}</h3>
                      <p>{{ opt.description }}</p>
                    </mat-card>
                  }
                </div>
                <div class="step-actions">
                  <button mat-button matStepperNext [disabled]="!wizType()">Continue</button>
                </div>
              </mat-step>

              <!-- STEP 2: API Key (provider-specific) -->
              <mat-step label="API Key">
                @if (activeGuide(); as guide) {
                  <div class="guide-header">
                    <mat-icon>{{ guide.icon }}</mat-icon>
                    <div>
                      <strong>{{ guide.title }} API Key</strong>
                      <p class="step-desc">{{ guide.keyHelp }}</p>
                    </div>
                  </div>

                  @if (guide.keyLink) {
                    <a class="key-link" [href]="guide.keyLink" target="_blank" rel="noopener">
                      <mat-icon>open_in_new</mat-icon>
                      {{ guide.keyLinkLabel }}
                    </a>
                  }

                  <mat-form-field appearance="outline" class="full">
                    <mat-label>{{ guide.keyLabel }}</mat-label>
                    <input
                      matInput
                      [(ngModel)]="wizApiKey"
                      [type]="hideKey() ? 'password' : 'text'"
                      [placeholder]="guide.keyPlaceholder"
                      name="apiKey"
                      autocomplete="off"
                      required
                    />
                    <button
                      mat-icon-button
                      matSuffix
                      type="button"
                      (click)="hideKey.set(!hideKey())"
                      [attr.aria-label]="hideKey() ? 'Show key' : 'Hide key'"
                    >
                      <mat-icon>{{ hideKey() ? 'visibility' : 'visibility_off' }}</mat-icon>
                    </button>
                    <mat-hint>Your key is encrypted before storage and never appears in logs or responses</mat-hint>
                  </mat-form-field>

                  @if (guide.endpointNeeded) {
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Base URL</mat-label>
                      <input
                        matInput
                        [(ngModel)]="wizEndpointUrl"
                        name="endpoint"
                        placeholder="https://your-server.com/v1"
                        required
                      />
                      <mat-hint>{{ guide.endpointHelp }}</mat-hint>
                    </mat-form-field>
                  }

                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Display Name (optional)</mat-label>
                    <input
                      matInput
                      [(ngModel)]="wizDisplayName"
                      name="displayName"
                      [placeholder]="guide.title + ' - Production'"
                    />
                    <mat-hint>A friendly label to identify this provider in the UI</mat-hint>
                  </mat-form-field>
                }
                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-button matStepperNext [disabled]="!wizApiKey.trim() || (activeGuide()?.endpointNeeded && !wizEndpointUrl.trim())">Continue</button>
                </div>
              </mat-step>

              <!-- STEP 3: Model & Defaults (provider-specific) -->
              <mat-step label="Model & Defaults">
                @if (activeGuide(); as guide) {
                  <p class="step-desc">Configure default model and parameters for {{ guide.title }}.</p>

                  <mat-form-field appearance="outline" class="full">
                    <mat-label>Default Model</mat-label>
                    <input matInput [(ngModel)]="wizModel" name="model" [placeholder]="guide.defaultModel" />
                    <mat-hint>{{ guide.modelHint }}</mat-hint>
                  </mat-form-field>

                  @if (guide.models.length) {
                    <div class="model-chips">
                      <span class="chip-label">Popular models:</span>
                      @for (m of guide.models; track m) {
                        <button mat-stroked-button class="model-chip" (click)="wizModel = m" [class.active]="wizModel === m">{{ m }}</button>
                      }
                    </div>
                  }

                  <div class="slider-row">
                    <label>Temperature (0 – 1)</label>
                    <mat-slider min="0" max="1" step="0.05" discrete class="temp-slider">
                      <input matSliderThumb [(ngModel)]="wizTemperature" name="temp" />
                    </mat-slider>
                    <span class="temp-val">{{ wizTemperature | number: '1.2-2' }}</span>
                  </div>
                  <p class="field-hint">{{ guide.temperatureHint }}</p>

                  <div class="defaults-row">
                    <mat-form-field appearance="outline" class="half">
                      <mat-label>Max Tokens</mat-label>
                      <input matInput type="number" [(ngModel)]="wizMaxTokens" name="maxTok" />
                      <mat-hint>{{ guide.maxTokensHint }}</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="half">
                      <mat-label>Timeout (ms)</mat-label>
                      <input matInput type="number" [(ngModel)]="wizTimeoutMs" name="to" />
                      <mat-hint>How long to wait before failing the request</mat-hint>
                    </mat-form-field>
                  </div>
                }
                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-button matStepperNext [disabled]="!wizModel.trim()">Continue</button>
                </div>
              </mat-step>

              <!-- STEP 4: Confirm -->
              <mat-step label="Confirm">
                @if (activeGuide(); as guide) {
                  <mat-card class="summary-card">
                    <div class="summary-row">
                      <mat-icon>{{ guide.icon }}</mat-icon>
                      <div>
                        <strong>{{ guide.title }}</strong>
                        <span class="summary-sub">{{ wizDisplayName || guide.title + ' API Key' }}</span>
                      </div>
                    </div>
                    <div class="summary-grid">
                      <div><span class="sl">Model</span><span class="sv">{{ wizModel }}</span></div>
                      <div><span class="sl">Temperature</span><span class="sv">{{ wizTemperature | number: '1.2-2' }}</span></div>
                      <div><span class="sl">Max Tokens</span><span class="sv">{{ wizMaxTokens }}</span></div>
                      <div><span class="sl">Timeout</span><span class="sv">{{ wizTimeoutMs }}ms</span></div>
                      @if (guide.endpointNeeded) {
                        <div><span class="sl">Endpoint</span><span class="sv mono">{{ wizEndpointUrl }}</span></div>
                      }
                      <div><span class="sl">API Key</span><span class="sv mono">{{ wizApiKey.substring(0, 8) }}...{{ wizApiKey.substring(wizApiKey.length - 4) }}</span></div>
                    </div>
                  </mat-card>
                }

                @if (wizardError()) {
                  <div class="error-banner">
                    <mat-icon>error</mat-icon>
                    <span>{{ wizardError() }}</span>
                  </div>
                }

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-flat-button color="primary" (click)="submitWizard()" [disabled]="wizardBusy()">
                    @if (wizardBusy()) { <mat-spinner diameter="20" /> } @else { Connect Provider }
                  </button>
                </div>
              </mat-step>
            </mat-vertical-stepper>
          </mat-card>
        }

        @if (providers().length) {
          <mat-card class="table-card">
            <table mat-table [dataSource]="providers()" class="tbl">
              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef>Provider</th>
                <td mat-cell *matCellDef="let row">
                  <span class="type-cell"><mat-icon>{{ providerIcon(row.providerType) }}</mat-icon>{{ row.providerType }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="model">
                <th mat-header-cell *matHeaderCellDef>Default Model</th>
                <td mat-cell *matCellDef="let row">{{ row.defaultModel }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip [class]="row.enabled ? 'st-act' : 'st-dis'">{{ row.enabled ? 'Active' : 'Disabled' }}</mat-chip>
                </td>
              </ng-container>
              <ng-container matColumnDef="created">
                <th mat-header-cell *matHeaderCellDef>Created</th>
                <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'mediumDate' }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row">
                  <button mat-button type="button" (click)="startEdit(row)">Edit</button>
                  @if (row.enabled) {
                    <button mat-button type="button" (click)="disableRow(row)" [disabled]="rowBusyId() === row.id">Disable</button>
                  } @else {
                    <button mat-button type="button" (click)="enableRow(row)" [disabled]="rowBusyId() === row.id">Enable</button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr mat-row *matRowDef="let row; columns: cols"></tr>
            </table>
          </mat-card>
        }
      }

      @if (editTarget()) {
        <mat-card class="edit-card">
          <div class="wizard-toolbar">
            <h2>Edit Provider</h2>
            <button mat-icon-button type="button" (click)="editTarget.set(null)"><mat-icon>close</mat-icon></button>
          </div>
          <mat-form-field appearance="outline" class="full">
            <mat-label>Default Model</mat-label>
            <input matInput [(ngModel)]="editModel" />
          </mat-form-field>
          <div class="slider-row">
            <label>Temperature</label>
            <mat-slider min="0" max="1" step="0.05" discrete class="temp-slider">
              <input matSliderThumb [(ngModel)]="editTemperature" />
            </mat-slider>
            <span class="temp-val">{{ editTemperature | number: '1.2-2' }}</span>
          </div>
          <div class="defaults-row">
            <mat-form-field appearance="outline" class="half">
              <mat-label>Max Tokens</mat-label>
              <input matInput type="number" [(ngModel)]="editMaxTokens" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="half">
              <mat-label>Timeout (ms)</mat-label>
              <input matInput type="number" [(ngModel)]="editTimeoutMs" />
            </mat-form-field>
          </div>
          <button mat-flat-button color="primary" (click)="saveEdit()" [disabled]="editBusy()">Save</button>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 40px; max-width: 960px; margin: 0 auto; }
    .banner {
      display: flex; gap: 12px; align-items: flex-start; margin-bottom: 20px; padding: 14px 16px !important;
      background: #eff6ff; border: 1px solid #bfdbfe;
    }
    .banner mat-icon { color: #2563eb; margin-top: 2px; }
    .banner p { margin: 4px 0 0; font-size: 13px; color: #1e3a5f; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
    h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .sub { margin: 6px 0 0; color: #6b7280; font-size: 14px; }
    .hint { padding: 24px; text-align: center; }
    .centered { display: flex; justify-content: center; padding: 40px; }
    .empty { text-align: center; padding: 40px 28px !important; max-width: 560px; margin: 0 auto; }
    .empty .big { font-size: 72px; width: 72px; height: 72px; color: #3f51b5; opacity: .85; margin-bottom: 12px; }
    .empty h2 { margin: 0 0 8px; }
    .empty p { color: #6b7280; line-height: 1.55; margin-bottom: 20px; }
    .wizard-card, .edit-card { padding: 16px 20px 24px !important; margin-bottom: 20px; }
    .wizard-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .wizard-toolbar h2 { margin: 0; font-size: 1.15rem; }
    .step-desc { font-size: 13px; color: #6b7280; margin: 0 0 12px; max-width: 640px; line-height: 1.5; }
    .type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .type-card {
      cursor: pointer; padding: 16px !important; transition: box-shadow .15s, border-color .15s;
      border: 2px solid transparent;
    }
    .type-card:hover { border-color: #c5cae9; }
    .type-card.selected { border-color: #3f51b5; box-shadow: 0 2px 8px rgba(63,81,181,.2); }
    .type-card mat-icon { font-size: 32px; width: 32px; height: 32px; color: #3f51b5; margin-bottom: 8px; }
    .type-card h3 { margin: 0 0 6px; font-size: 15px; }
    .type-card p { margin: 0; font-size: 12px; color: #6b7280; line-height: 1.45; }
    .guide-header { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px; }
    .guide-header mat-icon { color: #3f51b5; font-size: 28px; width: 28px; height: 28px; margin-top: 2px; }
    .guide-header strong { font-size: 15px; display: block; margin-bottom: 4px; }
    .guide-header .step-desc { margin: 0; }
    .key-link {
      display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: #3f51b5;
      text-decoration: none; margin-bottom: 16px; padding: 6px 10px; background: #e8eaf6; border-radius: 6px;
    }
    .key-link:hover { background: #c5cae9; }
    .key-link mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .model-chips { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 8px 0 16px; }
    .chip-label { font-size: 12px; color: #6b7280; margin-right: 4px; }
    .model-chip { font-size: 12px !important; min-height: 28px !important; padding: 0 10px !important; }
    .model-chip.active { background: #e8eaf6 !important; color: #3f51b5 !important; border-color: #3f51b5 !important; }
    .field-hint { font-size: 12px; color: #6b7280; margin: -8px 0 16px 2px; line-height: 1.4; }
    .full { width: 100%; margin-bottom: 8px; }
    .defaults-row { display: flex; gap: 16px; flex-wrap: wrap; }
    .half { flex: 1; min-width: 180px; }
    .slider-row { display: flex; align-items: center; gap: 12px; margin: 12px 0 8px; flex-wrap: wrap; }
    .temp-slider { flex: 1; min-width: 160px; max-width: 320px; }
    .temp-val { font-variant-numeric: tabular-nums; min-width: 40px; }
    .step-actions { margin-top: 16px; display: flex; gap: 8px; }
    .summary-card { padding: 16px !important; margin-bottom: 16px; background: #f8f9fa !important; }
    .summary-row { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
    .summary-row mat-icon { color: #3f51b5; font-size: 28px; width: 28px; height: 28px; }
    .summary-row strong { font-size: 16px; }
    .summary-sub { display: block; font-size: 12px; color: #6b7280; margin-top: 2px; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
    .sl { display: block; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; }
    .sv { display: block; font-size: 14px; font-weight: 500; margin-top: 2px; }
    .mono { font-family: monospace; font-size: 13px; }
    .error-banner {
      display: flex; gap: 8px; align-items: center; padding: 10px 14px; margin-bottom: 12px;
      background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; color: #991b1b; font-size: 13px;
    }
    .error-banner mat-icon { color: #dc2626; font-size: 20px; width: 20px; height: 20px; }
    .table-card { overflow: auto; }
    .tbl { width: 100%; }
    .type-cell { display: inline-flex; align-items: center; gap: 8px; }
    mat-chip.st-act { --mdc-chip-container-color: #dcfce7; color: #166534; }
    mat-chip.st-dis { --mdc-chip-container-color: #f3f4f6; color: #6b7280; }
  `],
})
export class ProviderSettingsComponent {
  private admin = inject(AdminStore);
  private aiStore = inject(AiStore);
  private api = inject(AiProvidersApiService);

  readonly orgId = this.admin.selectedOrgId;
  readonly providers = this.aiStore.providers;
  readonly loading = signal(false);
  readonly showWizard = signal(false);
  readonly wizardBusy = signal(false);
  readonly wizardError = signal<string | null>(null);
  readonly hideKey = signal(true);
  readonly rowBusyId = signal<string | null>(null);
  readonly editTarget = signal<AiProviderConfig | null>(null);
  readonly editBusy = signal(false);

  wizType = signal<WizardProvider | null>(null);
  wizApiKey = '';
  wizDisplayName = '';
  wizEndpointUrl = '';
  wizModel = 'gpt-4o-mini';
  wizTemperature = 0.4;
  wizMaxTokens = 2048;
  wizTimeoutMs = 30000;

  editModel = '';
  editTemperature = 0.4;
  editMaxTokens = 2048;
  editTimeoutMs = 30000;

  readonly cols = ['type', 'model', 'status', 'created', 'actions'];

  readonly isOrgAdmin = computed(() => this.admin.isOrgAdmin(this.orgId() ?? undefined));

  readonly activeGuide = computed<ProviderGuide | null>(() => {
    const t = this.wizType();
    return t ? PROVIDER_GUIDES[t] : null;
  });

  readonly typeOptions = Object.entries(PROVIDER_GUIDES).map(([type, g]) => ({
    type: type as WizardProvider,
    title: g.title,
    description: g.description,
    icon: g.icon,
  }));

  private seq = 0;

  constructor() {
    effect(() => {
      const oid = this.orgId();
      if (!oid || !this.isOrgAdmin()) {
        if (!oid) this.aiStore.setProviders([]);
        return;
      }
      this.loadProviders(oid);
    }, { allowSignalWrites: true });
  }

  private loadProviders(oid: string): void {
    const s = ++this.seq;
    this.loading.set(true);
    this.api.list(oid).subscribe({
      next: (list) => {
        if (s !== this.seq) return;
        this.aiStore.setProviders(list);
        this.loading.set(false);
      },
      error: () => {
        if (s !== this.seq) return;
        this.loading.set(false);
      },
    });
  }

  providerIcon(t: LlmProviderType | string): string {
    switch (t) {
      case 'OPENAI': return 'smart_toy';
      case 'PERPLEXITY': return 'travel_explore';
      case 'CUSTOM_HTTP': return 'http';
      default: return 'cloud';
    }
  }

  openWizard(): void {
    this.wizType.set(null);
    this.wizApiKey = '';
    this.wizDisplayName = '';
    this.wizEndpointUrl = '';
    this.wizModel = 'gpt-4o-mini';
    this.wizTemperature = 0.4;
    this.wizMaxTokens = 2048;
    this.wizTimeoutMs = 30000;
    this.wizardError.set(null);
    this.showWizard.set(true);
  }

  closeWizard(): void {
    this.showWizard.set(false);
  }

  selectType(t: WizardProvider): void {
    this.wizType.set(t);
    const guide = PROVIDER_GUIDES[t];
    this.wizModel = guide.defaultModel;
  }

  submitWizard(): void {
    const oid = this.orgId();
    const type = this.wizType();
    if (!oid || !type || !this.wizApiKey.trim() || !this.wizModel.trim()) return;
    this.wizardBusy.set(true);
    this.wizardError.set(null);
    this.api
      .create(oid, {
        providerType: type,
        defaultModel: this.wizModel.trim(),
        apiKey: this.wizApiKey.trim(),
        displayName: this.wizDisplayName.trim() || null,
        endpointBaseUrl: this.wizEndpointUrl.trim() || null,
        maxTokens: this.wizMaxTokens,
        requestTimeoutMs: this.wizTimeoutMs,
        temperature: this.wizTemperature,
        enabled: true,
      })
      .subscribe({
        next: () => {
          this.wizardBusy.set(false);
          this.showWizard.set(false);
          if (oid) this.loadProviders(oid);
        },
        error: (err) => {
          this.wizardBusy.set(false);
          const msg = err?.error?.message || err?.error?.error || 'Could not create provider. Please check your API key and try again.';
          this.wizardError.set(msg);
        },
      });
  }

  startEdit(row: AiProviderConfig): void {
    this.editTarget.set(row);
    this.editModel = row.defaultModel;
    this.editTemperature = row.temperature;
    this.editMaxTokens = row.maxTokens;
    this.editTimeoutMs = row.requestTimeoutMs;
  }

  saveEdit(): void {
    const oid = this.orgId();
    const row = this.editTarget();
    if (!oid || !row) return;
    this.editBusy.set(true);
    this.api
      .patch(oid, row.id, {
        defaultModel: this.editModel.trim(),
        temperature: this.editTemperature,
        maxTokens: this.editMaxTokens,
        requestTimeoutMs: this.editTimeoutMs,
      })
      .subscribe({
        next: (c) => {
          this.aiStore.upsertProvider(c);
          this.editBusy.set(false);
          this.editTarget.set(null);
        },
        error: () => {
          this.editBusy.set(false);
        },
      });
  }

  disableRow(row: AiProviderConfig): void {
    const oid = this.orgId();
    if (!oid) return;
    this.rowBusyId.set(row.id);
    this.api.disable(oid, row.id).subscribe({
      next: (c) => {
        this.aiStore.upsertProvider(c);
        this.rowBusyId.set(null);
      },
      error: () => this.rowBusyId.set(null),
    });
  }

  enableRow(row: AiProviderConfig): void {
    const oid = this.orgId();
    if (!oid) return;
    this.rowBusyId.set(row.id);
    this.api.patch(oid, row.id, { enabled: true }).subscribe({
      next: (c) => {
        this.aiStore.upsertProvider(c);
        this.rowBusyId.set(null);
      },
      error: () => this.rowBusyId.set(null),
    });
  }
}
