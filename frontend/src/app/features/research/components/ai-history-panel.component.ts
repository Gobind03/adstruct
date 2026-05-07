import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ResearchAiRunLinkResponse } from '../models/research.models';

@Component({
  selector: 'app-ai-history-panel',
  standalone: true,
  imports: [CommonModule, RouterLink, MatExpansionModule, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-accordion class="ai-history-acc" [multi]="false">
      <mat-expansion-panel [expanded]="expanded()">
        <mat-expansion-panel-header>
          <mat-panel-title>
            <mat-icon class="panel-ico" aria-hidden="true">history</mat-icon>
            AI runs
            <span class="count">({{ aiLinks().length }})</span>
          </mat-panel-title>
        </mat-expansion-panel-header>

        @if (aiLinks().length === 0) {
          <p class="empty">No AI runs linked to this entity yet.</p>
        } @else {
          <ul class="run-list">
            @for (link of aiLinks(); track link.id) {
              <li class="run-row">
                <div class="run-meta">
                  <span class="ts">{{ link.createdAt | date: 'medium' }}</span>
                  <span class="etype">{{ link.producedEntityType }}</span>
                  <span class="snap-count">{{ link.snapshotIds.length }} snapshot(s)</span>
                </div>
                <a
                  mat-stroked-button
                  color="primary"
                  routerLink="/ai/prompts"
                  [queryParams]="promptsQueryParams(link)"
                >
                  AI prompts
                  <mat-icon iconPositionEnd aria-hidden="true">chevron_right</mat-icon>
                </a>
              </li>
            }
          </ul>
        }
      </mat-expansion-panel>
    </mat-accordion>
  `,
  styles: [
    `
      .ai-history-acc {
        display: block;
      }
      .panel-ico {
        margin-right: 8px;
        vertical-align: middle;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }
      .count {
        margin-left: 4px;
        font-weight: 400;
        color: #666;
        font-size: 14px;
      }
      .empty {
        margin: 0;
        color: #757575;
        font-size: 14px;
      }
      .run-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .run-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 0;
        border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      }
      .run-row:last-child {
        border-bottom: none;
      }
      .run-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
        font-size: 13px;
        color: #424242;
      }
      .ts {
        color: #616161;
      }
      .etype {
        font-weight: 600;
        text-transform: capitalize;
      }
      .snap-count {
        color: #757575;
      }
    `,
  ],
})
export class AiHistoryPanelComponent {
  readonly aiLinks = input<ResearchAiRunLinkResponse[]>([]);
  /** When true, panel starts expanded. */
  readonly expanded = input<boolean>(false);

  promptsQueryParams(link: ResearchAiRunLinkResponse): Record<string, string> | null {
    if (!link.aiPromptRunId) {
      return null;
    }
    return { runId: link.aiPromptRunId };
  }
}
