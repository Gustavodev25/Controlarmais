import { Header, attachHeaderListeners } from '../components/Header';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { fetchChangelogEntries } from '../lib/changelog';
import type { ChangelogEntry, ChangelogTag } from '../types/changelog';
import gsap from 'gsap';

// ─── Tag config ───────────────────────────────────────────────────────────────

const TAG_CONFIG: Record<ChangelogTag, { label: string; color: string; bg: string }> = {
  feature:     { label: 'Novidade',     color: '#818cf8', bg: 'rgba(99,102,241,0.12)'  },
  improvement: { label: 'Melhoria',    color: '#34d399', bg: 'rgba(16,185,129,0.12)' },
  fix:         { label: 'Correção',    color: '#fbbf24', bg: 'rgba(245,158,11,0.12)'  },
  security:    { label: 'Segurança',   color: '#f87171', bg: 'rgba(239,68,68,0.10)'   },
  performance: { label: 'Performance', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)'  },
  breaking:    { label: 'Breaking',    color: '#f87171', bg: 'rgba(220,38,38,0.10)'   },
};

// ─── Timeline geometry ────────────────────────────────────────────────────────

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getDateParts(isoString: string): { day: string; monthYear: string } {
  const date = new Date(isoString);
  const day      = date.toLocaleDateString('pt-BR', { day: '2-digit' });
  const monthYear = date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
                        .replace('.', '')
                        .toLowerCase();
  return { day, monthYear };
}

// ─── Timeline spacer (contains all timeline elements) ─────────────────────────
// Returns the 40px spacer div with timeline lines/curves inside it.
// padding-bottom: 2.5rem lives on the content column so the spacer stretches
// to include the gap — giving the vertical line the correct full height.

function timelineDateColExtras(isFirst: boolean, isLast: boolean, total: number): string {
  if (total <= 1) return '';
  const LINE = `rgba(255,255,255,0.2)`;
  const DOT_TOP = 13; // aligns with centre of the "26" day number
  const DOT_H   = 7;
  const topLine    = !isFirst ? `<div style="position:absolute;right:6px;top:0;height:${DOT_TOP}px;width:1.5px;background:${LINE};"></div>` : '';
  const bottomLine = !isLast  ? `<div style="position:absolute;right:6px;top:${DOT_TOP + DOT_H}px;bottom:0;width:1.5px;background:${LINE};"></div>` : '';
  const dot        = `<div style="position:absolute;right:3px;top:${DOT_TOP}px;width:${DOT_H}px;height:${DOT_H}px;border-radius:50%;background:rgba(255,255,255,0.28);"></div>`;
  return topLine + bottomLine + dot;
}

// ─── Skeleton loading ─────────────────────────────────────────────────────────

function SkeletonItem(index: number, total: number): string {
  const titleWidths = ['58%', '48%', '68%'];
  const lineGroups  = [['88%', '72%', '58%'], ['83%', '68%'], ['86%', '62%', '78%']];
  const tw  = titleWidths[index % titleWidths.length];
  const lines = lineGroups[index % lineGroups.length];
  const isFirst = index === 0;
  const isLast  = index === total - 1;

  return `
    <div style="display: flex; align-items: flex-start; position: relative;">

      <!-- Date skeleton -->
      <div style="width: 88px; flex-shrink: 0; padding-top: 3px; padding-bottom: 2.5rem;
                  display: flex; flex-direction: column; align-items: flex-end;
                  padding-right: 18px; gap: 4px; position: relative; align-self: stretch;">
        ${timelineDateColExtras(isFirst, isLast, total)}
        <div class="skeleton-pulse" style="width: 26px; height: 20px; border-radius: 4px;"></div>
        <div class="skeleton-pulse" style="width: 42px; height: 11px; border-radius: 3px;"></div>
      </div>

      <!-- Spacer -->
      <div style="width: 16px; flex-shrink: 0;"></div>

      <!-- Content skeleton -->
      <div style="flex: 1; min-width: 0; padding-top: 2px; padding-bottom: 2.5rem;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <div class="skeleton-pulse" style="width: 38px; height: 18px; border-radius: 20px;"></div>
          <div class="skeleton-pulse" style="width: ${tw}; height: 16px; border-radius: 4px;"></div>
        </div>
        <div style="display: flex; gap: 5px; margin-bottom: 10px;">
          <div class="skeleton-pulse" style="width: 56px; height: 20px; border-radius: 20px;"></div>
          <div class="skeleton-pulse" style="width: 50px; height: 20px; border-radius: 20px;"></div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${lines.map(lw => `<div class="skeleton-pulse" style="width: ${lw}; height: 12px; border-radius: 3px;"></div>`).join('')}
        </div>
      </div>
    </div>
  `;
}

function LoadingSkeleton(): string {
  const N = 3;
  return `
    <div class="max-w-2xl mx-auto w-full px-6">
      <div style="margin-top: 8px;">
        ${Array.from({ length: N }, (_, i) => SkeletonItem(i, N)).join('')}
      </div>
    </div>
  `;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState(): string {
  return `
    <div style="display: flex; flex-direction: column; align-items: center;
                justify-content: center; padding: 80px 24px; text-align: center;">
      <div style="width: 46px; height: 46px; border-radius: 13px;
                  background: var(--color-surface); border: 1px solid var(--color-border);
                  display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
             stroke="var(--color-text-secondary)" stroke-width="1.5"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 8v4l3 3"/><circle cx="12" cy="12" r="9"/>
        </svg>
      </div>
      <p style="font-size: 15px; font-weight: 600; color: var(--color-text); margin: 0 0 6px;">
        Nenhuma atualização ainda
      </p>
      <p style="font-size: 13px; color: var(--color-text-secondary); margin: 0;
                max-width: 260px; line-height: 1.55;">
        Em breve novidades, melhorias e correções aparecerão aqui.
      </p>
    </div>
  `;
}

// ─── Entry item ───────────────────────────────────────────────────────────────

function EntryItem(
  entry: ChangelogEntry,
  isFirst: boolean,
  isLast: boolean,
  total: number,
): string {
  const { day, monthYear } = getDateParts(entry.createdAt);

  const versionBadge = entry.version
    ? `<span style="font-size: 11px; font-weight: 600; color: var(--color-text-secondary);
                   background: var(--color-surface); border: 1px solid var(--color-border);
                   padding: 2px 8px; border-radius: 20px; letter-spacing: 0.02em;
                   white-space: nowrap; margin-top: 6px; display: inline-block;">${entry.version}</span>`
    : '';

  const draftBadge = entry.status === 'draft'
    ? `<span style="font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 4px;
                   background: rgba(245,158,11,0.12); color: #fbbf24;
                   text-transform: uppercase; letter-spacing: 0.06em; flex-shrink: 0;">Rascunho</span>`
    : '';

  const tagsHtml = entry.tags?.length
    ? `<div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px;">
        ${entry.tags.map(tag => {
          const cfg = TAG_CONFIG[tag];
          return cfg
            ? `<span style="font-size: 11px; font-weight: 600; padding: 3px 9px;
                            border-radius: 20px; background: ${cfg.bg}; color: ${cfg.color};
                            letter-spacing: 0.02em; line-height: 1;">${cfg.label}</span>`
            : '';
        }).join('')}
       </div>`
    : '';

  const imageHtml = entry.imageUrl
    ? `<div style="margin-top: 14px; border-radius: 10px; overflow: hidden;
                  border: 1px solid var(--color-border-light);">
         <img src="${entry.imageUrl}" alt="${entry.title}"
              style="width: 100%; height: auto; display: block;" />
       </div>`
    : '';

  return `
    <div class="changelog-item"
         style="opacity: 0; transform: translateY(10px);
                display: flex; align-items: flex-start; position: relative;">

      <!-- Date + timeline line/dot -->
      <div style="width: 88px; flex-shrink: 0; padding-top: 2px; padding-bottom: 2.5rem;
                  display: flex; flex-direction: column; align-items: flex-end;
                  padding-right: 18px; position: relative; user-select: none; align-self: stretch;">
        ${timelineDateColExtras(isFirst, isLast, total)}
        <span style="font-size: 20px; font-weight: 700; color: var(--color-text);
                     line-height: 1.15; letter-spacing: -0.02em;">${day}</span>
        <span style="font-size: 11px; font-weight: 500; color: var(--color-text-secondary);
                     margin-top: 2px; letter-spacing: 0.01em;">${monthYear}</span>
        ${versionBadge}
      </div>

      <!-- Spacer -->
      <div style="width: 16px; flex-shrink: 0;"></div>

      <!-- Content -->
      <div class="changelog-entry-content"
           style="flex: 1; min-width: 0; padding: 6px 10px 4px; padding-bottom: calc(2.5rem + 4px);
                  margin: -6px -10px 0; border-radius: 10px;
                  transition: background 0.15s ease; cursor: default;">

        <!-- Title row -->
        <div style="display: flex; align-items: center; gap: 7px;
                    flex-wrap: wrap; margin-bottom: 6px; line-height: 1;">
          <h2 style="font-size: 15px; font-weight: 600; color: var(--color-text);
                     margin: 0; line-height: 1.4;">${entry.title}</h2>
          ${draftBadge}
        </div>

        <!-- Tags -->
        ${tagsHtml}

        <!-- Rich content -->
        <div class="update-content"
             style="font-size: 13.5px; line-height: 1.65; color: var(--color-text-secondary);">
          ${entry.content}
          ${imageHtml}
        </div>

      </div>
    </div>
  `;
}

// ─── Page content ─────────────────────────────────────────────────────────────

function UpdatesContent(entries: ChangelogEntry[], isLoading: boolean): string {
  if (isLoading) return LoadingSkeleton();

  const valid = entries.filter(e => e.status === 'published' || e.status === 'draft');
  if (valid.length === 0) return EmptyState();

  const last = valid.length - 1;
  const itemsHtml = valid
    .map((e, i) => EntryItem(e, i === 0, i === last, valid.length))
    .join('');

  return `
    <div class="max-w-2xl mx-auto w-full px-6">
      <div id="updates-timeline" style="margin-top: 8px; position: relative;">
        ${itemsHtml}
      </div>
    </div>
  `;
}

// ─── Render ───────────────────────────────────────────────────────────────────

export function renderUpdates(user: any) {
  const app = document.getElementById('app')!;
  sessionStorage.setItem('currentPage', 'updates');

  app.innerHTML = `
    <div id="updates-shell"
         class="min-h-screen text-[var(--color-text)] flex flex-col relative bg-[var(--color-background)]">
      ${BrilhoHeader()}
      ${Header({ user })}

      <style>
        /* Skeleton shimmer */
        @keyframes skeleton-shimmer {
          0%, 100% { opacity: 0.38; }
          50%       { opacity: 0.65; }
        }
        .skeleton-pulse {
          background: var(--color-surface-hover);
          animation: skeleton-shimmer 1.6s ease-in-out infinite;
        }

        /* Rich content styles */
        .update-content b,
        .update-content strong { font-weight: 600; color: var(--color-text); }
        .update-content i      { font-style: italic; opacity: 0.9; }
        .update-content ul     { padding-left: 1.1rem; margin: 0.4rem 0; list-style: none; }
        .update-content li     { margin-bottom: 0.3rem; position: relative; padding-left: 0.15rem; }
        .update-content li::before {
          content: '·';
          position: absolute; left: -0.9rem;
          color: var(--color-text-secondary); font-size: 1.2em; line-height: 1.2;
        }
        .update-content ol     { padding-left: 1.2rem; margin: 0.4rem 0; }
        .update-content ol li  { list-style-type: decimal; padding-left: 0; }
        .update-content ol li::before { content: none; }
        .update-content p      { margin-bottom: 0.55rem; }
        .update-content p:last-child { margin-bottom: 0; }
        .update-content a      { color: #D97757; text-decoration: underline; text-underline-offset: 3px; }
        .update-content img    { border-radius: 9px; border: 1px solid var(--color-border-light); margin-top: 10px; }
        .update-content code {
          font-family: 'JetBrains Mono', monospace;
          background: var(--color-surface-hover);
          padding: 0.12rem 0.32rem;
          border-radius: 4px; font-size: 0.82em;
          border: 1px solid var(--color-border);
        }
        .update-content h3,
        .update-content h4 {
          font-weight: 600; color: var(--color-text);
          margin: 0.7rem 0 0.3rem; font-size: 0.88em;
        }

        /* Entry hover */
        .changelog-entry-content:hover { background: var(--color-surface-hover); }
      </style>

      <main class="flex-1 w-full pt-28 md:pt-36 pb-20">

        <!-- Header -->
        <div class="max-w-2xl mx-auto w-full px-6 mb-10 opacity-0" id="header-text">
          <div style="display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;">
            <h1 style="font-size: clamp(22px, 3.5vw, 28px); font-weight: 700;
                       color: var(--color-text); letter-spacing: -0.03em;
                       margin: 0; line-height: 1.1;">
              Atualizações
            </h1>
          </div>
          <p style="font-size: 13px; color: var(--color-text-secondary);
                    margin: 5px 0 0; line-height: 1.5;">
            Novidades, melhorias e correções do sistema.
          </p>
        </div>

        <!-- Dynamic content -->
        <div id="updates-dynamic-content" class="w-full">
          ${UpdatesContent([], true)}
        </div>

      </main>
    </div>
  `;

  attachHeaderListeners();

  const loadPageData = async () => {
    try {
      const globalEntries = await fetchChangelogEntries();
      const valid = globalEntries.filter(e => e.status === 'published' || e.status === 'draft');

      const contentEl = document.getElementById('updates-dynamic-content');
      if (contentEl) {
        contentEl.innerHTML = UpdatesContent(globalEntries, false);


        const tl = gsap.timeline();
        tl.to('#header-text', { opacity: 1, y: 0, duration: 0.45, ease: 'power2.out' });
        tl.to('.changelog-item', {
          opacity: 1, y: 0,
          duration: 0.4,
          stagger: 0.07,
          ease: 'power2.out',
        }, '-=0.25');
      }
    } catch (err) {
      console.error(err);
    }
  };

  setTimeout(() => loadPageData(), 100);
}
