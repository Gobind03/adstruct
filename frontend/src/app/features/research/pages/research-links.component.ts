import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { ConfirmDialogComponent } from '../components/confirm-dialog.component';
import { CrossModuleLinkChipComponent } from '../components/cross-module-link-chip.component';
import { ResearchEmptyStateComponent } from '../components/research-empty-state.component';
import { ResearchSectionHeaderComponent } from '../components/research-section-header.component';
import { RELATION_TYPES, ResearchLinkResponse } from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';

const RESEARCH_ENTITY_TYPES = [
  'INSIGHT',
  'SNAPSHOT',
  'PERSONA',
  'KEYWORD_CLUSTER',
  'COMPETITOR',
  'SOURCE',
  'WATCHLIST',
  'DIGEST_REPORT',
] as const;

const LINKED_ENTITY_TYPES = ['TEMPLATE', 'RULESET', 'CAMPAIGN', 'INTEGRATION_ACCOUNT'] as const;

@Component({
  selector: 'app-create-research-link-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Create cross-module link</h2>
    <mat-dialog-content class="dlg">
      <mat-form-field appearance="outline" class="full">
        <mat-label>Research entity type</mat-label>
        <mat-select [(ngModel)]="researchEntityType" name="ret" required>
          @for (t of researchTypes; track t) {
            <mat-option [value]="t">{{ t }}</mat-option>
          }
        </mat-select>
        <mat-hint>Which research object you are linking from.</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Research entity ID</mat-label>
        <input matInput [(ngModel)]="researchEntityId" name="rei" required />
        <mat-hint>UUID of the insight, snapshot, persona, etc.</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Linked entity type</mat-label>
        <mat-select [(ngModel)]="linkedEntityType" name="let" required>
          @for (t of linkedTypes; track t) {
            <mat-option [value]="t">{{ t }}</mat-option>
          }
        </mat-select>
        <mat-hint>Destination module entity (template, campaign, …).</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Linked entity ID</mat-label>
        <input matInput [(ngModel)]="linkedEntityId" name="lei" required />
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Relation</mat-label>
        <mat-select [(ngModel)]="relationType" name="rel" required>
          @for (r of relations; track r) {
            <mat-option [value]="r">{{ r }}</mat-option>
          }
        </mat-select>
        <mat-hint>How the research artifact relates to the linked record.</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Note (optional)</mat-label>
        <textarea matInput rows="2" [(ngModel)]="note" name="note"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancel</button>
      <button
        mat-flat-button
        color="primary"
        type="button"
        [disabled]="!researchEntityId.trim() || !linkedEntityId.trim()"
        (click)="save()"
      >
        Create link
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dlg {
        min-width: 440px;
        padding-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .full {
        width: 100%;
      }
    `,
  ],
})
export class CreateResearchLinkDialogComponent {
  readonly ref = inject(MatDialogRef<CreateResearchLinkDialogComponent>);
  readonly researchTypes = [...RESEARCH_ENTITY_TYPES];
  readonly linkedTypes = [...LINKED_ENTITY_TYPES];
  readonly relations = [...RELATION_TYPES];
  researchEntityType = this.researchTypes[0];
  researchEntityId = '';
  linkedEntityType = this.linkedTypes[0];
  linkedEntityId = '';
  relationType = this.relations[0];
  note = '';

  save(): void {
    this.ref.close({
      researchEntityType: this.researchEntityType,
      researchEntityId: this.researchEntityId.trim(),
      linkedEntityType: this.linkedEntityType,
      linkedEntityId: this.linkedEntityId.trim(),
      relationType: this.relationType,
      note: this.note.trim() || undefined,
    });
  }
}

@Component({
  selector: 'app-research-links',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmDialogComponent,
    CrossModuleLinkChipComponent,
    ResearchEmptyStateComponent,
    ResearchSectionHeaderComponent,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-research-section-header
        title="Cross-Module Links"
        description="Connect research artifacts (insights, snapshots, personas) to campaigns, templates, and integrations. Use these links for traceability from strategy to execution."
      >
        <button mat-flat-button color="primary" type="button" (click)="openCreate()">
          <mat-icon>link</mat-icon>
          Create Link
        </button>
      </app-research-section-header>

      <div class="filters">
        <mat-form-field appearance="outline" class="filter-field" subscriptSizing="dynamic">
          <mat-label>Filter by research entity type</mat-label>
          <mat-select [(ngModel)]="filterEntityType" (ngModelChange)="reload()">
            <mat-option value="">All types</mat-option>
            @for (t of researchEntityTypeOptions; track t) {
              <mat-option [value]="t">{{ t }}</mat-option>
            }
          </mat-select>
          <mat-hint>Narrow the list to one research object family.</mat-hint>
        </mat-form-field>
      </div>

      @if (!workspaceId()) {
        <mat-card class="hint-card">
          <mat-icon>workspaces</mat-icon>
          <p>Select a workspace to manage links.</p>
        </mat-card>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (!links().length) {
        <app-research-empty-state
          icon="link"
          title="No cross-module links"
          description="Create a link to tie a research record to a campaign, template, or integration resource."
          actionLabel="Create Link"
          (action)="openCreate()"
        />
      } @else {
        <mat-card class="table-card">
          <table mat-table [dataSource]="links()" class="rl-table">
            <ng-container matColumnDef="research">
              <th mat-header-cell *matHeaderCellDef>Research</th>
              <td mat-cell *matCellDef="let row">
                <span class="mono">{{ row.researchEntityType }}</span>
                <span class="id-hint" [matTooltip]="row.researchEntityId" matTooltipShowDelay="200">{{
                  row.researchEntityId
                }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="relation">
              <th mat-header-cell *matHeaderCellDef>Relation</th>
              <td mat-cell *matCellDef="let row">
                <mat-chip [matTooltip]="'Semantic relationship'" matTooltipShowDelay="200">{{ row.relationType }}</mat-chip>
              </td>
            </ng-container>
            <ng-container matColumnDef="linked">
              <th mat-header-cell *matHeaderCellDef>Linked entity</th>
              <td mat-cell *matCellDef="let row">
                <app-cross-module-link-chip
                  [linkedEntityType]="row.linkedEntityType"
                  [linkedEntityId]="row.linkedEntityId"
                  [label]="row.linkedEntityType + ' · ' + row.linkedEntityId"
                />
              </td>
            </ng-container>
            <ng-container matColumnDef="note">
              <th mat-header-cell *matHeaderCellDef>Note</th>
              <td mat-cell *matCellDef="let row">{{ row.note || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button type="button" color="warn" (click)="confirmDelete(row)" aria-label="Delete link">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </mat-card>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .page {
        padding: 16px 20px 40px;
        max-width: 1100px;
        margin: 0 auto;
      }
      .filters {
        margin-bottom: 16px;
      }
      .filter-field {
        min-width: 280px;
      }
      .hint-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px 24px !important;
      }
      .hint-card mat-icon {
        color: #9e9e9e;
      }
      .centered {
        display: flex;
        justify-content: center;
        padding: 48px;
      }
      .table-card {
        overflow: auto;
      }
      .rl-table {
        width: 100%;
      }
      .mono {
        display: block;
        font-weight: 600;
        font-size: 12px;
        text-transform: uppercase;
        color: #616161;
      }
      .id-hint {
        font-size: 11px;
        font-family: ui-monospace, monospace;
        color: #1976d2;
        word-break: break-all;
      }
    `,
  ],
})
export class ResearchLinksComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly links = signal<ResearchLinkResponse[]>([]);
  readonly loading = signal(false);
  filterEntityType = '';
  readonly researchEntityTypeOptions = [...RESEARCH_ENTITY_TYPES];
  readonly columns = ['research', 'relation', 'linked', 'note', 'actions'];

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.links.set([]);
      return;
    }
    this.loading.set(true);
    const ft = this.filterEntityType;
    this.api
      .listLinks(ws, ft ? { researchEntityType: ft } : undefined)
      .subscribe({
        next: (list) => {
          this.links.set(list);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.notify.error('Could not load links.');
        },
      });
  }

  openCreate(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.notify.error('Select a workspace first.');
      return;
    }
    const ref = this.dialog.open(CreateResearchLinkDialogComponent, { width: '500px' });
    ref.afterClosed().subscribe(
      (
        result: {
          researchEntityType: string;
          researchEntityId: string;
          linkedEntityType: string;
          linkedEntityId: string;
          relationType: string;
          note?: string;
        } | undefined,
      ) => {
        if (!result) return;
        this.api.createLink(ws, result).subscribe({
          next: () => {
            this.notify.success('Link created.');
            this.reload();
          },
          error: () => this.notify.error('Failed to create link.'),
        });
      },
    );
  }

  confirmDelete(row: ResearchLinkResponse): void {
    const ws = this.workspaceId();
    if (!ws) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remove link?',
        message: 'This removes the association between research and the linked record.',
        confirmLabel: 'Remove',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.api.deleteLink(ws, row.id).subscribe({
        next: () => {
          this.notify.success('Link removed.');
          this.reload();
        },
        error: () => this.notify.error('Could not delete link.'),
      });
    });
  }
}
