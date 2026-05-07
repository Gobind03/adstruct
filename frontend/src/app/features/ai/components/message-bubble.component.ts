import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { AiCitation, AiMessage, MessageRole } from '../models/ai.models';
import { CitationListComponent } from './citation-list.component';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [CommonModule, MatIconModule, CitationListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="row" [class]="rowClass()">
      <div class="bubble" [class]="bubbleClass()">
        <div class="bubble-meta">
          <span class="role-badge" [class]="'role-' + message().role.toLowerCase()">
            {{ roleLabel(message().role) }}
          </span>
          <span class="ts">{{ message().createdAt | date: 'short' }}</span>
        </div>
        <div class="bubble-body">
          @if (message().content) {
            <div class="text">{{ message().content }}</div>
          } @else if (message().contentJson) {
            <pre class="json-fallback">{{ message().contentJson }}</pre>
          } @else {
            <span class="empty-msg">(empty)</span>
          }
        </div>
        @if (effectiveCitations().length) {
          <app-citation-list [citations]="effectiveCitations()" />
        }
      </div>
    </div>
  `,
  styles: [`
    .row {
      display: flex;
      width: 100%;
      margin-bottom: 12px;
    }
    .row-user { justify-content: flex-end; }
    .row-assistant { justify-content: flex-start; }
    .row-system { justify-content: center; }
    .row-tool { justify-content: flex-start; }

    .bubble {
      max-width: min(720px, 92%);
      border-radius: 16px;
      padding: 10px 14px;
      box-shadow: 0 1px 2px rgba(0,0,0,.06);
    }
    .bubble-user {
      background: var(--color-primary, #3f51b5);
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .bubble-user .bubble-meta { color: rgba(255,255,255,.85); }
    .bubble-user .role-badge {
      background: rgba(255,255,255,.2);
      color: #fff;
    }
    .bubble-assistant {
      background: var(--mat-sys-surface-container-high, #eceff1);
      color: var(--text-primary, #1a1a1a);
      border-bottom-left-radius: 4px;
      border: 1px solid var(--border-default, rgba(0,0,0,.08));
    }
    .bubble-system {
      background: var(--mat-sys-surface-container-low, #f5f5f5);
      color: var(--text-muted, #6b7280);
      font-size: 13px;
      max-width: 90%;
      text-align: center;
      border: 1px dashed var(--border-default, rgba(0,0,0,.12));
      box-shadow: none;
    }
    .bubble-tool {
      background: #1e293b;
      color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      border-bottom-left-radius: 4px;
      border: 1px solid #334155;
    }
    .bubble-tool .role-badge {
      background: #334155;
      color: #94a3b8;
    }
    .bubble-tool .ts { color: #64748b; }

    .bubble-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 11px;
      color: var(--text-muted, #6b7280);
    }
    .role-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      font-weight: 600;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      background: var(--mat-sys-surface-container, #e5e7eb);
      color: var(--text-secondary, #374151);
    }
    .role-user { background: rgba(255,255,255,.25); color: #fff; }
    .role-assistant { background: #dbeafe; color: #1e40af; }
    .role-system { background: #e5e7eb; color: #4b5563; }
    .role-tool { background: #334155; color: #94a3b8; }

    .bubble-body .text {
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 14px;
      line-height: 1.55;
    }
    .json-fallback {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-size: 12px;
    }
    .empty-msg {
      font-style: italic;
      opacity: 0.7;
      font-size: 13px;
    }

    :host ::ng-deep .bubble-user app-citation-list .cite-chip {
      background: rgba(255,255,255,.15);
      border-color: rgba(255,255,255,.35);
      color: rgba(255,255,255,.95);
    }
    :host ::ng-deep .bubble-user app-citation-list .cite-num {
      background: rgba(255,255,255,.9);
      color: var(--color-primary, #3f51b5);
    }
  `],
})
export class MessageBubbleComponent {
  readonly message = input.required<AiMessage>();
  readonly citations = input<AiCitation[] | undefined>(undefined);

  readonly effectiveCitations = computed(() => {
    const extra = this.citations();
    if (extra?.length) return extra;
    return this.message().citations ?? [];
  });

  readonly rowClass = computed(() => {
    const r = this.message().role;
    return rowClassForRole(r);
  });

  readonly bubbleClass = computed(() => {
    const r = this.message().role;
    switch (r) {
      case 'USER':
        return 'bubble-user';
      case 'ASSISTANT':
        return 'bubble-assistant';
      case 'SYSTEM':
        return 'bubble-system';
      case 'TOOL':
        return 'bubble-tool';
      default:
        return 'bubble-assistant';
    }
  });

  roleLabel(role: MessageRole): string {
    switch (role) {
      case 'USER':
        return 'You';
      case 'ASSISTANT':
        return 'Assistant';
      case 'SYSTEM':
        return 'System';
      case 'TOOL':
        return 'Tool';
      default:
        return role;
    }
  }
}

function rowClassForRole(role: MessageRole): string {
  switch (role) {
    case 'USER':
      return 'row-user';
    case 'ASSISTANT':
    case 'TOOL':
      return role === 'TOOL' ? 'row-tool' : 'row-assistant';
    case 'SYSTEM':
      return 'row-system';
    default:
      return 'row-assistant';
  }
}
