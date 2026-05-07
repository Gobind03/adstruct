import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-research-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty-state">
      <mat-icon class="empty-icon" aria-hidden="true">{{ icon() }}</mat-icon>
      <h3>{{ title() }}</h3>
      <p>{{ description() }}</p>
      @if (actionLabel()) {
        <button mat-raised-button color="primary" type="button" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
      @if (secondaryLabel()) {
        <p class="secondary-hint">{{ secondaryLabel() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .empty-state {
        text-align: center;
        padding: 64px 24px;
      }
      .empty-icon {
        font-size: 64px;
        width: 64px;
        height: 64px;
        color: #bdbdbd;
        margin-bottom: 16px;
      }
      h3 {
        margin: 0 0 8px;
        color: #424242;
        font-size: 20px;
      }
      p {
        color: #757575;
        margin: 0 0 24px;
        max-width: 480px;
        margin-left: auto;
        margin-right: auto;
      }
      .secondary-hint {
        font-size: 13px;
        color: #9e9e9e;
        margin-top: 12px;
      }
    `,
  ],
})
export class ResearchEmptyStateComponent {
  readonly icon = input<string>('search');
  readonly title = input<string>('No data yet');
  readonly description = input<string>('');
  readonly actionLabel = input<string | null>(null);
  readonly secondaryLabel = input<string | null>(null);
  readonly action = output<void>();
}
