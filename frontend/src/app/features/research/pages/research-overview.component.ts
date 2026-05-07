import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import {
  CompetitorResponse,
  InsightResponse,
  JobResponse,
  SnapshotResponse,
} from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';

@Component({
  selector: 'app-research-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">

      <!-- ═══════ Hero header ═══════ -->
      <header class="hero">
        <div class="hero-text">
          <h1>Research & Intelligence</h1>
          <p class="hero-desc">
            Your competitive intelligence hub. Track what competitors do, capture evidence from the web,
            extract structured insights with AI, and connect findings to your campaigns and brand strategy.
          </p>
          <p class="hero-sub">
            Everything you discover here is <strong>evidence-backed</strong> — insights require
            at least one cited source snapshot before they can be published.
          </p>
        </div>
        <div class="hero-badges">
          <span class="badge" matTooltip="Sources are ingested manually — no automated scraping.">
            <mat-icon>shield</mat-icon> Manual ingestion only
          </span>
          <span class="badge" matTooltip="AI can summarize and extract, but every claim must cite a snapshot ID.">
            <mat-icon>auto_awesome</mat-icon> AI-assisted with provenance
          </span>
          <span class="badge" matTooltip="All data is isolated per workspace with full RBAC.">
            <mat-icon>lock</mat-icon> Workspace-scoped
          </span>
        </div>
      </header>

      <!-- ═══════ No workspace selected ═══════ -->
      @if (!workspaceId()) {
        <mat-card class="callout callout-warn">
          <mat-icon class="callout-ico">workspaces</mat-icon>
          <div>
            <strong>No workspace selected</strong>
            <p>Pick a workspace from the sidebar to start using Research & Intelligence.</p>
          </div>
        </mat-card>
      } @else if (loading()) {
        <div class="centered"><mat-spinner diameter="40" /></div>

      <!-- ═══════ First-time user: getting started ═══════ -->
      } @else if (!hasData()) {
        <mat-card class="callout callout-info">
          <mat-icon class="callout-ico">emoji_objects</mat-icon>
          <div>
            <strong>Welcome! Let's set up your research workspace.</strong>
            <p>
              Follow the steps below to build your first competitive intelligence pipeline.
              Each step builds on the previous one — but you can jump to any step at any time.
            </p>
          </div>
        </mat-card>

        <mat-card class="stepper-card">
          <div class="stepper-header">
            <h3>Getting Started Guide</h3>
            <p class="stepper-help">Complete these 5 steps to go from zero to actionable intelligence.</p>
          </div>

          <mat-stepper linear="false" class="gs-stepper">
            <mat-step label="Track competitors" state="business">
              <div class="step-body">
                <h4>Who are you watching?</h4>
                <p>
                  Add the brands, publishers, or advertisers you compete with.
                  You can attach external handles (social profiles, ad library IDs) to each competitor
                  so sources are automatically linked.
                </p>
                <div class="step-example">
                  <mat-icon>tips_and_updates</mat-icon>
                  <span>Example: Add "Acme Corp" with website <em>acme.com</em> and their Facebook page handle.</span>
                </div>
                <a mat-flat-button color="primary" routerLink="/research/competitors">
                  <mat-icon>business</mat-icon> Go to Competitors
                </a>
              </div>
            </mat-step>

            <mat-step label="Capture sources & snapshots" state="source">
              <div class="step-body">
                <h4>Bring in your raw research material</h4>
                <p>
                  Paste a URL, upload a file, or type notes. Each ingestion creates a
                  <strong>Source</strong> (the origin) and a <strong>Snapshot</strong> (a point-in-time capture of content).
                  Snapshots are the evidence foundation for everything that follows.
                </p>
                <div class="step-example">
                  <mat-icon>tips_and_updates</mat-icon>
                  <span>Example: Paste a competitor's pricing page URL with the page text — it becomes a snapshot you can reference later.</span>
                </div>
                <div class="step-btns">
                  <a mat-flat-button color="primary" routerLink="/research/sources">
                    <mat-icon>add_link</mat-icon> Ingest a URL
                  </a>
                  <a mat-stroked-button routerLink="/research/sources"
                    matTooltip="Upload PDFs, CSVs, or other files as research sources">
                    <mat-icon>upload_file</mat-icon> Upload a file
                  </a>
                </div>
              </div>
            </mat-step>

            <mat-step label="Use AI to analyze" state="ai">
              <div class="step-body">
                <h4>Let AI do the heavy lifting</h4>
                <p>
                  Once you have snapshots, use AI to <strong>summarize</strong> them, <strong>extract</strong> competitor
                  offers and pricing, <strong>cluster</strong> keywords by search intent, or <strong>draft</strong> audience personas.
                  Every AI output cites the snapshot(s) it used — no hallucinated claims.
                </p>
                <div class="step-example">
                  <mat-icon>tips_and_updates</mat-icon>
                  <span>Go to any snapshot detail page and click "AI Summarize" to see it in action.</span>
                </div>
                <div class="ai-features">
                  <div class="ai-feat" matTooltip="Extracts key points, entities, and sentiment from snapshot text">
                    <mat-icon>summarize</mat-icon> Summarize snapshots
                  </div>
                  <div class="ai-feat" matTooltip="Finds offers, pricing, and positioning from competitor snapshots">
                    <mat-icon>query_stats</mat-icon> Extract competitor insights
                  </div>
                  <div class="ai-feat" matTooltip="Groups keywords by search intent (informational, commercial, etc.)">
                    <mat-icon>hub</mat-icon> Cluster keywords
                  </div>
                  <div class="ai-feat" matTooltip="Builds audience personas from review/transcript snapshots">
                    <mat-icon>people</mat-icon> Draft personas
                  </div>
                </div>
              </div>
            </mat-step>

            <mat-step label="Create & publish insights" state="insight">
              <div class="step-body">
                <h4>Turn findings into structured intelligence</h4>
                <p>
                  Create <strong>Insights</strong> — structured findings categorized by type (competitor offer, trend, audience pain point, etc.).
                  Each insight starts as a <strong>Draft</strong>. Attach at least one <strong>Evidence</strong> citation
                  (a reference to a snapshot) before publishing.
                </p>
                <div class="step-example">
                  <mat-icon>tips_and_updates</mat-icon>
                  <span>The "Publish" button stays disabled until you add evidence — this enforces provenance.</span>
                </div>
                <a mat-flat-button color="primary" routerLink="/research/insights">
                  <mat-icon>lightbulb</mat-icon> Go to Insights
                </a>
              </div>
            </mat-step>

            <mat-step label="Automate & connect" state="connect">
              <div class="step-body">
                <h4>Keep research flowing into your workflow</h4>
                <p>
                  Set up <strong>Watchlists</strong> to group what you monitor, run <strong>Weekly Digests</strong>
                  for AI-powered summaries of recent activity, and create <strong>Cross-Module Links</strong>
                  to connect insights to campaigns, templates, and rulesets.
                </p>
                <div class="step-btns">
                  <a mat-stroked-button routerLink="/research/watchlists"
                    matTooltip="Create named lists to organize what you're monitoring">
                    <mat-icon>visibility</mat-icon> Watchlists
                  </a>
                  <a mat-stroked-button routerLink="/research/digests"
                    matTooltip="AI-generated weekly summaries of new snapshots and insights">
                    <mat-icon>summarize</mat-icon> Digests
                  </a>
                  <a mat-stroked-button routerLink="/research/links"
                    matTooltip="Link insights to campaigns, governance templates, and rulesets">
                    <mat-icon>link</mat-icon> Cross-Module Links
                  </a>
                  <a mat-stroked-button routerLink="/research/personas"
                    matTooltip="Audience research backed by real data">
                    <mat-icon>people</mat-icon> Personas
                  </a>
                  <a mat-stroked-button routerLink="/research/keyword-clusters"
                    matTooltip="Keywords grouped by intent and topic">
                    <mat-icon>hub</mat-icon> Keywords
                  </a>
                </div>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card>

        <!-- How it works diagram -->
        <mat-card class="flow-card">
          <h3>How it works</h3>
          <p class="flow-desc">The research pipeline turns raw material into actionable intelligence:</p>
          <div class="flow-diagram">
            <div class="flow-step">
              <div class="flow-circle"><mat-icon>add_link</mat-icon></div>
              <strong>Source</strong>
              <span>URL, file, or note</span>
            </div>
            <mat-icon class="flow-arrow">arrow_forward</mat-icon>
            <div class="flow-step">
              <div class="flow-circle"><mat-icon>photo_camera</mat-icon></div>
              <strong>Snapshot</strong>
              <span>Point-in-time capture</span>
            </div>
            <mat-icon class="flow-arrow">arrow_forward</mat-icon>
            <div class="flow-step">
              <div class="flow-circle"><mat-icon>auto_awesome</mat-icon></div>
              <strong>AI Analysis</strong>
              <span>Summarize & extract</span>
            </div>
            <mat-icon class="flow-arrow">arrow_forward</mat-icon>
            <div class="flow-step">
              <div class="flow-circle"><mat-icon>lightbulb</mat-icon></div>
              <strong>Insight</strong>
              <span>Evidence-backed finding</span>
            </div>
            <mat-icon class="flow-arrow">arrow_forward</mat-icon>
            <div class="flow-step">
              <div class="flow-circle"><mat-icon>campaign</mat-icon></div>
              <strong>Action</strong>
              <span>Campaigns & strategy</span>
            </div>
          </div>
        </mat-card>

      <!-- ═══════ Has data: dashboard ═══════ -->
      } @else {

        <!-- Draft insights needing evidence banner -->
        @if (draftWithoutEvidence() > 0) {
          <mat-card class="callout callout-action">
            <mat-icon class="callout-ico">pending_actions</mat-icon>
            <div>
              <strong>{{ draftWithoutEvidence() }} draft insight{{ draftWithoutEvidence() > 1 ? 's need' : ' needs' }} evidence</strong>
              <p>
                Add at least one evidence citation to each draft before it can be published.
                <a routerLink="/research/insights" [queryParams]="{ status: 'DRAFT' }">Review drafts</a>
              </p>
            </div>
          </mat-card>
        }

        <!-- Stats row -->
        <div class="stat-grid">
          <mat-card class="stat-card" matTooltip="Brands, publishers, or advertisers you're tracking">
            <mat-icon class="stat-ico">business</mat-icon>
            <div class="stat-val">{{ competitorCount() }}</div>
            <div class="stat-label">Competitors</div>
            <a routerLink="/research/competitors" class="stat-link">Manage competitors</a>
          </mat-card>
          <mat-card class="stat-card" matTooltip="URLs, files, and notes ingested as research material">
            <mat-icon class="stat-ico">add_link</mat-icon>
            <div class="stat-val">{{ sourceCount() }}</div>
            <div class="stat-label">Sources</div>
            <a routerLink="/research/sources" class="stat-link">Browse sources</a>
          </mat-card>
          <mat-card class="stat-card" matTooltip="Point-in-time captures of source content used as evidence">
            <mat-icon class="stat-ico">photo_camera</mat-icon>
            <div class="stat-val">{{ snapshotCount() }}</div>
            <div class="stat-label">Snapshots</div>
            <a routerLink="/research/jobs" class="stat-link">View jobs</a>
          </mat-card>
          <mat-card class="stat-card" matTooltip="Structured findings with evidence and confidence levels">
            <mat-icon class="stat-ico">lightbulb</mat-icon>
            <div class="stat-val">{{ insightCount() }}</div>
            <div class="stat-label">Insights</div>
            <div class="stat-breakdown">
              <span class="breakdown-item draft">{{ draftInsightCount() }} draft</span>
              <span class="breakdown-item published">{{ publishedInsightCount() }} published</span>
            </div>
            <a routerLink="/research/insights" class="stat-link">View insights</a>
          </mat-card>
        </div>

        <!-- Quick actions with descriptions -->
        <mat-card class="section-card">
          <h3>
            <mat-icon class="sec-ico">bolt</mat-icon>
            Quick Actions
          </h3>
          <p class="sec-desc">Common tasks to keep your research moving.</p>
          <div class="action-grid">
            <a routerLink="/research/competitors" class="action-tile"
              matTooltip="Add a new brand or publisher to track">
              <mat-icon>add_business</mat-icon>
              <div>
                <strong>Add competitor</strong>
                <span>Track a new brand</span>
              </div>
            </a>
            <a routerLink="/research/sources" class="action-tile"
              matTooltip="Ingest a URL or upload a file as a research source">
              <mat-icon>add_link</mat-icon>
              <div>
                <strong>Ingest source</strong>
                <span>Capture a URL or file</span>
              </div>
            </a>
            <a routerLink="/research/insights" class="action-tile"
              matTooltip="Create a structured finding backed by evidence">
              <mat-icon>add_circle_outline</mat-icon>
              <div>
                <strong>Create insight</strong>
                <span>Draft a new finding</span>
              </div>
            </a>
            <a routerLink="/research/keyword-clusters" class="action-tile"
              matTooltip="Import keywords and cluster them by search intent using AI">
              <mat-icon>hub</mat-icon>
              <div>
                <strong>Cluster keywords</strong>
                <span>Group by intent with AI</span>
              </div>
            </a>
            <a routerLink="/research/personas" class="action-tile"
              matTooltip="Build audience personas from reviews, transcripts, and surveys">
              <mat-icon>people</mat-icon>
              <div>
                <strong>Draft persona</strong>
                <span>Build from evidence</span>
              </div>
            </a>
            <a routerLink="/research/digests" class="action-tile"
              matTooltip="Generate an AI-written weekly summary of all research activity">
              <mat-icon>summarize</mat-icon>
              <div>
                <strong>Weekly digest</strong>
                <span>AI activity summary</span>
              </div>
            </a>
          </div>
        </mat-card>

        <!-- Recent activity -->
        <mat-card class="section-card">
          <h3>
            <mat-icon class="sec-ico">update</mat-icon>
            Recent Activity
          </h3>
          <p class="sec-desc">The latest snapshots and insights in this workspace.</p>
          @if (!recentSnapshots().length && !recentInsights().length) {
            <p class="muted-block">
              No recent activity. Start by
              <a routerLink="/research/sources">ingesting a source</a>.
            </p>
          } @else {
            <ul class="activity-list">
              @for (s of recentSnapshots(); track s.id) {
                <li>
                  <mat-icon class="li-ico snapshot-ico"
                    matTooltip="Snapshot captured {{ s.capturedAt | date: 'medium' }}">
                    photo_camera
                  </mat-icon>
                  <div class="li-content">
                    <a [routerLink]="['/research/snapshots', s.id]" class="li-title">
                      {{ s.title || 'Untitled snapshot' }}
                    </a>
                    <span class="li-meta">
                      {{ s.snapshotType }} · {{ s.capturedAt | date: 'mediumDate' }}
                      @if (s.summaryText) {
                        · <span class="li-badge summarized">Summarized</span>
                      }
                    </span>
                  </div>
                </li>
              }
              @for (i of recentInsights(); track i.id) {
                <li>
                  <mat-icon class="li-ico insight-ico"
                    [matTooltip]="i.status + ' · ' + i.confidence + ' confidence'">
                    lightbulb
                  </mat-icon>
                  <div class="li-content">
                    <a [routerLink]="['/research/insights', i.id]" class="li-title">{{ i.title }}</a>
                    <span class="li-meta">
                      {{ i.category }} · {{ i.insightType }}
                      · <span class="li-badge" [class.draft]="i.status === 'DRAFT'"
                          [class.published]="i.status === 'PUBLISHED'">{{ i.status }}</span>
                      · {{ i.evidenceCount }} evidence
                    </span>
                  </div>
                </li>
              }
            </ul>
          }
        </mat-card>

        <!-- Module map -->
        <mat-card class="section-card module-map">
          <h3>
            <mat-icon class="sec-ico">map</mat-icon>
            Research Module Map
          </h3>
          <p class="sec-desc">All the tools available in this module and what they do.</p>
          <div class="map-grid">
            <a routerLink="/research/competitors" class="map-item">
              <mat-icon>business</mat-icon>
              <strong>Competitors</strong>
              <span>Track brands, attach social handles, and link sources</span>
            </a>
            <a routerLink="/research/sources" class="map-item">
              <mat-icon>add_link</mat-icon>
              <strong>Sources</strong>
              <span>URLs, files, and notes that form your evidence base</span>
            </a>
            <a routerLink="/research/insights" class="map-item">
              <mat-icon>lightbulb</mat-icon>
              <strong>Insights</strong>
              <span>Structured findings with type, confidence, and evidence</span>
            </a>
            <a routerLink="/research/keyword-clusters" class="map-item">
              <mat-icon>hub</mat-icon>
              <strong>Keywords</strong>
              <span>Keyword groups clustered by search intent</span>
            </a>
            <a routerLink="/research/personas" class="map-item">
              <mat-icon>people</mat-icon>
              <strong>Personas</strong>
              <span>Audience pains, motivations, and objections</span>
            </a>
            <a routerLink="/research/watchlists" class="map-item">
              <mat-icon>visibility</mat-icon>
              <strong>Watchlists</strong>
              <span>Named monitoring lists for competitors and topics</span>
            </a>
            <a routerLink="/research/jobs" class="map-item">
              <mat-icon>work_history</mat-icon>
              <strong>Jobs</strong>
              <span>Track ingestion, AI, and refresh operations</span>
            </a>
            <a routerLink="/research/links" class="map-item">
              <mat-icon>link</mat-icon>
              <strong>Cross-Module Links</strong>
              <span>Connect insights to campaigns, templates, and rulesets</span>
            </a>
            <a routerLink="/research/digests" class="map-item">
              <mat-icon>summarize</mat-icon>
              <strong>Digests</strong>
              <span>AI-powered weekly reports of research activity</span>
            </a>
          </div>
        </mat-card>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 16px 20px 48px; max-width: 1100px; margin: 0 auto; }

    /* ── Hero ── */
    .hero { margin-bottom: 24px; }
    .hero h1 { margin: 0 0 8px; font-size: 26px; font-weight: 600; color: #1a1a2e; }
    .hero-desc { margin: 0 0 6px; color: #424242; font-size: 15px; line-height: 1.6; max-width: 750px; }
    .hero-sub { margin: 0 0 14px; color: #616161; font-size: 13px; line-height: 1.5; max-width: 700px; }
    .hero-badges { display: flex; flex-wrap: wrap; gap: 10px; }
    .badge {
      display: inline-flex; align-items: center; gap: 5px;
      background: #e8eaf6; color: #283593; border-radius: 16px;
      padding: 4px 12px; font-size: 12px; font-weight: 500; cursor: default;
    }
    .badge mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* ── Callouts ── */
    .callout {
      display: flex; align-items: flex-start; gap: 16px;
      padding: 16px 20px !important; margin-bottom: 20px; border-left: 4px solid;
    }
    .callout p { margin: 4px 0 0; font-size: 13px; color: #555; }
    .callout p a { color: #1976d2; }
    .callout-ico { margin-top: 2px; flex-shrink: 0; }
    .callout-warn { border-color: #ffa726; background: #fff8e1; }
    .callout-warn .callout-ico { color: #f57c00; }
    .callout-info { border-color: #42a5f5; background: #e3f2fd; }
    .callout-info .callout-ico { color: #1565c0; }
    .callout-action { border-color: #ff7043; background: #fff3e0; }
    .callout-action .callout-ico { color: #e64a19; }
    .centered { display: flex; justify-content: center; padding: 48px; }

    /* ── Stepper ── */
    .stepper-card { padding: 20px 24px 24px; margin-bottom: 20px; }
    .stepper-header h3 { margin: 0 0 4px; font-size: 18px; font-weight: 500; }
    .stepper-help { margin: 0 0 16px; color: #666; font-size: 13px; }
    .gs-stepper { background: transparent; }
    .step-body h4 { margin: 0 0 6px; font-size: 15px; font-weight: 500; }
    .step-body p { margin: 0 0 12px; font-size: 13px; color: #555; line-height: 1.55; max-width: 620px; }
    .step-example {
      display: flex; align-items: flex-start; gap: 8px;
      background: #fffde7; border-radius: 8px; padding: 10px 14px;
      margin-bottom: 14px; font-size: 12px; color: #5d4037;
    }
    .step-example mat-icon { font-size: 18px; width: 18px; height: 18px; color: #f9a825; flex-shrink: 0; margin-top: 1px; }
    .step-btns { display: flex; flex-wrap: wrap; gap: 8px; }

    /* ── AI features grid in stepper ── */
    .ai-features { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 8px; }
    .ai-feat {
      display: flex; align-items: center; gap: 8px;
      background: #f3e5f5; border-radius: 8px; padding: 10px 14px;
      font-size: 13px; font-weight: 500; color: #6a1b9a; cursor: default;
    }
    .ai-feat mat-icon { font-size: 20px; width: 20px; height: 20px; }

    /* ── Flow diagram ── */
    .flow-card { padding: 20px 24px; margin-bottom: 20px; }
    .flow-card h3 { margin: 0 0 4px; font-size: 16px; font-weight: 500; }
    .flow-desc { margin: 0 0 16px; color: #666; font-size: 13px; }
    .flow-diagram { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; justify-content: center; }
    .flow-step { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 100px; }
    .flow-circle {
      width: 48px; height: 48px; border-radius: 50%;
      background: #e3f2fd; display: flex; align-items: center; justify-content: center;
    }
    .flow-circle mat-icon { color: #1565c0; }
    .flow-step strong { font-size: 13px; }
    .flow-step span { font-size: 11px; color: #888; text-align: center; }
    .flow-arrow { color: #bdbdbd; font-size: 22px; width: 22px; height: 22px; }

    /* ── Stats ── */
    .stat-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px; margin-bottom: 24px;
    }
    .stat-card { padding: 20px 16px; text-align: center; cursor: default; }
    .stat-ico { font-size: 32px; width: 32px; height: 32px; color: #1976d2; margin-bottom: 8px; }
    .stat-val { font-size: 30px; font-weight: 600; }
    .stat-label { color: #757575; font-size: 13px; margin-bottom: 4px; }
    .stat-breakdown { display: flex; justify-content: center; gap: 10px; margin-bottom: 6px; }
    .breakdown-item { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
    .breakdown-item.draft { background: #fff3e0; color: #e65100; }
    .breakdown-item.published { background: #e8f5e9; color: #2e7d32; }
    .stat-link { font-size: 13px; color: #1976d2; text-decoration: none; }
    .stat-link:hover { text-decoration: underline; }

    /* ── Section cards ── */
    .section-card { padding: 20px 24px; margin-bottom: 20px; }
    .section-card h3 { margin: 0 0 4px; font-size: 16px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
    .sec-ico { font-size: 20px; width: 20px; height: 20px; color: #1976d2; }
    .sec-desc { margin: 0 0 16px; color: #666; font-size: 13px; }

    /* ── Action grid ── */
    .action-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
    .action-tile {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 16px; border-radius: 10px; border: 1px solid #e0e0e0;
      text-decoration: none; color: inherit; transition: all 150ms;
    }
    .action-tile:hover { background: #f5f5f5; border-color: #bdbdbd; }
    .action-tile mat-icon { font-size: 26px; width: 26px; height: 26px; color: #1976d2; flex-shrink: 0; }
    .action-tile strong { display: block; font-size: 14px; margin-bottom: 2px; }
    .action-tile span { font-size: 12px; color: #888; }

    /* ── Activity list ── */
    .activity-list { list-style: none; margin: 0; padding: 0; }
    .activity-list li {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 12px 0; border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    .activity-list li:last-child { border-bottom: none; }
    .li-ico { font-size: 22px; width: 22px; height: 22px; margin-top: 2px; flex-shrink: 0; }
    .snapshot-ico { color: #0288d1; }
    .insight-ico { color: #f9a825; }
    .li-content { flex: 1; min-width: 0; }
    .li-title { font-size: 14px; font-weight: 500; color: #1a1a2e; text-decoration: none; display: block; }
    .li-title:hover { color: #1976d2; }
    .li-meta { font-size: 12px; color: #9e9e9e; display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .li-badge { font-size: 10px; padding: 1px 6px; border-radius: 8px; font-weight: 600; text-transform: uppercase; }
    .li-badge.draft { background: #fff3e0; color: #e65100; }
    .li-badge.published { background: #e8f5e9; color: #2e7d32; }
    .li-badge.summarized { background: #ede7f6; color: #4a148c; }
    .muted-block { color: #757575; font-size: 13px; }
    .muted-block a { color: #1976d2; }

    /* ── Module map ── */
    .map-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
    .map-item {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 14px 16px; border-radius: 10px; border: 1px solid #e0e0e0;
      text-decoration: none; color: inherit; transition: all 150ms;
    }
    .map-item:hover { background: #f5f5f5; border-color: #bdbdbd; }
    .map-item mat-icon { font-size: 24px; width: 24px; height: 24px; color: #546e7a; flex-shrink: 0; margin-top: 2px; }
    .map-item strong { display: block; font-size: 13px; margin-bottom: 2px; }
    .map-item span { font-size: 12px; color: #888; line-height: 1.4; }
  `],
})
export class ResearchOverviewComponent implements OnInit {
  private readonly api = inject(ResearchApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly loading = signal(false);
  readonly competitorCount = signal(0);
  readonly sourceCount = signal(0);
  readonly snapshotCount = signal(0);
  readonly insightCount = signal(0);
  readonly draftInsightCount = signal(0);
  readonly publishedInsightCount = signal(0);
  readonly draftWithoutEvidence = signal(0);
  readonly recentSnapshots = signal<SnapshotResponse[]>([]);
  readonly recentInsights = signal<InsightResponse[]>([]);

  readonly hasData = computed(
    () =>
      this.competitorCount() > 0 ||
      this.sourceCount() > 0 ||
      this.snapshotCount() > 0 ||
      this.insightCount() > 0
  );

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    const ws = this.workspaceId();
    if (!ws) {
      this.competitorCount.set(0);
      this.sourceCount.set(0);
      this.snapshotCount.set(0);
      this.insightCount.set(0);
      this.draftInsightCount.set(0);
      this.publishedInsightCount.set(0);
      this.draftWithoutEvidence.set(0);
      this.recentSnapshots.set([]);
      this.recentInsights.set([]);
      return;
    }
    this.loading.set(true);
    forkJoin({
      competitors: this.api.listCompetitors(ws),
      sources: this.api.listSources(ws),
      snapshots: this.api.listSnapshots(ws),
      insights: this.api.listInsights(ws),
    }).subscribe({
      next: ({ competitors, sources, snapshots, insights }) => {
        this.competitorCount.set(competitors.length);
        this.sourceCount.set(sources.length);
        this.snapshotCount.set(snapshots.length);
        this.insightCount.set(insights.length);

        const drafts = insights.filter(i => i.status === 'DRAFT');
        const published = insights.filter(i => i.status === 'PUBLISHED');
        this.draftInsightCount.set(drafts.length);
        this.publishedInsightCount.set(published.length);
        this.draftWithoutEvidence.set(drafts.filter(d => d.evidenceCount === 0).length);

        const snapSorted = [...snapshots].sort(
          (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
        );
        this.recentSnapshots.set(snapSorted.slice(0, 5));
        const insSorted = [...insights].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        this.recentInsights.set(insSorted.slice(0, 5));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.notify.error('Could not load research overview.');
      },
    });
  }
}
