import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '@env/environment';
import { OrgApiService } from '../services/org-api.service';
import { AdminStore } from '../store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { Organization } from '../models/admin.models';

@Component({
  selector: 'app-create-org-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>Create organization</h2>
    <mat-dialog-content [attr.data-api-url]="envApi">
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" />
          @if (form.get('name')?.hasError('required')) {
            <mat-error>Required</mat-error>
          }
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
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancel</button>
      <button mat-raised-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || saving">
        @if (saving) {
          Saving…
        } @else {
          Create
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-form-field { margin-bottom: 8px; }
  `],
})
export class CreateOrgDialogComponent {
  readonly envApi = environment.apiUrl;

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CreateOrgDialogComponent>);
  private orgApi = inject(OrgApiService);
  private notify = inject(NotificationService);

  saving = false;
  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    timezone: ['Asia/Kolkata', Validators.required],
    currency: ['INR', Validators.required],
  });

  readonly timezones = [
    'Asia/Kolkata',
    'UTC',
    'America/New_York',
    'Europe/London',
    'Asia/Singapore',
    'Australia/Sydney',
  ];
  readonly currencies = ['INR', 'USD', 'EUR', 'GBP', 'SGD'];

  submit(): void {
    if (this.form.invalid) return;
    this.saving = true;
    this.orgApi.create(this.form.value).subscribe({
      next: (org) => {
        this.notify.success('Organization created');
        this.dialogRef.close(org);
      },
      error: (err) => {
        this.saving = false;
        this.notify.error(err.error?.detail || 'Could not create organization');
      },
    });
  }
}

@Component({
  selector: 'app-org-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2>Organizations</h2>
    <mat-card [attr.data-api-url]="envApi">
      <mat-card-content>
        <div class="toolbar">
          <button mat-raised-button color="primary" type="button" (click)="openCreate()">
            <mat-icon>add</mat-icon>
            Create organization
          </button>
        </div>

        @if (loading()) {
          <div class="spinner-wrap">
            <mat-spinner diameter="40"></mat-spinner>
          </div>
        } @else if (orgs().length === 0) {
          <p class="empty-state">No organizations yet.</p>
        } @else {
          <table mat-table [dataSource]="orgs()" class="full-width">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let row">{{ row.name }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let row">{{ row.status }}</td>
            </ng-container>
            <ng-container matColumnDef="workspaceCount">
              <th mat-header-cell *matHeaderCellDef>Workspaces</th>
              <td mat-cell *matCellDef="let row">{{ row.workspaceCount }}</td>
            </ng-container>
            <ng-container matColumnDef="memberCount">
              <th mat-header-cell *matHeaderCellDef>Members</th>
              <td mat-cell *matCellDef="let row">{{ row.memberCount }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedColumns;"
              class="click-row"
              (click)="onRow(row)"
              (keydown.enter)="onRow(row)"
              tabindex="0"
              role="link"
            ></tr>
          </table>
        }
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    h2 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 20px;
    }
    .full-width { width: 100%; }
    .toolbar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .spinner-wrap {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
    .empty-state {
      text-align: center;
      padding: 64px 24px;
      color: var(--text-muted);
      font-size: 15px;
    }
    .click-row { cursor: pointer; }
    .click-row:hover { background: var(--bg-surface-hover); }
  `],
})
export class OrgListComponent implements OnInit {
  private orgApi = inject(OrgApiService);
  private adminStore = inject(AdminStore);
  private notify = inject(NotificationService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  readonly loading = signal(false);
  readonly orgs = signal<Organization[]>([]);
  readonly displayedColumns = ['name', 'status', 'workspaceCount', 'memberCount'];
  readonly envApi = environment.apiUrl;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.orgApi.list().subscribe({
      next: (data) => {
        this.orgs.set(data);
        this.adminStore.setOrgs(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err.error?.detail || 'Failed to load organizations');
      },
    });
  }

  openCreate(): void {
    const ref = this.dialog.open(CreateOrgDialogComponent, { width: '440px' });
    ref.afterClosed().subscribe((created: Organization | undefined) => {
      if (created) {
        this.load();
        this.router.navigate(['/admin/orgs', created.id]);
      }
    });
  }

  onRow(org: Organization): void {
    this.router.navigate(['/admin/orgs', org.id]);
  }
}
