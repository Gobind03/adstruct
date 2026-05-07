import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '@env/environment';
import { OrgApiService } from '../services/org-api.service';
import { AdminStore } from '../store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { Organization } from '../models/admin.models';

@Component({
  selector: 'app-org-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-head">
      <button mat-button type="button" routerLink="/admin/orgs">
        <mat-icon>arrow_back</mat-icon>
        Back
      </button>
    </div>
    <h2>Organization</h2>

    @if (loading()) {
      <div class="spinner-wrap">
        <mat-spinner diameter="40"></mat-spinner>
      </div>
    } @else if (org()) {
      <div class="summary-row">
        <mat-card class="stat" [attr.data-api-url]="envApi">
          <mat-card-content>
            <div class="stat-label">Workspaces</div>
            <div class="stat-value">{{ org()!.workspaceCount }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card class="stat">
          <mat-card-content>
            <div class="stat-label">Members</div>
            <div class="stat-value">{{ org()!.memberCount }}</div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="save()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Name</mat-label>
              <input matInput formControlName="name" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Timezone</mat-label>
              <mat-select formControlName="timezone">
                @for (tz of timezones; track tz) {
                  <mat-option [value]="tz">{{ tz }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Currency</mat-label>
              <mat-select formControlName="currency">
                @for (c of currencies; track c) {
                  <mat-option [value]="c">{{ c }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Status</mat-label>
              <mat-select formControlName="status">
                <mat-option value="ACTIVE">ACTIVE</mat-option>
                <mat-option value="SUSPENDED">SUSPENDED</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving()">
              @if (saving()) {
                Saving…
              } @else {
                Save
              }
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    } @else {
      <p class="empty-state">Organization not found.</p>
    }
  `,
  styles: [`
    h2 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 20px;
    }
    .page-head { margin-bottom: 8px; }
    .full-width { width: 100%; }
    mat-form-field { margin-bottom: 8px; }
    .spinner-wrap {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
    .summary-row {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }
    .stat { min-width: 160px; flex: 1; }
    .stat-label { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
    .stat-value { font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
    .empty-state {
      text-align: center;
      padding: 64px 24px;
      color: var(--text-muted);
      font-size: 15px;
    }
  `],
})
export class OrgDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private orgApi = inject(OrgApiService);
  private adminStore = inject(AdminStore);
  private notify = inject(NotificationService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly org = signal<Organization | null>(null);
  readonly envApi = environment.apiUrl;

  readonly timezones = [
    'Asia/Kolkata',
    'UTC',
    'America/New_York',
    'Europe/London',
    'Asia/Singapore',
    'Australia/Sydney',
  ];
  readonly currencies = ['INR', 'USD', 'EUR', 'GBP', 'SGD'];

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    timezone: ['', Validators.required],
    currency: ['', Validators.required],
    status: ['ACTIVE', Validators.required],
  });

  ngOnInit(): void {
    const orgId = this.route.snapshot.paramMap.get('orgId');
    if (!orgId) {
      this.loading.set(false);
      return;
    }
    this.adminStore.selectOrg(orgId);
    this.orgApi.get(orgId).subscribe({
      next: (o) => {
        this.org.set(o);
        this.form.patchValue({
          name: o.name,
          timezone: o.timezone,
          currency: o.currency,
          status: o.status,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err.error?.detail || 'Failed to load organization');
      },
    });
  }

  save(): void {
    const orgId = this.route.snapshot.paramMap.get('orgId');
    if (!orgId || this.form.invalid) return;
    this.saving.set(true);
    this.orgApi.update(orgId, this.form.value).subscribe({
      next: (updated) => {
        this.org.set(updated);
        this.adminStore.setOrgs(
          this.adminStore.orgs().map((o) => (o.id === updated.id ? updated : o))
        );
        this.saving.set(false);
        this.notify.success('Organization saved');
      },
      error: (err) => {
        this.saving.set(false);
        this.notify.error(err.error?.detail || 'Save failed');
      },
    });
  }
}
