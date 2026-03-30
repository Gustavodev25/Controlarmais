import { BrilhoHeader } from '../components/BrilhoHeader';
import { Header, attachHeaderListeners } from '../components/Header';
import { EmptyState, initEmptyStateLotties } from '../components/EmptyState';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { toaster } from '../components/Toast';
import { GenericDropdown, attachGenericDropdownListeners } from '../components/GenericDropdown';
import { openChangelogModal, renderTagBadge } from '../components/ChangelogModal';
import {
  deleteChangelogEntry,
  dispatchChangelogEntry,
  fetchChangelogEntries,
  getChangelogDispatchAudience,
  saveChangelogEntry,
} from '../lib/changelog';
import type { ChangelogEntry } from '../types/changelog';

let entries: ChangelogEntry[] = [];
let isLoadingEntries = true;
let emptyStateHtml = '';
let loadingStateHtml = '';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function sortEntries() {
  entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function upsertEntry(entry: ChangelogEntry) {
  const index = entries.findIndex((current) => current.id === entry.id);
  if (index === -1) {
    entries.unshift(entry);
  } else {
    entries[index] = entry;
  }
  sortEntries();
}

function getDispatchTargetLabel(entry: ChangelogEntry): string {
  return getChangelogDispatchAudience(entry.status) === 'admins' ? 'os admins' : 'todos os usuários';
}

function getDispatchActionLabel(entry: ChangelogEntry): string {
  return getChangelogDispatchAudience(entry.status) === 'admins'
    ? 'Disparar para admins'
    : 'Disparar para todos';
}

function setButtonBusy(button: HTMLButtonElement | null, busy: boolean) {
  if (!button) return;
  button.style.pointerEvents = busy ? 'none' : '';
  button.style.opacity = busy ? '0.35' : '';
}

function renderEntryRow(entry: ChangelogEntry): string {
  return `
    <tr>
      <td>
        <span style="font-family:monospace;font-size:12px;font-weight:600;color:var(--color-text);
          background:var(--color-surface-hover);border:1px solid var(--color-border);
          border-radius:5px;padding:2px 8px;white-space:nowrap;">v${entry.version}</span>
      </td>
      <td style="max-width:220px;">
        <span style="font-size:13px;color:var(--color-text);white-space:nowrap;overflow:hidden;
          text-overflow:ellipsis;display:block;" title="${entry.title}">${entry.title}</span>
      </td>
      <td>
        <span style="font-size:12px;color:var(--color-text-secondary);">${entry.tags[0] ? entry.tags[0].charAt(0).toUpperCase() + entry.tags[0].slice(1) : '—'}</span>
      </td>
      <td>
        <span style="font-size:12px;color:var(--color-text-secondary);">${entry.status === 'published' ? 'Publicado' : 'Rascunho'}</span>
      </td>
      <td>
        <span style="font-size:12px;color:var(--color-text-secondary);">${fmtDate(entry.createdAt)}</span>
      </td>
      <td style="text-align:right;">
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:2px;">
          <button class="cc-action-btn cl-btn-notify" data-id="${entry.id}" title="${getDispatchActionLabel(entry)}">
            <lottie-player src="/assets/lottie/papel.json" background="transparent" speed="1" style="width:18px;height:18px;pointer-events:none;"></lottie-player>
          </button>
          <button class="cc-action-btn cl-btn-edit" data-id="${entry.id}" title="Editar">
            <lottie-player src="/assets/lottie/info.json" background="transparent" speed="1" style="width:18px;height:18px;pointer-events:none;"></lottie-player>
          </button>
          <button class="cc-action-btn cl-btn-delete" data-id="${entry.id}" title="Excluir">
            <lottie-player src="/assets/lottie/lixeira.json" background="transparent" speed="1" style="width:18px;height:18px;pointer-events:none;"></lottie-player>
          </button>
        </div>
      </td>
    </tr>
  `;
}

function renderEntryCard(entry: ChangelogEntry): string {
  return `
    <div class="cl-card">
      <div class="cl-card-top">
        <span style="font-family:monospace;font-size:12px;font-weight:600;color:var(--color-text);
          background:var(--color-surface-hover);border:1px solid var(--color-border);
          border-radius:5px;padding:2px 8px;white-space:nowrap;">v${entry.version}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:11px;color:var(--color-text-secondary);">${fmtDate(entry.createdAt)}</span>
          <div style="position:relative;">
            <button id="cl-mob-${entry.id}" class="cc-action-btn cl-mob-trigger" data-id="${entry.id}" title="Opções">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
              </svg>
            </button>
            ${GenericDropdown({
              id: `cl-mob-${entry.id}`,
              width: '190px',
              items: [
                {
                  id: `cl-mi-ntf-${entry.id}`,
                  label: getDispatchActionLabel(entry),
                  icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
                },
                {
                  id: `cl-mi-edt-${entry.id}`,
                  label: 'Editar',
                  icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
                },
                {
                  id: `cl-mi-del-${entry.id}`,
                  label: 'Excluir',
                  icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
                  variant: 'danger',
                },
              ],
            })}
          </div>
        </div>
      </div>
      <div class="cl-card-title">${entry.title}</div>
      <div class="cl-card-meta">
        <span class="cl-card-badge">${entry.tags[0] ? entry.tags[0].charAt(0).toUpperCase() + entry.tags[0].slice(1) : '—'}</span>
        <span class="cl-card-badge">${entry.status === 'published' ? 'Publicado' : 'Rascunho'}</span>
      </div>
    </div>
  `;
}

function updateCount() {
  const el = document.getElementById('cl-count');
  if (!el) return;

  if (isLoadingEntries) {
    el.textContent = 'Carregando...';
    return;
  }

  el.textContent = `${entries.length} entr${entries.length !== 1 ? 'adas' : 'ada'}`;
}

function refreshContent() {
  const tbody = document.getElementById('cl-tbody') as HTMLTableSectionElement | null;
  const cards = document.getElementById('cl-cards') as HTMLElement | null;
  const emptyDiv = document.getElementById('cl-empty') as HTMLElement | null;
  const tableScroll = document.getElementById('cl-table-scroll') as HTMLElement | null;
  if (!tbody || !cards || !emptyDiv || !tableScroll) return;

  updateCount();

  if (isLoadingEntries) {
    tableScroll.style.display = 'none';
    cards.style.display = 'none';
    emptyDiv.style.display = '';
    emptyDiv.innerHTML = loadingStateHtml;
    initEmptyStateLotties();
    return;
  }

  if (entries.length === 0) {
    tableScroll.style.display = 'none';
    cards.style.display = 'none';
    emptyDiv.style.display = '';
    emptyDiv.innerHTML = emptyStateHtml;
    initEmptyStateLotties();
    return;
  }

  emptyDiv.style.display = 'none';
  tableScroll.style.display = '';
  cards.style.display = '';
  tbody.innerHTML = entries.map(renderEntryRow).join('');
  cards.innerHTML = entries.map(renderEntryCard).join('');
  attachRowListeners();
}

async function loadEntries() {
  isLoadingEntries = true;
  refreshContent();

  try {
    entries = await fetchChangelogEntries();
    sortEntries();
  } catch (error) {
    console.error('Erro ao carregar atualizações:', error);
    toaster.create({
      title: 'Erro ao carregar',
      description: 'Não foi possível buscar as atualizações salvas.',
      type: 'error',
    });
  } finally {
    isLoadingEntries = false;
    refreshContent();
  }
}

function openEditModal(entry: ChangelogEntry) {
  openChangelogModal(async (updated) => {
    const saved = await saveChangelogEntry(updated, entry.id);
    upsertEntry(saved);
    refreshContent();
    toaster.create({
      title: 'Salvo',
      description: 'Atualização editada com sucesso.',
      type: 'success',
    });
  }, entry);
}

function confirmDeleteEntry(entryId: string) {
  DeleteConfirmationModal({
    title: 'Excluir Atualização',
    description: 'Esta entrada será removida permanentemente da lista.',
    onConfirm: async () => {
      await deleteChangelogEntry(entryId);
      entries = entries.filter((entry) => entry.id !== entryId);
      refreshContent();
      toaster.create({ title: 'Removido', type: 'success' });
    },
  });
}

async function handleDispatchEntry(entry: ChangelogEntry, button: HTMLButtonElement | null) {
  setButtonBusy(button, true);

  try {
    const updated = await dispatchChangelogEntry(entry);
    upsertEntry(updated);
    refreshContent();
    toaster.create({
      title: 'Disparo enviado',
      description:
        updated.status === 'draft'
          ? 'Rascunho disparado apenas para os admins.'
          : 'Atualização disparada para todos os usuários.',
      type: 'success',
    });
  } catch (error) {
    console.error('Erro ao disparar atualização:', error);
    toaster.create({
      title: 'Erro ao disparar',
      description: `Não foi possível enviar esta atualização para ${getDispatchTargetLabel(entry)}.`,
      type: 'error',
    });
  } finally {
    setButtonBusy(button, false);
  }
}

function attachRowListeners() {
  document.querySelectorAll<HTMLButtonElement>('.cl-btn-notify').forEach((button) => {
    button.addEventListener('click', () => {
      const entry = entries.find((current) => current.id === button.dataset.id);
      if (!entry) return;
      void handleDispatchEntry(entry, button);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.cl-btn-edit').forEach((button) => {
    button.addEventListener('click', () => {
      const entry = entries.find((current) => current.id === button.dataset.id);
      if (!entry) return;
      openEditModal(entry);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.cl-btn-delete').forEach((button) => {
    button.addEventListener('click', () => {
      const entryId = button.dataset.id;
      if (!entryId) return;
      confirmDeleteEntry(entryId);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('.cl-mob-trigger').forEach((triggerButton) => {
    const entryId = triggerButton.dataset.id;
    if (!entryId) return;

    attachGenericDropdownListeners(`cl-mob-${entryId}`, `cl-mob-${entryId}`);

    document.getElementById(`cl-mi-ntf-${entryId}`)?.addEventListener('click', () => {
      const entry = entries.find((current) => current.id === entryId);
      if (!entry) return;
      void handleDispatchEntry(entry, triggerButton);
    });

    document.getElementById(`cl-mi-edt-${entryId}`)?.addEventListener('click', () => {
      const entry = entries.find((current) => current.id === entryId);
      if (!entry) return;
      openEditModal(entry);
    });

    document.getElementById(`cl-mi-del-${entryId}`)?.addEventListener('click', () => {
      confirmDeleteEntry(entryId);
    });
  });
}

export function renderAdminUpdates(user: any) {
  if (user?.isAdmin !== true) {
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'dashboard' } }));
    return;
  }
  const app = document.querySelector<HTMLDivElement>('#app')!;

  loadingStateHtml = EmptyState({
    title: 'Carregando atualizações',
    description: 'Buscando as entradas salvas no Firestore.',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
      style="color:var(--color-text-secondary)">
      <circle cx="12" cy="12" r="9"/>
      <path d="M12 7v5l3 3"/>
    </svg>`,
  });

  emptyStateHtml = EmptyState({
    title: 'Nenhuma atualização ainda',
    description: 'Clique em Criar para publicar a primeira novidade para os usuários.',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
      style="color:var(--color-text-secondary)">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>`,
  });

  isLoadingEntries = true;
  entries = [];

  app.innerHTML = `
    <div id="admin-shell" class="min-h-screen text-[var(--color-text)] flex flex-col relative overflow-hidden bg-[var(--color-background)]">
      ${BrilhoHeader()}
      ${Header({ user })}

      <style>
        @keyframes fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadein { animation: fadein 0.25s ease forwards; }

        .cc-table-wrapper {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          overflow: visible;
          display: flex;
          flex-direction: column;
        }
        .cc-table-header {
          padding: 12px 16px;
          border-bottom: 1px solid var(--color-border-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: wrap;
        }
        .cc-table-header-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: var(--color-text-secondary);
        }
        .cc-table-scroll { overflow-x: auto; }
        .cc-table {
          width: 100%;
          min-width: 540px;
          border-collapse: separate;
          border-spacing: 0;
        }
        .cc-table th {
          padding: 11px 16px;
          font-size: 10.5px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--color-text-secondary);
          text-align: left;
        }
        .cc-table td {
          padding: 12px 16px;
          font-size: 13px;
          border-bottom: 1px solid var(--color-border-light);
          vertical-align: middle;
        }
        .cc-table tbody tr:last-child td { border-bottom: none; }
        .cc-table tbody tr:hover { background: var(--color-surface-hover); }

        .cc-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          padding: 0;
          outline: none;
          opacity: 0.6;
          transition: opacity 0.15s;
        }
        .cc-action-btn:hover { opacity: 1; }
        .cc-action-btn:focus-visible { outline: 2px solid var(--color-text-secondary); outline-offset: 2px; }

        .cc-btn-create {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 16px;
          height: 38px;
          border-radius: 10px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
          white-space: nowrap;
          width: 100%;
        }
        .cc-btn-create:hover { background: var(--color-surface-hover); border-color: var(--color-text-secondary); }

        .cl-card {
          padding: 14px 16px;
          border-bottom: 1px solid var(--color-border-light);
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .cl-card:last-child { border-bottom: none; }
        .cl-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .cl-card-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text);
          line-height: 1.4;
        }
        .cl-card-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }
        .cl-card-badge {
          font-size: 11px;
          color: var(--color-text-secondary);
          background: var(--color-surface-hover);
          border: 1px solid var(--color-border-light);
          border-radius: 5px;
          padding: 1px 7px;
        }

        @media (min-width: 640px) {
          .cl-mobile-cards { display: none !important; }
          .cc-btn-create { width: auto; }
        }

        @media (max-width: 639px) {
          .cl-desktop-table { display: none !important; }
        }
      </style>

      <main class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-10 p-8 pt-24 md:pt-32">
        <div class="w-full animate-fadein">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 md:mb-8">
            <div>
              <h2 class="text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Atualizações</h2>
              <p class="text-[13px] text-[var(--color-text-secondary)] mt-2">Changelogs e novidades exibidas aos usuários.</p>
            </div>
            <button id="btn-create-update" class="cc-btn-create sm:w-auto">
              Criar Atualização
            </button>
          </div>

          <div class="cc-table-wrapper">
            <div class="cc-table-header">
              <span class="cc-table-header-title">Listagem de Atualizações</span>
              <span id="cl-count" style="font-size:12px;font-weight:600;color:var(--color-text-secondary);">
                Carregando...
              </span>
            </div>

            <div id="cl-table-scroll" class="cc-table-scroll cl-desktop-table" style="display:none;">
              <table class="cc-table">
                <thead>
                  <tr>
                    <th>Versão</th>
                    <th>Título</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Data</th>
                    <th style="text-align:right;">Ações</th>
                  </tr>
                </thead>
                <tbody id="cl-tbody"></tbody>
              </table>
            </div>

            <div id="cl-cards" class="cl-mobile-cards" style="display:none;"></div>

            <div id="cl-empty">
              ${loadingStateHtml}
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  attachHeaderListeners();
  initEmptyStateLotties();
  void loadEntries();

  document.getElementById('btn-create-update')?.addEventListener('click', () => {
    openChangelogModal(async (entry) => {
      const saved = await saveChangelogEntry(entry);
      upsertEntry(saved);
      refreshContent();
      toaster.create({
        title: 'Criado!',
        description: `v${saved.version} salva como ${saved.status === 'published' ? 'publicada' : 'rascunho'}.`,
        type: 'success',
      });
    });
  });
}
