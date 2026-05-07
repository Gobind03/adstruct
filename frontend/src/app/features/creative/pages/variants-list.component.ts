import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { VariantResponse, VariantSetResponse } from '../models/creative.models';
import { CreativeVariantsApiService } from '../services/creative-variants-api.service';

const PARENT_ENTITY_TYPES = ['ASSET', 'COPY'] as const;
const VARIANT_ENTITY_TYPES = ['ASSET_VERSION', 'COPY_ARTIFACT'] as const;

const ENTITY_TYPE_LABELS: Record<string, string> = {
  ASSET: 'Asset',
  COPY: 'Copy Artifact',
  ASSET_VERSION: 'Asset Version',
  COPY_ARTIFACT: 'Copy Artifact',
};

const PARENT_TYPE_DESCRIPTIONS: Record<string, string> = {
  ASSET: 'Group variants of a creative asset (image, video, etc.)',
  COPY: 'Group variants of a copy artifact (ad copy, hooks, scripts, etc.)',
};

const VARIANT_TYPE_DESCRIPTIONS: Record<string, string> = {
  ASSET_VERSION: 'A specific version of a creative asset',
  COPY_ARTIFACT: 'A copy artifact such as ad copy, hook, or CTA',
};

@Component({
  selector: 'app-variants-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTooltipModule,
    RouterModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <header class="header">
        <div class="header-text">
          <nav class="breadcrumb">
            <a routerLink="/creative/assets" class="bc-link">Creative Studio</a>
            <mat-icon class="bc-sep">chevron_right</mat-icon>
            <span>Variant Sets</span>
          </nav>
          <h1>Variant Sets</h1>
          <p class="page-desc">
            Variant Sets let you group related creative variations — different headlines, images, or ad copy — so you
            can <strong>A/B test</strong> them side by side and compare performance. Each set is linked to a parent
            asset or copy artifact and contains the alternative versions you want to test.
          </p>
        </div>
        <button
          mat-flat-button
          color="primary"
          type="button"
          (click)="toggleNewSet()"
          matTooltip="Create a new variant set to group creative variations for testing"
        >
          <mat-icon>add</mat-icon>
          New Variant Set
        </button>
      </header>

      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon>workspaces</mat-icon>
          <p>Select a workspace from the sidebar to manage your variant sets.</p>
        </mat-card>
      } @else {
        <!-- Dismissible workflow guide -->
        @if (!showNewSet() && showWorkflowGuide()) {
          <mat-card class="lifecycle-card">
            <div class="lifecycle-header">
              <mat-icon>route</mat-icon>
              <h3>How Variant Sets Work</h3>
              <button mat-icon-button type="button" (click)="dismissWorkflowGuide()" matTooltip="Dismiss this guide" class="dismiss-btn">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <p class="lifecycle-intro">Variant Sets are the backbone of creative testing. Here's the typical workflow:</p>
            <div class="lifecycle-steps">
              <div class="lc-step">
                <div class="lc-num">1</div>
                <div class="lc-body">
                  <strong>Create or Generate</strong>
                  <span>Create a set manually, or let the <a routerLink="/creative/ai">AI Generator</a> auto-create one when generating ad copy variants.</span>
                </div>
              </div>
              <mat-icon class="lc-arrow">arrow_forward</mat-icon>
              <div class="lc-step">
                <div class="lc-num">2</div>
                <div class="lc-body">
                  <strong>Link to Parent</strong>
                  <span>Each set is tied to a parent — an <a routerLink="/creative/assets">Asset</a> or <a routerLink="/creative/copy">Copy Artifact</a> — so you know what's being tested.</span>
                </div>
              </div>
              <mat-icon class="lc-arrow">arrow_forward</mat-icon>
              <div class="lc-step">
                <div class="lc-num">3</div>
                <div class="lc-body">
                  <strong>Add Variants</strong>
                  <span>Add alternative versions (asset versions or copy artifacts) as variants inside the set.</span>
                </div>
              </div>
              <mat-icon class="lc-arrow">arrow_forward</mat-icon>
              <div class="lc-step">
                <div class="lc-num">4</div>
                <div class="lc-body">
                  <strong>Track & Compare</strong>
                  <span>Use <a routerLink="/creative/usage">Usage & Links</a> to see which variants are deployed, and compare scores.</span>
                </div>
              </div>
            </div>
          </mat-card>
        }

        @if (showNewSet()) {
          <mat-card class="form-card">
            <mat-card-header>
              <mat-card-title>Create a New Variant Set</mat-card-title>
              <mat-card-subtitle>
                A variant set groups alternative versions of a creative together. Pick the parent asset or copy artifact
                you want to test, give it a name, and define your testing strategy.
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content class="form-grid">
              <mat-form-field appearance="outline" class="full">
                <mat-label>Set Name</mat-label>
                <input matInput [(ngModel)]="newSetName" name="nsn" required placeholder="e.g. Homepage Hero — Q1 Headline Test" />
                <mat-hint>A descriptive name so you can identify this test later</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Parent Type</mat-label>
                <mat-select [(ngModel)]="newSetParentType" name="nspt" required>
                  @for (t of parentEntityTypes; track t) {
                    <mat-option [value]="t" [matTooltip]="parentTypeDescription(t)">{{ entityTypeLabel(t) }}</mat-option>
                  }
                </mat-select>
                <mat-hint>
                  @if (newSetParentType === 'ASSET') {
                    Variants will be different versions of a creative asset (image, video, etc.)
                  } @else {
                    Variants will be different versions of a copy artifact (headlines, ad copy, etc.)
                  }
                </mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Parent ID</mat-label>
                <input matInput [(ngModel)]="newSetParentId" name="nspi" placeholder="Paste the UUID of the parent asset or copy artifact" required />
                <mat-hint>
                  Find IDs in the
                  @if (newSetParentType === 'ASSET') {
                    <a routerLink="/creative/assets" class="hint-link">Assets Library</a>
                  } @else {
                    <a routerLink="/creative/copy" class="hint-link">Copy Library</a>
                  }
                  — click any item to see its ID
                </mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="full">
                <mat-label>Testing Strategy</mat-label>
                <input matInput [(ngModel)]="newSetStrategy" name="nss" required placeholder="e.g. A/B split test, multivariate, sequential" />
                <mat-hint>Describe how you plan to test these variants (e.g. "A/B split test on Facebook Ads")</mat-hint>
              </mat-form-field>
            </mat-card-content>
            <mat-card-actions align="end">
              <button mat-button type="button" (click)="toggleNewSet()">Cancel</button>
              <button
                mat-flat-button
                color="primary"
                type="button"
                [disabled]="!canSubmitNewSet()"
                (click)="submitNewSet()"
                matTooltip="Create the variant set and start adding variants"
              >
                Create Set
              </button>
            </mat-card-actions>
          </mat-card>
        }

        @if (!showNewSet() && sets().length > 0) {
          <mat-card class="help-banner">
            <mat-icon class="help-icon">tips_and_updates</mat-icon>
            <div class="help-content">
              <span><strong>Click any set below</strong> to expand it and see its variants. You can add new variants manually, or use the <strong>AI Generator</strong> to automatically create variant sets with copy alternatives.</span>
              <span class="help-nav">
                Related:
                <a routerLink="/creative/copy">Copy Library</a> &middot;
                <a routerLink="/creative/ai">AI Generator</a> &middot;
                <a routerLink="/creative/assets">Assets Library</a> &middot;
                <a routerLink="/creative/usage">Usage & Links</a>
              </span>
            </div>
          </mat-card>
        }

        @if (loading()) {
          <div class="spinner-wrap">
            <mat-spinner diameter="48"></mat-spinner>
          </div>
        } @else if (sets().length === 0) {
          <mat-card class="empty-card">
            <mat-icon>layers</mat-icon>
            <h3>No variant sets yet</h3>
            <p>
              Variant sets let you group creative variations — like different headlines or images — so you can
              test which performs best. Create one manually or let AI generate variants for you.
            </p>
            <div class="empty-actions">
              <button mat-flat-button color="primary" type="button" (click)="toggleNewSet()" matTooltip="Manually create a variant set by choosing a parent creative">
                <mat-icon>add</mat-icon> Create First Set
              </button>
              <button mat-stroked-button type="button" routerLink="/creative/ai" matTooltip="Use AI to generate ad copy variants — a variant set is created automatically">
                <mat-icon>auto_awesome</mat-icon> Generate with AI
              </button>
            </div>
            <div class="help-links">
              <p class="help-tip">
                <mat-icon class="tip-icon">lightbulb</mat-icon>
                <span><strong>What is a variant set?</strong> It's a container that holds alternative versions of the same creative — e.g. three headline options for the same ad. Each variant links to a copy artifact or asset version.</span>
              </p>
              <p class="help-tip">
                <mat-icon class="tip-icon">auto_awesome</mat-icon>
                <span><strong>Easiest way to start:</strong> Go to the <a routerLink="/creative/ai">AI Generator</a> and generate ad copy. It automatically creates a variant set with all the generated options.</span>
              </p>
              <p class="help-tip">
                <mat-icon class="tip-icon">share</mat-icon>
                <span><strong>Track performance:</strong> Once variants are live, use <a routerLink="/creative/usage">Usage & Links</a> to see which campaigns are using which variants and compare results.</span>
              </p>
              <p class="help-tip">
                <mat-icon class="tip-icon">text_snippet</mat-icon>
                <span><strong>Need creatives first?</strong> Add text content in the <a routerLink="/creative/copy">Copy Library</a> or upload media in the <a routerLink="/creative/assets">Assets Library</a>, then group them here for testing.</span>
              </p>
            </div>
          </mat-card>
        } @else {
          <p class="sets-count">{{ sets().length }} variant {{ sets().length === 1 ? 'set' : 'sets' }}</p>
          <mat-accordion class="accordion" multi>
            @for (set of sets(); track set.id) {
              <mat-expansion-panel (opened)="onPanelOpened(set.id)">
                <mat-expansion-panel-header>
                  <mat-panel-title class="panel-title">
                    <span class="set-name">{{ set.name }}</span>
                    <span class="meta">
                      <mat-icon class="meta-icon">{{ set.parentEntityType === 'ASSET' ? 'image' : 'text_snippet' }}</mat-icon>
                      Parent: {{ entityTypeLabel(set.parentEntityType) }}
                    </span>
                  </mat-panel-title>
                  <mat-panel-description>
                    <span matTooltip="Testing strategy for this variant set">{{ set.strategy || 'No strategy' }}</span>
                    <span class="desc-sep">&middot;</span>
                    <span>{{ set.createdAt | date: 'mediumDate' }}</span>
                  </mat-panel-description>
                </mat-expansion-panel-header>
                <div class="panel-body">
                  <div class="panel-meta-bar">
                    <div class="panel-meta-item" matTooltip="The unique ID of this variant set">
                      <span class="panel-meta-label">Set ID</span>
                      <span class="mono">{{ set.id }}</span>
                    </div>
                    <div class="panel-meta-item" matTooltip="The parent entity this variant set is testing against">
                      <span class="panel-meta-label">Parent ID</span>
                      <span class="mono">{{ set.parentEntityId }}</span>
                    </div>
                  </div>
                  <div class="toolbar">
                    <button
                      mat-stroked-button
                      type="button"
                      (click)="toggleAddVariant(set.id)"
                      matTooltip="Add an existing asset version or copy artifact as a variant in this set"
                    >
                      <mat-icon>add</mat-icon>
                      Add Variant
                    </button>
                  </div>
                  @if (showAddVariantFor() === set.id) {
                    <mat-card class="inline-form">
                      <p class="inline-form-hint">
                        Add a creative variant to this set. Pick whether it's an asset version or copy artifact,
                        then paste its ID.
                      </p>
                      <mat-card-content class="row">
                        <mat-form-field appearance="outline" class="grow">
                          <mat-label>Variant Type</mat-label>
                          <mat-select [(ngModel)]="addVariantEntityType" [name]="'aet' + set.id" required>
                            @for (t of variantEntityTypes; track t) {
                              <mat-option [value]="t" [matTooltip]="variantTypeDescription(t)">{{ entityTypeLabel(t) }}</mat-option>
                            }
                          </mat-select>
                          <mat-hint>What kind of creative is this variant?</mat-hint>
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="grow">
                          <mat-label>Entity ID</mat-label>
                          <input
                            matInput
                            [(ngModel)]="addVariantEntityId"
                            [name]="'aei' + set.id"
                            placeholder="Paste the UUID of the variant"
                          />
                          <mat-hint>
                            Find in
                            @if (addVariantEntityType === 'ASSET_VERSION') {
                              <a routerLink="/creative/assets" class="hint-link">Assets</a>
                            } @else {
                              <a routerLink="/creative/copy" class="hint-link">Copy Library</a>
                            }
                          </mat-hint>
                        </mat-form-field>
                        <mat-form-field appearance="outline" class="grow">
                          <mat-label>Notes (optional)</mat-label>
                          <input
                            matInput
                            [(ngModel)]="addVariantNotes"
                            [name]="'an' + set.id"
                            placeholder="e.g. Shorter headline, emotional tone"
                          />
                          <mat-hint>Brief note to describe what makes this variant different</mat-hint>
                        </mat-form-field>
                        <button
                          mat-flat-button
                          color="primary"
                          type="button"
                          [disabled]="!addVariantEntityType || !addVariantEntityId.trim()"
                          (click)="submitAddVariant(set.id)"
                          matTooltip="Save this variant to the set"
                        >
                          Save
                        </button>
                        <button mat-button type="button" (click)="toggleAddVariant(set.id)">Cancel</button>
                      </mat-card-content>
                    </mat-card>
                  }
                  @if (variantsLoading()[set.id]) {
                    <div class="mini-spinner">
                      <mat-spinner diameter="32"></mat-spinner>
                    </div>
                  } @else if ((variantsBySet()[set.id] ?? []).length === 0) {
                    <div class="empty-variants">
                      <mat-icon class="empty-variants-icon">playlist_add</mat-icon>
                      <p><strong>No variants in this set yet.</strong></p>
                      <p class="empty-variants-desc">Click <strong>Add Variant</strong> above to link asset versions or copy artifacts to this set, or use the <a routerLink="/creative/ai">AI Generator</a> to create them automatically.</p>
                    </div>
                  } @else {
                    <table mat-table [dataSource]="variantsBySet()[set.id] ?? []" class="mat-elevation-z0">
                      <ng-container matColumnDef="variantIndex">
                        <th mat-header-cell *matHeaderCellDef matTooltip="The order of this variant within the set">#</th>
                        <td mat-cell *matCellDef="let v">{{ v.variantIndex }}</td>
                      </ng-container>
                      <ng-container matColumnDef="entityType">
                        <th mat-header-cell *matHeaderCellDef matTooltip="Whether this variant is an asset version or copy artifact">Type</th>
                        <td mat-cell *matCellDef="let v">{{ entityTypeLabel(v.entityType) }}</td>
                      </ng-container>
                      <ng-container matColumnDef="entityId">
                        <th mat-header-cell *matHeaderCellDef matTooltip="The unique ID of the linked creative entity">Entity ID</th>
                        <td mat-cell *matCellDef="let v" class="mono">{{ v.entityId }}</td>
                      </ng-container>
                      <ng-container matColumnDef="score">
                        <th mat-header-cell *matHeaderCellDef matTooltip="Performance score assigned to this variant (if available)">Score</th>
                        <td mat-cell *matCellDef="let v">{{ v.score ?? '—' }}</td>
                      </ng-container>
                      <ng-container matColumnDef="notes">
                        <th mat-header-cell *matHeaderCellDef matTooltip="Notes describing what makes this variant different">Notes</th>
                        <td mat-cell *matCellDef="let v">{{ v.notes || '—' }}</td>
                      </ng-container>
                      <tr mat-header-row *matHeaderRowDef="variantColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: variantColumns"></tr>
                    </table>
                    <p class="variant-count-hint">{{ (variantsBySet()[set.id] ?? []).length }} variant{{ (variantsBySet()[set.id] ?? []).length === 1 ? '' : 's' }} in this set</p>
                  }
                </div>
              </mat-expansion-panel>
            }
          </mat-accordion>
        }
      }
    </div>
  `,
  styles: [
    `
      .page {
        padding: 24px;
        max-width: 960px;
        margin: 0 auto;
      }
      .header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 20px;
      }
      .header-text h1 {
        margin: 8px 0 0;
        font-size: 26px;
        font-weight: 600;
        color: var(--text-primary);
      }
      .breadcrumb {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 13px;
        line-height: 1;
        color: var(--text-secondary);
      }
      .bc-link {
        color: var(--color-primary);
        text-decoration: none;
        font-weight: 500;
      }
      .bc-link:hover {
        text-decoration: underline;
      }
      .bc-sep {
        font-size: 18px;
        width: 18px;
        height: 18px;
        line-height: 18px;
        color: var(--text-muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .callout {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        border-radius: var(--radius-md);
      }
      .callout mat-icon {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .callout-warn {
        background: color-mix(in srgb, var(--color-warn, #f9a825) 12%, transparent);
        border: 1px solid var(--border-default);
      }
      .form-card {
        margin-bottom: 20px;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-default);
      }
      .form-grid {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-top: 8px;
      }
      .full {
        width: 100%;
      }
      .spinner-wrap {
        display: flex;
        justify-content: center;
        padding: 64px;
      }
      .empty-card {
        text-align: center;
        padding: 48px;
        color: var(--text-muted);
      }
      .empty-card mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        line-height: 48px;
        opacity: 0.5;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .accordion {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .panel-title {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }
      .set-name {
        font-weight: 600;
      }
      .meta {
        font-size: 12px;
        line-height: 16px;
        color: var(--text-secondary);
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .meta-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
        line-height: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .desc-sep {
        margin: 0 4px;
        color: var(--text-muted);
      }
      :host ::ng-deep .mat-expansion-panel-header-description {
        display: flex;
        align-items: center;
      }
      .panel-body {
        padding: 8px 0 16px;
      }
      .panel-meta-bar {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
        padding: 8px 12px;
        margin-bottom: 12px;
        background: var(--bg-surface-hover, #f5f5f5);
        border-radius: var(--radius-sm, 4px);
        font-size: 12px;
      }
      .panel-meta-item {
        display: inline-flex;
        align-items: baseline;
        gap: 6px;
      }
      .panel-meta-label {
        color: var(--text-muted);
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-size: 11px;
      }
      .toolbar {
        margin-bottom: 12px;
      }
      .inline-form {
        margin-bottom: 16px;
        border: 1px solid var(--border-default);
      }
      .inline-form-hint {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 0 0 8px;
        padding: 12px 16px 0;
        line-height: 1.5;
      }
      .row {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: flex-start;
      }
      .row > button {
        margin-top: 10px;
        white-space: nowrap;
      }
      .grow {
        flex: 1;
        min-width: 160px;
      }
      .mini-spinner {
        display: flex;
        justify-content: center;
        padding: 16px;
      }
      .muted {
        color: var(--text-muted);
        margin: 0;
      }
      .mono {
        font-family: ui-monospace, monospace;
        font-size: 12px;
      }
      table {
        width: 100%;
      }
      .page-desc {
        color: var(--text-secondary);
        font-size: 14px;
        margin: 4px 0 0;
        max-width: 640px;
        line-height: 1.6;
      }
      .sets-count {
        font-size: 13px;
        color: var(--text-muted);
        margin: 0 0 8px;
      }
      .empty-card h3 { margin: 12px 0 4px; font-size: 18px; font-weight: 600; color: var(--text-primary); }
      .empty-actions { margin: 16px 0; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; align-items: center; }
      .help-links { text-align: left; max-width: 520px; margin: 24px auto 0; }
      .help-tip { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; color: var(--text-secondary); margin: 10px 0; line-height: 20px; }
      .help-tip > span { flex: 1; }
      .help-tip a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
      .help-tip a:hover { text-decoration: underline; }
      .tip-icon {
        font-size: 18px;
        width: 18px;
        height: 20px;
        line-height: 20px;
        color: var(--color-primary);
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .help-banner {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 14px 16px;
        margin-bottom: 16px;
        border-radius: var(--radius-md);
        border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
        background: color-mix(in srgb, var(--color-primary) 5%, transparent);
      }
      .help-icon {
        color: var(--color-primary);
        font-size: 22px;
        width: 22px;
        height: 22px;
        line-height: 22px;
        flex-shrink: 0;
        margin-top: 1px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .help-content {
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 13px;
        line-height: 1.5;
        color: var(--text-secondary);
      }
      .help-nav { line-height: 1.5; }
      .help-nav a { color: var(--color-primary); font-weight: 500; text-decoration: none; font-size: 12px; }
      .help-nav a:hover { text-decoration: underline; }
      .hint-link { color: var(--color-primary); text-decoration: none; font-weight: 500; }
      .hint-link:hover { text-decoration: underline; }
      .empty-variants {
        text-align: center;
        padding: 24px 16px;
        color: var(--text-muted);
      }
      .empty-variants-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        line-height: 32px;
        opacity: 0.5;
        margin-bottom: 4px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .empty-variants p { margin: 4px 0; }
      .empty-variants-desc {
        font-size: 13px;
        max-width: 420px;
        margin: 4px auto 0;
        line-height: 1.5;
      }
      .empty-variants-desc a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
      .empty-variants-desc a:hover { text-decoration: underline; }
      .variant-count-hint {
        font-size: 12px;
        color: var(--text-muted);
        margin: 8px 0 0;
        text-align: right;
      }

      /* Lifecycle / workflow guide card — mirrors Assets page pattern */
      .lifecycle-card {
        margin-bottom: 20px;
        padding: 20px 24px 24px;
        border-radius: var(--radius-md);
        border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
        background: color-mix(in srgb, var(--color-primary) 4%, transparent);
      }
      .lifecycle-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }
      .lifecycle-header > mat-icon {
        color: var(--color-primary);
        font-size: 22px;
        width: 22px;
        height: 22px;
        line-height: 22px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .lifecycle-header h3 { margin: 0; font-size: 16px; font-weight: 600; line-height: 22px; color: var(--text-primary); flex: 1; }
      .lifecycle-intro { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; line-height: 1.5; }
      .dismiss-btn { margin-left: auto; }
      .lifecycle-steps {
        display: flex;
        flex-wrap: wrap;
        align-items: stretch;
        gap: 8px;
      }
      .lc-step {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        flex: 1;
        min-width: 160px;
      }
      .lc-num {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--color-primary);
        color: #fff;
        font-size: 13px;
        font-weight: 600;
        line-height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .lc-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 13px;
        line-height: 1.5;
      }
      .lc-body strong { color: var(--text-primary); line-height: 24px; }
      .lc-body span { color: var(--text-secondary); line-height: 1.5; }
      .lc-body a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
      .lc-body a:hover { text-decoration: underline; }
      .lc-arrow {
        color: var(--text-muted);
        font-size: 18px;
        width: 18px;
        height: 18px;
        line-height: 18px;
        margin-top: 3px;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    `,
  ],
})
export class VariantsListComponent implements OnInit {
  private readonly variantsApi = inject(CreativeVariantsApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);

  readonly parentEntityTypes = [...PARENT_ENTITY_TYPES];
  readonly variantEntityTypes = [...VARIANT_ENTITY_TYPES];
  readonly variantColumns = ['variantIndex', 'entityType', 'entityId', 'score', 'notes'];

  readonly loading = signal(false);
  readonly sets = signal<VariantSetResponse[]>([]);
  readonly variantsBySet = signal<Record<string, VariantResponse[]>>({});
  readonly variantsLoading = signal<Record<string, boolean>>({});

  readonly showNewSet = signal(false);
  readonly showAddVariantFor = signal<string | null>(null);
  readonly showWorkflowGuide = signal(true);

  newSetName = '';
  newSetParentType: (typeof PARENT_ENTITY_TYPES)[number] = 'COPY';
  newSetParentId = '';
  newSetStrategy = '';

  addVariantEntityType: (typeof VARIANT_ENTITY_TYPES)[number] | '' = '';
  addVariantEntityId = '';
  addVariantNotes = '';

  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  ngOnInit(): void {
    this.loadSets();
  }

  entityTypeLabel(type: string): string {
    return ENTITY_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  parentTypeDescription(type: string): string {
    return PARENT_TYPE_DESCRIPTIONS[type] ?? '';
  }

  variantTypeDescription(type: string): string {
    return VARIANT_TYPE_DESCRIPTIONS[type] ?? '';
  }

  dismissWorkflowGuide(): void {
    this.showWorkflowGuide.set(false);
  }

  loadSets(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.loading.set(true);
    this.variantsApi.listVariantSets(ws).subscribe({
      next: (list) => {
        this.sets.set(list ?? []);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.notify.error(e?.error?.message ?? 'Failed to load variant sets');
      },
    });
  }

  toggleNewSet(): void {
    this.showNewSet.update((v) => !v);
  }

  canSubmitNewSet(): boolean {
    return (
      !!this.newSetName.trim() &&
      !!this.newSetParentType &&
      !!this.newSetParentId.trim() &&
      !!this.newSetStrategy.trim()
    );
  }

  submitNewSet(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws || !this.canSubmitNewSet()) return;
    this.variantsApi
      .createVariantSet(ws, {
        name: this.newSetName.trim(),
        parentEntityType: this.newSetParentType,
        parentEntityId: this.newSetParentId.trim(),
        strategy: this.newSetStrategy.trim(),
      })
      .subscribe({
        next: () => {
          this.notify.success('Variant set created');
          this.newSetName = '';
          this.newSetParentId = '';
          this.newSetStrategy = '';
          this.showNewSet.set(false);
          this.loadSets();
        },
        error: (e) => this.notify.error(e?.error?.message ?? 'Create failed'),
      });
  }

  onPanelOpened(setId: string): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    if (this.variantsBySet()[setId]) return;
    const loading = { ...this.variantsLoading() };
    loading[setId] = true;
    this.variantsLoading.set(loading);
    this.variantsApi.listVariants(ws, setId).subscribe({
      next: (rows) => {
        const next = { ...this.variantsBySet() };
        next[setId] = rows ?? [];
        this.variantsBySet.set(next);
        const ld = { ...this.variantsLoading() };
        ld[setId] = false;
        this.variantsLoading.set(ld);
      },
      error: (e) => {
        const ld = { ...this.variantsLoading() };
        ld[setId] = false;
        this.variantsLoading.set(ld);
        this.notify.error(e?.error?.message ?? 'Failed to load variants');
      },
    });
  }

  toggleAddVariant(setId: string): void {
    if (this.showAddVariantFor() === setId) {
      this.showAddVariantFor.set(null);
      this.addVariantEntityType = '';
      this.addVariantEntityId = '';
      this.addVariantNotes = '';
    } else {
      this.showAddVariantFor.set(setId);
      this.addVariantEntityType = 'COPY_ARTIFACT';
      this.addVariantEntityId = '';
      this.addVariantNotes = '';
    }
  }

  submitAddVariant(setId: string): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws || !this.addVariantEntityType || !this.addVariantEntityId.trim()) return;
    this.variantsApi
      .addVariant(ws, setId, {
        entityType: this.addVariantEntityType,
        entityId: this.addVariantEntityId.trim(),
        notes: this.addVariantNotes.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.notify.success('Variant added');
          const next = { ...this.variantsBySet() };
          delete next[setId];
          this.variantsBySet.set(next);
          this.showAddVariantFor.set(null);
          this.onPanelOpened(setId);
        },
        error: (e) => this.notify.error(e?.error?.message ?? 'Add variant failed'),
      });
  }
}
