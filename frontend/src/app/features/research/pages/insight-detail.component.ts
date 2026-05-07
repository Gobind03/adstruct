import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { CrossModuleLinkChipComponent } from '../components/cross-module-link-chip.component';
import { EvidencePanelComponent } from '../components/evidence-panel.component';
import { StatusChipComponent } from '../components/status-chip.component';
import {
  EvidenceCreateRequest,
  EvidenceResponse,
  InsightResponse,
  ResearchLinkResponse,
  SnapshotResponse,
} from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';

// ────────────────────────────────────────────────
// Add evidence dialog
// ────────────────────────────────────────────────
@Component({
  selector: 'app-add-evidence-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatSelectModule, MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="dlg-ico">link</mat-icon> Add Evidence
    </h2>
    <mat-dialog-content class="dlg">
      <p class="dlg-help">
        Evidence links this insight to a <strong>snapshot</strong> — a frozen capture of source content.
        Each evidence citation proves one claim. You can optionally include a quote or URL for context.
      </p>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Select snapshot</mat-label>
        <mat-select [(ngModel)]="snapshotId" name="sid" required>
          @for (s of snapshots; track s.id) {
            <mat-option [value]="s.id">
              {{ s.title || 'Untitled' }} ({{ s.snapshotType }}, {{ s.capturedAt | date: 'shortDate' }})
            </mat-option>
          }
        </mat-select>
        <mat-hint>Choose the snapshot that supports this insight</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Citation text (optional)</mat-label>
        <textarea matInput rows="3" [(ngModel)]="citationText" name="ct"
          placeholder="Paste the relevant quote or excerpt from the snapshot..."></textarea>
        <mat-hint>The specific passage or data point that supports this insight</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full">
        <mat-label>Citation URL (optional)</mat-label>
        <input matInput [(ngModel)]="citationUrl" name="cu"
          placeholder="https://example.com/original-source" />
        <mat-hint>A link to the original content for reference</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancel</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!snapshotId" (click)="save()"
        matTooltip="Attach this snapshot as evidence">
        <mat-icon>link</mat-icon> Add Evidence
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dlg { min-width: 440px; padding-top: 4px; display: flex; flex-direction: column; gap: 4px; }
    .dlg-ico { vertical-align: middle; margin-right: 6px; color: #1976d2; }
    .dlg-help { color: #616161; font-size: 13px; margin: 0 0 12px; line-height: 1.55; }
    .dlg-help strong { color: #333; }
    .full { width: 100%; }
  `],
})
export class AddEvidenceDialogComponent {
  readonly ref = inject(MatDialogRef<AddEvidenceDialogComponent, EvidenceCreateRequest | undefined>);
  readonly snapshots = inject<SnapshotResponse[]>(MAT_DIALOG_DATA);
  snapshotId = '';
  citationText = '';
  citationUrl = '';

  save(): void {
    this.ref.close({
      snapshotId: this.snapshotId,
      citationText: this.citationText.trim() || undefined,
      citationUrl: this.citationUrl.trim() || undefined,
    });
  }
}

// ────────────────────────────────────────────────
// Insight detail page
// ────────────────────────────────────────────────
@Component({
  selector: 'app-insight-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    CrossModuleLinkChipComponent, EvidencePanelComponent, StatusChipComponent,
    MatButtonModule, MatCardModule, MatChipsModule, MatDialogModule,
    MatIconModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon>workspaces</mat-icon>
          <p>Select a workspace from the sidebar.</p>
        </mat-card>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (!insight()) {
        <mat-card class="callout callout-warn">
          <mat-icon>error_outline</mat-icon>
          <div>
            <strong>Insight not found</strong>
            <p>It may have been deleted. <a routerLink="/research/insights">Back to insights</a></p>
          </div>
        </mat-card>
      } @else {

        <!-- Breadcrumb -->
        <nav class="breadcrumb">
          <a routerLink="/research/overview">Research</a>
          <mat-icon class="bc-sep">chevron_right</mat-icon>
          <a routerLink="/research/insights">Insights</a>
          <mat-icon class="bc-sep">chevron_right</mat-icon>
          <span>{{ insight()!.title }}</span>
        </nav>

        <!-- Info card -->
        <mat-card class="info-card">
          <div class="info-header">
            <div class="info-left">
              <div class="info-title-row">
                <mat-icon class="info-ico">lightbulb</mat-icon>
                <h1>{{ insight()!.title }}</h1>
              </div>
              <div class="chips-row">
                <app-status-chip type="insight" [status]="insight()!.status" />
                <app-status-chip type="confidence" [status]="insight()!.confidence" />
                <mat-chip-option disabled selected class="meta-chip"
                  matTooltip="Research area">{{ formatLabel(insight()!.category) }}</mat-chip-option>
                <mat-chip-option disabled selected class="meta-chip"
                  matTooltip="Specific finding type">{{ formatLabel(insight()!.insightType) }}</mat-chip-option>
              </div>
              @if (insight()!.summary) {
                <p class="summary-text">{{ insight()!.summary }}</p>
              }
              @if (insight()!.competitorId) {
                <p class="comp-row">
                  <mat-icon class="tiny-ico">business</mat-icon>
                  Linked to competitor:
                  <a [routerLink]="['/research/competitors', insight()!.competitorId!]">View competitor</a>
                </p>
              }
            </div>
            <div class="info-stats">
              <div class="mini-stat" [class.warn-stat]="insight()!.evidenceCount === 0"
                matTooltip="Snapshot citations attached to this insight">
                <strong>{{ insight()!.evidenceCount }}</strong>
                <span>Evidence</span>
              </div>
            </div>
          </div>
          <p class="info-meta">Created {{ insight()!.createdAt | date: 'medium' }}</p>
        </mat-card>

        <!-- Status-specific banners -->
        @if (insight()!.status === 'DRAFT' && insight()!.evidenceCount === 0) {
          <mat-card class="callout callout-action">
            <mat-icon class="callout-ico">pending_actions</mat-icon>
            <div>
              <strong>This insight is a Draft without evidence</strong>
              <p>
                Add at least one evidence citation below (link to a snapshot) to unlock the
                <strong>Publish</strong> button. Evidence ensures every published finding is
                backed by real data — no unsubstantiated claims.
              </p>
            </div>
          </mat-card>
        } @else if (insight()!.status === 'DRAFT' && insight()!.evidenceCount > 0) {
          <mat-card class="callout callout-ready">
            <mat-icon class="callout-ico">check_circle_outline</mat-icon>
            <div>
              <strong>Ready to publish</strong>
              <p>
                This draft has {{ insight()!.evidenceCount }} evidence citation{{ insight()!.evidenceCount > 1 ? 's' : '' }}.
                Click <strong>Publish</strong> below when you're satisfied with the finding.
              </p>
            </div>
          </mat-card>
        } @else if (insight()!.status === 'PUBLISHED') {
          <mat-card class="callout callout-published">
            <mat-icon class="callout-ico">verified</mat-icon>
            <div>
              <strong>Published</strong>
              <p>
                This insight is verified and published. You can still add more evidence or
                <a routerLink="/research/links">create cross-module links</a>
                to connect it to campaigns and strategy.
              </p>
            </div>
          </mat-card>
        }

        <!-- Guide section -->
        <mat-card class="guide-card">
          <mat-icon class="guide-ico">help_outline</mat-icon>
          <div>
            <strong>About this insight</strong>
            <p>
              An insight is a structured research finding. The lifecycle is:
              <strong>Draft</strong> → add <strong>Evidence</strong> (snapshot citations) → <strong>Publish</strong>.
            </p>
            <ul>
              <li>
                <strong>Evidence</strong> = a reference to a
                <a routerLink="/research/sources">snapshot</a> that proves this claim.
                You can include a quote and URL for context.
              </li>
              <li>
                <strong>Publish</strong> is disabled until at least one evidence item is attached.
                This enforces the provenance rule.
              </li>
              <li>
                <strong>Archive</strong> moves the insight to historical status. It stays searchable
                but won't appear in active reports.
              </li>
              <li>
                <strong>Cross-module links</strong> let you connect this insight to campaigns,
                governance templates, or rulesets via the
                <a routerLink="/research/links">Links page</a>.
              </li>
            </ul>
          </div>
        </mat-card>

        <!-- Evidence section -->
        <mat-card class="section-card evidence-section">
          <div class="sec-head">
            <h2><mat-icon class="sec-ico">link</mat-icon> Evidence Citations</h2>
            <p class="sec-desc">
              Each citation links to a snapshot that supports this finding.
              @if (insight()!.status === 'DRAFT') {
                Add at least one to enable publishing.
              }
            </p>
          </div>
          <app-evidence-panel
            [evidence]="evidence()"
            [canEdit]="true"
            (addEvidence)="openAddEvidence()"
            (deleteEvidence)="onDeleteEvidence($event)"
          />
          @if (evidence().length === 0) {
            <div class="evidence-hint">
              <mat-icon class="hint-ico">tips_and_updates</mat-icon>
              <span>
                Click "Add Evidence" above and select a snapshot from your workspace.
                Don't have snapshots yet?
                <a routerLink="/research/sources">Ingest a source</a> first.
              </span>
            </div>
          }
        </mat-card>

        <!-- Cross-module links -->
        @if (links().length) {
          <mat-card class="section-card">
            <div class="sec-head">
              <h2><mat-icon class="sec-ico">link</mat-icon> Cross-Module Links</h2>
              <p class="sec-desc">
                This insight is connected to other entities in the platform.
                Manage links on the <a routerLink="/research/links">Links page</a>.
              </p>
            </div>
            <div class="links-row">
              @for (l of links(); track l.id) {
                <app-cross-module-link-chip
                  [linkedEntityType]="l.linkedEntityType"
                  [linkedEntityId]="l.linkedEntityId"
                  [label]="l.linkedEntityType + ' · ' + l.relationType"
                />
              }
            </div>
          </mat-card>
        }

        <!-- Actions -->
        <mat-card class="section-card actions-card">
          <div class="sec-head">
            <h2><mat-icon class="sec-ico">settings</mat-icon> Actions</h2>
          </div>
          <div class="footer-actions">
            @if (insight()!.status === 'DRAFT') {
              <button mat-flat-button color="primary" type="button"
                [disabled]="insight()!.evidenceCount === 0"
                (click)="publish()"
                [matTooltip]="insight()!.evidenceCount === 0
                  ? 'Add at least one evidence citation above before publishing'
                  : 'Mark this insight as verified and published'"
                matTooltipPosition="above">
                <mat-icon>verified</mat-icon> Publish
              </button>
            }
            @if (insight()!.status !== 'ARCHIVED') {
              <button mat-stroked-button type="button" (click)="archive()"
                matTooltip="Move to archived status — still searchable but hidden from active reports">
                <mat-icon>archive</mat-icon> Archive
              </button>
            }
            <a mat-stroked-button routerLink="/research/links"
              matTooltip="Connect this insight to campaigns, templates, or rulesets">
              <mat-icon>link</mat-icon> Create Link
            </a>
          </div>
        </mat-card>

        <!-- Related pages -->
        <mat-card class="section-card">
          <div class="sec-head">
            <h2><mat-icon class="sec-ico">near_me</mat-icon> Related Pages</h2>
          </div>
          <div class="related-grid">
            <a routerLink="/research/insights" class="related-item"
              matTooltip="Back to the full list of insights">
              <mat-icon>lightbulb</mat-icon>
              <div><strong>All Insights</strong><span>Browse and filter all findings</span></div>
            </a>
            <a routerLink="/research/sources" class="related-item"
              matTooltip="View sources and snapshots you can cite as evidence">
              <mat-icon>add_link</mat-icon>
              <div><strong>Sources</strong><span>Find snapshots to cite</span></div>
            </a>
            <a routerLink="/research/competitors" class="related-item"
              matTooltip="Run AI Extract on competitor snapshots to auto-generate insights">
              <mat-icon>business</mat-icon>
              <div><strong>Competitors</strong><span>AI Extract insights</span></div>
            </a>
            <a routerLink="/research/links" class="related-item"
              matTooltip="Connect insights to campaigns, templates, and rulesets">
              <mat-icon>link</mat-icon>
              <div><strong>Cross-Module Links</strong><span>Connect to campaigns</span></div>
            </a>
          </div>
        </mat-card>

      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 48px; max-width: 960px; margin: 0 auto; }

    /* Breadcrumb */
    .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 13px; margin-bottom: 12px; flex-wrap: wrap; }
    .breadcrumb a { color: #1976d2; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .breadcrumb span { color: #666; }
    .bc-sep { font-size: 16px; width: 16px; height: 16px; color: #999; }

    /* Callout */
    .callout { display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px !important; margin-bottom: 16px; border-left: 4px solid; }
    .callout p { margin: 4px 0 0; font-size: 13px; color: #555; line-height: 1.5; }
    .callout a { color: #1976d2; text-decoration: none; }
    .callout a:hover { text-decoration: underline; }
    .callout-ico { margin-top: 2px; flex-shrink: 0; }
    .callout-warn { border-color: #ffa726; background: #fff8e1; }
    .callout-warn .callout-ico { color: #f57c00; }
    .callout-action { border-color: #42a5f5; background: #e3f2fd; }
    .callout-action .callout-ico { color: #1565c0; }
    .callout-ready { border-color: #66bb6a; background: #e8f5e9; }
    .callout-ready .callout-ico { color: #2e7d32; }
    .callout-published { border-color: #2e7d32; background: #e8f5e9; }
    .callout-published .callout-ico { color: #2e7d32; }
    .centered { display: flex; justify-content: center; padding: 48px; }

    /* Info card */
    .info-card { padding: 20px 24px; margin-bottom: 16px; }
    .info-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .info-left { flex: 1; min-width: 0; }
    .info-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
    .info-ico { font-size: 28px; width: 28px; height: 28px; color: #f9a825; }
    h1 { margin: 0; font-size: 22px; font-weight: 600; color: #1a1a2e; }
    .chips-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .meta-chip { font-size: 11px !important; }
    .summary-text { font-size: 14px; line-height: 1.55; color: #444; margin: 0 0 8px; }
    .comp-row { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #555; margin: 4px 0 0; }
    .comp-row a { color: #1976d2; text-decoration: none; font-weight: 500; }
    .comp-row a:hover { text-decoration: underline; }
    .tiny-ico { font-size: 14px; width: 14px; height: 14px; color: #999; }
    .info-stats { display: flex; gap: 16px; }
    .mini-stat { text-align: center; min-width: 64px; cursor: default; }
    .mini-stat strong { display: block; font-size: 22px; font-weight: 600; color: #1976d2; }
    .mini-stat span { font-size: 11px; color: #888; }
    .warn-stat strong { color: #f57c00; }
    .info-meta { margin: 10px 0 0; font-size: 12px; color: #999; }

    /* Guide */
    .guide-card {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px 20px !important; margin-bottom: 16px;
      background: #f5f5f5; border: 1px solid #e0e0e0;
    }
    .guide-ico { color: #1976d2; margin-top: 2px; flex-shrink: 0; }
    .guide-card strong { font-size: 14px; }
    .guide-card p { margin: 4px 0 6px; font-size: 13px; color: #555; line-height: 1.5; }
    .guide-card ul { margin: 0; padding-left: 18px; font-size: 13px; color: #555; line-height: 1.7; }
    .guide-card a { color: #1976d2; text-decoration: none; }
    .guide-card a:hover { text-decoration: underline; }

    /* Sections */
    .section-card { padding: 20px 24px; margin-bottom: 16px; }
    .sec-head { margin-bottom: 14px; }
    h2 { margin: 0 0 4px; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .sec-ico { font-size: 20px; width: 20px; height: 20px; color: #1976d2; }
    .sec-desc { margin: 0; font-size: 13px; color: #666; line-height: 1.5; }
    .sec-desc a { color: #1976d2; text-decoration: none; }

    /* Evidence section */
    .evidence-section { border-left: 3px solid #42a5f5; }
    .evidence-hint {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 14px; background: #fffde7; border-radius: 8px; margin-top: 12px;
    }
    .hint-ico { font-size: 18px; width: 18px; height: 18px; color: #f9a825; flex-shrink: 0; margin-top: 1px; }
    .evidence-hint span { font-size: 12px; color: #5d4037; line-height: 1.5; }
    .evidence-hint a { color: #1976d2; text-decoration: none; }

    /* Links row */
    .links-row { display: flex; flex-wrap: wrap; gap: 8px; }

    /* Actions */
    .actions-card { background: #fafafa; }
    .footer-actions { display: flex; gap: 12px; flex-wrap: wrap; }

    /* Related grid */
    .related-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; }
    .related-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 14px; background: #fafafa; border-radius: 8px; border: 1px solid #eee;
      text-decoration: none; color: inherit; transition: border-color 0.15s;
    }
    .related-item:hover { border-color: #1976d2; }
    .related-item mat-icon { color: #546e7a; margin-top: 2px; flex-shrink: 0; }
    .related-item strong { display: block; font-size: 13px; color: #333; }
    .related-item span { font-size: 11px; color: #888; line-height: 1.4; }
  `],
})
export class InsightDetailComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);

  readonly insightId = toSignal(this.route.paramMap.pipe(map(p => p.get('insightId') ?? '')), { initialValue: '' });
  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  readonly loading = signal(false);
  readonly insight = signal<InsightResponse | null>(null);
  readonly evidence = signal<EvidenceResponse[]>([]);
  readonly links = signal<ResearchLinkResponse[]>([]);
  readonly snapshots = signal<SnapshotResponse[]>([]);

  ngOnInit(): void { this.reload(); }

  reload(): void {
    const ws = this.workspaceId();
    const id = this.insightId();
    if (!ws || !id) { this.insight.set(null); return; }
    this.loading.set(true);
    this.api.getInsight(ws, id).subscribe({
      next: ins => {
        this.insight.set(ins);
        this.api.listEvidence(ws, id).subscribe({
          next: ev => this.evidence.set(ev),
          error: () => this.evidence.set([]),
        });
        this.api.listLinks(ws, { researchEntityType: 'INSIGHT', researchEntityId: id }).subscribe({
          next: l => this.links.set(l),
          error: () => this.links.set([]),
        });
        this.api.listSnapshots(ws).subscribe({
          next: sn => { this.snapshots.set(sn); this.loading.set(false); },
          error: () => { this.snapshots.set([]); this.loading.set(false); },
        });
      },
      error: () => { this.loading.set(false); this.insight.set(null); this.notify.error('Could not load insight.'); },
    });
  }

  openAddEvidence(): void {
    const ws = this.workspaceId();
    const ins = this.insight();
    if (!ws || !ins) return;
    const snaps = this.snapshots();
    if (!snaps.length) {
      this.notify.error('No snapshots available in this workspace. Ingest a source first.');
      return;
    }
    const ref = this.dialog.open(AddEvidenceDialogComponent, { width: '500px', data: snaps });
    ref.afterClosed().subscribe((req: EvidenceCreateRequest | undefined) => {
      if (!req) return;
      this.api.addEvidence(ws, ins.id, req).subscribe({
        next: () => { this.notify.success('Evidence added. You can now publish this insight.'); this.reload(); },
        error: () => this.notify.error('Could not add evidence. The snapshot may already be cited.'),
      });
    });
  }

  onDeleteEvidence(evidenceId: string): void {
    const ws = this.workspaceId();
    const ins = this.insight();
    if (!ws || !ins) return;
    if (!window.confirm('Remove this evidence citation? The insight may become unpublishable if no evidence remains.')) return;
    this.api.removeEvidence(ws, ins.id, evidenceId).subscribe({
      next: () => { this.notify.success('Evidence removed.'); this.reload(); },
      error: () => this.notify.error('Could not remove evidence.'),
    });
  }

  publish(): void {
    const ws = this.workspaceId();
    const ins = this.insight();
    if (!ws || !ins || ins.evidenceCount === 0) return;
    this.api.publishInsight(ws, ins.id).subscribe({
      next: updated => { this.insight.set(updated); this.notify.success('Insight published — it is now verified and visible.'); },
      error: () => this.notify.error('Publish failed.'),
    });
  }

  archive(): void {
    const ws = this.workspaceId();
    const ins = this.insight();
    if (!ws || !ins) return;
    if (!window.confirm('Archive this insight? It will be hidden from active views but remains searchable.')) return;
    this.api.archiveInsight(ws, ins.id).subscribe({
      next: updated => { this.insight.set(updated); this.notify.success('Insight archived.'); },
      error: () => this.notify.error('Archive failed.'),
    });
  }

  formatLabel(v: string): string {
    return v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
