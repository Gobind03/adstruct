import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
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
import { InvitesApiService } from '../services/invites-api.service';
import { WorkspaceApiService } from '../services/workspace-api.service';
import { AdminStore } from '../store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { Invite, MEMBER_ROLES, MemberRole } from '../models/admin.models';

export interface CreateInviteDialogCtx {
  orgId: string;
  workspaces: { id: string; name: string }[];
}

@Component({
  selector: 'app-create-invite-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    ClipboardModule,
  ],
  template: `
    <h2 mat-dialog-title>Create invite</h2>
    <mat-dialog-content [attr.data-api-url]="envApi">
      @if (!createdInvite()) {
        <form [formGroup]="form">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" />
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
              <mat-option value="">Organization</mat-option>
              @for (w of data.workspaces; track w.id) {
                <mat-option [value]="w.id">{{ w.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Expires in (days)</mat-label>
            <input matInput type="number" min="1" formControlName="expiresInDays" />
          </mat-form-field>
        </form>
      } @else {
        @if (createdInvite()!.inviteLink) {
          <p class="hint">Share this link with the invitee:</p>
          <div class="link-row">
            <code class="link-text">{{ createdInvite()!.inviteLink }}</code>
            <button mat-icon-button type="button" (click)="copy(createdInvite()!.inviteLink!)" aria-label="Copy link">
              <mat-icon>content_copy</mat-icon>
            </button>
          </div>
        } @else {
          <p class="hint">Invite created. Copy the link from the list after closing this dialog.</p>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (!createdInvite()) {
        <button mat-button mat-dialog-close type="button">Cancel</button>
        <button mat-raised-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || saving">
          Create
        </button>
      } @else {
        <button mat-raised-button color="primary" mat-dialog-close type="button">Done</button>
      }
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; }
    mat-form-field { margin-bottom: 8px; }
    .hint { margin-bottom: 8px; color: var(--text-muted); font-size: 14px; }
    .link-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: var(--bg-surface-hover);
      border-radius: var(--radius-md);
      border: 1px solid var(--border-default);
    }
    .link-text {
      flex: 1;
      overflow: auto;
      font-size: 12px;
      word-break: break-all;
    }
  `],
})
export class CreateInviteDialogComponent {
  readonly envApi = environment.apiUrl;

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<CreateInviteDialogComponent>);
  private invitesApi = inject(InvitesApiService);
  private notify = inject(NotificationService);
  private clipboard = inject(Clipboard);
  data = inject(MAT_DIALOG_DATA) as CreateInviteDialogCtx;

  form: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['VIEWER' as MemberRole, Validators.required],
    workspaceId: [''],
    expiresInDays: [7, [Validators.required, Validators.min(1)]],
  });
  saving = false;
  readonly createdInvite = signal<Invite | null>(null);
  readonly roles = MEMBER_ROLES;

  submit(): void {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saving = true;
    this.invitesApi
      .create(this.data.orgId, {
        email: v.email!,
        role: v.role!,
        workspaceId: v.workspaceId || undefined,
        expiresInDays: v.expiresInDays ?? 7,
      })
      .subscribe({
        next: (inv) => {
          this.saving = false;
          this.createdInvite.set(inv);
          this.notify.success('Invite created');
        },
        error: (err) => {
          this.saving = false;
          this.notify.error(err.error?.detail || 'Could not create invite');
        },
      });
  }

  copy(link: string): void {
    this.clipboard.copy(link);
    this.notify.success('Copied to clipboard');
  }
}

@Component({
  selector: 'app-invites',
  standalone: true,
  imports: [
    CommonModule,
    ClipboardModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2>Invites</h2>
    <mat-card [attr.data-api-url]="envApi">
      <mat-card-content>
        @if (!orgId()) {
          <p class="empty-state">Select an organization to view invites.</p>
        } @else {
          <div class="toolbar">
            <button mat-raised-button color="primary" type="button" (click)="openCreate()">
              <mat-icon>add</mat-icon>
              Create invite
            </button>
          </div>

          @if (loading()) {
            <div class="spinner-wrap">
              <mat-spinner diameter="40"></mat-spinner>
            </div>
          } @else if (invites().length === 0) {
            <p class="empty-state">No invites yet.</p>
          } @else {
            <table mat-table [dataSource]="invites()" class="full-width">
              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef>Email</th>
                <td mat-cell *matCellDef="let row">{{ row.email }}</td>
              </ng-container>
              <ng-container matColumnDef="role">
                <th mat-header-cell *matHeaderCellDef>Role</th>
                <td mat-cell *matCellDef="let row">{{ row.role }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let row">{{ row.status }}</td>
              </ng-container>
              <ng-container matColumnDef="workspace">
                <th mat-header-cell *matHeaderCellDef>Workspace</th>
                <td mat-cell *matCellDef="let row">{{ workspaceLabel(row) }}</td>
              </ng-container>
              <ng-container matColumnDef="expiresAt">
                <th mat-header-cell *matHeaderCellDef>Expires</th>
                <td mat-cell *matCellDef="let row">{{ row.expiresAt | date: 'medium' }}</td>
              </ng-container>
              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>Created</th>
                <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'medium' }}</td>
              </ng-container>
              <ng-container matColumnDef="link">
                <th mat-header-cell *matHeaderCellDef>Link</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.inviteLink) {
                    <button mat-icon-button type="button" (click)="copyLink(row.inviteLink)" aria-label="Copy invite link">
                      <mat-icon>content_copy</mat-icon>
                    </button>
                  } @else {
                    —
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.status === 'PENDING') {
                    <button mat-button type="button" color="warn" (click)="revoke(row)">Revoke</button>
                    <button mat-button type="button" (click)="resend(row)">Resend</button>
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
    .toolbar {
      display: flex;
      justify-content: flex-end;
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
  `],
})
export class InvitesComponent implements OnInit {
  private invitesApi = inject(InvitesApiService);
  private workspaceApi = inject(WorkspaceApiService);
  private adminStore = inject(AdminStore);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);
  private clipboard = inject(Clipboard);

  readonly loading = signal(false);
  readonly invites = signal<Invite[]>([]);
  private workspaceMap = signal(new Map<string, string>());
  readonly displayedColumns = [
    'email',
    'role',
    'status',
    'workspace',
    'expiresAt',
    'createdAt',
    'link',
    'actions',
  ];
  readonly envApi = environment.apiUrl;

  orgId = this.adminStore.selectedOrgId;

  ngOnInit(): void {
    this.loadWorkspaces();
    this.loadInvites();
  }

  loadWorkspaces(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    this.workspaceApi.list(id).subscribe({
      next: (list) => {
        const m = new Map<string, string>();
        for (const w of list) m.set(w.id, w.name);
        this.workspaceMap.set(m);
      },
      error: () => this.workspaceMap.set(new Map()),
    });
  }

  loadInvites(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) {
      this.invites.set([]);
      return;
    }
    this.loading.set(true);
    this.invitesApi.list(id).subscribe({
      next: (rows) => {
        this.invites.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err.error?.detail || 'Failed to load invites');
      },
    });
  }

  workspaceLabel(inv: Invite): string {
    if (!inv.workspaceId) return 'Organization';
    return this.workspaceMap().get(inv.workspaceId) ?? inv.workspaceId;
  }

  openCreate(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    const workspaces = Array.from(this.workspaceMap().entries()).map(([wid, name]) => ({
      id: wid,
      name,
    }));
    const ref = this.dialog.open(CreateInviteDialogComponent, {
      width: '480px',
      data: { orgId: id, workspaces } satisfies CreateInviteDialogCtx,
    });
    ref.afterClosed().subscribe(() => this.loadInvites());
  }

  copyLink(link: string | null): void {
    if (!link) return;
    this.clipboard.copy(link);
    this.notify.success('Copied to clipboard');
  }

  revoke(inv: Invite): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    this.invitesApi.revoke(id, inv.id).subscribe({
      next: () => {
        this.notify.success('Invite revoked');
        this.loadInvites();
      },
      error: (err) => this.notify.error(err.error?.detail || 'Revoke failed'),
    });
  }

  resend(inv: Invite): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    this.invitesApi.resend(id, inv.id).subscribe({
      next: () => {
        this.notify.success('Invite resent');
        this.loadInvites();
      },
      error: (err) => this.notify.error(err.error?.detail || 'Resend failed'),
    });
  }
}
