import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { CopyArtifactResponse } from '../models/creative.models';
import { CreativeCopyApiService } from '../services/creative-copy-api.service';

const COPY_TYPES = [
  'AD_COPY',
  'HOOK_LIST',
  'ANGLE_LIST',
  'CTA_LIST',
  'SOCIAL_CAPTION',
  'VIDEO_SCRIPT',
  'STORYBOARD',
  'UGC_BRIEF',
  'LANDING_COPY',
  'EMAIL_COPY',
  'SMS_COPY',
] as const;

const COPY_STATUSES = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED'] as const;

@Component({
  selector: 'app-copy-list',
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
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="header">
        <div class="header-text">
          <nav class="breadcrumb">
            <a routerLink="/creative/assets" class="bc-link">Creative Studio</a>
            <mat-icon class="bc-sep">chevron_right</mat-icon>
            <span>Copy Library</span>
          </nav>
          <h1>Copy Library</h1>
          <p class="page-desc">Your centralized hub for all text-based creative content. Store, organize, and manage ad copy, hooks, angles, CTAs, video scripts, and more &mdash; then run compliance checks and generate AI-powered variants.</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button type="button" (click)="showGuide.set(!showGuide())"
            matTooltip="Learn how Copy Library works">
            <mat-icon>help_outline</mat-icon>
            How It Works
          </button>
          <button mat-flat-button color="primary" type="button" (click)="toggleCreate()"
            matTooltip="Create a new copy artifact manually">
            <mat-icon>add</mat-icon>
            New Copy
          </button>
        </div>
      </header>

      @if (showGuide()) {
        <mat-card class="guide-card">
          <div class="guide-header">
            <div class="guide-title-row">
              <mat-icon class="guide-icon">school</mat-icon>
              <h2 class="guide-title">Getting Started with Copy Library</h2>
            </div>
            <button mat-icon-button (click)="showGuide.set(false)" matTooltip="Dismiss guide">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <p class="guide-intro">Copy Library is where all your text-based creative content lives. Think of it as a single source of truth for every piece of marketing copy your team writes or generates.</p>
          <div class="guide-steps">
            <div class="guide-step">
              <div class="step-number">1</div>
              <div class="step-body">
                <strong>Create or Generate Copy</strong>
                <span>Write copy manually using the <strong>New Copy</strong> button, or use the <a routerLink="/creative/ai">AI Generator</a> to auto-generate ad copy, hooks, video scripts, and more.</span>
              </div>
            </div>
            <div class="guide-step">
              <div class="step-number">2</div>
              <div class="step-body">
                <strong>Review &amp; Check Compliance</strong>
                <span>Open any copy artifact and run a <strong>Governance Check</strong> to verify it meets brand guidelines, legal requirements, and platform policies before publishing.</span>
              </div>
            </div>
            <div class="guide-step">
              <div class="step-number">3</div>
              <div class="step-body">
                <strong>Generate Variants for A/B Testing</strong>
                <span>From any copy detail page, click <strong>Generate Variants (AI)</strong> to create alternative versions. Group them into <a routerLink="/creative/variants">Variant Sets</a> for structured testing.</span>
              </div>
            </div>
            <div class="guide-step">
              <div class="step-number">4</div>
              <div class="step-body">
                <strong>Link to Campaigns &amp; Ads</strong>
                <span>Approved copy can be linked to your campaigns and ads. Track where each piece is used via the <a routerLink="/creative/usage">Usage &amp; Links</a> page.</span>
              </div>
            </div>
          </div>
          <div class="guide-types">
            <h3 class="guide-subtitle">Copy Types Explained</h3>
            <div class="type-grid">
              <div class="type-item">
                <mat-icon class="type-icon">campaign</mat-icon>
                <div><strong>Ad Copy</strong><span>Headlines, descriptions, and body text for paid ads across platforms.</span></div>
              </div>
              <div class="type-item">
                <mat-icon class="type-icon">bolt</mat-icon>
                <div><strong>Hook List</strong><span>Attention-grabbing opening lines that stop the scroll and engage viewers.</span></div>
              </div>
              <div class="type-item">
                <mat-icon class="type-icon">psychology</mat-icon>
                <div><strong>Angle List</strong><span>Different messaging perspectives to reach distinct audience segments.</span></div>
              </div>
              <div class="type-item">
                <mat-icon class="type-icon">touch_app</mat-icon>
                <div><strong>CTA List</strong><span>Call-to-action phrases that drive clicks, signups, and conversions.</span></div>
              </div>
              <div class="type-item">
                <mat-icon class="type-icon">tag</mat-icon>
                <div><strong>Social Caption</strong><span>Captions for organic and paid social media posts across platforms.</span></div>
              </div>
              <div class="type-item">
                <mat-icon class="type-icon">videocam</mat-icon>
                <div><strong>Video Script</strong><span>Scene-by-scene scripts for video ads, reels, and promotional content.</span></div>
              </div>
              <div class="type-item">
                <mat-icon class="type-icon">view_comfy</mat-icon>
                <div><strong>Storyboard</strong><span>Visual narrative outlines combining scene descriptions with dialogue.</span></div>
              </div>
              <div class="type-item">
                <mat-icon class="type-icon">person_pin</mat-icon>
                <div><strong>UGC Brief</strong><span>Detailed creator briefs for user-generated content campaigns.</span></div>
              </div>
              <div class="type-item">
                <mat-icon class="type-icon">web</mat-icon>
                <div><strong>Landing Copy</strong><span>Text content for landing pages including headlines, value props, and CTAs.</span></div>
              </div>
              <div class="type-item">
                <mat-icon class="type-icon">email</mat-icon>
                <div><strong>Email Copy</strong><span>Subject lines, preview text, and body content for email campaigns.</span></div>
              </div>
              <div class="type-item">
                <mat-icon class="type-icon">sms</mat-icon>
                <div><strong>SMS Copy</strong><span>Short text messages for SMS marketing campaigns and notifications.</span></div>
              </div>
            </div>
          </div>
          <div class="guide-nav">
            <h3 class="guide-subtitle">Related Features</h3>
            <div class="guide-links">
              <a routerLink="/creative/assets" class="guide-link">
                <mat-icon>image</mat-icon>
                <div><strong>Assets Library</strong><span>Manage images, videos, and other media assets.</span></div>
              </a>
              <a routerLink="/creative/ai" class="guide-link">
                <mat-icon>auto_awesome</mat-icon>
                <div><strong>AI Generator</strong><span>Auto-generate copy, hooks, scripts, and briefs with AI.</span></div>
              </a>
              <a routerLink="/creative/variants" class="guide-link">
                <mat-icon>view_carousel</mat-icon>
                <div><strong>Variant Sets</strong><span>Group copy variants for A/B testing and optimization.</span></div>
              </a>
              <a routerLink="/creative/usage" class="guide-link">
                <mat-icon>link</mat-icon>
                <div><strong>Usage &amp; Links</strong><span>See where each copy artifact is used across campaigns.</span></div>
              </a>
              <a routerLink="/creative/folders" class="guide-link">
                <mat-icon>folder</mat-icon>
                <div><strong>Folders</strong><span>Organize creative assets into folders for easy navigation.</span></div>
              </a>
            </div>
          </div>
        </mat-card>
      }

      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon>workspaces</mat-icon>
          <div>
            <strong>No workspace selected</strong>
            <p>Select a workspace from the sidebar to view and manage your copy library. Each workspace has its own isolated set of copy artifacts.</p>
          </div>
        </mat-card>
      } @else {
        <mat-card class="filters-card">
          <div class="filters-header">
            <mat-icon class="filter-header-icon">filter_alt</mat-icon>
            <span class="filter-header-text">Filter &amp; Search</span>
            <span class="filter-hint">Narrow down your copy artifacts by type, workflow status, language, or keywords.</span>
          </div>
          <div class="filters">
            <mat-form-field appearance="outline" class="filter-field"
              matTooltip="Filter by copy type (e.g. Ad Copy, Hook List, Video Script). Leave as 'All' to show every type.">
              <mat-label>Type</mat-label>
              <mat-select [(ngModel)]="filterType" name="ft">
                <mat-option value="">All types</mat-option>
                @for (t of copyTypes; track t) {
                  <mat-option [value]="t">{{ formatLabel(t) }}</mat-option>
                }
              </mat-select>
              <mat-hint>What kind of copy</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-field"
              matTooltip="Filter by workflow status. Draft = being written, In Review = awaiting approval, Approved = ready to use, Archived = retired.">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="filterStatus" name="fs">
                <mat-option value="">All statuses</mat-option>
                @for (s of copyStatuses; track s) {
                  <mat-option [value]="s">{{ formatLabel(s) }}</mat-option>
                }
              </mat-select>
              <mat-hint>Workflow stage</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-field"
              matTooltip="Filter by ISO language code (e.g. 'en' for English, 'es' for Spanish, 'fr' for French).">
              <mat-label>Language</mat-label>
              <input matInput [(ngModel)]="filterLanguage" name="fl" placeholder="e.g. en, es, fr" />
              <mat-hint>ISO code (en, es...)</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="filter-grow"
              matTooltip="Search by copy name or content text. Press Enter or click Apply to search.">
              <mat-label>Search by name or content</mat-label>
              <mat-icon matPrefix class="search-prefix-icon">search</mat-icon>
              <input matInput [(ngModel)]="searchQuery" name="q" placeholder="Type keywords and press Enter..." (keyup.enter)="applyFilters()" />
            </mat-form-field>
            <button mat-stroked-button type="button" (click)="applyFilters()" matTooltip="Apply selected filters">
              <mat-icon>filter_list</mat-icon>
              Apply
            </button>
            @if (filterType || filterStatus || filterLanguage || searchQuery) {
              <button mat-button type="button" (click)="clearFilters()" matTooltip="Reset all filters to default">
                <mat-icon>clear_all</mat-icon>
                Clear
              </button>
            }
          </div>
        </mat-card>

        @if (showCreate()) {
          <mat-card class="create-card">
            <mat-card-header>
              <mat-card-title>Create New Copy Artifact</mat-card-title>
              <mat-card-subtitle>Add a new piece of text content to your library. You can edit, run compliance checks, and generate variants after creation.</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content class="create-grid">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Name</mat-label>
                <input matInput [(ngModel)]="createName" name="cn" required placeholder="e.g. Summer Sale - Hero Headline" />
                <mat-hint>A descriptive name to identify this copy in your library.</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Type</mat-label>
                <mat-select [(ngModel)]="createType" name="ct" required>
                  @for (t of copyTypes; track t) {
                    <mat-option [value]="t" [matTooltip]="getTypeDescription(t)">{{ formatLabel(t) }}</mat-option>
                  }
                </mat-select>
                <mat-hint>{{ getTypeDescription(createType) }}</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Content</mat-label>
                <textarea matInput rows="5" [(ngModel)]="createContent" name="cc" required
                  [placeholder]="getContentPlaceholder(createType)"></textarea>
                <mat-hint>The actual text content. You can edit this later and run governance checks against brand rules.</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="half">
                <mat-label>Language</mat-label>
                <input matInput [(ngModel)]="createLanguage" name="cl" placeholder="en" />
                <mat-hint>ISO 639-1 code (e.g. en, es, fr, de, ja).</mat-hint>
              </mat-form-field>
            </mat-card-content>
            <div class="create-tip">
              <mat-icon>lightbulb</mat-icon>
              <span>Prefer AI generation? Use the <a routerLink="/creative/ai">AI Generator</a> to auto-create copy based on your product, audience, and brand voice.</span>
            </div>
            <mat-card-actions align="end">
              <button mat-button type="button" (click)="toggleCreate()">Cancel</button>
              <button
                mat-flat-button
                color="primary"
                type="button"
                [disabled]="!createName.trim() || !createContent.trim() || !createType"
                (click)="submitCreate()"
                matTooltip="Create this copy artifact as a Draft. You can then review and approve it."
              >
                <mat-icon>add</mat-icon>
                Create as Draft
              </button>
            </mat-card-actions>
          </mat-card>
        }

        @if (!showCreate() && rows().length > 0) {
          <mat-card class="help-banner">
            <mat-icon class="help-icon">tips_and_updates</mat-icon>
            <div class="help-content">
              <div class="help-main">
                <strong>Working with your copy</strong>
                <span>Click any row to open it. From the detail page you can edit content, run <strong>governance checks</strong> for brand compliance, generate <strong>AI-powered variants</strong> for A/B testing, and track where it's used.</span>
              </div>
              <div class="help-status-legend">
                <span class="legend-item"><span class="legend-dot st-draft"></span> Draft &mdash; being written</span>
                <span class="legend-item"><span class="legend-dot st-in_review"></span> In Review &mdash; awaiting approval</span>
                <span class="legend-item"><span class="legend-dot st-approved"></span> Approved &mdash; ready to use</span>
                <span class="legend-item"><span class="legend-dot st-rejected"></span> Rejected &mdash; needs revisions</span>
                <span class="legend-item"><span class="legend-dot st-archived"></span> Archived &mdash; retired</span>
              </div>
              <span class="help-nav">
                <a routerLink="/creative/assets">Assets Library</a> &middot;
                <a routerLink="/creative/ai">AI Generator</a> &middot;
                <a routerLink="/creative/variants">Variant Sets</a> &middot;
                <a routerLink="/creative/usage">Usage &amp; Links</a>
              </span>
            </div>
          </mat-card>
        }

        @if (loading()) {
          <div class="spinner-wrap">
            <mat-spinner diameter="48"></mat-spinner>
            <p class="loading-text">Loading your copy library...</p>
          </div>
        } @else if (rows().length === 0) {
          <mat-card class="empty-card">
            <mat-icon class="empty-icon">text_snippet</mat-icon>
            <h3>Your Copy Library is Empty</h3>
            <p class="empty-subtitle">This is where all your text-based creative content lives &mdash; from ad headlines to video scripts. Get started by creating your first piece of copy or let AI generate it for you.</p>
            <div class="empty-actions">
              <button mat-flat-button color="primary" type="button" (click)="toggleCreate()">
                <mat-icon>edit</mat-icon> Write Copy Manually
              </button>
              <button mat-stroked-button type="button" routerLink="/creative/ai">
                <mat-icon>auto_awesome</mat-icon> Generate with AI
              </button>
            </div>

            <div class="empty-workflow">
              <h4>How it works</h4>
              <div class="workflow-steps">
                <div class="workflow-step">
                  <div class="workflow-num">1</div>
                  <mat-icon>edit_note</mat-icon>
                  <strong>Create</strong>
                  <span>Write copy or generate with AI</span>
                </div>
                <mat-icon class="workflow-arrow">arrow_forward</mat-icon>
                <div class="workflow-step">
                  <div class="workflow-num">2</div>
                  <mat-icon>policy</mat-icon>
                  <strong>Review</strong>
                  <span>Run governance &amp; compliance checks</span>
                </div>
                <mat-icon class="workflow-arrow">arrow_forward</mat-icon>
                <div class="workflow-step">
                  <div class="workflow-num">3</div>
                  <mat-icon>check_circle</mat-icon>
                  <strong>Approve</strong>
                  <span>Mark as approved for campaigns</span>
                </div>
                <mat-icon class="workflow-arrow">arrow_forward</mat-icon>
                <div class="workflow-step">
                  <div class="workflow-num">4</div>
                  <mat-icon>campaign</mat-icon>
                  <strong>Deploy</strong>
                  <span>Link to campaigns &amp; ads</span>
                </div>
              </div>
            </div>

            <div class="help-links">
              <p class="help-tip"><mat-icon class="tip-icon">lightbulb</mat-icon> <strong>What goes here?</strong> Ad headlines, body copy, hooks, CTAs, video scripts, UGC briefs, and any text content for your campaigns.</p>
              <p class="help-tip"><mat-icon class="tip-icon">verified</mat-icon> Run <strong>Governance Checks</strong> on copy to verify brand compliance before publishing.</p>
              <p class="help-tip"><mat-icon class="tip-icon">view_carousel</mat-icon> Group related copy into <a routerLink="/creative/variants">Variant Sets</a> for A/B testing.</p>
              <p class="help-tip"><mat-icon class="tip-icon">auto_awesome</mat-icon> Use <a routerLink="/creative/ai">AI Generator</a> to create copy, hooks, video scripts, and UGC briefs automatically.</p>
              <p class="help-tip"><mat-icon class="tip-icon">link</mat-icon> Track where copy is used via <a routerLink="/creative/usage">Usage &amp; Links</a>.</p>
            </div>
          </mat-card>
        } @else {
          <mat-card class="table-card">
            <table mat-table [dataSource]="rows()" class="mat-elevation-z0">
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef matTooltip="The descriptive name you gave this copy artifact">Name</th>
                <td mat-cell *matCellDef="let row">
                  <div class="name-cell">
                    <mat-icon class="row-type-icon">{{ getTypeIcon(row.type) }}</mat-icon>
                    <span>{{ row.name }}</span>
                  </div>
                </td>
              </ng-container>
              <ng-container matColumnDef="type">
                <th mat-header-cell *matHeaderCellDef matTooltip="The category of copy (e.g. Ad Copy, Hook List, Video Script)">Type</th>
                <td mat-cell *matCellDef="let row">
                  <span class="type-chip">{{ formatLabel(row.type) }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef matTooltip="Workflow status: Draft → In Review → Approved / Rejected → Archived">Status</th>
                <td mat-cell *matCellDef="let row">
                  <span class="badge" [class]="'st-' + row.status.toLowerCase()"
                    [matTooltip]="getStatusTooltip(row.status)">{{
                    formatLabel(row.status)
                  }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="governance">
                <th mat-header-cell *matHeaderCellDef matTooltip="Whether this copy has passed a governance compliance check">Governance</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.governanceCheckRunId) {
                    <span class="gov-badge gov-pass" matTooltip="Governance check has been run on this copy">
                      <mat-icon>verified</mat-icon> Checked
                    </span>
                  } @else {
                    <span class="gov-badge gov-none" matTooltip="No governance check run yet &mdash; click to open and run one">
                      <mat-icon>remove_circle_outline</mat-icon> Unchecked
                    </span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="language">
                <th mat-header-cell *matHeaderCellDef matTooltip="ISO language code for this copy (e.g. en, es, fr)">Language</th>
                <td mat-cell *matCellDef="let row">{{ row.language || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef matTooltip="When this copy artifact was first created">Created</th>
                <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'medium' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: displayedColumns"
                class="data-row"
                (click)="openRow(row)"
                matTooltip="Click to view details, edit, run governance checks, or generate variants"
              ></tr>
            </table>
            <mat-paginator
              [length]="totalElements()"
              [pageIndex]="pageIndex()"
              [pageSize]="pageSize()"
              [pageSizeOptions]="[10, 20, 50]"
              (page)="onPage($event)"
            ></mat-paginator>
          </mat-card>

          <div class="table-footer-help">
            <span>Showing {{ rows().length }} of {{ totalElements() }} copy artifacts.</span>
            <span>Need more copy? <a routerLink="/creative/ai" class="footer-link">Generate with AI</a> or <a class="footer-link" (click)="toggleCreate()" style="cursor:pointer">create manually</a>.</span>
          </div>
        }
      }
    </div>
  `,
  styles: [
    `
      .page { padding: 24px; max-width: 1200px; margin: 0 auto; }
      .header { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
      .header-text h1 { margin: 8px 0 0; font-size: 26px; font-weight: 600; color: var(--text-primary); }
      .header-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-secondary); }
      .bc-link { color: var(--color-primary); text-decoration: none; font-weight: 500; }
      .bc-link:hover { text-decoration: underline; }
      .bc-sep { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); line-height: 1; }
      .page-desc { color: var(--text-secondary); font-size: 14px; margin: 4px 0 0; max-width: 680px; line-height: 1.55; }

      /* Guide card */
      .guide-card { margin-bottom: 20px; padding: 24px; border-radius: var(--radius-md); border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent); background: color-mix(in srgb, var(--color-primary) 4%, transparent); }
      .guide-header { display: flex; justify-content: space-between; align-items: flex-start; }
      .guide-title-row { display: flex; align-items: center; gap: 10px; }
      .guide-icon { color: var(--color-primary); font-size: 28px; width: 28px; height: 28px; line-height: 1; }
      .guide-title { margin: 0; font-size: 18px; font-weight: 600; color: var(--text-primary); }
      .guide-intro { font-size: 14px; color: var(--text-secondary); line-height: 1.55; margin: 12px 0 20px; max-width: 720px; }
      .guide-steps { display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px; }
      .guide-step { display: flex; align-items: flex-start; gap: 12px; }
      .step-number { width: 28px; height: 28px; border-radius: 50%; background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
      .step-body { display: flex; flex-direction: column; gap: 2px; }
      .step-body strong { font-size: 14px; color: var(--text-primary); }
      .step-body span { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
      .step-body a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .step-body a:hover { text-decoration: underline; }
      .guide-subtitle { font-size: 15px; font-weight: 600; color: var(--text-primary); margin: 0 0 12px; }
      .guide-types { margin-bottom: 24px; }
      .type-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 10px; }
      .type-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 12px; border-radius: var(--radius-md); background: var(--bg-surface); border: 1px solid var(--border-default); }
      .type-icon { color: var(--color-primary); font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; margin-top: 1px; line-height: 1; }
      .type-item div { display: flex; flex-direction: column; gap: 2px; }
      .type-item strong { font-size: 13px; color: var(--text-primary); }
      .type-item span { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }
      .guide-nav { }
      .guide-links { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
      .guide-link { display: flex; align-items: flex-start; gap: 10px; padding: 12px; border-radius: var(--radius-md); background: var(--bg-surface); border: 1px solid var(--border-default); text-decoration: none; transition: border-color 0.15s; }
      .guide-link:hover { border-color: var(--color-primary); }
      .guide-link mat-icon { color: var(--color-primary); font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; margin-top: 2px; line-height: 1; }
      .guide-link div { display: flex; flex-direction: column; gap: 2px; }
      .guide-link strong { font-size: 13px; color: var(--text-primary); }
      .guide-link span { font-size: 12px; color: var(--text-secondary); line-height: 1.4; }

      /* Callout */
      .callout { display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px; border-radius: var(--radius-md); }
      .callout-warn { background: color-mix(in srgb, var(--color-warn, #f9a825) 12%, transparent); border: 1px solid var(--border-default); }
      .callout-warn strong { color: var(--text-primary); }
      .callout-warn p { margin: 4px 0 0; font-size: 13px; color: var(--text-secondary); }

      /* Filters */
      .filters-card { margin-bottom: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-default); }
      .filters-header { display: flex; align-items: center; gap: 8px; padding: 12px 16px 0; }
      .filter-header-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-secondary); line-height: 1; }
      .filter-header-text { font-size: 13px; font-weight: 600; color: var(--text-primary); }
      .filter-hint { font-size: 12px; color: var(--text-muted); margin-left: 4px; }
      .filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-start; padding: 8px 16px 8px; }
      .filter-field { width: 180px; }
      .filter-grow { flex: 1; min-width: 200px; }
      .search-prefix-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); margin-right: 4px; line-height: 1; }

      /* Create card */
      .create-card { margin-bottom: 20px; border-radius: var(--radius-md); border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent); }
      .create-grid { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; }
      .full { width: 100%; }
      .half { width: 280px; }
      .create-tip { display: flex; align-items: center; gap: 8px; padding: 8px 16px; margin: 0 16px 8px; border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-primary) 6%, transparent); font-size: 13px; color: var(--text-secondary); }
      .create-tip mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); flex-shrink: 0; line-height: 1; }
      .create-tip a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .create-tip a:hover { text-decoration: underline; }

      /* Help banner */
      .help-banner { display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px; margin-bottom: 16px; border-radius: var(--radius-md); border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent); background: color-mix(in srgb, var(--color-primary) 5%, transparent); }
      .help-icon { color: var(--color-primary); font-size: 22px; width: 22px; height: 22px; flex-shrink: 0; margin-top: 2px; line-height: 1; }
      .help-content { display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: var(--text-secondary); flex: 1; }
      .help-main { display: flex; flex-direction: column; gap: 3px; }
      .help-main strong { color: var(--text-primary); font-size: 13px; }
      .help-status-legend { display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; color: var(--text-muted); }
      .legend-item { display: flex; align-items: center; gap: 4px; }
      .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .legend-dot.st-draft { background: var(--text-secondary, #888); }
      .legend-dot.st-in_review { background: #1976d2; }
      .legend-dot.st-approved { background: #2e7d32; }
      .legend-dot.st-rejected { background: #c62828; }
      .legend-dot.st-archived { background: var(--text-muted, #aaa); }
      .help-nav a { color: var(--color-primary); font-weight: 500; text-decoration: none; font-size: 12px; }
      .help-nav a:hover { text-decoration: underline; }

      /* Spinner */
      .spinner-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px; gap: 16px; }
      .loading-text { font-size: 14px; color: var(--text-muted); }

      /* Empty state */
      .empty-card { text-align: center; padding: 48px 32px; color: var(--text-muted); border-radius: var(--radius-md); border: 1px solid var(--border-default); }
      .empty-icon { font-size: 56px; width: 56px; height: 56px; opacity: 0.4; }
      .empty-card h3 { margin: 16px 0 8px; font-size: 20px; font-weight: 600; color: var(--text-primary); }
      .empty-subtitle { font-size: 14px; color: var(--text-secondary); max-width: 540px; margin: 0 auto; line-height: 1.55; }
      .empty-actions { margin: 24px 0; display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }

      /* Workflow steps in empty state */
      .empty-workflow { margin: 28px auto 24px; max-width: 680px; }
      .empty-workflow h4 { font-size: 14px; font-weight: 600; color: var(--text-primary); margin: 0 0 16px; }
      .workflow-steps { display: flex; align-items: flex-start; justify-content: center; gap: 8px; flex-wrap: wrap; }
      .workflow-step { display: flex; flex-direction: column; align-items: center; gap: 4px; width: 120px; text-align: center; position: relative; }
      .workflow-num { width: 22px; height: 22px; border-radius: 50%; background: var(--color-primary); color: #fff; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
      .workflow-step mat-icon { font-size: 24px; width: 24px; height: 24px; color: var(--color-primary); line-height: 1; }
      .workflow-step strong { font-size: 12px; color: var(--text-primary); }
      .workflow-step span { font-size: 11px; color: var(--text-secondary); line-height: 1.4; }
      .workflow-arrow { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); margin-top: 22px; flex-shrink: 0; line-height: 1; }

      .help-links { text-align: left; max-width: 520px; margin: 0 auto; }
      .help-tip { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--text-secondary); margin: 8px 0; line-height: 1.5; }
      .help-tip a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .help-tip a:hover { text-decoration: underline; }
      .tip-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); flex-shrink: 0; margin-top: 1px; line-height: 1; }

      /* Table */
      .table-card { border-radius: var(--radius-md); border: 1px solid var(--border-default); overflow: hidden; }
      .data-row { cursor: pointer; }
      .data-row:hover { background: var(--bg-surface-hover); }
      .name-cell { display: flex; align-items: center; gap: 8px; }
      .row-type-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); flex-shrink: 0; line-height: 1; }
      .type-chip { font-size: 12px; color: var(--text-secondary); background: var(--bg-surface-hover, #f5f5f5); padding: 2px 8px; border-radius: var(--radius-md); }
      .badge { font-size: 12px; padding: 2px 8px; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.03em; font-weight: 500; }
      .badge.st-approved { color: #2e7d32; background: color-mix(in srgb, #2e7d32 12%, transparent); }
      .badge.st-draft { color: var(--text-secondary); background: var(--bg-surface-hover); }
      .badge.st-in_review { color: #1565c0; background: color-mix(in srgb, #1565c0 12%, transparent); }
      .badge.st-rejected { color: #c62828; background: color-mix(in srgb, #c62828 12%, transparent); }
      .badge.st-archived { color: var(--text-muted); background: var(--bg-surface-hover); }
      .gov-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; line-height: 1; }
      .gov-badge mat-icon { font-size: 16px; width: 16px; height: 16px; line-height: 1; vertical-align: middle; }
      .gov-pass { color: #2e7d32; }
      .gov-none { color: var(--text-muted); }

      .table-footer-help { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; font-size: 12px; color: var(--text-muted); flex-wrap: wrap; gap: 4px; }
      .footer-link { color: var(--color-primary); text-decoration: none; font-weight: 500; }
      .footer-link:hover { text-decoration: underline; }
    `,
  ],
})
export class CopyListComponent implements OnInit {
  private readonly copyApi = inject(CreativeCopyApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  readonly copyTypes = [...COPY_TYPES];
  readonly copyStatuses = [...COPY_STATUSES];

  readonly displayedColumns = ['name', 'type', 'status', 'governance', 'language', 'createdAt'];

  readonly loading = signal(false);
  readonly rows = signal<CopyArtifactResponse[]>([]);
  readonly totalElements = signal(0);
  readonly pageIndex = signal(0);
  readonly pageSize = signal(20);
  readonly showCreate = signal(false);
  readonly showGuide = signal(false);

  filterType = '';
  filterStatus = '';
  filterLanguage = '';
  searchQuery = '';

  createName = '';
  createType = 'AD_COPY';
  createContent = '';
  createLanguage = 'en';

  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  private static readonly TYPE_DESCRIPTIONS: Record<string, string> = {
    AD_COPY: 'Headlines, descriptions, and body text for paid ads across platforms.',
    HOOK_LIST: 'Attention-grabbing opening lines that stop the scroll and engage viewers.',
    ANGLE_LIST: 'Different messaging perspectives to reach distinct audience segments.',
    CTA_LIST: 'Call-to-action phrases that drive clicks, signups, and conversions.',
    SOCIAL_CAPTION: 'Captions for organic and paid social media posts.',
    VIDEO_SCRIPT: 'Scene-by-scene scripts for video ads, reels, and promotional content.',
    STORYBOARD: 'Visual narrative outlines combining scene descriptions with dialogue.',
    UGC_BRIEF: 'Detailed creator briefs for user-generated content campaigns.',
    LANDING_COPY: 'Text content for landing pages: headlines, value props, and CTAs.',
    EMAIL_COPY: 'Subject lines, preview text, and body content for email campaigns.',
    SMS_COPY: 'Short text messages for SMS marketing campaigns.',
  };

  private static readonly TYPE_ICONS: Record<string, string> = {
    AD_COPY: 'campaign',
    HOOK_LIST: 'bolt',
    ANGLE_LIST: 'psychology',
    CTA_LIST: 'touch_app',
    SOCIAL_CAPTION: 'tag',
    VIDEO_SCRIPT: 'videocam',
    STORYBOARD: 'view_comfy',
    UGC_BRIEF: 'person_pin',
    LANDING_COPY: 'web',
    EMAIL_COPY: 'email',
    SMS_COPY: 'sms',
  };

  private static readonly CONTENT_PLACEHOLDERS: Record<string, string> = {
    AD_COPY: 'e.g. "Unlock 50% off your first order — limited time only. Shop the collection that\'s redefining style."',
    HOOK_LIST: 'e.g. "What if I told you everything you know about skincare is wrong?"',
    ANGLE_LIST: 'e.g. "Pain point: frustrated with slow delivery → Our same-day shipping solves it"',
    CTA_LIST: 'e.g. "Shop Now | Get Started Free | Claim Your Discount | Try Risk-Free"',
    SOCIAL_CAPTION: 'e.g. "We just dropped something big. 👀 Link in bio to see what\'s new. #NewArrivals"',
    VIDEO_SCRIPT: 'e.g. "Scene 1: Close-up of product. VO: \'Meet the tool that changed everything...\'"',
    STORYBOARD: 'e.g. "Frame 1: Wide shot of kitchen. Character picks up product. Text overlay: \'Before & After\'"',
    UGC_BRIEF: 'e.g. "We\'re looking for creators to showcase our product in their daily routine. Film a 30-60s video..."',
    LANDING_COPY: 'e.g. "Hero: The smarter way to manage your finances. Sub: Join 10,000+ users who..."',
    EMAIL_COPY: 'e.g. "Subject: Your exclusive access starts now\nPreview: Don\'t miss out on 40% off\nBody: Hi {{name}}..."',
    SMS_COPY: 'e.g. "🎉 Flash sale! 30% off everything for the next 24 hours. Shop now: {{link}}"',
  };

  private static readonly STATUS_TOOLTIPS: Record<string, string> = {
    DRAFT: 'Draft — This copy is being written and can be freely edited.',
    IN_REVIEW: 'In Review — This copy has been submitted for approval.',
    APPROVED: 'Approved — This copy has been approved and is ready to use in campaigns.',
    REJECTED: 'Rejected — This copy was not approved and needs revisions.',
    ARCHIVED: 'Archived — This copy has been retired and is no longer active.',
  };

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.loading.set(true);
    this.copyApi
      .listCopy(ws, {
        type: this.filterType || undefined,
        status: this.filterStatus || undefined,
        language: this.filterLanguage.trim() || undefined,
        q: this.searchQuery.trim() || undefined,
        page: this.pageIndex(),
        size: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.rows.set(res.content ?? []);
          this.totalElements.set(res.totalElements ?? 0);
          this.loading.set(false);
        },
        error: (e) => {
          this.loading.set(false);
          this.notify.error(e?.error?.message ?? 'Failed to load copy');
        },
      });
  }

  applyFilters(): void {
    this.pageIndex.set(0);
    this.load();
  }

  clearFilters(): void {
    this.filterType = '';
    this.filterStatus = '';
    this.filterLanguage = '';
    this.searchQuery = '';
    this.applyFilters();
  }

  onPage(ev: PageEvent): void {
    this.pageIndex.set(ev.pageIndex);
    this.pageSize.set(ev.pageSize);
    this.load();
  }

  toggleCreate(): void {
    this.showCreate.update((v) => !v);
  }

  submitCreate(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.copyApi
      .createCopy(ws, {
        name: this.createName.trim(),
        type: this.createType,
        contentText: this.createContent,
        language: this.createLanguage.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.notify.success('Copy created');
          this.createName = '';
          this.createContent = '';
          this.createLanguage = 'en';
          this.showCreate.set(false);
          this.applyFilters();
        },
        error: (e) => this.notify.error(e?.error?.message ?? 'Create failed'),
      });
  }

  openRow(row: CopyArtifactResponse): void {
    void this.router.navigate(['/creative/copy', row.id]);
  }

  formatLabel(v: string): string {
    return v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  getTypeDescription(type: string): string {
    return CopyListComponent.TYPE_DESCRIPTIONS[type] ?? '';
  }

  getTypeIcon(type: string): string {
    return CopyListComponent.TYPE_ICONS[type] ?? 'text_snippet';
  }

  getContentPlaceholder(type: string): string {
    return CopyListComponent.CONTENT_PLACEHOLDERS[type] ?? 'Enter your copy content here...';
  }

  getStatusTooltip(status: string): string {
    return CopyListComponent.STATUS_TOOLTIPS[status] ?? '';
  }
}
