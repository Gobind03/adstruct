import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '../../../core/services/notification.service';
import { TemplatesApiService } from '../services/templates-api.service';
import { TemplateResponse } from '../models/governance.models';

interface TemplateTypeInfo { label: string; icon: string; }

const TYPE_MAP: Record<string, TemplateTypeInfo> = {
  AD_COPY:      { label: 'Ad Copy',      icon: 'campaign' },
  SOCIAL_POST:  { label: 'Social Post',  icon: 'share' },
  LANDING_COPY: { label: 'Landing Copy', icon: 'web' },
  EMAIL:        { label: 'Email',        icon: 'email' },
  SMS:          { label: 'SMS',          icon: 'sms' },
  UGC_BRIEF:    { label: 'UGC Brief',    icon: 'groups' },
  VIDEO_SCRIPT: { label: 'Video Script', icon: 'videocam' },
  IMAGE_BRIEF:  { label: 'Image Brief',  icon: 'image' },
  POLICY_TEXT:  { label: 'Policy Text',  icon: 'policy' },
  OTHER:        { label: 'Other',        icon: 'article' },
};

const STATUS_META: Record<string, { label: string; icon: string; cssClass: string; helpText: string }> = {
  DRAFT:     { label: 'Draft',     icon: 'edit_note',     cssClass: 'status-draft',     helpText: 'This template is in draft — edit it, then submit for review.' },
  IN_REVIEW: { label: 'In Review', icon: 'rate_review',   cssClass: 'status-in-review', helpText: 'Awaiting approval — a reviewer can approve or reject this template.' },
  APPROVED:  { label: 'Approved',  icon: 'check_circle',  cssClass: 'status-approved',  helpText: 'This template is approved and available for content generation.' },
  REJECTED:  { label: 'Rejected',  icon: 'cancel',        cssClass: 'status-rejected',  helpText: 'This template was rejected — create a new version to revise.' },
  ARCHIVED:  { label: 'Archived',  icon: 'archive',       cssClass: 'status-archived',  helpText: 'This template is archived and no longer in active use.' },
};

@Component({
  selector: 'app-template-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    @if (loading()) {
      <div class="spinner-wrap"><mat-spinner diameter="40"></mat-spinner></div>
    } @else if (!orgId()) {
      <div class="empty-state">
        <mat-icon class="empty-icon">business</mat-icon>
        <h3>No organization selected</h3>
        <p>Select an organization from the top bar to view this template.</p>
      </div>
    } @else if (!template()) {
      <div class="empty-state">
        <mat-icon class="empty-icon">search_off</mat-icon>
        <h3>Template not found</h3>
        <p>The template may have been deleted or you don't have access.</p>
        <a routerLink="/governance/templates" mat-stroked-button>
          <mat-icon>arrow_back</mat-icon> Back to Templates
        </a>
      </div>
    } @else {
      <!-- Breadcrumb -->
      <a routerLink="/governance/templates" class="breadcrumb">
        <mat-icon>arrow_back</mat-icon> All Templates
      </a>

      <!-- Header -->
      <div class="detail-header">
        <div class="header-left">
          <div class="name-row">
            <mat-icon class="type-icon-lg">{{ typeIcon() }}</mat-icon>
            <h1>{{ template()!.name }}</h1>
          </div>
          <div class="meta-chips">
            <span class="ver-badge" matTooltip="Template version">v{{ template()!.version }}</span>
            <mat-chip-set>
              <mat-chip [class]="statusCssClass()" [matTooltip]="statusHelpText()">
                <mat-icon matChipAvatar>{{ statusIcon() }}</mat-icon>
                {{ statusLabel() }}
              </mat-chip>
              <mat-chip class="type-chip" [matTooltip]="'Template type: ' + typeLabel()">
                <mat-icon matChipAvatar>{{ typeIcon() }}</mat-icon>
                {{ typeLabel() }}
              </mat-chip>
              <mat-chip [highlighted]="template()!.scope === 'ORG'"
                [matTooltip]="template()!.scope === 'ORG' ? 'Available to all workspaces' : 'Specific to one workspace'">
                <mat-icon matChipAvatar>{{ template()!.scope === 'ORG' ? 'corporate_fare' : 'workspaces' }}</mat-icon>
                {{ template()!.scope === 'ORG' ? 'Organization' : 'Workspace' }}
              </mat-chip>
            </mat-chip-set>
          </div>
          @if (template()!.description) {
            <p class="template-description">{{ template()!.description }}</p>
          }
        </div>
      </div>

      <!-- Status help banner -->
      <div class="status-banner" [class]="'status-banner-' + template()!.status.toLowerCase()">
        <mat-icon>{{ statusIcon() }}</mat-icon>
        <span>{{ statusHelpText() }}</span>
      </div>

      <!-- Action bar -->
      <mat-card class="action-card">
        <mat-card-content>
          <div class="action-bar">
            @if (template()!.status === 'DRAFT') {
              @if (!editing()) {
                <button mat-stroked-button (click)="startEdit()" matTooltip="Edit name, description, and content JSON">
                  <mat-icon>edit</mat-icon> Edit draft
                </button>
                <button mat-raised-button color="primary" (click)="submitForReview()" [disabled]="actionBusy()"
                  matTooltip="Submit this draft for approval — reviewers will be notified">
                  <mat-icon>send</mat-icon> Submit for review
                </button>
              } @else {
                <button mat-button (click)="cancelEdit()" [disabled]="actionBusy()">Cancel</button>
                <button mat-raised-button color="primary" (click)="saveEdit()" [disabled]="actionBusy()">
                  <mat-icon>save</mat-icon> Save changes
                </button>
              }
            }
            @if (template()!.status === 'IN_REVIEW') {
              <mat-form-field appearance="outline" class="notes-field">
                <mat-label>Review notes (optional)</mat-label>
                <input matInput [value]="approvalNotes()" (input)="approvalNotes.set($any($event.target).value)"
                  placeholder="e.g. Looks good, approved for Q2 campaigns" />
                <mat-hint>Add optional notes visible to the template author</mat-hint>
              </mat-form-field>
              <button mat-raised-button color="primary" (click)="approve()" [disabled]="actionBusy()"
                matTooltip="Approve this template — it will become available for content generation">
                <mat-icon>check_circle</mat-icon> Approve
              </button>
              <button mat-raised-button color="warn" (click)="reject()" [disabled]="actionBusy()"
                matTooltip="Reject this template — the author can create a new version">
                <mat-icon>cancel</mat-icon> Reject
              </button>
            }
            @if (template()!.status === 'APPROVED') {
              <button mat-raised-button color="primary" (click)="newVersion()" [disabled]="actionBusy()"
                matTooltip="Create a new DRAFT version based on this template — the current version stays active">
                <mat-icon>add_circle</mat-icon> New version
              </button>
              <button mat-stroked-button (click)="archive()" [disabled]="actionBusy()"
                matTooltip="Archive this template — it will no longer be used for content generation">
                <mat-icon>archive</mat-icon> Archive
              </button>
            }
            @if (template()!.status === 'REJECTED') {
              <button mat-raised-button color="primary" (click)="newVersion()" [disabled]="actionBusy()"
                matTooltip="Create a new DRAFT version to revise and resubmit">
                <mat-icon>refresh</mat-icon> Revise (new version)
              </button>
            }
            @if (template()!.status === 'ARCHIVED') {
              <p class="muted-text">This template is archived. Create a new template to replace it.</p>
            }
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Details card -->
      <mat-card class="info-card">
        <mat-card-content>
          <h3 class="section-title"><mat-icon inline>info</mat-icon> Template details</h3>
          <div class="kv-grid">
            <div class="kv-item">
              <label>Template type</label>
              <span><mat-icon inline>{{ typeIcon() }}</mat-icon> {{ typeLabel() }}</span>
            </div>
            <div class="kv-item">
              <label>Scope</label>
              <span>{{ template()!.scope === 'ORG' ? 'Organization (all workspaces)' : 'Workspace' }}</span>
            </div>
            <div class="kv-item">
              <label>Version</label>
              <span>v{{ template()!.version }}</span>
            </div>
            <div class="kv-item">
              <label>Created</label>
              <span>{{ template()!.createdAt | date: 'medium' }}</span>
            </div>
            <div class="kv-item">
              <label>Last updated</label>
              <span>{{ template()!.updatedAt | date: 'medium' }}</span>
            </div>
            <div class="kv-item">
              <label matTooltip="The rule set linked to this template — content generated from it will be checked against these rules">
                Linked rule set
              </label>
              <span>
                @if (template()!.ruleSetId) {
                  <a [routerLink]="'/governance/rulesets/' + template()!.ruleSetId">{{ template()!.ruleSetId }}</a>
                } @else {
                  <span class="muted-text">None — <a routerLink="/governance/rulesets">link a rule set</a> for automatic compliance checks</span>
                }
              </span>
            </div>
            <div class="kv-item">
              <label matTooltip="Disclaimer IDs that must be included when generating content from this template">
                Linked disclaimers
              </label>
              <span>
                @if (template()!.defaultDisclaimerIds) {
                  {{ template()!.defaultDisclaimerIds }}
                } @else {
                  <span class="muted-text">None — <a routerLink="/governance/disclaimers">attach disclaimers</a> for required legal text</span>
                }
              </span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Edit panel (DRAFT only) -->
      @if (template()!.status === 'DRAFT' && editing()) {
        <mat-card class="edit-card">
          <mat-card-content>
            <h3 class="section-title"><mat-icon inline>edit</mat-icon> Edit template</h3>
            <p class="edit-help">
              Update the template name, description, and content structure. Changes are saved immediately
              but the template stays in DRAFT until you submit it for review.
            </p>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Name</mat-label>
              <input matInput [value]="editName()" (input)="editName.set($any($event.target).value)" />
              <mat-hint>A descriptive name for this template</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Description</mat-label>
              <textarea matInput rows="2"
                [value]="editDescription()" (input)="editDescription.set($any($event.target).value)"
                placeholder="What is this template for?"></textarea>
              <mat-hint>Optional — helps others understand this template's purpose</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Content JSON</mat-label>
              <textarea matInput rows="10"
                [value]="editContentJson()" (input)="editContentJson.set($any($event.target).value)"></textarea>
              <mat-hint>Define the template structure — AI agents will populate these fields</mat-hint>
            </mat-form-field>
          </mat-card-content>
        </mat-card>
      }

      <!-- Content card -->
      <mat-card class="content-card">
        <mat-card-content>
          <div class="content-header">
            <h3 class="section-title"><mat-icon inline>code</mat-icon> Content</h3>
            <mat-button-toggle-group [value]="contentView()" (change)="contentView.set($event.value)" class="view-toggle">
              <mat-button-toggle value="structured" matTooltip="Show as key-value pairs">
                <mat-icon>table_rows</mat-icon> Structured
              </mat-button-toggle>
              <mat-button-toggle value="json" matTooltip="Show raw JSON">
                <mat-icon>data_object</mat-icon> JSON
              </mat-button-toggle>
            </mat-button-toggle-group>
          </div>
          <p class="content-help">
            This is the template's content structure. AI agents use these fields as placeholders
            when generating content. Each key represents a section (headline, body, CTA, etc.).
          </p>
          @if (contentView() === 'json') {
            <pre class="json-block">{{ formattedJson() }}</pre>
          } @else {
            @if (structuredRows().length === 0) {
              <pre class="json-block">{{ formattedJson() }}</pre>
            } @else {
              <table class="struct-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  @for (row of structuredRows(); track row.key) {
                    <tr>
                      <td class="field-key">
                        <code>{{ row.key }}</code>
                      </td>
                      <td class="field-value">
                        @if (row.value) {
                          {{ row.value }}
                        } @else {
                          <span class="muted-text">(empty — AI will populate)</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          }
        </mat-card-content>
      </mat-card>

      <!-- Workflow guide -->
      @if (showWorkflowGuide()) {
        <mat-card class="workflow-card">
          <mat-card-content>
            <div class="banner-header">
              <div class="banner-title">
                <mat-icon class="banner-icon">route</mat-icon>
                <strong>Template lifecycle</strong>
              </div>
              <button mat-icon-button (click)="showWorkflowGuide.set(false)" matTooltip="Dismiss">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="workflow-steps">
              <div class="wf-step" [class.wf-active]="template()!.status === 'DRAFT'">
                <mat-icon>edit_note</mat-icon>
                <div>
                  <strong>Draft</strong>
                  <p>Create and edit the template content.</p>
                </div>
              </div>
              <mat-icon class="wf-arrow">arrow_forward</mat-icon>
              <div class="wf-step" [class.wf-active]="template()!.status === 'IN_REVIEW'">
                <mat-icon>rate_review</mat-icon>
                <div>
                  <strong>In Review</strong>
                  <p>Submitted for approval.</p>
                </div>
              </div>
              <mat-icon class="wf-arrow">arrow_forward</mat-icon>
              <div class="wf-step" [class.wf-active]="template()!.status === 'APPROVED'">
                <mat-icon>check_circle</mat-icon>
                <div>
                  <strong>Approved</strong>
                  <p>Active and used by AI agents.</p>
                </div>
              </div>
              <mat-icon class="wf-arrow">arrow_forward</mat-icon>
              <div class="wf-step" [class.wf-active]="template()!.status === 'ARCHIVED'">
                <mat-icon>archive</mat-icon>
                <div>
                  <strong>Archived</strong>
                  <p>No longer in use.</p>
                </div>
              </div>
            </div>
            @if (template()!.status === 'REJECTED') {
              <div class="rejected-note">
                <mat-icon>info</mat-icon>
                <span>This template was <strong>rejected</strong>. Click "Revise (new version)" to create an editable copy and resubmit.</span>
              </div>
            }
          </mat-card-content>
        </mat-card>
      } @else {
        <button mat-stroked-button class="show-guide-btn" (click)="showWorkflowGuide.set(true)">
          <mat-icon>route</mat-icon> Show lifecycle guide
        </button>
      }

      <!-- Related pages -->
      <mat-card class="related-card">
        <mat-card-content>
          <h4 class="related-heading">Related pages</h4>
          <div class="related-links">
            <a routerLink="/governance/rulesets" class="related-link">
              <mat-icon>rule_folder</mat-icon>
              <div>
                <strong>Rule Sets</strong>
                <span>Link compliance rules to this template</span>
              </div>
            </a>
            <a routerLink="/governance/disclaimers" class="related-link">
              <mat-icon>gavel</mat-icon>
              <div>
                <strong>Disclaimers</strong>
                <span>Attach required legal disclaimers</span>
              </div>
            </a>
            <a routerLink="/governance/checks" class="related-link">
              <mat-icon>verified</mat-icon>
              <div>
                <strong>Governance Checks</strong>
                <span>Validate content generated from templates</span>
              </div>
            </a>
            <a routerLink="/governance/assets" class="related-link">
              <mat-icon>image</mat-icon>
              <div>
                <strong>Brand Assets</strong>
                <span>Reference approved logos and images</span>
              </div>
            </a>
          </div>
        </mat-card-content>
      </mat-card>
    }
  `,
  styles: [`
    /* Spinner & empty */
    .spinner-wrap { display: flex; justify-content: center; padding: 48px; }
    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #bdbdbd; margin-bottom: 12px; }
    .empty-state h3 { font-size: 16px; font-weight: 600; margin: 0 0 8px; }
    .empty-state p { color: var(--text-secondary, #777); font-size: 14px; margin: 0 0 16px; }

    /* Breadcrumb */
    .breadcrumb {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 13px; color: #1976d2; text-decoration: none;
      margin-bottom: 16px;
    }
    .breadcrumb:hover { text-decoration: underline; }
    .breadcrumb mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Header */
    .detail-header { margin-bottom: 16px; }
    .name-row { display: flex; align-items: center; gap: 10px; }
    .type-icon-lg { font-size: 28px; width: 28px; height: 28px; color: #1976d2; }
    h1 { margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; }
    .meta-chips { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 10px; }
    .ver-badge {
      font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 999px;
      background: var(--mat-sys-surface-container-high, #eee);
    }
    .template-description {
      font-size: 14px; color: var(--text-secondary, #555); margin: 10px 0 0; line-height: 1.5;
      max-width: 640px;
    }
    .type-chip { --mdc-chip-elevated-container-color: #f3e5f5; color: #7b1fa2; }

    /* Status banner */
    .status-banner {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 8px; margin-bottom: 16px;
      font-size: 14px; line-height: 1.4;
    }
    .status-banner-draft { background: #f5f5f5; color: #616161; }
    .status-banner-in_review { background: #fff3e0; color: #e65100; }
    .status-banner-approved { background: #e8f5e9; color: #2e7d32; }
    .status-banner-rejected { background: #ffebee; color: #c62828; }
    .status-banner-archived { background: #eceff1; color: #546e7a; }

    /* Status chips */
    .status-draft { --mdc-chip-elevated-container-color: #f5f5f5; color: #757575; }
    .status-in-review { --mdc-chip-elevated-container-color: #fff3e0; color: #e65100; }
    .status-approved { --mdc-chip-elevated-container-color: #e8f5e9; color: #2e7d32; }
    .status-rejected { --mdc-chip-elevated-container-color: #ffebee; color: #c62828; }
    .status-archived { --mdc-chip-elevated-container-color: #eceff1; color: #546e7a; }

    /* Action card */
    .action-card { margin-bottom: 16px; }
    .action-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .notes-field { min-width: 280px; flex: 1; max-width: 400px; }
    .muted-text { color: var(--text-secondary, #999); font-size: 13px; }
    .muted-text a { color: #1976d2; text-decoration: none; }
    .muted-text a:hover { text-decoration: underline; }

    /* Info card */
    .info-card { margin-bottom: 16px; }
    .section-title {
      font-size: 15px; font-weight: 600; margin: 0 0 14px;
      display: flex; align-items: center; gap: 6px;
    }
    .kv-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    .kv-item { display: flex; flex-direction: column; gap: 2px; }
    .kv-item label {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.04em; color: var(--text-secondary, #999);
    }
    .kv-item span { font-size: 14px; display: flex; align-items: center; gap: 4px; }
    .kv-item a { color: #1976d2; text-decoration: none; font-size: 13px; }
    .kv-item a:hover { text-decoration: underline; }

    /* Edit card */
    .edit-card { margin-bottom: 16px; border: 1px solid #1976d2; border-radius: 8px; }
    .edit-help {
      font-size: 13px; color: var(--text-secondary, #555);
      margin: 0 0 16px; line-height: 1.5;
    }
    .full-width { width: 100%; margin-bottom: 8px; }

    /* Content card */
    .content-card { margin-bottom: 16px; }
    .content-header {
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 12px; margin-bottom: 4px;
    }
    .view-toggle { height: 36px; }
    .content-help {
      font-size: 13px; color: var(--text-secondary, #555);
      margin: 0 0 14px; line-height: 1.5;
    }
    .json-block {
      margin: 0; padding: 14px; background: #f5f5f5; border-radius: 8px;
      overflow: auto; font-size: 13px; line-height: 1.5; max-height: 420px;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .struct-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .struct-table thead th {
      text-align: left; font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.04em;
      color: var(--text-secondary, #999); padding: 0 0 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    .struct-table tbody td { padding: 10px 12px 10px 0; border-bottom: 1px solid #f5f5f5; }
    .field-key { width: 200px; vertical-align: top; }
    .field-key code {
      background: rgba(0,0,0,.06); padding: 2px 6px; border-radius: 3px;
      font-size: 13px; font-weight: 500;
    }
    .field-value { word-break: break-word; }

    /* Workflow card */
    .workflow-card { margin-bottom: 16px; border-left: 4px solid #1976d2; }
    .banner-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
    }
    .banner-title { display: flex; align-items: center; gap: 8px; font-size: 15px; }
    .banner-icon { color: #1976d2; }
    .workflow-steps {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      padding: 8px 0;
    }
    .wf-step {
      display: flex; align-items: flex-start; gap: 8px;
      padding: 10px 14px; border-radius: 8px;
      background: rgba(0,0,0,.03); min-width: 120px;
    }
    .wf-step.wf-active {
      background: rgba(25,118,210,.1); outline: 2px solid #1976d2;
    }
    .wf-step mat-icon { color: var(--text-secondary, #777); margin-top: 2px; }
    .wf-step.wf-active mat-icon { color: #1976d2; }
    .wf-step strong { display: block; font-size: 13px; }
    .wf-step p { margin: 2px 0 0; font-size: 12px; color: var(--text-secondary, #777); }
    .wf-arrow { color: var(--text-secondary, #bbb); font-size: 20px; }
    .rejected-note {
      display: flex; align-items: center; gap: 8px;
      margin-top: 12px; padding: 10px 14px;
      background: #ffebee; border-radius: 8px;
      font-size: 13px; color: #c62828;
    }
    .show-guide-btn { margin-bottom: 16px; font-size: 13px; }
    .show-guide-btn mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    code {
      background: rgba(0,0,0,.06); padding: 1px 5px; border-radius: 3px; font-size: 13px;
    }

    /* Related pages */
    .related-card { margin-top: 8px; }
    .related-heading { font-size: 14px; font-weight: 600; margin: 0 0 12px; color: var(--text-secondary, #555); }
    .related-links { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
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
export class TemplateDetailComponent implements OnInit, OnDestroy {
  loading = signal(true);
  actionBusy = signal(false);
  template = signal<TemplateResponse | null>(null);
  editing = signal(false);
  editName = signal('');
  editDescription = signal('');
  editContentJson = signal('');
  contentView = signal<'structured' | 'json'>('structured');
  approvalNotes = signal('');
  showWorkflowGuide = signal(true);

  private templateId: string | null = null;
  private sub?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly templatesApi: TemplatesApiService,
    private readonly admin: AdminStore,
    private readonly notify: NotificationService,
  ) {}

  orgId = this.admin.selectedOrgId;

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe((pm) => {
      const id = pm.get('id');
      this.templateId = id;
      if (id) this.load(id);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  typeIcon(): string {
    return TYPE_MAP[this.template()?.templateType ?? '']?.icon ?? 'article';
  }
  typeLabel(): string {
    return TYPE_MAP[this.template()?.templateType ?? '']?.label ?? this.template()?.templateType ?? '';
  }
  statusIcon(): string {
    return STATUS_META[this.template()?.status ?? '']?.icon ?? 'help';
  }
  statusLabel(): string {
    return STATUS_META[this.template()?.status ?? '']?.label ?? this.template()?.status ?? '';
  }
  statusCssClass(): string {
    return STATUS_META[this.template()?.status ?? '']?.cssClass ?? '';
  }
  statusHelpText(): string {
    return STATUS_META[this.template()?.status ?? '']?.helpText ?? '';
  }

  formattedJson(): string {
    const raw = this.template()?.contentJson ?? '';
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  }

  structuredRows(): { key: string; value: string }[] {
    const raw = this.template()?.contentJson ?? '';
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
      return Object.entries(parsed as Record<string, unknown>).map(([key, value]) => ({
        key,
        value: value !== null && typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? ''),
      }));
    } catch {
      return [];
    }
  }

  private load(id: string): void {
    const oid = this.orgId();
    if (!oid) {
      this.loading.set(false);
      this.template.set(null);
      return;
    }
    this.loading.set(true);
    this.templatesApi.get(oid, id).subscribe({
      next: (t) => {
        this.template.set(t);
        this.loading.set(false);
        this.editing.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.template.set(null);
        this.notify.error(err.error?.detail || 'Failed to load template');
      },
    });
  }

  startEdit(): void {
    const t = this.template();
    if (!t) return;
    this.editName.set(t.name);
    this.editDescription.set(t.description ?? '');
    this.editContentJson.set(t.contentJson);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveEdit(): void {
    const oid = this.orgId();
    const id = this.templateId;
    if (!oid || !id) return;
    let contentJson = this.editContentJson().trim();
    try {
      if (contentJson) JSON.parse(contentJson);
      else contentJson = '{}';
    } catch {
      this.notify.error('Content JSON is not valid — check syntax');
      return;
    }
    this.actionBusy.set(true);
    this.templatesApi
      .patch(oid, id, {
        name: this.editName().trim() || undefined,
        description: this.editDescription().trim() || undefined,
        contentJson,
      })
      .subscribe({
        next: (t) => {
          this.actionBusy.set(false);
          this.template.set(t);
          this.editing.set(false);
          this.notify.success('Template updated');
        },
        error: (err: HttpErrorResponse) => {
          this.actionBusy.set(false);
          this.notify.error(err.error?.detail || 'Failed to save template');
        },
      });
  }

  submitForReview(): void {
    const oid = this.orgId();
    const id = this.templateId;
    if (!oid || !id) return;
    this.actionBusy.set(true);
    this.templatesApi.submit(oid, id).subscribe({
      next: (t) => {
        this.actionBusy.set(false);
        this.template.set(t);
        this.notify.success('Submitted for review');
      },
      error: (err: HttpErrorResponse) => {
        this.actionBusy.set(false);
        this.notify.error(err.error?.detail || 'Submit failed');
      },
    });
  }

  approve(): void {
    const oid = this.orgId();
    const id = this.templateId;
    if (!oid || !id) return;
    this.actionBusy.set(true);
    const notes = this.approvalNotes().trim();
    this.templatesApi.approve(oid, id, notes || undefined).subscribe({
      next: (t) => {
        this.actionBusy.set(false);
        this.template.set(t);
        this.approvalNotes.set('');
        this.notify.success('Template approved');
      },
      error: (err: HttpErrorResponse) => {
        this.actionBusy.set(false);
        this.notify.error(err.error?.detail || 'Approve failed');
      },
    });
  }

  reject(): void {
    const oid = this.orgId();
    const id = this.templateId;
    if (!oid || !id) return;
    this.actionBusy.set(true);
    const notes = this.approvalNotes().trim();
    this.templatesApi.reject(oid, id, notes || undefined).subscribe({
      next: (t) => {
        this.actionBusy.set(false);
        this.template.set(t);
        this.approvalNotes.set('');
        this.notify.success('Template rejected');
      },
      error: (err: HttpErrorResponse) => {
        this.actionBusy.set(false);
        this.notify.error(err.error?.detail || 'Reject failed');
      },
    });
  }

  newVersion(): void {
    const oid = this.orgId();
    const id = this.templateId;
    if (!oid || !id) return;
    this.actionBusy.set(true);
    this.templatesApi.newVersion(oid, id).subscribe({
      next: (t) => {
        this.actionBusy.set(false);
        this.notify.success('New version created — now editing draft v' + t.version);
        void this.router.navigate(['/governance/templates', t.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.actionBusy.set(false);
        this.notify.error(err.error?.detail || 'Could not create new version');
      },
    });
  }

  archive(): void {
    const oid = this.orgId();
    const id = this.templateId;
    if (!oid || !id) return;
    this.actionBusy.set(true);
    this.templatesApi.archive(oid, id).subscribe({
      next: (t) => {
        this.actionBusy.set(false);
        this.template.set(t);
        this.notify.success('Template archived');
      },
      error: (err: HttpErrorResponse) => {
        this.actionBusy.set(false);
        this.notify.error(err.error?.detail || 'Archive failed');
      },
    });
  }
}
