import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { CampaignApiService } from '../services/campaign.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { CampaignResponse, PagedResponse } from '@shared/models/api.models';

@Component({
  selector: 'app-campaign-list',
  standalone: true,
  imports: [
    CommonModule, RouterModule, MatTableModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatSelectModule, MatFormFieldModule,
    MatPaginatorModule,
  ],
  template: `
    <div class="page-header">
      <h2>Campaigns</h2>
      <div class="header-actions">
        <mat-form-field appearance="outline">
          <mat-label>Status</mat-label>
          <mat-select (selectionChange)="filterByStatus($event.value)" [value]="statusFilter">
            <mat-option value="">All</mat-option>
            <mat-option value="DRAFT">Draft</mat-option>
            <mat-option value="ACTIVE">Active</mat-option>
            <mat-option value="PAUSED">Paused</mat-option>
            <mat-option value="ARCHIVED">Archived</mat-option>
          </mat-select>
        </mat-form-field>
        <a mat-raised-button color="primary" routerLink="/campaigns/new">
          <mat-icon>add</mat-icon> New Campaign
        </a>
      </div>
    </div>

    <table mat-table [dataSource]="campaigns" class="full-width">
      <ng-container matColumnDef="name">
        <th mat-header-cell *matHeaderCellDef>Name</th>
        <td mat-cell *matCellDef="let row">
          <a [routerLink]="['/campaigns', row.id]">{{ row.name }}</a>
        </td>
      </ng-container>

      <ng-container matColumnDef="objective">
        <th mat-header-cell *matHeaderCellDef>Objective</th>
        <td mat-cell *matCellDef="let row">{{ row.objective }}</td>
      </ng-container>

      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let row">
          <mat-chip [class]="'status-' + row.status.toLowerCase()">{{ row.status }}</mat-chip>
        </td>
      </ng-container>

      <ng-container matColumnDef="dailyBudget">
        <th mat-header-cell *matHeaderCellDef>Daily Budget</th>
        <td mat-cell *matCellDef="let row">{{ row.dailyBudget | currency }}</td>
      </ng-container>

      <ng-container matColumnDef="dates">
        <th mat-header-cell *matHeaderCellDef>Dates</th>
        <td mat-cell *matCellDef="let row">{{ row.startDate }} - {{ row.endDate }}</td>
      </ng-container>

      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>

    <mat-paginator
      [length]="totalElements"
      [pageSize]="pageSize"
      [pageSizeOptions]="[10, 20, 50]"
      (page)="onPage($event)">
    </mat-paginator>
  `,
  styles: [`
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    h2 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
    }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .full-width { width: 100%; }
    a { text-decoration: none; color: var(--color-primary); }
    a:hover { color: var(--color-primary-hover); }
  `],
})
export class CampaignListComponent implements OnInit {
  campaigns: CampaignResponse[] = [];
  displayedColumns = ['name', 'objective', 'status', 'dailyBudget', 'dates'];
  totalElements = 0;
  pageSize = 20;
  currentPage = 0;
  statusFilter = '';

  constructor(
    private campaignService: CampaignApiService,
    private workspaceService: WorkspaceService
  ) {}

  ngOnInit(): void {
    this.loadCampaigns();
  }

  loadCampaigns(): void {
    const ws = this.workspaceService.currentWorkspace();
    if (!ws) return;
    this.campaignService
      .list(ws.id, this.statusFilter || undefined, this.currentPage, this.pageSize)
      .subscribe((data) => {
        this.campaigns = data.content;
        this.totalElements = data.totalElements;
      });
  }

  filterByStatus(status: string): void {
    this.statusFilter = status;
    this.currentPage = 0;
    this.loadCampaigns();
  }

  onPage(event: PageEvent): void {
    this.currentPage = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadCampaigns();
  }
}
