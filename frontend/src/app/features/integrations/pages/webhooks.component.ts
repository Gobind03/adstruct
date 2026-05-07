import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { WebhooksApiService } from '../services/webhooks-api.service';
import { IntegrationAccountsApiService } from '../services/integration-accounts-api.service';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import {
  WebhookResponse,
  WebhookDeliveryResponse,
  IntegrationAccountResponse,
} from '@shared/models/api.models';

interface WebhookRow {
  account: IntegrationAccountResponse;
  webhook: WebhookResponse | null;
}

@Component({
  selector: 'app-webhooks',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatExpansionModule,
  ],
  template: `
    <div class="page-header">
      <div>
        <h2>Webhooks</h2>
        <p class="subtitle">Receive real-time campaign updates from ad platforms automatically</p>
      </div>
      <a mat-stroked-button routerLink="/integrations/campaign-reports">
        <mat-icon>bar_chart</mat-icon>
        Campaign Reports
      </a>
    </div>

    <!-- How it works -->
    <mat-card class="guide-card">
      <mat-card-content>
        <div class="guide-header">
          <mat-icon>info</mat-icon>
          <strong>How Webhooks Work</strong>
        </div>
        <p class="guide-desc">
          Unlike sync jobs (which pull data on-demand), webhooks let ad platforms <strong>push</strong>
          updates to your app in real-time. When a campaign status changes or new metrics are available,
          the platform sends a notification that automatically updates your data.
        </p>
        <div class="guide-steps">
          <div class="guide-step">
            <div class="step-number">1</div>
            <div class="step-text">
              <strong>Register</strong> a webhook for your account (generates a unique URL + signing secret)
            </div>
          </div>
          <mat-icon class="step-arrow">arrow_forward</mat-icon>
          <div class="guide-step">
            <div class="step-number">2</div>
            <div class="step-text">
              <strong>Configure</strong> the URL in your ad platform's developer dashboard
            </div>
          </div>
          <mat-icon class="step-arrow">arrow_forward</mat-icon>
          <div class="guide-step">
            <div class="step-number">3</div>
            <div class="step-text">
              <strong>Data flows</strong> automatically into
              <a routerLink="/integrations/campaign-reports">Campaign Reports</a>
            </div>
          </div>
          <mat-icon class="step-arrow">arrow_forward</mat-icon>
          <div class="guide-step">
            <div class="step-number">4</div>
            <div class="step-text">
              <strong>Map campaigns</strong> to internal ones via
              <a routerLink="/integrations/entity-mappings">Entity Mappings</a>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="40" /></div>
    } @else if (!orgId()) {
      <mat-card class="hint-card warn-card">
        <mat-card-content class="hint-content">
          <mat-icon>warning</mat-icon>
          <span>Select an organization in the sidebar to manage webhooks.</span>
        </mat-card-content>
      </mat-card>
    } @else if (rows.length === 0) {
      <mat-card class="empty-state">
        <mat-card-content>
          <mat-icon class="empty-icon">webhook</mat-icon>
          <h3>No integration accounts</h3>
          <p>
            <a routerLink="/integrations/accounts">Connect an ad platform</a>
            first, then come back to register a webhook.
          </p>
        </mat-card-content>
      </mat-card>
    } @else {
      <!-- Accounts table -->
      <h3 class="section-title">Registered Webhooks</h3>
      <table mat-table [dataSource]="rows" class="mat-elevation-z1 full-width">
        <ng-container matColumnDef="account">
          <th mat-header-cell *matHeaderCellDef>Account</th>
          <td mat-cell *matCellDef="let row">
            <div class="account-cell">
              <span class="account-name">{{ row.account.displayName }}</span>
              <mat-chip class="platform-chip" disableRipple>{{ row.account.platformType }}</mat-chip>
            </div>
          </td>
        </ng-container>
        <ng-container matColumnDef="status">
          <th mat-header-cell *matHeaderCellDef>Status</th>
          <td mat-cell *matCellDef="let row">
            @if (row.webhook) {
              <mat-chip [class]="'status-' + (row.webhook.status || 'active').toLowerCase()">
                {{ row.webhook.status || 'ACTIVE' }}
              </mat-chip>
            } @else {
              <mat-chip class="status-unregistered">Not registered</mat-chip>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="endpointUrl">
          <th mat-header-cell *matHeaderCellDef>
            Webhook URL
            <mat-icon class="header-help"
                       matTooltip="Copy this full URL and paste it into the ad platform's webhook configuration page">
              help_outline
            </mat-icon>
          </th>
          <td mat-cell *matCellDef="let row">
            @if (row.webhook?.endpointUrl) {
              <code class="url">{{ getFullUrl(row.webhook.endpointUrl) }}</code>
            } @else {
              <span class="muted-text">Register to generate URL</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="signingSecret">
          <th mat-header-cell *matHeaderCellDef>
            Signing Secret
            <mat-icon class="header-help"
                       matTooltip="Used by the platform to sign payloads. Enter this secret in your ad platform's webhook configuration.">
              help_outline
            </mat-icon>
          </th>
          <td mat-cell *matCellDef="let row">
            @if (row.webhook?.signingSecret) {
              <div class="secret-cell">
                <code class="secret-value">
                  @if (visibleSecrets[row.account.id]) {
                    {{ row.webhook.signingSecret }}
                  } @else {
                    ••••••••••••••••
                  }
                </code>
                <button mat-icon-button (click)="toggleSecret(row.account.id)" class="secret-btn"
                        [matTooltip]="visibleSecrets[row.account.id] ? 'Hide secret' : 'Reveal secret'">
                  <mat-icon>{{ visibleSecrets[row.account.id] ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <button mat-icon-button (click)="copySecret(row.webhook.signingSecret)" class="secret-btn"
                        matTooltip="Copy signing secret to clipboard">
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
            } @else if (row.webhook) {
              <span class="muted-text">Unavailable</span>
            } @else {
              <span class="muted-text">--</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="lastReceived">
          <th mat-header-cell *matHeaderCellDef>Last Received</th>
          <td mat-cell *matCellDef="let row">
            @if (row.webhook?.lastReceivedAt) {
              <span matTooltip="{{ row.webhook.lastReceivedAt | date:'medium' }}">
                {{ timeAgo(row.webhook.lastReceivedAt) }}
              </span>
            } @else if (row.webhook) {
              <span class="muted-text">Awaiting first event</span>
            } @else {
              <span class="muted-text">--</span>
            }
          </td>
        </ng-container>
        <ng-container matColumnDef="actions">
          <th mat-header-cell *matHeaderCellDef></th>
          <td mat-cell *matCellDef="let row">
            <div class="action-buttons">
              @if (!row.webhook) {
                <button mat-raised-button color="primary" (click)="register(row.account)"
                        matTooltip="Register webhook for this account">
                  <mat-icon>add</mat-icon> Register
                </button>
              } @else {
                <button mat-icon-button (click)="toggleWebhook(row.account)"
                        [matTooltip]="row.webhook.status === 'ACTIVE' ? 'Pause webhook (stop receiving events)' : 'Resume webhook (start receiving events)'">
                  <mat-icon>{{ row.webhook.status === 'ACTIVE' ? 'pause_circle' : 'play_circle' }}</mat-icon>
                </button>
                <button mat-icon-button (click)="copy(row)"
                        matTooltip="Copy full webhook URL to clipboard">
                  <mat-icon>content_copy</mat-icon>
                </button>
                <button mat-icon-button (click)="rotate(row.account)"
                        matTooltip="Rotate the signing secret (update in platform dashboard after)">
                  <mat-icon>autorenew</mat-icon>
                </button>
              }
            </div>
          </td>
        </ng-container>
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
      </table>

      @if (hasRegistered()) {
        <div class="table-footer">
          <mat-icon>lightbulb</mat-icon>
          <span>
            After registering, copy the webhook URL and configure it in your ad platform's developer dashboard.
            Incoming data will automatically appear in
            <a routerLink="/integrations/campaign-reports">Campaign Reports</a>.
            To link incoming data to internal campaigns, set up
            <a routerLink="/integrations/entity-mappings">Entity Mappings</a>.
          </span>
        </div>
      }

      <!-- Platform setup instructions -->
      <h3 class="section-title">Platform Setup Guides</h3>
      <mat-accordion>
        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon class="panel-icon">facebook</mat-icon>
              Meta (Facebook / Instagram) Ads
            </mat-panel-title>
          </mat-expansion-panel-header>
          <div class="setup-guide">
            <ol>
              <li>Go to <a href="https://developers.facebook.com/apps/" target="_blank" rel="noopener">Meta Developer Dashboard</a></li>
              <li>Select your app (or create one), navigate to <strong>Webhooks</strong> in the sidebar</li>
              <li>Click <strong>Subscribe to this object</strong> and select <code>ad_account</code></li>
              <li>Paste the webhook URL from above into the <strong>Callback URL</strong> field</li>
              <li>Enter any value as the <strong>Verify Token</strong> (used for the initial handshake)</li>
              <li>Subscribe to fields: <code>campaign</code>, <code>ad_campaign</code></li>
              <li>Meta will send a verification GET request, then start pushing real-time updates</li>
            </ol>
            <div class="setup-note">
              <mat-icon>security</mat-icon>
              <span>Meta signs payloads with <strong>X-Hub-Signature-256</strong> (HMAC-SHA256). Our system verifies every delivery automatically.</span>
            </div>
          </div>
        </mat-expansion-panel>

        <mat-expansion-panel>
          <mat-expansion-panel-header>
            <mat-panel-title>
              <mat-icon class="panel-icon">ads_click</mat-icon>
              Google Ads
            </mat-panel-title>
          </mat-expansion-panel-header>
          <div class="setup-guide">
            <ol>
              <li>Go to <a href="https://console.cloud.google.com/cloudpubsub" target="_blank" rel="noopener">Google Cloud Console &gt; Pub/Sub</a></li>
              <li>Create a <strong>Topic</strong> for Google Ads campaign change notifications</li>
              <li>Create a <strong>Push Subscription</strong> for that topic</li>
              <li>Set the <strong>Endpoint URL</strong> to the webhook URL from above</li>
              <li>In Google Ads, configure the campaign change notification to publish to this Pub/Sub topic</li>
              <li>Google will send base64-encoded campaign data to the webhook endpoint</li>
            </ol>
            <div class="setup-note">
              <mat-icon>security</mat-icon>
              <span>Google Pub/Sub uses <strong>JWT bearer tokens</strong> for authentication. Ensure your push subscription is configured with authentication.</span>
            </div>
          </div>
        </mat-expansion-panel>
      </mat-accordion>

      <!-- Recent deliveries -->
      <h3 class="section-title deliveries-title">Recent Deliveries</h3>
      @if (deliveries().length === 0) {
        <mat-card class="hint-card">
          <mat-card-content class="hint-content">
            <mat-icon>hourglass_empty</mat-icon>
            <span>
              No deliveries yet.
              @if (hasRegistered()) {
                Make sure you've configured the webhook URL in your ad platform's developer dashboard.
                The platform will start sending events once it detects changes.
              } @else {
                Register a webhook above, then configure the URL in your platform's dashboard.
              }
            </span>
          </mat-card-content>
        </mat-card>
      } @else {
        <table mat-table [dataSource]="deliveries()" class="mat-elevation-z1 full-width">
          <ng-container matColumnDef="receivedAt">
            <th mat-header-cell *matHeaderCellDef>Time</th>
            <td mat-cell *matCellDef="let d">
              <span matTooltip="{{ d.receivedAt | date:'medium' }}">{{ timeAgo(d.receivedAt) }}</span>
            </td>
          </ng-container>
          <ng-container matColumnDef="platformType">
            <th mat-header-cell *matHeaderCellDef>Platform</th>
            <td mat-cell *matCellDef="let d">
              <mat-chip disableRipple>{{ d.platformType }}</mat-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="eventType">
            <th mat-header-cell *matHeaderCellDef>Event</th>
            <td mat-cell *matCellDef="let d">{{ d.eventType || '--' }}</td>
          </ng-container>
          <ng-container matColumnDef="rowsProcessed">
            <th mat-header-cell *matHeaderCellDef>Rows</th>
            <td mat-cell *matCellDef="let d" class="num-cell">{{ d.rowsProcessed }}</td>
          </ng-container>
          <ng-container matColumnDef="deliveryStatus">
            <th mat-header-cell *matHeaderCellDef>Status</th>
            <td mat-cell *matCellDef="let d">
              <mat-chip [class]="'delivery-' + d.status.toLowerCase()">{{ d.status }}</mat-chip>
            </td>
          </ng-container>
          <ng-container matColumnDef="errorMessage">
            <th mat-header-cell *matHeaderCellDef>Error</th>
            <td mat-cell *matCellDef="let d">
              <span class="error-text">{{ d.errorMessage || '--' }}</span>
            </td>
          </ng-container>
          <tr mat-header-row *matHeaderRowDef="deliveryColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: deliveryColumns"></tr>
        </table>
      }
    }
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    h2 { font-size: 22px; font-weight: 600; margin: 0; letter-spacing: -0.02em; }
    .subtitle { font-size: 14px; color: var(--text-secondary); margin: 4px 0 0; }

    .guide-card { margin-bottom: 20px; background: var(--color-primary-muted); }
    .guide-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .guide-header .mat-icon { color: var(--color-primary); font-size: 20px; width: 20px; height: 20px; }
    .guide-desc { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; line-height: 1.5; }
    .guide-steps {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .guide-step {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .step-number {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--color-primary);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .step-text { font-size: 13px; color: var(--text-primary); }
    .step-text a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .step-text a:hover { text-decoration: underline; }
    .step-arrow { color: var(--text-muted); font-size: 18px; width: 18px; height: 18px; }

    .hint-card { margin-bottom: 16px; border-left: 3px solid #1976d2; }
    .hint-card.warn-card { border-left-color: #e65100; }
    .hint-content {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .hint-content .mat-icon { color: #1976d2; font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; }
    .warn-card .hint-content .mat-icon { color: #e65100; }

    .empty-state { text-align: center; padding: 40px 20px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: var(--text-muted); margin-bottom: 12px; }
    .empty-state h3 { font-size: 18px; font-weight: 600; margin: 8px 0; }
    .empty-state p { color: var(--text-secondary); font-size: 14px; }
    .empty-state a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .empty-state a:hover { text-decoration: underline; }

    .section-title {
      font-size: 15px;
      font-weight: 600;
      margin: 24px 0 12px;
      color: rgba(0,0,0,0.7);
    }
    .section-title:first-of-type { margin-top: 0; }

    .full-width { width: 100%; }
    .loading { display: flex; justify-content: center; padding: 40px; }

    .account-cell { display: flex; align-items: center; gap: 8px; }
    .account-name { font-weight: 500; }
    .platform-chip { font-size: 11px; }

    mat-chip.status-active { --mdc-chip-container-color: #e8f5e9; color: #1b5e20; }
    mat-chip.status-error { --mdc-chip-container-color: #ffebee; color: #b71c1c; }
    mat-chip.status-inactive { --mdc-chip-container-color: #fff3e0; color: #e65100; }
    mat-chip.status-unregistered { --mdc-chip-container-color: #f5f5f5; color: rgba(0,0,0,0.45); }

    .url {
      font-size: 11px;
      word-break: break-all;
      background: rgba(0,0,0,0.04);
      padding: 2px 6px;
      border-radius: 4px;
    }
    .muted-text { font-size: 12px; color: var(--text-muted); font-style: italic; }

    .header-help {
      font-size: 16px;
      width: 16px;
      height: 16px;
      vertical-align: middle;
      color: var(--text-muted);
      cursor: help;
      margin-left: 4px;
    }

    .secret-cell { display: flex; align-items: center; gap: 4px; }
    .secret-value {
      font-size: 11px;
      word-break: break-all;
      background: rgba(0,0,0,0.04);
      padding: 2px 6px;
      border-radius: 4px;
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.4;
    }
    .secret-btn.mat-mdc-icon-button {
      width: 28px;
      height: 28px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      --mdc-icon-button-state-layer-size: 28px;
      --mdc-icon-button-icon-size: 16px;
    }
    .secret-btn .mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      line-height: 16px;
    }

    .action-buttons { display: flex; gap: 4px; align-items: center; }

    .table-footer {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 12px 16px;
      font-size: 13px;
      color: var(--text-secondary);
      border-top: 1px solid var(--border-default);
      line-height: 1.5;
    }
    .table-footer .mat-icon { color: #f9a825; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
    .table-footer a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
    .table-footer a:hover { text-decoration: underline; }

    /* Setup guides */
    .setup-guide ol {
      margin: 0;
      padding-left: 20px;
      font-size: 13px;
      line-height: 1.8;
      color: var(--text-secondary);
    }
    .setup-guide ol li { margin-bottom: 4px; }
    .setup-guide a { color: var(--color-primary); text-decoration: none; }
    .setup-guide a:hover { text-decoration: underline; }
    .setup-guide code {
      font-size: 12px;
      background: rgba(0,0,0,0.06);
      padding: 1px 5px;
      border-radius: 3px;
    }
    .setup-note {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-top: 12px;
      padding: 10px 12px;
      background: rgba(0,0,0,0.03);
      border-radius: 6px;
      font-size: 12px;
      color: var(--text-secondary);
      line-height: 1.5;
    }
    .setup-note .mat-icon {
      color: #4caf50;
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .panel-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-right: 8px;
      color: var(--color-primary);
    }

    /* Deliveries */
    .deliveries-title { margin-top: 32px; }
    .num-cell { text-align: right; font-variant-numeric: tabular-nums; }
    mat-chip.delivery-success { --mdc-chip-container-color: #e8f5e9; color: #1b5e20; }
    mat-chip.delivery-partial { --mdc-chip-container-color: #fff3e0; color: #e65100; }
    mat-chip.delivery-error { --mdc-chip-container-color: #ffebee; color: #b71c1c; }
    .error-text { font-size: 12px; color: #b71c1c; }
  `],
})
export class WebhooksComponent implements OnInit {
  private webhooksApi = inject(WebhooksApiService);
  private accountsApi = inject(IntegrationAccountsApiService);
  admin = inject(AdminStore);
  private notify = inject(NotificationService);

  readonly orgId = this.admin.selectedOrgId;
  loading = signal(false);
  rows: WebhookRow[] = [];
  deliveries = signal<WebhookDeliveryResponse[]>([]);
  visibleSecrets: Record<string, boolean> = {};
  displayedColumns = ['account', 'status', 'endpointUrl', 'signingSecret', 'lastReceived', 'actions'];
  deliveryColumns = ['receivedAt', 'platformType', 'eventType', 'rowsProcessed', 'deliveryStatus', 'errorMessage'];

  ngOnInit(): void {
    this.reload();
  }

  hasRegistered(): boolean {
    return this.rows.some((r) => r.webhook != null);
  }

  reload(): void {
    const oid = this.orgId();
    if (!oid) {
      this.rows = [];
      return;
    }
    this.loading.set(true);
    this.accountsApi.list(oid).subscribe({
      next: (accounts) => {
        if (accounts.length === 0) {
          this.rows = [];
          this.loading.set(false);
          return;
        }
        forkJoin(
          accounts.map((a) =>
            this.webhooksApi.get(oid, a.id).pipe(
              map((w) => ({ account: a, webhook: w })),
              catchError(() => of({ account: a, webhook: null }))
            )
          )
        ).subscribe({
          next: (rows) => {
            this.rows = rows;
            this.loading.set(false);
          },
          error: () => {
            this.loading.set(false);
            this.notify.error('Failed to load webhooks');
          },
        });
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Failed to load accounts');
      },
    });

    this.webhooksApi.listDeliveries(oid).subscribe({
      next: (d) => this.deliveries.set(d),
    });
  }

  register(account: IntegrationAccountResponse): void {
    const oid = this.orgId();
    if (!oid) return;
    this.webhooksApi.register(oid, account.id).subscribe({
      next: () => {
        this.notify.success(
          'Webhook registered! Copy the URL and configure it in your ad platform\'s dashboard.'
        );
        this.reload();
      },
      error: () => this.notify.error('Register failed'),
    });
  }

  toggleWebhook(account: IntegrationAccountResponse): void {
    const oid = this.orgId();
    if (!oid) return;
    const row = this.rows.find((r) => r.account.id === account.id);
    const isActive = row?.webhook?.status === 'ACTIVE';
    this.webhooksApi.toggleStatus(oid, account.id).subscribe({
      next: () => {
        this.notify.success(isActive ? 'Webhook paused. Events will be ignored.' : 'Webhook resumed. Events will be processed.');
        this.reload();
      },
      error: () => this.notify.error('Failed to update webhook status'),
    });
  }

  rotate(account: IntegrationAccountResponse): void {
    const oid = this.orgId();
    if (!oid) return;
    if (
      !window.confirm(
        'Rotate the signing secret? You will need to update the secret in the platform\'s dashboard afterward.'
      )
    )
      return;
    this.webhooksApi.rotateSecret(oid, account.id).subscribe({
      next: () => {
        this.notify.success('Secret rotated. Update it in your platform\'s developer dashboard.');
        this.reload();
      },
      error: () => this.notify.error('Rotate failed'),
    });
  }

  toggleSecret(accountId: string): void {
    this.visibleSecrets[accountId] = !this.visibleSecrets[accountId];
  }

  copySecret(secret: string): void {
    void navigator.clipboard.writeText(secret).then(
      () => this.notify.success('Signing secret copied to clipboard'),
      () => this.notify.error('Copy failed')
    );
  }

  copy(row: WebhookRow): void {
    const url = row.webhook?.endpointUrl;
    if (!url) return;
    const fullUrl = this.getFullUrl(url);
    void navigator.clipboard.writeText(fullUrl).then(
      () => this.notify.success('Webhook URL copied to clipboard'),
      () => this.notify.error('Copy failed')
    );
  }

  getFullUrl(path: string): string {
    return window.location.origin + path;
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '--';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return diffMin + 'm ago';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    const diffDay = Math.floor(diffHr / 24);
    return diffDay + 'd ago';
  }
}
