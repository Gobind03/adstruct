import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

export interface BreadcrumbItem {
  label: string;
  route?: string;
}

@Component({
  selector: 'app-research-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="breadcrumb-bar" aria-label="Breadcrumb">
      @for (item of items(); track trackItem($index, item); let last = $last) {
        @if (item.route && !last) {
          <a [routerLink]="item.route" class="breadcrumb-link">{{ item.label }}</a>
          <mat-icon class="breadcrumb-sep" aria-hidden="true">chevron_right</mat-icon>
        } @else {
          <span class="breadcrumb-current" [attr.aria-current]="last ? 'page' : null">{{ item.label }}</span>
        }
      }
    </nav>
  `,
  styles: [
    `
      .breadcrumb-bar {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 4px;
        padding: 8px 0;
        font-size: 14px;
      }
      .breadcrumb-link {
        color: #1976d2;
        text-decoration: none;
      }
      .breadcrumb-link:hover {
        text-decoration: underline;
      }
      .breadcrumb-current {
        color: #666;
        font-weight: 500;
      }
      .breadcrumb-sep {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #999;
      }
    `,
  ],
})
export class ResearchBreadcrumbComponent {
  readonly items = input<BreadcrumbItem[]>([]);

  trackItem(index: number, item: BreadcrumbItem): string {
    return item.route ?? `${item.label}-${index}`;
  }
}
