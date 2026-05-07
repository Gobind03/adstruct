import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AdminStore } from '@core/store/admin.store';
import { NotificationService } from '@core/services/notification.service';
import { AiHistoryPanelComponent } from '../components/ai-history-panel.component';
import { ResearchBreadcrumbComponent, BreadcrumbItem } from '../components/research-breadcrumb.component';
import { DigestReportResponse, ResearchAiRunLinkResponse } from '../models/research.models';
import { ResearchApiService } from '../services/research-api.service';
import { ResearchAiApiService } from '../services/research-ai-api.service';

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

@Component({
  selector: 'app-digest-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    AiHistoryPanelComponent,
    ResearchBreadcrumbComponent,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!workspaceId()) {
      <mat-card class="hint-card">
        <mat-icon>workspaces</mat-icon>
        <p>Select a workspace.</p>
      </mat-card>
    } @else if (loading()) {
      <div class="centered"><mat-spinner diameter="40" /></div>
    } @else if (!digest()) {
      <mat-card class="hint-card"><p>Digest not found.</p></mat-card>
    } @else {
      <app-research-breadcrumb [items]="breadcrumbItems()" />

      <header class="head">
        <h1>{{ digest()!.title }}</h1>
        <p class="period">
          {{ digest()!.periodStart | date: 'mediumDate' }} — {{ digest()!.periodEnd | date: 'mediumDate' }}
        </p>
      </header>

      <mat-card class="narrative-card">
        <mat-card-content>
          <pre class="narrative">{{ digest()!.contentText }}</pre>
        </mat-card-content>
      </mat-card>

      @if (structured().hasAny) {
        <div class="structured-sections">
          @if (structured().highlights.length) {
            <section class="sec sec-highlights">
              <h2>Highlights</h2>
              <ul>
                @for (item of structured().highlights; track $index) {
                  <li>{{ item }}</li>
                }
              </ul>
            </section>
          }
          @if (structured().risks.length) {
            <section class="sec sec-risks">
              <h2>Risks</h2>
              <ul>
                @for (item of structured().risks; track $index) {
                  <li>{{ item }}</li>
                }
              </ul>
            </section>
          }
          @if (structured().opportunities.length) {
            <section class="sec sec-opps">
              <h2>Opportunities</h2>
              <ul>
                @for (item of structured().opportunities; track $index) {
                  <li>{{ item }}</li>
                }
              </ul>
            </section>
          }
          @if (structured().recommendedActions.length) {
            <section class="sec sec-actions">
              <h2>Recommended actions</h2>
              <ul>
                @for (item of structured().recommendedActions; track $index) {
                  <li>{{ item }}</li>
                }
              </ul>
            </section>
          }
        </div>
      }

      <mat-card class="ai-meta-card">
        <mat-card-header>
          <mat-card-title>AI run</mat-card-title>
          <mat-card-subtitle>Details from the digest generation run</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="kv">
            <span class="k">Prompt run ID</span>
            <span class="v">{{ digest()!.aiPromptRunId || '—' }}</span>
          </div>
          @if (digest()!.aiPromptRunId) {
            <a mat-stroked-button color="primary" [routerLink]="['/ai/prompts']" [queryParams]="{ runId: digest()!.aiPromptRunId }">
              <mat-icon>psychology</mat-icon>
              Open in AI prompts
            </a>
          }
        </mat-card-content>
      </mat-card>

      <app-ai-history-panel [aiLinks]="aiLinks()" [expanded]="true" />
    }
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 16px 20px 48px;
        max-width: 880px;
        margin: 0 auto;
      }
      .hint-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 20px 24px !important;
      }
      .centered {
        display: flex;
        justify-content: center;
        padding: 48px;
      }
      .head {
        margin-bottom: 20px;
      }
      h1 {
        margin: 0 0 4px;
        font-size: 1.5rem;
        font-weight: 600;
      }
      .period {
        margin: 0;
        color: #616161;
        font-size: 14px;
      }
      .narrative-card {
        margin-bottom: 20px;
      }
      .narrative {
        margin: 0;
        white-space: pre-wrap;
        font-family: inherit;
        font-size: 14px;
        line-height: 1.6;
        color: #212121;
      }
      .structured-sections {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 24px;
      }
      .sec {
        padding: 12px 16px 12px 20px;
        border-radius: 4px;
        background: #fafafa;
      }
      .sec h2 {
        margin: 0 0 8px;
        font-size: 15px;
        font-weight: 600;
      }
      .sec ul {
        margin: 0;
        padding-left: 18px;
      }
      .sec li {
        margin-bottom: 4px;
        font-size: 14px;
        line-height: 1.5;
      }
      .sec-highlights {
        border-left: 4px solid #2e7d32;
      }
      .sec-risks {
        border-left: 4px solid #c62828;
      }
      .sec-opps {
        border-left: 4px solid #1565c0;
      }
      .sec-actions {
        border-left: 4px solid #f9a825;
      }
      .ai-meta-card {
        margin-bottom: 16px;
      }
      .ai-meta-card .kv {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
        align-items: center;
      }
      .ai-meta-card .k {
        font-size: 12px;
        text-transform: uppercase;
        color: #757575;
        font-weight: 600;
      }
      .ai-meta-card .v {
        font-family: ui-monospace, monospace;
        font-size: 13px;
      }
    `,
  ],
})
export class DigestDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ResearchApiService);
  private readonly aiApi = inject(ResearchAiApiService);
  private readonly adminStore = inject(AdminStore);
  private readonly notify = inject(NotificationService);

  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly digestId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('digestId'))),
    { initialValue: this.route.snapshot.paramMap.get('digestId') },
  );

  readonly digest = signal<DigestReportResponse | null>(null);
  readonly aiLinks = signal<ResearchAiRunLinkResponse[]>([]);
  readonly loading = signal(true);

  constructor() {
    effect(() => {
      const ws = this.workspaceId();
      const id = this.digestId();
      if (!ws || !id) {
        untracked(() => {
          this.digest.set(null);
          this.aiLinks.set([]);
          this.loading.set(false);
        });
        return;
      }
      untracked(() => this.fetchDigest(ws, id));
    }, { allowSignalWrites: true });
  }

  readonly structured = computed(() => {
    const d = this.digest();
    const j = d?.contentJson;
    if (!j || typeof j !== 'object') {
      return {
        hasAny: false,
        highlights: [] as string[],
        risks: [] as string[],
        opportunities: [] as string[],
        recommendedActions: [] as string[],
      };
    }
    const highlights = asStringArray(j['highlights']);
    const risks = asStringArray(j['risks']);
    const opportunities = asStringArray(j['opportunities']);
    const recommendedActions = asStringArray(j['recommendedActions']);
    const hasAny =
      highlights.length + risks.length + opportunities.length + recommendedActions.length > 0;
    return { hasAny, highlights, risks, opportunities, recommendedActions };
  });

  readonly breadcrumbItems = computed((): BreadcrumbItem[] => {
    const d = this.digest();
    const title = d?.title ?? 'Digest';
    return [
      { label: 'Research', route: '/research' },
      { label: 'Digests', route: '/research/digests' },
      { label: title },
    ];
  });

  private fetchDigest(ws: string, id: string): void {
    this.loading.set(true);
    this.api.getDigest(ws, id).subscribe({
      next: (d) => {
        this.digest.set(d);
        this.loading.set(false);
      },
      error: () => {
        this.digest.set(null);
        this.loading.set(false);
        this.notify.error('Could not load digest.');
      },
    });
    this.aiApi
      .listAiLinks(ws, { producedEntityType: 'DIGEST_REPORT', producedEntityId: id })
      .subscribe({
        next: (links) => this.aiLinks.set(links),
        error: () => this.aiLinks.set([]),
      });
  }
}
