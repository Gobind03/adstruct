import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApprovalApiService } from '../services/approval.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ApprovalResponse } from '@shared/models/api.models';

@Component({
  selector: 'app-approval-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
    <h2>Pending Approvals</h2>

    <table mat-table [dataSource]="approvals" class="full-width">
      <ng-container matColumnDef="entityType">
        <th mat-header-cell *matHeaderCellDef>Type</th>
        <td mat-cell *matCellDef="let row">{{ row.entityType }}</td>
      </ng-container>
      <ng-container matColumnDef="entityId">
        <th mat-header-cell *matHeaderCellDef>Entity ID</th>
        <td mat-cell *matCellDef="let row">{{ row.entityId | slice:0:8 }}...</td>
      </ng-container>
      <ng-container matColumnDef="state">
        <th mat-header-cell *matHeaderCellDef>State</th>
        <td mat-cell *matCellDef="let row">
          <mat-chip>{{ row.state }}</mat-chip>
        </td>
      </ng-container>
      <ng-container matColumnDef="actions">
        <th mat-header-cell *matHeaderCellDef>Actions</th>
        <td mat-cell *matCellDef="let row">
          <button mat-icon-button color="primary" (click)="onApprove(row)">
            <mat-icon>check_circle</mat-icon>
          </button>
          <button mat-icon-button color="warn" (click)="onReject(row)">
            <mat-icon>cancel</mat-icon>
          </button>
        </td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>

    @if (approvals.length === 0) {
      <p class="empty-state">No pending approvals.</p>
    }
  `,
  styles: [`
    h2 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 20px;
    }
    .full-width { width: 100%; }
    .empty-state {
      text-align: center;
      padding: 64px 24px;
      color: var(--text-muted);
      font-size: 15px;
    }
  `],
})
export class ApprovalListComponent implements OnInit {
  approvals: ApprovalResponse[] = [];
  displayedColumns = ['entityType', 'entityId', 'state', 'actions'];

  constructor(
    private approvalService: ApprovalApiService,
    private notify: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadApprovals();
  }

  loadApprovals(): void {
    this.approvalService.listPending().subscribe((data) => (this.approvals = data));
  }

  onApprove(approval: ApprovalResponse): void {
    this.approvalService.approve(approval.id).subscribe(() => {
      this.notify.success('Approved');
      this.loadApprovals();
    });
  }

  onReject(approval: ApprovalResponse): void {
    this.approvalService.reject(approval.id).subscribe(() => {
      this.notify.success('Rejected');
      this.loadApprovals();
    });
  }
}
