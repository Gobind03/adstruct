import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { EventApiService } from '../services/event.service';
import { WorkspaceService } from '../../../core/services/workspace.service';
import { EventSummaryResponse } from '@shared/models/api.models';

@Component({
  selector: 'app-events-dashboard',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatTableModule, MatButtonModule,
    MatFormFieldModule, MatDatepickerModule, MatNativeDateModule, MatInputModule,
    FormsModule,
  ],
  template: `
    <h2>Events & Analytics</h2>

    <div class="metrics-grid">
      <mat-card>
        <mat-card-header><mat-card-title>Impressions</mat-card-title></mat-card-header>
        <mat-card-content><h1>{{ getTotal('IMPRESSION') | number }}</h1></mat-card-content>
      </mat-card>
      <mat-card>
        <mat-card-header><mat-card-title>Clicks</mat-card-title></mat-card-header>
        <mat-card-content><h1>{{ getTotal('CLICK') | number }}</h1></mat-card-content>
      </mat-card>
      <mat-card>
        <mat-card-header><mat-card-title>Conversions</mat-card-title></mat-card-header>
        <mat-card-content><h1>{{ getTotal('CONVERSION') | number }}</h1></mat-card-content>
      </mat-card>
      <mat-card>
        <mat-card-header><mat-card-title>Landing Visits</mat-card-title></mat-card-header>
        <mat-card-content><h1>{{ getTotal('LANDING_VISIT') | number }}</h1></mat-card-content>
      </mat-card>
    </div>

    <h3>Event Breakdown</h3>
    <table mat-table [dataSource]="events" class="full-width">
      <ng-container matColumnDef="date">
        <th mat-header-cell *matHeaderCellDef>Date</th>
        <td mat-cell *matCellDef="let row">{{ row.date }}</td>
      </ng-container>
      <ng-container matColumnDef="eventType">
        <th mat-header-cell *matHeaderCellDef>Event Type</th>
        <td mat-cell *matCellDef="let row">{{ row.eventType }}</td>
      </ng-container>
      <ng-container matColumnDef="count">
        <th mat-header-cell *matHeaderCellDef>Count</th>
        <td mat-cell *matCellDef="let row">{{ row.count | number }}</td>
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
    h3 {
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--text-primary);
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .metrics-grid h1 {
      font-size: 36px;
      font-weight: 700;
      margin: 8px 0;
      color: var(--color-primary);
      letter-spacing: -0.02em;
    }
    .full-width { width: 100%; }
  `],
})
export class EventsDashboardComponent implements OnInit {
  events: EventSummaryResponse[] = [];
  displayedColumns = ['date', 'eventType', 'count'];

  constructor(
    private eventService: EventApiService,
    private workspaceService: WorkspaceService
  ) {}

  ngOnInit(): void {
    const ws = this.workspaceService.currentWorkspace();
    if (!ws) return;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.eventService
      .getSummary(ws.id, undefined, thirtyDaysAgo.toISOString(), now.toISOString())
      .subscribe((data) => (this.events = data));
  }

  getTotal(eventType: string): number {
    return this.events
      .filter((e) => e.eventType === eventType)
      .reduce((sum, e) => sum + e.count, 0);
  }
}
