import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AgentMode, AiConversation } from '../models/ai.models';
import { AiStore } from '../store/ai.store';
import { AiConversationsApiService } from '../services/ai-conversations-api.service';
import { AdminStore } from '../../admin/store/admin.store';
import { ChatViewComponent } from './chat-view.component';

interface ModeInfo {
  value: AgentMode;
  label: string;
  icon: string;
  description: string;
}

interface Capability {
  icon: string;
  title: string;
  description: string;
}

interface QuickPrompt {
  label: string;
  prompt: string;
  mode: AgentMode;
}

const MODES: ModeInfo[] = [
  {
    value: 'CHAT_ONLY',
    label: 'Chat',
    icon: 'chat',
    description: 'Pure conversation with the LLM. Ask questions, brainstorm ideas, draft copy — no tools or data access.',
  },
  {
    value: 'TOOL_ASSISTED',
    label: 'Tool-assisted',
    icon: 'build',
    description: 'The agent can read your workspace data — research insights, campaigns, brand profile — and propose actions for your approval.',
  },
  {
    value: 'WORKFLOW',
    label: 'Workflow',
    icon: 'account_tree',
    description: 'Multi-step automated flows: gather data, analyse, generate content, and create proposals in one pass.',
  },
];

const CAPABILITIES: Capability[] = [
  { icon: 'search', title: 'Research & insights', description: 'Search snapshots, summarise competitor data, and cluster keywords from your research hub.' },
  { icon: 'verified', title: 'Governance checks', description: 'Run brand-compliance and policy checks on copy, templates, and creatives before publishing.' },
  { icon: 'campaign', title: 'Campaign analysis', description: 'List active campaigns, review performance metrics, and brainstorm optimisation ideas.' },
  { icon: 'edit_note', title: 'Content drafting', description: 'Generate ad copy, rewrite headlines, create A/B variants — all aligned to your brand voice.' },
  { icon: 'approval', title: 'Safe proposals', description: 'Write actions are never auto-executed. The agent proposes changes and you approve or reject them.' },
  { icon: 'shield', title: 'Built-in safety', description: 'PII redaction, banned-phrase filtering, and workspace policies run automatically on every turn.' },
];

const QUICK_PROMPTS: QuickPrompt[] = [
  { label: 'Brainstorm campaign ideas', prompt: 'Help me brainstorm campaign ideas for our upcoming product launch', mode: 'CHAT_ONLY' },
  { label: 'Summarise latest research', prompt: 'Search and summarise the latest research insights in my workspace', mode: 'TOOL_ASSISTED' },
  { label: 'Check copy compliance', prompt: 'Run a governance compliance check on our latest ad copy', mode: 'TOOL_ASSISTED' },
  { label: 'Draft ad copy variants', prompt: 'Draft 3 ad-copy variants for a social media campaign, matching our brand voice', mode: 'CHAT_ONLY' },
];

@Component({
  selector: 'app-chat-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    ChatViewComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="layout">
      <!-- ===== SIDEBAR ===== -->
      <aside class="sidebar">
        <button
          mat-flat-button
          color="primary"
          class="new-btn"
          (click)="toggleNewForm()"
          [disabled]="!workspaceId()"
        >
          <mat-icon>add</mat-icon>
          New Chat
        </button>

        @if (showNewForm()) {
          <mat-card class="new-form-card">
            <div class="form-head">
              <span class="form-title">Start a conversation</span>
              <button mat-icon-button type="button" (click)="cancelNewForm()" class="close-sm"><mat-icon>close</mat-icon></button>
            </div>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Title</mat-label>
              <input matInput [(ngModel)]="newTitle" placeholder="e.g. Q3 campaign ideas" />
              <mat-hint>A short label to find this chat later</mat-hint>
            </mat-form-field>

            <label class="mode-section-label">Agent mode</label>
            <div class="mode-list">
              @for (m of modeInfos; track m.value) {
                <button
                  type="button"
                  class="mode-option"
                  [class.picked]="newMode === m.value"
                  (click)="newMode = m.value"
                >
                  <mat-icon>{{ m.icon }}</mat-icon>
                  <div>
                    <strong>{{ m.label }}</strong>
                    <span>{{ m.description }}</span>
                  </div>
                </button>
              }
            </div>

            <div class="new-form-actions">
              <button mat-button type="button" (click)="cancelNewForm()">Cancel</button>
              <button
                mat-flat-button
                color="primary"
                type="button"
                [disabled]="!newTitle.trim() || creating()"
                (click)="createConversation()"
              >
                @if (creating()) { <mat-spinner diameter="18" /> } @else { Create }
              </button>
            </div>
          </mat-card>
        }

        @if (!workspaceId()) {
          <div class="sidebar-hint">
            <mat-icon>workspaces</mat-icon>
            <p>Select a workspace to load conversations.</p>
          </div>
        } @else if (listLoading()) {
          <div class="sidebar-loading"><mat-spinner diameter="32" /></div>
        } @else if (!conversations().length) {
          <div class="sidebar-empty">
            <mat-icon>forum</mat-icon>
            <p class="empty-title">No conversations yet</p>
            <p class="empty-desc">Start a new chat to brainstorm, analyse data, or generate content with AI.</p>
          </div>
        } @else {
          <div class="conv-list">
            @for (c of conversations(); track c.id) {
              <button
                type="button"
                class="conv-item"
                [class.selected]="selectedId() === c.id"
                (click)="selectConversation(c)"
              >
                <div class="conv-item-title">{{ c.title || 'Untitled' }}</div>
                <div class="conv-item-meta">
                  <mat-chip class="status-chip" [class.archived]="c.status === 'ARCHIVED'">{{ c.status }}</mat-chip>
                  <span class="conv-date">{{ c.updatedAt | date: 'mediumDate' }}</span>
                </div>
              </button>
            }
          </div>
        }
      </aside>

      <!-- ===== MAIN PANEL ===== -->
      <main class="main">
        @if (!workspaceId()) {
          <div class="welcome">
            <mat-icon class="welcome-icon">smart_toy</mat-icon>
            <h1>AI Agent Chat</h1>
            <p class="welcome-sub">Choose an organization and workspace from the top bar to start chatting with your marketing AI assistant.</p>
          </div>
        } @else if (!selectedId()) {
          <div class="welcome-rich">
            <div class="hero">
              <mat-icon class="hero-icon">smart_toy</mat-icon>
              <h1>AI Agent Chat</h1>
              <p class="hero-sub">
                Your workspace AI assistant that understands your marketing data.
                Ask questions, analyse campaigns, draft content, and propose changes — all governed by your workspace safety policies.
              </p>
              <button mat-flat-button color="primary" (click)="openNewForm()"><mat-icon>add</mat-icon> New Chat</button>
            </div>

            <section class="cap-section">
              <h2 class="section-title">What can the agent do?</h2>
              <div class="cap-grid">
                @for (c of capabilities; track c.title) {
                  <div class="cap-card">
                    <mat-icon>{{ c.icon }}</mat-icon>
                    <strong>{{ c.title }}</strong>
                    <p>{{ c.description }}</p>
                  </div>
                }
              </div>
            </section>

            <section class="quick-section">
              <h2 class="section-title">Quick start</h2>
              <p class="section-sub">Click a suggestion to create a new chat with that prompt.</p>
              <div class="quick-grid">
                @for (q of quickPrompts; track q.label) {
                  <button type="button" class="quick-card" (click)="startFromPrompt(q)">
                    <mat-icon>arrow_forward</mat-icon>
                    <span>{{ q.label }}</span>
                  </button>
                }
              </div>
            </section>

            <section class="modes-section">
              <h2 class="section-title">Agent modes explained</h2>
              <div class="modes-grid">
                @for (m of modeInfos; track m.value) {
                  <div class="mode-explain-card">
                    <mat-icon>{{ m.icon }}</mat-icon>
                    <strong>{{ m.label }}</strong>
                    <p>{{ m.description }}</p>
                  </div>
                }
              </div>
            </section>

            <div class="footer-hint">
              <mat-icon>info</mat-icon>
              <span>
                All AI outputs are filtered by your workspace <strong>Safety &amp; Redaction</strong> policies.
                Write actions are never auto-applied — they create approval proposals you can review.
              </span>
            </div>
          </div>
        } @else {
          <app-chat-view [conversationId]="selectedId()!" />
        }
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; min-height: 0; }

    .layout {
      display: flex; height: 100%; min-height: 480px;
      border: 1px solid rgba(0,0,0,.1); border-radius: 10px; overflow: hidden; background: #fff;
    }

    /* --- sidebar --- */
    .sidebar {
      width: 290px; flex-shrink: 0; border-right: 1px solid rgba(0,0,0,.1);
      background: #f8f9fb; display: flex; flex-direction: column; min-height: 0;
    }
    .new-btn {
      margin: 12px; width: calc(100% - 24px);
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    }
    .new-form-card { margin: 0 12px 12px; padding: 14px !important; }
    .form-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .form-title { font-weight: 600; font-size: 14px; }
    .close-sm { width: 28px !important; height: 28px !important; line-height: 28px !important; }
    .close-sm mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .full { width: 100%; margin-bottom: 4px; }
    .mode-section-label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: .04em; display: block; margin: 6px 0 6px; }
    .mode-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .mode-option {
      display: flex; gap: 10px; align-items: flex-start; border: 1px solid rgba(0,0,0,.1);
      border-radius: 8px; padding: 8px 10px; background: #fff; cursor: pointer; text-align: left;
      transition: border-color .15s, background .15s;
    }
    .mode-option:hover { border-color: #c5cae9; background: #f5f7ff; }
    .mode-option.picked { border-color: #3f51b5; background: #eef0ff; }
    .mode-option mat-icon { font-size: 20px; width: 20px; height: 20px; color: #3f51b5; margin-top: 1px; }
    .mode-option strong { display: block; font-size: 13px; }
    .mode-option span { display: block; font-size: 11px; color: #6b7280; line-height: 1.4; margin-top: 2px; }
    .new-form-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; align-items: center; }

    .sidebar-hint, .sidebar-empty, .sidebar-loading { padding: 24px 16px; text-align: center; flex: 1; }
    .sidebar-hint .mat-icon, .sidebar-empty .mat-icon { font-size: 40px; width: 40px; height: 40px; color: #c4c4c4; margin-bottom: 8px; }
    .sidebar-hint p, .sidebar-empty .empty-desc { font-size: 13px; color: #6b7280; line-height: 1.5; margin: 0 0 12px; }
    .empty-title { font-weight: 600; font-size: 15px; color: #111; margin: 0 0 6px; }
    .sidebar-loading { display: flex; align-items: center; justify-content: center; }

    .conv-list { flex: 1; overflow-y: auto; padding: 0 8px 12px; }
    .conv-item {
      width: 100%; text-align: left; border: 1px solid transparent; border-radius: 10px;
      padding: 10px 12px; margin-bottom: 4px; background: transparent; cursor: pointer;
      transition: background .15s, border-color .15s;
    }
    .conv-item:hover { background: #eef0f4; border-color: rgba(0,0,0,.06); }
    .conv-item.selected { background: #e8eaf6; border-color: #3f51b5; box-shadow: 0 0 0 1px rgba(63,81,181,.2); }
    .conv-item-title { font-size: 14px; font-weight: 600; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .conv-item-meta { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
    .status-chip { font-size: 10px !important; min-height: 22px !important; padding: 0 8px !important; --mdc-chip-container-color: #dcfce7; color: #166534; }
    .status-chip.archived { --mdc-chip-container-color: #f3f4f6; color: #6b7280; }
    .conv-date { font-size: 11px; color: #9ca3af; }

    /* --- main panel --- */
    .main { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; }

    /* simple welcome (no workspace) */
    .welcome {
      flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; padding: 48px 24px; color: #374151;
    }
    .welcome-icon { font-size: 56px; width: 56px; height: 56px; color: #3f51b5; opacity: .85; margin-bottom: 16px; }
    .welcome h1 { margin: 0 0 8px; font-size: 22px; font-weight: 600; color: #111; }
    .welcome-sub { margin: 0; max-width: 400px; font-size: 14px; line-height: 1.5; }

    /* rich welcome (workspace selected, no conv) */
    .welcome-rich { flex: 1; overflow-y: auto; padding: 32px 28px 48px; }
    .hero { text-align: center; margin-bottom: 36px; }
    .hero-icon { font-size: 52px; width: 52px; height: 52px; color: #3f51b5; opacity: .85; margin-bottom: 12px; }
    .hero h1 { margin: 0 0 10px; font-size: 24px; font-weight: 700; color: #111; }
    .hero-sub { max-width: 600px; margin: 0 auto 20px; font-size: 15px; color: #4b5563; line-height: 1.55; }

    .section-title { font-size: 16px; font-weight: 600; margin: 0 0 6px; color: #111; }
    .section-sub { font-size: 13px; color: #6b7280; margin: 0 0 12px; }
    .cap-section, .quick-section, .modes-section { max-width: 880px; margin: 0 auto 32px; }

    .cap-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
    .cap-card {
      padding: 14px 16px; border: 1px solid rgba(0,0,0,.08); border-radius: 10px; background: #fafbfc;
    }
    .cap-card mat-icon { font-size: 22px; width: 22px; height: 22px; color: #3f51b5; margin-bottom: 6px; }
    .cap-card strong { display: block; font-size: 14px; margin-bottom: 4px; }
    .cap-card p { margin: 0; font-size: 12.5px; color: #6b7280; line-height: 1.45; }

    .quick-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 10px; }
    .quick-card {
      display: flex; align-items: center; gap: 10px; padding: 12px 14px;
      border: 1px solid rgba(0,0,0,.1); border-radius: 10px; background: #fff;
      cursor: pointer; text-align: left; transition: border-color .15s, box-shadow .15s;
    }
    .quick-card:hover { border-color: #3f51b5; box-shadow: 0 2px 8px rgba(63,81,181,.12); }
    .quick-card mat-icon { font-size: 18px; width: 18px; height: 18px; color: #3f51b5; flex-shrink: 0; }
    .quick-card span { font-size: 13px; font-weight: 500; color: #1e293b; }

    .modes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 12px; }
    .mode-explain-card {
      padding: 14px 16px; border: 1px solid rgba(0,0,0,.08); border-radius: 10px; background: #f5f7ff;
    }
    .mode-explain-card mat-icon { font-size: 22px; width: 22px; height: 22px; color: #3f51b5; margin-bottom: 6px; }
    .mode-explain-card strong { display: block; font-size: 14px; margin-bottom: 4px; }
    .mode-explain-card p { margin: 0; font-size: 12.5px; color: #6b7280; line-height: 1.45; }

    .footer-hint {
      max-width: 880px; margin: 0 auto; display: flex; gap: 10px; align-items: flex-start;
      padding: 14px 16px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px;
    }
    .footer-hint mat-icon { color: #2563eb; font-size: 20px; width: 20px; height: 20px; margin-top: 1px; flex-shrink: 0; }
    .footer-hint span { font-size: 13px; color: #1e3a5f; line-height: 1.5; }
  `],
})
export class ChatListComponent {
  private aiStore = inject(AiStore);
  private adminStore = inject(AdminStore);
  private convApi = inject(AiConversationsApiService);

  private listSeq = 0;
  private detailSeq = 0;

  readonly modeInfos = MODES;
  readonly capabilities = CAPABILITIES;
  readonly quickPrompts = QUICK_PROMPTS;

  readonly workspaceId = this.adminStore.selectedWorkspaceId;
  readonly conversations = this.aiStore.conversations;
  readonly selectedId = signal<string | null>(null);

  readonly listLoading = signal(false);
  readonly creating = signal(false);
  readonly showNewForm = signal(false);

  newTitle = '';
  newMode: AgentMode = 'TOOL_ASSISTED';

  constructor() {
    effect(() => {
      const ws = this.adminStore.selectedWorkspaceId();
      untracked(() => {
        this.selectedId.set(null);
        this.aiStore.resetChatView();
        this.showNewForm.set(false);
      });
      if (ws) {
        untracked(() => this.loadConversations(ws));
      } else {
        untracked(() => this.aiStore.setConversations([]));
      }
    }, { allowSignalWrites: true });
  }

  toggleNewForm(): void {
    this.showNewForm.update((v) => !v);
  }

  openNewForm(): void {
    this.showNewForm.set(true);
  }

  cancelNewForm(): void {
    this.showNewForm.set(false);
    this.newTitle = '';
    this.newMode = 'TOOL_ASSISTED';
  }

  loadConversations(wsId: string): void {
    const seq = ++this.listSeq;
    this.listLoading.set(true);
    this.convApi.list(wsId).subscribe({
      next: (list) => {
        if (seq !== this.listSeq) return;
        this.aiStore.setConversations(list);
        this.listLoading.set(false);
      },
      error: () => {
        if (seq !== this.listSeq) return;
        this.listLoading.set(false);
      },
    });
  }

  selectConversation(c: AiConversation): void {
    const ws = this.adminStore.selectedWorkspaceId();
    if (!ws) return;
    const seq = ++this.detailSeq;
    this.selectedId.set(c.id);
    this.aiStore.setLoading(true);
    this.convApi.get(ws, c.id).subscribe({
      next: (res) => {
        if (seq !== this.detailSeq) return;
        this.aiStore.setActiveConversation(res.conversation);
        this.aiStore.setActiveMessages(res.messages);
        this.aiStore.setLoading(false);
      },
      error: () => {
        if (seq !== this.detailSeq) return;
        this.aiStore.setLoading(false);
      },
    });
  }

  startFromPrompt(q: QuickPrompt): void {
    this.newTitle = q.label;
    this.newMode = q.mode;
    this.showNewForm.set(true);
  }

  createConversation(): void {
    const ws = this.adminStore.selectedWorkspaceId();
    const title = this.newTitle.trim();
    if (!ws || !title || this.creating()) return;
    this.creating.set(true);
    this.convApi.create(ws, { title, agentMode: this.newMode }).subscribe({
      next: (conv) => {
        this.aiStore.upsertConversation(conv);
        this.aiStore.setActiveConversation(conv);
        this.aiStore.setActiveMessages([]);
        this.selectedId.set(conv.id);
        this.creating.set(false);
        this.cancelNewForm();
      },
      error: () => this.creating.set(false),
    });
  }
}
