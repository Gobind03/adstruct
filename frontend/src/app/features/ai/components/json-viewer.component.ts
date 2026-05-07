import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';

type JsonTokenKind = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'punct' | 'plain';

export interface JsonToken {
  kind: JsonTokenKind;
  text: string;
}

@Component({
  selector: 'app-json-viewer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (invalid()) {
      <pre class="json-block json-invalid" role="status"><code>{{ raw() }}</code></pre>
      <span class="json-error-hint">Invalid JSON</span>
    } @else {
      <pre class="json-block json-ok"><code>
        @for (t of tokens(); track $index) {
          <span [class]="'tok-' + t.kind">{{ t.text }}</span>
        }
      </code></pre>
    }
  `,
  styles: [`
    :host { display: block; }
    .json-block {
      margin: 0;
      padding: 10px 12px;
      border-radius: var(--radius-md, 8px);
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      line-height: 1.45;
      overflow: auto;
      max-height: 280px;
      border: 1px solid var(--border-default, rgba(0,0,0,.12));
      background: var(--mat-sys-surface-container-low, #f8f9fa);
      color: var(--text-primary, #1a1a1a);
      white-space: pre-wrap;
      word-break: break-word;
    }
    .json-invalid {
      border-color: #f5c6cb;
      background: #fdf3f4;
    }
    .json-error-hint {
      display: block;
      margin-top: 4px;
      font-size: 11px;
      color: #b71c1c;
    }
    .tok-key { color: #7c3aed; font-weight: 600; }
    .tok-string { color: #0d9488; }
    .tok-number { color: #2563eb; }
    .tok-boolean { color: #c2410c; font-weight: 500; }
    .tok-null { color: #6b7280; font-style: italic; }
    .tok-punct { color: var(--text-muted, #6b7280); }
    .tok-plain { color: inherit; }
  `],
})
export class JsonViewerComponent {
  readonly json = input<string>('');

  readonly raw = computed(() => this.json() ?? '');

  readonly invalid = computed(() => {
    const s = (this.json() ?? '').trim();
    if (!s) return false;
    try {
      JSON.parse(s);
      return false;
    } catch {
      return true;
    }
  });

  readonly tokens = computed(() => {
    const s = (this.json() ?? '').trim();
    if (!s) return [];
    let pretty: string;
    try {
      pretty = JSON.stringify(JSON.parse(s), null, 2);
    } catch {
      return [];
    }
    return tokenizeJsonPretty(pretty);
  });
}

function tokenizeJsonPretty(text: string): JsonToken[] {
  const out: JsonToken[] = [];
  let i = 0;
  const n = text.length;

  const push = (kind: JsonTokenKind, t: string) => {
    if (t) out.push({ kind, text: t });
  };

  while (i < n) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      let esc = false;
      while (j < n) {
        if (esc) {
          esc = false;
          j++;
          continue;
        }
        if (text[j] === '\\') {
          esc = true;
          j++;
          continue;
        }
        if (text[j] === '"') {
          j++;
          break;
        }
        j++;
      }
      const slice = text.slice(i, j);
      const after = text.slice(j).match(/^\s*:/) ? 'key' : 'string';
      push(after, slice);
      i = j;
      continue;
    }

    if (/[{}[\],:]/.test(c)) {
      push('punct', c);
      i++;
      continue;
    }

    if (/\s/.test(c)) {
      let j = i;
      while (j < n && /\s/.test(text[j])) j++;
      push('plain', text.slice(i, j));
      i = j;
      continue;
    }

    let j = i;
    while (j < n && !/[\s"{}[\],:]/.test(text[j])) j++;
    const word = text.slice(i, j);
    if (word === 'true' || word === 'false') push('boolean', word);
    else if (word === 'null') push('null', word);
    else if (/^-?\d/.test(word)) push('number', word);
    else push('plain', word);
    i = j;
  }

  return out;
}
