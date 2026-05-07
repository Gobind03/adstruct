import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { CampaignApiService } from '../services/campaign.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { SponsoredUnitResponse, CampaignResponse } from '@shared/models/api.models';

@Component({
  selector: 'app-sponsored-unit-list',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatChipsModule, MatIconModule],
  template: `
    <h2>Creatives (Sponsored Units)</h2>
    <table mat-table [dataSource]="units" class="full-width">
      <ng-container matColumnDef="title">
        <th mat-header-cell *matHeaderCellDef>Title</th>
        <td mat-cell *matCellDef="let row">{{ row.title }}</td>
      </ng-container>
      <ng-container matColumnDef="type">
        <th mat-header-cell *matHeaderCellDef>Type</th>
        <td mat-cell *matCellDef="let row">{{ row.type }}</td>
      </ng-container>
      <ng-container matColumnDef="status">
        <th mat-header-cell *matHeaderCellDef>Status</th>
        <td mat-cell *matCellDef="let row">
          <mat-chip>{{ row.status }}</mat-chip>
        </td>
      </ng-container>
      <ng-container matColumnDef="landingUrl">
        <th mat-header-cell *matHeaderCellDef>Landing URL</th>
        <td mat-cell *matCellDef="let row">{{ row.landingUrl }}</td>
      </ng-container>
      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
    </table>
  `,
  styles: [`
    h2 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin-bottom: 20px;
    }
    .full-width { width: 100%; }
  `],
})
export class SponsoredUnitListComponent implements OnInit {
  units: SponsoredUnitResponse[] = [];
  displayedColumns = ['title', 'type', 'status', 'landingUrl'];

  constructor(
    private campaignService: CampaignApiService,
    private workspaceService: WorkspaceService
  ) {}

  ngOnInit(): void {
    const ws = this.workspaceService.currentWorkspace();
    if (!ws) return;
    this.campaignService.list(ws.id).subscribe((data) => {
      data.content.forEach((campaign: CampaignResponse) => {
        this.campaignService.listSponsoredUnits(campaign.id).subscribe((units) => {
          this.units = [...this.units, ...units];
        });
      });
    });
  }
}
