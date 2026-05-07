import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-research-section-header',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="section-header">
      <div class="section-info">
        <h2>{{ title() }}</h2>
        <p class="section-desc">{{ description() }}</p>
        @if (learnMoreUrl()) {
          <a [href]="learnMoreUrl()!" target="_blank" rel="noopener noreferrer" class="learn-more">
            Learn more <mat-icon class="learn-icon" aria-hidden="true">open_in_new</mat-icon>
          </a>
        }
      </div>
      <div class="section-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 24px;
      }
      .section-info {
        flex: 1;
        min-width: 0;
      }
      h2 {
        margin: 0 0 4px;
        font-size: 22px;
        font-weight: 500;
      }
      .section-desc {
        color: #666;
        margin: 0 0 4px;
        font-size: 14px;
        max-width: 600px;
      }
      .learn-more {
        font-size: 12px;
        color: #1976d2;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 2px;
      }
      .learn-more:hover {
        text-decoration: underline;
      }
      .learn-icon {
        font-size: 14px;
        width: 14px;
        height: 14px;
      }
      .section-actions {
        display: flex;
        gap: 8px;
        align-items: center;
        flex-shrink: 0;
      }
    `,
  ],
})
export class ResearchSectionHeaderComponent {
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly learnMoreUrl = input<string | null>(null);
}
