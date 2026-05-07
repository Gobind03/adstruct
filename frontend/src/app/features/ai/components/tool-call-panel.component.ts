import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { AiToolCall, ToolCallStatus } from '../models/ai.models';
import { JsonViewerComponent } from './json-viewer.component';

@Component({
  selector: 'app-tool-call-panel',
  standalone: true,
  imports: [CommonModule, MatExpansionModule, MatChipsModule, MatIconModule, JsonViewerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (toolCalls().length) {
      <div class="tool-panel">
        <div class="tool-panel-head">
          <mat-icon class="head-icon">build_circle</mat-icon>
          <span class="head-title">Tool calls</span>
          <span class="head-count">{{ toolCalls().length }}</span>
        </div>
        <mat-accordion class="tool-acc" multi="true">
          @for (tc of toolCalls(); track tc.id) {
            <mat-expansion-panel class="tool-exp" [expanded]="false">
              <mat-expansion-panel-header>
                <mat-panel-title class="exp-title">
                  <span class="tool-name">{{ tc.toolName }}</span>
                  <mat-chip [ngClass]="['status-chip', statusClass(tc.status)]">
                    {{ tc.status ?? '—' }}
                  </mat-chip>
                </mat-panel-title>
              </mat-expansion-panel-header>
              <div class="exp-body">
                @if (tc.errorMessage) {
                  <div class="err-banner">
                    <mat-icon>error_outline</mat-icon>
                    {{ tc.errorMessage }}
                  </div>
                }
                <div class="io-block">
                  <div class="io-label">Input</div>
                  <app-json-viewer [json]="tc.inputJson ?? ''" />
                </div>
                <div class="io-block">
                  <div class="io-label">Output</div>
                  <app-json-viewer [json]="tc.outputJson ?? ''" />
                </div>
              </div>
            </mat-expansion-panel>
          }
        </mat-accordion>
      </div>
    }
  `,
  styles: [`
    .tool-panel {
      margin-top: 8px;
      border-radius: var(--radius-md, 8px);
      border: 1px solid var(--border-default, rgba(0,0,0,.1));
      overflow: hidden;
      background: var(--mat-sys-surface-container-lowest, #fff);
    }
    .tool-panel-head {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: var(--mat-sys-surface-container, #f3f4f6);
      border-bottom: 1px solid var(--border-default, rgba(0,0,0,.08));
      font-size: 12px;
      font-weight: 600;
      color: var(--text-secondary, #374151);
    }
    .head-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: var(--color-primary, #3f51b5);
    }
    .head-count {
      margin-left: auto;
      font-weight: 500;
      color: var(--text-muted, #6b7280);
    }
    :host ::ng-deep .tool-acc .mat-expansion-panel {
      box-shadow: none !important;
      border-bottom: 1px solid var(--border-default, rgba(0,0,0,.06));
    }
    :host ::ng-deep .tool-acc .mat-expansion-panel:last-child {
      border-bottom: none;
    }
    .exp-title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .tool-name {
      font-family: ui-monospace, monospace;
      font-size: 13px;
      font-weight: 600;
    }
    .status-chip {
      font-size: 11px !important;
      min-height: 22px !important;
      padding: 0 8px !important;
    }
    .st-proposed { --mdc-chip-container-color: #e0e7ff; color: #3730a3; }
    .st-running { --mdc-chip-container-color: #fef3c7; color: #92400e; }
    .st-succeeded { --mdc-chip-container-color: #d1fae5; color: #065f46; }
    .st-failed { --mdc-chip-container-color: #fee2e2; color: #991b1b; }
    .st-blocked { --mdc-chip-container-color: #f3e8ff; color: #6b21a8; }
    .st-unknown { --mdc-chip-container-color: #f3f4f6; color: #4b5563; }
    .exp-body {
      padding: 0 8px 12px;
    }
    .err-banner {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 10px;
      margin-bottom: 10px;
      border-radius: 6px;
      background: #fef2f2;
      color: #991b1b;
      font-size: 12px;
    }
    .err-banner .mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }
    .io-block { margin-bottom: 10px; }
    .io-block:last-child { margin-bottom: 0; }
    .io-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--text-muted, #6b7280);
      margin-bottom: 4px;
    }
  `],
})
export class ToolCallPanelComponent {
  readonly toolCalls = input<AiToolCall[]>([]);

  statusClass(status: ToolCallStatus | null | undefined): string {
    const s = (status ?? '').toUpperCase();
    switch (s) {
      case 'PROPOSED':
        return 'st-proposed';
      case 'RUNNING':
        return 'st-running';
      case 'SUCCEEDED':
        return 'st-succeeded';
      case 'FAILED':
        return 'st-failed';
      case 'BLOCKED':
        return 'st-blocked';
      default:
        return 'st-unknown';
    }
  }
}
