import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  effect,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import {
  GenerateCopyResponse,
  GenerateHooksResponse,
  GenerateUgcBriefResponse,
  GenerateVideoScriptResponse,
} from '../models/creative.models';
import { CreativeAiApiService } from '../services/creative-ai-api.service';
import { TemplatesApiService } from '@features/governance/services/templates-api.service';
import { RulesetsApiService } from '@features/governance/services/rulesets-api.service';
import { ResearchApiService } from '@features/research/services/research-api.service';
import { TemplateResponse, BrandRuleSetResponse } from '@features/governance/models/governance.models';
import { PersonaResponse, InsightResponse } from '@features/research/models/research.models';

type GenKind = 'AD_COPY' | 'HOOKS' | 'VIDEO' | 'UGC';

const PLATFORM_TYPES = [
  'META',
  'TIKTOK',
  'GOOGLE',
  'LINKEDIN',
  'SNAPCHAT',
  'PINTEREST',
  'YOUTUBE',
  'OTHER',
] as const;

const GEN_KIND_META: Record<GenKind, { icon: string; title: string; tagline: string; description: string; useCases: string[] }> = {
  AD_COPY: {
    icon: 'edit_note',
    title: 'Ad Copy Variants',
    tagline: 'Multi-variant ad copy for A/B testing',
    description: 'Generate multiple copy variations for headlines, body text, and descriptions. Each variant is saved as a separate artifact in your Copy Library and grouped into a Variant Set for easy comparison.',
    useCases: ['Headline & body text testing', 'Platform-specific ad copy', 'Multi-language campaigns', 'Brand-governed output'],
  },
  HOOKS: {
    icon: 'flash_on',
    title: 'Hooks / Angles / CTAs',
    tagline: 'Attention-grabbing hooks and persuasion angles',
    description: 'Get AI-generated attention hooks, persuasion angles, and calls-to-action based on your topic and audience. Output is saved as copy artifacts you can reuse across campaigns.',
    useCases: ['Social media hooks', 'Email subject lines', 'CTA experimentation', 'Audience-targeted angles'],
  },
  VIDEO: {
    icon: 'videocam',
    title: 'Video Script',
    tagline: 'Scene-by-scene scripts with visual directions',
    description: 'Create a structured video script with scenes, timing, voiceover, and visual directions for your product. Ideal for ad creatives, explainers, and social video.',
    useCases: ['Social video ads (15-60s)', 'Product explainers', 'Platform-optimized scripts', 'Storyboard planning'],
  },
  UGC: {
    icon: 'groups',
    title: 'UGC Brief',
    tagline: 'Creator briefs with talking points & shot lists',
    description: 'Generate a complete creator brief with talking points, shot lists, and brand guidelines for user-generated content. Send directly to creators or use as a production guide.',
    useCases: ['Influencer briefs', 'Creator partnerships', 'Product unboxing guides', 'Testimonial scripts'],
  },
};

@Component({
  selector: 'app-ai-generator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatSelectModule,
    MatSnackBarModule,
    MatStepperModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <!-- Hero Section -->
      <header class="hero">
        <nav class="breadcrumb">
          <a routerLink="/creative/assets" class="bc-link">Creative Studio</a>
          <mat-icon class="bc-sep">chevron_right</mat-icon>
          <span>AI Generator</span>
        </nav>

        <div class="hero-content">
          <div class="hero-icon-wrap">
            <mat-icon class="hero-icon">auto_awesome</mat-icon>
          </div>
          <div class="hero-text">
            <h1>AI Creative Generator</h1>
            <p class="hero-subtitle">
              Create high-performing ad content in minutes, not hours. Use AI to generate copy variants,
              hooks, video scripts, and UGC briefs — all saved to your
              <a routerLink="/creative/copy">Copy Library</a> with full provenance tracking.
            </p>
          </div>
        </div>

        <!-- Quick-start capabilities -->
        <div class="capabilities-bar">
          <div class="cap-item" matTooltip="Generate multiple ad copy versions for A/B testing across platforms">
            <mat-icon>edit_note</mat-icon>
            <span>Ad Copy</span>
          </div>
          <div class="cap-divider"></div>
          <div class="cap-item" matTooltip="AI-generated hooks, angles, and calls-to-action for your campaigns">
            <mat-icon>flash_on</mat-icon>
            <span>Hooks & CTAs</span>
          </div>
          <div class="cap-divider"></div>
          <div class="cap-item" matTooltip="Structured video scripts with scene breakdowns and visual directions">
            <mat-icon>videocam</mat-icon>
            <span>Video Scripts</span>
          </div>
          <div class="cap-divider"></div>
          <div class="cap-item" matTooltip="Complete creator briefs with talking points, shot lists, and brand guidelines">
            <mat-icon>groups</mat-icon>
            <span>UGC Briefs</span>
          </div>
        </div>

        <!-- How it works -->
        <div class="how-it-works">
          <p class="hiw-label">
            <mat-icon class="hiw-icon">help_outline</mat-icon>
            <strong>How it works:</strong>
            Choose a content type, configure your parameters, review your settings, and generate.
            All output is saved as artifacts in your
            <a routerLink="/creative/copy">Copy Library</a> and linked to the AI run for traceability.
            You can optionally connect
            <span class="hiw-link" matTooltip="Brand Rule Sets enforce tone, language, and compliance checks on generated copy">Brand Rules</span>,
            <span class="hiw-link" matTooltip="Templates define the structure and format of generated copy (e.g. headline + body + CTA)">Templates</span>, and
            <span class="hiw-link" matTooltip="Persona Research and Insights from the Research module help AI tailor copy to your specific audience segments">Research data</span>
            for even better results.
          </p>
        </div>
      </header>

      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon>warning_amber</mat-icon>
          <div>
            <p class="callout-title">Workspace required</p>
            <p class="callout-body">Select a workspace from the sidebar to start generating content. Each workspace has its own Copy Library, Templates, and Brand Rules.</p>
          </div>
        </mat-card>
      } @else {
        <mat-card class="stepper-card">
          <mat-stepper #stepper="matStepper" [linear]="false" class="stepper">

            <!-- STEP 1: Choose Type -->
            <mat-step label="Choose Type">
              <div class="step-header">
                <h2 class="step-title">What would you like to create?</h2>
                <p class="step-subtitle">Select a content type below. Each type produces different artifacts tailored to specific marketing needs.</p>
              </div>

              <div class="type-cards">
                <mat-radio-group [(ngModel)]="genKind" name="gk" class="type-cards-group">
                  @for (kind of genKinds; track kind) {
                    <label class="type-card" [class.selected]="genKind === kind" (click)="genKind = kind">
                      <mat-radio-button [value]="kind" class="type-radio"></mat-radio-button>
                      <div class="type-card-body">
                        <div class="type-card-header">
                          <mat-icon class="type-card-icon">{{ genKindMeta[kind].icon }}</mat-icon>
                          <div>
                            <span class="type-card-title">{{ genKindMeta[kind].title }}</span>
                            <span class="type-card-tagline">{{ genKindMeta[kind].tagline }}</span>
                          </div>
                        </div>
                        <p class="type-card-desc">{{ genKindMeta[kind].description }}</p>
                        <div class="type-card-uses">
                          <span class="uses-label">Common uses:</span>
                          @for (use of genKindMeta[kind].useCases; track use) {
                            <span class="use-chip">{{ use }}</span>
                          }
                        </div>
                      </div>
                    </label>
                  }
                </mat-radio-group>
              </div>

              <div class="step-actions">
                <button mat-flat-button color="primary" type="button" matStepperNext>
                  Continue to Configure
                  <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                </button>
              </div>
            </mat-step>

            <!-- STEP 2: Configure -->
            <mat-step label="Configure">
              <div class="step-header">
                <h2 class="step-title">Configure your {{ genKindMeta[genKind].title }}</h2>
                <p class="step-subtitle">Fill in the required fields below. Optional fields let you fine-tune the output with brand rules, templates, and audience data.</p>
              </div>

              @if (genKind === 'AD_COPY') {
                <div class="config-intro">
                  <mat-icon class="config-icon">lightbulb</mat-icon>
                  <div>
                    <p><strong>Tip:</strong> For best results, be specific with your copy name (e.g. "Summer Sale Hero Banner") and choose a platform to get format-optimized output.</p>
                    <p class="config-links">Related: <a routerLink="/creative/copy">Copy Library</a> &middot; <a routerLink="/creative/variants">Variant Sets</a></p>
                  </div>
                </div>

                <div class="form-section">
                  <h3 class="form-section-title">
                    <mat-icon>description</mat-icon>
                    Required fields
                  </h3>
                  <div class="form-grid">
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Name</mat-label>
                      <input matInput [(ngModel)]="copyName" name="cn" required placeholder="e.g. Summer Sale Hero Banner" />
                      <mat-hint>A descriptive name for this copy generation run</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Copy artifact type</mat-label>
                      <mat-select [(ngModel)]="copyArtifactType" name="cat" required>
                        @for (ct of copyArtifactTypes; track ct.value) {
                          <mat-option [value]="ct.value">{{ ct.label }}</mat-option>
                        }
                      </mat-select>
                      <mat-icon matSuffix class="field-help"
                        matTooltip="The type of copy artifact to create. This determines how the artifact is categorized in your Copy Library.">
                        help_outline
                      </mat-icon>
                      <mat-hint>How this copy is categorized in the Copy Library</mat-hint>
                    </mat-form-field>
                    <div class="form-row">
                      <mat-form-field appearance="outline" class="half">
                        <mat-label>Number of variants</mat-label>
                        <input matInput type="number" min="1" max="10" [(ngModel)]="copyNumVariants" name="cnv" />
                        <mat-icon matSuffix class="field-help"
                          matTooltip="How many copy variations to generate (1-10). More variants give you more options for A/B testing.">
                          help_outline
                        </mat-icon>
                        <mat-hint>1-10 variations for testing</mat-hint>
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="half">
                        <mat-label>Language</mat-label>
                        <input matInput [(ngModel)]="copyLanguage" name="cl" placeholder="e.g. en, es, fr" />
                        <mat-hint>ISO language code</mat-hint>
                      </mat-form-field>
                    </div>
                  </div>
                </div>

                <div class="form-section">
                  <h3 class="form-section-title">
                    <mat-icon>tune</mat-icon>
                    Customization
                    <span class="optional-badge">Optional</span>
                  </h3>
                  <p class="form-section-desc">Fine-tune the AI output by setting a tone, platform, or connecting Brand Rules and Research data.</p>
                  <div class="form-grid">
                    <div class="form-row">
                      <mat-form-field appearance="outline" class="half">
                        <mat-label>Tone override</mat-label>
                        <input matInput [(ngModel)]="copyTone" name="ct" placeholder="e.g. playful, professional" />
                        <mat-icon matSuffix class="field-help"
                          matTooltip="Override the default brand tone. Examples: professional, playful, urgent, empathetic. Leave empty to use your brand's default tone.">
                          help_outline
                        </mat-icon>
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="half">
                        <mat-label>Platform</mat-label>
                        <mat-select [(ngModel)]="copyPlatform" name="cp">
                          <mat-option value="">Any platform</mat-option>
                          @for (p of platformTypes; track p) {
                            <mat-option [value]="p">{{ p }}</mat-option>
                          }
                        </mat-select>
                        <mat-hint>Optimizes copy for platform constraints</mat-hint>
                      </mat-form-field>
                    </div>
                  </div>
                </div>

                <div class="form-section">
                  <h3 class="form-section-title">
                    <mat-icon>link</mat-icon>
                    Linked Resources
                    <span class="optional-badge">Optional</span>
                  </h3>
                  <p class="form-section-desc">Connect existing resources from your workspace to improve AI output quality.</p>
                  <div class="form-grid">
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Template</mat-label>
                      <mat-select [(ngModel)]="copyTemplateId" name="cti">
                        <mat-option value="">None</mat-option>
                        @for (t of templates(); track t.id) {
                          <mat-option [value]="t.id">
                            {{ t.name }}
                            <span class="option-meta"> &middot; {{ t.templateType }} &middot; {{ t.status }}</span>
                          </mat-option>
                        }
                      </mat-select>
                      <mat-icon matSuffix class="field-help"
                        matTooltip="Controls the output structure (e.g. headline + body + CTA). Templates are managed in Governance > Templates.">
                        help_outline
                      </mat-icon>
                      <mat-hint>Structures the output format</mat-hint>
                      @if (!templates().length) {
                        <mat-hint align="end"><a routerLink="/governance/templates">Create a template</a></mat-hint>
                      }
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Brand Rule Set</mat-label>
                      <mat-select [(ngModel)]="copyRuleSetId" name="crs">
                        <mat-option value="">None</mat-option>
                        @for (r of ruleSets(); track r.id) {
                          <mat-option [value]="r.id">
                            {{ r.name }}
                            <span class="option-meta"> &middot; {{ r.domain }} &middot; {{ r.status }}</span>
                          </mat-option>
                        }
                      </mat-select>
                      <mat-icon matSuffix class="field-help"
                        matTooltip="Validates generated copy against your brand's tone, language, and compliance rules. Rule Sets are managed in Governance > Rule Sets.">
                        help_outline
                      </mat-icon>
                      <mat-hint>Enforces brand governance &amp; compliance</mat-hint>
                      @if (!ruleSets().length) {
                        <mat-hint align="end"><a routerLink="/governance/rulesets">Create a rule set</a></mat-hint>
                      }
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Persona</mat-label>
                      <mat-select [(ngModel)]="copyPersonaId" name="cpi">
                        <mat-option value="">None</mat-option>
                        @for (p of personas(); track p.id) {
                          <mat-option [value]="p.id">
                            {{ p.name }}
                            <span class="option-meta"> &middot; {{ p.language }}</span>
                          </mat-option>
                        }
                      </mat-select>
                      <mat-icon matSuffix class="field-help"
                        matTooltip="Tailors copy to a specific audience segment using persona traits, pain points, and motivations. Personas are managed in Research > Personas.">
                        help_outline
                      </mat-icon>
                      <mat-hint>Tailors copy to a specific audience</mat-hint>
                      @if (!personas().length) {
                        <mat-hint align="end"><a routerLink="/research/personas">Create a persona</a></mat-hint>
                      }
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Insights</mat-label>
                      <mat-select [(ngModel)]="copyInsightIds" name="cins" multiple>
                        @for (i of insights(); track i.id) {
                          <mat-option [value]="i.id">
                            {{ i.title }}
                            <span class="option-meta"> &middot; {{ i.category }} &middot; {{ i.status }}</span>
                          </mat-option>
                        }
                      </mat-select>
                      <mat-icon matSuffix class="field-help"
                        matTooltip="Select one or more insights to provide data-driven context (market trends, competitor analysis) that improves copy relevance. Insights are managed in Research > Insights.">
                        help_outline
                      </mat-icon>
                      <mat-hint>Data-driven context for better copy</mat-hint>
                      @if (!insights().length) {
                        <mat-hint align="end"><a routerLink="/research/insights">Create insights</a></mat-hint>
                      }
                    </mat-form-field>
                  </div>
                </div>
              } @else if (genKind === 'HOOKS') {
                <div class="config-intro">
                  <mat-icon class="config-icon">lightbulb</mat-icon>
                  <div>
                    <p><strong>Tip:</strong> Be specific with your topic — include the product, audience, or campaign goal for more targeted hooks and CTAs.</p>
                    <p class="config-links">Related: <a routerLink="/creative/copy">Copy Library</a></p>
                  </div>
                </div>

                <div class="form-section">
                  <h3 class="form-section-title">
                    <mat-icon>description</mat-icon>
                    Required fields
                  </h3>
                  <div class="form-grid">
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Topic</mat-label>
                      <input matInput [(ngModel)]="hooksTopic" name="ht" required placeholder="e.g. Summer fitness app launch for millennials" />
                      <mat-hint>What the hooks, angles, and CTAs should be about</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Language</mat-label>
                      <input matInput [(ngModel)]="hooksLanguage" name="hl" required placeholder="e.g. en" />
                      <mat-hint>ISO language code for the generated content</mat-hint>
                    </mat-form-field>
                  </div>
                </div>

                <div class="form-section">
                  <h3 class="form-section-title">
                    <mat-icon>link</mat-icon>
                    Linked Resources
                    <span class="optional-badge">Optional</span>
                  </h3>
                  <p class="form-section-desc">Connect Research data to generate audience-tailored hooks.</p>
                  <div class="form-grid">
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Persona</mat-label>
                      <mat-select [(ngModel)]="hooksPersonaId" name="hpi">
                        <mat-option value="">None</mat-option>
                        @for (p of personas(); track p.id) {
                          <mat-option [value]="p.id">
                            {{ p.name }}
                            <span class="option-meta"> &middot; {{ p.language }}</span>
                          </mat-option>
                        }
                      </mat-select>
                      <mat-icon matSuffix class="field-help"
                        matTooltip="Generate hooks that resonate with a specific audience segment's pain points and motivations.">
                        help_outline
                      </mat-icon>
                      <mat-hint>Tailors hooks to a specific audience</mat-hint>
                      @if (!personas().length) {
                        <mat-hint align="end"><a routerLink="/research/personas">Create a persona</a></mat-hint>
                      }
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Insights</mat-label>
                      <mat-select [(ngModel)]="hooksInsightIds" name="hins" multiple>
                        @for (i of insights(); track i.id) {
                          <mat-option [value]="i.id">
                            {{ i.title }}
                            <span class="option-meta"> &middot; {{ i.category }}</span>
                          </mat-option>
                        }
                      </mat-select>
                      <mat-icon matSuffix class="field-help"
                        matTooltip="Select insights to provide data-driven context for more relevant hooks.">
                        help_outline
                      </mat-icon>
                      <mat-hint>Data-driven context for better hooks</mat-hint>
                      @if (!insights().length) {
                        <mat-hint align="end"><a routerLink="/research/insights">Create insights</a></mat-hint>
                      }
                    </mat-form-field>
                  </div>
                </div>
              } @else if (genKind === 'VIDEO') {
                <div class="config-intro">
                  <mat-icon class="config-icon">lightbulb</mat-icon>
                  <div>
                    <p><strong>Tip:</strong> Include your key selling points in the product description. Choose a platform to get format-optimized timing (e.g. TikTok favors 15-30s, YouTube pre-rolls are typically 15s).</p>
                    <p class="config-links">Related: <a routerLink="/creative/copy">Copy Library</a></p>
                  </div>
                </div>

                <div class="form-section">
                  <h3 class="form-section-title">
                    <mat-icon>description</mat-icon>
                    Required fields
                  </h3>
                  <div class="form-grid">
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Product</mat-label>
                      <input matInput [(ngModel)]="videoProduct" name="vp" required placeholder="e.g. AI-powered fitness coaching app" />
                      <mat-hint>The product or service featured in the video</mat-hint>
                    </mat-form-field>
                    <div class="form-row">
                      <mat-form-field appearance="outline" class="half">
                        <mat-label>Platform</mat-label>
                        <mat-select [(ngModel)]="videoPlatform" name="vpl" required>
                          @for (p of platformTypes; track p) {
                            <mat-option [value]="p">{{ p }}</mat-option>
                          }
                        </mat-select>
                        <mat-hint>Optimizes pacing and format</mat-hint>
                      </mat-form-field>
                      <mat-form-field appearance="outline" class="half">
                        <mat-label>Duration (seconds)</mat-label>
                        <input matInput type="number" min="1" [(ngModel)]="videoDuration" name="vd" />
                        <mat-icon matSuffix class="field-help"
                          matTooltip="Target video duration in seconds. Common lengths: 15s (pre-roll), 30s (standard), 60s (extended). The script will be paced accordingly.">
                          help_outline
                        </mat-icon>
                        <mat-hint>Target length in seconds</mat-hint>
                      </mat-form-field>
                    </div>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Language</mat-label>
                      <input matInput [(ngModel)]="videoLanguage" name="vl" required placeholder="e.g. en" />
                      <mat-hint>ISO language code for the script</mat-hint>
                    </mat-form-field>
                  </div>
                </div>

                <div class="form-section">
                  <h3 class="form-section-title">
                    <mat-icon>tune</mat-icon>
                    Additional details
                    <span class="optional-badge">Optional</span>
                  </h3>
                  <div class="form-grid">
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Offer</mat-label>
                      <input matInput [(ngModel)]="videoOffer" name="vo" placeholder="e.g. 50% off first month" />
                      <mat-icon matSuffix class="field-help"
                        matTooltip="A promotional offer or CTA to feature in the script. If provided, the AI will weave it naturally into the closing scene.">
                        help_outline
                      </mat-icon>
                      <mat-hint>Promotional offer to feature in the closing</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Persona</mat-label>
                      <mat-select [(ngModel)]="videoPersonaId" name="vpi">
                        <mat-option value="">None</mat-option>
                        @for (p of personas(); track p.id) {
                          <mat-option [value]="p.id">
                            {{ p.name }}
                            <span class="option-meta"> &middot; {{ p.language }}</span>
                          </mat-option>
                        }
                      </mat-select>
                      <mat-icon matSuffix class="field-help"
                        matTooltip="Tailor the script's messaging and tone to your target audience's pain points and motivations.">
                        help_outline
                      </mat-icon>
                      <mat-hint>Tailors script tone and messaging to your audience</mat-hint>
                      @if (!personas().length) {
                        <mat-hint align="end"><a routerLink="/research/personas">Create a persona</a></mat-hint>
                      }
                    </mat-form-field>
                  </div>
                </div>
              } @else if (genKind === 'UGC') {
                <div class="config-intro">
                  <mat-icon class="config-icon">lightbulb</mat-icon>
                  <div>
                    <p><strong>Tip:</strong> Include specific deliverables (e.g. "1 unboxing video, 3 lifestyle photos") so the brief gives clear direction to creators.</p>
                    <p class="config-links">Related: <a routerLink="/creative/copy">Copy Library</a></p>
                  </div>
                </div>

                <div class="form-section">
                  <h3 class="form-section-title">
                    <mat-icon>description</mat-icon>
                    Required fields
                  </h3>
                  <div class="form-grid">
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Product</mat-label>
                      <input matInput [(ngModel)]="ugcProduct" name="up" required placeholder="e.g. Organic skincare starter kit" />
                      <mat-hint>The product creators will feature in their content</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Language</mat-label>
                      <input matInput [(ngModel)]="ugcLanguage" name="ul" required placeholder="e.g. en" />
                      <mat-hint>ISO language code for the brief</mat-hint>
                    </mat-form-field>
                  </div>
                </div>

                <div class="form-section">
                  <h3 class="form-section-title">
                    <mat-icon>tune</mat-icon>
                    Additional details
                    <span class="optional-badge">Optional</span>
                  </h3>
                  <div class="form-grid">
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Deliverables</mat-label>
                      <textarea matInput rows="3" [(ngModel)]="ugcDeliverables" name="ud" placeholder="e.g. 1 unboxing video (60s), 3 lifestyle photos, 1 before/after comparison"></textarea>
                      <mat-icon matSuffix class="field-help"
                        matTooltip="Describe the specific content you expect from creators. Be clear about formats, durations, and quantities.">
                        help_outline
                      </mat-icon>
                      <mat-hint>What the creator should deliver (videos, photos, etc.)</mat-hint>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="full">
                      <mat-label>Tone override</mat-label>
                      <input matInput [(ngModel)]="ugcTone" name="uto" placeholder="e.g. authentic, casual" />
                      <mat-icon matSuffix class="field-help"
                        matTooltip="Set the overall tone for the brief. This guides how talking points and instructions are written.">
                        help_outline
                      </mat-icon>
                      <mat-hint>Sets the overall tone for the creator brief</mat-hint>
                    </mat-form-field>
                  </div>
                </div>
              }

              <div class="step-actions">
                <button mat-button type="button" matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon>
                  Back
                </button>
                <button mat-flat-button color="primary" type="button" matStepperNext [disabled]="!step2Valid()">
                  Review &amp; Generate
                  <mat-icon iconPositionEnd>arrow_forward</mat-icon>
                </button>
                @if (!step2Valid()) {
                  <span class="validation-hint">
                    <mat-icon class="validation-icon">info</mat-icon>
                    Fill in all required fields to continue
                  </span>
                }
              </div>
            </mat-step>

            <!-- STEP 3: Review & Generate -->
            <mat-step label="Review & Generate">
              <div class="step-header">
                <h2 class="step-title">Review your configuration</h2>
                <p class="step-subtitle">Verify your settings below, then click Generate. The AI will process your request and save the output to the Copy Library.</p>
              </div>

              <div class="review-card">
                <div class="review-header">
                  <mat-icon class="review-type-icon">{{ genKindMeta[genKind].icon }}</mat-icon>
                  <div>
                    <span class="review-type-title">{{ genKindMeta[genKind].title }}</span>
                    <span class="review-type-tagline">{{ genKindMeta[genKind].tagline }}</span>
                  </div>
                </div>

                <mat-divider></mat-divider>

                <div class="review-grid">
                  @for (item of reviewItems(); track item.label) {
                    <div class="review-item">
                      <span class="review-label">{{ item.label }}</span>
                      <span class="review-value" [class.review-empty]="!item.value">{{ item.value || 'Not set' }}</span>
                    </div>
                  }
                </div>
              </div>

              <div class="generate-info">
                <mat-icon class="info-icon">info_outline</mat-icon>
                <span>Generation typically takes 10-30 seconds. Output will be saved as artifacts in your
                  <a routerLink="/creative/copy">Copy Library</a> and linked to the AI run for full traceability.</span>
              </div>

              <div class="step-actions">
                <button mat-button type="button" matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon>
                  Back to Configure
                </button>
                <button
                  mat-flat-button
                  color="primary"
                  type="button"
                  class="generate-btn"
                  [disabled]="generating()"
                  (click)="runGenerate(stepper)"
                >
                  @if (generating()) {
                    <mat-spinner diameter="20" class="inline-spin"></mat-spinner>
                    Generating...
                  } @else {
                    <mat-icon>auto_awesome</mat-icon>
                    Generate {{ genKindMeta[genKind].title }}
                  }
                </button>
              </div>
            </mat-step>

            <!-- STEP 4: Results -->
            <mat-step label="Results">
              @if (lastError()) {
                <div class="result-banner result-error">
                  <mat-icon class="result-banner-icon">error_outline</mat-icon>
                  <div>
                    <p class="result-banner-title">Generation failed</p>
                    <p class="result-banner-body">{{ lastError() }}</p>
                    <p class="result-banner-hint">Check your configuration and try again, or contact support if the problem persists.</p>
                  </div>
                </div>
              } @else {
                <div class="result-banner result-success">
                  <mat-icon class="result-banner-icon">check_circle</mat-icon>
                  <div>
                    <p class="result-banner-title">Content generated successfully</p>
                    <p class="result-banner-body">Your {{ genKindMeta[genKind].title | lowercase }} has been created and saved to the Copy Library.</p>
                  </div>
                </div>

                <!-- Results detail cards -->
                <div class="result-details">
                  @if (resultRunId()) {
                    <div class="result-detail-item">
                      <mat-icon class="result-detail-icon">history</mat-icon>
                      <div>
                        <span class="result-detail-label">AI Run ID</span>
                        <code class="result-detail-value">{{ resultRunId() }}</code>
                        <span class="result-detail-desc">All generated content is linked to this run for full provenance tracking</span>
                      </div>
                    </div>
                  }
                  @if (resultVariantSetId()) {
                    <div class="result-detail-item">
                      <mat-icon class="result-detail-icon">view_list</mat-icon>
                      <div>
                        <span class="result-detail-label">Variant Set</span>
                        <code class="result-detail-value">{{ resultVariantSetId() }}</code>
                        <span class="result-detail-desc">Your copy variants are grouped in this set for easy comparison and A/B testing</span>
                      </div>
                    </div>
                  }
                  @if (resultGovernance().length) {
                    <div class="result-detail-item">
                      <mat-icon class="result-detail-icon">verified</mat-icon>
                      <div>
                        <span class="result-detail-label">Governance Status</span>
                        <span class="result-detail-value governance-status">{{ resultGovernance().join(', ') }}</span>
                        <span class="result-detail-desc">Brand rule compliance check results for generated copy</span>
                      </div>
                    </div>
                  }
                </div>

                <!-- Artifact links -->
                @if (resultArtifactIds().length) {
                  <div class="artifacts-section">
                    <h3 class="artifacts-title">
                      <mat-icon>article</mat-icon>
                      Generated Artifacts ({{ resultArtifactIds().length }})
                    </h3>
                    <p class="artifacts-desc">Each artifact is a separate copy version saved in your Copy Library. Click to view, edit, or approve.</p>
                    <div class="artifact-list">
                      @for (id of resultArtifactIds(); track id; let i = $index) {
                        <a [routerLink]="['/creative/copy', id]" class="artifact-link">
                          <mat-icon>description</mat-icon>
                          <div>
                            <span class="artifact-link-title">Variant {{ i + 1 }}</span>
                            <code class="artifact-link-id">{{ id }}</code>
                          </div>
                          <mat-icon class="artifact-arrow">arrow_forward</mat-icon>
                        </a>
                      }
                    </div>
                  </div>
                }
                @if (resultSingleArtifactId()) {
                  <div class="artifacts-section">
                    <h3 class="artifacts-title">
                      <mat-icon>article</mat-icon>
                      Generated Artifact
                    </h3>
                    <p class="artifacts-desc">Your generated content has been saved. Click below to view, edit, or approve it.</p>
                    <a [routerLink]="['/creative/copy', resultSingleArtifactId()!]" class="artifact-link">
                      <mat-icon>description</mat-icon>
                      <div>
                        <span class="artifact-link-title">{{ genKindMeta[genKind].title }}</span>
                        <code class="artifact-link-id">{{ resultSingleArtifactId() }}</code>
                      </div>
                      <mat-icon class="artifact-arrow">arrow_forward</mat-icon>
                    </a>
                  </div>
                }
              }

              <!-- Next steps guidance -->
              <div class="next-steps">
                <h3 class="next-steps-title">
                  <mat-icon>explore</mat-icon>
                  What to do next
                </h3>
                <div class="next-steps-grid">
                  <a routerLink="/creative/copy" class="next-step-card">
                    <mat-icon>library_books</mat-icon>
                    <span class="next-step-label">Copy Library</span>
                    <span class="next-step-desc">View, edit, and manage all your generated copy artifacts</span>
                  </a>
                  <a routerLink="/creative/variants" class="next-step-card">
                    <mat-icon>compare</mat-icon>
                    <span class="next-step-label">Variant Sets</span>
                    <span class="next-step-desc">Compare and score copy variants for A/B testing</span>
                  </a>
                  <a routerLink="/creative/assets" class="next-step-card">
                    <mat-icon>photo_library</mat-icon>
                    <span class="next-step-label">Asset Library</span>
                    <span class="next-step-desc">Pair your copy with visual assets for complete creatives</span>
                  </a>
                  <button class="next-step-card" (click)="startNewGeneration(stepper)">
                    <mat-icon>add_circle</mat-icon>
                    <span class="next-step-label">Generate More</span>
                    <span class="next-step-desc">Start a new AI generation with different settings</span>
                  </button>
                </div>
              </div>

              <div class="step-actions">
                <button mat-button type="button" matStepperPrevious>
                  <mat-icon>arrow_back</mat-icon>
                  Back
                </button>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px 24px 48px; max-width: 780px; margin: 0 auto; }

    /* Breadcrumb */
    .breadcrumb { display: flex; align-items: center; gap: 4px; font-size: 13px; color: var(--text-secondary); margin-bottom: 16px; }
    .bc-link { color: var(--text-secondary); text-decoration: none; }
    .bc-link:hover { color: var(--color-primary); text-decoration: underline; }
    .bc-sep { font-size: 18px; width: 18px; height: 18px; color: var(--text-muted); }

    /* Hero */
    .hero { margin-bottom: 24px; }
    .hero-content { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
    .hero-icon-wrap {
      width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
      background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 15%, transparent), color-mix(in srgb, var(--color-primary) 8%, transparent));
      display: flex; align-items: center; justify-content: center;
    }
    .hero-icon { font-size: 28px; width: 28px; height: 28px; color: var(--color-primary); }
    .hero-text h1 { margin: 0 0 6px; font-size: 26px; font-weight: 600; color: var(--text-primary); }
    .hero-subtitle { margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.6; max-width: 600px; }
    .hero-subtitle a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
    .hero-subtitle a:hover { text-decoration: underline; }

    /* Capabilities bar */
    .capabilities-bar {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: var(--bg-surface-hover, #f5f5f5); border-radius: var(--radius-md, 8px);
      margin-bottom: 16px; flex-wrap: wrap;
    }
    .cap-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-secondary); cursor: help; }
    .cap-item mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); }
    .cap-divider { width: 1px; height: 20px; background: var(--border-default, #e0e0e0); }

    /* How it works */
    .how-it-works {
      padding: 12px 16px; border-radius: var(--radius-md, 8px);
      background: color-mix(in srgb, var(--color-primary) 4%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
    }
    .hiw-label { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.6; display: flex; align-items: baseline; flex-wrap: wrap; gap: 0 4px; }
    .hiw-icon { font-size: 16px; width: 16px; height: 16px; color: var(--color-primary); vertical-align: text-bottom; margin-right: 2px; }
    .hiw-label a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
    .hiw-label a:hover { text-decoration: underline; }
    .hiw-link { color: var(--color-primary); font-weight: 500; cursor: help; border-bottom: 1px dashed var(--color-primary); }

    /* Callout */
    .callout { display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px; border-radius: var(--radius-md, 8px); }
    .callout-warn {
      background: color-mix(in srgb, var(--color-warn, #f9a825) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-warn, #f9a825) 25%, transparent);
    }
    .callout-title { margin: 0 0 4px; font-weight: 600; font-size: 14px; color: var(--text-primary); }
    .callout-body { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }

    /* Stepper card */
    .stepper-card { border: 1px solid var(--border-default); border-radius: var(--radius-md, 8px); padding: 8px 0 16px; }

    /* Step header */
    .step-header { margin-bottom: 20px; }
    .step-title { margin: 0 0 4px; font-size: 18px; font-weight: 600; color: var(--text-primary); }
    .step-subtitle { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5; max-width: 600px; }

    /* Type cards (Step 1) */
    .type-cards { margin: 16px 0; }
    .type-cards-group { display: flex; flex-direction: column; gap: 10px; }
    .type-card {
      display: flex; align-items: flex-start; gap: 8px; padding: 14px 16px; cursor: pointer;
      border: 2px solid var(--border-default, #e0e0e0); border-radius: var(--radius-md, 8px);
      transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    }
    .type-card:hover { border-color: color-mix(in srgb, var(--color-primary) 50%, transparent); background: color-mix(in srgb, var(--color-primary) 2%, transparent); }
    .type-card.selected {
      border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 5%, transparent);
      box-shadow: 0 0 0 1px var(--color-primary);
    }
    .type-radio { flex-shrink: 0; margin-top: 2px; }
    .type-card-body { flex: 1; min-width: 0; }
    .type-card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
    .type-card-icon { font-size: 22px; width: 22px; height: 22px; color: var(--color-primary); }
    .type-card-title { display: block; font-weight: 600; font-size: 14px; color: var(--text-primary); }
    .type-card-tagline { display: block; font-size: 12px; color: var(--text-secondary); margin-top: 1px; }
    .type-card-desc { margin: 0 0 8px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
    .type-card-uses { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .uses-label { font-size: 11px; color: var(--text-muted, #999); text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-right: 4px; }
    .use-chip {
      font-size: 11px; padding: 2px 8px; border-radius: 99px;
      background: var(--bg-surface-hover, #f0f0f0); color: var(--text-secondary);
    }

    /* Config intro tip */
    .config-intro {
      display: flex; align-items: flex-start; gap: 10px; padding: 12px 16px; margin-bottom: 16px;
      border-radius: var(--radius-md, 8px); background: color-mix(in srgb, var(--color-primary) 5%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-primary) 15%, transparent);
    }
    .config-intro p { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
    .config-intro p + p { margin-top: 6px; }
    .config-icon { font-size: 20px; width: 20px; height: 20px; color: var(--color-primary); flex-shrink: 0; margin-top: 1px; }
    .config-links { font-size: 12px !important; }
    .config-links a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
    .config-links a:hover { text-decoration: underline; }

    /* Form sections */
    .form-section { margin-bottom: 20px; }
    .form-section-title {
      display: flex; align-items: center; gap: 6px; margin: 0 0 6px; font-size: 14px; font-weight: 600; color: var(--text-primary);
    }
    .form-section-title mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-secondary); }
    .form-section-desc { margin: 0 0 12px; font-size: 12px; color: var(--text-muted, #999); line-height: 1.5; }
    .optional-badge {
      font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
      padding: 2px 8px; border-radius: 99px; background: var(--bg-surface-hover, #f0f0f0);
      color: var(--text-muted, #999);
    }
    .form-grid { display: flex; flex-direction: column; gap: 4px; }
    .form-row { display: flex; gap: 12px; }
    .full { width: 100%; }
    .half { flex: 1; }
    .field-help { font-size: 18px !important; width: 18px !important; height: 18px !important; color: var(--text-muted, #999); cursor: help; }
    .option-meta { font-size: 12px; color: var(--text-muted, #999); }

    /* Validation hint */
    .validation-hint { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--text-muted, #999); }
    .validation-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Step actions */
    .step-actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-top: 24px; }

    /* Review card (Step 3) */
    .review-card {
      border: 1px solid var(--border-default, #e0e0e0); border-radius: var(--radius-md, 8px);
      overflow: hidden; margin-bottom: 16px;
    }
    .review-header { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--bg-surface-hover, #fafafa); }
    .review-type-icon { font-size: 24px; width: 24px; height: 24px; color: var(--color-primary); }
    .review-type-title { display: block; font-weight: 600; font-size: 14px; color: var(--text-primary); }
    .review-type-tagline { display: block; font-size: 12px; color: var(--text-secondary); }
    .review-grid { padding: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .review-item { display: flex; flex-direction: column; gap: 2px; }
    .review-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted, #999); }
    .review-value { font-size: 13px; color: var(--text-primary); word-break: break-all; }
    .review-empty { color: var(--text-muted, #999); font-style: italic; }

    /* Generate info */
    .generate-info {
      display: flex; align-items: flex-start; gap: 8px; padding: 10px 14px;
      border-radius: var(--radius-md, 8px); background: color-mix(in srgb, var(--color-primary) 4%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
      font-size: 13px; color: var(--text-secondary); line-height: 1.5;
    }
    .generate-info a { color: var(--color-primary); font-weight: 500; text-decoration: none; }
    .generate-info a:hover { text-decoration: underline; }
    .info-icon { font-size: 18px; width: 18px; height: 18px; color: var(--color-primary); flex-shrink: 0; margin-top: 1px; }
    .generate-btn { min-width: 200px; }
    .inline-spin { display: inline-block; vertical-align: middle; margin-right: 8px; }

    /* Result banners */
    .result-banner { display: flex; align-items: flex-start; gap: 12px; padding: 16px 20px; border-radius: var(--radius-md, 8px); margin-bottom: 20px; }
    .result-success { background: color-mix(in srgb, #4caf50 8%, transparent); border: 1px solid color-mix(in srgb, #4caf50 25%, transparent); }
    .result-error { background: color-mix(in srgb, #f44336 8%, transparent); border: 1px solid color-mix(in srgb, #f44336 25%, transparent); }
    .result-banner-icon { font-size: 24px; width: 24px; height: 24px; flex-shrink: 0; margin-top: 1px; }
    .result-success .result-banner-icon { color: #4caf50; }
    .result-error .result-banner-icon { color: #f44336; }
    .result-banner-title { margin: 0 0 4px; font-weight: 600; font-size: 15px; color: var(--text-primary); }
    .result-banner-body { margin: 0; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
    .result-banner-hint { margin: 8px 0 0; font-size: 12px; color: var(--text-muted, #999); }

    /* Result details */
    .result-details { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .result-detail-item {
      display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px;
      border: 1px solid var(--border-default, #e0e0e0); border-radius: var(--radius-md, 8px);
    }
    .result-detail-icon { font-size: 20px; width: 20px; height: 20px; color: var(--color-primary); flex-shrink: 0; margin-top: 1px; }
    .result-detail-label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted, #999); }
    .result-detail-value { display: block; font-family: ui-monospace, monospace; font-size: 12px; color: var(--text-primary); margin: 2px 0; word-break: break-all; }
    .governance-status { font-family: inherit; font-weight: 500; }
    .result-detail-desc { display: block; font-size: 11px; color: var(--text-muted, #999); line-height: 1.4; }

    /* Artifacts section */
    .artifacts-section { margin-bottom: 20px; }
    .artifacts-title { display: flex; align-items: center; gap: 6px; margin: 0 0 4px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .artifacts-title mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-secondary); }
    .artifacts-desc { margin: 0 0 10px; font-size: 12px; color: var(--text-muted, #999); line-height: 1.5; }
    .artifact-list { display: flex; flex-direction: column; gap: 6px; }
    .artifact-link {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      border: 1px solid var(--border-default, #e0e0e0); border-radius: var(--radius-md, 8px);
      text-decoration: none; color: var(--text-primary); transition: border-color 0.15s, background 0.15s;
    }
    .artifact-link:hover { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 3%, transparent); }
    .artifact-link mat-icon:first-child { font-size: 20px; width: 20px; height: 20px; color: var(--color-primary); }
    .artifact-link-title { display: block; font-weight: 500; font-size: 13px; }
    .artifact-link-id { display: block; font-family: ui-monospace, monospace; font-size: 11px; color: var(--text-muted, #999); }
    .artifact-arrow { margin-left: auto; font-size: 18px; width: 18px; height: 18px; color: var(--text-muted, #999); }

    /* Next steps */
    .next-steps { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border-default, #e0e0e0); }
    .next-steps-title { display: flex; align-items: center; gap: 6px; margin: 0 0 12px; font-size: 14px; font-weight: 600; color: var(--text-primary); }
    .next-steps-title mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--text-secondary); }
    .next-steps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .next-step-card {
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
      padding: 14px 16px; border: 1px solid var(--border-default, #e0e0e0);
      border-radius: var(--radius-md, 8px); text-decoration: none; color: var(--text-primary);
      transition: border-color 0.15s, background 0.15s; cursor: pointer;
      background: transparent; text-align: left; font-family: inherit;
    }
    .next-step-card:hover { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 3%, transparent); }
    .next-step-card mat-icon { font-size: 22px; width: 22px; height: 22px; color: var(--color-primary); }
    .next-step-label { font-weight: 600; font-size: 13px; }
    .next-step-desc { font-size: 11px; color: var(--text-muted, #999); line-height: 1.4; }

    @media (max-width: 600px) {
      .form-row { flex-direction: column; gap: 4px; }
      .half { flex: unset; width: 100%; }
      .review-grid { grid-template-columns: 1fr; }
      .next-steps-grid { grid-template-columns: 1fr; }
      .capabilities-bar { gap: 8px; }
      .cap-divider { display: none; }
    }
  `],
})
export class AiGeneratorComponent implements OnInit {
  private readonly aiApi = inject(CreativeAiApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly templatesApi = inject(TemplatesApiService);
  private readonly rulesetsApi = inject(RulesetsApiService);
  private readonly researchApi = inject(ResearchApiService);

  readonly platformTypes = [...PLATFORM_TYPES];
  readonly genKinds: GenKind[] = ['AD_COPY', 'HOOKS', 'VIDEO', 'UGC'];
  readonly genKindMeta = GEN_KIND_META;

  genKind: GenKind = 'AD_COPY';

  copyName = '';
  copyNumVariants = 3;
  copyLanguage = 'en';
  copyTone = '';
  copyPlatform = '';
  copyArtifactType = 'AD_COPY';
  readonly copyArtifactTypes = [
    { value: 'AD_COPY', label: 'Ad Copy' },
    { value: 'SOCIAL_CAPTION', label: 'Social Caption' },
    { value: 'EMAIL_COPY', label: 'Email Copy' },
    { value: 'SMS_COPY', label: 'SMS Copy' },
    { value: 'LANDING_COPY', label: 'Landing Page Copy' },
    { value: 'STORYBOARD', label: 'Storyboard' },
  ];
  copyTemplateId = '';
  copyRuleSetId = '';
  copyPersonaId = '';
  copyInsightIds: string[] = [];

  hooksTopic = '';
  hooksLanguage = 'en';
  hooksPersonaId = '';
  hooksInsightIds: string[] = [];

  videoProduct = '';
  videoOffer = '';
  videoDuration = 60;
  videoPlatform: (typeof PLATFORM_TYPES)[number] = 'META';
  videoLanguage = 'en';
  videoPersonaId = '';

  ugcProduct = '';
  ugcDeliverables = '';
  ugcLanguage = 'en';
  ugcTone = '';

  readonly generating = signal(false);
  readonly lastError = signal<string | null>(null);
  readonly resultRunId = signal<string | null>(null);
  readonly resultVariantSetId = signal<string | null>(null);
  readonly resultGovernance = signal<string[]>([]);
  readonly resultArtifactIds = signal<string[]>([]);
  readonly resultSingleArtifactId = signal<string | null>(null);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;

  readonly templates = signal<TemplateResponse[]>([]);
  readonly ruleSets = signal<BrandRuleSetResponse[]>([]);
  readonly personas = signal<PersonaResponse[]>([]);
  readonly insights = signal<InsightResponse[]>([]);
  readonly loadingDropdowns = signal(false);

  constructor() {
    effect(() => {
      const wsId = this.adminStore.selectedWorkspaceId();
      const orgId = this.adminStore.selectedOrgId();
      if (wsId && orgId) {
        this.loadDropdownData(orgId, wsId);
      } else {
        this.templates.set([]);
        this.ruleSets.set([]);
        this.personas.set([]);
        this.insights.set([]);
      }
    });
  }

  private loadDropdownData(orgId: string, wsId: string): void {
    this.loadingDropdowns.set(true);

    this.templatesApi.list(orgId, wsId).subscribe({
      next: (data) => this.templates.set(data),
      error: () => this.templates.set([]),
    });

    this.rulesetsApi.list(orgId, wsId).subscribe({
      next: (data) => this.ruleSets.set(data),
      error: () => this.ruleSets.set([]),
    });

    this.researchApi.listPersonas(wsId).subscribe({
      next: (data) => this.personas.set(data),
      error: () => this.personas.set([]),
    });

    this.researchApi.listInsights(wsId).subscribe({
      next: (data) => {
        this.insights.set(data);
        this.loadingDropdowns.set(false);
      },
      error: () => {
        this.insights.set([]);
        this.loadingDropdowns.set(false);
      },
    });
  }

  personaName(id: string): string {
    return this.personas().find((p) => p.id === id)?.name ?? id;
  }

  templateName(id: string): string {
    return this.templates().find((t) => t.id === id)?.name ?? id;
  }

  ruleSetName(id: string): string {
    return this.ruleSets().find((r) => r.id === id)?.name ?? id;
  }

  insightNames(ids: string[]): string {
    if (!ids.length) return '';
    return ids.map((id) => this.insights().find((i) => i.id === id)?.title ?? id).join(', ');
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((q) => {
      const copyId = q.get('copyId');
      const name = q.get('name');
      const type = q.get('type');
      const language = q.get('language');
      if (copyId && name && type && language) {
        this.genKind = 'AD_COPY';
        this.copyName = name;
        this.copyArtifactType = type;
        this.copyLanguage = language;
      }
    });
  }

  reviewItems(): { label: string; value: string }[] {
    const items: { label: string; value: string }[] = [];
    if (this.genKind === 'AD_COPY') {
      items.push({ label: 'Name', value: this.copyName });
      items.push({ label: 'Artifact Type', value: this.copyArtifactType });
      items.push({ label: 'Variants', value: String(this.copyNumVariants || 3) });
      items.push({ label: 'Language', value: this.copyLanguage });
      items.push({ label: 'Tone', value: this.copyTone });
      items.push({ label: 'Platform', value: this.copyPlatform });
      items.push({ label: 'Template', value: this.copyTemplateId ? this.templateName(this.copyTemplateId) : '' });
      items.push({ label: 'Rule Set', value: this.copyRuleSetId ? this.ruleSetName(this.copyRuleSetId) : '' });
      items.push({ label: 'Persona', value: this.copyPersonaId ? this.personaName(this.copyPersonaId) : '' });
      items.push({ label: 'Insights', value: this.insightNames(this.copyInsightIds) });
    } else if (this.genKind === 'HOOKS') {
      items.push({ label: 'Topic', value: this.hooksTopic });
      items.push({ label: 'Language', value: this.hooksLanguage });
      items.push({ label: 'Persona', value: this.hooksPersonaId ? this.personaName(this.hooksPersonaId) : '' });
      items.push({ label: 'Insights', value: this.insightNames(this.hooksInsightIds) });
    } else if (this.genKind === 'VIDEO') {
      items.push({ label: 'Product', value: this.videoProduct });
      items.push({ label: 'Platform', value: this.videoPlatform });
      items.push({ label: 'Duration', value: this.videoDuration ? `${this.videoDuration}s` : '' });
      items.push({ label: 'Language', value: this.videoLanguage });
      items.push({ label: 'Offer', value: this.videoOffer });
      items.push({ label: 'Persona', value: this.videoPersonaId ? this.personaName(this.videoPersonaId) : '' });
    } else {
      items.push({ label: 'Product', value: this.ugcProduct });
      items.push({ label: 'Language', value: this.ugcLanguage });
      items.push({ label: 'Deliverables', value: this.ugcDeliverables });
      items.push({ label: 'Tone', value: this.ugcTone });
    }
    return items;
  }

  startNewGeneration(stepper: MatStepper): void {
    stepper.reset();
    this.clearResults();
    this.lastError.set(null);
  }

  step2Valid(): boolean {
    if (this.genKind === 'AD_COPY') {
      return !!this.copyName.trim() && !!this.copyArtifactType.trim() && !!this.copyLanguage.trim();
    }
    if (this.genKind === 'HOOKS') {
      return !!this.hooksTopic.trim() && !!this.hooksLanguage.trim();
    }
    if (this.genKind === 'VIDEO') {
      return !!this.videoProduct.trim() && !!this.videoLanguage.trim() && !!this.videoPlatform;
    }
    return !!this.ugcProduct.trim() && !!this.ugcLanguage.trim();
  }

  private uuidOrUndefined(raw: string): string | undefined {
    const t = raw.trim();
    return t.length ? t : undefined;
  }

  runGenerate(stepper: MatStepper): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws || !this.step2Valid()) return;
    this.generating.set(true);
    this.lastError.set(null);
    this.clearResults();

    if (this.genKind === 'AD_COPY') {
      const body: Record<string, unknown> = {
        name: this.copyName.trim(),
        copyArtifactType: this.copyArtifactType.trim(),
        language: this.copyLanguage.trim(),
        numVariants: this.copyNumVariants || 3,
      };
      const tone = this.copyTone.trim();
      if (tone) body['toneOverride'] = tone;
      const pt = this.copyPlatform.trim();
      if (pt) body['platformType'] = pt;
      const tpl = this.uuidOrUndefined(this.copyTemplateId);
      if (tpl) body['templateId'] = tpl;
      const rs = this.uuidOrUndefined(this.copyRuleSetId);
      if (rs) body['ruleSetId'] = rs;
      const pr = this.uuidOrUndefined(this.copyPersonaId);
      if (pr) body['personaResearchId'] = pr;
      if (this.copyInsightIds.length) body['insightIds'] = this.copyInsightIds.join(',');

      this.aiApi.generateCopy(ws, body).subscribe({
        next: (res: GenerateCopyResponse) => this.applyCopyResult(res, stepper),
        error: (e) => this.failGenerate(e, stepper),
      });
      return;
    }

    if (this.genKind === 'HOOKS') {
      const body: Record<string, unknown> = {
        topic: this.hooksTopic.trim(),
        language: this.hooksLanguage.trim(),
      };
      const pr = this.uuidOrUndefined(this.hooksPersonaId);
      if (pr) body['personaResearchId'] = pr;
      if (this.hooksInsightIds.length) body['insightIds'] = this.hooksInsightIds.join(',');
      this.aiApi.generateHooks(ws, body).subscribe({
        next: (res: GenerateHooksResponse) => this.applyHooksResult(res, stepper),
        error: (e) => this.failGenerate(e, stepper),
      });
      return;
    }

    if (this.genKind === 'VIDEO') {
      const body: Record<string, unknown> = {
        product: this.videoProduct.trim(),
        language: this.videoLanguage.trim(),
        platformType: this.videoPlatform,
      };
      const off = this.videoOffer.trim();
      if (off) body['offer'] = off;
      if (this.videoDuration != null) body['durationSeconds'] = this.videoDuration;
      const pr = this.uuidOrUndefined(this.videoPersonaId);
      if (pr) body['personaResearchId'] = pr;
      this.aiApi.generateVideoScript(ws, body).subscribe({
        next: (res: GenerateVideoScriptResponse) => this.applyVideoResult(res, stepper),
        error: (e) => this.failGenerate(e, stepper),
      });
      return;
    }

    const body: Record<string, unknown> = {
      product: this.ugcProduct.trim(),
      language: this.ugcLanguage.trim(),
    };
    const del = this.ugcDeliverables.trim();
    if (del) body['deliverables'] = del;
    const tone = this.ugcTone.trim();
    if (tone) body['toneOverride'] = tone;
    this.aiApi.generateUgcBrief(ws, body).subscribe({
      next: (res: GenerateUgcBriefResponse) => this.applyUgcResult(res, stepper),
      error: (e) => this.failGenerate(e, stepper),
    });
  }

  private clearResults(): void {
    this.resultRunId.set(null);
    this.resultVariantSetId.set(null);
    this.resultGovernance.set([]);
    this.resultArtifactIds.set([]);
    this.resultSingleArtifactId.set(null);
  }

  private applyCopyResult(res: GenerateCopyResponse, stepper: MatStepper): void {
    this.generating.set(false);
    this.resultRunId.set(res.runId ?? null);
    this.resultVariantSetId.set(res.variantSetId ?? null);
    this.resultGovernance.set(res.governanceStatuses ?? []);
    this.resultArtifactIds.set(res.copyArtifactIds ?? []);
    stepper.next();
  }

  private applyHooksResult(res: GenerateHooksResponse, stepper: MatStepper): void {
    this.generating.set(false);
    this.resultRunId.set(res.runId ?? null);
    this.resultArtifactIds.set(res.artifactIds ?? []);
    stepper.next();
  }

  private applyVideoResult(res: GenerateVideoScriptResponse, stepper: MatStepper): void {
    this.generating.set(false);
    this.resultRunId.set(res.runId ?? null);
    this.resultSingleArtifactId.set(res.copyArtifactId ?? null);
    stepper.next();
  }

  private applyUgcResult(res: GenerateUgcBriefResponse, stepper: MatStepper): void {
    this.generating.set(false);
    this.resultRunId.set(res.runId ?? null);
    this.resultSingleArtifactId.set(res.copyArtifactId ?? null);
    stepper.next();
  }

  private failGenerate(e: unknown, stepper: MatStepper): void {
    this.generating.set(false);
    const msg = (e as { error?: { message?: string } })?.error?.message ?? 'Generation failed';
    this.lastError.set(msg);
    this.notify.error(msg);
    stepper.next();
  }

  goCopyLibrary(): void {
    void this.router.navigate(['/creative/copy']);
  }
}
