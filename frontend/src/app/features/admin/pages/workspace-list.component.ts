import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '@env/environment';
import { WorkspaceApiService } from '../services/workspace-api.service';
import { AdminStore } from '../store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { Workspace, WorkspaceUpdateRequest } from '../models/admin.models';

export interface WorkspaceDialogData {
  orgId: string;
  workspace?: Workspace;
}

@Component({
  selector: 'app-workspace-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.workspace ? 'Edit workspace' : 'Create workspace' }}</h2>
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
          <mat-label>Market</mat-label>
          <input matInput formControlName="market" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancel</button>
      <button mat-raised-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || saving">
        @if (saving) { Saving… } @else { Save }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; } mat-form-field { margin-bottom: 8px; }`],
})
export class WorkspaceFormDialogComponent implements OnInit {
  readonly envApi = environment.apiUrl;

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<WorkspaceFormDialogComponent>);
  private workspaceApi = inject(WorkspaceApiService);
  private notify = inject(NotificationService);

  data = inject(MAT_DIALOG_DATA) as WorkspaceDialogData;

  form = this.fb.group({
    name: ['', Validators.required],
    market: [''],
  });
  saving = false;

  ngOnInit(): void {
    if (this.data.workspace) {
      this.form.patchValue({
        name: this.data.workspace.name,
        market: this.data.workspace.market,
      });
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const { orgId, workspace } = this.data;
    this.saving = true;
    if (workspace) {
      const body: WorkspaceUpdateRequest = {
        name: this.form.value.name ?? undefined,
        market: this.form.value.market || undefined,
      };
      this.workspaceApi.update(orgId, workspace.id, body).subscribe({
        next: (w) => {
          this.notify.success('Workspace updated');
          this.dialogRef.close(w);
        },
        error: (err: HttpErrorResponse) => {
          this.saving = false;
          this.handleErr(err);
        },
      });
    } else {
      this.workspaceApi
        .create(orgId, {
          name: this.form.value.name!,
          market: this.form.value.market || undefined,
        })
        .subscribe({
          next: (w) => {
            this.notify.success('Workspace created');
            this.dialogRef.close(w);
          },
          error: (err: HttpErrorResponse) => {
            this.saving = false;
            this.handleErr(err);
          },
        });
    }
  }

  private handleErr(err: HttpErrorResponse): void {
    if (err.status === 409) {
      this.notify.error(
        err.error?.detail || 'A workspace with this name already exists in this organization.'
      );
    } else {
      this.notify.error(err.error?.detail || 'Request failed');
    }
  }
}

@Component({
  selector: 'app-workspace-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2>Workspaces</h2>
    <mat-card [attr.data-api-url]="envApi">
      <mat-card-content>
        @if (!orgId()) {
          <p class="empty-state">Select an organization to view workspaces.</p>
        } @else {
          <div class="filters">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Status</mat-label>
              <mat-select [formControl]="filterForm.controls.status">
                <mat-option value="">All</mat-option>
                <mat-option value="ACTIVE">ACTIVE</mat-option>
                <mat-option value="ARCHIVED">ARCHIVED</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-grow">
              <mat-label>Search name</mat-label>
              <input matInput [formControl]="filterForm.controls.name" />
            </mat-form-field>
            <button mat-raised-button color="primary" type="button" (click)="openCreate()">
              <mat-icon>add</mat-icon>
              Create workspace
            </button>
          </div>

          @if (loading()) {
            <div class="spinner-wrap">
              <mat-spinner diameter="40"></mat-spinner>
            </div>
          } @else if (workspaces().length === 0) {
            <p class="empty-state">No workspaces match your filters.</p>
          } @else {
            <table mat-table [dataSource]="workspaces()" class="full-width">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let row">{{ row.name }}</td>
              </ng-container>
              <ng-container matColumnDef="market">
                <th mat-header-cell *matHeaderCellDef>Market</th>
                <td mat-cell *matCellDef="let row">{{ row.market }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let row">{{ row.status }}</td>
              </ng-container>
              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>Created</th>
                <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'medium' }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button type="button" (click)="openEdit(row)" aria-label="Edit workspace">
                    <mat-icon>edit</mat-icon>
                  </button>
                  @if (row.status === 'ACTIVE') {
                    <button mat-icon-button type="button" color="warn" (click)="archive(row)">
                      <mat-icon>archive</mat-icon>
                    </button>
                  } @else {
                    <button mat-icon-button type="button" color="primary" (click)="restore(row)">
                      <mat-icon>unarchive</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          }
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
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .filter-field { width: 160px; }
    .filter-grow { flex: 1; min-width: 200px; }
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
  `],
})
export class WorkspaceListComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private workspaceApi = inject(WorkspaceApiService);
  private adminStore = inject(AdminStore);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);

  private destroy$ = new Subject<void>();

  readonly loading = signal(false);
  readonly workspaces = signal<Workspace[]>([]);
  readonly displayedColumns = ['name', 'market', 'status', 'createdAt', 'actions'];
  readonly envApi = environment.apiUrl;

  filterForm = this.fb.group({
    status: [''],
    name: [''],
  });

  orgId = this.adminStore.selectedOrgId;

  ngOnInit(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        map(() => this.filterForm.getRawValue()),
        distinctUntilChanged(
          (a, b) => (a.status || '') === (b.status || '') && (a.name || '') === (b.name || '')
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.load());

    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) {
      this.workspaces.set([]);
      return;
    }
    this.loading.set(true);
    const status = this.filterForm.value.status || undefined;
    const name = this.filterForm.value.name?.trim() || undefined;
    this.workspaceApi.list(id, status, name).subscribe({
      next: (rows) => {
        this.workspaces.set(rows);
        this.adminStore.setWorkspaces(rows);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.notify.error(err.error?.detail || 'Failed to load workspaces');
      },
    });
  }

  openCreate(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    const ref = this.dialog.open(WorkspaceFormDialogComponent, {
      width: '440px',
      data: { orgId: id } satisfies WorkspaceDialogData,
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.load();
    });
  }

  openEdit(ws: Workspace): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    const ref = this.dialog.open(WorkspaceFormDialogComponent, {
      width: '440px',
      data: { orgId: id, workspace: ws } satisfies WorkspaceDialogData,
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.load();
    });
  }

  archive(ws: Workspace): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    this.workspaceApi.archive(id, ws.id).subscribe({
      next: () => {
        this.notify.success('Workspace archived');
        this.load();
      },
      error: (err: HttpErrorResponse) =>
        this.notify.error(err.error?.detail || 'Archive failed'),
    });
  }

  restore(ws: Workspace): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    this.workspaceApi.restore(id, ws.id).subscribe({
      next: () => {
        this.notify.success('Workspace restored');
        this.load();
      },
      error: (err: HttpErrorResponse) =>
        this.notify.error(err.error?.detail || 'Restore failed'),
    });
  }
}
