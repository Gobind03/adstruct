import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatMenuModule } from '@angular/material/menu';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '../../../core/services/notification.service';
import { TemplatesApiService } from '../services/templates-api.service';
import { TemplateResponse } from '../models/governance.models';

interface TemplateTypeOption {
  value: string;
  label: string;
  icon: string;
  description: string;
}

const TEMPLATE_TYPE_OPTIONS: TemplateTypeOption[] = [
  { value: 'AD_COPY', label: 'Ad Copy', icon: 'campaign', description: 'Text templates for paid advertisements' },
  { value: 'SOCIAL_POST', label: 'Social Post', icon: 'share', description: 'Templates for social media posts' },
  { value: 'LANDING_COPY', label: 'Landing Copy', icon: 'web', description: 'Hero text, CTAs, and landing page copy' },
  { value: 'EMAIL', label: 'Email', icon: 'email', description: 'Email subject lines and body templates' },
  { value: 'SMS', label: 'SMS', icon: 'sms', description: 'Short-form text message templates' },
  { value: 'UGC_BRIEF', label: 'UGC Brief', icon: 'groups', description: 'Briefs for user-generated content creators' },
  { value: 'VIDEO_SCRIPT', label: 'Video Script', icon: 'videocam', description: 'Scripts for video ads and reels' },
  { value: 'IMAGE_BRIEF', label: 'Image Brief', icon: 'image', description: 'Creative briefs for static image assets' },
  { value: 'POLICY_TEXT', label: 'Policy Text', icon: 'policy', description: 'Standard legal and policy text blocks' },
  { value: 'OTHER', label: 'Other', icon: 'article', description: 'Custom or uncategorized templates' },
];

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft', icon: 'edit_note', color: '#757575' },
  { value: 'IN_REVIEW', label: 'In Review', icon: 'rate_review', color: '#f57c00' },
  { value: 'APPROVED', label: 'Approved', icon: 'check_circle', color: '#2e7d32' },
  { value: 'REJECTED', label: 'Rejected', icon: 'cancel', color: '#c62828' },
  { value: 'ARCHIVED', label: 'Archived', icon: 'archive', color: '#9e9e9e' },
] as const;

@Component({
  selector: 'app-templates-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatDividerModule,
    MatMenuModule,
  ],
  template: `
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-text">
        <h2>Templates</h2>
        <p class="subtitle">
          Create and manage reusable content templates for ads, social posts, emails, landing pages,
          and more. Templates go through an approval workflow — only <strong>approved</strong> templates
          are used by AI agents for content generation.
        </p>
      </div>
    </div>

    <!-- Guide banner -->
    @if (showGuide()) {
      <mat-card class="info-banner">
        <mat-card-content>
          <div class="banner-header">
            <div class="banner-title">
              <mat-icon class="banner-icon">school</mat-icon>
              <strong>How Templates work</strong>
            </div>
            <button mat-icon-button (click)="showGuide.set(false)" matTooltip="Dismiss" aria-label="Dismiss guide">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="banner-body">
            <div class="guide-steps">
              <div class="guide-step">
                <div class="step-number">1</div>
                <div>
                  <strong>Create a template</strong>
                  <p>
                    Choose a type (ad copy, social post, email, etc.), give it a name, and define its
                    content structure as JSON. Templates start in <strong>DRAFT</strong> status.
                  </p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">2</div>
                <div>
                  <strong>Submit for review</strong>
                  <p>
                    When the draft is ready, submit it for approval. Reviewers can <strong>approve</strong>
                    or <strong>reject</strong> it with notes. Only approved templates are active.
                  </p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">3</div>
                <div>
                  <strong>Use in content generation</strong>
                  <p>
                    Approved templates become available to AI agents. You can link a
                    <a routerLink="/governance/rulesets">Rule Set</a> and
                    <a routerLink="/governance/disclaimers">Disclaimers</a> so generated content
                    automatically complies with governance rules.
                  </p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">4</div>
                <div>
                  <strong>Version & iterate</strong>
                  <p>
                    Need to update an approved template? Create a <strong>new version</strong> — the
                    previous version stays active until the new one is approved.
                  </p>
                </div>
              </div>
            </div>
            <mat-divider></mat-divider>
            <div class="banner-tips">
              <p>
                <mat-icon inline>lightbulb</mat-icon>
                <strong>Tip:</strong> Use the <strong>Content JSON</strong> field to define structured
                template sections (headline, body, CTA, etc.) that AI agents can populate.
              </p>
              <p>
                <mat-icon inline>security</mat-icon>
                Link a <a routerLink="/governance/rulesets">Rule Set</a> to a template so every piece
                of content generated from it is automatically checked for compliance.
              </p>
              <p>
                <mat-icon inline>gavel</mat-icon>
                Attach <a routerLink="/governance/disclaimers">Disclaimers</a> to ensure required
                legal text is always included in generated output.
              </p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    } @else {
      <button mat-stroked-button class="show-guide-btn" (click)="showGuide.set(true)">
        <mat-icon>school</mat-icon> Show guide
      </button>
    }

    <!-- Main content -->
    <mat-card>
      <mat-card-content>
        @if (!orgId()) {
          <div class="empty-state">
            <mat-icon class="empty-icon">business</mat-icon>
            <h3>No organization selected</h3>
            <p>Select an organization from the top bar to view and manage templates.</p>
          </div>
        } @else {
          <!-- Toolbar -->
          <div class="toolbar">
            <div class="filters">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Template type</mat-label>
                <mat-select [value]="filterType()" (selectionChange)="filterType.set($event.value); reload()">
                  <mat-option value="">All types</mat-option>
                  @for (t of templateTypeOptions; track t.value) {
                    <mat-option [value]="t.value">
                      <mat-icon>{{ t.icon }}</mat-icon> {{ t.label }}
                    </mat-option>
                  }
                </mat-select>
                <mat-hint>Filter by content type</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Status</mat-label>
                <mat-select [value]="filterStatus()" (selectionChange)="filterStatus.set($event.value); reload()">
                  <mat-option value="">All statuses</mat-option>
                  @for (s of statusOptions; track s.value) {
                    <mat-option [value]="s.value">
                      <mat-icon>{{ s.icon }}</mat-icon> {{ s.label }}
                    </mat-option>
                  }
                </mat-select>
                <mat-hint>Filter by approval status</mat-hint>
              </mat-form-field>
              <span class="item-count" matTooltip="Matching templates">
                {{ rows.length }} template{{ rows.length !== 1 ? 's' : '' }}
              </span>
            </div>
            <button mat-raised-button color="primary" (click)="showCreateForm.set(!showCreateForm())">
              <mat-icon>{{ showCreateForm() ? 'close' : 'add' }}</mat-icon>
              {{ showCreateForm() ? 'Cancel' : 'Create template' }}
            </button>
          </div>

          <!-- Create form -->
          @if (showCreateForm()) {
            <mat-card class="create-card">
              <mat-card-content>
                <h3 class="create-title"><mat-icon inline>description</mat-icon> Create a new template</h3>
                <p class="create-help">
                  Define a reusable content structure. The <strong>Content JSON</strong> describes
                  the template's sections — AI agents will populate these fields when generating content.
                  New templates start as <strong>DRAFT</strong> and must be approved before use.
                </p>
                <div class="create-form">
                  <div class="form-row-2">
                    <mat-form-field appearance="outline">
                      <mat-label>Name</mat-label>
                      <input matInput [value]="createName()" (input)="createName.set($any($event.target).value)"
                        placeholder="e.g. Holiday Sale Ad — Facebook" />
                      <mat-hint>A descriptive name to identify this template</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Template type</mat-label>
                      <mat-select [value]="createTemplateType()" (selectionChange)="createTemplateType.set($event.value)">
                        @for (t of templateTypeOptions; track t.value) {
                          <mat-option [value]="t.value" [matTooltip]="t.description">
                            <mat-icon>{{ t.icon }}</mat-icon> {{ t.label }}
                          </mat-option>
                        }
                      </mat-select>
                      <mat-hint>What kind of content will this template produce?</mat-hint>
                    </mat-form-field>
                  </div>
                  <div class="form-row-2">
                    <mat-form-field appearance="outline">
                      <mat-label>Scope</mat-label>
                      <mat-select [value]="createScope()" (selectionChange)="createScope.set($event.value)">
                        <mat-option value="ORG">Organization — available to all workspaces</mat-option>
                        <mat-option value="WORKSPACE" [disabled]="!workspaceId()">Workspace — only this workspace</mat-option>
                      </mat-select>
                      <mat-hint>Who can use this template?</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Description</mat-label>
                      <input matInput [value]="createDescription()" (input)="createDescription.set($any($event.target).value)"
                        placeholder="e.g. Standard holiday promotion for Facebook feed ads" />
                      <mat-hint>Optional — helps others understand this template's purpose</mat-hint>
                    </mat-form-field>
                  </div>
                  @if (createScope() === 'WORKSPACE' && !workspaceId()) {
                    <div class="scope-warning">
                      <mat-icon>warning</mat-icon>
                      <span>Select a workspace from the top bar to create a workspace-scoped template.</span>
                    </div>
                  }
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Content JSON</mat-label>
                    <textarea matInput rows="8"
                      [value]="createContentJson()"
                      (input)="createContentJson.set($any($event.target).value)"
                      placeholder='Example: { "headline": "", "body": "", "cta": "" }'></textarea>
                    <mat-hint>Define the template structure — AI agents will populate these fields</mat-hint>
                  </mat-form-field>
                  <div class="json-help">
                    <mat-icon inline>info</mat-icon>
                    <span>
                      Use JSON keys to define the sections of your template. For example:
                      <code>headline</code>, <code>body</code>, <code>cta</code>, <code>disclaimer</code>.
                      Values can be empty strings — they serve as placeholders for AI-generated content.
                    </span>
                  </div>
                  <div class="form-actions">
                    <button mat-raised-button color="primary" (click)="submitCreate()" [disabled]="creating()">
                      <mat-icon>check</mat-icon> Create template
                    </button>
                    <button mat-stroked-button (click)="showCreateForm.set(false)">Cancel</button>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          }

          <!-- Table -->
          @if (loading()) {
            <div class="spinner-wrap">
              <mat-spinner diameter="40"></mat-spinner>
            </div>
          } @else if (rows.length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">description</mat-icon>
              <h3>No templates yet</h3>
              <p>Create your first template to start building structured, compliant content.</p>
              @if (!showCreateForm()) {
                <button mat-raised-button color="primary" (click)="showCreateForm.set(true)">
                  <mat-icon>add</mat-icon> Create template
                </button>
              }
            </div>
          } @else {
            <table mat-table [dataSource]="rows" class="full-width templates-table">
              <!-- Name column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let row">
                  <div class="name-cell">
                    <mat-icon class="type-icon">{{ typeIcon(row.templateType) }}</mat-icon>
                    <div>
                      <strong class="template-name">{{ row.name }}</strong>
                      @if (row.description) {
                        <span class="template-desc">{{ preview(row.description, 60) }}</span>
                      }
                    </div>
                  </div>
                </td>
              </ng-container>

              <!-- Type column -->
              <ng-container matColumnDef="templateType">
                <th mat-header-cell *matHeaderCellDef>Type</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip-set>
                    <mat-chip class="type-chip" [matTooltip]="typeDescription(row.templateType)">
                      <mat-icon matChipAvatar>{{ typeIcon(row.templateType) }}</mat-icon>
                      {{ typeLabel(row.templateType) }}
                    </mat-chip>
                  </mat-chip-set>
                </td>
              </ng-container>

              <!-- Status column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip-set>
                    <mat-chip [class]="statusClass(row.status)">
                      <mat-icon matChipAvatar>{{ statusIcon(row.status) }}</mat-icon>
                      {{ statusLabel(row.status) }}
                    </mat-chip>
                  </mat-chip-set>
                </td>
              </ng-container>

              <!-- Version column -->
              <ng-container matColumnDef="version">
                <th mat-header-cell *matHeaderCellDef>Version</th>
                <td mat-cell *matCellDef="let row">
                  <span class="ver-badge" matTooltip="Template version">v{{ row.version }}</span>
                </td>
              </ng-container>

              <!-- Scope column -->
              <ng-container matColumnDef="scope">
                <th mat-header-cell *matHeaderCellDef>Scope</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip-set>
                    <mat-chip [highlighted]="row.scope === 'ORG'"
                      [matTooltip]="row.scope === 'ORG' ? 'Available to all workspaces' : 'Specific to one workspace'">
                      <mat-icon matChipAvatar>{{ row.scope === 'ORG' ? 'corporate_fare' : 'workspaces' }}</mat-icon>
                      {{ row.scope === 'ORG' ? 'Organization' : 'Workspace' }}
                    </mat-chip>
                  </mat-chip-set>
                </td>
              </ng-container>

              <!-- Created column -->
              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef>Created</th>
                <td mat-cell *matCellDef="let row">
                  <span class="date-text">{{ row.createdAt | date: 'mediumDate' }}</span>
                </td>
              </ng-container>

              <!-- Actions column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button [matMenuTriggerFor]="rowMenu" matTooltip="Actions"
                    (click)="$event.stopPropagation()">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #rowMenu="matMenu">
                    <button mat-menu-item (click)="openDetail(row)">
                      <mat-icon>open_in_new</mat-icon> View details
                    </button>
                    @if (row.status === 'APPROVED') {
                      <button mat-menu-item (click)="archiveTemplate(row)">
                        <mat-icon>archive</mat-icon> Archive
                      </button>
                    }
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"
                class="clickable-row"
                (click)="openDetail(row)"></tr>
            </table>
          }
        }
      </mat-card-content>
    </mat-card>

    <!-- Related pages -->
    <mat-card class="related-card">
      <mat-card-content>
        <h4 class="related-heading">Related pages</h4>
        <div class="related-links">
          <a routerLink="/governance/rulesets" class="related-link">
            <mat-icon>rule_folder</mat-icon>
            <div>
              <strong>Rule Sets</strong>
              <span>Link rule sets to templates to enforce compliance on generated content</span>
            </div>
          </a>
          <a routerLink="/governance/disclaimers" class="related-link">
            <mat-icon>gavel</mat-icon>
            <div>
              <strong>Disclaimers</strong>
              <span>Attach required disclaimer text that must appear in templated output</span>
            </div>
          </a>
          <a routerLink="/governance/checks" class="related-link">
            <mat-icon>verified</mat-icon>
            <div>
              <strong>Governance Checks</strong>
              <span>Run checks to validate content generated from templates</span>
            </div>
          </a>
          <a routerLink="/governance/profile" class="related-link">
            <mat-icon>palette</mat-icon>
            <div>
              <strong>Brand Profile</strong>
              <span>Define brand voice and tone that templates should follow</span>
            </div>
          </a>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    /* Page header */
    .page-header { margin-bottom: 20px; }
    .page-header h2 {
      font-size: 22px; font-weight: 600;
      letter-spacing: -0.02em; margin: 0 0 6px;
    }
    .subtitle {
      color: var(--text-secondary, #555); font-size: 14px;
      line-height: 1.5; margin: 0; max-width: 720px;
    }

    /* Guide banner */
    .info-banner { margin-bottom: 20px; border-left: 4px solid #1976d2; }
    .banner-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
    }
    .banner-title { display: flex; align-items: center; gap: 8px; font-size: 15px; }
    .banner-icon { color: #1976d2; }
    .banner-body { font-size: 14px; line-height: 1.6; }
    .guide-steps { display: flex; flex-direction: column; gap: 16px; margin-bottom: 16px; }
    .guide-step { display: flex; gap: 12px; align-items: flex-start; }
    .guide-step p { margin: 4px 0 0; color: var(--text-secondary, #555); }
    .step-number {
      flex-shrink: 0; width: 28px; height: 28px; background: #1976d2; color: #fff;
      border-radius: 50%; display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 13px;
    }
    .banner-tips { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
    .banner-tips p {
      display: flex; align-items: flex-start; gap: 8px; margin: 0;
      color: var(--text-secondary, #555);
    }
    .banner-tips mat-icon { font-size: 18px; color: #f9a825; flex-shrink: 0; margin-top: 2px; }
    .banner-tips a { color: #1976d2; text-decoration: none; font-weight: 500; }
    .banner-tips a:hover { text-decoration: underline; }
    .show-guide-btn { margin-bottom: 16px; font-size: 13px; }
    .show-guide-btn mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    code {
      background: rgba(0,0,0,.06); padding: 1px 5px; border-radius: 3px; font-size: 13px;
    }

    /* Toolbar */
    .toolbar {
      display: flex; flex-wrap: wrap; align-items: flex-start;
      justify-content: space-between; gap: 12px; margin-bottom: 20px;
    }
    .filters { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .filter-field { width: 200px; }
    .item-count {
      font-size: 13px; color: var(--text-secondary, #777);
      padding: 6px 12px; background: rgba(0,0,0,.04); border-radius: 16px;
    }

    /* Create form */
    .create-card { margin-bottom: 20px; border: 1px solid #1976d2; border-radius: 8px; }
    .create-title {
      font-size: 16px; font-weight: 600; margin: 0 0 4px;
      display: flex; align-items: center; gap: 6px;
    }
    .create-help {
      font-size: 13px; color: var(--text-secondary, #555);
      margin: 0 0 16px; line-height: 1.5;
    }
    .create-form { display: flex; flex-direction: column; gap: 4px; }
    .form-row-2 { display: flex; gap: 16px; flex-wrap: wrap; }
    .form-row-2 > * { flex: 1; min-width: 220px; }
    .full-width { width: 100%; }
    .scope-warning {
      display: flex; align-items: center; gap: 8px;
      background: #fff3e0; padding: 10px 14px; border-radius: 8px;
      font-size: 13px; color: #e65100;
    }
    .scope-warning mat-icon { color: #e65100; }
    .json-help {
      display: flex; align-items: flex-start; gap: 8px;
      font-size: 12px; color: var(--text-secondary, #666);
      background: rgba(25,118,210,.06); padding: 10px 14px;
      border-radius: 8px; line-height: 1.5;
    }
    .json-help mat-icon { font-size: 18px; color: #1976d2; flex-shrink: 0; margin-top: 1px; }
    .form-actions { display: flex; gap: 12px; margin-top: 8px; }

    /* Table */
    .templates-table { width: 100%; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: var(--bg-surface-hover, rgba(0,0,0,.03)); }

    .name-cell { display: flex; align-items: center; gap: 10px; padding: 4px 0; }
    .type-icon { color: #1976d2; font-size: 20px; }
    .template-name { display: block; font-weight: 600; font-size: 14px; }
    .template-desc {
      display: block; font-size: 12px; color: var(--text-secondary, #777); margin-top: 1px;
    }
    .type-chip { --mdc-chip-elevated-container-color: #f3e5f5; color: #7b1fa2; }
    .date-text { font-size: 13px; color: var(--text-secondary, #777); }

    .status-draft { --mdc-chip-elevated-container-color: #f5f5f5; color: #757575; }
    .status-in-review { --mdc-chip-elevated-container-color: #fff3e0; color: #e65100; }
    .status-approved { --mdc-chip-elevated-container-color: #e8f5e9; color: #2e7d32; }
    .status-rejected { --mdc-chip-elevated-container-color: #ffebee; color: #c62828; }
    .status-archived { --mdc-chip-elevated-container-color: #eceff1; color: #546e7a; }

    .ver-badge {
      font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 999px;
      background: var(--mat-sys-surface-container-high, #eee);
    }

    /* Empty state */
    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #bdbdbd; margin-bottom: 12px; }
    .empty-state h3 { font-size: 16px; font-weight: 600; margin: 0 0 8px; }
    .empty-state p { color: var(--text-secondary, #777); font-size: 14px; margin: 0 0 16px; }
    .spinner-wrap { display: flex; justify-content: center; padding: 48px; }

    /* Related pages */
    .related-card { margin-top: 24px; }
    .related-heading { font-size: 14px; font-weight: 600; margin: 0 0 12px; color: var(--text-secondary, #555); }
    .related-links { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
    .related-link {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px 16px; border-radius: 8px;
      text-decoration: none; color: inherit; transition: background 0.15s;
    }
    .related-link:hover { background: rgba(0,0,0,.04); }
    .related-link mat-icon { color: #1976d2; margin-top: 2px; }
    .related-link strong { display: block; font-size: 14px; margin-bottom: 2px; }
    .related-link span { font-size: 12px; color: var(--text-secondary, #777); line-height: 1.4; }
  `],
})
export class TemplatesListComponent implements OnInit {
  readonly templateTypeOptions = TEMPLATE_TYPE_OPTIONS;
  readonly statusOptions = STATUS_OPTIONS;

  readonly showGuide = signal(true);
  readonly showCreateForm = signal(false);
  loading = signal(false);
  creating = signal(false);
  filterType = signal('');
  filterStatus = signal('');
  createScope = signal<'ORG' | 'WORKSPACE'>('ORG');
  createTemplateType = signal<string>('AD_COPY');
  createName = signal('');
  createDescription = signal('');
  createContentJson = signal('{}');

  rows: TemplateResponse[] = [];
  displayedColumns = ['name', 'templateType', 'status', 'version', 'scope', 'createdAt', 'actions'];

  constructor(
    private readonly templatesApi: TemplatesApiService,
    private readonly admin: AdminStore,
    private readonly router: Router,
    private readonly notify: NotificationService,
  ) {}

  orgId = this.admin.selectedOrgId;
  workspaceId = this.admin.selectedWorkspaceId;

  ngOnInit(): void {
    this.reload();
  }

  typeIcon(type: string): string {
    return TEMPLATE_TYPE_OPTIONS.find((t) => t.value === type)?.icon ?? 'article';
  }

  typeLabel(type: string): string {
    return TEMPLATE_TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type;
  }

  typeDescription(type: string): string {
    return TEMPLATE_TYPE_OPTIONS.find((t) => t.value === type)?.description ?? '';
  }

  statusIcon(status: string): string {
    return STATUS_OPTIONS.find((s) => s.value === status)?.icon ?? 'help';
  }

  statusLabel(status: string): string {
    return STATUS_OPTIONS.find((s) => s.value === status)?.label ?? status;
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      DRAFT: 'status-draft',
      IN_REVIEW: 'status-in-review',
      APPROVED: 'status-approved',
      REJECTED: 'status-rejected',
      ARCHIVED: 'status-archived',
    };
    return map[status] ?? '';
  }

  preview(text: string, max = 80): string {
    const t = text?.trim() ?? '';
    return t.length <= max ? t : t.slice(0, max) + '…';
  }

  reload(): void {
    const oid = this.orgId();
    if (!oid) {
      this.rows = [];
      return;
    }
    this.loading.set(true);
    const ws = this.workspaceId() || undefined;
    const t = this.filterType() || undefined;
    const st = this.filterStatus() || undefined;
    this.templatesApi.list(oid, ws, t, st).subscribe({
      next: (data) => {
        this.rows = data;
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.notify.error(err.error?.detail || 'Failed to load templates');
      },
    });
  }

  openDetail(row: TemplateResponse): void {
    void this.router.navigate(['/governance/templates', row.id]);
  }

  archiveTemplate(row: TemplateResponse): void {
    const oid = this.orgId();
    if (!oid) return;
    this.templatesApi.archive(oid, row.id).subscribe({
      next: () => {
        this.notify.success(`"${row.name}" archived`);
        this.reload();
      },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.detail || 'Failed to archive template'),
    });
  }

  submitCreate(): void {
    const oid = this.orgId();
    if (!oid) {
      this.notify.error('Select an organization');
      return;
    }
    const scope = this.createScope();
    if (scope === 'WORKSPACE' && !this.workspaceId()) {
      this.notify.error('Workspace scope requires a selected workspace');
      return;
    }
    let contentJson = this.createContentJson().trim();
    if (!contentJson) contentJson = '{}';
    try {
      JSON.parse(contentJson);
    } catch {
      this.notify.error('Content JSON is not valid — check syntax');
      return;
    }
    const name = this.createName().trim();
    if (!name) {
      this.notify.error('Name is required');
      return;
    }
    this.creating.set(true);
    this.templatesApi
      .create(oid, {
        scope,
        workspaceId: scope === 'WORKSPACE' ? this.workspaceId()! : undefined,
        templateType: this.createTemplateType(),
        name,
        description: this.createDescription().trim() || undefined,
        contentJson,
      })
      .subscribe({
        next: (created) => {
          this.creating.set(false);
          this.notify.success('Template created — click to view and submit for review');
          this.createName.set('');
          this.createDescription.set('');
          this.createContentJson.set('{}');
          this.showCreateForm.set(false);
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.creating.set(false);
          this.notify.error(err.error?.detail || 'Failed to create template');
        },
      });
  }
}
