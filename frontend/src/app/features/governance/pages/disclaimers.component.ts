import { Component, OnDestroy, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { AdminStore } from '@features/admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { DisclaimersApiService } from '../services/disclaimers-api.service';
import { DisclaimerLocalizationResponse, DisclaimerResponse } from '../models/governance.models';

@Component({
  selector: 'app-disclaimers',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatChipsModule,
    MatMenuModule,
  ],
  template: `
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-text">
        <h2>Disclaimers</h2>
        <p class="subtitle">
          Define required legal and regulatory disclaimer texts that must accompany your content.
          Each disclaimer can be localized into multiple languages and scoped to your entire
          organization or specific workspaces.
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
              <strong>How Disclaimers work</strong>
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
                  <strong>Create a disclaimer</strong>
                  <p>
                    Give it a unique <strong>key</strong> (e.g. <code>fdic_insured</code>) and provide
                    the <strong>default text</strong> that should be inserted whenever this disclaimer
                    is required.
                  </p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">2</div>
                <div>
                  <strong>Add localizations</strong>
                  <p>
                    Click a disclaimer to expand it, then add translated versions for each language
                    your organization supports (e.g. <code>es</code>, <code>fr</code>, <code>de</code>).
                  </p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">3</div>
                <div>
                  <strong>Reference in rule sets</strong>
                  <p>
                    Use <a routerLink="/governance/rulesets">Rule Sets</a> to create
                    <em>REQUIRED_DISCLAIMER</em> rules that reference disclaimer keys. The
                    <a routerLink="/governance/checks">Governance Check</a> engine will verify
                    that the correct disclaimer text appears in your content.
                  </p>
                </div>
              </div>
            </div>
            <mat-divider></mat-divider>
            <div class="banner-tips">
              <p>
                <mat-icon inline>lightbulb</mat-icon>
                <strong>Tip:</strong> Use short, descriptive keys like <code>fdic_insured</code> or
                <code>past_performance</code> — they serve as stable identifiers across rule sets and templates.
              </p>
              <p>
                <mat-icon inline>language</mat-icon>
                Localizations let AI agents insert the right language version automatically based on
                the target audience's locale.
              </p>
              <p>
                <mat-icon inline>gavel</mat-icon>
                Disclaimers work hand-in-hand with your <a routerLink="/governance/rulesets">Rule Sets</a> —
                the rule set defines <em>when</em> a disclaimer is required, and the disclaimer record
                provides the <em>exact text</em>.
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
            <p>Select an organization from the top bar to view and manage disclaimers.</p>
          </div>
        } @else {
          <!-- Toolbar -->
          <div class="toolbar">
            <div class="filters">
              <mat-form-field appearance="outline" class="filter-field">
                <mat-label>Status</mat-label>
                <mat-select [formControl]="filterForm.controls.status">
                  <mat-option value="">All statuses</mat-option>
                  <mat-option value="ACTIVE">Active</mat-option>
                  <mat-option value="ARCHIVED">Archived</mat-option>
                </mat-select>
                <mat-hint>Filter by lifecycle status</mat-hint>
              </mat-form-field>
              <span class="item-count" matTooltip="Matching disclaimers">
                {{ disclaimers().length }} disclaimer{{ disclaimers().length !== 1 ? 's' : '' }}
              </span>
            </div>
            <button mat-raised-button color="primary" (click)="showCreateForm.set(!showCreateForm())">
              <mat-icon>{{ showCreateForm() ? 'close' : 'add' }}</mat-icon>
              {{ showCreateForm() ? 'Cancel' : 'Create disclaimer' }}
            </button>
          </div>

          <!-- Create form -->
          @if (showCreateForm()) {
            <mat-card class="create-card">
              <mat-card-content>
                <h3 class="create-title"><mat-icon inline>gavel</mat-icon> Create a new disclaimer</h3>
                <p class="create-help">
                  A disclaimer is a reusable block of legally required text. Once created, you can
                  localize it into multiple languages and reference it in rule sets to enforce its
                  presence in generated content.
                </p>
                <form [formGroup]="createForm" (ngSubmit)="createDisclaimer()" class="create-form">
                  <div class="form-row-2">
                    <mat-form-field appearance="outline">
                      <mat-label>Key</mat-label>
                      <input matInput formControlName="key" placeholder="e.g. fdic_insured" />
                      <mat-icon matPrefix matTooltip="A stable identifier used to reference this disclaimer in rule sets and templates">vpn_key</mat-icon>
                      <mat-hint>Unique identifier — lowercase, underscores allowed</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Title</mat-label>
                      <input matInput formControlName="title" placeholder="e.g. FDIC Insurance Disclaimer" />
                      <mat-hint>Human-readable name for this disclaimer</mat-hint>
                    </mat-form-field>
                  </div>
                  <div class="form-row-2">
                    <mat-form-field appearance="outline">
                      <mat-label>Scope</mat-label>
                      <mat-select formControlName="scope">
                        <mat-option value="ORG">Organization — applies to all workspaces</mat-option>
                        <mat-option value="WORKSPACE">Workspace — only this workspace</mat-option>
                      </mat-select>
                      <mat-hint>Who should see and use this disclaimer?</mat-hint>
                    </mat-form-field>
                    <div class="scope-hint-box">
                      <mat-icon inline>info</mat-icon>
                      <span>
                        <strong>ORG</strong> disclaimers are shared across all workspaces.
                        <strong>WORKSPACE</strong> disclaimers are specific to the currently selected workspace.
                      </span>
                    </div>
                  </div>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Default text</mat-label>
                    <textarea matInput formControlName="defaultText" rows="4"
                      placeholder="e.g. Deposits are FDIC insured up to $250,000 per depositor."></textarea>
                    <mat-hint>The full disclaimer text in your default language — this is what gets inserted into content</mat-hint>
                  </mat-form-field>
                  <div class="form-actions">
                    <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid || creating()">
                      <mat-icon>check</mat-icon> Create disclaimer
                    </button>
                    <button mat-stroked-button type="button" (click)="showCreateForm.set(false)">Cancel</button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
          }

          <!-- Table -->
          @if (loading()) {
            <div class="spinner-wrap">
              <mat-spinner diameter="40"></mat-spinner>
            </div>
          } @else if (disclaimers().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon">gavel</mat-icon>
              <h3>No disclaimers yet</h3>
              <p>Create your first disclaimer to start building legally compliant content.</p>
              @if (!showCreateForm()) {
                <button mat-raised-button color="primary" (click)="showCreateForm.set(true)">
                  <mat-icon>add</mat-icon> Create disclaimer
                </button>
              }
            </div>
          } @else {
            <table mat-table [dataSource]="disclaimers()" class="full-width disclaimers-table">
              <!-- Key column -->
              <ng-container matColumnDef="key">
                <th mat-header-cell *matHeaderCellDef>Key</th>
                <td mat-cell *matCellDef="let row">
                  <div class="key-cell" (click)="selectDisclaimer(row)">
                    <mat-icon class="key-icon">vpn_key</mat-icon>
                    <div>
                      <strong class="key-name">{{ row.key }}</strong>
                      <span class="key-title">{{ row.title }}</span>
                    </div>
                  </div>
                </td>
              </ng-container>

              <!-- Default text column -->
              <ng-container matColumnDef="defaultText">
                <th mat-header-cell *matHeaderCellDef>Default text</th>
                <td mat-cell *matCellDef="let row">
                  <span class="text-preview" [matTooltip]="row.defaultText">{{ preview(row.defaultText) }}</span>
                </td>
              </ng-container>

              <!-- Scope column -->
              <ng-container matColumnDef="scope">
                <th mat-header-cell *matHeaderCellDef>Scope</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip-set>
                    <mat-chip [highlighted]="row.scope === 'ORG'"
                      [matTooltip]="row.scope === 'ORG' ? 'Shared across all workspaces' : 'Specific to one workspace'">
                      <mat-icon matChipAvatar>{{ row.scope === 'ORG' ? 'corporate_fare' : 'workspaces' }}</mat-icon>
                      {{ row.scope === 'ORG' ? 'Organization' : 'Workspace' }}
                    </mat-chip>
                  </mat-chip-set>
                </td>
              </ng-container>

              <!-- Status column -->
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip-set>
                    <mat-chip [class.active-chip]="row.status === 'ACTIVE'"
                              [class.archived-chip]="row.status === 'ARCHIVED'">
                      <mat-icon matChipAvatar>{{ row.status === 'ACTIVE' ? 'check_circle' : 'archive' }}</mat-icon>
                      {{ row.status === 'ACTIVE' ? 'Active' : 'Archived' }}
                    </mat-chip>
                  </mat-chip-set>
                </td>
              </ng-container>

              <!-- Actions column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let row">
                  <button mat-icon-button [matMenuTriggerFor]="rowMenu" matTooltip="Actions">
                    <mat-icon>more_vert</mat-icon>
                  </button>
                  <mat-menu #rowMenu="matMenu">
                    <button mat-menu-item (click)="selectDisclaimer(row)">
                      <mat-icon>language</mat-icon> View localizations
                    </button>
                    @if (row.status === 'ACTIVE') {
                      <button mat-menu-item (click)="archiveDisclaimer(row)">
                        <mat-icon>archive</mat-icon> Archive
                      </button>
                    } @else {
                      <button mat-menu-item (click)="reactivateDisclaimer(row)">
                        <mat-icon>unarchive</mat-icon> Reactivate
                      </button>
                    }
                  </mat-menu>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"
                  [class.selected-row]="selected()?.id === row.id"
                  class="clickable-row"
                  (click)="selectDisclaimer(row)"></tr>
            </table>
          }

          <!-- Localization detail panel -->
          @if (selected()) {
            <mat-card class="loc-card">
              <mat-card-content>
                <div class="loc-header">
                  <div class="loc-header-text">
                    <h3>
                      <mat-icon inline>language</mat-icon>
                      Localizations — <code>{{ selected()!.key }}</code>
                    </h3>
                    <p class="loc-subtitle">
                      Add translated versions of the <strong>{{ selected()!.title }}</strong> disclaimer for each language
                      your organization targets. The governance engine picks the correct localization based on the
                      content's target locale.
                    </p>
                  </div>
                  <button mat-icon-button (click)="closeDetail()" matTooltip="Close panel" aria-label="Close localization panel">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>

                <div class="loc-default-text">
                  <label>Default text (base language)</label>
                  <p>{{ selected()!.defaultText }}</p>
                </div>

                <mat-divider></mat-divider>

                @if (loadingLocs()) {
                  <div class="spinner-wrap inner">
                    <mat-spinner diameter="28"></mat-spinner>
                  </div>
                } @else if (localizations().length === 0) {
                  <div class="loc-empty">
                    <mat-icon>translate</mat-icon>
                    <p>No localizations yet. Add a translation below.</p>
                  </div>
                } @else {
                  <table mat-table [dataSource]="localizations()" class="full-width loc-table">
                    <ng-container matColumnDef="language">
                      <th mat-header-cell *matHeaderCellDef>Language</th>
                      <td mat-cell *matCellDef="let row">
                        <mat-chip-set>
                          <mat-chip>
                            <mat-icon matChipAvatar>translate</mat-icon>
                            {{ row.language }}
                          </mat-chip>
                        </mat-chip-set>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="text">
                      <th mat-header-cell *matHeaderCellDef>Localized text</th>
                      <td mat-cell *matCellDef="let row">
                        <span class="text-preview" [matTooltip]="row.text">{{ preview(row.text, 200) }}</span>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="locColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: locColumns;"></tr>
                  </table>
                }

                <mat-divider></mat-divider>

                <h4 class="add-loc-heading">
                  <mat-icon inline>add_circle_outline</mat-icon> Add a localization
                </h4>
                <p class="add-loc-help">
                  Enter a language code (e.g. <code>es</code>, <code>fr</code>, <code>de</code>, <code>ja</code>)
                  and the translated disclaimer text. Use the full text — it will be inserted verbatim into content.
                </p>
                <form [formGroup]="locForm" (ngSubmit)="addLocalization()" class="loc-form">
                  <div class="form-row-2">
                    <mat-form-field appearance="outline">
                      <mat-label>Language code</mat-label>
                      <input matInput formControlName="language" placeholder="e.g. es, fr, de" />
                      <mat-icon matPrefix>translate</mat-icon>
                      <mat-hint>ISO 639-1 or IETF tag (e.g. en-GB, pt-BR)</mat-hint>
                    </mat-form-field>
                  </div>
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Localized text</mat-label>
                    <textarea matInput formControlName="text" rows="3"
                      placeholder="Translated disclaimer text"></textarea>
                    <mat-hint>The full translated disclaimer — inserted verbatim when this language is targeted</mat-hint>
                  </mat-form-field>
                  <div class="form-actions">
                    <button mat-raised-button color="primary" type="submit" [disabled]="locForm.invalid || savingLoc()">
                      <mat-icon>check</mat-icon> Add localization
                    </button>
                  </div>
                </form>
              </mat-card-content>
            </mat-card>
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
              <span>Create REQUIRED_DISCLAIMER rules that reference your disclaimer keys</span>
            </div>
          </a>
          <a routerLink="/governance/checks" class="related-link">
            <mat-icon>verified</mat-icon>
            <div>
              <strong>Governance Checks</strong>
              <span>Run checks to verify disclaimer text appears in generated content</span>
            </div>
          </a>
          <a routerLink="/governance/templates" class="related-link">
            <mat-icon>description</mat-icon>
            <div>
              <strong>Templates</strong>
              <span>Include disclaimers in content templates for consistent output</span>
            </div>
          </a>
          <a routerLink="/governance/profile" class="related-link">
            <mat-icon>palette</mat-icon>
            <div>
              <strong>Brand Profile</strong>
              <span>Configure brand voice, colors, and default languages</span>
            </div>
          </a>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    /* Page header */
    .page-header {
      margin-bottom: 20px;
    }
    .page-header h2 {
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.02em;
      margin: 0 0 6px;
    }
    .subtitle {
      color: var(--text-secondary, #555);
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
      max-width: 720px;
    }

    /* Guide banner */
    .info-banner {
      margin-bottom: 20px;
      border-left: 4px solid #1976d2;
    }
    .banner-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .banner-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
    }
    .banner-icon { color: #1976d2; }
    .banner-body { font-size: 14px; line-height: 1.6; }
    .guide-steps {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 16px;
    }
    .guide-step {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }
    .guide-step p { margin: 4px 0 0; color: var(--text-secondary, #555); }
    .step-number {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      background: #1976d2;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 13px;
    }
    .banner-tips {
      margin-top: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .banner-tips p {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin: 0;
      color: var(--text-secondary, #555);
    }
    .banner-tips mat-icon { font-size: 18px; color: #f9a825; flex-shrink: 0; margin-top: 2px; }
    .banner-tips a { color: #1976d2; text-decoration: none; font-weight: 500; }
    .banner-tips a:hover { text-decoration: underline; }
    .show-guide-btn {
      margin-bottom: 16px;
      font-size: 13px;
    }
    .show-guide-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      margin-right: 4px;
    }

    code {
      background: rgba(0,0,0,.06);
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 13px;
    }

    /* Toolbar */
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 20px;
    }
    .filters {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .filter-field { width: 180px; }
    .item-count {
      font-size: 13px;
      color: var(--text-secondary, #777);
      padding: 6px 12px;
      background: rgba(0,0,0,.04);
      border-radius: 16px;
    }

    /* Create form */
    .create-card {
      margin-bottom: 20px;
      border: 1px solid #1976d2;
      border-radius: 8px;
    }
    .create-title {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .create-help {
      font-size: 13px;
      color: var(--text-secondary, #555);
      margin: 0 0 16px;
      line-height: 1.5;
    }
    .create-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .form-row-2 {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }
    .form-row-2 > * { flex: 1; min-width: 220px; }
    .full-width { width: 100%; }
    .scope-hint-box {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      color: var(--text-secondary, #666);
      background: rgba(25, 118, 210, 0.06);
      padding: 12px 14px;
      border-radius: 8px;
      line-height: 1.5;
    }
    .scope-hint-box mat-icon {
      font-size: 18px;
      color: #1976d2;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }

    /* Table */
    .disclaimers-table { width: 100%; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: var(--bg-surface-hover, rgba(0,0,0,.03)); }
    .selected-row { background: rgba(25, 118, 210, 0.08) !important; }

    .key-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      padding: 4px 0;
    }
    .key-icon { color: #1976d2; font-size: 20px; }
    .key-name {
      display: block;
      font-weight: 600;
      font-size: 14px;
    }
    .key-title {
      display: block;
      font-size: 12px;
      color: var(--text-secondary, #777);
      margin-top: 1px;
    }
    .text-preview {
      font-size: 13px;
      color: var(--text-secondary, #555);
      cursor: help;
    }

    .active-chip { --mdc-chip-elevated-container-color: #e8f5e9; color: #2e7d32; }
    .archived-chip { --mdc-chip-elevated-container-color: #f5f5f5; color: #757575; }

    /* Localization detail panel */
    .loc-card {
      margin-top: 24px;
      border: 1px solid #e0e0e0;
      border-left: 4px solid #1976d2;
    }
    .loc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .loc-header h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 6px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .loc-subtitle {
      font-size: 13px;
      color: var(--text-secondary, #555);
      margin: 0 0 16px;
      line-height: 1.5;
      max-width: 640px;
    }
    .loc-default-text {
      background: rgba(0,0,0,.03);
      padding: 12px 16px;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .loc-default-text label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-secondary, #777);
      margin-bottom: 4px;
    }
    .loc-default-text p {
      margin: 0;
      font-size: 14px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .loc-empty {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 24px 0;
      color: var(--text-secondary, #777);
      font-size: 14px;
    }
    .loc-empty mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #bbb;
    }
    .loc-table { margin: 16px 0; }

    .add-loc-heading {
      font-size: 14px;
      font-weight: 600;
      margin: 16px 0 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .add-loc-help {
      font-size: 13px;
      color: var(--text-secondary, #555);
      margin: 0 0 12px;
      line-height: 1.5;
    }
    .loc-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* Empty state */
    .empty-state {
      text-align: center;
      padding: 48px 24px;
    }
    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #bdbdbd;
      margin-bottom: 12px;
    }
    .empty-state h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 8px;
    }
    .empty-state p {
      color: var(--text-secondary, #777);
      font-size: 14px;
      margin: 0 0 16px;
    }

    /* Spinner */
    .spinner-wrap { display: flex; justify-content: center; padding: 48px; }
    .spinner-wrap.inner { padding: 16px; }

    /* Related pages */
    .related-card { margin-top: 24px; }
    .related-heading {
      font-size: 14px;
      font-weight: 600;
      margin: 0 0 12px;
      color: var(--text-secondary, #555);
    }
    .related-links {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 12px;
    }
    .related-link {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 8px;
      text-decoration: none;
      color: inherit;
      transition: background 0.15s;
    }
    .related-link:hover {
      background: rgba(0,0,0,.04);
    }
    .related-link mat-icon {
      color: #1976d2;
      margin-top: 2px;
    }
    .related-link strong {
      display: block;
      font-size: 14px;
      margin-bottom: 2px;
    }
    .related-link span {
      font-size: 12px;
      color: var(--text-secondary, #777);
      line-height: 1.4;
    }
  `],
})
export class DisclaimersComponent implements OnInit, OnDestroy {
  private api = inject(DisclaimersApiService);
  private adminStore = inject(AdminStore);
  private notify = inject(NotificationService);
  private fb = inject(FormBuilder);

  private filterSub?: Subscription;

  readonly showGuide = signal(true);
  readonly showCreateForm = signal(false);
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly loadingLocs = signal(false);
  readonly savingLoc = signal(false);
  readonly disclaimers = signal<DisclaimerResponse[]>([]);
  readonly localizations = signal<DisclaimerLocalizationResponse[]>([]);
  readonly selected = signal<DisclaimerResponse | null>(null);

  readonly displayedColumns = ['key', 'defaultText', 'scope', 'status', 'actions'];
  readonly locColumns = ['language', 'text'];

  orgId = this.adminStore.selectedOrgId;

  filterForm = this.fb.group({
    status: [''],
  });

  createForm = this.fb.group({
    scope: ['ORG', Validators.required],
    key: ['', Validators.required],
    title: ['', Validators.required],
    defaultText: ['', Validators.required],
  });

  locForm = this.fb.group({
    language: ['', Validators.required],
    text: ['', Validators.required],
  });

  ngOnInit(): void {
    this.filterSub = this.filterForm.valueChanges.pipe(debounceTime(200)).subscribe(() => this.load());
    this.load();
  }

  ngOnDestroy(): void {
    this.filterSub?.unsubscribe();
  }

  preview(text: string, max = 120): string {
    const t = text?.trim() ?? '';
    if (t.length <= max) return t;
    return t.slice(0, max) + '…';
  }

  load(): void {
    const org = this.adminStore.selectedOrgId();
    if (!org) {
      this.disclaimers.set([]);
      return;
    }
    const status = this.filterForm.value.status || undefined;
    this.loading.set(true);
    this.api.list(org, undefined, status).subscribe({
      next: (data) => {
        this.disclaimers.set(data);
        this.loading.set(false);
        const sel = this.selected();
        if (sel && !data.some((d) => d.id === sel.id)) {
          this.selected.set(null);
          this.localizations.set([]);
        } else if (sel) {
          this.loadLocalizations(sel.id);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.notify.error(err.error?.detail || 'Failed to load disclaimers');
      },
    });
  }

  selectDisclaimer(row: DisclaimerResponse): void {
    if (this.selected()?.id === row.id) return;
    this.selected.set(row);
    this.loadLocalizations(row.id);
  }

  closeDetail(): void {
    this.selected.set(null);
    this.localizations.set([]);
  }

  private loadLocalizations(disclaimerId: string): void {
    const org = this.adminStore.selectedOrgId();
    if (!org) return;
    this.loadingLocs.set(true);
    this.api.listLocalizations(org, disclaimerId).subscribe({
      next: (list) => {
        this.localizations.set(list);
        this.loadingLocs.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingLocs.set(false);
        this.notify.error(err.error?.detail || 'Failed to load localizations');
      },
    });
  }

  createDisclaimer(): void {
    const org = this.adminStore.selectedOrgId();
    if (!org || this.createForm.invalid) return;
    const v = this.createForm.getRawValue();
    const ws = this.adminStore.selectedWorkspaceId();
    this.creating.set(true);
    this.api
      .create(org, {
        scope: v.scope!,
        workspaceId: v.scope === 'WORKSPACE' && ws ? ws : undefined,
        key: v.key!,
        title: v.title!,
        defaultText: v.defaultText!,
      })
      .subscribe({
        next: (d) => {
          this.creating.set(false);
          this.notify.success('Disclaimer created');
          this.createForm.reset({ scope: 'ORG', key: '', title: '', defaultText: '' });
          this.showCreateForm.set(false);
          this.load();
          this.selectDisclaimer(d);
        },
        error: (err: HttpErrorResponse) => {
          this.creating.set(false);
          this.notify.error(err.error?.detail || 'Failed to create disclaimer');
        },
      });
  }

  addLocalization(): void {
    const org = this.adminStore.selectedOrgId();
    const d = this.selected();
    if (!org || !d || this.locForm.invalid) return;
    const v = this.locForm.getRawValue();
    this.savingLoc.set(true);
    this.api
      .createLocalization(org, d.id, {
        language: v.language!,
        text: v.text!,
      })
      .subscribe({
        next: () => {
          this.savingLoc.set(false);
          this.notify.success('Localization added');
          this.locForm.reset({ language: '', text: '' });
          this.loadLocalizations(d.id);
        },
        error: (err: HttpErrorResponse) => {
          this.savingLoc.set(false);
          this.notify.error(err.error?.detail || 'Failed to add localization');
        },
      });
  }

  archiveDisclaimer(row: DisclaimerResponse): void {
    const org = this.adminStore.selectedOrgId();
    if (!org) return;
    this.api.patch(org, row.id, { status: 'ARCHIVED' }).subscribe({
      next: () => {
        this.notify.success(`"${row.key}" archived`);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.detail || 'Failed to archive disclaimer'),
    });
  }

  reactivateDisclaimer(row: DisclaimerResponse): void {
    const org = this.adminStore.selectedOrgId();
    if (!org) return;
    this.api.patch(org, row.id, { status: 'ACTIVE' }).subscribe({
      next: () => {
        this.notify.success(`"${row.key}" reactivated`);
        this.load();
      },
      error: (err: HttpErrorResponse) => this.notify.error(err.error?.detail || 'Failed to reactivate disclaimer'),
    });
  }
}
