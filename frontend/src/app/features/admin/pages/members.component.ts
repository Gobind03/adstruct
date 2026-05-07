import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, map, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '@env/environment';
import { MembersApiService } from '../services/members-api.service';
import { WorkspaceApiService } from '../services/workspace-api.service';
import { AdminStore } from '../store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import {
  MEMBER_ROLES,
  MemberDetail,
  MemberRole,
  UserStatus,
} from '../models/admin.models';

export interface AddMemberDialogCtx {
  orgId: string;
  workspaces: { id: string; name: string }[];
}

@Component({
  selector: 'app-add-member-dialog',
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
    <h2 mat-dialog-title>Add member</h2>
    <mat-dialog-content [attr.data-api-url]="envApi">
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Full name</mat-label>
          <input matInput formControlName="fullName" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role">
            @for (r of roles; track r) {
              <mat-option [value]="r">{{ r }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Workspace</mat-label>
          <mat-select formControlName="workspaceId">
            <mat-option value="">Organization (no workspace)</mat-option>
            @for (w of data.workspaces; track w.id) {
              <mat-option [value]="w.id">{{ w.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancel</button>
      <button mat-raised-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || saving">
        Add
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; } mat-form-field { margin-bottom: 8px; }`],
})
export class AddMemberDialogComponent {
  readonly envApi = environment.apiUrl;

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<AddMemberDialogComponent>);
  private membersApi = inject(MembersApiService);
  private notify = inject(NotificationService);
  data = inject(MAT_DIALOG_DATA) as AddMemberDialogCtx;

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    fullName: [''],
    role: ['VIEWER' as MemberRole, Validators.required],
    workspaceId: [''],
  });
  saving = false;
  readonly roles = MEMBER_ROLES;

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saving = true;
    this.membersApi
      .create(this.data.orgId, {
        email: v.email!,
        fullName: v.fullName || undefined,
        role: v.role!,
        workspaceId: v.workspaceId || undefined,
      })
      .subscribe({
        next: () => {
          this.notify.success('Member added');
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving = false;
          this.notify.error(err.error?.detail || 'Failed to add member');
        },
      });
  }
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content [attr.data-api-url]="envApi">{{ data.message }}</mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancel</button>
      <button mat-raised-button [color]="data.warn ? 'warn' : 'primary'" [mat-dialog-close]="true" type="button">
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  readonly envApi = environment.apiUrl;

  data = inject(MAT_DIALOG_DATA) as {
    title: string;
    message: string;
    confirmLabel: string;
    warn?: boolean;
  };
}

@Component({
  selector: 'app-members',
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
    <h2>Members &amp; roles</h2>
    <mat-card [attr.data-api-url]="envApi">
      <mat-card-content>
        @if (!orgId()) {
          <p class="empty-state">Select an organization to view members.</p>
        } @else {
          <div class="filters">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Workspace</mat-label>
              <mat-select [formControl]="filterForm.controls.workspaceId">
                <mat-option value="">All</mat-option>
                @for (w of workspaceOptions(); track w.id) {
                  <mat-option [value]="w.id">{{ w.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Role</mat-label>
              <mat-select [formControl]="filterForm.controls.role">
                <mat-option value="">All</mat-option>
                @for (r of roles; track r) {
                  <mat-option [value]="r">{{ r }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Status</mat-label>
              <mat-select [formControl]="filterForm.controls.status">
                <mat-option value="">All</mat-option>
                <mat-option value="ACTIVE">ACTIVE</mat-option>
                <mat-option value="INVITED">INVITED</mat-option>
                <mat-option value="DISABLED">DISABLED</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-grow">
              <mat-label>Search</mat-label>
              <input matInput [formControl]="filterForm.controls.query" />
            </mat-form-field>
            <button mat-raised-button color="primary" type="button" (click)="openAdd()">
              <mat-icon>person_add</mat-icon>
              Add member
            </button>
          </div>

          @if (loading()) {
            <div class="spinner-wrap">
              <mat-spinner diameter="40"></mat-spinner>
            </div>
          } @else if (members().length === 0) {
            <p class="empty-state">No members match your filters.</p>
          } @else {
            <table mat-table [dataSource]="members()" class="full-width">
              <ng-container matColumnDef="fullName">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let row">{{ row.fullName }}</td>
              </ng-container>
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let row">{{ row.email }}</td>
              </ng-container>
              <ng-container matColumnDef="scope">
                <th mat-header-cell *matHeaderCellDef>Scope</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.workspaceId === null) {
                    Organization
                  } @else {
                    {{ row.workspaceName || row.workspaceId }}
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Role</th>
                <td mat-cell *matCellDef="let row">
                  @if (canManage()) {
                    <mat-form-field appearance="outline" class="dense-field" subscriptSizing="dynamic">
                      <mat-select
                        [value]="row.role"
                        (selectionChange)="onRoleChange(row, $event.value)"
                      >
                        @for (r of roles; track r) {
                          <mat-option [value]="r">{{ r }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  } @else {
                    {{ row.role }}
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="userStatus">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let row">{{ row.userStatus }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row">
                  @if (canManage()) {
                    <button mat-icon-button type="button" color="warn" (click)="remove(row)">
                      <mat-icon>person_remove</mat-icon>
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
    .filter-field { width: 180px; }
    .filter-grow { flex: 1; min-width: 200px; }
    .dense-field { width: 200px; margin: 0; }
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
export class MembersComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private membersApi = inject(MembersApiService);
  private workspaceApi = inject(WorkspaceApiService);
  private adminStore = inject(AdminStore);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);

  private destroy$ = new Subject<void>();

  readonly loading = signal(false);
  readonly members = signal<MemberDetail[]>([]);
  readonly workspaceOptions = signal<{ id: string; name: string }[]>([]);
  readonly displayedColumns = ['fullName', 'email', 'scope', 'role', 'userStatus', 'actions'];
  readonly envApi = environment.apiUrl;
  readonly roles = MEMBER_ROLES;

  orgId = this.adminStore.selectedOrgId;

  filterForm = this.fb.group({
    workspaceId: [''],
    role: [''],
    status: [''],
    query: [''],
  });

  canManage(): boolean {
    const id = this.adminStore.selectedOrgId();
    return id ? this.adminStore.canManageMembers(id) : false;
  }

  ngOnInit(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(300),
        map(() => this.filterForm.getRawValue()),
        distinctUntilChanged(
          (a, b) =>
            (a.workspaceId || '') === (b.workspaceId || '') &&
            (a.role || '') === (b.role || '') &&
            (a.status || '') === (b.status || '') &&
            (a.query || '') === (b.query || '')
        ),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.loadMembers());

    this.loadWorkspaces();
    this.loadMembers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWorkspaces(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) {
      this.workspaceOptions.set([]);
      return;
    }
    this.workspaceApi.list(id, 'ACTIVE').subscribe({
      next: (list) =>
        this.workspaceOptions.set(list.map((w) => ({ id: w.id, name: w.name }))),
      error: () => this.workspaceOptions.set([]),
    });
  }

  loadMembers(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) {
      this.members.set([]);
      return;
    }
    this.loading.set(true);
    const f = this.filterForm.getRawValue();
    this.membersApi
      .list(
        id,
        f.workspaceId || undefined,
        (f.role as MemberRole) || undefined,
        (f.status as UserStatus) || undefined,
        f.query?.trim() || undefined
      )
      .subscribe({
        next: (rows) => {
          this.members.set(rows);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.error(err.error?.detail || 'Failed to load members');
        },
      });
  }

  openAdd(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    const ref = this.dialog.open(AddMemberDialogComponent, {
      width: '480px',
      data: {
        orgId: id,
        workspaces: this.workspaceOptions(),
      } satisfies AddMemberDialogCtx,
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.loadMembers();
    });
  }

  onRoleChange(row: MemberDetail, role: MemberRole): void {
    if (role === row.role) return;
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    this.membersApi.updateRole(id, row.membershipId, { role }).subscribe({
      next: (updated) => {
        this.members.update((list) =>
          list.map((m) => (m.membershipId === updated.membershipId ? updated : m))
        );
        this.notify.success('Role updated');
      },
      error: (err) => this.notify.error(err.error?.detail || 'Could not update role'),
    });
  }

  remove(row: MemberDetail): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Remove member',
        message: `Remove ${row.fullName || row.email} from this organization?`,
        confirmLabel: 'Remove',
        warn: true,
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.membersApi.remove(id, row.membershipId).subscribe({
        next: () => {
          this.notify.success('Member removed');
          this.loadMembers();
        },
        error: (err) => this.notify.error(err.error?.detail || 'Remove failed'),
      });
    });
  }
}
