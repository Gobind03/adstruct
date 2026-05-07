import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgentMode, AiCitation, AiMessage, AiToolCall } from '../models/ai.models';
import { AiStore } from '../store/ai.store';
import { AiConversationsApiService } from '../services/ai-conversations-api.service';
import { AdminStore } from '../../admin/store/admin.store';
import { MessageBubbleComponent } from '../components/message-bubble.component';
import { ToolCallPanelComponent } from '../components/tool-call-panel.component';

interface ModeInfo {
  value: AgentMode;
  label: string;
  icon: string;
  tooltip: string;
}

const MODES: ModeInfo[] = [
  {
    value: 'CHAT_ONLY',
    label: 'Chat',
    icon: 'chat',
    tooltip: 'Pure conversation — brainstorm, draft copy, or ask questions. No workspace data or tools are used.',
  },
  {
    value: 'TOOL_ASSISTED',
    label: 'Tools',
    icon: 'build',
    tooltip: 'The agent can read your workspace data (research, campaigns, brand profile) and propose write actions for approval.',
  },
  {
    value: 'WORKFLOW',
    label: 'Workflow',
    icon: 'account_tree',
    tooltip: 'Multi-step automated flows — gather data, analyse, generate content, and create proposals in one pass.',
  },
];

const EXAMPLE_PROMPTS: string[] = [
  'Summarise my latest research insights',
  'Draft 3 ad-copy variants for our social campaign',
  'Check if this headline passes brand governance',
  'What campaigns are currently active?',
  'Help me brainstorm A/B test hypotheses',
];

@Component({
  selector: 'app-chat-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MessageBubbleComponent,
    ToolCallPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-root">
      <!-- ===== HEADER ===== -->
      <header class="chat-header">
        <div class="title-block">
          <h2 class="conv-title">{{ activeTitle() }}</h2>
          <span class="conv-mode-hint">
            @switch (selectedMode()) {
              @case ('CHAT_ONLY') { Pure conversation — no tools or data access }
              @case ('TOOL_ASSISTED') { Agent can read workspace data and propose actions }
              @case ('WORKFLOW') { Multi-step automated flow with data, analysis &amp; proposals }
            }
          </span>
        </div>
        <div class="mode-pills" role="group" aria-label="Agent mode">
          @for (m of modeInfos; track m.value) {
            <button
              type="button"
              class="mode-pill"
              [class.active]="selectedMode() === m.value"
              [matTooltip]="m.tooltip"
              matTooltipPosition="below"
              (click)="setAgentMode(m.value)"
            >
              <mat-icon>{{ m.icon }}</mat-icon>
              {{ m.label }}
            </button>
          }
        </div>
      </header>

      <!-- ===== THREAD ===== -->
      <div class="thread-wrap" #threadWrap>
        <div class="thread-inner">
          @if (!messages().length && !sending()) {
            <!-- empty conversation onboarding -->
            <div class="empty-conv">
              <mat-icon class="empty-icon">forum</mat-icon>
              <h3>Start the conversation</h3>
              <p class="empty-desc">
                Type a message below or pick a suggestion. The agent will respond using
                @switch (selectedMode()) {
                  @case ('CHAT_ONLY') { its general knowledge — no workspace data is accessed in Chat mode. }
                  @case ('TOOL_ASSISTED') { your workspace data: research insights, campaigns, brand profile, and more. It can also propose write actions for your approval. }
                  @case ('WORKFLOW') { a multi-step workflow: gathering data, analysing, generating content, and creating proposals in sequence. }
                }
              </p>

              <div class="example-prompts">
                <span class="example-label">Try asking:</span>
                @for (ep of examplePrompts; track ep) {
                  <button type="button" class="example-btn" (click)="useExample(ep)">
                    <mat-icon>arrow_forward</mat-icon>{{ ep }}
                  </button>
                }
              </div>

              <div class="safety-banner">
                <mat-icon>shield</mat-icon>
                <span>
                  All responses are filtered by your workspace safety policies. PII and secrets are automatically redacted. Write actions require your explicit approval.
                </span>
              </div>
            </div>
          }

          @for (msg of messages(); track msg.id) {
            <app-message-bubble [message]="msg" [citations]="citationsFor(msg.id)" />
            @if (toolCallsFor(msg.id).length) {
              <app-tool-call-panel [toolCalls]="toolCallsFor(msg.id)" />
            }
          }

          @if (sending()) {
            <div class="typing-row">
              <mat-spinner diameter="22" />
              <span>Thinking…</span>
            </div>
          }

          @if (errorMsg()) {
            <div class="error-banner">
              <mat-icon>error_outline</mat-icon>
              <div>
                <strong>Something went wrong</strong>
                <p>{{ errorMsg() }}</p>
              </div>
              <button mat-icon-button type="button" (click)="errorMsg.set('')" class="error-close"><mat-icon>close</mat-icon></button>
            </div>
          }
        </div>
      </div>

      <!-- ===== COMPOSER ===== -->
      <footer class="composer">
        <div class="composer-hints">
          <span class="hint-text">
            <mat-icon>lightbulb</mat-icon>
            <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
            @if (selectedMode() === 'TOOL_ASSISTED') {
              · Say <em>"check compliance"</em> to run governance · <em>"show campaigns"</em> to browse data
            }
          </span>
        </div>
        <mat-form-field appearance="outline" class="composer-field" subscriptSizing="dynamic">
          <textarea
            matInput
            cdkTextareaAutosize
            cdkAutosizeMinRows="1"
            cdkAutosizeMaxRows="8"
            [placeholder]="composerPlaceholder()"
            [(ngModel)]="draft"
            (keydown)="onComposerKeydown($event)"
            [disabled]="sending()"
          ></textarea>
          <button
            mat-icon-button
            matSuffix
            type="button"
            color="primary"
            [disabled]="!draft.trim() || sending()"
            (click)="send()"
            matTooltip="Send message"
            aria-label="Send"
          >
            <mat-icon>send</mat-icon>
          </button>
        </mat-form-field>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; background: #fff; }
    .chat-root { display: flex; flex-direction: column; height: 100%; min-height: 0; }

    /* --- header --- */
    .chat-header {
      flex-shrink: 0; padding: 12px 20px;
      border-bottom: 1px solid rgba(0,0,0,.08);
      display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    }
    .title-block { min-width: 0; }
    .conv-title { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -.02em; color: #111; }
    .conv-mode-hint { display: block; font-size: 12px; color: #6b7280; margin-top: 3px; line-height: 1.4; }
    .mode-pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .mode-pill {
      display: inline-flex; align-items: center; gap: 4px;
      border: 1px solid rgba(0,0,0,.15); background: #f9fafb; color: #374151;
      font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 999px;
      cursor: pointer; transition: background .15s, border-color .15s, color .15s;
    }
    .mode-pill mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .mode-pill:hover { border-color: #3f51b5; color: #3f51b5; }
    .mode-pill.active { background: #3f51b5; border-color: #3f51b5; color: #fff; }
    .mode-pill.active mat-icon { color: #fff; }

    /* --- thread --- */
    .thread-wrap { flex: 1; min-height: 0; overflow-y: auto; padding: 20px 24px 12px; }
    .thread-inner { max-width: 880px; margin: 0 auto; }

    /* empty state */
    .empty-conv { text-align: center; padding: 40px 12px 20px; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #3f51b5; opacity: .7; margin-bottom: 10px; }
    .empty-conv h3 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #111; }
    .empty-desc { max-width: 560px; margin: 0 auto 24px; font-size: 14px; color: #4b5563; line-height: 1.55; }

    .example-prompts { max-width: 480px; margin: 0 auto 24px; }
    .example-label { display: block; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; margin-bottom: 8px; }
    .example-btn {
      display: flex; align-items: center; gap: 8px; width: 100%;
      text-align: left; padding: 10px 14px; margin-bottom: 6px;
      border: 1px solid rgba(0,0,0,.1); border-radius: 8px; background: #fafbfc;
      cursor: pointer; font-size: 13px; color: #1e293b; transition: border-color .15s, box-shadow .15s;
    }
    .example-btn:hover { border-color: #3f51b5; box-shadow: 0 2px 8px rgba(63,81,181,.1); }
    .example-btn mat-icon { font-size: 16px; width: 16px; height: 16px; color: #3f51b5; flex-shrink: 0; }

    .safety-banner {
      display: flex; gap: 10px; align-items: flex-start; max-width: 480px; margin: 0 auto;
      padding: 12px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px;
    }
    .safety-banner mat-icon { color: #2563eb; font-size: 18px; width: 18px; height: 18px; margin-top: 1px; flex-shrink: 0; }
    .safety-banner span { font-size: 12px; color: #1e3a5f; line-height: 1.5; text-align: left; }

    .typing-row { display: flex; align-items: center; gap: 10px; padding: 12px 0; font-size: 13px; color: #6b7280; }

    .error-banner {
      display: flex; gap: 10px; align-items: flex-start;
      padding: 12px 14px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; margin-top: 12px;
    }
    .error-banner mat-icon { color: #dc2626; font-size: 20px; width: 20px; height: 20px; margin-top: 1px; flex-shrink: 0; }
    .error-banner strong { font-size: 13px; color: #991b1b; display: block; }
    .error-banner p { margin: 2px 0 0; font-size: 12px; color: #b91c1c; line-height: 1.4; }
    .error-close { margin-left: auto; width: 28px !important; height: 28px !important; line-height: 28px !important; }
    .error-close mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* --- composer --- */
    .composer {
      flex-shrink: 0; padding: 8px 20px 18px;
      border-top: 1px solid rgba(0,0,0,.08); background: #fff;
    }
    .composer-hints {
      max-width: 880px; margin: 0 auto 6px; display: flex; align-items: center;
    }
    .hint-text {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11px; color: #9ca3af;
    }
    .hint-text mat-icon { font-size: 14px; width: 14px; height: 14px; color: #d1d5db; }
    .hint-text kbd {
      display: inline-block; padding: 1px 5px; background: #f3f4f6; border: 1px solid #e5e7eb;
      border-radius: 4px; font-size: 10px; font-family: inherit; color: #6b7280;
    }
    .hint-text em { font-style: normal; color: #6366f1; font-weight: 500; }
    .composer-field { width: 100%; max-width: 880px; margin: 0 auto; display: block; }
    :host ::ng-deep .composer-field .mat-mdc-form-field-subscript-wrapper { display: none; }
  `],
})
export class ChatViewComponent {
  readonly conversationId = input.required<string>();

  private aiStore = inject(AiStore);
  private adminStore = inject(AdminStore);
  private convApi = inject(AiConversationsApiService);
  private destroyRef = inject(DestroyRef);

  private threadEl = viewChild<ElementRef<HTMLElement>>('threadWrap');

  readonly modeInfos = MODES;
  readonly examplePrompts = EXAMPLE_PROMPTS;

  draft = '';

  readonly sending = signal(false);
  readonly errorMsg = signal('');
  readonly selectedMode = signal<AgentMode>('TOOL_ASSISTED');

  private toolCallsByMessageId = signal<Map<string, AiToolCall[]>>(new Map());
  private extraCitationsByMessageId = signal<Map<string, AiCitation[]>>(new Map());

  readonly messages = computed(() => this.aiStore.activeMessages());
  readonly activeTitle = computed(() => this.aiStore.activeConversation()?.title ?? 'Conversation');

  readonly composerPlaceholder = computed(() => {
    switch (this.selectedMode()) {
      case 'CHAT_ONLY':
        return 'Ask anything — brainstorm, draft copy, get ideas…';
      case 'TOOL_ASSISTED':
        return 'Ask a question or request an action — e.g. "summarise latest insights"';
      case 'WORKFLOW':
        return 'Describe the workflow goal — e.g. "generate compliant sponsored snippets"';
      default:
        return 'Message…';
    }
  });

  constructor() {
    effect(() => {
      const conv = this.aiStore.activeConversation();
      const mode = conv?.agentMode;
      if (mode) {
        untracked(() => this.selectedMode.set(mode));
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const id = this.conversationId();
      untracked(() => {
        this.toolCallsByMessageId.set(new Map());
        this.extraCitationsByMessageId.set(new Map());
        this.errorMsg.set('');
      });
      void id;
    }, { allowSignalWrites: true });

    effect(() => {
      const len = this.aiStore.activeMessages().length;
      const sending = this.sending();
      void len;
      void sending;
      untracked(() => this.queueScrollBottom());
    }, { allowSignalWrites: true });
  }

  setAgentMode(mode: AgentMode): void {
    this.selectedMode.set(mode);
    const conv = this.aiStore.activeConversation();
    if (conv && conv.id === this.conversationId()) {
      this.aiStore.upsertConversation({ ...conv, agentMode: mode });
    }
  }

  toolCallsFor(messageId: string): AiToolCall[] {
    return this.toolCallsByMessageId().get(messageId) ?? [];
  }

  citationsFor(messageId: string): AiCitation[] | undefined {
    const extra = this.extraCitationsByMessageId().get(messageId);
    if (extra?.length) return extra;
    return undefined;
  }

  useExample(text: string): void {
    this.draft = text;
  }

  onComposerKeydown(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      this.send();
    }
  }

  send(): void {
    const text = this.draft.trim();
    const wsId = this.adminStore.selectedWorkspaceId();
    const convId = this.conversationId();
    if (!text || !wsId || !convId || this.sending()) return;

    this.errorMsg.set('');

    const userMsg: AiMessage = {
      id: `local-${crypto.randomUUID()}`,
      conversationId: convId,
      role: 'USER',
      content: text,
      contentJson: null,
      createdByUserId: null,
      createdAt: new Date().toISOString(),
      citations: [],
    };

    this.aiStore.addMessage(userMsg);
    this.draft = '';
    this.sending.set(true);

    this.convApi
      .postMessage(wsId, convId, { content: text })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.aiStore.addMessage(res.assistantMessage);
          if (res.toolCalls?.length) {
            this.toolCallsByMessageId.update((m) => {
              const next = new Map(m);
              next.set(res.assistantMessage.id, res.toolCalls);
              return next;
            });
          }
          if (res.citations?.length && !res.assistantMessage.citations?.length) {
            this.extraCitationsByMessageId.update((m) => {
              const next = new Map(m);
              next.set(res.assistantMessage.id, res.citations);
              return next;
            });
          }
          this.sending.set(false);
          this.queueScrollBottom();
        },
        error: (err) => {
          this.sending.set(false);
          const detail = err?.error?.message || err?.error?.detail || err?.message || 'The request failed. Check your provider configuration and try again.';
          this.errorMsg.set(detail);
          this.queueScrollBottom();
        },
      });
  }

  private queueScrollBottom(): void {
    queueMicrotask(() => {
      const el = this.threadEl()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }
}
