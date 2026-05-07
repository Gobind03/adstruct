import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { AdminStore } from '@features/admin/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { BrandProfileApiService } from '../services/brand-profile-api.service';
import {
  EffectiveBrandProfileResponse,
  OrgBrandProfileResponse,
  OrgBrandProfilePatchRequest,
} from '../models/governance.models';

@Component({
  selector: 'app-brand-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatSelectModule,
  ],
  template: `
    <!-- Page header -->
    <div class="page-header">
      <h2>Brand Profile</h2>
      <p class="subtitle">
        Your brand's single source of truth — colors, fonts, voice, and language settings that
        govern every ad, post, and template created in this workspace.
      </p>
    </div>

    <!-- How it works banner -->
    @if (showHowItWorks()) {
      <mat-card class="info-banner">
        <mat-card-content>
          <div class="banner-header">
            <div class="banner-title">
              <mat-icon class="banner-icon">school</mat-icon>
              <strong>How the Brand Profile works</strong>
            </div>
            <button mat-icon-button (click)="showHowItWorks.set(false)"
              matTooltip="Dismiss" aria-label="Dismiss guide">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="banner-body">
            <div class="inheritance-diagram">
              <div class="inherit-step">
                <div class="inherit-badge org">ORG</div>
                <span>Organization defaults are set by Org Admins and apply to every workspace.</span>
              </div>
              <mat-icon class="inherit-arrow">arrow_downward</mat-icon>
              <div class="inherit-step">
                <div class="inherit-badge ws">WS</div>
                <span>Workspace overrides selectively replace specific org values for this workspace only.</span>
              </div>
              <mat-icon class="inherit-arrow">arrow_downward</mat-icon>
              <div class="inherit-step">
                <div class="inherit-badge eff">EFFECTIVE</div>
                <span>The merged result is what templates, AI agents, and governance checks actually use.</span>
              </div>
            </div>
            <mat-divider></mat-divider>
            <div class="banner-tips">
              <p><mat-icon inline>lightbulb</mat-icon> <strong>Tip:</strong> Only override what differs for this workspace. Leave fields empty to inherit the org default.</p>
              <p><mat-icon inline>link</mat-icon> Changes here are immediately reflected in
                <a routerLink="/governance/checks">Governance Checks</a>,
                <a routerLink="/governance/templates">Templates</a>, and AI-generated content.
              </p>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    } @else {
      <button mat-stroked-button class="show-guide-btn" (click)="showHowItWorks.set(true)">
        <mat-icon>school</mat-icon> Show setup guide
      </button>
    }

    <!-- No org/workspace selected -->
    @if (!orgId()) {
      <mat-card>
        <mat-card-content>
          <div class="empty-state">
            <mat-icon class="empty-icon">business</mat-icon>
            <h3>No organization selected</h3>
            <p>Select an organization from the top bar to manage the brand profile.</p>
          </div>
        </mat-card-content>
      </mat-card>
    } @else {
      <!-- Tabs: Org Defaults | Workspace View -->
      <mat-tab-group [selectedIndex]="activeTab()" (selectedIndexChange)="activeTab.set($event)" animationDuration="200ms">

        <!-- ═══════ TAB 1: Organization Defaults ═══════ -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">domain</mat-icon>
            Organization Defaults
            @if (!isOrgAdmin()) {
              <mat-icon class="tab-lock" matTooltip="Only Org Admins can edit organization defaults">lock</mat-icon>
            }
          </ng-template>

          <div class="tab-body">
            @if (loadingOrg()) {
              <div class="spinner-wrap">
                <mat-spinner diameter="36"></mat-spinner>
                <p class="spinner-label">Loading organization brand profile…</p>
              </div>
            } @else if (!orgProfile()) {
              <div class="empty-state">
                <mat-icon class="empty-icon">palette</mat-icon>
                <h3>No organization brand profile yet</h3>
                <p>This organization doesn't have a brand profile. An Org Admin needs to create one to establish brand defaults for all workspaces.</p>
                @if (isOrgAdmin()) {
                  <button mat-raised-button color="primary" class="create-btn" (click)="createOrgProfile()" [disabled]="savingOrg()">
                    <mat-icon>add</mat-icon> Create Brand Profile
                  </button>
                }
              </div>
            } @else {
              <!-- Org Admin: full edit form | Others: read-only view -->
              @if (isOrgAdmin()) {
                <div class="org-edit-header">
                  <div>
                    <h3 class="section-title"><mat-icon inline>edit</mat-icon> Edit Organization Defaults</h3>
                    <p class="section-help">
                      These settings apply to <strong>every workspace</strong> in this organization.
                      Individual workspaces can override specific fields on the "Workspace View" tab.
                    </p>
                  </div>
                  <span class="section-badge org-badge">Org Admin</span>
                </div>

                <form [formGroup]="orgForm" (ngSubmit)="saveOrgProfile()" class="org-form">
                  <!-- Identity -->
                  <fieldset class="form-section">
                    <legend>
                      <mat-icon>badge</mat-icon> Identity
                      <span class="legend-help" matTooltip="The display name shown in reports, exports, and the workspace selector">
                        <mat-icon>help_outline</mat-icon>
                      </span>
                    </legend>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Display name</mat-label>
                      <input matInput formControlName="displayName" placeholder="e.g. Acme Corp" />
                      <mat-hint>Your organization's brand name (max 160 characters)</mat-hint>
                    </mat-form-field>
                  </fieldset>

                  <!-- Colors -->
                  <fieldset class="form-section">
                    <legend>
                      <mat-icon>palette</mat-icon> Colors
                      <span class="legend-help" matTooltip="Used in ad creative generation, email templates, and UI theming. Must be valid hex codes like #FF5722.">
                        <mat-icon>help_outline</mat-icon>
                      </span>
                    </legend>
                    <div class="form-row-3">
                      <mat-form-field appearance="outline">
                        <mat-label>Primary color</mat-label>
                        <input matInput formControlName="primaryColor" placeholder="#1976D2" />
                        @if (orgForm.value.primaryColor) {
                          <span matSuffix class="color-dot" [style.background]="orgForm.value.primaryColor"></span>
                        }
                        <mat-hint>Main brand color</mat-hint>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Secondary color</mat-label>
                        <input matInput formControlName="secondaryColor" placeholder="#424242" />
                        @if (orgForm.value.secondaryColor) {
                          <span matSuffix class="color-dot" [style.background]="orgForm.value.secondaryColor"></span>
                        }
                        <mat-hint>Supporting color</mat-hint>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Accent color</mat-label>
                        <input matInput formControlName="accentColor" placeholder="#FF5722" />
                        @if (orgForm.value.accentColor) {
                          <span matSuffix class="color-dot" [style.background]="orgForm.value.accentColor"></span>
                        }
                        <mat-hint>CTAs &amp; highlights</mat-hint>
                      </mat-form-field>
                    </div>
                  </fieldset>

                  <!-- Typography -->
                  <fieldset class="form-section">
                    <legend>
                      <mat-icon>text_fields</mat-icon> Typography
                      <span class="legend-help" matTooltip="Font families referenced in templates and creative generation. Use the exact font name as it appears in Google Fonts or your font provider.">
                        <mat-icon>help_outline</mat-icon>
                      </span>
                    </legend>
                    <div class="form-row-2">
                      <mat-form-field appearance="outline">
                        <mat-label>Primary font</mat-label>
                        <input matInput formControlName="fontPrimary" placeholder="e.g. Inter, Roboto" />
                        <mat-hint>Headlines &amp; UI elements</mat-hint>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Secondary font</mat-label>
                        <input matInput formControlName="fontSecondary" placeholder="e.g. Merriweather, Georgia" />
                        <mat-hint>Body copy &amp; descriptions</mat-hint>
                      </mat-form-field>
                    </div>
                  </fieldset>

                  <!-- Voice & Tone -->
                  <fieldset class="form-section">
                    <legend>
                      <mat-icon>record_voice_over</mat-icon> Voice &amp; Tone
                      <span class="legend-help" matTooltip="These fields define how your brand sounds in all written communication. AI agents and content creators reference these when generating copy.">
                        <mat-icon>help_outline</mat-icon>
                      </span>
                    </legend>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Voice tone</mat-label>
                      <mat-select formControlName="voiceTone">
                        @for (t of toneOptions; track t) {
                          <mat-option [value]="t">{{ t }}</mat-option>
                        }
                      </mat-select>
                      <mat-hint>The overall personality of your brand voice</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Voice guidelines</mat-label>
                      <textarea matInput formControlName="voiceGuidelinesText" rows="3"
                        placeholder="Write in short, active sentences. Address the reader directly. Avoid jargon unless the audience is technical."></textarea>
                      <mat-hint>Free-form guidance for writers and AI agents on how to match the brand voice</mat-hint>
                    </mat-form-field>
                    <div class="form-row-2">
                      <mat-form-field appearance="outline">
                        <mat-label>Do list</mat-label>
                        <textarea matInput formControlName="doListText" rows="4"
                          placeholder="Use active voice&#10;Be concise&#10;Back claims with data"></textarea>
                        <mat-hint>One guideline per line — things writers should do</mat-hint>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Don't list</mat-label>
                        <textarea matInput formControlName="dontListText" rows="4"
                          placeholder="Don't use superlatives&#10;Avoid passive voice&#10;Never make unverified claims"></textarea>
                        <mat-hint>One guideline per line — things writers should avoid</mat-hint>
                      </mat-form-field>
                    </div>
                  </fieldset>

                  <!-- Languages -->
                  <fieldset class="form-section">
                    <legend>
                      <mat-icon>translate</mat-icon> Languages
                      <span class="legend-help" matTooltip="Default language is used for content generation. Supported languages determine which localizations are available for disclaimers and templates.">
                        <mat-icon>help_outline</mat-icon>
                      </span>
                    </legend>
                    <div class="form-row-2">
                      <mat-form-field appearance="outline">
                        <mat-label>Default language</mat-label>
                        <input matInput formControlName="defaultLanguage" placeholder="en" />
                        <mat-hint>ISO 639-1 code (e.g. en, hi, es, fr)</mat-hint>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Supported languages</mat-label>
                        <input matInput formControlName="supportedLanguages" placeholder='["en","hi","es"]' />
                        <mat-hint>JSON array of ISO 639-1 codes</mat-hint>
                      </mat-form-field>
                    </div>
                  </fieldset>

                  <div class="form-actions">
                    <button mat-raised-button color="primary" type="submit" [disabled]="savingOrg() || orgForm.pristine">
                      <mat-icon>save</mat-icon> Save Organization Defaults
                    </button>
                    <button mat-stroked-button type="button" (click)="resetOrgForm()" [disabled]="savingOrg() || orgForm.pristine">
                      <mat-icon>undo</mat-icon> Discard changes
                    </button>
                  </div>
                </form>
              } @else {
                <!-- Read-only view for non-admins -->
                <div class="readonly-notice">
                  <mat-icon>info</mat-icon>
                  <span>You are viewing organization defaults as read-only. Only <strong>Org Admins</strong> can edit these settings.</span>
                </div>

                <div class="readonly-grid">
                  <div class="section-group">
                    <div class="group-label"><mat-icon>badge</mat-icon> Identity</div>
                    <dl class="kv">
                      <dt>Display name</dt>
                      <dd>{{ orgProfile()!.displayName }}</dd>
                      <dt>Status</dt>
                      <dd><span class="status-chip" [class]="orgProfile()!.status.toLowerCase()">{{ orgProfile()!.status }}</span></dd>
                    </dl>
                  </div>

                  <div class="section-group">
                    <div class="group-label"><mat-icon>palette</mat-icon> Colors</div>
                    <div class="swatches">
                      @for (c of orgColorSwatches(); track c.label) {
                        <div class="swatch">
                          <div class="swatch-box" [style.background]="c.hex || '#e0e0e0'" [class.muted]="!c.hex"></div>
                          <span class="swatch-label">{{ c.label }}</span>
                          <span class="swatch-hex" [class.not-set]="!c.hex">{{ c.hex || 'Not set' }}</span>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="section-group">
                    <div class="group-label"><mat-icon>text_fields</mat-icon> Typography</div>
                    <dl class="kv">
                      <dt>Primary font</dt>
                      <dd [class.not-set]="!orgProfile()!.fontPrimary">{{ orgProfile()!.fontPrimary || 'Not set' }}</dd>
                      <dt>Secondary font</dt>
                      <dd [class.not-set]="!orgProfile()!.fontSecondary">{{ orgProfile()!.fontSecondary || 'Not set' }}</dd>
                    </dl>
                  </div>

                  <div class="section-group">
                    <div class="group-label"><mat-icon>record_voice_over</mat-icon> Voice &amp; Tone</div>
                    <div class="voice-tone-chip">{{ orgProfile()!.voiceTone }}</div>
                    @if (orgProfile()!.voiceGuidelinesText) {
                      <p class="block-text">{{ orgProfile()!.voiceGuidelinesText }}</p>
                    }
                    <div class="two-col">
                      <div>
                        <h4><mat-icon inline class="do-icon">check_circle</mat-icon> Do</h4>
                        @if (splitLines(orgProfile()!.doListText).length) {
                          <ul class="list do-list">
                            @for (line of splitLines(orgProfile()!.doListText); track $index) { <li>{{ line }}</li> }
                          </ul>
                        } @else { <p class="not-set">Not set</p> }
                      </div>
                      <div>
                        <h4><mat-icon inline class="dont-icon">cancel</mat-icon> Don't</h4>
                        @if (splitLines(orgProfile()!.dontListText).length) {
                          <ul class="list dont-list">
                            @for (line of splitLines(orgProfile()!.dontListText); track $index) { <li>{{ line }}</li> }
                          </ul>
                        } @else { <p class="not-set">Not set</p> }
                      </div>
                    </div>
                  </div>

                  <div class="section-group">
                    <div class="group-label"><mat-icon>translate</mat-icon> Languages</div>
                    <dl class="kv">
                      <dt>Default</dt>
                      <dd>{{ orgProfile()!.defaultLanguage }}</dd>
                      <dt>Supported</dt>
                      <dd>{{ orgProfile()!.supportedLanguages }}</dd>
                    </dl>
                  </div>
                </div>
              }
            }
          </div>
        </mat-tab>

        <!-- ═══════ TAB 2: Workspace View ═══════ -->
        <mat-tab [disabled]="!workspaceId()">
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">workspaces</mat-icon>
            Workspace View
            @if (!workspaceId()) {
              <span class="tab-hint" matTooltip="Select a workspace from the top bar to enable this tab">(select a workspace)</span>
            }
          </ng-template>

          <div class="tab-body">
            @if (!workspaceId()) {
              <div class="empty-state">
                <mat-icon class="empty-icon">workspaces</mat-icon>
                <h3>No workspace selected</h3>
                <p>Select a workspace from the top bar to view the effective profile and manage overrides.</p>
              </div>
            } @else if (loading()) {
              <div class="spinner-wrap">
                <mat-spinner diameter="36"></mat-spinner>
                <p class="spinner-label">Loading effective brand profile…</p>
              </div>
            } @else if (!profile()) {
              <div class="empty-state">
                <mat-icon class="empty-icon">palette</mat-icon>
                <h3>Brand profile not available</h3>
                <p>This workspace doesn't have a brand profile yet. Ensure the organization profile exists on the "Organization Defaults" tab first.</p>
              </div>
            } @else {
              <div class="layout">
                <!-- LEFT: Effective profile preview -->
                <section class="preview">
                  <div class="section-header">
                    <h3><mat-icon inline>visibility</mat-icon> Effective Profile</h3>
                    <span class="section-badge" matTooltip="Org defaults merged with workspace overrides">Read-only</span>
                  </div>
                  <p class="section-help">This is what templates, AI agents, and governance checks see when they reference your brand.</p>

                  <div class="section-group">
                    <div class="group-label">
                      <mat-icon>palette</mat-icon> Colors
                      <span class="group-help" matTooltip="Brand colors used for ad creative generation and UI theming."><mat-icon>help_outline</mat-icon></span>
                    </div>
                    <div class="swatches">
                      @for (c of colorSwatches(); track c.label) {
                        <div class="swatch">
                          <div class="swatch-box" [style.background]="c.hex || '#e0e0e0'" [class.muted]="!c.hex"></div>
                          <span class="swatch-label">{{ c.label }}</span>
                          <span class="swatch-hex" [class.not-set]="!c.hex">{{ c.hex || 'Not set' }}</span>
                        </div>
                      }
                    </div>
                  </div>

                  <div class="section-group">
                    <div class="group-label">
                      <mat-icon>text_fields</mat-icon> Typography
                      <span class="group-help" matTooltip="Primary font for headlines, secondary for body copy."><mat-icon>help_outline</mat-icon></span>
                    </div>
                    <dl class="kv">
                      <dt>Primary font</dt>
                      <dd [class.not-set]="!profile()!.fontPrimary">{{ profile()!.fontPrimary || 'Not set' }}</dd>
                      <dt>Secondary font</dt>
                      <dd [class.not-set]="!profile()!.fontSecondary">{{ profile()!.fontSecondary || 'Not set' }}</dd>
                    </dl>
                  </div>

                  <div class="section-group">
                    <div class="group-label">
                      <mat-icon>record_voice_over</mat-icon> Voice &amp; Tone
                      <span class="group-help" matTooltip="How your brand sounds in writing. AI agents reference this when generating copy."><mat-icon>help_outline</mat-icon></span>
                    </div>
                    <div class="voice-tone-chip">{{ profile()!.voiceTone }}</div>
                    @if (profile()!.voiceGuidelinesText) {
                      <p class="block-text">{{ profile()!.voiceGuidelinesText }}</p>
                    } @else {
                      <p class="not-set block-text">No voice guidelines set at org level.</p>
                    }
                    <div class="two-col">
                      <div>
                        <h4><mat-icon inline class="do-icon">check_circle</mat-icon> Do</h4>
                        @if (splitLines(profile()!.doListText).length) {
                          <ul class="list do-list">
                            @for (line of splitLines(profile()!.doListText); track $index) { <li>{{ line }}</li> }
                          </ul>
                        } @else { <p class="not-set">No "Do" guidelines set.</p> }
                      </div>
                      <div>
                        <h4><mat-icon inline class="dont-icon">cancel</mat-icon> Don't</h4>
                        @if (splitLines(profile()!.dontListText).length) {
                          <ul class="list dont-list">
                            @for (line of splitLines(profile()!.dontListText); track $index) { <li>{{ line }}</li> }
                          </ul>
                        } @else { <p class="not-set">No "Don't" guidelines set.</p> }
                      </div>
                    </div>
                  </div>

                  <div class="section-group">
                    <div class="group-label">
                      <mat-icon>translate</mat-icon> Languages
                      <span class="group-help" matTooltip="Default language for content, supported languages for localizations."><mat-icon>help_outline</mat-icon></span>
                    </div>
                    <dl class="kv">
                      <dt>Default language</dt>
                      <dd>{{ profile()!.defaultLanguage }}</dd>
                      <dt>Supported</dt>
                      <dd>{{ profile()!.supportedLanguages }}</dd>
                    </dl>
                  </div>
                </section>

                <!-- RIGHT: Workspace overrides -->
                <section class="overrides">
                  <div class="section-header">
                    <h3><mat-icon inline>tune</mat-icon> Workspace Overrides</h3>
                    <span class="section-badge override-badge" matTooltip="Only set fields you want to differ from the org profile">Optional</span>
                  </div>
                  <p class="section-help">
                    Override specific settings for this workspace. Empty fields inherit from the organization profile.
                  </p>

                  <div class="override-callout">
                    <mat-icon>info</mat-icon>
                    <span>Useful when this workspace serves a different region, product line, or audience than the org default.</span>
                  </div>

                  <form [formGroup]="overrideForm" (ngSubmit)="saveOverrides()">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Voice tone</mat-label>
                      <input matInput formControlName="voiceTone" placeholder="e.g. FRIENDLY, PROFESSIONAL" />
                      <mat-hint>Leave empty to use org default ({{ profile()!.voiceTone }})</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Default language</mat-label>
                      <input matInput formControlName="defaultLanguage" placeholder="e.g. en, hi, es, fr" />
                      <mat-hint>ISO 639-1 code. Org default: {{ profile()!.defaultLanguage }}</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Color overrides (JSON)</mat-label>
                      <textarea matInput formControlName="colorsJson" rows="4"
                        placeholder='{ "primaryColor": "#112233" }'></textarea>
                      <mat-hint>Keys: primaryColor, secondaryColor, accentColor. Values: hex like #FF5722</mat-hint>
                    </mat-form-field>
                    <div class="actions">
                      <button mat-raised-button color="primary" type="submit" [disabled]="saving()">
                        <mat-icon>save</mat-icon> Save overrides
                      </button>
                      <button mat-stroked-button type="button" (click)="resetOverrides()" [disabled]="saving()"
                        matTooltip="Remove all workspace overrides and revert to organization defaults">
                        <mat-icon>restart_alt</mat-icon> Reset to org defaults
                      </button>
                    </div>
                  </form>

                  @if (hasActiveOverrides()) {
                    <div class="active-overrides">
                      <mat-icon>check_circle</mat-icon>
                      <span>This workspace has active overrides. The effective profile on the left reflects the merged result.</span>
                    </div>
                  }
                </section>
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Next steps -->
      <mat-divider class="next-steps-divider"></mat-divider>
      <div class="next-steps">
        <h3>What to do next</h3>
        <p class="section-help">Your brand profile is the foundation. These related pages build on top of it:</p>
        <div class="next-steps-grid">
          <a routerLink="/governance/assets" class="next-step-card">
            <mat-icon>image</mat-icon>
            <div>
              <strong>Brand Assets</strong>
              <span>Upload logos, icons, and images approved for use across campaigns.</span>
            </div>
          </a>
          <a routerLink="/governance/rulesets" class="next-step-card">
            <mat-icon>gavel</mat-icon>
            <div>
              <strong>Rule Sets</strong>
              <span>Define banned phrases, required disclaimers, and claim restrictions.</span>
            </div>
          </a>
          <a routerLink="/governance/templates" class="next-step-card">
            <mat-icon>description</mat-icon>
            <div>
              <strong>Templates</strong>
              <span>Create reusable ad copy and social post templates that follow your brand voice.</span>
            </div>
          </a>
          <a routerLink="/governance/checks" class="next-step-card">
            <mat-icon>verified</mat-icon>
            <div>
              <strong>Governance Checks</strong>
              <span>Run content against your rules before publishing to catch violations early.</span>
            </div>
          </a>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Page header */
    h2 { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0 0 6px; }
    .subtitle { color: var(--text-muted, #666); margin: 0 0 20px; font-size: 14px; line-height: 1.5; max-width: 640px; }

    /* Info banner */
    .info-banner { margin-bottom: 20px; border-left: 4px solid #1976d2; background: #f5f9ff; }
    .banner-header { display: flex; align-items: center; justify-content: space-between; }
    .banner-title { display: flex; align-items: center; gap: 8px; font-size: 15px; }
    .banner-icon { color: #1976d2; }
    .banner-body { margin-top: 16px; }
    .inheritance-diagram { display: flex; flex-direction: column; gap: 8px; padding: 12px 0; }
    .inherit-step { display: flex; align-items: center; gap: 12px; font-size: 13px; line-height: 1.4; }
    .inherit-badge { flex-shrink: 0; padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; min-width: 80px; text-align: center; }
    .inherit-badge.org { background: #e3f2fd; color: #1565c0; }
    .inherit-badge.ws { background: #fff3e0; color: #e65100; }
    .inherit-badge.eff { background: #e8f5e9; color: #2e7d32; }
    .inherit-arrow { color: #bbb; font-size: 18px; width: 18px; height: 18px; margin-left: 30px; }
    .banner-tips { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }
    .banner-tips p { margin: 0; font-size: 13px; display: flex; align-items: center; gap: 6px; color: #555; }
    .banner-tips a { color: #1976d2; text-decoration: none; font-weight: 500; }
    .banner-tips a:hover { text-decoration: underline; }
    .show-guide-btn { margin-bottom: 16px; font-size: 13px; }
    .show-guide-btn mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    /* Tabs */
    .tab-icon { margin-right: 6px; font-size: 20px; width: 20px; height: 20px; }
    .tab-lock { margin-left: 6px; font-size: 16px; width: 16px; height: 16px; color: #aaa; }
    .tab-hint { margin-left: 6px; font-size: 11px; color: #aaa; }
    .tab-body { padding: 24px 0; }

    /* Org edit header */
    .org-edit-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
    .section-title { font-size: 18px; font-weight: 600; margin: 0 0 4px; display: flex; align-items: center; gap: 6px; }
    .section-title mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* Org form */
    .org-form { max-width: 800px; }
    .form-section { border: 1px solid rgba(0,0,0,.08); border-radius: 10px; padding: 20px 24px 24px; margin-bottom: 20px; }
    .form-section legend {
      display: flex; align-items: center; gap: 6px;
      font-size: 14px; font-weight: 600; color: #333; padding: 0 8px;
    }
    .form-section legend mat-icon { font-size: 20px; width: 20px; height: 20px; color: #666; }
    .legend-help { cursor: help; display: inline-flex; }
    .legend-help mat-icon { font-size: 16px; width: 16px; height: 16px; color: #aaa; }

    .form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; }
    .form-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 20px; }
    @media (max-width: 700px) {
      .form-row-2, .form-row-3 { grid-template-columns: 1fr; }
    }
    .color-dot { display: inline-block; width: 16px; height: 16px; border-radius: 50%; border: 1px solid rgba(0,0,0,.15); }
    .form-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
    .form-actions mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    .org-badge { background: #e3f2fd; color: #1565c0; }
    .create-btn { margin-top: 16px; }
    .create-btn mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    /* Read-only notice */
    .readonly-notice {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 8px; background: #f5f5f5; margin-bottom: 24px;
      font-size: 13px; color: #555;
    }
    .readonly-notice mat-icon { color: #888; flex-shrink: 0; }
    .readonly-grid { max-width: 700px; }

    /* Workspace layout */
    .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    @media (max-width: 960px) { .layout { grid-template-columns: 1fr; } }

    /* Section headers */
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
    .section-header h3 { margin: 0; display: flex; align-items: center; gap: 6px; }
    .section-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: #e8f5e9; color: #2e7d32; letter-spacing: 0.03em; }
    .override-badge { background: #fff3e0; color: #e65100; }
    .section-help { font-size: 13px; color: var(--text-muted, #888); margin: 2px 0 16px; line-height: 1.5; }

    /* Section groups */
    .section-group { margin-bottom: 24px; }
    .group-label { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 600; color: #333; margin-bottom: 10px; }
    .group-label mat-icon { font-size: 20px; width: 20px; height: 20px; color: #666; }
    .group-help { cursor: help; display: inline-flex; }
    .group-help mat-icon { font-size: 16px; width: 16px; height: 16px; color: #aaa; }

    h3 { font-size: 16px; font-weight: 600; margin: 20px 0 12px; }
    h3 mat-icon { font-size: 20px; width: 20px; height: 20px; }
    h4 { font-size: 13px; font-weight: 600; margin: 0 0 8px; display: flex; align-items: center; gap: 4px; }

    /* Swatches */
    .swatches { display: flex; flex-wrap: wrap; gap: 16px; }
    .swatch { display: flex; flex-direction: column; gap: 4px; min-width: 100px; }
    .swatch-box { height: 56px; border-radius: 8px; border: 1px solid rgba(0,0,0,.12); transition: transform 0.15s; }
    .swatch-box:hover { transform: scale(1.04); }
    .swatch-box.muted { border-style: dashed; }
    .swatch-label { font-size: 12px; color: var(--text-muted, #888); }
    .swatch-hex { font-family: monospace; font-size: 13px; }

    /* KV pairs */
    .kv { display: grid; grid-template-columns: 140px 1fr; gap: 8px 16px; margin: 0; font-size: 14px; }
    .kv dt { color: var(--text-muted, #888); }
    .kv dd { margin: 0; }
    .not-set { color: #bbb; font-style: italic; }

    /* Status chip */
    .status-chip { font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 12px; }
    .status-chip.active { background: #e8f5e9; color: #2e7d32; }
    .status-chip.inactive { background: #fce4ec; color: #c62828; }

    /* Voice tone chip */
    .voice-tone-chip { display: inline-block; padding: 4px 14px; border-radius: 16px; background: #ede7f6; color: #4527a0; font-size: 13px; font-weight: 600; margin-bottom: 10px; }
    .block-text { font-size: 14px; line-height: 1.6; white-space: pre-wrap; }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
    .list { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.6; }
    .do-icon { color: #2e7d32; font-size: 16px; width: 16px; height: 16px; }
    .dont-icon { color: #c62828; font-size: 16px; width: 16px; height: 16px; }
    .do-list li::marker { color: #2e7d32; }
    .dont-list li::marker { color: #c62828; }

    /* Override callout */
    .override-callout { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: 8px; background: #fffde7; border: 1px solid #fff9c4; font-size: 13px; line-height: 1.5; color: #555; margin-bottom: 20px; }
    .override-callout mat-icon { color: #f9a825; flex-shrink: 0; margin-top: 1px; }
    .active-overrides { display: flex; align-items: center; gap: 8px; margin-top: 16px; padding: 10px 14px; border-radius: 8px; background: #e8f5e9; font-size: 13px; color: #2e7d32; }
    .active-overrides mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Form controls */
    .full-width { width: 100%; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; }
    .actions mat-icon { font-size: 18px; width: 18px; height: 18px; margin-right: 4px; }

    /* Spinner */
    .spinner-wrap { display: flex; flex-direction: column; align-items: center; padding: 48px; gap: 12px; }
    .spinner-label { font-size: 14px; color: var(--text-muted, #888); }

    /* Empty state */
    .empty-state { text-align: center; padding: 56px 24px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #ccc; margin-bottom: 12px; }
    .empty-state h3 { margin: 0 0 8px; font-size: 18px; font-weight: 600; }
    .empty-state p { margin: 0; font-size: 14px; color: var(--text-muted, #888); max-width: 420px; margin-inline: auto; line-height: 1.5; }

    /* Next steps */
    .next-steps-divider { margin: 32px 0 24px; }
    .next-steps h3 { font-size: 16px; font-weight: 600; margin: 0 0 4px; }
    .next-steps-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; margin-top: 12px; }
    .next-step-card { display: flex; align-items: flex-start; gap: 12px; padding: 16px; border-radius: 10px; border: 1px solid rgba(0,0,0,.08); text-decoration: none; color: inherit; transition: background 0.15s, border-color 0.15s, box-shadow 0.15s; }
    .next-step-card:hover { background: #f5f9ff; border-color: #90caf9; box-shadow: 0 2px 8px rgba(25,118,210,.08); }
    .next-step-card mat-icon { color: #1976d2; flex-shrink: 0; margin-top: 2px; }
    .next-step-card strong { display: block; font-size: 14px; margin-bottom: 2px; }
    .next-step-card span { font-size: 12px; color: #777; line-height: 1.4; }
  `],
})
export class BrandProfileComponent implements OnInit {
  private api = inject(BrandProfileApiService);
  private adminStore = inject(AdminStore);
  private notify = inject(NotificationService);
  private fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadingOrg = signal(false);
  readonly savingOrg = signal(false);
  readonly profile = signal<EffectiveBrandProfileResponse | null>(null);
  readonly orgProfile = signal<OrgBrandProfileResponse | null>(null);
  readonly showHowItWorks = signal(true);
  readonly activeTab = signal(0);

  readonly orgId = this.adminStore.selectedOrgId;
  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly isOrgAdmin = computed(() => this.adminStore.isOrgAdmin(this.orgId() ?? undefined));

  readonly toneOptions = ['PROFESSIONAL', 'FRIENDLY', 'PREMIUM', 'TECHNICAL', 'PLAYFUL', 'MINIMAL', 'CUSTOM'];

  orgForm = this.fb.group({
    displayName: ['', Validators.maxLength(160)],
    primaryColor: [''],
    secondaryColor: [''],
    accentColor: [''],
    fontPrimary: [''],
    fontSecondary: [''],
    voiceTone: ['PROFESSIONAL'],
    voiceGuidelinesText: [''],
    doListText: [''],
    dontListText: [''],
    defaultLanguage: ['en'],
    supportedLanguages: ['["en"]'],
  });

  overrideForm = this.fb.group({
    voiceTone: [''],
    defaultLanguage: [''],
    colorsJson: ['{}'],
  });

  ngOnInit(): void {
    this.loadOrgProfile();
    this.loadEffectiveProfile();
  }

  // ── Org profile ──

  loadOrgProfile(): void {
    const oid = this.orgId();
    if (!oid) return;
    this.loadingOrg.set(true);
    this.api.getOrgProfile(oid).subscribe({
      next: (p) => {
        this.orgProfile.set(p);
        this.patchOrgForm(p);
        this.loadingOrg.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadingOrg.set(false);
        if (err.status !== 404) {
          this.notify.error(err.error?.detail || 'Failed to load org brand profile');
        }
      },
    });
  }

  createOrgProfile(): void {
    const oid = this.orgId();
    if (!oid) return;
    this.savingOrg.set(true);
    this.api.createOrgProfile(oid).subscribe({
      next: (p) => {
        this.orgProfile.set(p);
        this.patchOrgForm(p);
        this.savingOrg.set(false);
        this.notify.success('Organization brand profile created');
      },
      error: (err: HttpErrorResponse) => {
        this.savingOrg.set(false);
        this.notify.error(err.error?.detail || 'Failed to create org brand profile');
      },
    });
  }

  saveOrgProfile(): void {
    const oid = this.orgId();
    if (!oid || this.orgForm.invalid) return;
    const v = this.orgForm.value;
    const req: OrgBrandProfilePatchRequest = {};
    if (v.displayName) req.displayName = v.displayName;
    if (v.primaryColor) req.primaryColor = v.primaryColor;
    if (v.secondaryColor) req.secondaryColor = v.secondaryColor;
    if (v.accentColor) req.accentColor = v.accentColor;
    if (v.fontPrimary) req.fontPrimary = v.fontPrimary;
    if (v.fontSecondary) req.fontSecondary = v.fontSecondary;
    if (v.voiceTone) req.voiceTone = v.voiceTone;
    if (v.voiceGuidelinesText !== undefined) req.voiceGuidelinesText = v.voiceGuidelinesText || undefined;
    if (v.doListText !== undefined) req.doListText = v.doListText || undefined;
    if (v.dontListText !== undefined) req.dontListText = v.dontListText || undefined;
    if (v.defaultLanguage) req.defaultLanguage = v.defaultLanguage;
    if (v.supportedLanguages) req.supportedLanguages = v.supportedLanguages;

    this.savingOrg.set(true);
    this.api.patchOrgProfile(oid, req).subscribe({
      next: (p) => {
        this.orgProfile.set(p);
        this.patchOrgForm(p);
        this.savingOrg.set(false);
        this.notify.success('Organization brand profile saved');
        this.loadEffectiveProfile();
      },
      error: (err: HttpErrorResponse) => {
        this.savingOrg.set(false);
        this.notify.error(err.error?.detail || 'Failed to save org brand profile');
      },
    });
  }

  resetOrgForm(): void {
    const p = this.orgProfile();
    if (p) this.patchOrgForm(p);
  }

  private patchOrgForm(p: OrgBrandProfileResponse): void {
    this.orgForm.patchValue({
      displayName: p.displayName ?? '',
      primaryColor: p.primaryColor ?? '',
      secondaryColor: p.secondaryColor ?? '',
      accentColor: p.accentColor ?? '',
      fontPrimary: p.fontPrimary ?? '',
      fontSecondary: p.fontSecondary ?? '',
      voiceTone: p.voiceTone ?? 'PROFESSIONAL',
      voiceGuidelinesText: p.voiceGuidelinesText ?? '',
      doListText: p.doListText ?? '',
      dontListText: p.dontListText ?? '',
      defaultLanguage: p.defaultLanguage ?? 'en',
      supportedLanguages: p.supportedLanguages ?? '["en"]',
    });
    this.orgForm.markAsPristine();
  }

  orgColorSwatches(): { label: string; hex: string | null }[] {
    const p = this.orgProfile();
    if (!p) return [];
    return [
      { label: 'Primary', hex: p.primaryColor },
      { label: 'Secondary', hex: p.secondaryColor },
      { label: 'Accent', hex: p.accentColor },
    ];
  }

  // ── Workspace effective profile ──

  loadEffectiveProfile(): void {
    const ws = this.workspaceId();
    if (!ws) { this.profile.set(null); return; }
    this.loading.set(true);
    this.api.getEffectiveProfile(ws)
      .pipe(catchError((err: HttpErrorResponse) => {
        if (err.status === 404) return this.api.initWorkspaceProfile(ws);
        return throwError(() => err);
      }))
      .subscribe({
        next: (p) => { this.profile.set(p); this.patchOverrideForm(p); this.loading.set(false); },
        error: (err: HttpErrorResponse) => { this.loading.set(false); this.notify.error(err.error?.detail || 'Failed to load brand profile'); },
      });
  }

  colorSwatches(): { label: string; hex: string | null }[] {
    const p = this.profile();
    if (!p) return [];
    return [
      { label: 'Primary', hex: p.primaryColor },
      { label: 'Secondary', hex: p.secondaryColor },
      { label: 'Accent', hex: p.accentColor },
    ];
  }

  hasActiveOverrides(): boolean {
    const p = this.profile();
    if (!p?.overridesJson) return false;
    try { return Object.keys(JSON.parse(p.overridesJson)).length > 0; } catch { return false; }
  }

  splitLines(text: string | null): string[] {
    if (!text?.trim()) return [];
    return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  }

  saveOverrides(): void {
    const ws = this.workspaceId();
    if (!ws || this.overrideForm.invalid) return;
    let colors: Record<string, string> = {};
    try { colors = JSON.parse(this.overrideForm.value.colorsJson || '{}') as Record<string, string>; }
    catch { this.notify.error('Colors JSON is invalid'); return; }
    const payload: Record<string, string> = {};
    const vt = this.overrideForm.value.voiceTone?.trim();
    const dl = this.overrideForm.value.defaultLanguage?.trim();
    if (vt) payload['voiceTone'] = vt;
    if (dl) payload['defaultLanguage'] = dl;
    for (const [k, v] of Object.entries(colors)) { if (v) payload[k] = v; }
    this.saving.set(true);
    this.api.patchOverrides(ws, JSON.stringify(payload)).subscribe({
      next: (p) => { this.profile.set(p); this.patchOverrideForm(p); this.saving.set(false); this.notify.success('Overrides saved'); },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.notify.error(err.error?.detail || 'Failed to save overrides'); },
    });
  }

  resetOverrides(): void {
    const ws = this.workspaceId();
    if (!ws) return;
    this.saving.set(true);
    this.api.patchOverrides(ws, '{}').subscribe({
      next: (p) => { this.profile.set(p); this.patchOverrideForm(p); this.saving.set(false); this.notify.success('Reset to organization defaults'); },
      error: (err: HttpErrorResponse) => { this.saving.set(false); this.notify.error(err.error?.detail || 'Failed to reset overrides'); },
    });
  }

  private patchOverrideForm(p: EffectiveBrandProfileResponse): void {
    let colors: Record<string, string> = {};
    let voice = '';
    let lang = '';
    try {
      const o = JSON.parse(p.overridesJson || '{}') as Record<string, unknown>;
      colors = {
        primaryColor: (o['primaryColor'] as string) ?? '',
        secondaryColor: (o['secondaryColor'] as string) ?? '',
        accentColor: (o['accentColor'] as string) ?? '',
      };
      voice = (o['voiceTone'] as string) ?? '';
      lang = (o['defaultLanguage'] as string) ?? '';
    } catch { /* ignore */ }
    const colorsJson = Object.values(colors).some(Boolean)
      ? JSON.stringify(Object.fromEntries(Object.entries(colors).filter(([, v]) => v)), null, 2)
      : '{}';
    this.overrideForm.patchValue({ voiceTone: voice, defaultLanguage: lang, colorsJson });
  }
}
