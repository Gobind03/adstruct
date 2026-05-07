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
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { AiActionButtonComponent } from '../components/ai-action-button.component';
import { ConfirmDialogComponent } from '../components/confirm-dialog.component';
import { ResearchEmptyStateComponent } from '../components/research-empty-state.component';
import { ResearchSectionHeaderComponent } from '../components/research-section-header.component';
import { PersonaResponse, SnapshotResponse } from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';
import { ResearchAiApiService } from '../services/research-ai-api.service';

@Component({
  selector: 'app-create-persona-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Create persona</h2>
    <mat-dialog-content class="dlg">
      <mat-form-field appearance="outline" class="full">
        <mat-label>Name</mat-label>
        <input matInput [(ngModel)]="name" name="n" required />
        <mat-hint>How you refer to this audience segment internally.</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancel</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!name.trim()" (click)="save()">
        Create
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dlg {
        min-width: 360px;
        padding-top: 8px;
      }
      .full {
        width: 100%;
      }
    `,
  ],
})
export class CreatePersonaDialogComponent {
  readonly ref = inject(MatDialogRef<CreatePersonaDialogComponent>);
  name = '';
  save(): void {
    this.ref.close({ name: this.name.trim() });
  }
}

export interface AiDraftPersonaDialogData {
  snapshots: SnapshotResponse[];
}

@Component({
  selector: 'app-ai-draft-persona-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatListModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>AI draft persona</h2>
    <mat-dialog-content class="dlg">
      <mat-form-field appearance="outline" class="full">
        <mat-label>Persona name</mat-label>
        <input matInput [(ngModel)]="personaName" name="pn" required />
        <mat-hint>Used as the title for the generated persona.</mat-hint>
      </mat-form-field>
      <p class="snap-label">Snapshots to analyze (select one or more)</p>
      <mat-selection-list [(ngModel)]="selectedIds" name="snaps" multiple>
        @for (s of data.snapshots; track s.id) {
          <mat-list-option [value]="s.id">
            {{ s.title || s.snapshotType }} — {{ s.capturedAt | date: 'medium' }}
          </mat-list-option>
        }
      </mat-selection-list>
      @if (!data.snapshots.length) {
        <p class="warn">No snapshots in this workspace. Capture research first.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancel</button>
      <button
        mat-flat-button
        color="accent"
        type="button"
        [disabled]="!personaName.trim() || !selectedIds.length"
        (click)="run()"
      >
        Draft with AI
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .dlg {
        min-width: 420px;
        max-height: 70vh;
        padding-top: 8px;
      }
      .full {
        width: 100%;
      }
      .snap-label {
        font-size: 13px;
        font-weight: 500;
        margin: 12px 0 4px;
      }
      .warn {
        color: #c62828;
        font-size: 13px;
      }
    `,
  ],
})
export class AiDraftPersonaDialogComponent {
  readonly ref = inject(MatDialogRef<AiDraftPersonaDialogComponent>);
  readonly data = inject<AiDraftPersonaDialogData>(MAT_DIALOG_DATA);
  personaName = '';
  selectedIds: string[] = [];

  run(): void {
    this.ref.close({
      personaName: this.personaName.trim(),
      snapshotIds: this.selectedIds,
    });
  }
}

@Component({
  selector: 'app-personas',
  standalone: true,
  imports: [
    CommonModule,
    AiActionButtonComponent,
    ConfirmDialogComponent,
    ResearchEmptyStateComponent,
    ResearchSectionHeaderComponent,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <app-research-section-header
        title="Audience Personas"
        description="Build audience personas backed by real research. Start manually or let AI draft from selected snapshots."
      >
        <button mat-stroked-button type="button" (click)="openCreate()">
          <mat-icon>person_add</mat-icon>
          Create Persona
        </button>
        <app-ai-action-button
          label="AI Draft Persona"
          tooltip="Generate a persona from snapshot content using AI."
          [disabled]="!workspaceId()"
          (clicked)="openAiDraft()"
        />
      </app-research-section-header>

      @if (!workspaceId()) {
        <mat-card class="hint-card">
          <mat-icon>workspaces</mat-icon>
          <p>Select a workspace to manage personas.</p>
        </mat-card>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (!personas().length) {
        <app-research-empty-state
          icon="people"
          title="No personas yet"
          description="Create a persona manually or draft one with AI from your research snapshots."
          actionLabel="Create Persona"
          (action)="openCreate()"
        />
        <div class="empty-secondary">
          <button mat-stroked-button color="accent" type="button" (click)="openAiDraft()">
            Or draft with AI
          </button>
        </div>
      } @else {
        <div class="card-grid">
          @for (p of personas(); track p.id) {
            <mat-card class="persona-card">
              <mat-card-header>
                <mat-card-title>{{ p.name }}</mat-card-title>
                <mat-card-subtitle>{{ p.language }} · {{ p.sentiment || '—' }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <div class="stats">
                  <span [matTooltip]="'Number of pain points recorded'" matTooltipShowDelay="200">
                    <mat-icon aria-hidden="true">sentiment_dissatisfied</mat-icon>
                    {{ p.pains.length }} pains
                  </span>
                  <span [matTooltip]="'Motivations captured for this persona'" matTooltipShowDelay="200">
                    <mat-icon aria-hidden="true">trending_up</mat-icon>
                    {{ p.motivations.length }} motivations
                  </span>
                </div>
                <div class="chips">
                  @for (ch of previewChannels(p.channels); track ch) {
                    <mat-chip [matTooltip]="'Channel this persona uses or trusts'" matTooltipShowDelay="200">{{
                      ch
                    }}</mat-chip>
                  }
                  @if (p.channels.length > 3) {
                    <span class="more">+{{ p.channels.length - 3 }}</span>
                  }
                </div>
              </mat-card-content>
              <mat-card-actions align="end">
                <button mat-icon-button type="button" color="warn" (click)="confirmDelete(p)" aria-label="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </mat-card-actions>
            </mat-card>
          }
        </div>
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
      .empty-secondary {
        text-align: center;
        margin-top: -32px;
        padding-bottom: 48px;
      }
      .card-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 16px;
      }
      .persona-card {
        display: flex;
        flex-direction: column;
      }
      .stats {
        display: flex;
        gap: 16px;
        margin-bottom: 12px;
        font-size: 13px;
        color: #424242;
      }
      .stats span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .stats mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #757575;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        align-items: center;
      }
      .more {
        font-size: 12px;
        color: #9e9e9e;
      }
    `,
  ],
})
export class PersonasComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly aiApi = inject(ResearchAiApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly personas = signal<PersonaResponse[]>([]);
  readonly snapshots = signal<SnapshotResponse[]>([]);
  readonly loading = signal(false);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.personas.set([]);
      this.snapshots.set([]);
      return;
    }
    this.loading.set(true);
    this.api.listPersonas(ws).subscribe({
      next: (list) => {
        this.personas.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Could not load personas.');
      },
    });
    this.api.listSnapshots(ws).subscribe({
      next: (s) => this.snapshots.set(s),
      error: () => {},
    });
  }

  previewChannels(channels: string[]): string[] {
    return channels.slice(0, 3);
  }

  openCreate(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.notify.error('Select a workspace first.');
      return;
    }
    const ref = this.dialog.open(CreatePersonaDialogComponent, { width: '420px' });
    ref.afterClosed().subscribe((result: { name: string } | undefined) => {
      if (!result?.name) return;
      this.api.createPersona(ws, { name: result.name }).subscribe({
        next: () => {
          this.notify.success('Persona created.');
          this.reload();
        },
        error: () => this.notify.error('Failed to create persona.'),
      });
    });
  }

  openAiDraft(): void {
    const ws = this.workspaceId();
    if (!ws) return;
    const ref = this.dialog.open(AiDraftPersonaDialogComponent, {
      width: '480px',
      data: { snapshots: this.snapshots() } satisfies AiDraftPersonaDialogData,
    });
    ref
      .afterClosed()
      .subscribe((result: { personaName: string; snapshotIds: string[] } | undefined) => {
        if (!result?.personaName || !result.snapshotIds?.length) return;
        const c = this.dialog.open(ConfirmDialogComponent, {
          data: {
            title: 'Draft persona with AI?',
            message:
              'This will send selected snapshot content to the AI persona workflow. Usage may apply. Continue?',
            confirmLabel: 'Draft persona',
          },
        });
        c.afterClosed().subscribe((ok) => {
          if (!ok) return;
          this.aiApi
            .draftPersona(ws, {
              personaName: result.personaName,
              snapshotIds: result.snapshotIds,
            })
            .subscribe({
              next: () => {
                this.notify.success('Persona draft created.');
                this.reload();
              },
              error: () => this.notify.error('AI draft failed.'),
            });
        });
      });
  }

  confirmDelete(p: PersonaResponse): void {
    const ws = this.workspaceId();
    if (!ws) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete persona?',
        message: `Delete “${p.name}”? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.api.deletePersona(ws, p.id).subscribe({
        next: () => {
          this.notify.success('Persona deleted.');
          this.reload();
        },
        error: () => this.notify.error('Could not delete persona.'),
      });
    });
  }
}
