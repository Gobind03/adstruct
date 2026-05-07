import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { AiActionButtonComponent } from '../components/ai-action-button.component';
import { ConfirmDialogComponent } from '../components/confirm-dialog.component';
import { ResearchEmptyStateComponent } from '../components/research-empty-state.component';
import { KeywordClusterResponse, KeywordClusterCreateRequest, SnapshotResponse } from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';
import { ResearchAiApiService } from '../services/research-ai-api.service';

const INTENT_LABELS: Record<string, string> = {
  informational: 'Informational',
  commercial: 'Commercial',
  transactional: 'Transactional',
  navigational: 'Navigational',
};

const INTENT_COLORS: Record<string, string> = {
  informational: '#1565c0',
  commercial: '#e65100',
  transactional: '#2e7d32',
  navigational: '#6a1b9a',
};

export interface ImportKeywordsDialogData {
  workspaceId: string;
}

// ────────────────────────────────────────────────
// Import keywords dialog (enhanced)
// ────────────────────────────────────────────────
@Component({
  selector: 'app-import-keywords-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatSelectModule, MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="dlg-ico">upload</mat-icon> Import Keywords
    </h2>
    <mat-dialog-content class="dlg">
      <p class="dlg-help">
        Create a keyword cluster by pasting a list of related keywords. Clusters help you organize
        keywords by <strong>search intent</strong> (informational, commercial, transactional, navigational)
        and track their performance over time.
      </p>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Cluster name</mat-label>
        <input matInput [(ngModel)]="name" name="name" required
          placeholder="e.g. Brand awareness keywords" />
        <mat-hint>A short, memorable label for this group of keywords</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Search intent (optional)</mat-label>
        <mat-select [(ngModel)]="intentType" name="intent">
          <mat-option value="">— Not specified —</mat-option>
          <mat-option value="informational">Informational — user wants to learn</mat-option>
          <mat-option value="commercial">Commercial — user is researching options</mat-option>
          <mat-option value="transactional">Transactional — user is ready to buy</mat-option>
          <mat-option value="navigational">Navigational — user wants a specific site</mat-option>
        </mat-select>
        <mat-hint>Categorize by user search intent</mat-hint>
      </mat-form-field>

      <mat-form-field appearance="outline" class="field">
        <mat-label>Keywords</mat-label>
        <textarea
          matInput rows="8"
          [(ngModel)]="keywordsText" name="kw"
          placeholder="One keyword per line, e.g.&#10;marketing automation&#10;email campaign tools&#10;best crm software"></textarea>
        <mat-hint>{{ keywordCount }} keyword{{ keywordCount !== 1 ? 's' : '' }} detected · Blank lines are ignored</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancel</button>
      <button mat-flat-button color="primary" type="button"
        [disabled]="!name.trim() || keywordCount < 1" (click)="save()">
        <mat-icon>playlist_add</mat-icon> Import {{ keywordCount }} keyword{{ keywordCount !== 1 ? 's' : '' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dlg { min-width: 480px; padding-top: 4px; display: flex; flex-direction: column; }
    .dlg-ico { vertical-align: middle; margin-right: 6px; color: #1976d2; }
    .dlg-help { color: #616161; font-size: 13px; margin: 0 0 16px; line-height: 1.55; }
    .dlg-help strong { color: #333; }
    .field { width: 100%; margin-bottom: 8px; }
  `],
})
export class ImportKeywordsDialogComponent {
  readonly ref = inject(MatDialogRef<ImportKeywordsDialogComponent>);
  name = '';
  intentType = '';
  keywordsText = '';

  get keywordCount(): number {
    return this.keywordsText.split(/\r?\n/).map(s => s.trim()).filter(Boolean).length;
  }

  save(): void {
    const keywords = this.keywordsText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    this.ref.close({
      name: this.name.trim(),
      keywords,
      intentType: this.intentType || undefined,
    });
  }
}

export interface AiClusterDialogData {
  snapshots: SnapshotResponse[];
}

// ────────────────────────────────────────────────
// AI cluster dialog (enhanced)
// ────────────────────────────────────────────────
@Component({
  selector: 'app-ai-cluster-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatRadioModule, MatSelectModule, MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="dlg-ico">auto_awesome</mat-icon> AI Keyword Clustering
    </h2>
    <mat-dialog-content class="dlg">
      <div class="what-box">
        <div class="what-title">
          <mat-icon class="what-ico">help_outline</mat-icon>
          <strong>What does this do?</strong>
        </div>
        <p>
          AI analyzes your keywords and <strong>automatically groups them</strong> into clusters based on
          <strong>search intent</strong>. Each cluster is saved as a new record with:
        </p>
        <ul>
          <li><strong>Cluster name</strong> — a descriptive label based on the topic</li>
          <li><strong>Intent type</strong> — Informational, Commercial, Transactional, or Navigational</li>
          <li><strong>Keywords</strong> — the keywords that belong to this group</li>
          <li><strong>Metrics</strong> — estimated volume, CPC, and difficulty</li>
        </ul>
      </div>

      <div class="how-flow">
        <div class="flow-step-d"><mat-icon>edit_note</mat-icon><span>You provide keywords</span></div>
        <mat-icon class="flow-arr">arrow_forward</mat-icon>
        <div class="flow-step-d ai-s"><mat-icon>auto_awesome</mat-icon><span>AI groups by intent</span></div>
        <mat-icon class="flow-arr">arrow_forward</mat-icon>
        <div class="flow-step-d"><mat-icon>hub</mat-icon><span>Clusters created</span></div>
      </div>

      <div class="info-box">
        <mat-icon class="info-ico">token</mat-icon>
        <span>Uses AI credits. All outputs include provenance links to the source data.</span>
      </div>

      <p class="sub-label">Step 1: Choose your input method</p>
      <mat-radio-group [(ngModel)]="mode" name="mode" class="mode-row">
        <mat-radio-button value="paste">
          <span class="radio-label">Paste keywords</span>
          <span class="radio-hint">Paste a list of keywords from your SEO tool, spreadsheet, or brainstorming. One per line.</span>
        </mat-radio-button>
        <mat-radio-button value="snapshot">
          <span class="radio-label">Use a snapshot</span>
          <span class="radio-hint">AI will extract keywords from the snapshot's raw text content and cluster them.</span>
        </mat-radio-button>
      </mat-radio-group>

      <p class="sub-label">Step 2: Provide the data</p>
      @if (mode === 'paste') {
        <mat-form-field appearance="outline" class="field">
          <mat-label>Keywords (one per line)</mat-label>
          <textarea matInput rows="6" [(ngModel)]="keywordsText" name="pasteKw"
            placeholder="marketing automation&#10;email campaign tools&#10;best crm software&#10;lead generation strategies&#10;social media management&#10;content marketing platform"></textarea>
          <mat-hint>{{ pasteCount }} keyword{{ pasteCount !== 1 ? 's' : '' }} detected — aim for 5+ keywords for meaningful clusters</mat-hint>
        </mat-form-field>
        @if (pasteCount > 0 && pasteCount < 3) {
          <div class="tip-box">
            <mat-icon>lightbulb</mat-icon>
            <span>Tip: Add more keywords (5+) for better clustering results. With fewer than 3, AI may only create 1 cluster.</span>
          </div>
        }
      } @else {
        @if (data.snapshots.length) {
          <mat-form-field appearance="outline" class="field">
            <mat-label>Select snapshot</mat-label>
            <mat-select [(ngModel)]="snapshotId" name="snap">
              @for (s of data.snapshots; track s.id) {
                <mat-option [value]="s.id">
                  {{ s.title || formatSnapshotType(s.snapshotType) }} — {{ s.capturedAt | date: 'mediumDate' }}
                </mat-option>
              }
            </mat-select>
            <mat-hint>Choose a snapshot that contains keyword data, search terms, or SEO content</mat-hint>
          </mat-form-field>
        } @else {
          <div class="warn-box">
            <mat-icon>warning_amber</mat-icon>
            <div>
              <strong>No snapshots available</strong>
              <span>Go to <strong>Sources</strong> → ingest a URL or file → a snapshot will be created. Then return here and select it.</span>
            </div>
          </div>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancel</button>
      <button mat-flat-button color="accent" type="button"
        [disabled]="!canRun()" (click)="confirm()"
        [matTooltip]="!canRun() ? 'Provide keywords or select a snapshot first' : 'AI will create cluster records from your keywords'"
        matTooltipShowDelay="300">
        <mat-icon>auto_awesome</mat-icon>
        Run AI Clustering
        @if (mode === 'paste' && pasteCount > 0) {
          ({{ pasteCount }} keywords)
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dlg { min-width: 520px; padding-top: 4px; display: flex; flex-direction: column; }
    .dlg-ico { vertical-align: middle; margin-right: 6px; color: #7b1fa2; }
    .what-box { background: #fafafa; border: 1px solid #e0e0e0; border-radius: 10px; padding: 14px 18px; margin-bottom: 16px; }
    .what-title { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
    .what-ico { font-size: 18px; width: 18px; height: 18px; color: #7b1fa2; }
    .what-box p { font-size: 13px; color: #424242; line-height: 1.55; margin: 0 0 8px; }
    .what-box ul { margin: 0; padding-left: 18px; font-size: 12.5px; color: #616161; line-height: 1.7; }
    .what-box ul strong { color: #333; }
    .how-flow { display: flex; align-items: center; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
    .flow-step-d { display: flex; align-items: center; gap: 5px; background: #e3f2fd; border-radius: 18px; padding: 5px 12px; font-size: 12px; font-weight: 500; color: #1565c0; white-space: nowrap; }
    .flow-step-d mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .flow-step-d.ai-s { background: #f3e5f5; color: #7b1fa2; }
    .flow-arr { font-size: 16px; width: 16px; height: 16px; color: #bdbdbd; }
    .sub-label { font-size: 13px; font-weight: 600; margin: 0 0 8px; color: #424242; }
    .field { width: 100%; margin-bottom: 8px; }
    .info-box { display: flex; align-items: flex-start; gap: 8px; background: #f3e5f5; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: #6a1b9a; }
    .info-ico { font-size: 18px; width: 18px; height: 18px; margin-top: 1px; }
    .warn-box { display: flex; align-items: flex-start; gap: 8px; background: #fff3e0; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #e65100; }
    .warn-box mat-icon { font-size: 18px; width: 18px; height: 18px; margin-top: 2px; flex-shrink: 0; }
    .warn-box div { display: flex; flex-direction: column; gap: 4px; }
    .warn-box span { font-size: 12px; }
    .tip-box { display: flex; align-items: flex-start; gap: 8px; background: #e8f5e9; border-radius: 8px; padding: 8px 12px; margin-bottom: 8px; font-size: 12px; color: #2e7d32; }
    .tip-box mat-icon { font-size: 16px; width: 16px; height: 16px; margin-top: 1px; }
    .mode-row { display: flex; flex-direction: column; gap: 10px; margin-bottom: 16px; }
    .radio-label { font-weight: 500; }
    .radio-hint { display: block; font-size: 12px; color: #757575; margin-top: 2px; line-height: 1.4; }
  `],
})
export class AiClusterDialogComponent {
  readonly ref = inject(MatDialogRef<AiClusterDialogComponent>);
  readonly data = inject<AiClusterDialogData>(MAT_DIALOG_DATA);
  mode: 'paste' | 'snapshot' = 'paste';
  keywordsText = '';
  snapshotId = '';

  get pasteCount(): number {
    return this.keywordsText.split(/\r?\n/).map(s => s.trim()).filter(Boolean).length;
  }

  formatSnapshotType(t: string): string {
    return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  canRun(): boolean {
    if (this.mode === 'paste') return this.pasteCount > 0;
    return !!this.snapshotId;
  }

  confirm(): void {
    if (this.mode === 'paste') {
      const keywords = this.keywordsText.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      this.ref.close({ keywords });
    } else {
      this.ref.close({ snapshotId: this.snapshotId || undefined });
    }
  }
}

// ────────────────────────────────────────────────
// Main keyword clusters page (enhanced)
// ────────────────────────────────────────────────
@Component({
  selector: 'app-keyword-clusters',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule,
    AiActionButtonComponent, ConfirmDialogComponent,
    ResearchEmptyStateComponent,
    MatButtonModule, MatCardModule, MatChipsModule,
    MatDialogModule, MatIconModule, MatProgressSpinnerModule,
    MatTableModule, MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">

      <!-- Breadcrumb -->
      <nav class="breadcrumb">
        <a routerLink="/research/overview">Research &amp; Intelligence</a>
        <mat-icon class="bc-sep">chevron_right</mat-icon>
        <span>Keyword Clusters</span>
      </nav>

      <!-- Header -->
      <div class="page-header">
        <div class="header-text">
          <div class="header-title-row">
            <mat-icon class="header-ico">hub</mat-icon>
            <h1>Keyword Clusters</h1>
          </div>
          <p class="header-sub">
            Group related keywords by <strong>search intent</strong> to guide your content strategy,
            SEO planning, and ad targeting. Import keywords manually or let AI cluster them
            automatically from your research snapshots.
          </p>
        </div>
        <div class="header-actions-col">
          <div class="header-actions">
            <button mat-stroked-button type="button" (click)="openImport()"
              matTooltip="Manually create a cluster by pasting keywords and choosing an intent" matTooltipShowDelay="200">
              <mat-icon>upload</mat-icon> Import Keywords
            </button>
            <app-ai-action-button
              label="AI Cluster"
              tooltip="Paste keywords or pick a snapshot → AI groups them into intent-based clusters (Informational, Commercial, Transactional, Navigational) and creates cluster records automatically"
              [disabled]="!workspaceId()"
              (clicked)="openAiCluster()"
            />
          </div>
          <p class="action-hint">
            <mat-icon class="action-hint-ico">auto_awesome</mat-icon>
            <strong>AI Cluster</strong> automatically groups your keywords by search intent and saves them as cluster records.
          </p>
        </div>
      </div>

      <!-- Guide: What are keyword clusters? -->
      <mat-card class="guide-card">
        <div class="guide-header" (click)="guideOpen = !guideOpen">
          <mat-icon class="guide-ico">school</mat-icon>
          <strong>What are keyword clusters &amp; why do they matter?</strong>
          <mat-icon class="guide-toggle">{{ guideOpen ? 'expand_less' : 'expand_more' }}</mat-icon>
        </div>
        @if (guideOpen) {
          <div class="guide-body">
            <p>
              A <strong>keyword cluster</strong> is a group of related search terms that share a common
              <strong>search intent</strong>. Instead of targeting individual keywords in isolation,
              clustering helps you identify topical themes and intent patterns across your market.
            </p>

            <div class="intent-grid">
              <div class="intent-item" style="border-left-color: #1565c0;">
                <strong>Informational</strong>
                <span>"what is marketing automation", "how to do SEO"</span>
                <em>User wants to learn — great for blog posts &amp; guides</em>
              </div>
              <div class="intent-item" style="border-left-color: #e65100;">
                <strong>Commercial</strong>
                <span>"best CRM software", "HubSpot vs Salesforce"</span>
                <em>User is comparing options — great for comparison pages</em>
              </div>
              <div class="intent-item" style="border-left-color: #2e7d32;">
                <strong>Transactional</strong>
                <span>"buy email tool", "CRM pricing plans"</span>
                <em>User is ready to buy — great for landing pages</em>
              </div>
              <div class="intent-item" style="border-left-color: #6a1b9a;">
                <strong>Navigational</strong>
                <span>"HubSpot login", "Mailchimp dashboard"</span>
                <em>User wants a specific site — brand &amp; competitor signals</em>
              </div>
            </div>

            <!-- Visual flow -->
            <div class="flow-section">
              <p class="flow-title">Two ways to create clusters:</p>
              <div class="flow-row">
                <div class="flow-step">
                  <mat-icon>upload</mat-icon>
                  <span>Paste keywords</span>
                </div>
                <mat-icon class="flow-arrow">arrow_forward</mat-icon>
                <div class="flow-step">
                  <mat-icon>playlist_add</mat-icon>
                  <span>Create cluster</span>
                </div>
                <mat-icon class="flow-arrow">arrow_forward</mat-icon>
                <div class="flow-step">
                  <mat-icon>insights</mat-icon>
                  <span>Link to insights</span>
                </div>
              </div>
              <div class="flow-row" style="margin-top: 8px;">
                <div class="flow-step ai-step">
                  <mat-icon>auto_awesome</mat-icon>
                  <span>AI Cluster</span>
                </div>
                <mat-icon class="flow-arrow">arrow_forward</mat-icon>
                <div class="flow-step ai-step">
                  <mat-icon>hub</mat-icon>
                  <span>Auto-grouped by intent</span>
                </div>
                <mat-icon class="flow-arrow">arrow_forward</mat-icon>
                <div class="flow-step ai-step">
                  <mat-icon>verified</mat-icon>
                  <span>Provenance tracked</span>
                </div>
              </div>
            </div>

            <p class="guide-tip">
              <mat-icon class="tip-ico">lightbulb</mat-icon>
              <strong>Tip:</strong> After creating clusters, go to
              <a routerLink="/research/insights">Insights</a> to create a <em>KEYWORD_CLUSTER</em>
              or <em>INTENT_CLUSTER</em> insight and attach evidence from your snapshots.
            </p>
          </div>
        }
      </mat-card>

      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon class="callout-ico">workspaces</mat-icon>
          <div>
            <strong>No workspace selected</strong>
            <p>Pick a workspace from the sidebar. Keyword clusters are scoped per workspace.</p>
          </div>
        </mat-card>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>
      } @else if (clusteringInProgress()) {
        <mat-card class="ai-progress-card">
          <mat-spinner diameter="28" />
          <div>
            <strong>AI is clustering your keywords…</strong>
            <p>Analyzing intent patterns and grouping keywords. This usually takes a few seconds.</p>
          </div>
        </mat-card>
      } @else if (!clusters().length) {
        <!-- Enhanced empty state -->
        <mat-card class="empty-card">
          <div class="empty-hero">
            <mat-icon class="empty-ico">hub</mat-icon>
            <h2>No keyword clusters yet</h2>
            <p>Keyword clusters help you organize your keyword research by search intent. Get started with one of these approaches:</p>
          </div>
          <div class="pathway-grid">
            <div class="pathway" (click)="openImport()">
              <mat-icon class="pw-ico" style="color: #1976d2;">upload</mat-icon>
              <strong>Import manually</strong>
              <span>Paste a list of keywords from your SEO tool, spreadsheet, or brainstorming session</span>
            </div>
            <div class="pathway" (click)="openAiCluster()">
              <mat-icon class="pw-ico" style="color: #7b1fa2;">auto_awesome</mat-icon>
              <strong>AI Cluster</strong>
              <span>Paste keywords or pick a snapshot — AI groups them by intent automatically</span>
            </div>
            <div class="pathway" routerLink="/research/sources">
              <mat-icon class="pw-ico" style="color: #e65100;">source</mat-icon>
              <strong>Ingest a source first</strong>
              <span>Add a keyword data source and create snapshots, then use AI clustering on them</span>
            </div>
            <div class="pathway" routerLink="/research/insights">
              <mat-icon class="pw-ico" style="color: #2e7d32;">lightbulb</mat-icon>
              <strong>Create a keyword insight</strong>
              <span>If you already have keyword data, create an insight of type KEYWORD_CLUSTER directly</span>
            </div>
          </div>
        </mat-card>
      } @else {
        <!-- Summary strip -->
        <div class="summary-strip">
          <div class="strip-stat" matTooltip="Total clusters in this workspace">
            <strong>{{ clusters().length }}</strong> cluster{{ clusters().length !== 1 ? 's' : '' }}
          </div>
          <div class="strip-stat" matTooltip="Total keywords across all clusters">
            <mat-icon class="strip-ico">label</mat-icon>
            {{ totalKeywords() }} keyword{{ totalKeywords() !== 1 ? 's' : '' }}
          </div>
          @for (intent of intentBreakdown(); track intent.type) {
            <div class="strip-stat" [matTooltip]="intent.label + ' intent clusters'">
              <span class="intent-dot" [style.background]="intent.color"></span>
              {{ intent.count }} {{ intent.label }}
            </div>
          }
          @if (unclassifiedCount() > 0) {
            <div class="strip-stat" matTooltip="Clusters without intent classification">
              <mat-icon class="strip-ico muted-ico">help_outline</mat-icon>
              {{ unclassifiedCount() }} unclassified
            </div>
          }
        </div>

        <!-- Table -->
        <mat-card class="table-card">
          <table mat-table [dataSource]="clusters()" class="kc-table">
            <!-- Name -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Cluster name</th>
              <td mat-cell *matCellDef="let row">
                <div class="name-cell">
                  <mat-icon class="name-ico">hub</mat-icon>
                  <strong>{{ row.name }}</strong>
                </div>
              </td>
            </ng-container>

            <!-- Intent -->
            <ng-container matColumnDef="intent">
              <th mat-header-cell *matHeaderCellDef>
                <span matTooltip="Search intent describes why a user searches for these keywords" matTooltipShowDelay="200">
                  Intent
                </span>
              </th>
              <td mat-cell *matCellDef="let row">
                @if (row.intentType) {
                  <span class="intent-chip"
                    [style.background]="getIntentBg(row.intentType)"
                    [style.color]="getIntentColor(row.intentType)"
                    [matTooltip]="getIntentTooltip(row.intentType)" matTooltipShowDelay="200">
                    {{ getIntentLabel(row.intentType) }}
                  </span>
                } @else {
                  <span class="muted" matTooltip="No intent type set — edit or re-run AI clustering" matTooltipShowDelay="200">
                    Not set
                  </span>
                }
              </td>
            </ng-container>

            <!-- Keyword count + preview -->
            <ng-container matColumnDef="keywords">
              <th mat-header-cell *matHeaderCellDef>Keywords</th>
              <td mat-cell *matCellDef="let row">
                <span class="count-badge"
                  [matTooltip]="getKeywordPreview(row)" matTooltipShowDelay="200">
                  {{ row.keywords.length }}
                </span>
              </td>
            </ng-container>

            <!-- Metrics -->
            <ng-container matColumnDef="metrics">
              <th mat-header-cell *matHeaderCellDef>
                <span matTooltip="Optional search metrics (volume, CPC, difficulty) from your SEO tools" matTooltipShowDelay="200">
                  Metrics
                </span>
              </th>
              <td mat-cell *matCellDef="let row">
                @if (hasMetrics(row)) {
                  <span class="metric-info" matTooltip="Average volume / CPC / difficulty" matTooltipShowDelay="200">
                    @if (row.metricsJson?.avgVolume != null) {
                      <span>Vol: {{ row.metricsJson.avgVolume }}</span>
                    }
                    @if (row.metricsJson?.avgCpc != null) {
                      <span>CPC: {{ row.metricsJson.avgCpc | currency }}</span>
                    }
                  </span>
                } @else {
                  <span class="muted">—</span>
                }
              </td>
            </ng-container>

            <!-- Source snapshot -->
            <ng-container matColumnDef="snapshot">
              <th mat-header-cell *matHeaderCellDef>
                <span matTooltip="If this cluster was created from a snapshot, click to see the source data" matTooltipShowDelay="200">
                  Source
                </span>
              </th>
              <td mat-cell *matCellDef="let row">
                @if (row.sourceSnapshotId) {
                  <a [routerLink]="['/research/snapshots', row.sourceSnapshotId]" class="link"
                    matTooltip="View the source snapshot this cluster was created from" matTooltipShowDelay="200">
                    <mat-icon class="link-ico">photo_camera</mat-icon> Snapshot
                  </a>
                } @else {
                  <span class="muted" matTooltip="Manually imported — no snapshot linked" matTooltipShowDelay="200">Manual</span>
                }
              </td>
            </ng-container>

            <!-- Created -->
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let row">
                <span class="date-cell">{{ row.createdAt | date: 'mediumDate' }}</span>
              </td>
            </ng-container>

            <!-- Actions -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let row">
                <button mat-icon-button type="button" color="warn"
                  [matTooltip]="'Delete cluster &quot;' + row.name + '&quot;'"
                  (click)="confirmDelete(row)" aria-label="Delete cluster">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        </mat-card>
      }

      <!-- Next steps -->
      @if (workspaceId()) {
        <mat-card class="next-card">
          <div class="next-header">
            <mat-icon class="next-ico">rocket_launch</mat-icon>
            <strong>Next steps</strong>
          </div>
          <div class="next-grid">
            <a routerLink="/research/insights" class="next-link"
              matTooltip="Create KEYWORD_CLUSTER or INTENT_CLUSTER insights from your clusters">
              <mat-icon>lightbulb</mat-icon>
              <div>
                <strong>Create keyword insights</strong>
                <span>Turn cluster findings into actionable insights with evidence</span>
              </div>
            </a>
            <a routerLink="/research/sources" class="next-link"
              matTooltip="Add keyword data sources and snapshots for AI clustering">
              <mat-icon>source</mat-icon>
              <div>
                <strong>Ingest keyword data</strong>
                <span>Add sources from SEO tools, then snapshot the data for clustering</span>
              </div>
            </a>
            <a routerLink="/research/competitors" class="next-link"
              matTooltip="See what keywords your competitors are targeting">
              <mat-icon>groups</mat-icon>
              <div>
                <strong>Check competitor keywords</strong>
                <span>Compare your clusters against competitor positioning</span>
              </div>
            </a>
            <a routerLink="/research/links" class="next-link"
              matTooltip="Link keyword clusters to content templates, campaigns, or brand terms">
              <mat-icon>link</mat-icon>
              <div>
                <strong>Create cross-module links</strong>
                <span>Connect clusters to content, governance, or creative modules</span>
              </div>
            </a>
          </div>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 40px; max-width: 1100px; margin: 0 auto; }

    /* Breadcrumb */
    .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #757575; margin-bottom: 8px; }
    .breadcrumb a { color: #1976d2; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .bc-sep { font-size: 18px; width: 18px; height: 18px; color: #bdbdbd; }

    /* Header */
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
    .header-title-row { display: flex; align-items: center; gap: 10px; }
    .header-ico { font-size: 28px; width: 28px; height: 28px; color: #1976d2; }
    .page-header h1 { margin: 0; font-size: 22px; font-weight: 600; }
    .header-sub { margin: 6px 0 0; color: #616161; font-size: 14px; line-height: 1.5; max-width: 620px; }
    .header-sub strong { color: #333; }
    .header-actions-col { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
    .header-actions { display: flex; gap: 8px; flex-shrink: 0; padding-top: 4px; }
    .action-hint { display: flex; align-items: center; gap: 4px; margin: 0; font-size: 11.5px; color: #7b1fa2; }
    .action-hint-ico { font-size: 14px; width: 14px; height: 14px; }
    .action-hint strong { font-weight: 600; }

    /* Guide card */
    .guide-card { margin-bottom: 20px; padding: 0 !important; overflow: hidden; }
    .guide-header { display: flex; align-items: center; gap: 10px; padding: 14px 20px; cursor: pointer; user-select: none; }
    .guide-header:hover { background: #fafafa; }
    .guide-ico { color: #1976d2; font-size: 20px; width: 20px; height: 20px; }
    .guide-toggle { margin-left: auto; color: #9e9e9e; }
    .guide-body { padding: 0 20px 20px; }
    .guide-body p { font-size: 13.5px; color: #424242; line-height: 1.6; margin: 0 0 16px; }
    .guide-tip { display: flex; align-items: flex-start; gap: 8px; background: #e8f5e9; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #2e7d32; margin: 0; }
    .guide-tip a { color: #1565c0; }
    .tip-ico { font-size: 18px; width: 18px; height: 18px; margin-top: 1px; }

    /* Intent grid */
    .intent-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .intent-item { border-left: 4px solid #ccc; padding: 10px 14px; background: #fafafa; border-radius: 0 8px 8px 0; }
    .intent-item strong { display: block; font-size: 13px; margin-bottom: 2px; }
    .intent-item span { display: block; font-size: 12px; color: #616161; font-style: italic; }
    .intent-item em { display: block; font-size: 12px; color: #757575; margin-top: 4px; font-style: normal; }

    /* Visual flow */
    .flow-section { margin-bottom: 16px; }
    .flow-title { font-size: 13px; font-weight: 600; color: #424242; margin: 0 0 10px; }
    .flow-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .flow-step { display: flex; align-items: center; gap: 6px; background: #e3f2fd; border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 500; color: #1565c0; white-space: nowrap; }
    .flow-step mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .flow-step.ai-step { background: #f3e5f5; color: #7b1fa2; }
    .flow-arrow { font-size: 18px; width: 18px; height: 18px; color: #bdbdbd; }

    /* Callout */
    .callout { display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px !important; margin-bottom: 20px; }
    .callout-warn { background: #fff3e0; }
    .callout-ico { color: #e65100; margin-top: 2px; }
    .callout p { margin: 4px 0 0; font-size: 13px; color: #616161; }

    .centered { display: flex; justify-content: center; padding: 48px; }
    .ai-progress-card { display: flex; align-items: center; gap: 16px; padding: 20px 24px !important; margin-bottom: 20px; background: #f3e5f5; border: 1px solid #ce93d8; }
    .ai-progress-card strong { font-size: 14px; color: #6a1b9a; }
    .ai-progress-card p { margin: 4px 0 0; font-size: 13px; color: #7b1fa2; }

    /* Empty state */
    .empty-card { padding: 32px 24px !important; text-align: center; margin-bottom: 20px; }
    .empty-hero { margin-bottom: 24px; }
    .empty-ico { font-size: 48px; width: 48px; height: 48px; color: #bdbdbd; margin-bottom: 8px; }
    .empty-hero h2 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
    .empty-hero p { margin: 0; font-size: 14px; color: #616161; max-width: 500px; margin: 0 auto; }
    .pathway-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; text-align: left; }
    .pathway { padding: 16px; border: 1px solid #e0e0e0; border-radius: 10px; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; }
    .pathway:hover { border-color: #1976d2; box-shadow: 0 2px 8px rgba(25,118,210,.12); }
    .pw-ico { font-size: 24px; width: 24px; height: 24px; margin-bottom: 6px; }
    .pathway strong { display: block; font-size: 13px; margin-bottom: 4px; }
    .pathway span { font-size: 12px; color: #757575; line-height: 1.45; }

    /* Summary strip */
    .summary-strip { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; padding: 10px 16px; background: #f5f5f5; border-radius: 8px; font-size: 13px; color: #424242; align-items: center; }
    .strip-stat { display: flex; align-items: center; gap: 5px; }
    .strip-ico { font-size: 16px; width: 16px; height: 16px; color: #757575; }
    .muted-ico { color: #bdbdbd; }
    .intent-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }

    /* Table */
    .table-card { overflow: auto; margin-bottom: 20px; }
    .kc-table { width: 100%; }
    .name-cell { display: flex; align-items: center; gap: 8px; }
    .name-ico { font-size: 18px; width: 18px; height: 18px; color: #1976d2; }
    .muted { color: #9e9e9e; font-size: 13px; }
    .count-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; padding: 2px 8px; border-radius: 999px; background: #e3f2fd; color: #1565c0; font-size: 12px; font-weight: 600; cursor: default; }
    .intent-chip { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
    .metric-info { display: flex; gap: 10px; font-size: 12px; color: #616161; }
    .link { display: inline-flex; align-items: center; gap: 4px; color: #1976d2; text-decoration: none; font-size: 13px; }
    .link:hover { text-decoration: underline; }
    .link-ico { font-size: 14px; width: 14px; height: 14px; }
    .date-cell { font-size: 13px; color: #757575; }

    /* Next steps */
    .next-card { margin-top: 4px; padding: 20px 24px !important; }
    .next-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
    .next-ico { color: #e65100; }
    .next-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
    .next-link { display: flex; align-items: flex-start; gap: 10px; text-decoration: none; color: inherit; padding: 12px 14px; border: 1px solid #e0e0e0; border-radius: 10px; transition: border-color 0.15s, box-shadow 0.15s; }
    .next-link:hover { border-color: #1976d2; box-shadow: 0 2px 8px rgba(25,118,210,.1); }
    .next-link mat-icon { color: #1976d2; margin-top: 2px; }
    .next-link strong { display: block; font-size: 13px; margin-bottom: 2px; }
    .next-link span { font-size: 12px; color: #757575; line-height: 1.4; }
  `],
})
export class KeywordClustersComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly aiApi = inject(ResearchAiApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly dialog = inject(MatDialog);
  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly clusters = signal<KeywordClusterResponse[]>([]);
  readonly snapshots = signal<SnapshotResponse[]>([]);
  readonly loading = signal(false);
  readonly clusteringInProgress = signal(false);
  readonly columns = ['name', 'intent', 'keywords', 'metrics', 'snapshot', 'createdAt', 'actions'];
  guideOpen = true;

  readonly totalKeywords = computed(() =>
    this.clusters().reduce((sum, c) => sum + (c.keywords?.length || 0), 0)
  );

  readonly intentBreakdown = computed(() => {
    const map = new Map<string, number>();
    for (const c of this.clusters()) {
      if (c.intentType) {
        map.set(c.intentType, (map.get(c.intentType) || 0) + 1);
      }
    }
    return Array.from(map.entries()).map(([type, count]) => ({
      type,
      label: INTENT_LABELS[type] || type,
      color: INTENT_COLORS[type] || '#9e9e9e',
      count,
    }));
  });

  readonly unclassifiedCount = computed(() =>
    this.clusters().filter(c => !c.intentType).length
  );

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const ws = this.workspaceId();
    if (!ws) { this.clusters.set([]); this.snapshots.set([]); return; }
    this.loading.set(true);
    this.api.listClusters(ws).subscribe({
      next: list => { this.clusters.set(list); this.loading.set(false); },
      error: (err) => {
        this.loading.set(false);
        const detail = err?.error?.detail || err?.error?.message || '';
        this.notify.error(detail ? 'Could not load clusters: ' + detail : 'Could not load keyword clusters.');
      },
    });
    this.api.listSnapshots(ws).subscribe({
      next: s => this.snapshots.set(s),
      error: () => {},
    });
  }

  openImport(): void {
    const ws = this.workspaceId();
    if (!ws) { this.notify.error('Select a workspace first.'); return; }
    const ref = this.dialog.open(ImportKeywordsDialogComponent, {
      width: '540px',
      data: { workspaceId: ws } satisfies ImportKeywordsDialogData,
    });
    ref.afterClosed().subscribe((result: { name: string; keywords: string[]; intentType?: string } | undefined) => {
      if (!result?.name) return;
      const req: KeywordClusterCreateRequest = {
        name: result.name,
        keywords: result.keywords,
        intentType: result.intentType,
      };
      this.api.createCluster(ws, req).subscribe({
        next: () => {
          this.notify.success(`Keyword cluster "${result.name}" created with ${result.keywords.length} keyword(s).`);
          this.reload();
        },
        error: (err) => {
          const detail = err?.error?.detail || err?.error?.message || '';
          if (detail.toLowerCase().includes('unique') || detail.toLowerCase().includes('duplicate')) {
            this.notify.error(`A cluster named "${result.name}" already exists in this workspace.`);
          } else {
            this.notify.error(detail ? 'Failed to create cluster: ' + detail : 'Failed to create cluster.');
          }
        },
      });
    });
  }

  openAiCluster(): void {
    const ws = this.workspaceId();
    if (!ws) return;
    const ref = this.dialog.open(AiClusterDialogComponent, {
      width: '540px',
      data: { snapshots: this.snapshots() } satisfies AiClusterDialogData,
    });
    ref.afterClosed().subscribe((result: { keywords?: string[]; snapshotId?: string } | undefined) => {
      if (!result) return;
      const kwCount = result.keywords?.length || 0;
      const confirmRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Run AI keyword clustering?',
          message: result.keywords
            ? `AI will analyze ${kwCount} keyword${kwCount !== 1 ? 's' : ''} and automatically group them into intent-based clusters (Informational, Commercial, Transactional, Navigational). Each cluster will be saved as a new record. This uses AI credits.`
            : 'AI will extract keywords from the selected snapshot, analyze their intent, and create organized clusters. Each cluster will be saved as a new record. This uses AI credits.',
          confirmLabel: 'Run clustering',
        },
      });
      confirmRef.afterClosed().subscribe(ok => {
        if (!ok) return;
        this.clusteringInProgress.set(true);
        this.aiApi.clusterKeywords(ws, {
          keywords: result.keywords,
          snapshotId: result.snapshotId,
        }).subscribe({
          next: r => {
            this.clusteringInProgress.set(false);
            const count = r.createdClusterIds.length;
            if (count > 0) {
              this.notify.success(`AI clustering complete — ${count} cluster${count !== 1 ? 's' : ''} created and saved. Scroll down to see them.`);
            } else {
              this.notify.error('AI clustering ran but created 0 clusters. Try adding more keywords (5+) or using a different snapshot with richer content.');
            }
            this.reload();
          },
          error: (err) => {
            this.clusteringInProgress.set(false);
            const detail = err?.error?.detail || err?.error?.message || '';
            this.notify.error(detail ? 'AI clustering failed: ' + detail : 'AI clustering failed. Check that you have a valid workspace and AI permissions.');
          },
        });
      });
    });
  }

  confirmDelete(row: KeywordClusterResponse): void {
    const ws = this.workspaceId();
    if (!ws) return;
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete keyword cluster?',
        message: `Delete "${row.name}" (${row.keywords.length} keyword${row.keywords.length !== 1 ? 's' : ''})? This cannot be undone.`,
        confirmLabel: 'Delete',
        danger: true,
      },
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.api.deleteCluster(ws, row.id).subscribe({
        next: () => {
          this.notify.success(`Cluster "${row.name}" deleted.`);
          this.reload();
        },
        error: () => this.notify.error('Could not delete cluster.'),
      });
    });
  }

  getIntentLabel(type: string): string {
    return INTENT_LABELS[type] || type;
  }

  getIntentColor(type: string): string {
    return INTENT_COLORS[type] || '#616161';
  }

  getIntentBg(type: string): string {
    const colors: Record<string, string> = {
      informational: '#e3f2fd',
      commercial: '#fff3e0',
      transactional: '#e8f5e9',
      navigational: '#f3e5f5',
    };
    return colors[type] || '#f5f5f5';
  }

  getIntentTooltip(type: string): string {
    const tips: Record<string, string> = {
      informational: 'User wants to learn — best for educational content',
      commercial: 'User is comparing options — best for comparison pages',
      transactional: 'User is ready to buy — best for landing & pricing pages',
      navigational: 'User wants a specific site — brand / competitor signals',
    };
    return tips[type] || type;
  }

  getKeywordPreview(row: KeywordClusterResponse): string {
    if (!row.keywords?.length) return 'No keywords';
    const preview = row.keywords.slice(0, 8).join(', ');
    return row.keywords.length > 8
      ? preview + ` … and ${row.keywords.length - 8} more`
      : preview;
  }

  hasMetrics(row: KeywordClusterResponse): boolean {
    return row.metricsJson != null && Object.keys(row.metricsJson).length > 0;
  }
}
