import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { ResearchEmptyStateComponent } from '../components/research-empty-state.component';
import { StatusChipComponent } from '../components/status-chip.component';
import {
  CONFIDENCE_LEVELS,
  INSIGHT_TYPES,
  InsightCreateRequest,
  InsightResponse,
  RESEARCH_CATEGORIES,
  INSIGHT_STATUSES,
} from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';

// ────────────────────────────────────────────────
// Create insight dialog
// ────────────────────────────────────────────────
@Component({
  selector: 'app-create-insight-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatSelectModule, MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="dlg-ico">lightbulb</mat-icon> Create Insight
    </h2>
    <mat-dialog-content class="dlg">
      <p class="dlg-help">
        An insight is a structured finding about your market — a competitor's pricing move, an audience
        pain point, a trending topic, etc. It starts as a <strong>Draft</strong> and can only be
        <strong>Published</strong> once you attach at least one evidence citation (a link to a snapshot).
      </p>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Category</mat-label>
        <mat-select [(ngModel)]="category" name="cat" required (ngModelChange)="onCategoryChange()">
          @for (c of categories; track c) {
            <mat-option [value]="c">{{ formatLabel(c) }}</mat-option>
          }
        </mat-select>
        <mat-hint>Research area</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Insight type</mat-label>
        <mat-select [(ngModel)]="insightType" name="it" required>
          @for (t of visibleTypes; track t) {
            <mat-option [value]="t">{{ formatLabel(t) }}</mat-option>
          }
        </mat-select>
        <mat-hint>Specific kind of finding</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Title</mat-label>
        <input matInput [(ngModel)]="title" name="ti" required
          placeholder="e.g. Acme Corp launched a new $49/mo starter plan" />
        <mat-hint>A concise headline</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Summary (optional)</mat-label>
        <textarea matInput rows="3" [(ngModel)]="summary" name="su"
          placeholder="What did you find and why does it matter?"></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Confidence</mat-label>
        <mat-select [(ngModel)]="confidence" name="cf">
          @for (c of confidenceLevels; track c) {
            <mat-option [value]="c">{{ c }}</mat-option>
          }
        </mat-select>
        <mat-hint>How confident are you?</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancel</button>
      <button mat-flat-button color="primary" type="button"
        [disabled]="!category || !insightType || !title.trim()" (click)="save()">
        <mat-icon>add_circle_outline</mat-icon> Create Draft
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dlg { min-width: 460px; padding-top: 4px; display: flex; flex-direction: column; }
    .dlg-ico { vertical-align: middle; margin-right: 6px; color: #f9a825; }
    .dlg-help { color: #616161; font-size: 13px; margin: 0 0 16px; line-height: 1.55; }
    .dlg-help strong { color: #333; }
    .field { width: 100%; margin-bottom: 8px; }
  `],
})
export class CreateInsightDialogComponent {
  readonly ref = inject(MatDialogRef<CreateInsightDialogComponent, InsightCreateRequest | undefined>);
  readonly categories = [...RESEARCH_CATEGORIES];
  readonly allTypes = [...INSIGHT_TYPES];
  readonly confidenceLevels = [...CONFIDENCE_LEVELS];

  category: string = RESEARCH_CATEGORIES[0];
  insightType = '';
  visibleTypes: string[] = [];
  title = '';
  summary = '';
  confidence = 'MEDIUM';

  constructor() {
    this.refreshTypes();
  }

  onCategoryChange(): void {
    this.refreshTypes();
  }

  private refreshTypes(): void {
    const prefix = this.category?.toLowerCase();
    if (!prefix) {
      this.visibleTypes = [...this.allTypes];
    } else {
      const matches = this.allTypes.filter(t => t.toLowerCase().startsWith(prefix));
      this.visibleTypes = matches.length ? matches : [...this.allTypes];
    }
    if (!this.visibleTypes.includes(this.insightType)) {
      this.insightType = this.visibleTypes[0] ?? '';
    }
  }

  save(): void {
    this.ref.close({
      category: this.category,
      insightType: this.insightType,
      title: this.title.trim(),
      summary: this.summary.trim() || undefined,
      confidence: this.confidence,
    });
  }

  formatLabel(v: string): string {
    return v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

// ────────────────────────────────────────────────
// Insights list page
// ────────────────────────────────────────────────
@Component({
  selector: 'app-insights-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    ResearchEmptyStateComponent, StatusChipComponent,
    MatButtonModule, MatCardModule, MatChipsModule, MatDialogModule,
    MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule, MatTableModule, MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">

      <!-- Header -->
      <header class="header">
        <div class="header-text">
          <nav class="breadcrumb">
            <a routerLink="/research/overview">Research</a>
            <mat-icon class="bc-sep">chevron_right</mat-icon>
            <span>Insights</span>
          </nav>
          <h1>Insights</h1>
          <p class="subtitle">
            Insights are the structured findings of your research — a competitor pricing change,
            an audience pain point, a trending topic. Each insight has a <strong>category</strong>,
            <strong>type</strong>, <strong>confidence level</strong>, and most importantly,
            <strong>evidence</strong> — citations linking back to
            <a routerLink="/research/sources">snapshots</a> that prove the claim.
          </p>
        </div>
        <button mat-flat-button color="primary" type="button" (click)="openCreate()"
          matTooltip="Create a new manual insight as a Draft — you'll add evidence afterwards">
          <mat-icon>add_circle_outline</mat-icon> Create Insight
        </button>
      </header>

      <!-- Guide card -->
      <mat-card class="guide-card">
        <mat-icon class="guide-ico">help_outline</mat-icon>
        <div>
          <strong>How insights work</strong>
          <div class="guide-flow">
            <div class="flow-step">
              <div class="flow-circle draft-circle"><mat-icon>edit_note</mat-icon></div>
              <strong>1. Draft</strong>
              <span>Create manually or via AI</span>
            </div>
            <mat-icon class="flow-arrow">arrow_forward</mat-icon>
            <div class="flow-step">
              <div class="flow-circle evidence-circle"><mat-icon>link</mat-icon></div>
              <strong>2. Add evidence</strong>
              <span>Cite snapshot(s) as proof</span>
            </div>
            <mat-icon class="flow-arrow">arrow_forward</mat-icon>
            <div class="flow-step">
              <div class="flow-circle publish-circle"><mat-icon>verified</mat-icon></div>
              <strong>3. Publish</strong>
              <span>Only with ≥ 1 evidence</span>
            </div>
            <mat-icon class="flow-arrow">arrow_forward</mat-icon>
            <div class="flow-step">
              <div class="flow-circle action-circle"><mat-icon>campaign</mat-icon></div>
              <strong>4. Act</strong>
              <span>Link to campaigns & strategy</span>
            </div>
          </div>
          <p class="guide-note">
            <strong>Two ways to create insights:</strong>
          </p>
          <ul class="guide-tips">
            <li>
              <strong>Manual</strong> — click "Create Insight" above, fill in the finding, then attach evidence on the detail page
            </li>
            <li>
              <strong>AI-generated</strong> — go to a
              <a routerLink="/research/competitors">Competitor's detail page</a>,
              select snapshots, and use <strong>AI Extract</strong>. AI creates draft insights
              with evidence citations pre-attached.
            </li>
          </ul>
          <p class="guide-note">
            <mat-icon class="tip-ico">tips_and_updates</mat-icon>
            <strong>Provenance rule:</strong> The Publish button stays disabled until at least
            one evidence citation is attached. This ensures every published insight is backed by real data.
          </p>
        </div>
      </mat-card>

      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon class="callout-ico">workspaces</mat-icon>
          <div>
            <strong>No workspace selected</strong>
            <p>Pick a workspace from the sidebar. Insights are scoped per workspace.</p>
          </div>
        </mat-card>
      } @else {
        <!-- Filter bar -->
        <mat-card class="filter-bar">
          <mat-icon class="filter-ico" matTooltip="Filter insights by status or category">filter_list</mat-icon>
          <mat-form-field appearance="outline" class="f">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="filterStatus" name="fs" (ngModelChange)="reload()">
              <mat-option value="">All statuses</mat-option>
              @for (s of statuses; track s) {
                <mat-option [value]="s">{{ s }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="f">
            <mat-label>Category</mat-label>
            <mat-select [(ngModel)]="filterCategory" name="fc" (ngModelChange)="reload()">
              <mat-option value="">All categories</mat-option>
              @for (c of categories; track c) {
                <mat-option [value]="c">{{ formatLabel(c) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </mat-card>

        <!-- Draft banner -->
        @if (draftWithoutEvidence() > 0) {
          <mat-card class="callout callout-action">
            <mat-icon class="callout-ico">pending_actions</mat-icon>
            <div>
              <strong>{{ draftWithoutEvidence() }} draft{{ draftWithoutEvidence() > 1 ? 's need' : ' needs' }} evidence before publishing</strong>
              <p>
                Click a draft below, then use "Add Evidence" to cite the snapshot(s)
                that support the finding. Without evidence, the Publish button stays disabled.
              </p>
            </div>
          </mat-card>
        }

        @if (loading()) {
          <div class="centered"><mat-spinner diameter="40" /></div>
        } @else if (!rows().length) {
          <app-research-empty-state
            icon="lightbulb"
            title="No insights yet"
            description="Create your first insight manually, or let AI generate them from competitor snapshots."
            actionLabel="Create Your First Insight"
            (action)="openCreate()"
          />
          <mat-card class="empty-examples">
            <strong>Ways to create insights</strong>
            <div class="example-grid">
              <div class="example-item">
                <mat-icon>edit_note</mat-icon>
                <div>
                  <strong>Create manually</strong>
                  <span>Write a finding yourself, categorize it, then attach evidence from your snapshots</span>
                </div>
              </div>
              <div class="example-item">
                <mat-icon>auto_awesome</mat-icon>
                <div>
                  <strong>AI Extract from competitor</strong>
                  <span>Go to a <a routerLink="/research/competitors">Competitor</a>, select snapshots, and use AI Extract to auto-generate draft insights with citations</span>
                </div>
              </div>
              <div class="example-item">
                <mat-icon>hub</mat-icon>
                <div>
                  <strong>Keyword clustering</strong>
                  <span>Go to <a routerLink="/research/keyword-clusters">Keywords</a> to cluster keywords by intent — each cluster can become an insight</span>
                </div>
              </div>
              <div class="example-item">
                <mat-icon>people</mat-icon>
                <div>
                  <strong>Persona drafting</strong>
                  <span>Go to <a routerLink="/research/personas">Personas</a> to build audience research backed by review/transcript snapshots</span>
                </div>
              </div>
            </div>
          </mat-card>
        } @else {
          <!-- Summary strip -->
          <div class="summary-strip">
            <div class="strip-stat" matTooltip="Total insights in this workspace (with current filters)">
              <strong>{{ rows().length }}</strong> insight{{ rows().length !== 1 ? 's' : '' }}
            </div>
            <div class="strip-stat draft-strip" matTooltip="Insights still in draft status">
              <mat-icon class="strip-ico">edit_note</mat-icon>
              {{ draftCount() }} draft{{ draftCount() !== 1 ? 's' : '' }}
            </div>
            <div class="strip-stat published-strip" matTooltip="Insights verified with evidence and published">
              <mat-icon class="strip-ico">verified</mat-icon>
              {{ publishedCount() }} published
            </div>
            <div class="strip-stat" matTooltip="Insights without any evidence citations attached">
              <mat-icon class="strip-ico warn-ico">warning_amber</mat-icon>
              {{ noEvidenceCount() }} without evidence
            </div>
          </div>

          <!-- Table -->
          <mat-card class="table-card">
            <p class="table-help">
              Click an insight to view its detail page — add evidence, publish, archive, or link to campaigns.
            </p>
            <table mat-table [dataSource]="rows()" class="full-table">
              <ng-container matColumnDef="title">
                <th mat-header-cell *matHeaderCellDef>
                  <span matTooltip="The headline of this finding">Title</span>
                </th>
                <td mat-cell *matCellDef="let row">
                  <a [routerLink]="['/research/insights', row.id]" class="ins-link">
                    <mat-icon class="ins-ico">lightbulb</mat-icon>
                    {{ row.title }}
                  </a>
                </td>
              </ng-container>
              <ng-container matColumnDef="category">
                <th mat-header-cell *matHeaderCellDef>
                  <span matTooltip="Research area: Competitor, Trend, Audience, Keyword, or Creative">Category</span>
                </th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip-option disabled selected class="cat-chip">{{ formatLabel(row.category) }}</mat-chip-option>
                </td>
              </ng-container>
              <ng-container matColumnDef="insightType">
                <th mat-header-cell *matHeaderCellDef>
                  <span matTooltip="Specific type: Offer, Pricing, Positioning, Pain Point, etc.">Type</span>
                </th>
                <td mat-cell *matCellDef="let row">
                  <span class="type-label">{{ formatLabel(row.insightType) }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="confidence">
                <th mat-header-cell *matHeaderCellDef>
                  <span matTooltip="How confident the author is in this finding: Low, Medium, or High">Confidence</span>
                </th>
                <td mat-cell *matCellDef="let row">
                  <app-status-chip type="confidence" [status]="row.confidence" />
                </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>
                  <span matTooltip="Draft = needs evidence. Published = verified. Archived = historical.">Status</span>
                </th>
                <td mat-cell *matCellDef="let row">
                  <app-status-chip type="insight" [status]="row.status" />
                </td>
              </ng-container>
              <ng-container matColumnDef="evidenceCount">
                <th mat-header-cell *matHeaderCellDef>
                  <span matTooltip="Number of snapshot citations attached to this insight">Evidence</span>
                </th>
                <td mat-cell *matCellDef="let row">
                  @if (row.evidenceCount === 0) {
                    <span class="no-evidence" matTooltip="No evidence — cannot publish">
                      <mat-icon class="ev-ico warn-ico">warning_amber</mat-icon> 0
                    </span>
                  } @else {
                    <span class="has-evidence" matTooltip="{{ row.evidenceCount }} snapshot citation(s)">
                      <mat-icon class="ev-ico ok-ico">check_circle</mat-icon> {{ row.evidenceCount }}
                    </span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button type="button" (click)="remove(row)"
                    matTooltip="Permanently delete this insight">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns"></tr>
            </table>
          </mat-card>

          <!-- Next steps -->
          <mat-card class="next-steps">
            <mat-icon class="ns-ico">arrow_forward</mat-icon>
            <div>
              <strong>What to do next</strong>
              <p>
                Click any insight to see its detail page. From there you can
                <strong>add evidence</strong> (cite a snapshot),
                <strong>publish</strong> verified findings, or
                <a routerLink="/research/links">create cross-module links</a>
                to connect insights to campaigns, templates, and rulesets.
              </p>
            </div>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 48px; max-width: 1140px; margin: 0 auto; }

    /* Header */
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
    .header-text { flex: 1; min-width: 0; }
    .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 13px; margin-bottom: 4px; }
    .breadcrumb a { color: #1976d2; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .breadcrumb span { color: #666; }
    .bc-sep { font-size: 16px; width: 16px; height: 16px; color: #999; }
    h1 { margin: 0 0 6px; font-size: 24px; font-weight: 600; color: #1a1a2e; }
    .subtitle { margin: 0; color: #555; font-size: 14px; line-height: 1.55; max-width: 680px; }
    .subtitle a { color: #1976d2; text-decoration: none; }
    .subtitle a:hover { text-decoration: underline; }
    .subtitle strong { color: #333; }

    /* Guide card */
    .guide-card {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px 20px !important; margin-bottom: 20px;
      background: #f5f5f5; border: 1px solid #e0e0e0;
    }
    .guide-ico { color: #1976d2; margin-top: 2px; flex-shrink: 0; }
    .guide-card > div > strong { font-size: 14px; }
    .guide-flow {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      margin: 12px 0; padding: 12px 16px; background: #fff; border-radius: 8px; border: 1px solid #e0e0e0;
    }
    .flow-step { text-align: center; min-width: 100px; flex: 1; }
    .flow-circle {
      width: 40px; height: 40px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; margin: 0 auto 6px;
    }
    .flow-circle mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .draft-circle { background: #fff3e0; }
    .draft-circle mat-icon { color: #e65100; }
    .evidence-circle { background: #e3f2fd; }
    .evidence-circle mat-icon { color: #1565c0; }
    .publish-circle { background: #e8f5e9; }
    .publish-circle mat-icon { color: #2e7d32; }
    .action-circle { background: #f3e5f5; }
    .action-circle mat-icon { color: #7b1fa2; }
    .flow-step strong { display: block; font-size: 12px; color: #333; }
    .flow-step span { font-size: 11px; color: #777; line-height: 1.4; }
    .flow-arrow { color: #bdbdbd; font-size: 20px; width: 20px; height: 20px; }
    .guide-note { display: flex; align-items: flex-start; gap: 6px; font-size: 13px; color: #555; margin: 8px 0 4px; line-height: 1.5; }
    .tip-ico { font-size: 16px; width: 16px; height: 16px; color: #f9a825; margin-top: 1px; flex-shrink: 0; }
    .guide-tips { margin: 4px 0 0; padding-left: 18px; font-size: 13px; color: #555; line-height: 1.7; }
    .guide-tips li { margin-bottom: 2px; }
    .guide-tips a { color: #1976d2; text-decoration: none; }
    .guide-tips a:hover { text-decoration: underline; }

    /* Callout */
    .callout {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px 20px !important; margin-bottom: 16px; border-left: 4px solid;
    }
    .callout p { margin: 4px 0 0; font-size: 13px; color: #555; }
    .callout-ico { margin-top: 2px; flex-shrink: 0; }
    .callout-warn { border-color: #ffa726; background: #fff8e1; }
    .callout-warn .callout-ico { color: #f57c00; }
    .callout-action { border-color: #42a5f5; background: #e3f2fd; }
    .callout-action .callout-ico { color: #1565c0; }
    .centered { display: flex; justify-content: center; padding: 48px; }

    /* Filter bar */
    .filter-bar {
      display: flex; flex-wrap: wrap; gap: 10px; padding: 10px 16px !important;
      margin-bottom: 16px; align-items: center;
    }
    .filter-ico { color: #888; flex-shrink: 0; }
    .f { min-width: 170px; margin: 0 !important; }

    /* Empty examples */
    .empty-examples { padding: 20px 24px !important; margin-top: 16px; }
    .empty-examples > strong { font-size: 14px; color: #333; }
    .example-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; margin-top: 12px; }
    .example-item {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 14px; background: #fafafa; border-radius: 8px; border: 1px solid #eee;
    }
    .example-item mat-icon { color: #546e7a; margin-top: 2px; flex-shrink: 0; }
    .example-item strong { display: block; font-size: 13px; color: #333; }
    .example-item span { font-size: 12px; color: #777; line-height: 1.4; }
    .example-item a { color: #1976d2; text-decoration: none; }
    .example-item a:hover { text-decoration: underline; }

    /* Summary strip */
    .summary-strip {
      display: flex; gap: 24px; flex-wrap: wrap;
      padding: 10px 16px; margin-bottom: 16px;
      background: #f5f5f5; border-radius: 8px; font-size: 13px; color: #555;
    }
    .strip-stat { display: flex; align-items: center; gap: 4px; }
    .strip-stat strong { color: #1976d2; }
    .strip-ico { font-size: 16px; width: 16px; height: 16px; }
    .draft-strip .strip-ico { color: #e65100; }
    .published-strip .strip-ico { color: #2e7d32; }
    .warn-ico { color: #f57c00 !important; }

    /* Table */
    .table-card { padding: 16px 20px 8px; margin-bottom: 20px; }
    .table-help { margin: 0 0 12px; font-size: 13px; color: #888; }
    .full-table { width: 100%; }
    .ins-link {
      display: inline-flex; align-items: center; gap: 6px;
      text-decoration: none; color: #1a1a2e; font-weight: 500;
    }
    .ins-link:hover { color: #1976d2; }
    .ins-ico { font-size: 18px; width: 18px; height: 18px; color: #f9a825; }
    .cat-chip { font-size: 11px !important; }
    .type-label { font-size: 12px; color: #666; }
    .no-evidence { display: inline-flex; align-items: center; gap: 3px; color: #f57c00; font-size: 13px; }
    .has-evidence { display: inline-flex; align-items: center; gap: 3px; color: #2e7d32; font-size: 13px; }
    .ev-ico { font-size: 15px; width: 15px; height: 15px; }
    .ok-ico { color: #2e7d32; }

    /* Next steps */
    .next-steps {
      display: flex; align-items: flex-start; gap: 14px;
      padding: 16px 20px !important; background: #e8f5e9; border: 1px solid #c8e6c9;
    }
    .ns-ico { color: #2e7d32; margin-top: 2px; flex-shrink: 0; }
    .next-steps strong { font-size: 14px; }
    .next-steps p { margin: 4px 0 0; font-size: 13px; color: #444; line-height: 1.55; }
    .next-steps a { color: #1976d2; text-decoration: none; }
    .next-steps a:hover { text-decoration: underline; }
  `],
})
export class InsightsListComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly rows = signal<InsightResponse[]>([]);
  readonly loading = signal(false);
  readonly columns = ['title', 'category', 'insightType', 'confidence', 'status', 'evidenceCount', 'actions'];

  readonly statuses = [...INSIGHT_STATUSES];
  readonly categories = [...RESEARCH_CATEGORIES];
  filterStatus = '';
  filterCategory = '';

  readonly draftCount = computed(() => this.rows().filter(r => r.status === 'DRAFT').length);
  readonly publishedCount = computed(() => this.rows().filter(r => r.status === 'PUBLISHED').length);
  readonly noEvidenceCount = computed(() => this.rows().filter(r => r.evidenceCount === 0).length);
  readonly draftWithoutEvidence = computed(() => this.rows().filter(r => r.status === 'DRAFT' && r.evidenceCount === 0).length);

  ngOnInit(): void { this.reload(); }

  reload(): void {
    const ws = this.workspaceId();
    if (!ws) { this.rows.set([]); return; }
    this.loading.set(true);
    this.api.listInsights(ws, {
      status: this.filterStatus || undefined,
      category: this.filterCategory || undefined,
    }).subscribe({
      next: list => { this.rows.set(list); this.loading.set(false); },
      error: () => { this.loading.set(false); this.notify.error('Could not load insights.'); },
    });
  }

  openCreate(): void {
    const ws = this.workspaceId();
    if (!ws) { this.notify.error('Select a workspace first.'); return; }
    const ref = this.dialog.open(CreateInsightDialogComponent, { width: '520px' });
    ref.afterClosed().subscribe((req: InsightCreateRequest | undefined) => {
      if (!req) return;
      this.api.createInsight(ws, req).subscribe({
        next: () => { this.notify.success('Insight created as Draft. Add evidence to publish.'); this.reload(); },
        error: (err) => {
          const detail = err?.error?.detail || err?.error?.message || '';
          if (detail.toLowerCase().includes('permission') || detail.toLowerCase().includes('access denied') || err?.status === 403) {
            this.notify.error('You do not have permission to create insights in this workspace.');
          } else if (err?.status === 404) {
            this.notify.error('Workspace not found. Please select a valid workspace.');
          } else if (detail) {
            this.notify.error('Could not create insight: ' + detail);
          } else {
            this.notify.error('Could not create insight. Please try again.');
          }
        },
      });
    });
  }

  remove(row: InsightResponse): void {
    const ws = this.workspaceId();
    if (!ws) return;
    if (!window.confirm(
      `Delete insight "${row.title}"?\n\nThis will also remove all evidence citations attached to it.`
    )) return;
    this.api.deleteInsight(ws, row.id).subscribe({
      next: () => { this.notify.success('Insight removed.'); this.reload(); },
      error: () => this.notify.error('Could not delete insight.'),
    });
  }

  formatLabel(v: string): string {
    return v.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}
