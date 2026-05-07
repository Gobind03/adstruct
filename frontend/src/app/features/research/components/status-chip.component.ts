import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';

export type StatusChipKind = 'insight' | 'job' | 'confidence' | 'sentiment';

type ChipVisual = {
  color: 'primary' | 'accent' | 'warn' | undefined;
  tooltip: string;
  /** Custom palette class when `type` is `job` (Material chip colors are limited). */
  jobClass?: string;
};

function normalize(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, '_');
}

function insightVisual(status: string): ChipVisual {
  switch (normalize(status)) {
    case 'DRAFT':
      return { color: undefined, tooltip: 'Insight is in draft and not published.' };
    case 'PUBLISHED':
      return { color: 'primary', tooltip: 'Insight is published and visible.' };
    case 'ARCHIVED':
      return { color: undefined, tooltip: 'Insight is archived.' };
    default:
      return { color: undefined, tooltip: `Insight status: ${status}` };
  }
}

function jobVisual(status: string): ChipVisual {
  switch (normalize(status)) {
    case 'PENDING':
    case 'QUEUED':
      return {
        color: undefined,
        jobClass: 'job-chip-queued',
        tooltip: 'Job is queued and will run shortly.',
      };
    case 'RUNNING':
    case 'IN_PROGRESS':
      return {
        color: undefined,
        jobClass: 'job-chip-running',
        tooltip: 'Job is currently running.',
      };
    case 'COMPLETED':
    case 'SUCCEEDED':
    case 'DONE':
    case 'SUCCESS':
      return {
        color: undefined,
        jobClass: 'job-chip-success',
        tooltip: 'Job finished successfully.',
      };
    case 'FAILED':
    case 'ERROR':
      return {
        color: undefined,
        jobClass: 'job-chip-failed',
        tooltip: 'Job failed. See details for more information.',
      };
    case 'CANCELLED':
    case 'CANCELED':
      return { color: undefined, tooltip: 'Job was cancelled.' };
    default:
      return { color: undefined, tooltip: `Job status: ${status}` };
  }
}

function confidenceVisual(status: string): ChipVisual {
  switch (normalize(status)) {
    case 'HIGH':
      return { color: 'primary', tooltip: 'High confidence in this assessment.' };
    case 'MEDIUM':
      return { color: 'accent', tooltip: 'Medium confidence in this assessment.' };
    case 'LOW':
      return { color: 'warn', tooltip: 'Low confidence — verify with additional sources.' };
    default:
      return { color: undefined, tooltip: `Confidence: ${status}` };
  }
}

function sentimentVisual(status: string): ChipVisual {
  switch (normalize(status)) {
    case 'POSITIVE':
      return { color: 'primary', tooltip: 'Sentiment is predominantly positive.' };
    case 'NEUTRAL':
      return { color: undefined, tooltip: 'Sentiment is neutral or balanced.' };
    case 'NEGATIVE':
      return { color: 'warn', tooltip: 'Sentiment is predominantly negative.' };
    case 'MIXED':
      return { color: 'accent', tooltip: 'Sentiment is mixed across the content.' };
    case 'UNKNOWN':
      return { color: undefined, tooltip: 'Sentiment could not be determined.' };
    default:
      return { color: undefined, tooltip: `Sentiment: ${status}` };
  }
}

function resolveVisual(kind: StatusChipKind, status: string): ChipVisual {
  const s = status || '—';
  switch (kind) {
    case 'insight':
      return insightVisual(s);
    case 'job':
      return jobVisual(s);
    case 'confidence':
      return confidenceVisual(s);
    case 'sentiment':
      return sentimentVisual(s);
    default:
      return { color: undefined, tooltip: s };
  }
}

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [CommonModule, MatChipsModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      mat-chip
      [color]="visual().color"
      [class]="mergedChipClass()"
      [matTooltip]="visual().tooltip"
      matTooltipShowDelay="200"
    >
      {{ displayStatus() }}
    </span>
  `,
  styles: [
    `
      .status-chip {
        max-width: 100%;
        text-transform: capitalize;
      }
      .status-chip.job-chip-queued {
        --mdc-chip-container-color: #e3f2fd;
        color: #0d47a1;
      }
      .status-chip.job-chip-running {
        --mdc-chip-container-color: #fff8e1;
        color: #e65100;
      }
      .status-chip.job-chip-success {
        --mdc-chip-container-color: #e8f5e9;
        color: #1b5e20;
      }
      .status-chip.job-chip-failed {
        --mdc-chip-container-color: #ffebee;
        color: #b71c1c;
      }
    `,
  ],
})
export class StatusChipComponent {
  readonly status = input<string>('');
  readonly type = input<StatusChipKind>('insight');

  readonly visual = computed(() => resolveVisual(this.type(), this.status()));

  readonly chipClass = computed(() => {
    if (this.type() !== 'job') {
      return '';
    }
    return this.visual().jobClass ?? '';
  });

  readonly mergedChipClass = computed(() => {
    const extra = this.chipClass();
    return extra ? `status-chip ${extra}` : 'status-chip';
  });

  readonly displayStatus = computed(() => {
    const raw = this.status().trim();
    return raw || '—';
  });
}
