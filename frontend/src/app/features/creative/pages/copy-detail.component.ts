import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import {
  CopyArtifactResponse,
  CreativeAiRunLinkResponse,
  CreativeUsageResponse,
} from '../models/creative.models';
import { CreativeAiApiService } from '../services/creative-ai-api.service';
import { CreativeCopyApiService } from '../services/creative-copy-api.service';
import { CreativeUsageApiService } from '../services/creative-usage-api.service';

@Component({
  selector: 'app-copy-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon>workspaces</mat-icon>
          <div>
            <strong>No workspace selected</strong>
            <p>Select a workspace from the sidebar to view this copy artifact.</p>
          </div>
        </mat-card>
      } @else if (loading()) {
        <div class="spinner-wrap">
          <mat-spinner diameter="48"></mat-spinner>
          <p class="loading-text">Loading copy details...</p>
        </div>
      } @else if (!copy()) {
        <mat-card class="callout callout-warn">
          <mat-icon>error_outline</mat-icon>
          <div>
            <strong>Copy artifact not found</strong>
            <p>This copy may have been deleted or you may not have access. <a routerLink="/creative/copy">Return to Copy Library</a></p>
          </div>
        </mat-card>
      } @else {
        <nav class="breadcrumb">
          <a routerLink="/creative/assets" class="bc-link">Creative Studio</a>
          <mat-icon class="bc-sep">chevron_right</mat-icon>
          <a routerLink="/creative/copy" class="bc-link">Copy Library</a>
          <mat-icon class="bc-sep">chevron_right</mat-icon>
          <span>{{ copy()!.name }}</span>
        </nav>

        <div class="toolbar">
          <button mat-stroked-button type="button" routerLink="/creative/copy"
            matTooltip="Go back to Copy Library list">
            <mat-icon>arrow_back</mat-icon>
            Back to Library
          </button>
          <div class="toolbar-actions">
            @if (copy()!.status === 'DRAFT') {
              <button mat-stroked-button type="button" (click)="toggleEdit()"
                matTooltip="Edit the content text of this draft copy. Only drafts can be edited — approve after finalizing.">
                <mat-icon>{{ editMode() ? 'close' : 'edit' }}</mat-icon>
                {{ editMode() ? 'Cancel Edit' : 'Edit Content' }}
              </button>
              @if (editMode()) {
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  [disabled]="saving()"
                  (click)="save()"
                  matTooltip="Save your changes to the copy content"
                >
                  @if (saving()) {
                    <mat-spinner diameter="20" class="btn-spin"></mat-spinner>
                  } @else {
                    <mat-icon>save</mat-icon>
                  }
                  Save Changes
                </button>
              }
            }
            <button
              mat-stroked-button
              type="button"
              (click)="runGovernance()"
              [disabled]="govCheckRunning()"
              matTooltip="Run automated compliance checks against your configured brand rules, legal requirements, and platform policies. Results indicate whether this copy is safe to publish."
            >
              @if (govCheckRunning()) {
                <mat-spinner diameter="20" class="btn-spin"></mat-spinner>
              } @else {
                <mat-icon>policy</mat-icon>
              }
              Governance Check
            </button>
            <button mat-stroked-button color="warn" type="button" (click)="archive()" [disabled]="archiving()"
              matTooltip="Archive this copy — it will be marked as retired and hidden from active lists. This action can be undone.">
              <mat-icon>archive</mat-icon>
              Archive
            </button>
            <button
              mat-flat-button
              color="accent"
              type="button"
              (click)="goToAiVariants()"
              matTooltip="Open AI Generator pre-filled with this copy's details to auto-create alternative versions for A/B testing and optimization."
            >
              <mat-icon>auto_awesome</mat-icon>
              Generate AI Variants
            </button>
          </div>
        </div>

        @if (copy()!.status !== 'DRAFT' && !editMode()) {
          <mat-card class="status-banner" [class]="'sb-' + copy()!.status.toLowerCase()">
            <mat-icon>{{ getStatusIcon(copy()!.status) }}</mat-icon>
            <div class="status-banner-text">
              <strong>{{ getStatusLabel(copy()!.status) }}</strong>
              <span>{{ getStatusDescription(copy()!.status) }}</span>
            </div>
          </mat-card>
        }

        <mat-card class="context-help">
          <mat-icon class="context-icon">info_outline</mat-icon>
          <div class="context-content">
            <div class="context-main">
              <strong>What can you do here?</strong>
              <span>This is the detail view for a single copy artifact. From here you can:</span>
            </div>
            <div class="context-actions">
              <span class="ctx-action"><mat-icon class="ctx-icon">edit</mat-icon> <strong>Edit</strong> content text (drafts only)</span>
              <span class="ctx-action"><mat-icon class="ctx-icon">policy</mat-icon> <strong>Governance Check</strong> for brand &amp; legal compliance</span>
              <span class="ctx-action"><mat-icon class="ctx-icon">auto_awesome</mat-icon> <strong>Generate Variants</strong> with AI for A/B testing</span>
              <span class="ctx-action"><mat-icon class="ctx-icon">archive</mat-icon> <strong>Archive</strong> to retire from active use</span>
            </div>
            <span class="context-nav">
              <a routerLink="/creative/copy">Copy Library</a> &middot;
              <a routerLink="/creative/assets">Assets</a> &middot;
              <a routerLink="/creative/ai">AI Generator</a> &middot;
              <a routerLink="/creative/variants">Variants</a> &middot;
              <a routerLink="/creative/usage">Usage &amp; Links</a>
            </span>
          </div>
        </mat-card>

        <mat-card class="header-card">
          <div class="header-row">
            <div class="header-title-row">
              <mat-icon class="header-type-icon">{{ getTypeIcon(copy()!.type) }}</mat-icon>
              <h1>{{ copy()!.name }}</h1>
            </div>
            <div class="header-chips">
              <span class="badge type" [matTooltip]="getTypeDescription(copy()!.type)">{{ formatLabel(copy()!.type) }}</span>
              <span class="badge status" [class]="'st-' + copy()!.status.toLowerCase()"
                [matTooltip]="getStatusDescription(copy()!.status)">{{
                formatLabel(copy()!.status)
              }}</span>
              <span class="badge lang" matTooltip="ISO language code for this copy artifact">{{ copy()!.language || '—' }}</span>
            </div>
          </div>
          <div class="header-meta">
            <span class="meta-item" matTooltip="When this copy was created">
              <mat-icon class="meta-icon">schedule</mat-icon>
              Created {{ copy()!.createdAt | date: 'medium' }}
            </span>
            @if (copy()!.updatedAt && copy()!.updatedAt !== copy()!.createdAt) {
              <span class="meta-item" matTooltip="Last modified date">
                <mat-icon class="meta-icon">update</mat-icon>
                Updated {{ copy()!.updatedAt | date: 'medium' }}
              </span>
            }
          </div>
          <div class="gov-row">
            @if (hasGovernanceCheck()) {
              <span class="gov-pill gov-ok">
                <mat-icon>verified</mat-icon>
                Governance Checked
              </span>
              <span class="gov-hint">This copy has passed brand compliance checks and is cleared for publishing.</span>
            } @else {
              <span class="gov-pill gov-warn">
                <mat-icon>warning_amber</mat-icon>
                Not Governance Checked
              </span>
              <span class="gov-hint">
                Run a governance check before publishing to verify this copy meets brand guidelines, legal requirements, and platform policies.
                <button mat-button class="gov-run-link" (click)="runGovernance()" [disabled]="govCheckRunning()">
                  <mat-icon>policy</mat-icon> Run Check Now
                </button>
              </span>
            }
          </div>
        </mat-card>

        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon class="section-icon">text_fields</mat-icon>
              Content
            </mat-card-title>
            <mat-card-subtitle>The main text content of this copy artifact. {{ copy()!.status === 'DRAFT' ? 'Click "Edit Content" above to make changes.' : 'Only drafts can be edited.' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (copy()!.status === 'DRAFT' && editMode()) {
              <mat-form-field appearance="outline" class="content-field">
                <mat-label>Content text</mat-label>
                <textarea matInput rows="12" [(ngModel)]="draftText" name="dt"></textarea>
                <mat-hint>Edit the text content. Click "Save Changes" when done, or "Cancel Edit" to discard.</mat-hint>
              </mat-form-field>
            } @else {
              @if (copy()!.contentText) {
                <div class="content-readonly">{{ copy()!.contentText }}</div>
              } @else {
                <div class="content-empty">
                  <mat-icon>text_snippet</mat-icon>
                  <span>No content text yet. {{ copy()!.status === 'DRAFT' ? 'Click "Edit Content" above to add text.' : '' }}</span>
                </div>
              }
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon class="section-icon">data_object</mat-icon>
              Structured Content (JSON)
            </mat-card-title>
            <mat-card-subtitle>Machine-readable structured representation of this copy. Used for template rendering and platform integrations.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (copy()!.contentJson) {
              <pre class="json-block">{{ formatJson(copy()!.contentJson) }}</pre>
            } @else {
              <div class="content-empty">
                <mat-icon>data_object</mat-icon>
                <span>No structured JSON content. This is auto-generated for certain copy types or populated by AI generation.</span>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon class="section-icon">link</mat-icon>
              Usage Tracking
            </mat-card-title>
            <mat-card-subtitle>Where this copy artifact is currently being used across your campaigns, ads, and templates.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (usageLoading()) {
              <mat-spinner diameter="32"></mat-spinner>
            } @else if (usage().length === 0) {
              <div class="empty-section">
                <mat-icon class="empty-section-icon">link_off</mat-icon>
                <div class="empty-section-text">
                  <strong>Not used anywhere yet</strong>
                  <span>This copy hasn't been linked to any campaigns or ads. Usage is automatically tracked when you connect copy to campaigns through the <a routerLink="/creative/usage" class="inline-link">Usage &amp; Links</a> page.</span>
                </div>
              </div>
            } @else {
              <table mat-table [dataSource]="usage()" class="usage-table">
                <ng-container matColumnDef="usedEntityType">
                  <th mat-header-cell *matHeaderCellDef matTooltip="The type of entity using this copy (e.g. Campaign, Ad, Template)">Entity Type</th>
                  <td mat-cell *matCellDef="let u">{{ u.usedEntityType }}</td>
                </ng-container>
                <ng-container matColumnDef="usedEntityId">
                  <th mat-header-cell *matHeaderCellDef matTooltip="The unique ID of the entity using this copy">Entity ID</th>
                  <td mat-cell *matCellDef="let u" class="mono">{{ u.usedEntityId }}</td>
                </ng-container>
                <ng-container matColumnDef="relationType">
                  <th mat-header-cell *matHeaderCellDef matTooltip="How this copy relates to the entity (e.g. headline, body text, CTA)">Relation</th>
                  <td mat-cell *matCellDef="let u">{{ u.relationType || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef matTooltip="When this usage link was created">Linked At</th>
                  <td mat-cell *matCellDef="let u">{{ u.createdAt | date: 'medium' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="usageColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: usageColumns"></tr>
              </table>
              <p class="section-footer">
                Manage all usage links on the <a routerLink="/creative/usage" class="inline-link">Usage &amp; Links</a> page.
              </p>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon class="section-icon">auto_awesome</mat-icon>
              AI Provenance
            </mat-card-title>
            <mat-card-subtitle>Complete history of AI operations that created or modified this copy artifact &mdash; ensuring full traceability and auditability.</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (aiLoading()) {
              <mat-spinner diameter="32"></mat-spinner>
            } @else if (aiLinks().length === 0) {
              <div class="empty-section">
                <mat-icon class="empty-section-icon">smart_toy</mat-icon>
                <div class="empty-section-text">
                  <strong>No AI runs recorded</strong>
                  <span>This copy was created manually. To generate AI-powered variants, click <strong>Generate AI Variants</strong> in the toolbar above, or use the <a routerLink="/creative/ai" class="inline-link">AI Generator</a> to create new copy from scratch.</span>
                </div>
              </div>
            } @else {
              <table mat-table [dataSource]="aiLinks()" class="ai-table">
                <ng-container matColumnDef="aiPromptRunId">
                  <th mat-header-cell *matHeaderCellDef matTooltip="Unique identifier for the AI prompt execution">Run ID</th>
                  <td mat-cell *matCellDef="let l" class="mono">{{ l.aiPromptRunId }}</td>
                </ng-container>
                <ng-container matColumnDef="aiConversationId">
                  <th mat-header-cell *matHeaderCellDef matTooltip="The AI conversation thread this run belongs to">Conversation</th>
                  <td mat-cell *matCellDef="let l" class="mono">{{ l.aiConversationId || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="createdAt">
                  <th mat-header-cell *matHeaderCellDef matTooltip="When this AI run was executed">Executed At</th>
                  <td mat-cell *matCellDef="let l">{{ l.createdAt | date: 'medium' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="aiColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: aiColumns"></tr>
              </table>
              <p class="section-footer">
                AI provenance ensures every AI-generated change is traceable. Visit the <a routerLink="/creative/ai" class="inline-link">AI Generator</a> to create more variants.
              </p>
            }
          </mat-card-content>
        </mat-card>

        <div class="page-footer">
          <a routerLink="/creative/copy" class="footer-link">
            <mat-icon>arrow_back</mat-icon> Back to Copy Library
          </a>
          <span class="footer-sep">&middot;</span>
          <a routerLink="/creative/ai" class="footer-link">
            <mat-icon>auto_awesome</mat-icon> AI Generator
          </a>
          <span class="footer-sep">&middot;</span>
          <a routerLink="/creative/variants" class="footer-link">
            <mat-icon>view_carousel</mat-icon> Variant Sets
          </a>
          <span class="footer-sep">&middot;</span>
          <a routerLink="/creative/usage" class="footer-link">
            <mat-icon>link</mat-icon> Usage &amp; Links
          </a>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .page { padding: 24px; max-width: 960px; margin: 0 auto; }

      /* Callout */
      .callout { display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px; border-radius: var(--radius-md); }
      .callout-warn { background: color-mix(in srgb, var(--color-warn, #f9a825) 12%, transparent); border: 1px solid var(--border-default); }
      .callout-warn strong { color: var(--text-primary); }
      .callout-warn p { margin: 4px 0 0; font-size: 13px; color: var(--text-secondary); }
      .callout-warn a { color: var(--color-primary); font-weight: 500; text-decoration: none; }

      /* Spinner */
      .spinner-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px; gap: 16px; }
      .loading-text { font-size: 14px; color: var(--text-muted); }

      /* Breadcrumb */
      .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; margin-bottom: 16px; color: var(--text-secondary); }
      .bc-link { color: var(--color-primary); text-decoration: none; font-weight: 500; }
      .bc-link:hover { text-decoration: underline; }
      .bc-sep { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); line-height: 1; }

      /* Toolbar */
      .toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
      .toolbar-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      :host ::ng-deep .btn-spin { display: inline-flex; align-items: center; vertical-align: middle; margin-right: 6px; }
      :host ::ng-deep .btn-spin .mdc-circular-progress { width: 18px !important; height: 18px !important; }

      /* Status banner */
      .status-banner { display: flex; align-items: center; gap: 12px; padding: 12px 16px; margin-bottom: 16px; border-radius: var(--radius-md); }
      .status-banner mat-icon { font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; line-height: 1; }
      .status-banner-text { display: flex; flex-direction: column; gap: 2px; }
      .status-banner-text strong { font-size: 14px; }
      .status-banner-text span { font-size: 12px; opacity: 0.85; }
      .sb-approved { background: color-mix(in srgb, #2e7d32 12%, transparent); border: 1px solid color-mix(in srgb, #2e7d32 25%, transparent); color: #1b5e20; }
      .sb-in_review { background: color-mix(in srgb, #1565c0 12%, transparent); border: 1px solid color-mix(in srgb, #1565c0 25%, transparent); color: #0d47a1; }
      .sb-rejected { background: color-mix(in srgb, #c62828 12%, transparent); border: 1px solid color-mix(in srgb, #c62828 25%, transparent); color: #b71c1c; }
      .sb-archived { background: var(--bg-surface-hover); border: 1px solid var(--border-default); color: var(--text-muted); }

      /* Context help */
      .context-help { display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px; margin-bottom: 20px; border-radius: var(--radius-md); border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent); background: color-mix(in srgb, var(--color-primary) 5%, transparent); }
      .context-icon { color: var(--color-primary); font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; margin-top: 2px; line-height: 1; }
      .context-content { display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: var(--text-secondary); flex: 1; }
      .context-main { display: flex; flex-direction: column; gap: 2px; }
      .context-main strong { color: var(--text-primary); font-size: 13px; }
      .context-actions { display: flex; flex-wrap: wrap; gap: 12px; }
      .ctx-action { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; line-height: 1; }
      .ctx-icon { font-size: 15px; width: 15px; height: 15px; color: var(--color-primary); line-height: 1; flex-shrink: 0; }
      .context-nav a { color: var(--color-primary); font-weight: 500; text-decoration: none; font-size: 12px; }
      .context-nav a:hover { text-decoration: underline; }

      /* Header card */
      .header-card { margin-bottom: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-default); padding: 20px; }
      .header-row { margin-bottom: 8px; }
      .header-title-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
      .header-type-icon { font-size: 28px; width: 28px; height: 28px; color: var(--color-primary); flex-shrink: 0; line-height: 1; }
      .header-row h1 { margin: 0; font-size: 24px; font-weight: 600; color: var(--text-primary); }
      .header-chips { display: flex; flex-wrap: wrap; gap: 8px; }
      .badge { font-size: 12px; padding: 4px 10px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em; font-weight: 500; cursor: default; }
      .badge.type { background: color-mix(in srgb, var(--color-primary) 14%, transparent); color: var(--color-primary); }
      .badge.status { background: var(--bg-surface-hover); color: var(--text-secondary); }
      .badge.st-approved { color: #2e7d32; background: color-mix(in srgb, #2e7d32 12%, transparent); }
      .badge.st-in_review { color: #1565c0; background: color-mix(in srgb, #1565c0 12%, transparent); }
      .badge.st-rejected { color: #c62828; background: color-mix(in srgb, #c62828 12%, transparent); }
      .badge.st-archived { color: var(--text-muted); }
      .badge.lang { color: var(--text-muted); border: 1px solid var(--border-default); }
      .header-meta { display: flex; flex-wrap: wrap; gap: 16px; margin: 12px 0 0; }
      .meta-item { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted); line-height: 1; }
      .meta-icon { font-size: 14px; width: 14px; height: 14px; line-height: 1; flex-shrink: 0; }

      /* Governance row */
      .gov-row { margin-top: 14px; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
      .gov-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; padding: 6px 12px; border-radius: var(--radius-md); line-height: 1.2; }
      .gov-pill mat-icon { font-size: 18px; width: 18px; height: 18px; line-height: 1; vertical-align: middle; flex-shrink: 0; }
      .gov-ok { background: color-mix(in srgb, #2e7d32 18%, transparent); color: #1b5e20; }
      .gov-warn { background: color-mix(in srgb, #f9a825 22%, transparent); color: #e65100; }
      .gov-hint { font-size: 12px; color: var(--text-secondary); display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; line-height: 1.5; }
      :host ::ng-deep .gov-run-link { font-size: 12px; color: var(--color-primary); padding: 2px 8px; min-height: 28px; line-height: 1.4; }
      :host ::ng-deep .gov-run-link .mat-icon { font-size: 14px; width: 14px; height: 14px; margin-right: 2px; }

      /* Sections */
      .section { margin-bottom: 20px; border-radius: var(--radius-md); border: 1px solid var(--border-default); }
      .section-icon { font-size: 20px; width: 20px; height: 20px; vertical-align: middle; margin-right: 6px; margin-bottom: 2px; color: var(--color-primary); line-height: 1; display: inline-block; }
      .content-field { width: 100%; }
      .content-readonly { white-space: pre-wrap; line-height: 1.55; font-size: 15px; color: var(--text-primary); padding: 16px; background: var(--bg-surface-hover); border-radius: var(--radius-md); border: 1px solid var(--border-default); min-height: 120px; }
      .content-empty { display: flex; align-items: center; gap: 10px; padding: 20px; color: var(--text-muted); font-size: 14px; background: var(--bg-surface-hover); border-radius: var(--radius-md); border: 1px dashed var(--border-default); }
      .content-empty mat-icon { font-size: 24px; width: 24px; height: 24px; opacity: 0.5; flex-shrink: 0; line-height: 1; }
      .json-block { margin: 0; padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-default); border-radius: var(--radius-md); font-size: 12px; overflow: auto; max-height: 280px; }

      /* Empty section state */
      .empty-section { display: flex; align-items: flex-start; gap: 12px; padding: 16px; background: var(--bg-surface-hover); border-radius: var(--radius-md); border: 1px dashed var(--border-default); }
      .empty-section-icon { font-size: 28px; width: 28px; height: 28px; color: var(--text-muted); opacity: 0.5; flex-shrink: 0; line-height: 1; }
      .empty-section-text { display: flex; flex-direction: column; gap: 4px; }
      .empty-section-text strong { font-size: 14px; color: var(--text-primary); }
      .empty-section-text span { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }

      .section-footer { font-size: 12px; color: var(--text-muted); margin: 8px 0 0; }

      /* Tables */
      .usage-table, .ai-table { width: 100%; }
      .mono { font-family: ui-monospace, monospace; font-size: 12px; }
      .inline-link { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .inline-link:hover { text-decoration: underline; }

      /* Page footer */
      .page-footer { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 0 4px; flex-wrap: wrap; }
      .footer-link { display: inline-flex; align-items: center; gap: 4px; color: var(--color-primary); font-size: 12px; font-weight: 500; text-decoration: none; line-height: 1; }
      .footer-link:hover { text-decoration: underline; }
      .footer-link mat-icon { font-size: 14px; width: 14px; height: 14px; line-height: 1; flex-shrink: 0; }
      .footer-sep { color: var(--text-muted); font-size: 12px; }
    `,
  ],
})
export class CopyDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly copyApi = inject(CreativeCopyApiService);
  private readonly aiApi = inject(CreativeAiApiService);
  private readonly usageApi = inject(CreativeUsageApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  readonly loading = signal(true);
  readonly copy = signal<CopyArtifactResponse | null>(null);
  readonly editMode = signal(false);
  readonly saving = signal(false);
  readonly archiving = signal(false);
  readonly govCheckRunning = signal(false);

  readonly usage = signal<CreativeUsageResponse[]>([]);
  readonly usageLoading = signal(false);
  readonly aiLinks = signal<CreativeAiRunLinkResponse[]>([]);
  readonly aiLoading = signal(false);

  readonly usageColumns = ['usedEntityType', 'usedEntityId', 'relationType', 'createdAt'];
  readonly aiColumns = ['aiPromptRunId', 'aiConversationId', 'createdAt'];

  draftText = '';

  private copyId = '';

  readonly hasGovernanceCheck = computed(() => {
    const id = this.copy()?.governanceCheckRunId;
    return id != null && String(id).trim().length > 0;
  });

  ngOnInit(): void {
    this.copyId = this.route.snapshot.paramMap.get('copyId') ?? '';
    this.reload();
  }

  reload(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws || !this.copyId) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.copyApi.getCopy(ws, this.copyId).subscribe({
      next: (c) => {
        this.copy.set(c);
        this.draftText = c.contentText ?? '';
        this.editMode.set(false);
        this.loading.set(false);
        this.loadUsage(ws);
        this.loadAi(ws);
      },
      error: () => {
        this.copy.set(null);
        this.loading.set(false);
        this.notify.error('Failed to load copy');
      },
    });
  }

  private loadUsage(ws: string): void {
    this.usageLoading.set(true);
    this.usageApi
      .listUsage(ws, {
        creativeEntityType: 'COPY_ARTIFACT',
        creativeEntityId: this.copyId,
      })
      .subscribe({
        next: (u) => {
          this.usage.set(u ?? []);
          this.usageLoading.set(false);
        },
        error: () => {
          this.usage.set([]);
          this.usageLoading.set(false);
        },
      });
  }

  private loadAi(ws: string): void {
    this.aiLoading.set(true);
    this.aiApi
      .listAiLinks(ws, {
        producedEntityType: 'COPY_ARTIFACT',
        producedEntityId: this.copyId,
      })
      .subscribe({
        next: (l) => {
          this.aiLinks.set(l ?? []);
          this.aiLoading.set(false);
        },
        error: () => {
          this.aiLinks.set([]);
          this.aiLoading.set(false);
        },
      });
  }

  toggleEdit(): void {
    const c = this.copy();
    if (!c || c.status !== 'DRAFT') return;
    this.editMode.update((v) => !v);
    if (this.editMode()) {
      this.draftText = c.contentText ?? '';
    }
  }

  save(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.saving.set(true);
    this.copyApi
      .updateCopy(ws, this.copyId, {
        contentText: this.draftText,
      })
      .subscribe({
        next: (u) => {
          this.copy.set(u);
          this.saving.set(false);
          this.editMode.set(false);
          this.notify.success('Saved');
        },
        error: (e) => {
          this.saving.set(false);
          this.notify.error(e?.error?.message ?? 'Save failed');
        },
      });
  }

  runGovernance(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    const lang = this.copy()?.language?.trim() || 'en';
    this.govCheckRunning.set(true);
    this.copyApi.runGovernanceCheck(ws, this.copyId, { language: lang }).subscribe({
      next: (c) => {
        this.copy.set(c);
        this.govCheckRunning.set(false);
        this.notify.success('Governance check completed');
      },
      error: (e) => {
        this.govCheckRunning.set(false);
        this.notify.error(e?.error?.message ?? 'Governance check failed');
      },
    });
  }

  archive(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.archiving.set(true);
    this.copyApi.archiveCopy(ws, this.copyId).subscribe({
      next: () => {
        this.archiving.set(false);
        this.notify.success('Archived');
        this.reload();
      },
      error: (e) => {
        this.archiving.set(false);
        this.notify.error(e?.error?.message ?? 'Archive failed');
      },
    });
  }

  goToAiVariants(): void {
    const c = this.copy();
    if (!c) return;
    void this.router.navigate(['/creative/ai'], {
      queryParams: {
        copyId: this.copyId,
        name: c.name,
        type: c.type,
        language: c.language || 'en',
      },
    });
  }

  formatJson(raw: string | null | undefined): string {
    if (!raw) return '{}';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  formatLabel(v: string): string {
    return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      AD_COPY: 'campaign', HOOK_LIST: 'bolt', ANGLE_LIST: 'psychology',
      CTA_LIST: 'touch_app', SOCIAL_CAPTION: 'tag', VIDEO_SCRIPT: 'videocam',
      STORYBOARD: 'view_comfy', UGC_BRIEF: 'person_pin', LANDING_COPY: 'web',
      EMAIL_COPY: 'email', SMS_COPY: 'sms',
    };
    return icons[type] ?? 'text_snippet';
  }

  getTypeDescription(type: string): string {
    const descs: Record<string, string> = {
      AD_COPY: 'Headlines, descriptions, and body text for paid ads.',
      HOOK_LIST: 'Attention-grabbing opening lines that stop the scroll.',
      ANGLE_LIST: 'Different messaging perspectives for distinct audience segments.',
      CTA_LIST: 'Call-to-action phrases that drive clicks and conversions.',
      SOCIAL_CAPTION: 'Captions for organic and paid social media posts.',
      VIDEO_SCRIPT: 'Scene-by-scene scripts for video ads and reels.',
      STORYBOARD: 'Visual narrative outlines with scene descriptions and dialogue.',
      UGC_BRIEF: 'Detailed creator briefs for user-generated content campaigns.',
      LANDING_COPY: 'Text content for landing pages: headlines, value props, CTAs.',
      EMAIL_COPY: 'Subject lines, preview text, and body content for emails.',
      SMS_COPY: 'Short text messages for SMS marketing campaigns.',
    };
    return descs[type] ?? '';
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      APPROVED: 'check_circle', IN_REVIEW: 'hourglass_top',
      REJECTED: 'cancel', ARCHIVED: 'archive',
    };
    return icons[status] ?? 'info';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      APPROVED: 'Approved', IN_REVIEW: 'In Review',
      REJECTED: 'Rejected', ARCHIVED: 'Archived',
    };
    return labels[status] ?? this.formatLabel(status);
  }

  getStatusDescription(status: string): string {
    const descs: Record<string, string> = {
      DRAFT: 'This copy is a draft and can be freely edited.',
      APPROVED: 'This copy has been approved and is ready to use in campaigns and ads.',
      IN_REVIEW: 'This copy has been submitted for review and is awaiting approval.',
      REJECTED: 'This copy was not approved. Review feedback and make revisions.',
      ARCHIVED: 'This copy has been retired and is no longer active.',
    };
    return descs[status] ?? '';
  }
}
