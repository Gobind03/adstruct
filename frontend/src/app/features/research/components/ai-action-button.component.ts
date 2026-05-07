import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-ai-action-button',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      mat-stroked-button
      color="accent"
      type="button"
      class="ai-btn"
      [disabled]="disabled()"
      [matTooltip]="tooltip() || ''"
      matTooltipShowDelay="200"
      (click)="clicked.emit()"
    >
      <mat-icon aria-hidden="true">auto_awesome</mat-icon>
      {{ label() }}
    </button>
  `,
  styles: [
    `
      .ai-btn mat-icon {
        margin-right: 6px;
        font-size: 18px;
        width: 18px;
        height: 18px;
        vertical-align: middle;
      }
    `,
  ],
})
export class AiActionButtonComponent {
  readonly label = input<string>('');
  readonly tooltip = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly clicked = output<void>();
}
