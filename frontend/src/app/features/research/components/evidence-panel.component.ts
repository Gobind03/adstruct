import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { EvidenceResponse } from '../models/research.models';

@Component({
  selector: 'app-evidence-panel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDividerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="evidence-panel">
      <div class="panel-head">
        <h3 class="title">Evidence</h3>
        @if (canEdit()) {
          <button mat-stroked-button color="primary" type="button" (click)="addEvidence.emit()">
            <mat-icon aria-hidden="true">add</mat-icon>
            Add Evidence
          </button>
        }
      </div>

      @if (evidence().length === 0) {
        <p class="empty">No evidence attached to this insight.</p>
      } @else {
        <ul class="evidence-list">
          @for (ev of evidence(); track ev.id; let last = $last) {
            <li class="evidence-row">
              <div class="evidence-body">
                @if (ev.citationText) {
                  <p class="citation">{{ ev.citationText }}</p>
                }
                @if (ev.citationUrl) {
                  <a [href]="ev.citationUrl" target="_blank" rel="noopener noreferrer" class="url">
                    {{ ev.citationUrl }}
                  </a>
                }
                <div class="meta">
                  <span>Snapshot {{ ev.snapshotId }}</span>
                  <span>{{ ev.createdAt | date: 'medium' }}</span>
                </div>
              </div>
              @if (canEdit()) {
                <button
                  mat-icon-button
                  type="button"
                  aria-label="Delete evidence"
                  (click)="deleteEvidence.emit(ev.id)"
                >
                  <mat-icon>delete_outline</mat-icon>
                </button>
              }
            </li>
            @if (!last) {
              <mat-divider />
            }
          }
        </ul>
      }
    </div>
  `,
  styles: [
    `
      .evidence-panel {
        display: block;
      }
      .panel-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 12px;
      }
      .title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }
      .empty {
        margin: 0;
        color: #757575;
        font-size: 14px;
      }
      .evidence-list {
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .evidence-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 12px 0;
      }
      .evidence-body {
        flex: 1;
        min-width: 0;
      }
      .citation {
        margin: 0 0 8px;
        font-size: 14px;
        line-height: 1.45;
        color: #212121;
      }
      .url {
        display: inline-block;
        font-size: 13px;
        word-break: break-all;
        margin-bottom: 8px;
      }
      .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
        font-size: 12px;
        color: #757575;
      }
    `,
  ],
})
export class EvidencePanelComponent {
  readonly evidence = input<EvidenceResponse[]>([]);
  readonly canEdit = input<boolean>(false);
  readonly addEvidence = output<void>();
  readonly deleteEvidence = output<string>();
}
