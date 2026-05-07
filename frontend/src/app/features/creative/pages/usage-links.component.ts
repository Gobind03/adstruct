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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { RouterModule } from '@angular/router';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { CreativeLinkResponse, CreativeUsageResponse } from '../models/creative.models';
import { CreativeLinksApiService } from '../services/creative-links-api.service';
import { CreativeUsageApiService } from '../services/creative-usage-api.service';

const CREATIVE_ENTITY_TYPES = ['ASSET', 'COPY'] as const;
const USED_ENTITY_TYPES = [
  'CONVERSATION_CAMPAIGN',
  'SPONSORED_UNIT',
  'TEMPLATE',
  'SOCIAL_POST',
  'OTHER',
] as const;
const USAGE_RELATIONS = ['USES', 'DERIVED_FROM', 'INSPIRED_BY', 'ATTACHED_TO'] as const;
const LINK_RELATIONS = ['USES', 'DERIVED_FROM', 'INSPIRED_BY', 'ATTACHED_TO', 'RELATED_TO'] as const;

const LINK_ENTITY_TYPES = [
  'ASSET',
  'COPY',
  'CONVERSATION_CAMPAIGN',
  'SPONSORED_UNIT',
  'TEMPLATE',
  'SOCIAL_POST',
  'VARIANT_SET',
  'RESEARCH_INSIGHT',
  'OTHER',
] as const;

const RELATION_DESCRIPTIONS: Record<string, string> = {
  USES: 'Direct usage — the target entity actively uses this creative',
  DERIVED_FROM: 'The target was created based on or adapted from this entity',
  INSPIRED_BY: 'The target was conceptually inspired by this entity',
  ATTACHED_TO: 'The creative is attached/embedded within the target',
  RELATED_TO: 'General association — the entities are contextually related',
};

const USED_ENTITY_DESCRIPTIONS: Record<string, string> = {
  CONVERSATION_CAMPAIGN: 'A conversational ad campaign',
  SPONSORED_UNIT: 'A sponsored advertising unit',
  TEMPLATE: 'A reusable creative template',
  SOCIAL_POST: 'A social media post',
  OTHER: 'Any other entity type',
};

@Component({
  selector: 'app-usage-links',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
    RouterModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <!-- Header -->
      <header class="header">
        <div class="header-text">
          <nav class="breadcrumb">
            <a routerLink="/creative/assets" class="bc-link">Creative Studio</a>
            <mat-icon class="bc-sep">chevron_right</mat-icon>
            <span>Usage &amp; Links</span>
          </nav>
          <h1>Usage &amp; Links</h1>
          <p class="page-desc">
            Understand where your creative assets and copy are being used, and define
            relationships between any entities in the platform. This page is your central
            hub for <strong>traceability</strong> and <strong>cross-module visibility</strong>.
          </p>
        </div>
      </header>

      <!-- Feature highlight cards -->
      <div class="feature-cards">
        <div class="feature-card">
          <mat-icon class="feature-icon">track_changes</mat-icon>
          <div>
            <h3>Usage Tracking</h3>
            <p>See which campaigns, sponsored units, templates, and social posts reference your creative assets or copy artifacts.</p>
          </div>
        </div>
        <div class="feature-card">
          <mat-icon class="feature-icon">hub</mat-icon>
          <div>
            <h3>Creative Links</h3>
            <p>Create semantic relationships between any two entities — e.g. link an asset to the campaign it powers, or copy to the research that inspired it.</p>
          </div>
        </div>
        <div class="feature-card">
          <mat-icon class="feature-icon">visibility</mat-icon>
          <div>
            <h3>Full Traceability</h3>
            <p>Trace every creative back to where it's used and what it's connected to, ensuring nothing goes untracked across your workspace.</p>
          </div>
        </div>
      </div>

      <!-- Quick navigation -->
      <div class="quick-nav">
        <span class="quick-nav-label">Quick links:</span>
        <a mat-stroked-button routerLink="/creative/assets" class="quick-nav-btn">
          <mat-icon>photo_library</mat-icon> Assets Library
        </a>
        <a mat-stroked-button routerLink="/creative/copy" class="quick-nav-btn">
          <mat-icon>article</mat-icon> Copy Library
        </a>
        <a mat-stroked-button routerLink="/creative/variants" class="quick-nav-btn">
          <mat-icon>tune</mat-icon> Variant Sets
        </a>
      </div>

      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon>workspaces</mat-icon>
          <div>
            <strong>No workspace selected</strong>
            <p>Select a workspace from the sidebar to view and manage usage records and creative links.</p>
          </div>
        </mat-card>
      } @else {
        <mat-tab-group class="tabs" animationDuration="200ms">

          <!-- ==================== USAGE TRACKING TAB ==================== -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-label-icon">track_changes</mat-icon>
              Usage Tracking
            </ng-template>
            <div class="tab-pad">
              <!-- Persistent guide banner -->
              <div class="guide-banner">
                <mat-icon class="guide-icon">info</mat-icon>
                <div class="guide-content">
                  <strong>What is Usage Tracking?</strong>
                  <p>
                    When a creative asset (image, video) or copy artifact (headline, body text) is used in a
                    campaign, ad, or template, you can record that relationship here. This helps you answer
                    questions like <em>"Which campaigns use this hero image?"</em> or
                    <em>"Where is this tagline being used?"</em>
                  </p>
                  <div class="guide-steps">
                    <div class="guide-step">
                      <span class="step-num">1</span>
                      <span>Find IDs from the <a routerLink="/creative/assets">Assets Library</a> or <a routerLink="/creative/copy">Copy Library</a></span>
                    </div>
                    <div class="guide-step">
                      <span class="step-num">2</span>
                      <span>Search existing records, or click <strong>Record Usage</strong> to add a new one</span>
                    </div>
                    <div class="guide-step">
                      <span class="step-num">3</span>
                      <span>Select the relationship type (uses, derived from, inspired by, etc.)</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Search section -->
              <mat-card class="filter-card">
                <div class="section-label">
                  <mat-icon>search</mat-icon>
                  <strong>Search Usage Records</strong>
                  <span class="section-hint">Find where specific creatives are referenced</span>
                </div>
                <mat-card-content class="filters">
                  <mat-form-field appearance="outline" class="field">
                    <mat-label>Creative type</mat-label>
                    <mat-select [(ngModel)]="usageSearchCreativeType" name="usct"
                      matTooltip="Filter by the type of creative (Asset = images/videos, Copy = text artifacts)">
                      <mat-option value="">All types</mat-option>
                      @for (t of creativeEntityTypes; track t) {
                        <mat-option [value]="t">{{ t === 'ASSET' ? 'Asset (image, video, etc.)' : 'Copy (text artifact)' }}</mat-option>
                      }
                    </mat-select>
                    <mat-hint>Asset = images/videos, Copy = text</mat-hint>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="grow">
                    <mat-label>Creative entity ID</mat-label>
                    <input matInput [(ngModel)]="usageSearchCreativeId" name="usci"
                      placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                      matTooltip="Paste the UUID of the asset or copy artifact. Find IDs in the Assets or Copy library." />
                    <mat-hint>Paste the UUID from the Assets or Copy library — leave blank to list all</mat-hint>
                  </mat-form-field>
                  <button mat-flat-button color="primary" type="button" (click)="searchUsage()"
                    matTooltip="Search for usage records matching these filters">
                    <mat-icon>search</mat-icon>
                    Search
                  </button>
                </mat-card-content>
              </mat-card>

              <!-- Action row -->
              <div class="actions-row">
                <button mat-stroked-button type="button" (click)="toggleRecordUsage()"
                  matTooltip="Manually record a new usage relationship between a creative and a campaign, ad, or template">
                  <mat-icon>add</mat-icon>
                  Record New Usage
                </button>
              </div>

              <!-- Record usage form -->
              @if (showRecordUsage()) {
                <mat-card class="form-card">
                  <mat-card-header>
                    <mat-card-title>Record a new usage</mat-card-title>
                    <mat-card-subtitle>Define where a creative asset or copy artifact is being used</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content class="form-grid">
                    <div class="form-section-label">
                      <mat-icon class="form-section-icon">category</mat-icon>
                      <span>What is using the creative?</span>
                    </div>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Used in (entity type)</mat-label>
                      <mat-select [(ngModel)]="recordUsedType" name="rut" required
                        matTooltip="The type of entity that uses the creative — e.g. a campaign, ad unit, or template">
                        @for (t of usedEntityTypes; track t) {
                          <mat-option [value]="t">{{ formatUsedType(t) }}</mat-option>
                        }
                      </mat-select>
                      <mat-hint>{{ recordUsedType ? usedEntityDescriptions[recordUsedType] : 'Select what is using your creative' }}</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Used entity ID</mat-label>
                      <input matInput [(ngModel)]="recordUsedId" name="rui" required
                        placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                        matTooltip="The UUID of the campaign, ad unit, template, or social post" />
                      <mat-hint>The unique ID of the campaign, ad, template, or post</mat-hint>
                    </mat-form-field>

                    <mat-divider class="form-divider"></mat-divider>

                    <div class="form-section-label">
                      <mat-icon class="form-section-icon">brush</mat-icon>
                      <span>Which creative is being used?</span>
                    </div>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Creative type</mat-label>
                      <mat-select [(ngModel)]="recordCreativeType" name="rct" required
                        matTooltip="Asset = image, video, document; Copy = headline, body text, tagline">
                        @for (t of creativeEntityTypes; track t) {
                          <mat-option [value]="t">{{ t === 'ASSET' ? 'Asset (image, video, document)' : 'Copy (text artifact)' }}</mat-option>
                        }
                      </mat-select>
                      <mat-hint>Choose Asset for media files or Copy for text content</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Creative entity ID</mat-label>
                      <input matInput [(ngModel)]="recordCreativeId" name="rci" required
                        placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                        matTooltip="The UUID of the asset or copy artifact. Find this in the Assets or Copy library." />
                      <mat-hint>
                        Find this ID in the
                        <a routerLink="/creative/assets" class="inline-link">Assets Library</a> or
                        <a routerLink="/creative/copy" class="inline-link">Copy Library</a>
                      </mat-hint>
                    </mat-form-field>

                    <mat-divider class="form-divider"></mat-divider>

                    <div class="form-section-label">
                      <mat-icon class="form-section-icon">link</mat-icon>
                      <span>How are they related?</span>
                    </div>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Relation type</mat-label>
                      <mat-select [(ngModel)]="recordRelation" name="rr"
                        matTooltip="Describes how the creative is used — leave blank if unsure">
                        <mat-option value="">None (optional)</mat-option>
                        @for (r of usageRelations; track r) {
                          <mat-option [value]="r">{{ formatRelation(r) }}</mat-option>
                        }
                      </mat-select>
                      <mat-hint>{{ recordRelation ? relationDescriptions[recordRelation] : 'Optional — describes the nature of the relationship' }}</mat-hint>
                    </mat-form-field>
                  </mat-card-content>
                  <mat-card-actions align="end">
                    <button mat-button type="button" (click)="toggleRecordUsage()">Cancel</button>
                    <button
                      mat-flat-button
                      color="primary"
                      type="button"
                      [disabled]="!canSubmitUsage()"
                      (click)="submitUsage()"
                      [matTooltip]="canSubmitUsage() ? 'Save this usage record' : 'Fill in all required fields first'"
                    >
                      <mat-icon>save</mat-icon>
                      Save Usage Record
                    </button>
                  </mat-card-actions>
                </mat-card>
              }

              <!-- Loading / empty / table -->
              @if (usageLoading()) {
                <div class="spinner-wrap">
                  <mat-spinner diameter="48"></mat-spinner>
                  <p class="spinner-text">Loading usage records…</p>
                </div>
              } @else if (usageRows().length === 0) {
                <mat-card class="empty-card">
                  <mat-icon>link_off</mat-icon>
                  <h3>No usage records yet</h3>
                  <p>Usage records track where your creative assets and copy appear across the platform — in campaigns, sponsored units, social posts, and templates.</p>
                  <div class="empty-actions">
                    <button mat-flat-button color="primary" type="button" (click)="toggleRecordUsage()">
                      <mat-icon>add</mat-icon> Record Your First Usage
                    </button>
                  </div>
                  <div class="empty-example">
                    <strong>Example:</strong> Record that your "Hero Banner" asset (from the
                    <a routerLink="/creative/assets">Assets Library</a>) is used in your "Summer Sale"
                    campaign — so you can always trace where it appears.
                  </div>
                </mat-card>
              } @else {
                <div class="table-header">
                  <span class="table-count">{{ usageRows().length }} record{{ usageRows().length === 1 ? '' : 's' }} found</span>
                </div>
                <mat-card class="table-card">
                  <table mat-table [dataSource]="usageRows()" class="mat-elevation-z0">
                    <ng-container matColumnDef="usedEntityType">
                      <th mat-header-cell *matHeaderCellDef>
                        Used In
                        <mat-icon class="col-help" matTooltip="The type of entity that uses this creative (e.g. campaign, ad unit)">help_outline</mat-icon>
                      </th>
                      <td mat-cell *matCellDef="let row">
                        <span class="entity-badge">{{ formatUsedType(row.usedEntityType) }}</span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="usedEntityId">
                      <th mat-header-cell *matHeaderCellDef>
                        Entity ID
                        <mat-icon class="col-help" matTooltip="The unique identifier of the entity that uses this creative">help_outline</mat-icon>
                      </th>
                      <td mat-cell *matCellDef="let row" class="mono">{{ row.usedEntityId }}</td>
                    </ng-container>
                    <ng-container matColumnDef="creativeEntityType">
                      <th mat-header-cell *matHeaderCellDef>
                        Creative Type
                        <mat-icon class="col-help" matTooltip="Whether the creative is an Asset (image, video) or Copy (text)">help_outline</mat-icon>
                      </th>
                      <td mat-cell *matCellDef="let row">{{ row.creativeEntityType === 'ASSET' ? 'Asset' : 'Copy' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="creativeEntityId">
                      <th mat-header-cell *matHeaderCellDef>
                        Creative ID
                        <mat-icon class="col-help" matTooltip="The unique identifier of the creative asset or copy">help_outline</mat-icon>
                      </th>
                      <td mat-cell *matCellDef="let row" class="mono">{{ row.creativeEntityId }}</td>
                    </ng-container>
                    <ng-container matColumnDef="relationType">
                      <th mat-header-cell *matHeaderCellDef>
                        Relation
                        <mat-icon class="col-help" matTooltip="How the creative relates to the entity (uses, derived from, etc.)">help_outline</mat-icon>
                      </th>
                      <td mat-cell *matCellDef="let row">
                        <span [matTooltip]="row.relationType ? relationDescriptions[row.relationType] || '' : ''">
                          {{ row.relationType ? formatRelation(row.relationType) : '—' }}
                        </span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="createdAt">
                      <th mat-header-cell *matHeaderCellDef>Recorded</th>
                      <td mat-cell *matCellDef="let row">{{ row.createdAt | date: 'medium' }}</td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="usageColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: usageColumns"></tr>
                  </table>
                </mat-card>
              }
            </div>
          </mat-tab>

          <!-- ==================== CREATIVE LINKS TAB ==================== -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon class="tab-label-icon">hub</mat-icon>
              Creative Links
            </ng-template>
            <div class="tab-pad">
              <!-- Persistent guide banner -->
              <div class="guide-banner">
                <mat-icon class="guide-icon">info</mat-icon>
                <div class="guide-content">
                  <strong>What are Creative Links?</strong>
                  <p>
                    Links define semantic relationships between any two entities in the platform.
                    Unlike usage records (which track where creatives appear), links capture
                    broader connections — for example, linking copy to the research insight that
                    inspired it, or connecting an asset to a variant set.
                  </p>
                  <div class="guide-steps">
                    <div class="guide-step">
                      <span class="step-num">1</span>
                      <span>Choose a <strong>"From"</strong> entity — the source of the relationship</span>
                    </div>
                    <div class="guide-step">
                      <span class="step-num">2</span>
                      <span>Choose a <strong>"To"</strong> entity — the target being linked to</span>
                    </div>
                    <div class="guide-step">
                      <span class="step-num">3</span>
                      <span>Select the <strong>relationship type</strong> and optionally add a note for context</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Search section -->
              <mat-card class="filter-card">
                <div class="section-label">
                  <mat-icon>search</mat-icon>
                  <strong>Search Links</strong>
                  <span class="section-hint">Find existing links by their source entity</span>
                </div>
                <mat-card-content class="filters">
                  <mat-form-field appearance="outline" class="field">
                    <mat-label>From entity type</mat-label>
                    <mat-select [(ngModel)]="linkSearchFromType" name="lsft"
                      matTooltip="Filter by the type of the source entity">
                      <mat-option value="">All types</mat-option>
                      @for (t of linkEntityTypes; track t) {
                        <mat-option [value]="t">{{ formatLinkEntityType(t) }}</mat-option>
                      }
                    </mat-select>
                    <mat-hint>The type of entity the link originates from</mat-hint>
                  </mat-form-field>
                  <mat-form-field appearance="outline" class="grow">
                    <mat-label>From entity ID</mat-label>
                    <input matInput [(ngModel)]="linkSearchFromId" name="lsfi"
                      placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                      matTooltip="Paste the UUID of the source entity — leave blank to list all links" />
                    <mat-hint>Leave blank to show all links, or paste a specific entity ID</mat-hint>
                  </mat-form-field>
                  <button mat-flat-button color="primary" type="button" (click)="searchLinks()"
                    matTooltip="Search for links matching these filters">
                    <mat-icon>search</mat-icon>
                    Search
                  </button>
                </mat-card-content>
              </mat-card>

              <!-- Action row -->
              <div class="actions-row">
                <button mat-stroked-button type="button" (click)="toggleCreateLink()"
                  matTooltip="Create a new relationship between two entities in the platform">
                  <mat-icon>add_link</mat-icon>
                  Create New Link
                </button>
              </div>

              <!-- Create link form -->
              @if (showCreateLink()) {
                <mat-card class="form-card">
                  <mat-card-header>
                    <mat-card-title>Create a new link</mat-card-title>
                    <mat-card-subtitle>Define a relationship between two entities in your workspace</mat-card-subtitle>
                  </mat-card-header>
                  <mat-card-content class="form-grid">
                    <div class="form-section-label">
                      <mat-icon class="form-section-icon">output</mat-icon>
                      <span>Source entity (links FROM this)</span>
                    </div>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>From entity type</mat-label>
                      <mat-select [(ngModel)]="createFromType" name="cft" required
                        matTooltip="The type of entity this link originates from">
                        @for (t of linkEntityTypes; track t) {
                          <mat-option [value]="t">{{ formatLinkEntityType(t) }}</mat-option>
                        }
                      </mat-select>
                      <mat-hint>Select the type of the source entity</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>From entity ID</mat-label>
                      <input matInput [(ngModel)]="createFromId" name="cfi" required
                        placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                        matTooltip="The UUID of the source entity" />
                      <mat-hint>
                        The UUID of the source — find IDs in the
                        <a routerLink="/creative/assets" class="inline-link">Assets</a> or
                        <a routerLink="/creative/copy" class="inline-link">Copy</a> library
                      </mat-hint>
                    </mat-form-field>

                    <mat-divider class="form-divider"></mat-divider>

                    <div class="form-section-label">
                      <mat-icon class="form-section-icon">input</mat-icon>
                      <span>Target entity (links TO this)</span>
                    </div>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>To entity type</mat-label>
                      <mat-select [(ngModel)]="createToType" name="ctt" required
                        matTooltip="The type of entity this link points to">
                        @for (t of linkEntityTypes; track t) {
                          <mat-option [value]="t">{{ formatLinkEntityType(t) }}</mat-option>
                        }
                      </mat-select>
                      <mat-hint>Select the type of the target entity</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>To entity ID</mat-label>
                      <input matInput [(ngModel)]="createToId" name="cti" required
                        placeholder="e.g. 3fa85f64-5717-4562-b3fc-2c963f66afa6"
                        matTooltip="The UUID of the target entity" />
                      <mat-hint>The UUID of the entity you're linking to</mat-hint>
                    </mat-form-field>

                    <mat-divider class="form-divider"></mat-divider>

                    <div class="form-section-label">
                      <mat-icon class="form-section-icon">link</mat-icon>
                      <span>Relationship details</span>
                    </div>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Relation type</mat-label>
                      <mat-select [(ngModel)]="createRelation" name="cr" required
                        matTooltip="The semantic meaning of this link">
                        @for (r of linkRelations; track r) {
                          <mat-option [value]="r">{{ formatRelation(r) }}</mat-option>
                        }
                      </mat-select>
                      <mat-hint>{{ createRelation ? relationDescriptions[createRelation] : 'Choose how these entities are related' }}</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Note (optional)</mat-label>
                      <input matInput [(ngModel)]="createNote" name="cn"
                        placeholder="e.g. Adapted banner for mobile layout"
                        matTooltip="Add context for why this link exists — helps your team understand the relationship" />
                      <mat-hint>Add context for your team — e.g. "Adapted banner for mobile layout"</mat-hint>
                    </mat-form-field>
                  </mat-card-content>
                  <mat-card-actions align="end">
                    <button mat-button type="button" (click)="toggleCreateLink()">Cancel</button>
                    <button
                      mat-flat-button
                      color="primary"
                      type="button"
                      [disabled]="!canSubmitLink()"
                      (click)="submitLink()"
                      [matTooltip]="canSubmitLink() ? 'Create this link' : 'Fill in all required fields first'"
                    >
                      <mat-icon>add_link</mat-icon>
                      Create Link
                    </button>
                  </mat-card-actions>
                </mat-card>
              }

              <!-- Loading / empty / table -->
              @if (linksLoading()) {
                <div class="spinner-wrap">
                  <mat-spinner diameter="48"></mat-spinner>
                  <p class="spinner-text">Loading links…</p>
                </div>
              } @else if (linkRows().length === 0) {
                <mat-card class="empty-card">
                  <mat-icon>link</mat-icon>
                  <h3>No links created yet</h3>
                  <p>Links connect any two entities in the platform — for example, link a creative asset to the campaign it powers, or connect copy to the research insight that inspired it.</p>
                  <div class="empty-actions">
                    <button mat-flat-button color="primary" type="button" (click)="toggleCreateLink()">
                      <mat-icon>add_link</mat-icon> Create Your First Link
                    </button>
                  </div>
                  <div class="empty-example">
                    <strong>Example:</strong> Link your "Product Photo" asset from the
                    <a routerLink="/creative/assets">Assets Library</a> to your "Q4 Launch" campaign
                    with a "Uses" relationship — so your team knows where it's deployed.
                  </div>
                </mat-card>
              } @else {
                <div class="table-header">
                  <span class="table-count">{{ linkRows().length }} link{{ linkRows().length === 1 ? '' : 's' }} found</span>
                </div>
                <mat-card class="table-card">
                  <table mat-table [dataSource]="linkRows()" class="mat-elevation-z0">
                    <ng-container matColumnDef="fromEntityType">
                      <th mat-header-cell *matHeaderCellDef>
                        From Type
                        <mat-icon class="col-help" matTooltip="The type of the source entity">help_outline</mat-icon>
                      </th>
                      <td mat-cell *matCellDef="let row">
                        <span class="entity-badge">{{ formatLinkEntityType(row.fromEntityType) }}</span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="fromEntityId">
                      <th mat-header-cell *matHeaderCellDef>
                        From ID
                        <mat-icon class="col-help" matTooltip="The UUID of the source entity">help_outline</mat-icon>
                      </th>
                      <td mat-cell *matCellDef="let row" class="mono">{{ row.fromEntityId }}</td>
                    </ng-container>
                    <ng-container matColumnDef="toEntityType">
                      <th mat-header-cell *matHeaderCellDef>
                        To Type
                        <mat-icon class="col-help" matTooltip="The type of the target entity">help_outline</mat-icon>
                      </th>
                      <td mat-cell *matCellDef="let row">
                        <span class="entity-badge">{{ formatLinkEntityType(row.toEntityType) }}</span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="toEntityId">
                      <th mat-header-cell *matHeaderCellDef>
                        To ID
                        <mat-icon class="col-help" matTooltip="The UUID of the target entity">help_outline</mat-icon>
                      </th>
                      <td mat-cell *matCellDef="let row" class="mono">{{ row.toEntityId }}</td>
                    </ng-container>
                    <ng-container matColumnDef="relationType">
                      <th mat-header-cell *matHeaderCellDef>
                        Relation
                        <mat-icon class="col-help" matTooltip="The semantic relationship between the two entities">help_outline</mat-icon>
                      </th>
                      <td mat-cell *matCellDef="let row">
                        <span [matTooltip]="relationDescriptions[row.relationType] || ''">
                          {{ formatRelation(row.relationType) }}
                        </span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="note">
                      <th mat-header-cell *matHeaderCellDef>Note</th>
                      <td mat-cell *matCellDef="let row">{{ row.note || '—' }}</td>
                    </ng-container>
                    <ng-container matColumnDef="actions">
                      <th mat-header-cell *matHeaderCellDef></th>
                      <td mat-cell *matCellDef="let row">
                        <button
                          mat-icon-button
                          type="button"
                          color="warn"
                          (click)="confirmDeleteLink(row); $event.stopPropagation()"
                          matTooltip="Delete this link"
                          aria-label="Delete link"
                        >
                          <mat-icon>delete</mat-icon>
                        </button>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="linkColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: linkColumns"></tr>
                  </table>
                </mat-card>
              }
            </div>
          </mat-tab>
        </mat-tab-group>

        <!-- Delete confirmation overlay -->
        @if (pendingDeleteLink()) {
          <div class="confirm-overlay" (click)="cancelDelete()">
            <mat-card class="confirm-dialog" (click)="$event.stopPropagation()">
              <mat-card-header>
                <mat-card-title>Delete this link?</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                <p>This will permanently remove the link between
                  <strong>{{ pendingDeleteLink()!.fromEntityType }}</strong> and
                  <strong>{{ pendingDeleteLink()!.toEntityType }}</strong>
                  ({{ formatRelation(pendingDeleteLink()!.relationType) }}).
                </p>
                <p class="confirm-warn">This action cannot be undone.</p>
              </mat-card-content>
              <mat-card-actions align="end">
                <button mat-button type="button" (click)="cancelDelete()">Cancel</button>
                <button mat-flat-button color="warn" type="button" (click)="deleteLinkRow(pendingDeleteLink()!)">
                  <mat-icon>delete</mat-icon> Delete
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
        }

        <!-- Always-visible help accordion -->
        <mat-accordion class="help-accordion">
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon class="panel-icon">help_outline</mat-icon>
                Terminology &amp; Concepts
              </mat-panel-title>
            </mat-expansion-panel-header>
            <div class="help-grid">
              <div class="help-item">
                <strong>Asset</strong>
                <p>An image, video, UGC clip, document, audio file, or thumbnail stored in the <a routerLink="/creative/assets">Assets Library</a>.</p>
              </div>
              <div class="help-item">
                <strong>Copy</strong>
                <p>A text artifact — headline, body text, CTA, tagline, or script — stored in the <a routerLink="/creative/copy">Copy Library</a>.</p>
              </div>
              <div class="help-item">
                <strong>Usage Record</strong>
                <p>Tracks where a creative (asset or copy) is actively used — in a campaign, sponsored unit, template, or social post.</p>
              </div>
              <div class="help-item">
                <strong>Link</strong>
                <p>A semantic relationship between any two entities. More flexible than usage — can connect creatives to research, variants, or other modules.</p>
              </div>
              <div class="help-item">
                <strong>Variant Set</strong>
                <p>A group of alternative versions of a creative, managed in <a routerLink="/creative/variants">Variant Sets</a>. Link variants to originals for traceability.</p>
              </div>
              <div class="help-item">
                <strong>Entity ID</strong>
                <p>Every item in the platform has a unique UUID. Copy it from the detail page of any asset, copy artifact, campaign, etc.</p>
              </div>
            </div>
          </mat-expansion-panel>
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon class="panel-icon">swap_horiz</mat-icon>
                Relationship Types Explained
              </mat-panel-title>
            </mat-expansion-panel-header>
            <div class="relation-list">
              @for (r of linkRelations; track r) {
                <div class="relation-item">
                  <span class="relation-badge">{{ formatRelation(r) }}</span>
                  <span>{{ relationDescriptions[r] }}</span>
                </div>
              }
            </div>
          </mat-expansion-panel>
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon class="panel-icon">lightbulb</mat-icon>
                Tips &amp; Best Practices
              </mat-panel-title>
            </mat-expansion-panel-header>
            <div class="tips-list">
              <div class="tip-item">
                <mat-icon class="tip-bullet">check_circle</mat-icon>
                <span>Record usage whenever you deploy a creative into a new campaign or ad — this prevents orphaned assets.</span>
              </div>
              <div class="tip-item">
                <mat-icon class="tip-bullet">check_circle</mat-icon>
                <span>Use "Derived From" links when you create variations of an existing asset — this preserves the creative lineage.</span>
              </div>
              <div class="tip-item">
                <mat-icon class="tip-bullet">check_circle</mat-icon>
                <span>Link copy to research insights with "Inspired By" to document why specific messaging was chosen.</span>
              </div>
              <div class="tip-item">
                <mat-icon class="tip-bullet">check_circle</mat-icon>
                <span>Add notes to links for future context — your team will thank you when reviewing creative decisions later.</span>
              </div>
              <div class="tip-item">
                <mat-icon class="tip-bullet">check_circle</mat-icon>
                <span>Search by entity ID to audit all connections before archiving or retiring a creative.</span>
              </div>
            </div>
          </mat-expansion-panel>
        </mat-accordion>
      }
    </div>
  `,
  styles: [
    `
      .page { padding: 24px; max-width: 1100px; margin: 0 auto; }

      /* Header */
      .header { margin-bottom: 20px; }
      .header-text h1 { margin: 8px 0 0; font-size: 26px; font-weight: 600; color: var(--text-primary); }
      .breadcrumb {
        display: flex; align-items: center; gap: 4px;
        font-size: 13px; line-height: 18px; color: var(--text-secondary);
      }
      .bc-sep {
        font-size: 18px; width: 18px; height: 18px;
        display: inline-flex; align-items: center; justify-content: center;
        color: var(--text-muted);
      }
      .bc-link { color: var(--text-secondary); text-decoration: none; }
      .bc-link:hover { color: var(--color-primary); text-decoration: underline; }
      .page-desc { color: var(--text-secondary); font-size: 14px; margin: 6px 0 0; max-width: 720px; line-height: 1.6; }

      /* Feature highlight cards */
      .feature-cards {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 16px; margin-bottom: 20px;
      }
      .feature-card {
        display: flex; align-items: flex-start; gap: 14px; padding: 16px 18px;
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--color-primary) 4%, transparent);
        border: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
      }
      .feature-card h3 { margin: 0 0 4px; font-size: 14px; font-weight: 600; color: var(--text-primary); line-height: 1.4; }
      .feature-card p { margin: 0; font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; }
      .feature-icon {
        color: var(--color-primary); flex-shrink: 0;
        font-size: 24px; width: 24px; height: 24px;
        display: inline-flex; align-items: center; justify-content: center;
        margin-top: 2px;
      }

      /* Quick navigation */
      .quick-nav {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 24px;
      }
      .quick-nav-label { font-size: 13px; color: var(--text-muted); font-weight: 500; line-height: 36px; }
      .quick-nav-btn { font-size: 12px !important; }
      :host ::ng-deep .quick-nav-btn .mat-icon {
        font-size: 16px !important; width: 16px !important; height: 16px !important;
        margin-right: 4px; margin-left: 0;
      }

      /* Workspace warning */
      .callout {
        display: flex; align-items: flex-start; gap: 12px;
        padding: 16px 20px; border-radius: var(--radius-md);
      }
      .callout > mat-icon {
        font-size: 24px; width: 24px; height: 24px;
        display: inline-flex; align-items: center; justify-content: center;
        flex-shrink: 0; margin-top: 2px;
      }
      .callout-warn {
        background: color-mix(in srgb, var(--color-warn, #f9a825) 12%, transparent);
        border: 1px solid var(--border-default);
      }
      .callout-warn p { margin: 4px 0 0; font-size: 13px; color: var(--text-secondary); }

      /* Tabs */
      .tabs { border-radius: var(--radius-md); }
      .tab-label-icon {
        font-size: 18px; width: 18px; height: 18px;
        display: inline-flex; align-items: center; justify-content: center;
        vertical-align: middle; margin-right: 6px;
      }
      .tab-pad { padding: 16px 0 24px; }

      /* Guide banner */
      .guide-banner {
        display: flex; align-items: flex-start; gap: 12px; padding: 16px 18px; margin-bottom: 20px;
        border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--color-primary) 5%, transparent);
        border: 1px solid color-mix(in srgb, var(--color-primary) 15%, transparent);
      }
      .guide-icon {
        color: var(--color-primary); flex-shrink: 0;
        font-size: 22px; width: 22px; height: 22px;
        display: inline-flex; align-items: center; justify-content: center;
        margin-top: 0;
      }
      .guide-content { min-width: 0; }
      .guide-content strong { font-size: 14px; color: var(--text-primary); display: block; line-height: 22px; }
      .guide-content p { margin: 6px 0 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6; }
      .guide-content a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
      .guide-content a:hover { text-decoration: underline; }
      .guide-steps { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
      .guide-step {
        display: flex; align-items: center; gap: 10px;
        font-size: 13px; line-height: 22px; color: var(--text-secondary);
      }
      .step-num {
        display: inline-flex; align-items: center; justify-content: center;
        width: 22px; height: 22px; min-width: 22px; border-radius: 50%; flex-shrink: 0;
        background: var(--color-primary); color: white; font-size: 12px; font-weight: 600;
        line-height: 22px;
      }

      /* Filter / Search */
      .filter-card { margin-bottom: 12px; border: 1px solid var(--border-default); }
      .section-label {
        display: flex; align-items: center; gap: 8px; padding: 12px 16px 0;
        line-height: 20px;
      }
      .section-label > mat-icon {
        font-size: 18px; width: 18px; height: 18px;
        display: inline-flex; align-items: center; justify-content: center;
        color: var(--text-secondary); flex-shrink: 0;
      }
      .section-hint { font-size: 12px; color: var(--text-muted); margin-left: auto; }
      .filters {
        display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;
        padding-top: 8px;
      }
      .field { width: 220px; }
      .grow { flex: 1; min-width: 200px; }

      /* Actions */
      .actions-row { margin-bottom: 16px; }

      /* Form */
      .form-card { margin-bottom: 20px; border: 1px solid var(--border-default); }
      .form-grid { display: flex; flex-direction: column; gap: 4px; padding-top: 8px; }
      .full { width: 100%; }
      .form-section-label {
        display: flex; align-items: center; gap: 8px; margin: 12px 0 4px;
        font-size: 13px; font-weight: 600; color: var(--text-primary); line-height: 20px;
      }
      .form-section-icon {
        font-size: 18px; width: 18px; height: 18px;
        display: inline-flex; align-items: center; justify-content: center;
        color: var(--color-primary); flex-shrink: 0;
      }
      .form-divider { margin: 12px 0 4px; }
      .inline-link { color: var(--color-primary); text-decoration: none; font-weight: 500; }
      .inline-link:hover { text-decoration: underline; }

      /* Loading */
      .spinner-wrap { display: flex; flex-direction: column; align-items: center; padding: 48px; gap: 12px; }
      .spinner-text { font-size: 13px; color: var(--text-muted); }

      /* Empty state */
      .empty-card { text-align: center; padding: 40px; color: var(--text-muted); }
      .empty-card > mat-icon {
        font-size: 48px; width: 48px; height: 48px;
        display: inline-flex; align-items: center; justify-content: center;
        opacity: 0.5; margin: 0 auto;
      }
      .empty-card h3 { margin: 12px 0 6px; font-size: 18px; font-weight: 600; color: var(--text-primary); }
      .empty-card p { max-width: 520px; margin: 0 auto; line-height: 1.5; font-size: 13px; }
      .empty-actions { margin: 16px 0; }
      .empty-example {
        max-width: 520px; margin: 16px auto 0; padding: 12px 16px; border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--color-primary) 4%, transparent);
        border: 1px dashed color-mix(in srgb, var(--color-primary) 20%, transparent);
        font-size: 13px; color: var(--text-secondary); text-align: left; line-height: 1.5;
      }
      .empty-example a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
      .empty-example a:hover { text-decoration: underline; }

      /* Table */
      .table-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
      .table-count { font-size: 13px; color: var(--text-secondary); font-weight: 500; }
      .table-card { overflow: auto; border: 1px solid var(--border-default); }
      table { width: 100%; min-width: 720px; }
      th[mat-header-cell] { white-space: nowrap; }
      .mono { font-family: ui-monospace, monospace; font-size: 12px; }
      .col-help {
        font-size: 14px; width: 14px; height: 14px;
        display: inline-flex; align-items: center; justify-content: center;
        vertical-align: middle;
        color: var(--text-muted); margin-left: 4px; cursor: help; opacity: 0.7;
      }
      .entity-badge {
        display: inline-block; padding: 2px 8px; border-radius: 4px;
        font-size: 11px; font-weight: 600; white-space: nowrap;
        background: color-mix(in srgb, var(--color-primary) 10%, transparent);
        color: var(--color-primary); line-height: 1.5;
      }

      /* Delete confirmation */
      .confirm-overlay {
        position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 1000;
        background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center;
      }
      .confirm-dialog { max-width: 440px; width: 90%; }
      .confirm-warn { color: var(--color-warn, #e53935); font-size: 13px; font-weight: 500; }

      /* Help accordion */
      .help-accordion { margin-top: 32px; }
      ::ng-deep .help-accordion .mat-expansion-panel-header-title {
        display: flex; align-items: center;
      }
      .panel-icon {
        font-size: 20px; width: 20px; height: 20px;
        display: inline-flex; align-items: center; justify-content: center;
        margin-right: 8px; color: var(--color-primary); flex-shrink: 0;
      }
      .help-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px;
      }
      .help-item {
        padding: 12px; border-radius: var(--radius-md);
        background: color-mix(in srgb, var(--text-muted) 5%, transparent);
      }
      .help-item strong { font-size: 13px; color: var(--text-primary); }
      .help-item p { margin: 4px 0 0; font-size: 12.5px; color: var(--text-secondary); line-height: 1.5; }
      .help-item a { color: var(--color-primary); text-decoration: none; font-weight: 500; }
      .help-item a:hover { text-decoration: underline; }

      .relation-list { display: flex; flex-direction: column; gap: 10px; }
      .relation-item {
        display: flex; align-items: center; gap: 12px;
        font-size: 13px; color: var(--text-secondary); line-height: 1.5;
      }
      .relation-badge {
        display: inline-flex; align-items: center; justify-content: center;
        min-width: 100px; padding: 4px 10px; border-radius: 4px; text-align: center;
        font-size: 12px; font-weight: 600; white-space: nowrap; flex-shrink: 0;
        background: color-mix(in srgb, var(--color-primary) 10%, transparent);
        color: var(--color-primary); line-height: 1.4;
      }

      .tips-list { display: flex; flex-direction: column; gap: 10px; }
      .tip-item {
        display: flex; align-items: flex-start; gap: 10px;
        font-size: 13px; color: var(--text-secondary); line-height: 1.5;
      }
      .tip-bullet {
        font-size: 18px; width: 18px; height: 18px;
        display: inline-flex; align-items: center; justify-content: center;
        color: var(--color-primary); flex-shrink: 0; margin-top: 2px;
      }
    `,
  ],
})
export class UsageLinksComponent implements OnInit {
  private readonly usageApi = inject(CreativeUsageApiService);
  private readonly linksApi = inject(CreativeLinksApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);

  readonly creativeEntityTypes = [...CREATIVE_ENTITY_TYPES];
  readonly usedEntityTypes = [...USED_ENTITY_TYPES];
  readonly usageRelations = [...USAGE_RELATIONS];
  readonly linkRelations = [...LINK_RELATIONS];
  readonly linkEntityTypes = [...LINK_ENTITY_TYPES];
  readonly relationDescriptions = RELATION_DESCRIPTIONS;
  readonly usedEntityDescriptions = USED_ENTITY_DESCRIPTIONS;

  readonly usageColumns = [
    'usedEntityType',
    'usedEntityId',
    'creativeEntityType',
    'creativeEntityId',
    'relationType',
    'createdAt',
  ];
  readonly linkColumns = [
    'fromEntityType',
    'fromEntityId',
    'toEntityType',
    'toEntityId',
    'relationType',
    'note',
    'actions',
  ];

  readonly usageLoading = signal(false);
  readonly usageRows = signal<CreativeUsageResponse[]>([]);
  readonly showRecordUsage = signal(false);

  readonly linksLoading = signal(false);
  readonly linkRows = signal<CreativeLinkResponse[]>([]);
  readonly showCreateLink = signal(false);

  readonly pendingDeleteLink = signal<CreativeLinkResponse | null>(null);

  usageSearchCreativeType = '';
  usageSearchCreativeId = '';

  recordUsedType: (typeof USED_ENTITY_TYPES)[number] | '' = '';
  recordUsedId = '';
  recordCreativeType: (typeof CREATIVE_ENTITY_TYPES)[number] | '' = '';
  recordCreativeId = '';
  recordRelation = '';

  linkSearchFromType = '';
  linkSearchFromId = '';

  createFromType = '';
  createFromId = '';
  createToType = '';
  createToId = '';
  createRelation: (typeof LINK_RELATIONS)[number] | '' = '';
  createNote = '';

  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  ngOnInit(): void {
    this.searchUsage();
    this.searchLinks();
  }

  formatRelation(relation: string): string {
    return relation
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  }

  formatUsedType(type: string): string {
    return type
      .split('_')
      .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
      .join(' ');
  }

  formatLinkEntityType(type: string): string {
    const labels: Record<string, string> = {
      ASSET: 'Asset',
      COPY: 'Copy',
      CONVERSATION_CAMPAIGN: 'Campaign',
      SPONSORED_UNIT: 'Sponsored Unit',
      TEMPLATE: 'Template',
      SOCIAL_POST: 'Social Post',
      VARIANT_SET: 'Variant Set',
      RESEARCH_INSIGHT: 'Research Insight',
      OTHER: 'Other',
    };
    return labels[type] || this.formatRelation(type);
  }

  searchUsage(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.usageLoading.set(true);
    this.usageApi
      .listUsage(ws, {
        creativeEntityType: this.usageSearchCreativeType || undefined,
        creativeEntityId: this.usageSearchCreativeId.trim() || undefined,
      })
      .subscribe({
        next: (rows) => {
          this.usageRows.set(rows ?? []);
          this.usageLoading.set(false);
        },
        error: (e) => {
          this.usageLoading.set(false);
          this.notify.error(e?.error?.message ?? 'Failed to load usage records');
        },
      });
  }

  toggleRecordUsage(): void {
    this.showRecordUsage.update((v) => !v);
  }

  canSubmitUsage(): boolean {
    return (
      !!this.recordUsedType &&
      !!this.recordUsedId.trim() &&
      !!this.recordCreativeType &&
      !!this.recordCreativeId.trim()
    );
  }

  submitUsage(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws || !this.canSubmitUsage()) return;
    const body: Record<string, unknown> = {
      usedEntityType: this.recordUsedType,
      usedEntityId: this.recordUsedId.trim(),
      creativeEntityType: this.recordCreativeType,
      creativeEntityId: this.recordCreativeId.trim(),
    };
    if (this.recordRelation.trim()) {
      body['relationType'] = this.recordRelation.trim();
    }
    this.usageApi.createUsage(ws, body).subscribe({
      next: () => {
        this.notify.success('Usage recorded successfully');
        this.recordUsedType = '';
        this.recordUsedId = '';
        this.recordCreativeType = '';
        this.recordCreativeId = '';
        this.recordRelation = '';
        this.showRecordUsage.set(false);
        this.searchUsage();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Failed to record usage'),
    });
  }

  searchLinks(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.linksLoading.set(true);
    this.linksApi
      .listLinks(ws, {
        fromEntityType: this.linkSearchFromType.trim() || undefined,
        fromEntityId: this.linkSearchFromId.trim() || undefined,
      })
      .subscribe({
        next: (rows) => {
          this.linkRows.set(rows ?? []);
          this.linksLoading.set(false);
        },
        error: (e) => {
          this.linksLoading.set(false);
          this.notify.error(e?.error?.message ?? 'Failed to load links');
        },
      });
  }

  toggleCreateLink(): void {
    this.showCreateLink.update((v) => !v);
  }

  canSubmitLink(): boolean {
    return (
      !!this.createFromType.trim() &&
      !!this.createFromId.trim() &&
      !!this.createToType.trim() &&
      !!this.createToId.trim() &&
      !!this.createRelation
    );
  }

  submitLink(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws || !this.canSubmitLink()) return;
    this.linksApi
      .createLink(ws, {
        fromEntityType: this.createFromType.trim(),
        fromEntityId: this.createFromId.trim(),
        toEntityType: this.createToType.trim(),
        toEntityId: this.createToId.trim(),
        relationType: this.createRelation,
        note: this.createNote.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.notify.success('Link created successfully');
          this.createFromType = '';
          this.createFromId = '';
          this.createToType = '';
          this.createToId = '';
          this.createRelation = '';
          this.createNote = '';
          this.showCreateLink.set(false);
          this.searchLinks();
        },
        error: (e) => this.notify.error(e?.error?.message ?? 'Failed to create link'),
      });
  }

  confirmDeleteLink(row: CreativeLinkResponse): void {
    this.pendingDeleteLink.set(row);
  }

  cancelDelete(): void {
    this.pendingDeleteLink.set(null);
  }

  deleteLinkRow(row: CreativeLinkResponse): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    this.pendingDeleteLink.set(null);
    this.linksApi.deleteLink(ws, row.id).subscribe({
      next: () => {
        this.notify.success('Link deleted');
        this.searchLinks();
      },
      error: (e) => this.notify.error(e?.error?.message ?? 'Delete failed'),
    });
  }
}
