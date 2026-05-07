import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, of, Subject, takeUntil } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '@env/environment';
import { TeamsApiService } from '../services/teams-api.service';
import { MembersApiService } from '../services/members-api.service';
import { WorkspaceApiService } from '../services/workspace-api.service';
import { AdminStore } from '../store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { MemberDetail } from '../models/admin.models';
import { Team, TeamMember } from '../models/admin.models';

export interface TeamFormDialogData {
  orgId: string;
  workspaces: { id: string; name: string }[];
  team?: Team;
}

@Component({
  selector: 'app-team-form-dialog',
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
    <h2 mat-dialog-title>{{ data.team ? 'Edit team' : 'Create team' }}</h2>
    <mat-dialog-content [attr.data-api-url]="envApi">
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Name</mat-label>
          <input matInput formControlName="name" />
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
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Cancel</button>
      <button mat-raised-button color="primary" type="button" (click)="submit()" [disabled]="form.invalid || saving">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; } mat-form-field { margin-bottom: 8px; }`],
})
export class TeamFormDialogComponent implements OnInit {
  readonly envApi = environment.apiUrl;

  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<TeamFormDialogComponent>);
  private teamsApi = inject(TeamsApiService);
  private notify = inject(NotificationService);
  data = inject(MAT_DIALOG_DATA) as TeamFormDialogData;

  form = this.fb.group({
    name: ['', Validators.required],
    workspaceId: [''],
  });
  saving = false;

  ngOnInit(): void {
    if (this.data.team) {
      this.form.patchValue({
        name: this.data.team.name,
        workspaceId: this.data.team.workspaceId ?? '',
      });
      this.form.get('workspaceId')?.disable();
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const { orgId, team } = this.data;
    const name = this.form.value.name!;
    const workspaceId = this.form.value.workspaceId || undefined;
    this.saving = true;
    if (team) {
      this.teamsApi.update(orgId, team.id, name).subscribe({
        next: (t) => {
          this.notify.success('Team updated');
          this.dialogRef.close(t);
        },
        error: (err) => {
          this.saving = false;
          this.notify.error(err.error?.detail || 'Update failed');
        },
      });
    } else {
      this.teamsApi.create(orgId, { name, workspaceId }).subscribe({
        next: (t) => {
          this.notify.success('Team created');
          this.dialogRef.close(t);
        },
        error: (err) => {
          this.saving = false;
          this.notify.error(err.error?.detail || 'Create failed');
        },
      });
    }
  }
}

@Component({
  selector: 'app-teams',
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
    MatAutocompleteModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2>Teams</h2>
    <mat-card [attr.data-api-url]="envApi">
      <mat-card-content>
        @if (!orgId()) {
          <p class="empty-state">Select an organization to view teams.</p>
        } @else {
          <div class="filters">
            <mat-form-field appearance="outline" class="filter-field">
              <mat-label>Workspace</mat-label>
              <mat-select [formControl]="workspaceFilter">
                <mat-option value="">All</mat-option>
                @for (w of workspaceOptions(); track w.id) {
                  <mat-option [value]="w.id">{{ w.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button mat-raised-button color="primary" type="button" (click)="openCreate()">
              <mat-icon>add</mat-icon>
              Create team
            </button>
          </div>

          @if (loading()) {
            <div class="spinner-wrap">
              <mat-spinner diameter="40"></mat-spinner>
            </div>
          } @else if (teams().length === 0) {
            <p class="empty-state">No teams yet.</p>
          } @else {
            <table mat-table [dataSource]="teams()" class="full-width team-table">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let row">
                  <button mat-button type="button" class="linkish" (click)="selectTeam(row)">
                    {{ row.name }}
                  </button>
                </td>
              </ng-container>
              <ng-container matColumnDef="workspace">
                <th mat-header-cell *matHeaderCellDef>Workspace</th>
                <td mat-cell *matCellDef="let row">{{ workspaceLabel(row.workspaceId) }}</td>
              </ng-container>
              <ng-container matColumnDef="members">
                <th mat-header-cell *matHeaderCellDef>Members</th>
                <td mat-cell *matCellDef="let row">{{ row.members?.length ?? 0 }}</td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button type="button" (click)="openEdit(row); $event.stopPropagation()">
                    <mat-icon>edit</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="teamColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: teamColumns;"></tr>
            </table>
          }

          @if (selectedTeam()) {
            <div class="detail-block">
              <div class="detail-head">
                <h3>{{ selectedTeam()!.name }}</h3>
                <button mat-button type="button" (click)="clearSelection()">Close</button>
              </div>
              <p class="muted">Members</p>
              @if (teamDetailLoading()) {
                <mat-spinner diameter="32"></mat-spinner>
              } @else if ((selectedTeam()!.members || []).length === 0) {
                <p class="empty-inline">No members in this team.</p>
              } @else {
                <table mat-table [dataSource]="selectedTeam()!.members" class="full-width">
                  <ng-container matColumnDef="fullName">
                    <th mat-header-cell *matHeaderCellDef>Name</th>
                    <td mat-cell *matCellDef="let m">{{ m.fullName }}</td>
                  </ng-container>
                  <ng-container matColumnDef="email">
                    <th mat-header-cell *matHeaderCellDef>Email</th>
                    <td mat-cell *matCellDef="let m">{{ m.email }}</td>
                  </ng-container>
                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef></th>
                    <td mat-cell *matCellDef="let m">
                      <button mat-icon-button type="button" color="warn" (click)="removeMember(m)">
                        <mat-icon>remove_circle_outline</mat-icon>
                      </button>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="memberColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: memberColumns;"></tr>
                </table>
              }

              <div class="add-member">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Add member (search)</mat-label>
                  <input
                    matInput
                    [formControl]="memberSearch"
                    [matAutocomplete]="auto"
                    placeholder="Type name or email"
                  />
                  <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onMemberPick($event)">
                    @for (opt of memberSuggestions(); track opt.userId) {
                      <mat-option [value]="opt.userId">{{ opt.fullName }} ({{ opt.email }})</mat-option>
                    }
                  </mat-autocomplete>
                </mat-form-field>
              </div>
            </div>
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
    h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
    .full-width { width: 100%; }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: flex-start;
      margin-bottom: 16px;
    }
    .filter-field { width: 220px; }
    .spinner-wrap {
      display: flex;
      justify-content: center;
      padding: 48px;
    }
    .empty-state, .empty-inline {
      color: var(--text-muted);
      font-size: 15px;
    }
    .empty-state { text-align: center; padding: 48px 24px; }
    .team-table { margin-bottom: 24px; }
    .linkish { font-weight: 500; }
    .detail-block {
      margin-top: 8px;
      padding-top: 16px;
      border-top: 1px solid var(--border-default);
    }
    .detail-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .muted { color: var(--text-muted); font-size: 13px; margin: 0 0 8px; }
    .add-member { margin-top: 16px; max-width: 480px; }
  `],
})
export class TeamsComponent implements OnInit, OnDestroy {
  private teamsApi = inject(TeamsApiService);
  private membersApi = inject(MembersApiService);
  private workspaceApi = inject(WorkspaceApiService);
  private adminStore = inject(AdminStore);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);

  private destroy$ = new Subject<void>();

  readonly loading = signal(false);
  readonly teamDetailLoading = signal(false);
  readonly teams = signal<Team[]>([]);
  readonly workspaceOptions = signal<{ id: string; name: string }[]>([]);
  readonly selectedTeam = signal<Team | null>(null);
  readonly memberSuggestions = signal<MemberDetail[]>([]);

  readonly teamColumns = ['name', 'workspace', 'members', 'actions'];
  readonly memberColumns = ['fullName', 'email', 'actions'];
  readonly envApi = environment.apiUrl;

  workspaceFilter = new FormControl<string>('', { nonNullable: true });
  memberSearch = new FormControl<string>('', { nonNullable: true });

  orgId = this.adminStore.selectedOrgId;

  private workspaceNameMap = new Map<string, string>();

  ngOnInit(): void {
    this.loadWorkspaces();
    this.workspaceFilter.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadTeams());

    this.memberSearch.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((q) => {
          const org = this.adminStore.selectedOrgId();
          if (!org || !q || q.length < 2) return of([] as MemberDetail[]);
          return this.membersApi.list(org, undefined, undefined, undefined, q);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((list) => this.memberSuggestions.set(list));

    this.loadTeams();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadWorkspaces(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) {
      this.workspaceOptions.set([]);
      this.workspaceNameMap.clear();
      return;
    }
    this.workspaceApi.list(id).subscribe({
      next: (list) => {
        this.workspaceOptions.set(list.map((w) => ({ id: w.id, name: w.name })));
        this.workspaceNameMap = new Map(list.map((w) => [w.id, w.name]));
      },
      error: () => {
        this.workspaceOptions.set([]);
        this.workspaceNameMap.clear();
      },
    });
  }

  loadTeams(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) {
      this.teams.set([]);
      return;
    }
    this.loading.set(true);
    const ws = this.workspaceFilter.value || undefined;
    this.teamsApi.list(id, ws).subscribe({
      next: (rows) => {
        this.teams.set(rows);
        this.loading.set(false);
        const sel = this.selectedTeam();
        if (sel) {
          const updated = rows.find((t) => t.id === sel.id);
          if (updated) this.refreshTeamDetail(updated.id);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.notify.error(err.error?.detail || 'Failed to load teams');
      },
    });
  }

  workspaceLabel(workspaceId: string | null): string {
    if (!workspaceId) return 'Organization';
    return this.workspaceNameMap.get(workspaceId) ?? workspaceId;
  }

  selectTeam(team: Team): void {
    this.selectedTeam.set(team);
    this.refreshTeamDetail(team.id);
  }

  refreshTeamDetail(teamId: string): void {
    const orgId = this.adminStore.selectedOrgId();
    if (!orgId) return;
    this.teamDetailLoading.set(true);
    this.teamsApi.get(orgId, teamId).subscribe({
      next: (t) => {
        this.selectedTeam.set(t);
        this.teamDetailLoading.set(false);
      },
      error: (err) => {
        this.teamDetailLoading.set(false);
        this.notify.error(err.error?.detail || 'Failed to load team');
      },
    });
  }

  clearSelection(): void {
    this.selectedTeam.set(null);
    this.memberSearch.setValue('');
    this.memberSuggestions.set([]);
  }

  openCreate(): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    const ref = this.dialog.open(TeamFormDialogComponent, {
      width: '440px',
      data: {
        orgId: id,
        workspaces: this.workspaceOptions(),
      } satisfies TeamFormDialogData,
    });
    ref.afterClosed().subscribe((t) => {
      if (t) this.loadTeams();
    });
  }

  openEdit(team: Team): void {
    const id = this.adminStore.selectedOrgId();
    if (!id) return;
    const ref = this.dialog.open(TeamFormDialogComponent, {
      width: '440px',
      data: {
        orgId: id,
        workspaces: this.workspaceOptions(),
        team,
      } satisfies TeamFormDialogData,
    });
    ref.afterClosed().subscribe((t) => {
      if (t) this.loadTeams();
    });
  }

  onMemberPick(ev: MatAutocompleteSelectedEvent): void {
    const userId = ev.option.value as string;
    const team = this.selectedTeam();
    const orgId = this.adminStore.selectedOrgId();
    if (!team || !orgId) return;
    this.teamsApi.addMember(orgId, team.id, userId).subscribe({
      next: () => {
        this.notify.success('Member added to team');
        this.memberSearch.setValue('');
        this.memberSuggestions.set([]);
        this.refreshTeamDetail(team.id);
        this.loadTeams();
      },
      error: (err) => this.notify.error(err.error?.detail || 'Could not add member'),
    });
  }

  removeMember(m: TeamMember): void {
    const team = this.selectedTeam();
    const orgId = this.adminStore.selectedOrgId();
    if (!team || !orgId) return;
    this.teamsApi.removeMember(orgId, team.id, m.userId).subscribe({
      next: () => {
        this.notify.success('Removed from team');
        this.refreshTeamDetail(team.id);
        this.loadTeams();
      },
      error: (err) => this.notify.error(err.error?.detail || 'Remove failed'),
    });
  }
}
