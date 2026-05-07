import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { AdminStore } from '../../admin/store/admin.store';
import { NotificationService } from '../../../core/services/notification.service';
import { GovernanceChecksApiService } from '../services/governance-checks-api.service';
import {
  GovernanceCheckRequest,
  GovernanceCheckRunResponse,
  GovernanceFinding,
} from '../models/governance.models';

interface PlatformOption {
  value: string;
  label: string;
  icon: string;
}

const PLATFORM_OPTIONS: PlatformOption[] = [
  { value: 'X',          label: 'X (Twitter)',  icon: 'tag' },
  { value: 'META',       label: 'Meta',         icon: 'facebook' },
  { value: 'LINKEDIN',   label: 'LinkedIn',     icon: 'work' },
  { value: 'GOOGLE_ADS', label: 'Google Ads',   icon: 'ads_click' },
  { value: 'TIKTOK',     label: 'TikTok',       icon: 'music_note' },
  { value: 'PINTEREST',  label: 'Pinterest',    icon: 'push_pin' },
  { value: 'SNAP',       label: 'Snapchat',     icon: 'photo_camera' },
];

const ENTITY_TYPE_OPTIONS = [
  { value: 'CAMPAIGN',     label: 'Campaign' },
  { value: 'AD_COPY',      label: 'Ad Copy' },
  { value: 'SOCIAL_POST',  label: 'Social Post' },
  { value: 'LANDING_PAGE', label: 'Landing Page' },
  { value: 'EMAIL',        label: 'Email' },
  { value: 'SMS',          label: 'SMS' },
  { value: 'OTHER',        label: 'Other' },
];

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;

@Component({
  selector: 'app-governance-checks',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
  ],
  template: `
    <!-- Page header -->
    <div class="page-header">
      <div class="page-header-text">
        <h2>Governance Checks</h2>
        <p class="subtitle">
          Run your content through the deterministic rule engine to verify compliance with brand rules,
          disclaimers, banned phrases, and platform constraints — all before publishing.
          Every check is logged for audit.
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
              <strong>How Governance Checks work</strong>
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
                  <strong>Provide your content</strong>
                  <p>
                    Paste the content you want to validate into the <strong>Content payload</strong>
                    field as JSON. Specify the entity type (e.g. campaign, ad copy) and its ID.
                  </p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">2</div>
                <div>
                  <strong>Choose rules & platform</strong>
                  <p>
                    Optionally select a specific <a routerLink="/governance/rulesets">Rule Set</a>
                    to check against, a target platform, and the content language. If no rule set
                    is specified, all active rule sets for the workspace are applied.
                  </p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">3</div>
                <div>
                  <strong>Review findings</strong>
                  <p>
                    The engine scans for banned phrases, missing disclaimers, unsubstantiated claims,
                    and platform constraint violations. Each finding shows a <strong>severity</strong>,
                    <strong>evidence</strong>, and a <strong>suggestion</strong> for how to fix it.
                  </p>
                </div>
              </div>
              <div class="guide-step">
                <div class="step-number">4</div>
                <div>
                  <strong>Fix & re-run</strong>
                  <p>
                    Address the findings, update your content, and re-run the check until it passes.
                    All runs are saved in the <strong>History</strong> for audit purposes.
                  </p>
                </div>
              </div>
            </div>
            <mat-divider></mat-divider>
            <div class="banner-tips">
              <p>
                <mat-icon inline>lightbulb</mat-icon>
                <strong>Tip:</strong> Checks are <strong>deterministic</strong> — no AI/LLM calls.
                The engine uses regex matching, string scanning, and rule parameters to produce
                consistent, repeatable results.
              </p>
              <p>
                <mat-icon inline>security</mat-icon>
                The overall result is <strong>PASS</strong> (no issues), <strong>WARN</strong>
                (advisory findings), or <strong>FAIL</strong> (blocking issues found).
              </p>
              <p>
                <mat-icon inline>gavel</mat-icon>
                Checks enforce rules from your <a routerLink="/governance/rulesets">Rule Sets</a>
                and verify that required <a routerLink="/governance/disclaimers">Disclaimers</a>
                are present.
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

    <!-- Run check card -->
    <mat-card class="section">
      <mat-card-content>
        @if (!workspaceId()) {
          <div class="empty-state">
            <mat-icon class="empty-icon">workspaces</mat-icon>
            <h3>No workspace selected</h3>
            <p>Select a workspace from the top bar to run governance checks.</p>
          </div>
        } @else {
          <h3 class="section-title"><mat-icon inline>play_circle</mat-icon> Run a check</h3>
          <p class="section-help">
            Provide the content you want to validate. The engine will scan it against all applicable
            rules and return findings with severity levels, evidence, and fix suggestions.
          </p>

          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Entity type</mat-label>
              <mat-select [value]="entityType()" (selectionChange)="entityType.set($event.value)">
                @for (et of entityTypeOptions; track et.value) {
                  <mat-option [value]="et.value">{{ et.label }}</mat-option>
                }
              </mat-select>
              <mat-icon matPrefix matTooltip="The type of content entity being checked">category</mat-icon>
              <mat-hint>What kind of content is this?</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Entity ID (UUID)</mat-label>
              <input matInput [value]="entityId()" (input)="entityId.set($any($event.target).value)"
                placeholder="e.g. a1b2c3d4-e5f6-7890-abcd-ef1234567890" />
              <mat-icon matPrefix matTooltip="The unique identifier of the entity in your system">fingerprint</mat-icon>
              <mat-hint>UUID of the campaign, ad, or post</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Target platform</mat-label>
              <mat-select [value]="platformType()" (selectionChange)="platformType.set($event.value)">
                <mat-option value="">Any platform</mat-option>
                @for (p of platformOptions; track p.value) {
                  <mat-option [value]="p.value">
                    <mat-icon>{{ p.icon }}</mat-icon> {{ p.label }}
                  </mat-option>
                }
              </mat-select>
              <mat-hint>Optional — also checks platform-specific constraints</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Content language</mat-label>
              <input matInput [value]="language()" (input)="language.set($any($event.target).value)"
                placeholder="e.g. en, es, fr" />
              <mat-icon matPrefix>translate</mat-icon>
              <mat-hint>Optional — selects the right disclaimer localization</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="span-2">
              <mat-label>Rule set ID</mat-label>
              <input matInput [value]="ruleSetId()" (input)="ruleSetId.set($any($event.target).value)"
                placeholder="Leave empty to use all active rule sets" />
              <mat-icon matPrefix matTooltip="UUID of a specific rule set to check against">rule_folder</mat-icon>
              <mat-hint>Optional — leave empty to apply all workspace rule sets</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="span-2">
              <mat-label>Content payload (JSON)</mat-label>
              <textarea matInput rows="8"
                [value]="contentPayloadJson()"
                (input)="contentPayloadJson.set($any($event.target).value)"
                placeholder='{ "headline": "...", "body": "...", "cta": "..." }'></textarea>
              <mat-hint>Paste the full content as a JSON object — every string value is scanned</mat-hint>
            </mat-form-field>
          </div>

          <!-- Content payload documentation -->
          <div class="payload-docs">
            <div class="payload-docs-header" (click)="showPayloadDocs.set(!showPayloadDocs())">
              <div class="payload-docs-title">
                <mat-icon>{{ showPayloadDocs() ? 'expand_less' : 'expand_more' }}</mat-icon>
                <mat-icon class="docs-icon">help_outline</mat-icon>
                <strong>What is the Content Payload and how do I create one?</strong>
              </div>
              <span class="payload-docs-toggle">{{ showPayloadDocs() ? 'Hide' : 'Show' }} reference</span>
            </div>

            @if (showPayloadDocs()) {
              <div class="payload-docs-body">
                <div class="docs-section">
                  <h4><mat-icon inline>description</mat-icon> What it is</h4>
                  <p>
                    The <strong>Content Payload</strong> is a JSON object containing the actual text
                    content you want to validate. It represents the content that would be published —
                    an ad, social post, email, landing page copy, etc.
                  </p>
                  <p>
                    The governance engine <strong>recursively extracts every string value</strong>
                    from the JSON (including nested objects and arrays), concatenates them, and scans
                    the combined text against your rules. This means you can structure the JSON however
                    you like — the engine will find and check all text regardless of nesting depth.
                  </p>
                </div>

                <mat-divider></mat-divider>

                <div class="docs-section">
                  <h4><mat-icon inline>data_object</mat-icon> How to structure it</h4>
                  <p>
                    Use JSON keys that match your content sections. There is no required schema —
                    any valid JSON object works. Here are common patterns:
                  </p>

                  <div class="example-grid">
                    <div class="example-block">
                      <label>Ad copy</label>
                      <pre>{{adCopyExample}}</pre>
                    </div>
                    <div class="example-block">
                      <label>Social post</label>
                      <pre>{{socialPostExample}}</pre>
                    </div>
                    <div class="example-block">
                      <label>Email</label>
                      <pre>{{emailExample}}</pre>
                    </div>
                    <div class="example-block">
                      <label>Landing page</label>
                      <pre>{{landingPageExample}}</pre>
                    </div>
                  </div>
                </div>

                <mat-divider></mat-divider>

                <div class="docs-section">
                  <h4><mat-icon inline>search</mat-icon> What the engine checks</h4>
                  <div class="check-types">
                    <div class="check-type">
                      <mat-icon class="ct-icon ct-ban">block</mat-icon>
                      <div>
                        <strong>Banned phrases</strong>
                        <p>Scans for words or regex patterns defined in your rule set's <em>BANNED_PHRASE</em> rules. Matches are case-insensitive.</p>
                      </div>
                    </div>
                    <div class="check-type">
                      <mat-icon class="ct-icon ct-disc">fact_check</mat-icon>
                      <div>
                        <strong>Required disclaimers</strong>
                        <p>Verifies that required disclaimer text (from <em>REQUIRED_DISCLAIMER</em> rules) appears somewhere in the payload. Checks the raw JSON, so the disclaimer can be in any field.</p>
                      </div>
                    </div>
                    <div class="check-type">
                      <mat-icon class="ct-icon ct-claim">warning</mat-icon>
                      <div>
                        <strong>Claim restrictions</strong>
                        <p>Looks for restricted claim keywords (from <em>CLAIM_RESTRICTION</em> rules) like "guaranteed", "best", "proven". Flags unsubstantiated marketing claims.</p>
                      </div>
                    </div>
                    <div class="check-type">
                      <mat-icon class="ct-icon ct-plat">devices</mat-icon>
                      <div>
                        <strong>Platform constraints</strong>
                        <p>When a platform is selected, checks text length limits and hashtag limits defined in <a routerLink="/governance/platform-constraints">Platform Constraints</a>.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <mat-divider></mat-divider>

                <div class="docs-section">
                  <h4><mat-icon inline>lightbulb</mat-icon> Tips</h4>
                  <ul class="tips-list">
                    <li>
                      <strong>Any valid JSON works</strong> — flat objects, nested objects, arrays of strings. The engine walks the entire tree.
                    </li>
                    <li>
                      <strong>Include disclaimers in the payload</strong> if you want <em>REQUIRED_DISCLAIMER</em> rules to pass. The engine checks whether the required text is present anywhere in the raw JSON.
                    </li>
                    <li>
                      <strong>Non-string values are ignored</strong> — numbers, booleans, and nulls are skipped during text extraction.
                    </li>
                    <li>
                      <strong>Case doesn't matter</strong> — all text matching is case-insensitive.
                    </li>
                    <li>
                      <strong>Regex patterns in rules</strong> are supported. If a BANNED_PHRASE pattern contains special characters, it's treated as a regular expression.
                    </li>
                    <li>
                      If you don't specify a <strong>Rule Set ID</strong>, you'll need to have rules configured in the workspace for checks to produce findings.
                    </li>
                  </ul>
                </div>
              </div>
            }
          </div>

          <div class="run-actions">
            <button mat-raised-button color="primary" (click)="runCheck()" [disabled]="running()"
              matTooltip="Run the governance engine against the provided content">
              @if (running()) {
                <mat-spinner diameter="20" class="inline-spinner"></mat-spinner>
              } @else {
                <mat-icon>play_arrow</mat-icon>
              }
              {{ running() ? 'Running...' : 'Run check' }}
            </button>
          </div>
        }
      </mat-card-content>
    </mat-card>

    <!-- Latest result -->
    @if (lastRun()) {
      <mat-card class="section result-card" [class]="'result-' + lastRun()!.status.toLowerCase()">
        <mat-card-content>
          <div class="result-header">
            <h3 class="section-title">
              <mat-icon inline>{{ resultIcon(lastRun()!.status) }}</mat-icon>
              Latest result
            </h3>
            <div class="result-meta">
              <mat-chip-set>
                <mat-chip [class]="statusChipClass(lastRun()!.status)">
                  <mat-icon matChipAvatar>{{ resultIcon(lastRun()!.status) }}</mat-icon>
                  {{ resultLabel(lastRun()!.status) }}
                </mat-chip>
              </mat-chip-set>
              <span class="meta-date">{{ lastRun()!.createdAt | date: 'medium' }}</span>
            </div>
          </div>

          <!-- Result summary -->
          <div class="result-summary">
            @if (lastRun()!.status === 'PASS') {
              <div class="summary-pass">
                <mat-icon>check_circle</mat-icon>
                <span>Content passed all governance checks. No issues found.</span>
              </div>
            } @else if (lastRun()!.status === 'WARN') {
              <div class="summary-warn">
                <mat-icon>warning</mat-icon>
                <span>
                  Content has <strong>{{ findingsRows().length }} advisory finding{{ findingsRows().length !== 1 ? 's' : '' }}</strong>.
                  Review the details below — these are warnings, not blocking issues.
                </span>
              </div>
            } @else {
              <div class="summary-fail">
                <mat-icon>error</mat-icon>
                <span>
                  Content <strong>failed</strong> with <strong>{{ findingsRows().length }}
                  finding{{ findingsRows().length !== 1 ? 's' : '' }}</strong>.
                  Fix the blocking issues and re-run the check.
                </span>
              </div>
            }
          </div>

          @if (findingsRows().length > 0) {
            <h4 class="findings-heading">Findings</h4>
            <table mat-table [dataSource]="findingsRows()" class="findings-table full-width">
              <ng-container matColumnDef="severity">
                <th mat-header-cell *matHeaderCellDef>Severity</th>
                <td mat-cell *matCellDef="let row">
                  <mat-chip-set>
                    <mat-chip [class]="severityChipClass(row.severity)"
                      [matTooltip]="severityTooltip(row.severity)">
                      <mat-icon matChipAvatar>{{ severityIconLigature(row.severity) }}</mat-icon>
                      {{ row.severity }}
                    </mat-chip>
                  </mat-chip-set>
                </td>
              </ng-container>
              <ng-container matColumnDef="message">
                <th mat-header-cell *matHeaderCellDef>Message</th>
                <td mat-cell *matCellDef="let row">
                  <strong>{{ row.message }}</strong>
                </td>
              </ng-container>
              <ng-container matColumnDef="evidence">
                <th mat-header-cell *matHeaderCellDef>Evidence</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.evidence) {
                    <code class="evidence-code">{{ row.evidence }}</code>
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
              </ng-container>
              <ng-container matColumnDef="suggestion">
                <th mat-header-cell *matHeaderCellDef>Suggestion</th>
                <td mat-cell *matCellDef="let row">
                  @if (row.suggestion) {
                    <span class="suggestion-text">{{ row.suggestion }}</span>
                  } @else {
                    <span class="muted">—</span>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="findingsColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: findingsColumns"></tr>
            </table>
          }
        </mat-card-content>
      </mat-card>
    }

    <!-- History -->
    <mat-card class="section">
      <mat-card-content>
        <h3 class="section-title"><mat-icon inline>history</mat-icon> Check history</h3>
        <p class="section-help">
          All previous governance check runs for this workspace, ordered by most recent.
          Each run is logged for audit and traceability.
        </p>

        @if (!workspaceId()) {
          <div class="empty-state small">
            <mat-icon class="empty-icon-sm">workspaces</mat-icon>
            <p>Select a workspace to view check history.</p>
          </div>
        } @else if (historyLoading()) {
          <div class="spinner-wrap">
            <mat-spinner diameter="36"></mat-spinner>
          </div>
        } @else if (historyRows().length === 0) {
          <div class="empty-state small">
            <mat-icon class="empty-icon-sm">history</mat-icon>
            <p>No checks have been run yet. Use the form above to run your first check.</p>
          </div>
        } @else {
          <table mat-table [dataSource]="historyRows()" class="full-width history-table">
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Result</th>
              <td mat-cell *matCellDef="let row">
                <mat-chip-set>
                  <mat-chip [class]="statusChipClass(row.status)">
                    <mat-icon matChipAvatar>{{ resultIcon(row.status) }}</mat-icon>
                    {{ resultLabel(row.status) }}
                  </mat-chip>
                </mat-chip-set>
              </td>
            </ng-container>
            <ng-container matColumnDef="entityType">
              <th mat-header-cell *matHeaderCellDef>Entity</th>
              <td mat-cell *matCellDef="let row">
                <div class="entity-cell">
                  <strong>{{ entityTypeLabel(row.entityType) }}</strong>
                  <span class="entity-id" [matTooltip]="row.entityId">{{ shortId(row.entityId) }}</span>
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="platformType">
              <th mat-header-cell *matHeaderCellDef>Platform</th>
              <td mat-cell *matCellDef="let row">
                @if (row.platformType) {
                  <mat-chip-set>
                    <mat-chip class="platform-chip">
                      <mat-icon matChipAvatar>{{ platformIcon(row.platformType) }}</mat-icon>
                      {{ platformLabel(row.platformType) }}
                    </mat-chip>
                  </mat-chip-set>
                } @else {
                  <span class="muted">Any</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="findings">
              <th mat-header-cell *matHeaderCellDef>Findings</th>
              <td mat-cell *matCellDef="let row">
                <span class="findings-count" [matTooltip]="'Number of findings in this check run'">
                  {{ countFindings(row) }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Run at</th>
              <td mat-cell *matCellDef="let row">
                <span class="date-text">{{ row.createdAt | date: 'medium' }}</span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="historyColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: historyColumns"
              class="clickable-row"
              (click)="viewHistoryRun(row)"
              matTooltip="Click to view findings"></tr>
          </table>
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
              <span>Define the compliance rules that checks enforce</span>
            </div>
          </a>
          <a routerLink="/governance/disclaimers" class="related-link">
            <mat-icon>gavel</mat-icon>
            <div>
              <strong>Disclaimers</strong>
              <span>Required legal text verified by REQUIRED_DISCLAIMER rules</span>
            </div>
          </a>
          <a routerLink="/governance/templates" class="related-link">
            <mat-icon>description</mat-icon>
            <div>
              <strong>Templates</strong>
              <span>Content templates that link to rule sets for automatic checks</span>
            </div>
          </a>
          <a routerLink="/governance/platform-constraints" class="related-link">
            <mat-icon>devices</mat-icon>
            <div>
              <strong>Platform Constraints</strong>
              <span>Platform-specific limits (char counts, dimensions) checked during runs</span>
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

    /* Section cards */
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 15px; font-weight: 600; margin: 0 0 6px;
      display: flex; align-items: center; gap: 6px;
    }
    .section-help {
      font-size: 13px; color: var(--text-secondary, #555);
      margin: 0 0 16px; line-height: 1.5; max-width: 640px;
    }

    /* Form grid */
    .form-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 8px 16px; margin-bottom: 12px;
    }
    @media (max-width: 720px) {
      .form-grid { grid-template-columns: 1fr; }
      .span-2 { grid-column: auto; }
    }
    .span-2 { grid-column: 1 / -1; }

    .json-help {
      display: flex; align-items: flex-start; gap: 8px;
      font-size: 12px; color: var(--text-secondary, #666);
      background: rgba(25,118,210,.06); padding: 10px 14px;
      border-radius: 8px; line-height: 1.5; margin-bottom: 16px;
    }
    .json-help mat-icon { font-size: 18px; color: #1976d2; flex-shrink: 0; margin-top: 1px; }

    .run-actions { display: flex; gap: 12px; margin-top: 4px; }
    .inline-spinner { display: inline-block; margin-right: 6px; }

    /* Payload documentation */
    .payload-docs {
      border: 1px solid #e0e0e0; border-radius: 8px;
      margin-bottom: 16px; overflow: hidden;
    }
    .payload-docs-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px; cursor: pointer; user-select: none;
      background: rgba(25,118,210,.04);
      transition: background 0.15s;
    }
    .payload-docs-header:hover { background: rgba(25,118,210,.08); }
    .payload-docs-title {
      display: flex; align-items: center; gap: 6px; font-size: 14px;
    }
    .docs-icon { color: #1976d2; font-size: 20px; }
    .payload-docs-toggle {
      font-size: 12px; color: #1976d2; font-weight: 500;
    }
    .payload-docs-body { padding: 16px 20px; font-size: 14px; line-height: 1.6; }
    .docs-section { padding: 12px 0; }
    .docs-section h4 {
      font-size: 14px; font-weight: 600; margin: 0 0 8px;
      display: flex; align-items: center; gap: 6px;
    }
    .docs-section p { margin: 0 0 8px; color: var(--text-secondary, #444); }
    .docs-section a { color: #1976d2; text-decoration: none; font-weight: 500; }
    .docs-section a:hover { text-decoration: underline; }

    .example-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px; margin-top: 12px;
    }
    .example-block {
      border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;
    }
    .example-block label {
      display: block; padding: 8px 12px; font-size: 12px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.04em;
      background: rgba(0,0,0,.03); color: var(--text-secondary, #666);
      border-bottom: 1px solid #e0e0e0;
    }
    .example-block pre {
      margin: 0; padding: 10px 12px; font-size: 12px; line-height: 1.45;
      overflow-x: auto; background: #fafafa;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }

    .check-types { display: flex; flex-direction: column; gap: 14px; margin-top: 8px; }
    .check-type { display: flex; gap: 12px; align-items: flex-start; }
    .check-type p { margin: 2px 0 0; font-size: 13px; color: var(--text-secondary, #555); }
    .ct-icon { font-size: 22px; margin-top: 1px; flex-shrink: 0; }
    .ct-ban { color: #c62828; }
    .ct-disc { color: #2e7d32; }
    .ct-claim { color: #f57c00; }
    .ct-plat { color: #1565c0; }

    .tips-list {
      margin: 8px 0 0; padding-left: 20px;
      font-size: 13px; color: var(--text-secondary, #555);
    }
    .tips-list li { margin-bottom: 8px; line-height: 1.5; }
    .tips-list strong { color: var(--text-primary, #333); }

    /* Result card */
    .result-card { border-left: 4px solid #e0e0e0; }
    .result-pass { border-left-color: #2e7d32; }
    .result-warn { border-left-color: #f57c00; }
    .result-fail { border-left-color: #c62828; }

    .result-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      flex-wrap: wrap; gap: 12px; margin-bottom: 12px;
    }
    .result-meta { display: flex; align-items: center; gap: 12px; }
    .meta-date { font-size: 13px; color: var(--text-secondary, #777); }

    .result-summary { margin-bottom: 16px; }
    .summary-pass, .summary-warn, .summary-fail {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 8px; font-size: 14px;
    }
    .summary-pass { background: #e8f5e9; color: #1b5e20; }
    .summary-warn { background: #fff3e0; color: #e65100; }
    .summary-fail { background: #ffebee; color: #b71c1c; }
    .summary-pass mat-icon { color: #2e7d32; }
    .summary-warn mat-icon { color: #f57c00; }
    .summary-fail mat-icon { color: #c62828; }

    .findings-heading {
      font-size: 14px; font-weight: 600; margin: 0 0 10px;
    }

    /* Findings table */
    .findings-table { width: 100%; }
    .findings-table td { vertical-align: top; padding-top: 10px; padding-bottom: 10px; }
    .evidence-code {
      background: rgba(0,0,0,.06); padding: 2px 6px; border-radius: 3px;
      font-size: 12px; word-break: break-all;
    }
    .suggestion-text { font-size: 13px; color: var(--text-secondary, #555); }

    .sev-block { --mdc-chip-elevated-container-color: #ffebee; color: #c62828; }
    .sev-warn { --mdc-chip-elevated-container-color: #fff3e0; color: #e65100; }
    .sev-info { --mdc-chip-elevated-container-color: #e3f2fd; color: #1565c0; }

    /* Status chips */
    .status-pass { --mdc-chip-elevated-container-color: #e8f5e9; color: #1b5e20; }
    .status-warn { --mdc-chip-elevated-container-color: #fff3e0; color: #e65100; }
    .status-fail { --mdc-chip-elevated-container-color: #ffebee; color: #b71c1c; }

    .platform-chip { --mdc-chip-elevated-container-color: #e8eaf6; color: #283593; }

    /* History table */
    .history-table { width: 100%; }
    .clickable-row { cursor: pointer; }
    .clickable-row:hover { background: var(--bg-surface-hover, rgba(0,0,0,.03)); }
    .entity-cell { display: flex; flex-direction: column; }
    .entity-cell strong { font-size: 13px; }
    .entity-id { font-size: 11px; color: var(--text-secondary, #999); font-family: monospace; }
    .findings-count {
      font-size: 13px; font-weight: 500;
      padding: 2px 8px; background: rgba(0,0,0,.04); border-radius: 12px;
    }
    .date-text { font-size: 13px; color: var(--text-secondary, #777); }
    .muted { color: var(--text-secondary, #999); }

    /* Empty states */
    .empty-state { text-align: center; padding: 48px 24px; }
    .empty-state.small { padding: 24px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #bdbdbd; margin-bottom: 12px; }
    .empty-icon-sm { font-size: 32px; width: 32px; height: 32px; color: #bdbdbd; margin-bottom: 8px; }
    .empty-state h3 { font-size: 16px; font-weight: 600; margin: 0 0 8px; }
    .empty-state p { color: var(--text-secondary, #777); font-size: 14px; margin: 0; }

    .spinner-wrap { display: flex; justify-content: center; padding: 32px; }
    .full-width { width: 100%; }

    /* Related pages */
    .related-card { margin-top: 4px; }
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
export class GovernanceChecksComponent implements OnInit {
  readonly platformOptions = PLATFORM_OPTIONS;
  readonly entityTypeOptions = ENTITY_TYPE_OPTIONS;

  readonly showGuide = signal(true);
  readonly showPayloadDocs = signal(false);
  running = signal(false);
  historyLoading = signal(false);

  entityType = signal('CAMPAIGN');
  entityId = signal('');
  platformType = signal('');
  language = signal('');
  ruleSetId = signal('');
  contentPayloadJson = signal('{}');

  lastRun = signal<GovernanceCheckRunResponse | null>(null);
  historyRows = signal<GovernanceCheckRunResponse[]>([]);

  findingsColumns = ['severity', 'message', 'evidence', 'suggestion'];
  historyColumns = ['status', 'entityType', 'platformType', 'findings', 'createdAt'];

  constructor(
    private readonly checksApi: GovernanceChecksApiService,
    private readonly admin: AdminStore,
    private readonly notify: NotificationService,
  ) {}

  workspaceId = this.admin.selectedWorkspaceId;

  readonly adCopyExample = JSON.stringify({
    headline: 'Get 50% off all plans today!',
    body: 'Our award-winning platform helps you grow faster. Sign up now and save.',
    cta: 'Start free trial',
    disclaimer: 'Offer valid through Dec 31. Terms apply.',
  }, null, 2);

  readonly socialPostExample = JSON.stringify({
    text: 'Excited to launch our new feature! #marketing #ai',
    hashtags: ['#marketing', '#ai', '#growth'],
  }, null, 2);

  readonly emailExample = JSON.stringify({
    subject: 'Your exclusive offer inside',
    preheader: 'Save 30% on annual plans',
    body: 'Hi there, we have a special deal just for you...',
    footer: 'Unsubscribe | Privacy policy',
  }, null, 2);

  readonly landingPageExample = JSON.stringify({
    hero_headline: 'The fastest way to grow your business',
    hero_subtext: 'Join 10,000+ companies using our platform',
    features: ['Analytics', 'Automation', 'AI insights'],
    cta_button: 'Get started for free',
  }, null, 2);

  ngOnInit(): void {
    this.reloadHistory();
  }

  findingsRows(): GovernanceFinding[] {
    const raw = this.lastRun()?.findingsJson;
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.map((f) => {
        const o = f as Record<string, unknown>;
        return {
          severity: String(o['severity'] ?? ''),
          ruleId: String(o['ruleId'] ?? ''),
          message: String(o['message'] ?? ''),
          evidence: String(o['evidence'] ?? ''),
          suggestion: String(o['suggestion'] ?? ''),
        };
      });
    } catch {
      return [];
    }
  }

  countFindings(run: GovernanceCheckRunResponse): number {
    if (!run.findingsJson) return 0;
    try {
      const parsed = JSON.parse(run.findingsJson);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  }

  shortId(uuid: string): string {
    return uuid ? uuid.slice(0, 8) + '…' : '—';
  }

  severityIconLigature(sev: string): string {
    const s = sev.toUpperCase();
    if (s === 'BLOCK' || s === 'FAIL') return 'error';
    if (s === 'WARN') return 'warning';
    return 'info';
  }

  severityChipClass(sev: string): string {
    const s = sev.toUpperCase();
    if (s === 'BLOCK' || s === 'FAIL') return 'sev-block';
    if (s === 'WARN') return 'sev-warn';
    return 'sev-info';
  }

  severityTooltip(sev: string): string {
    const s = sev.toUpperCase();
    if (s === 'BLOCK' || s === 'FAIL') return 'Blocking — must be fixed before publishing';
    if (s === 'WARN') return 'Warning — review recommended but not blocking';
    return 'Informational — for awareness only';
  }

  statusChipClass(status: string): string {
    const s = status.toUpperCase();
    if (s === 'PASS') return 'status-pass';
    if (s === 'WARN') return 'status-warn';
    if (s === 'FAIL') return 'status-fail';
    return '';
  }

  resultIcon(status: string): string {
    const s = status.toUpperCase();
    if (s === 'PASS') return 'check_circle';
    if (s === 'WARN') return 'warning';
    return 'error';
  }

  resultLabel(status: string): string {
    const s = status.toUpperCase();
    if (s === 'PASS') return 'Passed';
    if (s === 'WARN') return 'Warnings';
    return 'Failed';
  }

  entityTypeLabel(type: string): string {
    return ENTITY_TYPE_OPTIONS.find((e) => e.value === type)?.label ?? type;
  }

  platformIcon(platform: string): string {
    return PLATFORM_OPTIONS.find((p) => p.value === platform)?.icon ?? 'devices';
  }

  platformLabel(platform: string): string {
    return PLATFORM_OPTIONS.find((p) => p.value === platform)?.label ?? platform;
  }

  viewHistoryRun(run: GovernanceCheckRunResponse): void {
    this.lastRun.set(run);
  }

  runCheck(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.notify.error('Select a workspace');
      return;
    }
    const et = this.entityType().trim();
    const eid = this.entityId().trim();
    if (!et || !eid) {
      this.notify.error('Entity type and entity ID are required');
      return;
    }
    if (!UUID_RE.test(eid)) {
      this.notify.error('Entity ID must be a valid UUID');
      return;
    }
    let contentPayloadJson = this.contentPayloadJson().trim();
    if (!contentPayloadJson) contentPayloadJson = '{}';
    try {
      JSON.parse(contentPayloadJson);
    } catch {
      this.notify.error('Content payload must be valid JSON — check syntax');
      return;
    }
    const req: GovernanceCheckRequest = {
      entityType: et,
      entityId: eid,
      contentPayloadJson,
    };
    const rs = this.ruleSetId().trim();
    if (rs) req.ruleSetId = rs;
    const pt = this.platformType().trim();
    if (pt) req.platformType = pt;
    const lang = this.language().trim();
    if (lang) req.language = lang;

    this.running.set(true);
    this.checksApi.runCheck(ws, req).subscribe({
      next: (run) => {
        this.running.set(false);
        this.lastRun.set(run);
        const status = run.status.toUpperCase();
        if (status === 'PASS') {
          this.notify.success('Check passed — no issues found');
        } else if (status === 'WARN') {
          this.notify.success('Check completed with warnings');
        } else {
          this.notify.error('Check failed — review findings below');
        }
        this.reloadHistory();
      },
      error: (err: HttpErrorResponse) => {
        this.running.set(false);
        this.notify.error(err.error?.detail || 'Check failed — server error');
      },
    });
  }

  private reloadHistory(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.historyRows.set([]);
      return;
    }
    this.historyLoading.set(true);
    this.checksApi.list(ws).subscribe({
      next: (rows) => {
        this.historyRows.set(rows);
        this.historyLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.historyLoading.set(false);
        this.notify.error(err.error?.detail || 'Failed to load check history');
      },
    });
  }
}
