import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpErrorResponse } from '@angular/common/http';
import { IntegrationAccountsApiService } from '../services/integration-accounts-api.service';
import { NotificationService } from '../../../core/services/notification.service';

export interface ConnectDialogData {
  orgId: string;
  platformType?: string;
  displayName?: string;
  authType?: string;
}

@Component({
  selector: 'app-connect-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="title-icon">link</mat-icon>
      Connect {{ data.displayName || 'Platform' }}
    </h2>
    <mat-dialog-content>
      <!-- What you'll need hint -->
      <div class="prereq-hint">
        <mat-icon>lightbulb</mat-icon>
        <div>
          @switch (effectiveAuthType) {
            @case ('API_KEY') {
              <strong>What you'll need:</strong> An API key from your {{ data.displayName || 'platform' }} developer settings or admin console.
              Typically found under Settings &rarr; API &rarr; Keys.
            }
            @case ('BASIC') {
              <strong>What you'll need:</strong> The username and password for your {{ data.displayName || 'platform' }} account or API access credentials.
            }
            @case ('SERVICE_ACCOUNT') {
              <strong>What you'll need:</strong> A service account JSON key file downloaded from your {{ data.displayName || 'platform' }} admin console.
              Usually found under IAM &amp; Admin &rarr; Service Accounts &rarr; Keys.
            }
            @default {
              <strong>What you'll need:</strong> The authentication credentials for your {{ data.displayName || 'platform' }} account.
            }
          }
        </div>
      </div>

      <form [formGroup]="form">
        @if (!data.platformType) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Platform</mat-label>
            <mat-select formControlName="platformType">
              <mat-option value="CHATGPT_ADS">ChatGPT Ads</mat-option>
              <mat-option value="PERPLEXITY_ADS">Perplexity Ads</mat-option>
              <mat-option value="CUSTOM">Custom</mat-option>
            </mat-select>
            <mat-hint>Select the platform you want to connect</mat-hint>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Display Name</mat-label>
          <input matInput formControlName="displayName" placeholder="e.g. My ChatGPT Ads Account" />
          <mat-hint>A friendly name to identify this connection in your accounts list</mat-hint>
        </mat-form-field>

        @if (!data.authType) {
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Auth Type</mat-label>
            <mat-select formControlName="authType" (selectionChange)="onAuthTypeChange()">
              <mat-option value="API_KEY">API Key — Paste an API key from the platform</mat-option>
              <mat-option value="BASIC">Basic — Enter username and password</mat-option>
              <mat-option value="SERVICE_ACCOUNT">Service Account — Paste a JSON key file</mat-option>
            </mat-select>
            <mat-hint>Choose how you'll authenticate with this platform</mat-hint>
          </mat-form-field>
        }

        @switch (effectiveAuthType) {
          @case ('API_KEY') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>API Key</mat-label>
              <input matInput formControlName="apiKey" type="password" />
              <mat-icon matSuffix>vpn_key</mat-icon>
              <mat-hint>Your key is encrypted and stored securely</mat-hint>
            </mat-form-field>
          }
          @case ('BASIC') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Username</mat-label>
              <input matInput formControlName="username" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" type="password" />
              <mat-icon matSuffix>lock</mat-icon>
              <mat-hint>Your credentials are encrypted and stored securely</mat-hint>
            </mat-form-field>
          }
          @case ('SERVICE_ACCOUNT') {
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>JSON Key</mat-label>
              <textarea matInput formControlName="jsonKey" rows="5" placeholder='Paste your service account JSON here...'></textarea>
              <mat-hint>Paste the entire contents of your downloaded JSON key file</mat-hint>
            </mat-form-field>
          }
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>External Account ID (optional)</mat-label>
          <input matInput formControlName="externalAccountId" placeholder="Provider-specific ID" />
          <mat-hint>If the platform uses a unique account ID, enter it here for easier mapping</mat-hint>
        </mat-form-field>
      </form>

      <!-- What happens next -->
      <div class="next-hint">
        <mat-icon>arrow_forward</mat-icon>
        <span>
          After connecting, your account will appear in
          <strong>Integration Accounts</strong>.
          From there you can validate credentials, discover resources, and create sync jobs.
        </span>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="onConnect()" [disabled]="form.invalid || connecting">
        @if (connecting) { Connecting... } @else { Connect }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-form-field { margin-bottom: 12px; }
    .title-icon { vertical-align: middle; margin-right: 8px; }
    mat-dialog-content { min-width: 380px; }

    .prereq-hint {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 14px;
      margin-bottom: 16px;
      border-radius: 8px;
      background: #f0f7ff;
      border: 1px solid #bdd7ff;
      font-size: 12px;
      color: rgba(0,0,0,.65);
      line-height: 1.6;
    }
    .prereq-hint .mat-icon {
      color: #d48806;
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .prereq-hint strong { color: rgba(0,0,0,.85); }

    .next-hint {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 10px 14px;
      margin-top: 8px;
      border-radius: 8px;
      background: rgba(0,0,0,.03);
      font-size: 12px;
      color: rgba(0,0,0,.55);
      line-height: 1.6;
    }
    .next-hint .mat-icon {
      color: rgba(0,0,0,.35);
      font-size: 16px;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .next-hint strong { color: rgba(0,0,0,.75); }
  `],
})
export class ConnectDialogComponent implements OnInit {
  form!: FormGroup;
  connecting = false;
  effectiveAuthType = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ConnectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConnectDialogData,
    private integrationAccountsApi: IntegrationAccountsApiService,
    private notify: NotificationService,
  ) {}

  ngOnInit(): void {
    const authType = this.data.authType || 'API_KEY';
    this.effectiveAuthType = authType;

    this.form = this.fb.group({
      platformType: [this.data.platformType || '', Validators.required],
      displayName: [this.data.displayName ? `My ${this.data.displayName}` : '', Validators.required],
      authType: [authType, Validators.required],
      apiKey: [''],
      username: [''],
      password: [''],
      jsonKey: [''],
      externalAccountId: [''],
    });

    this.applySecretValidators();
  }

  onAuthTypeChange(): void {
    this.effectiveAuthType = this.form.get('authType')!.value;
    this.applySecretValidators();
  }

  private applySecretValidators(): void {
    const controls = ['apiKey', 'username', 'password', 'jsonKey'];
    for (const c of controls) {
      this.form.get(c)!.clearValidators();
      this.form.get(c)!.updateValueAndValidity();
    }

    switch (this.effectiveAuthType) {
      case 'API_KEY':
        this.form.get('apiKey')!.setValidators(Validators.required);
        break;
      case 'BASIC':
        this.form.get('username')!.setValidators(Validators.required);
        this.form.get('password')!.setValidators(Validators.required);
        break;
      case 'SERVICE_ACCOUNT':
        this.form.get('jsonKey')!.setValidators(Validators.required);
        break;
    }

    for (const c of controls) {
      this.form.get(c)!.updateValueAndValidity();
    }
  }

  onConnect(): void {
    const v = this.form.value;
    const secretPayload = this.buildSecretPayload(v);

    const request = {
      platformType: v.platformType,
      displayName: v.displayName,
      authType: this.effectiveAuthType,
      secretPayload,
      externalAccountId: v.externalAccountId || undefined,
    };

    this.connecting = true;
    this.integrationAccountsApi.create(this.data.orgId, request).subscribe({
      next: () => {
        this.notify.success('Platform connected successfully');
        this.dialogRef.close(true);
      },
      error: (err: HttpErrorResponse) => {
        this.connecting = false;
        this.notify.error(err.error?.detail || 'Connection failed');
      },
    });
  }

  private buildSecretPayload(v: Record<string, string>): Record<string, string> {
    switch (this.effectiveAuthType) {
      case 'API_KEY':
        return { apiKey: v['apiKey'] };
      case 'BASIC':
        return { username: v['username'], password: v['password'] };
      case 'SERVICE_ACCOUNT':
        return { jsonKey: v['jsonKey'] };
      default:
        return {};
    }
  }
}
