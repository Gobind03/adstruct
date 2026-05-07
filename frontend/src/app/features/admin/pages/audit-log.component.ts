import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '@env/environment';
import { AuditApiService } from '../services/audit-api.service';
import { WorkspaceApiService } from '../services/workspace-api.service';
import { AdminStore } from '../store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { AuditLogEntry } from '../models/admin.models';

@Component({
  selector: 'app-audit-log',
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
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2>Audit log</h2>
    <mat-card [attr.data-api-url]="envApi">
      <mat-card-content>
        @if (!orgId()) {
          <p class="empty-state">Select an organization to view audit events.</p>
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
              <mat-label>Entity type</mat-label>
              <mat-select [formControl]="filterForm.controls.entityType">
                <mat-option value="">All</mat-option>
                @for (t of entityTypes; track t) {
                  <mat-option [value]="t">{{ t }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Action</mat-label>
              <input matInput [formControl]="filterForm.controls.action" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>From</mat-label>
              <input matInput type="date" [formControl]="filterForm.controls.dateFrom" />
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>To</mat-label>
              <input matInput type="date" [formControl]="filterForm.controls.dateTo" />
            </mat-form-field>
            <button mat-stroked-button type="button" (click)="applyFilters()">Apply</button>
          </div>

          @if (loading()) {
            <div class="spinner-wrap">
              <mat-spinner diameter="40"></mat-spinner>
            </div>
          } @else if (entries().length === 0) {
            <p class="empty-state">No audit entries match your filters.</p>
          } @else {
            <table mat-table [dataSource]="entries()" class="full-width">
              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>Time</th>
                <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'medium' }}</td>
              </ng-container>
              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef>Action</th>
                <td mat-cell *matCellDef="let row">{{ row.action }}</td>
              </ng-container>
              <ng-container matColumnDef="entityType">
                <th mat-header-cell *matHeaderCellDef>Entity</th>
                <td mat-cell *matCellDef="let row">{{ row.entityType }}</td>
              </ng-container>
              <ng-container matColumnDef="entityId">
                <th mat-header-cell *matHeaderCellDef>Entity ID</th>
                <td mat-cell *matCellDef="let row">{{ row.entityId }}</td>
              </ng-container>
              <ng-container matColumnDef="actorUserId">
                <th mat-header-cell *matHeaderCellDef>Actor</th>
                <td mat-cell *matCellDef="let row">{{ row.actorUserId }}</td>
              </ng-container>
              <ng-container matColumnDef="expand">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button type="button" (click)="toggleExpand(row); $event.stopPropagation()">
                    <mat-icon>{{ expandedId() === row.id ? 'expand_less' : 'expand_more' }}</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns;"
                class="data-row"
                (click)="toggleExpand(row)"
              ></tr>
            </table>

            @if (expandedEntry(); as row) {
              <div class="detail-json">
                <div class="json-block">
                  <div class="json-label">Before</div>
                  <pre>{{ formatJson(row.beforeJson) }}</pre>
                </div>
                <div class="json-block">
                  <div class="json-label">After</div>
                  <pre>{{ formatJson(row.afterJson) }}</pre>
                </div>
              </div>
            }

            <mat-paginator
              [length]="totalElements()"
              [pageIndex]="pageIndex()"
              [pageSize]="pageSize()"
              [pageSizeOptions]="[10, 20, 50]"
              (page)="onPage($event)"
            ></mat-paginator>
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
    .data-row { cursor: pointer; }
    .detail-json {
      margin-top: 12px;
      padding: 12px 16px 20px;
      background: var(--bg-surface-hover);
      border-radius: var(--radius-md);
    }
    .json-block { margin-bottom: 12px; }
    .json-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 4px;
    }
    pre {
      margin: 0;
      padding: 12px;
      background: var(--bg-surface);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-sm);
      font-size: 12px;
      overflow: auto;
      max-height: 240px;
    }
  `],
})
export class AuditLogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auditApi = inject(AuditApiService);
  private workspaceApi = inject(WorkspaceApiService);
  private adminStore = inject(AdminStore);
  private notify = inject(NotificationService);

  readonly loading = signal(false);
  readonly entries = signal<AuditLogEntry[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly expandedId = signal<string | null>(null);
  readonly workspaceOptions = signal<{ id: string; name: string }[]>([]);

  readonly expandedEntry = computed(() => {
    const id = this.expandedId();
    if (!id) return null;
    return this.entries().find((e) => e.id === id) ?? null;
  });

  readonly displayedColumns = [
    'createdAt',
    'action',
    'entityType',
    'entityId',
    'actorUserId',
    'expand',
  ];
  readonly entityTypes = [
    'ORGANIZATION',
    'WORKSPACE',
    'USER',
    'MEMBERSHIP',
    'TEAM',
    'INVITE',
  ];
  readonly envApi = environment.apiUrl;

  orgId = this.adminStore.selectedOrgId;

  filterForm = this.fb.group({
    workspaceId: [''],
    entityType: [''],
    action: [''],
    dateFrom: [''],
    dateTo: [''],
  });

  ngOnInit(): void {
    this.loadWorkspaces();
    this.load();
  }

  loadWorkspaces(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    this.workspaceApi.list(id).subscribe({
      next: (list) =>
        this.workspaceOptions.set(list.map((w) => ({ id: w.id, name: w.name }))),
      error: () => this.workspaceOptions.set([]),
    });
  }

  applyFilters(): void {
    this.pageIndex.set(0);
    this.load();
  }

  load(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) {
      this.entries.set([]);
      return;
    }
    this.loading.set(true);
    const f = this.filterForm.getRawValue();
    this.auditApi
      .list(id, this.pageIndex(), this.pageSize(), {
        workspaceId: f.workspaceId || undefined,
        entityType: f.entityType || undefined,
        action: f.action?.trim() || undefined,
        dateFrom: f.dateFrom || undefined,
        dateTo: f.dateTo || undefined,
      })
      .subscribe({
        next: (page) => {
          this.entries.set(page.content);
          this.totalElements.set(page.totalElements);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.error(err.error?.detail || 'Failed to load audit log');
        },
      });
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
    this.load();
  }

  toggleExpand(row: AuditLogEntry): void {
    this.expandedId.set(this.expandedId() === row.id ? null : row.id);
  }

  formatJson(raw: string | null): string {
    if (raw == null || raw === '') return '—';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }
}
