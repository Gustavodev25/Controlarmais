import gsap from 'gsap';
import { Modal } from './Modal';
import { toaster } from './Toast';
import { DynamicIsland } from './DynamicIsland';
import type {
  ChangelogEntry,
  ChangelogInput,
  ChangelogNotificationAction,
  ChangelogStatus,
  ChangelogTag,
} from '../types/changelog';

export type { ChangelogEntry, ChangelogInput, ChangelogNotificationAction, ChangelogStatus, ChangelogTag } from '../types/changelog';

export const TAG_CONFIG: Record<ChangelogTag, { label: string; color: string; bg: string }> = {
  feature:     { label: 'Atualização',   color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  improvement: { label: 'Melhoria',      color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  fix:         { label: 'Correção',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  security:    { label: 'Segurança',     color: '#ef4444', bg: 'rgba(239,68,68,0.08)'  },
  performance: { label: 'Performance',   color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  breaking:    { label: 'Manutenção',    color: '#dc2626', bg: 'rgba(220,38,38,0.08)'  },
};

export function renderTagBadge(tag: ChangelogTag): string {
  const { label, color, bg } = TAG_CONFIG[tag];
  return `<span style="display:inline-flex;align-items:center;font-size:10px;font-weight:600;padding:2px 8px;border-radius:5px;color:${color};background:${bg};white-space:nowrap;">${label}</span>`;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function toolBtn(cmd: string, title: string, inner: string): string {
  return `<button type="button" class="cl-tool" data-cmd="${cmd}" title="${title}"
    style="width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;
    border:none;background:transparent;border-radius:5px;cursor:pointer;
    color:var(--color-text-secondary);transition:all 0.12s;">${inner}</button>`;
}

const SEP = `<div style="width:1px;height:12px;background:var(--color-border);margin:0 2px;flex-shrink:0;opacity:0.6;"></div>`;

function labelEl(text: string): string {
  return `<label style="display:block;font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-secondary);opacity:0.6;margin-bottom:5px;">${text}</label>`;
}

// ── Modal content builder ──────────────────────────────────────────────────

function buildModalContent(existing?: ChangelogEntry): string {
  const v          = existing?.version  ?? '';
  const t          = existing?.title    ?? '';
  const c          = existing?.content  ?? '';
  const img        = existing?.imageUrl ?? '';
  const activeTags = existing?.tags     ?? [];
  const status     = existing?.status   ?? 'draft';

  const TAG_KEYS    = Object.keys(TAG_CONFIG) as ChangelogTag[];
  const _initTagIdx = activeTags.length > 0 ? Math.max(0, TAG_KEYS.indexOf(activeTags[0])) : 0;
  const _initTagKey = TAG_KEYS[_initTagIdx];
  const { label: _initTagLabel, color: _initTagColor } = TAG_CONFIG[_initTagKey];

  const isDraft = status === 'draft';
  const isPub   = status === 'published';

  // Preview initial values
  const _tmpPrev = document.createElement('div');
  _tmpPrev.innerHTML = c;
  const _initSnippet = (_tmpPrev.textContent || '').trim().slice(0, 110);
  const _initLabel   = _initTagLabel;
  const _hasImg      = !!img;

  return `
<style>
  .cl-tool:hover { background: var(--color-surface-hover) !important; color: var(--color-text) !important; }
  .cl-tag-nav-btn {
    display:flex;align-items:center;justify-content:center;
    width:28px;height:28px;border-radius:8px;border:none;
    background:transparent;color:var(--color-text-secondary);
    cursor:pointer;transition:background 0.2s,color 0.2s;flex-shrink:0;
  }
  .cl-tag-nav-btn:hover { background:var(--color-surface-hover);color:var(--color-text); }
  .cl-tag-nav-btn:active { transform:scale(0.92); }
  .cl-tag-nav-btn:hover { background:var(--color-surface-hover) !important; color:var(--color-text) !important; }
  .cl-tag-nav-btn:active { transform:scale(0.92); }
  #cl-editor { position: relative; }
  #cl-editor:empty::before {
    content: attr(data-placeholder);
    color: var(--color-text-secondary);
    opacity: 0.5;
    pointer-events: none;
  }
  #cl-editor b, #cl-editor strong { font-weight: 700; }
  #cl-editor i, #cl-editor em { font-style: italic; }
  #cl-editor code {
    font-family: 'Fira Code', 'SF Mono', 'Cascadia Code', 'Menlo', monospace;
    font-size: 0.87em;
    background: linear-gradient(135deg, rgba(148,163,184,0.14) 0%, rgba(100,116,139,0.08) 100%);
    border: 1px solid rgba(148,163,184,0.22);
    border-radius: 4px;
    padding: 1px 6px;
    color: var(--color-text);
  }
  #cl-editor a { color: #6366f1; text-decoration: underline; }
  #cl-editor img { max-width: 100%; border-radius: 8px; margin: 6px 0; display: block; }
  #cl-editor ul { padding-left: 18px; margin: 4px 0; }
  #cl-editor li { margin: 3px 0; }
  #cl-modal-grid {
    display: grid !important;
    grid-template-columns: 1fr 1px 320px;
    column-gap: 0;
    row-gap: 0;
    align-items: stretch;
    margin-top: 0 !important;
  }
  @media (max-width: 680px) {
    #cl-preview-col, #cl-col-divider { display: none !important; }
    #cl-modal-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 520px) {
    #cl-modal-grid > div:first-child { padding: 14px 14px 18px !important; }
    #cl-fields-row { flex-wrap: wrap !important; }
    #cl-fields-row > div:first-child { flex: 0 0 100% !important; }
    #cl-fields-row > div:not(:first-child) { flex: 1 1 calc(50% - 5px) !important; min-width: 0 !important; }
  }
  .modal-container [id$="-footer"] { justify-content: flex-end !important; padding: 12px 22px !important; }
  .modal-container [id$="-submit"] { width: auto !important; min-width: 120px; flex-shrink: 0; font-size: 13px !important; }
</style>

<div id="cl-modal-grid">
<div style="display:flex;flex-direction:column;gap:14px;padding:18px 22px 22px;min-width:0;">

  <!-- Versão + Status + Tipo -->
  <div id="cl-fields-row" style="display:flex;gap:10px;align-items:flex-end;">
    <div style="flex:0 0 128px;">
      ${labelEl('Versão')}
      <div style="position:relative;display:flex;align-items:center;">
        <span style="position:absolute;left:10px;font-family:monospace;font-size:12px;font-weight:600;
          color:var(--color-text-secondary);pointer-events:none;user-select:none;opacity:0.7;">v</span>
        <input name="cl-version" id="cl-version" type="text" value="${v}" placeholder="1.0.0"
          style="width:100%;border:1px solid var(--color-border);border-radius:8px;
            background:var(--color-surface-hover);padding:0 10px 0 24px;height:36px;
            font-size:13px;font-weight:500;color:var(--color-text);font-family:monospace;
            outline:none;box-sizing:border-box;transition:border-color 0.15s;"
          onfocus="this.style.borderColor='var(--color-text-secondary)'"
          onblur="this.style.borderColor='var(--color-border)'" />
      </div>
    </div>

    <div style="flex:1;">
      ${labelEl('Status')}
      <div id="cl-status-pill" style="display:flex;align-items:center;
        border:1px solid var(--color-border);border-radius:8px;padding:2px;height:36px;box-sizing:border-box;
        background:var(--color-surface-hover);transform-origin:center center;">
        <button id="cl-status-prev" type="button" class="cl-tag-nav-btn" aria-label="Status anterior">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div id="cl-status-selector-wrap" style="flex:1;display:flex;align-items:center;justify-content:center;
          gap:7px;overflow:hidden;padding:0 2px;">
          <span id="cl-status-dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;flex-shrink:0;
            background:${isDraft ? 'var(--color-text-secondary)' : '#10b981'};"></span>
          <span id="cl-status-text" style="font-size:13px;font-weight:400;letter-spacing:-0.01em;
            color:var(--color-text);white-space:nowrap;">${isDraft ? 'Rascunho' : 'Publicado'}</span>
        </div>
        <button id="cl-status-next" type="button" class="cl-tag-nav-btn" aria-label="Próximo status">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <input type="hidden" name="cl-status" id="cl-status-hidden" value="${status}" />
    </div>

    <div style="flex:1;">
      ${labelEl('Tipo')}
      <div id="cl-tag-pill" style="display:flex;align-items:center;
        border:1px solid var(--color-border);border-radius:8px;padding:2px;height:36px;box-sizing:border-box;
        background:var(--color-surface-hover);transform-origin:center center;">
        <button id="cl-tag-prev" type="button" class="cl-tag-nav-btn" aria-label="Tag anterior">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div id="cl-tag-selector-wrap" style="flex:1;display:flex;align-items:center;justify-content:center;
          gap:7px;overflow:hidden;padding:0 2px;">
          <span id="cl-tag-dot" style="display:inline-block;width:6px;height:6px;border-radius:50%;flex-shrink:0;
            background:${_initTagColor};"></span>
          <span id="cl-tag-text" style="font-size:13px;font-weight:400;letter-spacing:-0.01em;
            color:var(--color-text);white-space:nowrap;">${_initTagLabel}</span>
        </div>
        <button id="cl-tag-next" type="button" class="cl-tag-nav-btn" aria-label="Próxima tag">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <input type="hidden" name="cl-tags" id="cl-tags-hidden" value='${JSON.stringify([_initTagKey])}' />
    </div>
  </div>

  <!-- Título -->
  <div>
    ${labelEl('Título')}
    <input name="cl-title" id="cl-title" type="text" value="${t}"
      placeholder="Ex: Novo painel de análise financeira"
      style="width:100%;border:1px solid var(--color-border);border-radius:8px;
        background:var(--color-surface-hover);padding:0 11px;height:36px;font-size:13px;
        color:var(--color-text);outline:none;box-sizing:border-box;transition:border-color 0.15s;"
      onfocus="this.style.borderColor='var(--color-text-secondary)'"
      onblur="this.style.borderColor='var(--color-border)'" />
  </div>

  <!-- Descrição (rich editor) -->
  <div>
    ${labelEl('Descrição')}
    <div id="cl-editor-wrap" style="border:1px solid var(--color-border);border-radius:8px;
      overflow:hidden;transition:border-color 0.15s;">

      <!-- Toolbar -->
      <div id="cl-toolbar" style="display:flex;align-items:center;gap:1px;padding:4px 7px;
        border-bottom:1px solid var(--color-border);background:var(--color-surface-hover);">
        ${toolBtn('bold',   'Negrito (Ctrl+B)',  '<b style="font-size:12px;">B</b>')}
        ${toolBtn('italic', 'Itálico (Ctrl+I)',  '<i style="font-size:12px;">I</i>')}
        ${toolBtn('code',   'Código', '<span style="font-family:monospace;font-size:10px;letter-spacing:-0.03em;">&lt;/&gt;</span>')}
        ${SEP}
        ${toolBtn('link', 'Inserir Link',
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>')}
        ${toolBtn('image', 'Inserir Imagem',
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>')}
        ${SEP}
        ${toolBtn('ul', 'Lista',
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>')}
      </div>

      <!-- Editable area -->
      <div id="cl-editor" contenteditable="true"
        data-placeholder="Descreva as novidades desta versão…"
        style="min-height:140px;max-height:260px;overflow-y:auto;padding:11px 13px;
          outline:none;font-size:13px;line-height:1.75;
          color:var(--color-text);background:var(--color-surface-hover);">${c}</div>
    </div>
    <input type="hidden" name="cl-content" id="cl-content-hidden" value="" />
  </div>

  <!-- Imagem do card (opcional) -->
  <div>
    ${labelEl('Imagem do Card')}
    <input name="cl-image" id="cl-image" type="text" value="${img}"
      placeholder="https://exemplo.com/imagem.png"
      style="width:100%;border:1px solid var(--color-border);border-radius:8px;
        background:var(--color-surface-hover);padding:0 11px;height:36px;font-size:13px;
        color:var(--color-text);outline:none;box-sizing:border-box;transition:border-color 0.15s;"
      onfocus="this.style.borderColor='var(--color-text-secondary)'"
      onblur="this.style.borderColor='var(--color-border)'" />
    <div id="cl-image-preview" style="margin-top:7px;border-radius:8px;overflow:hidden;
      border:1px solid var(--color-border);${img ? '' : 'display:none;'}">
      <img id="cl-image-preview-img" src="${img}" alt=""
        style="width:100%;height:150px;object-fit:cover;display:block;" />
    </div>
  </div>

</div>

<!-- Divider -->
<div id="cl-col-divider" style="background:var(--color-border-light);align-self:stretch;width:1px;"></div>

<!-- Right: Live Preview -->
<div id="cl-preview-col" style="min-width:0;display:flex;flex-direction:column;transition:background 0.25s;">

  <!-- Header: label + theme toggle (full-width, with side padding) -->
  <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;flex-shrink:0;">
    <span style="font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.07em;color:var(--color-text-secondary);opacity:0.6;">Preview</span>
    <button type="button" id="cl-preview-theme-toggle" title="Alternar tema claro/escuro"
      style="width:24px;height:24px;border-radius:6px;border:1px solid var(--color-border);
        background:transparent;cursor:pointer;color:var(--color-text-secondary);
        display:flex;align-items:center;justify-content:center;transition:all 0.13s;flex-shrink:0;"
      onmouseover="this.style.background='var(--color-surface-hover)'"
      onmouseout="this.style.background='transparent'">
      <svg id="cl-preview-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    </button>
  </div>

  <!-- Full-width horizontal divider (no side margins) -->
  <div style="height:1px;background:var(--color-border-light);flex-shrink:0;"></div>

  <!-- Preview card area (centered, fills remaining space) -->
  <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:20px 16px;">
    <div style="width:100%;border:1px solid var(--color-border);border-radius:14px;overflow:hidden;background:var(--color-surface);">
      <div style="position:relative;height:130px;overflow:hidden;">
        <div id="cl-preview-grain" style="position:absolute;inset:0;z-index:0;${_hasImg ? 'display:none;' : ''}"></div>
        <img id="cl-preview-img-el" src="${img}" alt=""
          style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:${_hasImg ? 'block' : 'none'};" />
        <span id="cl-preview-version"
          style="position:absolute;top:10px;left:10px;z-index:2;font-family:monospace;font-size:11px;font-weight:700;color:rgba(255,255,255,0.9);white-space:nowrap;
            ${_hasImg ? 'background:rgba(0,0,0,0.35);backdrop-filter:blur(8px);border-radius:5px;padding:2px 8px;' : 'text-shadow:0 1px 4px rgba(0,0,0,0.25);'}">v${v || '—'}</span>
        <div id="cl-preview-label-wrap"
          style="position:absolute;inset:0;z-index:1;display:${_hasImg ? 'none' : 'flex'};align-items:center;justify-content:center;pointer-events:none;">
          <span id="cl-preview-label" style="font-size:16px;font-weight:600;color:#fff;letter-spacing:-0.02em;text-shadow:0 1px 12px rgba(0,0,0,0.2);">${_initLabel}</span>
        </div>
      </div>
      <div style="padding:12px 14px 14px;display:flex;flex-direction:column;gap:8px;">
        <p id="cl-preview-title" style="margin:0;font-size:13px;font-weight:600;color:var(--color-text);line-height:1.4;">${t || 'Título da atualização'}</p>
        <p id="cl-preview-snippet" style="margin:0;font-size:12px;color:var(--color-text-secondary);line-height:1.6;${_initSnippet ? '' : 'display:none;'}">${_initSnippet}</p>
        <div style="display:flex;align-items:center;justify-content:center;width:100%;font-size:12px;font-weight:500;color:var(--color-text);background:var(--color-surface-hover);border:1px solid var(--color-border);border-radius:8px;padding:7px 13px;box-sizing:border-box;">Saber mais...</div>
      </div>
    </div>
  </div>

</div>

</div>`;
}

// ── Paste sanitizer ────────────────────────────────────────────────────────

function sanitizeForEditor(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  function esc(t: string) {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return esc(node.textContent || '');
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el   = node as Element;
    const tag  = el.tagName.toLowerCase();
    const kids = Array.from(el.childNodes).map(walk).join('');

    switch (tag) {
      case 'b': case 'strong':              return `<b>${kids}</b>`;
      case 'i': case 'em':                  return `<i>${kids}</i>`;
      case 'code':                          return `<code>${kids}</code>`;
      case 'pre': {
        const inner = (el.querySelector('code') || el).textContent || '';
        return `<code>${esc(inner)}</code>`;
      }
      case 'ul': case 'ol':                 return `<ul>${kids}</ul>`;
      case 'li':                            return `<li>${kids}</li>`;
      case 'a': {
        const href = el.getAttribute('href') || '';
        return href ? `<a href="${esc(href)}">${kids}</a>` : kids;
      }
      case 'img': {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || '';
        return src ? `<img src="${esc(src)}" alt="${esc(alt)}" />` : '';
      }
      case 'br':                            return '<br>';
      case 'p': case 'div':                 return kids ? `${kids}<br>` : '';
      case 'h1': case 'h2': case 'h3':
      case 'h4': case 'h5': case 'h6':     return `<b>${kids}</b><br>`;
      default:                              return kids;
    }
  }

  let out = Array.from(doc.body.childNodes).map(walk).join('');
  out = out.replace(/(<br\s*\/?>\s*){3,}/gi, '<br><br>');
  out = out.replace(/(<br\s*\/?>)+$/i, '');
  return out;
}

// ── Public API ─────────────────────────────────────────────────────────────

export function openChangelogModal(
  onSave: (entry: ChangelogInput) => void | Promise<void>,
  existing?: ChangelogEntry
) {
  Modal({
    title: existing ? 'Editar Atualização' : 'Nova Atualização',
    maxWidth: 'max-w-[900px]',
    fieldsPadding: 'p-0',
    confirmText: 'Salvar',
    content: buildModalContent(existing),
    onConfirm: async (data) => {
      const version  = (data['cl-version'] as string)?.trim();
      const title    = (data['cl-title']   as string)?.trim();
      const content  = (data['cl-content'] as string) ?? '';
      const imageUrl = (data['cl-image']   as string)?.trim() || undefined;
      const status   = (data['cl-status']  as ChangelogStatus) ?? 'draft';
      let tags: ChangelogTag[] = [];
      try { tags = JSON.parse(data['cl-tags'] as string ?? '[]'); } catch { /* noop */ }

      if (!version) {
        toaster.create({ title: 'Campo obrigatório', description: 'Informe a versão.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }
      if (!title) {
        toaster.create({ title: 'Campo obrigatório', description: 'Informe o título.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }

      onSave({ version, title, content, imageUrl, tags, status });
    }
  });

  // Post-render: attach interactive listeners
  setTimeout(() => {
    const editor       = document.getElementById('cl-editor')        as HTMLDivElement   | null;
    const contentHid   = document.getElementById('cl-content-hidden') as HTMLInputElement | null;
    const tagsHid      = document.getElementById('cl-tags-hidden')    as HTMLInputElement | null;
    const statusHid    = document.getElementById('cl-status-hidden')  as HTMLInputElement | null;
    const editorWrap   = document.getElementById('cl-editor-wrap');
    if (!editor || !contentHid) return;

    // ── Preview refs ────────────────────────────────────────────────────────
    const prevGrain     = document.getElementById('cl-preview-grain');
    const prevImgEl     = document.getElementById('cl-preview-img-el')   as HTMLImageElement | null;
    const prevVersion   = document.getElementById('cl-preview-version');
    const prevLabelWrap = document.getElementById('cl-preview-label-wrap');
    const prevLabel     = document.getElementById('cl-preview-label');
    const prevTitle     = document.getElementById('cl-preview-title');
    const prevSnippet   = document.getElementById('cl-preview-snippet');
    let prevGrainMounted = !!(existing?.imageUrl === undefined ? true : !existing?.imageUrl);

    // Mount Grainient in preview if no initial image
    if (prevGrain && !existing?.imageUrl) {
      mountGrainient(prevGrain);
      prevGrainMounted = true;
    }

    function syncPreviewImage(url: string) {
      if (!prevImgEl || !prevGrain || !prevLabelWrap || !prevVersion) return;
      if (url) {
        prevImgEl.src = url;
        prevImgEl.style.display = 'block';
        prevGrain.style.display = 'none';
        prevLabelWrap.style.display = 'none';
        prevVersion.style.cssText += ';background:rgba(0,0,0,0.35);backdrop-filter:blur(8px);border-radius:5px;padding:2px 8px;text-shadow:none;';
      } else {
        prevImgEl.style.display = 'none';
        prevGrain.style.display = '';
        prevLabelWrap.style.display = 'flex';
        prevVersion.style.background = '';
        prevVersion.style.backdropFilter = '';
        prevVersion.style.borderRadius = '';
        prevVersion.style.padding = '';
        prevVersion.style.textShadow = '0 1px 4px rgba(0,0,0,0.25)';
        if (!prevGrainMounted) { mountGrainient(prevGrain); prevGrainMounted = true; }
      }
    }

    // Init hidden value with current editor HTML
    contentHid.value = editor.innerHTML;
    editor.addEventListener('input', () => {
      contentHid.value = editor.innerHTML;
      // Update preview snippet
      const text = (editor.textContent || '').trim();
      const snip = text.length > 110 ? text.slice(0, 110) + '…' : text;
      if (prevSnippet) { prevSnippet.textContent = snip; prevSnippet.style.display = snip ? '' : 'none'; }
    });

    // Paste: preserve formatting from ChatGPT / rich sources
    editor.addEventListener('paste', (e) => {
      e.preventDefault();
      const rawHtml  = e.clipboardData?.getData('text/html') || '';
      const rawPlain = e.clipboardData?.getData('text/plain') || '';
      const toInsert = rawHtml
        ? sanitizeForEditor(rawHtml)
        : rawPlain.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
      document.execCommand('insertHTML', false, toInsert);
      contentHid.value = editor.innerHTML;
      const snip = (editor.textContent || '').trim().slice(0, 110);
      if (prevSnippet) { prevSnippet.textContent = snip; prevSnippet.style.display = snip ? '' : 'none'; }
    });

    // Focus border
    editor.addEventListener('focus', () => { if (editorWrap) editorWrap.style.borderColor = 'var(--color-text-secondary)'; });
    editor.addEventListener('blur',  () => { if (editorWrap) editorWrap.style.borderColor = 'var(--color-border)'; });

    // Version → preview
    document.getElementById('cl-version')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      if (prevVersion) prevVersion.textContent = `v${val || '—'}`;
    });

    // Title → preview
    document.getElementById('cl-title')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value.trim();
      if (prevTitle) prevTitle.textContent = val || 'Título da atualização';
    });

    // ── Toolbar ────────────────────────────────────────────────────────────
    document.querySelectorAll('.cl-tool').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // keep editor focused
        const cmd = (btn as HTMLElement).dataset.cmd!;
        if      (cmd === 'bold')   document.execCommand('bold',   false);
        else if (cmd === 'italic') document.execCommand('italic', false);
        else if (cmd === 'code')   wrapInCode();
        else if (cmd === 'ul')     document.execCommand('insertUnorderedList', false);
        else if (cmd === 'link') {
          const url = prompt('URL do link:');
          if (url) document.execCommand('createLink', false, url);
        } else if (cmd === 'image') {
          const url = prompt('URL da imagem:');
          if (url) document.execCommand('insertImage', false, url);
        }
        contentHid.value = editor.innerHTML;
      });
    });

    // ── Tag selector (MonthSelector-style arrow navigation) ───────────────
    const TAG_KEYS_RT = Object.keys(TAG_CONFIG) as ChangelogTag[];
    const _activeTags = existing?.tags ?? [];
    let tagIdx = _activeTags.length > 0
      ? Math.max(0, TAG_KEYS_RT.indexOf(_activeTags[0]))
      : 0;
    const tagDotEl  = document.getElementById('cl-tag-dot');
    const tagTextEl = document.getElementById('cl-tag-text');

    const syncTag = () => {
      const key = TAG_KEYS_RT[tagIdx];
      const { label, color } = TAG_CONFIG[key];
      if (tagDotEl)  tagDotEl.style.background = color;
      if (tagTextEl) tagTextEl.textContent = label;
      if (tagsHid)   tagsHid.value = JSON.stringify([key]);
      if (prevLabel) prevLabel.textContent = label;
    };
    syncTag();

    const slideTag = (dir: 'prev' | 'next') => {
      const wrap = document.getElementById('cl-tag-selector-wrap');
      const pill = document.getElementById('cl-tag-pill');
      const xOut = dir === 'next' ? -22 : 22;
      const xIn  = dir === 'next' ?  22 : -22;
      if (wrap) {
        gsap.killTweensOf([wrap, pill]);
        const tl = gsap.timeline();
        if (pill) tl.to(pill, { scaleX: 1.1, scaleY: 0.88, duration: 0.12, ease: 'power1.out' }, 0);
        tl.to(wrap, { x: xOut, opacity: 0, duration: 0.12, ease: 'power1.in',
          onComplete: () => {
            syncTag();
            gsap.set(wrap, { x: xIn });
          }
        }, 0);
        if (pill) tl.to(pill, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.2,0.4)', clearProps: 'transform' }, 0.12);
        tl.to(wrap, { x: 0, opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.15);
      } else {
        syncTag();
      }
    };

    document.getElementById('cl-tag-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      tagIdx = (tagIdx - 1 + TAG_KEYS_RT.length) % TAG_KEYS_RT.length;
      slideTag('prev');
    });

    document.getElementById('cl-tag-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      tagIdx = (tagIdx + 1) % TAG_KEYS_RT.length;
      slideTag('next');
    });

    // ── Image preview + preview card ───────────────────────────────────────
    const imageInput      = document.getElementById('cl-image')             as HTMLInputElement  | null;
    const imagePreview    = document.getElementById('cl-image-preview');
    const imagePreviewImg = document.getElementById('cl-image-preview-img') as HTMLImageElement | null;
    if (imageInput) {
      imageInput.addEventListener('input', () => {
        const url = imageInput.value.trim();
        if (imagePreviewImg) imagePreviewImg.src = url;
        if (imagePreview) imagePreview.style.display = url ? '' : 'none';
        syncPreviewImage(url);
      });
    }

    // ── Status selector (MonthSelector-style arrow navigation) ────────────
    const STATUS_KEYS_RT = ['draft', 'published'] as const;
    const STATUS_META: Record<string, { label: string; color: string }> = {
      draft:     { label: 'Rascunho', color: 'var(--color-text-secondary)' },
      published: { label: 'Publicado', color: '#10b981' },
    };
    let statusIdx = existing?.status === 'published' ? 1 : 0;
    const statusDotEl  = document.getElementById('cl-status-dot');
    const statusTextEl = document.getElementById('cl-status-text');

    const syncStatus = () => {
      const key = STATUS_KEYS_RT[statusIdx];
      const { label, color } = STATUS_META[key];
      if (statusDotEl)  statusDotEl.style.background = color;
      if (statusTextEl) statusTextEl.textContent = label;
      if (statusHid)    statusHid.value = key;
    };
    syncStatus();

    const slideStatus = (dir: 'prev' | 'next') => {
      const wrap = document.getElementById('cl-status-selector-wrap');
      const pill = document.getElementById('cl-status-pill');
      const xOut = dir === 'next' ? -22 : 22;
      const xIn  = dir === 'next' ?  22 : -22;
      if (wrap) {
        gsap.killTweensOf([wrap, pill]);
        const tl = gsap.timeline();
        if (pill) tl.to(pill, { scaleX: 1.1, scaleY: 0.88, duration: 0.12, ease: 'power1.out' }, 0);
        tl.to(wrap, { x: xOut, opacity: 0, duration: 0.12, ease: 'power1.in',
          onComplete: () => {
            syncStatus();
            gsap.set(wrap, { x: xIn });
          }
        }, 0);
        if (pill) tl.to(pill, { scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.2,0.4)', clearProps: 'transform' }, 0.12);
        tl.to(wrap, { x: 0, opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.15);
      } else {
        syncStatus();
      }
    };

    document.getElementById('cl-status-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      statusIdx = (statusIdx - 1 + STATUS_KEYS_RT.length) % STATUS_KEYS_RT.length;
      slideStatus('prev');
    });
    document.getElementById('cl-status-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      statusIdx = (statusIdx + 1) % STATUS_KEYS_RT.length;
      slideStatus('next');
    });

    // ── Preview theme toggle (dark ↔ light) ───────────────────────────────
    const sunSvgPaths = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
    const moonSvgPath = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" stroke="none"/>`;
    let previewIsLight = false;
    const previewCol = document.getElementById('cl-preview-col');
    document.getElementById('cl-preview-theme-toggle')?.addEventListener('click', () => {
      previewIsLight = !previewIsLight;
      const icon = document.getElementById('cl-preview-icon');
      if (!previewCol || !icon) return;
      if (previewIsLight) {
        previewCol.style.background = '#f8fafc';
        previewCol.style.setProperty('--color-surface', '#ffffff');
        previewCol.style.setProperty('--color-surface-hover', '#f1f5f9');
        previewCol.style.setProperty('--color-text', '#0f172a');
        previewCol.style.setProperty('--color-text-secondary', '#64748b');
        previewCol.style.setProperty('--color-border', '#e2e8f0');
        previewCol.style.setProperty('--color-border-light', '#e2e8f0');
        icon.innerHTML = moonSvgPath;
        icon.setAttribute('fill', 'currentColor');
        icon.setAttribute('stroke', 'none');
      } else {
        previewCol.style.background = '';
        previewCol.style.removeProperty('--color-surface');
        previewCol.style.removeProperty('--color-surface-hover');
        previewCol.style.removeProperty('--color-text');
        previewCol.style.removeProperty('--color-text-secondary');
        previewCol.style.removeProperty('--color-border');
        previewCol.style.removeProperty('--color-border-light');
        icon.innerHTML = sunSvgPaths;
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', 'currentColor');
      }
    });
  }, 100);
}

// ── Mount Grainient (WebGL, exact reactbits.dev implementation) ────────────

function mountGrainient(container: HTMLElement): void {
  import('react').then(({ createElement }) => {
    import('react-dom/client').then(({ createRoot }) => {
      import('./Grainient').then(({ default: Grainient }) => {
        const root = createRoot(container);
        root.render(createElement(Grainient, {
          color1: '#e56c56',
          color2: '#ed9b7e',
          color3: '#e96f4c',
          timeSpeed: 2.7,
          colorBalance: -0.16,
          warpStrength: 2.3,
          warpFrequency: 5,
          warpSpeed: 2,
          warpAmplitude: 50,
          blendAngle: 0,
          blendSoftness: 0.05,
          rotationAmount: 500,
          noiseScale: 2,
          grainAmount: 0.1,
          grainScale: 2,
          grainAnimated: false,
          contrast: 1.5,
          gamma: 1,
          saturation: 1,
          centerX: 0,
          centerY: 0,
          zoom: 0.9,
        }));
      });
    });
  });
}

// ── Changelog notification (bottom-right popup) ───────────────────────────

let activeNotificationKey: string | null = null;

export function openChangelogDetailsModal(entry: ChangelogEntry) {
  const imageHtml = entry.imageUrl
    ? `<img src="${entry.imageUrl}" alt="" style="width:100%;height:220px;object-fit:cover;display:block;border-radius:12px;" />`
    : '';

  const tagHtml = entry.tags.length > 0
    ? entry.tags.map((tag) => renderTagBadge(tag)).join('')
    : '<span style="font-size:12px;color:var(--color-text-secondary);">Sem categoria</span>';

  Modal({
    title: entry.title,
    maxWidth: 'max-w-[720px]',
    showCancel: false,
    showConfirm: false,
    content: `
      <div style="display:flex;flex-direction:column;gap:16px;">
        ${imageHtml}
        <div style="display:flex;flex-wrap:wrap;align-items:center;gap:8px;">
          <span style="font-family:monospace;font-size:12px;font-weight:700;color:var(--color-text);
            background:var(--color-surface-hover);border:1px solid var(--color-border);border-radius:6px;padding:3px 9px;">
            v${entry.version}
          </span>
          ${tagHtml}
        </div>
        <div style="font-size:14px;line-height:1.75;color:var(--color-text);display:flex;flex-direction:column;gap:10px;">
          ${entry.content}
        </div>
      </div>
    `,
  });
}

export function showChangelogNotification(
  entry: ChangelogEntry,
  options: {
    notificationKey?: string;
    onDismiss?: (action: ChangelogNotificationAction) => void | Promise<void>;
  } = {},
) {
  const notificationKey = options.notificationKey ?? null;
  if (notificationKey && activeNotificationKey === notificationKey) return;
  if (notificationKey) activeNotificationKey = notificationKey;
  const id  = `cl-notif-${Math.random().toString(36).slice(2, 9)}`;
  const cid = `${id}-content`;

  // Plain-text snippet from HTML content
  const tmp = document.createElement('div');
  tmp.innerHTML = entry.content;
  const plain   = (tmp.textContent || '').trim();
  const snippet = plain.length > 110 ? plain.slice(0, 110) + '…' : plain;

  // Label: first tag name or fallback
  const notifLabel = entry.tags.length > 0 ? TAG_CONFIG[entry.tags[0]].label : 'Atualização';

  const closeSvg = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  // Image block: version overlay top-left, X top-right (same style as WelcomeModal)
  const imageBlock = entry.imageUrl ? `
    <div style="position:relative;flex-shrink:0;">
      <img src="${entry.imageUrl}" alt="" style="width:100%;height:130px;object-fit:cover;display:block;" />
      <span style="position:absolute;top:12px;left:12px;font-family:monospace;font-size:11px;font-weight:700;
        color:#fff;background:rgba(0,0,0,0.35);backdrop-filter:blur(8px);border-radius:5px;padding:2px 9px;white-space:nowrap;">v${entry.version}</span>
      <button id="${id}-close" type="button"
        style="position:absolute;top:12px;right:12px;width:30px;height:30px;border-radius:50%;
          background:rgba(0,0,0,0.35);backdrop-filter:blur(8px);border:none;cursor:pointer;
          display:flex;align-items:center;justify-content:center;color:#fff;transition:background 0.2s;"
        onmouseover="this.style.background='rgba(0,0,0,0.55)'"
        onmouseout="this.style.background='rgba(0,0,0,0.35)'">${closeSvg}</button>
    </div>` : `
    <div id="${id}-grain-bg" style="position:relative;width:100%;height:130px;overflow:hidden;">
      <div id="${id}-grain-canvas" style="position:absolute;inset:0;z-index:0;"></div>
      <span style="position:absolute;top:12px;left:12px;z-index:2;font-family:monospace;font-size:11px;
        font-weight:700;color:rgba(255,255,255,0.9);white-space:nowrap;
        text-shadow:0 1px 4px rgba(0,0,0,0.25);">v${entry.version}</span>
      <button id="${id}-close" type="button"
        style="position:absolute;top:12px;right:12px;z-index:2;width:30px;height:30px;border-radius:50%;
          background:rgba(0,0,0,0.25);backdrop-filter:blur(8px);border:none;cursor:pointer;
          display:flex;align-items:center;justify-content:center;color:#fff;transition:background 0.2s;"
        onmouseover="this.style.background='rgba(0,0,0,0.45)'"
        onmouseout="this.style.background='rgba(0,0,0,0.25)'">${closeSvg}</button>
      <div style="position:absolute;inset:0;z-index:1;display:flex;align-items:center;justify-content:center;pointer-events:none;">
        <span style="font-size:17px;font-weight:600;color:#fff;letter-spacing:-0.02em;
          text-shadow:0 1px 12px rgba(0,0,0,0.2);">${notifLabel}</span>
      </div>
    </div>`;

  const inner = `
    <div style="display:flex;flex-direction:column;width:100%;">
      ${imageBlock}
      <div style="padding:12px 16px 14px;display:flex;flex-direction:column;gap:9px;">
        <p style="margin:0;font-size:13px;font-weight:600;color:var(--color-text);line-height:1.4;">${entry.title}</p>
        ${snippet ? `<p style="margin:0;font-size:12px;color:var(--color-text-secondary);line-height:1.65;">${snippet}</p>` : ''}
        <button id="${id}-view"
          style="display:flex;align-items:center;justify-content:center;gap:5px;width:100%;
            font-size:12px;font-weight:500;color:var(--color-text);background:var(--color-surface-hover);
            border:1px solid var(--color-border);border-radius:8px;padding:7px 13px;
            cursor:pointer;transition:border-color 0.15s;box-sizing:border-box;"
          onmouseover="this.style.borderColor='var(--color-text-secondary)'"
          onmouseout="this.style.borderColor='var(--color-border)'">
          Saber mais...
        </button>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="${id}-wrapper" style="position:fixed;bottom:24px;right:24px;z-index:9998;pointer-events:none;">
      ${DynamicIsland({
        id,
        content: inner,
        contentWrapperId: cid,
        className: 'pointer-events-auto shadow-2xl',
        style: 'width:300px;',
        hidden: true,
      })}
    </div>
  `);

  const wrapper = document.getElementById(`${id}-wrapper`)!;
  const card    = document.getElementById(id)!;

  // Mount animated grain gradient for no-image entries
  if (!entry.imageUrl) {
    const grainCanvas = document.getElementById(`${id}-grain-canvas`);
    if (grainCanvas) mountGrainient(grainCanvas);
  }

  const contentEl = document.getElementById(cid);
  let isDismissing = false;

  const dismiss = (action: ChangelogNotificationAction) => {
    if (isDismissing) return;
    isDismissing = true;
    if (notificationKey && activeNotificationKey === notificationKey) {
      activeNotificationKey = null;
    }
    void options.onDismiss?.(action);
    gsap.to(card, {
      x: 20, opacity: 0, scale: 0.94,
      duration: 0.2, ease: 'power2.in',
      onComplete: () => wrapper.remove(),
    });
  };

  // Entrance — single timeline, no conflicts
  card.classList.remove('dynamic-island--hidden');
  gsap.set(card, { x: 28, opacity: 0, scaleX: 0.9, scaleY: 0.9 });
  if (contentEl) gsap.set(contentEl, { opacity: 0 });

  const tl = gsap.timeline();
  tl.to(card, { x: 0, opacity: 1, scaleX: 1, scaleY: 1, duration: 0.4, ease: 'back.out(1.6)' });
  if (contentEl) tl.to(contentEl, { opacity: 1, duration: 0.2, ease: 'power2.out' }, 0.1);

  document.getElementById(`${id}-close`)?.addEventListener('click', () => dismiss('close'));
  document.getElementById(`${id}-view`)?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'updates' } }));
    dismiss('view');
  });
}

// ── Rich-text helpers ──────────────────────────────────────────────────────

function wrapInCode() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (range.collapsed) return;
  const text = range.toString();
  range.deleteContents();
  const code = document.createElement('code');
  code.textContent = text;
  range.insertNode(code);
  const next = document.createRange();
  next.setStartAfter(code);
  next.collapse(true);
  sel.removeAllRanges();
  sel.addRange(next);
}
