import { Header, attachHeaderListeners } from '../components/Header';
import { API_BASE } from '../lib/apiConfig';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { EmptyState, initEmptyStateLotties } from '../components/EmptyState';
import { openBankConnectModal } from '../components/BankConnectModal';
import { auth } from '../lib/firebase';
import { updateDoc } from 'firebase/firestore';
import { toaster } from '../components/Toast';
import { GenericDropdown, attachGenericDropdownListeners } from '../components/GenericDropdown';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { useTheme } from '../components/ThemeManager';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { getSyncCredits } from '../lib/syncCredits';
import gsap from 'gsap';
import { getPluggyDocRef, loadPluggyRecords } from '../lib/pluggyFirestore';
import { SYNC_COMBOS } from '../components/SyncCreditsModal';
import { openSyncCreditsCheckout } from '../components/SyncCreditsCheckout';
import { Tooltip, injectTooltipStyles, initAllTooltips, attachTooltipListeners } from '../components/Tooltip';

/* ─────────────────────────────────────────────────────────────────────────────
   Animação Líquida Dinâmica — Bank Cards Entrance
───────────────────────────────────────────────────────────────────────────── */

function animateBankCardsEntrance() {
  const cards = document.querySelectorAll<HTMLElement>('.bank-card-liquid');
  if (!cards.length) return;

  // Inject hover CSS once
  if (!document.getElementById('bank-card-hover-style')) {
    const style = document.createElement('style');
    style.id = 'bank-card-hover-style';
    style.textContent = `
      .bank-card-liquid {
        transition: none;
      }
      .bank-card-logo {
        transition: none;
      }
    `;
    document.head.appendChild(style);
  }

  cards.forEach((card, i) => {
    const header = card.querySelector<HTMLElement>('.bank-card-header');
    const logo = card.querySelector<HTMLElement>('.bank-card-logo');
    const balance = card.querySelector<HTMLElement>('.bank-card-balance');
    const footer = card.querySelector<HTMLElement>('.bank-card-footer');

    gsap.killTweensOf([card, header, logo, balance, footer].filter(Boolean));

    const baseDelay = i * 0.08;
    const tl = gsap.timeline({ delay: baseDelay });

    // 1. Card — anticipação + surge líquido
    tl.fromTo(card,
      { scaleX: 1.05, scaleY: 0.84, opacity: 0, y: 28, borderRadius: '22px' },
      { scaleX: 0.97, scaleY: 1.04, opacity: 1, y: -4, borderRadius: '13px', duration: 0.28, ease: 'power3.out' },
      0
    );
    tl.to(card, {
      scaleX: 1, scaleY: 1, y: 0, borderRadius: '16px',
      duration: 0.6, ease: 'elastic.out(1.2, 0.4)', clearProps: 'transform,borderRadius'
    });

    // 2. Logo — pop com glow ring
    if (logo) {
      tl.fromTo(logo,
        { scale: 0.3, opacity: 0, rotation: -15, boxShadow: '0 0 0 0px rgba(255,255,255,0)' },
        { scale: 1.12, opacity: 1, rotation: 2, boxShadow: '0 0 0 4px rgba(255,255,255,0.1)', duration: 0.26, ease: 'power3.out' },
        0.06
      );
      tl.to(logo, {
        scale: 1, rotation: 0, boxShadow: '0 0 0 0px rgba(255,255,255,0)',
        duration: 0.5, ease: 'elastic.out(1.25, 0.4)', clearProps: 'all'
      });
    }

    // 3. Header text — nome e subtítulo cascade
    if (header) {
      const title = header.querySelector('h4');
      const sub = header.querySelector('p');
      const els = [title, sub].filter(Boolean);
      if (els.length) {
        gsap.set(els, { opacity: 0, x: -8, filter: 'blur(5px)' });
        tl.to(els, {
          opacity: 1, x: 0, filter: 'blur(0px)',
          duration: 0.28, stagger: 0.04, ease: 'power2.out', clearProps: 'all'
        }, 0.1);
      }
    }

    // 4. Balance — R$ e dígitos separados
    if (balance) {
      const label = balance.querySelector('p');
      const currency = balance.querySelector('span:first-of-type');
      const digits = balance.querySelector('span:nth-of-type(2)');
      const els = [label, currency, digits].filter(Boolean);

      if (els.length >= 2) {
        gsap.set(els, { opacity: 0, y: 8, filter: 'blur(6px)' });
        tl.to(els, {
          opacity: 1, y: 0, filter: 'blur(0px)',
          duration: 0.28, stagger: 0.04, ease: 'power2.out', clearProps: 'all'
        }, 0.14);
        tl.fromTo(balance,
          { scaleX: 0.92, scaleY: 1.08 },
          { scaleX: 1, scaleY: 1, duration: 0.48, ease: 'elastic.out(1.12, 0.44)', clearProps: 'all' },
          0.14
        );
      } else {
        tl.fromTo(balance,
          { opacity: 0, y: 12, scaleX: 0.88, scaleY: 1.12, filter: 'blur(10px)' },
          { opacity: 1, y: -3, scaleX: 1.03, scaleY: 0.97, filter: 'blur(0px)', duration: 0.26, ease: 'power3.out' },
          0.14
        );
        tl.to(balance, { y: 0, scaleX: 1, scaleY: 1, duration: 0.5, ease: 'elastic.out(1.15, 0.42)', clearProps: 'all' });
      }
    }

    // 5. Footer + sync — slide up suave
    const footerEls = [footer, card.querySelector<HTMLElement>('.relative.border-t:last-child')].filter(Boolean);
    if (footerEls.length) {
      gsap.set(footerEls, { opacity: 0, y: 6, filter: 'blur(3px)' });
      tl.to(footerEls, {
        opacity: 1, y: 0, filter: 'blur(0px)',
        duration: 0.25, stagger: 0.04, ease: 'power2.out', clearProps: 'all'
      }, 0.18);
    }

    // 6. Shadow pump
    tl.fromTo(card,
      { boxShadow: '0 1px 2px -1px rgba(0,0,0,0.03)' },
      { boxShadow: '0 8px 24px -4px rgba(0,0,0,0.2), 0 2px 8px -2px rgba(0,0,0,0.1)', duration: 0.45, ease: 'power2.out', clearProps: 'boxShadow' },
      0.04
    );
  });
}

function ConnectedAccountsContent(): string {
  return `
    <div class="w-full animate-fadein">
      <!-- Header row -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Bancos Conectados</h2>
          <p class="text-[13px] text-[var(--color-text-secondary)] mt-2">Gerencie suas conexões bancárias de forma segura e automática.</p>
        </div>
        <div class="flex items-center gap-3">

          <div class="relative">
            <div id="connect-credits-display" class="hidden items-center gap-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-secondary)] px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-200">
              <!-- Preenchido via JS -->
            </div>
            ${GenericDropdown({
    id: 'credits-purchase',
    width: '240px',
    items: SYNC_COMBOS.map(combo => ({
      id: `buy-combo-${combo.id}`,
      label: `
                  <div class="flex flex-col gap-0.5 w-full text-left">
                    <div class="flex items-center justify-between w-full">
                      <span class="font-bold text-[13px] text-[var(--color-text)]">${combo.name}</span>
                      <div class="flex items-baseline gap-0.5">
                        <span class="text-[9px] text-[var(--color-text-secondary)] font-medium">R$</span>
                        <span class="text-[#D97757] font-bold text-[15px]">${combo.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).split(',')[0]}</span>
                        <span class="text-[10px] text-[var(--color-text-secondary)] font-medium">,${combo.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 }).split(',')[1]}</span>
                      </div>
                    </div>
                    <span class="text-[10px] text-[var(--color-text-secondary)] font-medium opacity-60">
                      ${combo.credits === 9999 ? 'Acesso ilimitado' : `${combo.credits} Coins`}
                    </span>
                  </div>
                `,
      icon: `<img src="/assets/logo/coinzinha.png" style="width: 18px; height: 18px; object-fit: contain;" class="lottie-dropdown-icon" />`
    }))
  })}
          </div>
          <button id="btn-connect-bank-header" class="bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-200">
            Conectar conta
          </button>
        </div>
      </div>

      <!-- Empty state / List goes here -->
      <div id="accounts-list-container" class="mt-8">
        <div class="flex flex-col items-center justify-center p-12 text-center opacity-50">
           <div class="w-8 h-8 border-2 border-[var(--color-text-secondary)] border-t-[var(--color-text)] rounded-full animate-spin mb-4"></div>
           <p class="text-[13px] text-[var(--color-text-secondary)]">Carregando contas...</p>
        </div>
      </div>
    </div>
  `;
}

export function renderConnectedBanks(user: any) {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  injectTooltipStyles();

  sessionStorage.setItem('currentPage', 'connected-banks');
  sessionStorage.removeItem('currentTab');

  app.innerHTML = `
    <div class="min-h-screen text-[var(--color-text)] flex flex-col relative overflow-hidden bg-[var(--color-background)]">
      ${BrilhoHeader()}
      ${Header({ user })}

      <style>
        @keyframes fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadein { animation: fadein 0.25s ease forwards; }

        @keyframes aurora-flow {
          0% { transform: scaleX(1) translateX(0); opacity: 0.06; }
          100% { transform: scaleX(1.4) translateY(-2px) translateX(-10px); opacity: 0.14; }
        }
        .animate-aurora {
          animation: aurora-flow 6s cubic-bezier(0.25, 0.1, 0.25, 1) infinite alternate;
          transform-origin: center right;
        }

        /* Garantir que tooltips não sejam cortados */
        .account-card, 
        .account-card > div:last-child {
          overflow: visible !important;
        }

        /* Expand/collapse dos detalhes */
        .account-details-panel {
          height: 0;
          overflow: hidden;
        }
        .account-details-inner {
          overflow: hidden;
        }

        /* Chevron animado */
        .chevron-icon {
          /* Animado via GSAP */
        }

      </style>

      <main class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-10 p-8 pt-24 md:pt-32">
        <div class="w-full px-2 md:px-0">
          ${ConnectedAccountsContent()}
        </div>
      </main>
    </div>
  `;

  attachHeaderListeners();
  initEmptyStateLotties();

  document.getElementById('btn-connect-bank-header')?.addEventListener('click', openBankConnectModal);
  attachGenericDropdownListeners('connect-credits-display', 'credits-purchase');



  updateConnectButtonCredits(user.uid);
  loadConnectedAccounts(user.uid);

  const syncHandler = () => {
    updateConnectButtonCredits(user.uid);
    loadConnectedAccounts(user.uid);
  };

  window.addEventListener('app-sync-completed', syncHandler);

  window.addEventListener('app-navigate', () => {
    window.removeEventListener('app-sync-completed', syncHandler);
  }, { once: true });
}

async function deleteConnection(itemId: string) {
  DeleteConfirmationModal({
    title: 'Excluir Conexão',
    description: 'Tem certeza que deseja desconectar esta instituição? Todas as contas vinculadas serão removidas.',
    onConfirm: async () => {
      const cards = document.querySelectorAll(`.account-card[data-item-id="${itemId}"]`);
      cards.forEach(card => {
        const loader = card.querySelector('.card-loader-overlay');
        if (loader) {
          loader.classList.remove('opacity-0', 'pointer-events-none');
          loader.classList.add('opacity-100');
        }
      });

      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();

        const API_BASE_URL = API_BASE;

        const res = await fetch(`${API_BASE_URL}/api/pluggy/items/${itemId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Falha ao excluir conexão');

        toaster.create({ title: "Sucesso", description: "Conexão removida com sucesso.", type: "success" });
        window.dispatchEvent(new CustomEvent('app-sync-completed'));

      } catch (error) {
        console.error(error);
        toaster.create({ title: "Erro", description: "Não foi possível remover a conexão.", type: "error" });

        cards.forEach(card => {
          const loader = card.querySelector('.card-loader-overlay');
          if (loader) {
            loader.classList.add('opacity-0', 'pointer-events-none');
            loader.classList.remove('opacity-100');
          }
        });
      }
    }
  });
}

async function renameInstitution(itemId: string, currentName: string) {
  Modal({
    title: 'Renomear Instituição',
    content: `
      <div class="space-y-4">
        <p class="text-[13px] text-[var(--color-text-secondary)]">Defina um apelido para facilitar a identificação desta instituição.</p>
        ${Input({
      id: 'new-institution-name',
      label: 'Apelido',
      type: 'text',
      value: currentName,
      required: true,
      placeholder: 'Ex: Minha Conta Principal'
    })}
      </div>
    `,
    confirmText: 'Salvar',
    showCancel: false,
    onConfirm: async (data: any) => {
      const newName = data['new-institution-name'];
      if (!newName || newName === currentName) return;

      try {
        const user = auth.currentUser;
        if (!user) return;

        // Precisamos atualizar o campo 'institution.name' em TODOS os documentos de conta (accounts) com este itemId para o usuário
        const accountDocs = (await loadPluggyRecords<any>(user.uid, 'accounts', {
          dedupe: false
        })).filter((accountDoc) => accountDoc.itemId === itemId);

        const promises = accountDocs.map((accountDoc) =>
          updateDoc(getPluggyDocRef(accountDoc), {
            'institution.name': newName
          })
        );

        await Promise.all(promises);

        toaster.create({ title: "Sucesso", description: "Instituição renomeada.", type: "success" });
        window.dispatchEvent(new CustomEvent('app-sync-completed'));
      } catch (error) {
        console.error('Erro ao renomear instituição:', error);
        toaster.create({ title: "Erro", description: "Não foi possível renomear.", type: "error" });
      }
    }
  });
}

// Atualiza o botão de conectar conta com a quantidade de créditos
async function updateConnectButtonCredits(userId: string) {
  const display = document.getElementById('connect-credits-display');
  if (display) {
    const balance = await getSyncCredits(userId);

    display.classList.add(
      'sync-tooltip',
      'bg-[var(--color-surface)]',
      'border',
      'border-[var(--color-border)]',
      'text-[var(--color-text-secondary)]',
      'transition-all',
      'duration-200'
    );

    let balanceHTML = '';
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const displayValue = balance.extra >= 9999 ? '<span class="text-[18px] inline-flex items-center translate-y-[1px]">∞</span>' : balance.extra;

    if (balance.extra > 0) {
      balanceHTML = `<span class="text-[var(--color-text)] text-[12px] font-medium">Você tem <span class="font-bold">${displayValue} Coins</span></span>`;
    } else {
      balanceHTML = ` <span class="text-[var(--color-text)] text-[12px]">Comprar Coins</span>`;
    }

    display.innerHTML = `
      <div class="flex items-center gap-2 h-full">
        ${balanceHTML}
        <lottie-player src="${isDark ? '/assets/lottie/adicionar.json' : '/assets/lottie/adicionarpreto.json'}" background="transparent" speed="1" style="width: 18px; height: 18px;" class="lottie-dropdown-icon" autoplay loop></lottie-player>
      </div>
    `;

    // ── Prender listeners nos itens do dropdown de compra ──
    SYNC_COMBOS.forEach(combo => {
      const btn = document.getElementById(`buy-combo-${combo.id}`);
      if (btn) {
        btn.onclick = () => {
          const user = auth.currentUser;
          if (user) openSyncCreditsCheckout(user, combo);
        };
      }
    });

    display.setAttribute('data-tooltip-text', '• Grátis: 1 sincronização a cada 24h\n• Coins: Sincronize a qualquer momento');
    attachTooltipListeners('connect-credits-display');
    display.classList.remove('hidden');
    display.classList.add('flex');
  }
}

async function syncAccount(itemId: string, lastSyncDateISO?: string) {
  try {
    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();

    const API_BASE_URL = API_BASE;

    toaster.create({ title: "Sincronizando", description: "Solicitando dados ao banco...", type: "message" });

    const res = await fetch(`${API_BASE_URL}/api/pluggy/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        itemId,
        fullHistory: false,
        autoRefresh: true,
        ...(lastSyncDateISO ? { from: lastSyncDateISO } : {})
      })
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 429 && data.needsExtraCredit) {
        // Já sincronizou — informa que pode usar crédito extra via ícone da moeda
        toaster.create({
          title: "Já sincronizado",
          description: "Use o ícone de Coin para sincronizar a qualquer momento.",
          type: "warning"
        });
        return;
      }
      throw new Error(data.error || 'Erro na sincronização');
    }

    const successDescription = data.isRefreshing
      ? 'Aguardando o banco enviar os dados mais recentes...'
      : 'Dados sincronizados com sucesso!';

    toaster.create({ title: "Sucesso", description: successDescription, type: "success" });
    window.dispatchEvent(new CustomEvent('app-sync-completed'));

    // Atualiza o display de créditos no botão de conectar
    updateConnectButtonCredits(user.uid);
  } catch (error: any) {
    console.error(error);
    toaster.create({ title: "Erro", description: error.message, type: "error" });
  }
}

// ====================== HELPERS ======================

function resolveAccountSyncDate(account: any): string | null {
  const candidates = [
    account?.lastSync,
    account?.updatedAt,
    account?.lastSyncStartedAt,
    account?.transactionsSyncCursorAt
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const parsed = new Date(candidate);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return null;
}

function getItemLastSyncDate(accounts: any[]): string {
  const latestSync = accounts.reduce<number | null>((latest, account) => {
    const syncDate = resolveAccountSyncDate(account);
    if (!syncDate) return latest;

    const syncTime = new Date(syncDate).getTime();
    if (Number.isNaN(syncTime)) return latest;
    if (latest === null || syncTime > latest) return syncTime;
    return latest;
  }, null);

  return latestSync !== null
    ? new Date(latestSync).toISOString()
    : new Date(0).toISOString();
}

function timeSince(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return 'há poucos segundos';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} hora${hours > 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} dia${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} m${months > 1 ? 'eses' : 'ês'}`;
  return 'há mais de um ano';
}

function formatBRL(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

/** Ícone e label por tipo de conta */
function getAccountTypeMeta(type: string): { label: string; icon: string; color: string; dot: string } {
  switch (type) {
    case 'CREDIT':
      return {
        label: 'Cartão de Crédito',
        color: '#D97757',
        dot: 'bg-[#D97757]',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>`
      };
    case 'SAVINGS':
      return {
        label: 'Poupança',
        color: '#34d399',
        dot: 'bg-emerald-400',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>`
      };
    default:
      return {
        label: 'Conta Corrente',
        color: '#60a5fa',
        dot: 'bg-blue-400',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>`
      };
  }
}

/** Agrupa contas por tipo e consolida sub-contas para exibição minimalista */
function buildMinimalAccountRows(accs: any[]): string {
  // Separate accounts by type
  const byType = new Map<string, any[]>();
  accs.forEach(a => {
    const t = a.type || 'BANK';
    if (!byType.has(t)) byType.set(t, []);
    byType.get(t)!.push(a);
  });

  const rows: string[] = [];

  // Process each type group
  byType.forEach((group, type) => {
    const meta = getAccountTypeMeta(type);
    const isCredit = type === 'CREDIT';

    if (isCredit) {
      // Credit cards: show each one as a simple row
      group.forEach(acc => {
        const available = acc.creditData?.availableCreditLimit ?? acc.balance ?? 0;
        const limit = acc.creditData?.creditLimit ?? null;
        const usagePercent = limit && limit > 0 ? Math.round(((limit - available) / limit) * 100) : null;
        
        rows.push(`
          <div class="flex items-center justify-between py-2.5">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-1.5 h-1.5 rounded-full ${meta.dot} shrink-0"></div>
              <span class="text-[12px] text-[var(--color-text)] truncate">${acc.name || meta.label}</span>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              ${usagePercent !== null ? `<span class="text-[10px] text-[var(--color-text-secondary)]">${usagePercent}% usado</span>` : ''}
              <span class="text-[12px] font-medium ${available >= 0 ? 'text-emerald-400' : 'text-red-400'}">R$ ${formatBRL(available)}</span>
            </div>
          </div>
        `);
      });
    } else {
      // Bank accounts: separate active (balance > 0) from inactive
      const active = group.filter(a => (a.balance ?? 0) !== 0);
      const inactive = group.filter(a => (a.balance ?? 0) === 0);

      // Show active accounts individually
      active.forEach(acc => {
        const balance = acc.balance ?? 0;
        const accountNumber = acc.number ? ` · ${acc.number}` : '';
        rows.push(`
          <div class="flex items-center justify-between py-2.5">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-1.5 h-1.5 rounded-full ${meta.dot} shrink-0"></div>
              <span class="text-[12px] text-[var(--color-text)] truncate">${acc.name || meta.label}</span>
              <span class="text-[10px] text-[var(--color-text-secondary)] opacity-50">${meta.label}${type === 'SAVINGS' ? accountNumber : ''}</span>
            </div>
            <span class="text-[12px] font-medium ${balance >= 0 ? 'text-[var(--color-text)]' : 'text-red-400'} shrink-0">R$ ${formatBRL(balance)}</span>
          </div>
        `);
      });

      // Consolidate inactive accounts into one summary row
      if (inactive.length > 0) {
        const label = inactive.length === 1
          ? `${inactive[0].name || meta.label}${type === 'SAVINGS' && inactive[0].number ? ` · ${inactive[0].number}` : ''}`
          : `${inactive.length} ${meta.label.toLowerCase()}${inactive.length > 1 && !meta.label.toLowerCase().endsWith('s') ? 's' : ''}`;
        rows.push(`
          <div class="flex items-center justify-between py-2.5 opacity-40">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-1.5 h-1.5 rounded-full ${meta.dot} shrink-0 opacity-50"></div>
              <span class="text-[12px] text-[var(--color-text)] truncate">${label}</span>
              ${inactive.length > 1 ? `<span class="text-[10px] text-[var(--color-text-secondary)]">sem saldo</span>` : ''}
            </div>
            <span class="text-[12px] text-[var(--color-text-secondary)] shrink-0">R$ 0,00</span>
          </div>
        `);
      }
    }
  });

  return rows.join(`<div class="border-b border-[var(--color-border)] opacity-30"></div>`);
}

// ====================== LOAD & RENDER ======================

let syncCountdownInterval: any = null;

async function loadConnectedAccounts(userId: string) {
  if (syncCountdownInterval) clearInterval(syncCountdownInterval);
  const container = document.getElementById('accounts-list-container');
  if (!container) return;

  try {
    const [accounts, creditsBalance] = await Promise.all([
      loadPluggyRecords<any>(userId, 'accounts'),
      getSyncCredits(userId)
    ]);
    const extraCredits = creditsBalance.extra;

    if (accounts.length === 0) {
      container.innerHTML = `
        <div class="mt-4">
          ${EmptyState({
        title: 'Nenhum banco conectado',
        description: 'Conecte sua primeira conta para sincronizar automaticamente suas transações, faturas e saldo.',
        icon: ''
      })}
        </div>
      `;
      initEmptyStateLotties();
      document.getElementById('btn-connect-first-bank')?.addEventListener('click', openBankConnectModal);
      return;
    }

    // ── Agrupa contas por itemId ──
    const grouped = new Map<string, any[]>();
    accounts.forEach(acc => {
      const key = acc.itemId || acc.id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(acc);
    });

    // ── Ordena sub-contas: CREDIT por último ──
    grouped.forEach((accs, key) => {
      grouped.set(key, accs.sort((a, b) => {
        if (a.type === 'CREDIT' && b.type !== 'CREDIT') return 1;
        if (a.type !== 'CREDIT' && b.type === 'CREDIT') return -1;
        return 0;
      }));
    });

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
        ${Array.from(grouped.entries()).map(([itemId, accs]) => {
      const rep = accs[0];
      const lastSync = getItemLastSyncDate(accs);
      const detailsId = `details-panel-${itemId.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const chevronId = `chevron-${itemId.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const btnDetailsId = `btn-details-${itemId.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const bankAccounts = accs.filter(a => a.type !== 'CREDIT');
      const creditAccounts = accs.filter(a => a.type === 'CREDIT');

      const summaryParts: string[] = [];
      if (bankAccounts.length > 0) summaryParts.push(`${bankAccounts.length} conta${bankAccounts.length > 1 ? 's' : ''}`);
      if (creditAccounts.length > 0) summaryParts.push(`${creditAccounts.length} cartão${creditAccounts.length > 1 ? 'ões' : ''}`);
      const summaryLabel = summaryParts.join(' • ');

      const totalBankBalance = bankAccounts.reduce((s, a) => s + (a.balance ?? 0), 0);
      const showMainBalance = bankAccounts.length > 0;
      const mainCreditCard = creditAccounts[0] ?? null;

      return `
          <div data-item-id="${itemId}" class="account-card bank-card-liquid flex flex-col relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl hover:border-[var(--color-border-light)] transition-all duration-200" style="will-change:transform; transform-origin:center center;">

            <!-- Loader overlay para exclusão -->
            <div class="card-loader-overlay absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center opacity-0 pointer-events-none transition-all duration-300 rounded-2xl">
              <div class="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3"></div>
              <p class="text-[13px] font-medium text-white tracking-tight">Excluindo...</p>
            </div>

            <!-- ── Conteúdo principal do card ── -->
            <div class="bank-card-body p-5 flex flex-col gap-4">

              <!-- Header: logo + nome + menu -->
              <div class="bank-card-header flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="bank-card-logo w-11 h-11 rounded-full border border-[var(--color-border)] bg-white p-1.5 flex items-center justify-center overflow-hidden shrink-0" style="will-change:transform;">
                    <img src="${rep.institution?.imageUrl || '/assets/logo/logo.png'}" onerror="this.src='/assets/logo/logo.png'" alt="Banco" class="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h4 class="text-[14px] font-semibold text-[var(--color-text)] leading-tight">${rep.institution?.name || 'Banco'}</h4>
                    <p class="text-[11px] text-[var(--color-text-secondary)] mt-0.5">${summaryLabel}</p>
                  </div>
                </div>
                <div class="relative">
                  <button id="trigger-acc-${rep.id}" class="p-1.5 hover:bg-[var(--color-surface-hover)] rounded-lg text-[var(--color-text-secondary)] transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                  </button>
                  ${(() => {
          const theme = useTheme().current;
          const deleteLottie = theme === 'dark' ? '/assets/lottie/lixobranco.json' : '/assets/lottie/lixopreto.json';
          const renameLottie = theme === 'dark' ? '/assets/lottie/pepelbranco.json' : '/assets/lottie/papelpreto.json';

          return GenericDropdown({
            id: `dropdown-acc-${rep.id}`,
            items: [
              {
                label: 'Apelidar',
                icon: `<lottie-player src="${renameLottie}" background="transparent" speed="1" style="width: 18px; height: 18px;" class="lottie-dropdown-icon" autoplay></lottie-player>`,
                id: `btn-rename-${rep.id}`
              },
              {
                label: 'Excluir',
                icon: `<lottie-player src="${deleteLottie}" background="transparent" speed="1" style="width: 18px; height: 18px;" class="lottie-dropdown-icon" autoplay></lottie-player>`,
                variant: 'danger',
                id: `btn-delete-${rep.id}`
              }
            ]
          });
        })()}
                </div>
              </div>

              <!-- Saldo principal -->
              ${showMainBalance ? `
              <div class="bank-card-balance flex flex-col gap-1" style="will-change:transform; transform-origin:left center;">
                <p class="text-[11px] text-[var(--color-text-secondary)]">Saldo em conta</p>
                <div class="flex items-baseline gap-1">
                  <span class="text-[12px] font-medium text-[var(--color-text-secondary)]">R$</span>
                  <span class="text-[20px] font-bold text-[var(--color-text)] tracking-tight">${formatBRL(totalBankBalance)}</span>
                </div>
              </div>
              ` : mainCreditCard ? `
              <div class="bank-card-balance flex flex-col gap-1" style="will-change:transform; transform-origin:left center;">
                <p class="text-[11px] text-[var(--color-text-secondary)]">Limite disponível</p>
                <div class="flex items-baseline gap-1">
                  <span class="text-[12px] font-medium text-[var(--color-text-secondary)]">R$</span>
                  <span class="text-[20px] font-bold text-[var(--color-text)] tracking-tight">
                    ${mainCreditCard.creditData?.availableCreditLimit != null
            ? formatBRL(mainCreditCard.creditData.availableCreditLimit)
            : formatBRL(mainCreditCard.balance ?? 0)}
                  </span>
                </div>
              </div>
              ` : ''}

            </div>

            <!-- ── Painel expansível com mini cards das contas ── -->
            <div id="${detailsId}" class="account-details-panel">
              <div class="account-details-inner">
                <!-- Divisor 100% sem margens -->
                <div class="border-t border-[var(--color-border)]"></div>
                <div class="px-4 pt-3 pb-4 flex flex-col">
                  ${buildMinimalAccountRows(accs)}
                </div>
              </div>
            </div>

            <!-- ── Footer: última sync + ver detalhes ── -->
            <div class="bank-card-footer border-t border-[var(--color-border-light)] px-5 py-3 flex items-center justify-between bg-[var(--color-background)]/30">
              <div class="flex items-center gap-1.5">
                <lottie-player
                  src="${document.documentElement.getAttribute('data-theme') === 'dark' ? '/assets/lottie/assinaturabranco.json' : '/assets/lottie/assinaturapreto.json'}"
                  background="transparent"
                  speed="1"
                  style="width: 16px; height: 16px;"
                  class="lottie-anim-sync"
                  autoplay loop
                ></lottie-player>
                <span class="text-[10px] text-[var(--color-text-secondary)]">Sincronizado ${timeSince(lastSync)}</span>
              </div>
              <button
                id="${btnDetailsId}"
                class="flex items-center gap-1 text-[11px] font-medium text-[#D97757] hover:underline cursor-pointer transition-all"
              >
                Ver detalhes
                <svg id="${chevronId}" class="chevron-icon" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            </div>

            <!-- ── Status da Sincronização ── -->
            <div class="relative border-t border-[var(--color-border-light)] px-5 py-3 bg-[var(--color-background)]/30 group rounded-b-2xl">
              ${(() => {
          const lsDate = new Date(lastSync);
          const hrsSinceSync = (new Date().getTime() - lsDate.getTime()) / (1000 * 60 * 60);
          const hrsRemaining = Math.max(0, 24 - hrsSinceSync);
          const theme = useTheme().current;
          const clockLottie = theme === 'dark' ? '/assets/lottie/relogio.json' : '/assets/lottie/relogiopreto.json';
          const addLottie = theme === 'dark' ? '/assets/lottie/adicionar.json' : '/assets/lottie/adicionarpreto.json';

          if (hrsRemaining > 0) {
            const nextSyncDate = new Date(lsDate.getTime() + 24 * 60 * 60 * 1000);
            const diff = nextSyncDate.getTime() - new Date().getTime();
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
            const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
            const coinTooltipText = extraCredits > 0
              ? `Clique para sincronizar agora (${extraCredits} Coin${extraCredits > 1 ? 's' : ''})`
              : 'Adquirir Coins';

            return `
                    <div class="flex items-center justify-between w-full text-[11px] font-medium text-[var(--color-text-secondary)]">
                      <div class="flex items-center gap-1.5 min-w-0">
                        <lottie-player src="${clockLottie}" background="transparent" speed="1" style="width: 16px; height: 16px;" class="lottie-dropdown-icon" autoplay loop></lottie-player>
                        <span class="relative z-10 sync-countdown tracking-tight truncate" data-next-sync="${nextSyncDate.toISOString()}">Grátis em <span class="font-mono ml-0.5 font-semibold text-[var(--color-text)]">${h}h ${m}m ${s}s</span></span>
                      </div>
                      ${Tooltip({
              content: `
                          <div id="buy-credits-btn-${rep.id}" class="relative flex items-center justify-center w-7 h-7 shrink-0 cursor-pointer transition-all ${extraCredits > 0 ? 'opacity-100' : 'opacity-60'}">
                            <img src="/assets/logo/coinzinha.png" style="width: 20px; height: 20px; object-fit: contain;" class="lottie-dropdown-icon" />
                          </div>
                        `,
              text: coinTooltipText
            })}
                    </div>
                  `;
          } else {
            return `
                    <div class="flex items-center w-full min-h-[28px]">
                      <div class="absolute inset-0 overflow-hidden pointer-events-none rounded-b-2xl">
                        <div class="absolute -right-8 -top-6 bottom-0 w-32 h-32 bg-gradient-to-l from-[#D97757]/80 to-transparent rounded-full blur-[32px] animate-aurora"></div>
                      </div>
                      <button id="btn-sync-${rep.id}" class="relative z-10 w-full flex items-center justify-start gap-2 py-1 text-[11px] font-bold text-[var(--color-text)] hover:text-[#D97757] transition-all">
                        <lottie-player src="${addLottie}" background="transparent" speed="1" style="width: 16px; height: 16px;" class="lottie-dropdown-icon" autoplay></lottie-player>
                        Sincronizar novos dados agora (Grátis)
                      </button>
                    </div>
                  `;
          }
        })()}
            </div>

          </div>
      `;
    }).join('')}
      </div>
    `;

    initAllTooltips();

    // ── Liquid entrance animation para bank cards ──
    animateBankCardsEntrance();

    // ── Lottie loop ──
    const players = document.querySelectorAll('.lottie-anim-sync, .lottie-anim-card, .lottie-dropdown-icon');
    players.forEach((player: any) => {
      // Remove loop attribute if present to ensure it stops after one play
      player.removeAttribute('loop');

      const schedulePlay = () => {
        if (!player.isConnected) return;

        // Reset and play
        if (typeof player.stop === 'function') player.stop();
        if (typeof player.play === 'function') player.play();

        // Schedule next play in 4 seconds
        setTimeout(schedulePlay, 4000);
      };

      // Start the first interval after a small delay
      setTimeout(schedulePlay, 1000);
    });

    // ── Listeners por institution (itemId) ──
    Array.from(grouped.entries()).forEach(([itemId, accs]) => {
      const rep = accs[0];
      const safeId = itemId.replace(/[^a-zA-Z0-9]/g, '_');

      attachGenericDropdownListeners(`trigger-acc-${rep.id}`, `dropdown-acc-${rep.id}`);
      document.getElementById(`btn-delete-${rep.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteConnection(itemId);
      });
      document.getElementById(`btn-rename-${rep.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        renameInstitution(itemId, rep.institution?.name || 'Banco');
      });
      document.getElementById(`btn-sync-${rep.id}`)?.addEventListener('click', (e) => {
        e.stopPropagation();
        const syncCursor =
          rep.transactionsSyncCursorAt ||
          rep.lastSyncStartedAt ||
          rep.lastSync ||
          rep.updatedAt;
        syncAccount(itemId, syncCursor ? new Date(syncCursor).toISOString() : undefined);
      });

      document.getElementById(`buy-credits-btn-${rep.id}`)?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const user = auth.currentUser;
        if (!user) return;

        // Busca saldo atualizado de créditos extras
        const balance = await getSyncCredits(user.uid);
        if (balance.extra > 0) {
          // Ativa loader no card para bloquear interação
          const card = document.querySelector(`.account-card[data-item-id="${itemId}"]`);
          const loader = card?.querySelector('.card-loader-overlay');
          const loaderText = loader?.querySelector('p');
          if (loader && loaderText) {
            loaderText.textContent = 'Sincronizando...';
            loader.classList.remove('opacity-0', 'pointer-events-none');
            loader.classList.add('opacity-100');
          }

          try {
            const syncCursor =
              rep.transactionsSyncCursorAt ||
              rep.lastSyncStartedAt ||
              rep.lastSync ||
              rep.updatedAt;
            await syncAccount(itemId, syncCursor ? new Date(syncCursor).toISOString() : undefined);
          } finally {
            // Remove loader independente de sucesso ou erro
            if (loader && loaderText) {
              loader.classList.add('opacity-0', 'pointer-events-none');
              loader.classList.remove('opacity-100');
              loaderText.textContent = 'Excluindo...';
            }
          }
        } else {
          // Sem créditos: não faz nada (compra disponível no botão do header)
        }
      });

      const btnDetails = document.getElementById(`btn-details-${safeId}`);
      const panel = document.getElementById(`details-panel-${safeId}`);
      const chevron = document.getElementById(`chevron-${safeId}`);

      const innerContent = panel?.querySelector('.account-details-inner');
      const items = panel?.querySelectorAll('.account-detail-item');

      let isOpen = false;
      let animation: gsap.core.Timeline | null = null;

      // Referência ao card para micro-pulse
      const bankCard = document.querySelector<HTMLElement>(`.account-card[data-item-id="${itemId}"]`);

      btnDetails?.addEventListener('click', () => {
        if (!panel || !innerContent || !items || !chevron) return;

        if (animation) animation.kill();

        // Sub-elements inside each detail item for cascaded animation
        const itemIcons = panel.querySelectorAll<HTMLElement>('.account-detail-item .w-7');
        const itemTexts = panel.querySelectorAll<HTMLElement>('.account-detail-item .min-w-0');
        const itemValues = panel.querySelectorAll<HTMLElement>('.account-detail-item .text-right, .account-detail-item .shrink-0:last-child');
        const divider = innerContent.querySelector<HTMLElement>('.border-t');

        if (isOpen) {
          // ═══════════════════════════════════════════════════════
          //  FECHAR — Colapso líquido
          // ═══════════════════════════════════════════════════════
          isOpen = false;
          btnDetails.childNodes[0].textContent = 'Ver detalhes ';

          animation = gsap.timeline();

          // ── Chevron — wind-up overrotate → elastic snap back ──
          const chevTl = gsap.timeline();
          chevTl.to(chevron, { rotation: 200, scale: 0.85, duration: 0.07, ease: 'power2.in' });
          chevTl.to(chevron, { rotation: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1.15, 0.42)' });

          // ── Card breathe — inhala (comprime Y) enquanto conteúdo colapsa ──
          if (bankCard) {
            const cardTl = gsap.timeline();
            cardTl.to(bankCard, { scaleY: 1.01, scaleX: 0.996, borderRadius: '18px', duration: 0.1, ease: 'power2.out' });
            cardTl.to(bankCard, { scaleY: 1, scaleX: 1, borderRadius: '16px', duration: 0.55, ease: 'elastic.out(1.1, 0.45)', clearProps: 'transform,borderRadius' });
          }

          // ── Values dissolve first (fastest) ──
          if (itemValues.length > 0) {
            animation.to(itemValues, {
              opacity: 0, x: 8, filter: 'blur(4px)',
              duration: 0.1, stagger: { each: 0.02, from: 'end' }, ease: 'power2.in'
            }, 0);
          }

          // ── Then texts collapse ──
          if (itemTexts.length > 0) {
            animation.to(itemTexts, {
              opacity: 0, x: -6, filter: 'blur(4px)',
              duration: 0.1, stagger: { each: 0.02, from: 'end' }, ease: 'power2.in'
            }, 0.03);
          }

          // ── Icons shrink with squash ──
          if (itemIcons.length > 0) {
            animation.to(itemIcons, {
              opacity: 0, scale: 0.5, rotation: -10,
              duration: 0.12, stagger: { each: 0.02, from: 'end' }, ease: 'power2.in'
            }, 0.04);
          }

          // ── Items themselves squash and fade ──
          if (items.length > 0) {
            animation.to(items, {
              opacity: 0, y: -8, scaleX: 1.03, scaleY: 0.88,
              duration: 0.15, stagger: { each: 0.03, from: 'end' }, ease: 'power3.in'
            }, 0.02);
          }

          // ── Divider shrinks to center ──
          if (divider) {
            animation.to(divider, {
              scaleX: 0, opacity: 0,
              duration: 0.15, ease: 'power2.in'
            }, 0.08);
          }

          // ── Panel colapsa — anticipação (expande 2px) depois fecha ──
          animation.to(panel, {
            height: 0, duration: 0.3, ease: 'back.in(1.5)'
          }, items.length ? '-=0.08' : 0);

        } else {
          // ═══════════════════════════════════════════════════════
          //  ABRIR — Expansão líquida dinâmica
          // ═══════════════════════════════════════════════════════
          isOpen = true;
          btnDetails.childNodes[0].textContent = 'Ocultar ';

          animation = gsap.timeline();

          // ── Chevron — anticipa → overshoot → elastic settle ──
          const chevTl = gsap.timeline();
          chevTl.to(chevron, { rotation: 155, scale: 1.15, duration: 0.07, ease: 'power2.in' });
          chevTl.to(chevron, { rotation: 180, scale: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' });

          // ── Card breathe — exhala (estica Y) ao expandir ──
          if (bankCard) {
            const cardTl = gsap.timeline();
            cardTl.to(bankCard, { scaleY: 0.992, scaleX: 1.005, borderRadius: '14px', duration: 0.1, ease: 'power2.out' });
            cardTl.to(bankCard, { scaleY: 1, scaleX: 1, borderRadius: '16px', duration: 0.55, ease: 'elastic.out(1.12, 0.42)', clearProps: 'transform,borderRadius' });
          }

          // ── Set initial states ──
          if (items.length > 0) {
            gsap.set(items, { opacity: 0, y: 18, scaleX: 0.93, scaleY: 1.07 });
          }
          if (itemIcons.length > 0) {
            gsap.set(itemIcons, { opacity: 0, scale: 0.3, rotation: -20 });
          }
          if (itemTexts.length > 0) {
            gsap.set(itemTexts, { opacity: 0, x: -12, filter: 'blur(6px)' });
          }
          if (itemValues.length > 0) {
            gsap.set(itemValues, { opacity: 0, x: 12, filter: 'blur(6px)' });
          }
          if (divider) {
            gsap.set(divider, { scaleX: 0, opacity: 0, transformOrigin: 'center center' });
          }

          // ── Phase 1: Panel expande com deformação líquida ──
          // Primeiro overshoota a height, depois settle
          animation.to(panel, {
            height: 'auto', duration: 0.7, ease: 'elastic.out(1.05, 0.55)',
          }, 0);

          // ── Phase 2: Divider se expande do centro ──
          if (divider) {
            animation.to(divider, {
              scaleX: 1, opacity: 1,
              duration: 0.4, ease: 'power3.out'
            }, 0.06);
          }

          // ── Phase 3: Items surgem com squash→stretch→settle (3-phase liquid) ──
          if (items.length > 0) {
            // First: slide up and decompress
            animation.to(items, {
              opacity: 1, y: -3, scaleX: 1.015, scaleY: 0.985,
              duration: 0.28, stagger: { each: 0.055, ease: 'power1.in' }, ease: 'power3.out',
            }, 0.08);

            // Then: elastic settle
            animation.to(items, {
              y: 0, scaleX: 1, scaleY: 1,
              duration: 0.5, stagger: { each: 0.04, ease: 'power1.in' },
              ease: 'elastic.out(1.1, 0.48)', clearProps: 'transform'
            }, 0.22);
          }

          // ── Phase 4: Icons pop com liquid bounce ──
          if (itemIcons.length > 0) {
            animation.to(itemIcons, {
              opacity: 1, scale: 1.12, rotation: 3,
              duration: 0.22, stagger: { each: 0.05, ease: 'power1.in' }, ease: 'power3.out'
            }, 0.12);
            animation.to(itemIcons, {
              scale: 1, rotation: 0,
              duration: 0.45, stagger: { each: 0.04 }, ease: 'elastic.out(1.25, 0.4)', clearProps: 'all'
            }, 0.26);
          }

          // ── Phase 5: Texts slide in from left com blur dissolve ──
          if (itemTexts.length > 0) {
            animation.to(itemTexts, {
              opacity: 1, x: 0, filter: 'blur(0px)',
              duration: 0.3, stagger: { each: 0.05, ease: 'power1.in' }, ease: 'power2.out', clearProps: 'all'
            }, 0.15);
          }

          // ── Phase 6: Values slide in from right ──
          if (itemValues.length > 0) {
            animation.to(itemValues, {
              opacity: 1, x: 0, filter: 'blur(0px)',
              duration: 0.3, stagger: { each: 0.05, ease: 'power1.in' }, ease: 'power2.out', clearProps: 'all'
            }, 0.18);
          }

          // ── Phase 7: Shadow lift cascade ──
          if (items.length > 0) {
            items.forEach((item, idx) => {
              const el = item as HTMLElement;
              gsap.fromTo(el,
                { boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 2px 8px -2px rgba(0,0,0,0.15)' },
                { boxShadow: '0 0 0 0px rgba(255,255,255,0), 0 0 0 0px rgba(0,0,0,0)', duration: 0.6, delay: 0.2 + idx * 0.05, ease: 'power1.out', clearProps: 'boxShadow' }
              );
            });
          }
        }
      });
    });

    // ── Iniciar o Timer da Sincronização ──
    syncCountdownInterval = setInterval(() => {
      const countdowns = document.querySelectorAll('.sync-countdown');
      const resetTimers = document.querySelectorAll('.global-reset-timer');

      if (countdowns.length === 0 && resetTimers.length === 0) {
        clearInterval(syncCountdownInterval);
        return;
      }

      countdowns.forEach(el => {
        const targetStr = el.getAttribute('data-next-sync');
        if (!targetStr) return;
        const diff = new Date(targetStr).getTime() - new Date().getTime();

        if (diff <= 0) {
          el.innerHTML = 'Recarregue para sincronizar';
          el.classList.remove('sync-countdown');
        } else {
          const h = Math.floor(diff / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
          const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
          el.innerHTML = `Próxima em <span class="font-mono ml-0.5 font-semibold text-[var(--color-text)]">${h}h ${m}m ${s}s</span>`;
        }
      });

      resetTimers.forEach(el => {
        const targetStr = el.getAttribute('data-next-sync');
        if (!targetStr) return;
        const diff = new Date(targetStr).getTime() - new Date().getTime();

        if (diff <= 0) {
          el.innerHTML = '00:00:00';
        } else {
          const h = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
          const s = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
          const time = `${h}:${m}:${s}`;
          el.innerHTML = time;

          // Se estiver dentro de um componente de tooltip, atualizar o atributo data-tooltip do pai
          const tooltipParent = el.closest('.sync-tooltip');
          if (tooltipParent) {
            tooltipParent.setAttribute('data-tooltip', `Coins grátis renovam em ${time}`);
          }
        }
      });
    }, 1000);

  } catch (error) {
    console.error('Erro ao buscar contas:', error);
    container.innerHTML = `<p class="text-sm text-red-500">Erro ao carregar contas.</p>`;
  }
}
