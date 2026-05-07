import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

const ENTITY_ROUTE: Record<string, readonly string[]> = {
  TEMPLATE: ['/governance/templates'],
  RULESET: ['/governance/rulesets'],
  CAMPAIGN: ['/campaigns'],
  INTEGRATION_ACCOUNT: ['/integrations/accounts'],
};

@Component({
  selector: 'app-cross-module-link-chip',
  standalone: true,
  imports: [CommonModule, RouterLink, MatChipsModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (route(); as r) {
      <a mat-chip [routerLink]="r" [queryParamsHandling]="'merge'" class="link-chip" [attr.aria-label]="ariaLabel()">
        <span class="chip-label">{{ label() }}</span>
        <mat-icon class="chip-ico" aria-hidden="true">open_in_new</mat-icon>
      </a>
    } @else {
      <span
        mat-chip
        class="link-chip invalid"
        [matTooltip]="'Unknown entity type: ' + linkedEntityType()"
        matTooltipPosition="above"
      >
        {{ label() }}
      </span>
    }
  `,
  styles: [
    `
      .link-chip {
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        max-width: 100%;
      }
      .link-chip.invalid {
        cursor: default;
        opacity: 0.85;
      }
      .chip-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 240px;
      }
      .chip-ico {
        font-size: 16px;
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
    `,
  ],
})
export class CrossModuleLinkChipComponent {
  readonly linkedEntityType = input<string>('');
  readonly linkedEntityId = input<string>('');
  readonly label = input<string>('');

  readonly route = computed((): string[] | null => {
    const type = this.linkedEntityType().trim().toUpperCase();
    const id = this.linkedEntityId().trim();
    const prefix = ENTITY_ROUTE[type];
    if (!prefix || !id) {
      return null;
    }
    return [...prefix, id];
  });

  readonly ariaLabel = computed(() => {
    const t = this.linkedEntityType();
    const l = this.label();
    return l ? `Open linked ${t}: ${l}` : `Open linked ${t}`;
  });
}
