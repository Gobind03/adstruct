import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiCitation } from '../models/ai.models';

@Component({
  selector: 'app-citation-list',
  standalone: true,
  imports: [CommonModule, MatChipsModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (citations().length) {
      <div class="citation-row">
        @for (c of citations(); track c.id; let idx = $index) {
          <button
            type="button"
            class="cite-chip"
            [matTooltip]="tooltip(c)"
            matTooltipShowDelay="200"
            (click)="onCitationClick(c)"
          >
            <span class="cite-num">{{ idx + 1 }}</span>
            <span class="cite-label">{{ displayLabel(c) }}</span>
            @if (isUrl(c)) {
              <mat-icon class="cite-ico">open_in_new</mat-icon>
            } @else if (isInternal(c)) {
              <mat-icon class="cite-ico">link</mat-icon>
            }
          </button>
        }
      </div>
    }
  `,
  styles: [`
    .citation-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .cite-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px 4px 6px;
      border-radius: 999px;
      border: 1px solid var(--border-default, rgba(0,0,0,.12));
      background: var(--mat-sys-surface-container, #f3f4f6);
      font-size: 12px;
      color: var(--text-secondary, #374151);
      cursor: pointer;
      transition: background var(--transition-fast, 0.15s), border-color var(--transition-fast, 0.15s);
      font-family: inherit;
    }
    .cite-chip:hover {
      background: var(--color-primary-muted, #e8eef9);
      border-color: var(--color-primary, #3f51b5);
      color: var(--text-primary, #111);
    }
    .cite-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 4px;
      border-radius: 999px;
      background: var(--color-primary, #3f51b5);
      color: #fff;
      font-size: 10px;
      font-weight: 700;
    }
    .cite-label {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cite-ico {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: var(--text-muted, #6b7280);
    }
  `],
})
export class CitationListComponent {
  readonly citations = input<AiCitation[]>([]);

  private router = inject(Router);

  displayLabel(c: AiCitation): string {
    return c.label?.trim() || c.referenceType || c.url || 'Source';
  }

  tooltip(c: AiCitation): string {
    if (c.url) return c.url;
    if (c.referenceId) return `${c.referenceType ?? 'Entity'} · ${c.referenceId}`;
    return this.displayLabel(c);
  }

  isUrl(c: AiCitation): boolean {
    return !!c.url?.trim();
  }

  isInternal(c: AiCitation): boolean {
    const t = (c.citationType ?? '').toUpperCase();
    return t === 'INTERNAL_ENTITY' && !!c.referenceId?.trim();
  }

  onCitationClick(c: AiCitation): void {
    if (this.isUrl(c) && c.url) {
      window.open(c.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!this.isInternal(c) || !c.referenceId) return;

    const type = (c.referenceType ?? '').toUpperCase();
    const id = c.referenceId;
    const path = entityPath(type, id);
    if (path) {
      void this.router.navigate(path);
    }
  }
}

/** Best-effort routes for known entity reference types */
function entityPath(referenceType: string, id: string): string[] | null {
  switch (referenceType) {
    case 'CAMPAIGN':
      return ['/campaigns', id];
    case 'SPONSORED_UNIT':
    case 'CREATIVE':
      return ['/creatives'];
    case 'APPROVAL':
      return ['/approvals'];
    case 'INTEGRATION_ACCOUNT':
      return ['/integrations/accounts', id];
    case 'WORKSPACE':
      return ['/admin/workspaces'];
    case 'ORG':
    case 'ORGANIZATION':
      return ['/admin/orgs', id];
    default:
      return null;
  }
}
