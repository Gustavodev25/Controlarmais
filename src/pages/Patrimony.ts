import { Header, attachHeaderListeners } from '../components/Header';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { EmptyState, initEmptyStateLotties } from '../components/EmptyState';
import { loadPluggyRecords, getPluggyDocRef } from '../lib/pluggyFirestore';
import { GenericDropdown, attachGenericDropdownListeners } from '../components/GenericDropdown';
import { DynamicIsland, animateDynamicIslandEntrance, animateDynamicIslandTransition, type DynamicDirection } from '../components/DynamicIsland';
import { useTheme } from '../components/ThemeManager';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select, attachSelectListeners } from '../components/Select';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { toaster } from '../components/Toast';
import { openBemMaterialModal } from '../components/BemMaterialModal';
import { auth, db } from '../lib/firebase';
import { updateDoc, collection, addDoc, Timestamp, getDocs, doc } from 'firebase/firestore';
import gsap from 'gsap';

// --- HELPERS E ASSETS MINIMALISTAS ---
const formatBRL = (value: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

const requireAuth = () => {
  const user = auth.currentUser;
  if (!user) toaster.create({ title: "Erro", description: "Usuário não autenticado.", type: "error" });
  return user;
};

const S = `width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"`;
const ICONS = {
  box: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v5c0 1.66 3.13 3 7 3s7-1.34 7-3V5"/><path d="M5 10v5c0 1.66 3.13 3 7 3s7-1.34 7-3v-5"/></svg>`,
  asset: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
  dots: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
  income: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17l9.2-9.2M17 17V7H7" /></svg>`,
  expense: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 7l9.2 9.2M7 17h10V7" /></svg>`,
  statement: `<svg ${S}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`,
  move: `<svg ${S}><path d="M7 16V4m0 0L3 8m4-4 4 4"/><path d="M17 8v12m0 0 4-4m-4 4-4-4"/></svg>`,
  edit: `<svg ${S}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg ${S}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
};

const LottieIcon = (src: string) => `<lottie-player src="${src}" background="transparent" speed="1" style="width: 18px; height: 18px;" class="lottie-dropdown-icon" autoplay></lottie-player>`;

// --- FILTER STATE ---
type SavingsFilterMode = 'with-balance' | 'all';
const FILTER_OPTIONS: { mode: SavingsFilterMode; label: string }[] = [
  { mode: 'with-balance', label: 'Com saldo' },
  { mode: 'all', label: 'Todos' },
];
let currentFilterIndex = 0;
let currentSavingsFilter: SavingsFilterMode = 'with-balance';

function ensureSavingsFilterStyles(): void {
  if (document.getElementById('savings-filter-styles')) return;
  const tag = document.createElement('style');
  tag.id = 'savings-filter-styles';
  tag.textContent = `
    .savings-filter-container .dynamic-island__content {
      gap: 0px;
      justify-content: center;
      overflow: visible;
    }
    .savings-filter-container .month-nav-btn {
      width: 24px;
      height: 32px;
    }
    .savings-filter-label {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text);
      white-space: nowrap;
      letter-spacing: -0.01em;
      padding: 0 4px;
      min-width: 64px;
      text-align: center;
    }
  `;
  document.head.appendChild(tag);
}

function SavingsFilterSelector(): string {
  ensureSavingsFilterStyles();

  const innerContent = `
    <button id="savings-filter-prev" class="month-nav-btn relative z-10" type="button" aria-label="Filtro anterior">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="15 18 9 12 15 6"></polyline>
      </svg>
    </button>
    <span id="savings-filter-label" class="savings-filter-label">${FILTER_OPTIONS[currentFilterIndex].label}</span>
    <button id="savings-filter-next" class="month-nav-btn relative z-10" type="button" aria-label="Próximo filtro">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
      </svg>
    </button>
  `;

  return DynamicIsland({
    id: 'savings-filter',
    content: innerContent,
    contentWrapperId: 'savings-filter-content',
    className: 'savings-filter-container',
    style: 'height: 38px; padding: 2px 4px; gap: 0px;',
  });
}

function attachSavingsFilterListeners(onFilterChange: (mode: SavingsFilterMode) => void): void {
  const label = document.getElementById('savings-filter-label');
  const prevBtn = document.getElementById('savings-filter-prev');
  const nextBtn = document.getElementById('savings-filter-next');
  if (!label || !prevBtn || !nextBtn) return;

  const navigate = (delta: number) => {
    const newIndex = (currentFilterIndex + delta + FILTER_OPTIONS.length) % FILTER_OPTIONS.length;
    if (newIndex === currentFilterIndex) return;

    const direction: DynamicDirection = delta > 0 ? 'next' : 'prev';

    animateDynamicIslandTransition({
      containerId: 'savings-filter',
      contentWrapperId: 'savings-filter-content',
      direction,
      onMidpoint: () => {
        currentFilterIndex = newIndex;
        currentSavingsFilter = FILTER_OPTIONS[newIndex].mode;
        label.textContent = FILTER_OPTIONS[newIndex].label;
        onFilterChange(currentSavingsFilter);
      },
    });
  };

  prevBtn.addEventListener('click', () => navigate(-1));
  nextBtn.addEventListener('click', () => navigate(1));

  // Entrance animation
  animateDynamicIslandEntrance('savings-filter', 'savings-filter-content');
}

// --- COMPONENTES DA VIEW ---
function PatrimonyContent(): string {
  return `
    <div class="w-full animate-fadein">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h2 class="text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Patrimônio</h2>
          <p class="text-[13px] text-[var(--color-text-secondary)] mt-2">Acompanhe e gerencie seu ecossistema financeiro.</p>
        </div>
        <div class="flex items-center gap-3">
          ${SavingsFilterSelector()}
          <div class="relative">
            <button id="btn-create-savings" class="bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-300">
              Nova Reserva
            </button>
            ${GenericDropdown({
    id: 'dropdown-create-savings',
    items: [
      { label: 'Caixinha', icon: ICONS.box, id: 'btn-create-caixinha' },
      { label: 'Bem Material', icon: ICONS.asset, id: 'btn-create-bem-material' }
    ]
  })}
          </div>
        </div>
      </div>

      <div id="patrimony-list-container" class="mt-8">
        <div class="flex flex-col items-center justify-center p-12 text-center opacity-50">
           <div class="w-8 h-8 border-2 border-[var(--color-text-secondary)] border-t-[var(--color-text)] rounded-full animate-spin mb-4"></div>
        </div>
      </div>
    </div>
  `;
}

function renderSavingsCard(acc: any, theme: string): string {
  const isCustom = acc.type === 'custom';
  const balance = isCustom ? (acc.currentBalance ?? 0) : (acc.bankData?.closingBalance ?? acc.balance ?? acc.currentBalance ?? acc.balanceAmount ?? 0);
  const institutionLogo = acc.institution?.imageUrl || '/assets/logo/logo.png';
  const accountName = acc.name
    ? (acc.number ? `${acc.name} · ${acc.number}` : acc.name)
    : `Poupança ${acc.number || acc.id.substring(0, 8)}`;
  const uniqueId = acc.id || `savings-${acc.itemId}-${Math.random()}`;

  const [integers, decimals] = formatBRL(balance).split(',');
  const config = isCustom
    ? { tag: 'Caixinha', color: 'blue', desc: `Meta: R$ ${formatBRL(acc.target || 0)}` }
    : { tag: 'Conta Poupança', color: 'emerald', desc: accountName };

  const deleteLottie = theme === 'dark' ? '/assets/lottie/lixobranco.json' : '/assets/lottie/lixopreto.json';
  const statementLottie = theme === 'dark' ? '/assets/lottie/pepelbranco.json' : '/assets/lottie/papelpreto.json';

  const dotColor = `bg-${config.color}-400`;
  const labelColor = `text-${config.color}-400`;

  return `
    <div class="savings-card-liquid flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl hover:border-[var(--color-border-light)] transition-colors duration-300 p-5" style="will-change: transform;" data-savings-id="${uniqueId}">

      <div class="flex items-start justify-between gap-2 mb-5">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 mb-2.5">
            <span class="w-1.5 h-1.5 rounded-full ${dotColor} opacity-70 shrink-0"></span>
            <span class="text-[10px] font-medium ${labelColor} opacity-70 uppercase tracking-wider">${config.tag}</span>
          </div>
          <h3 class="text-[14px] font-semibold text-[var(--color-text)] truncate leading-tight">${isCustom ? accountName : (acc.institution?.name || acc.originalName || 'Banco')}</h3>
          <p class="text-[11px] text-[var(--color-text-secondary)] opacity-40 mt-0.5 truncate">${config.desc}</p>
        </div>
        <div class="relative shrink-0">
          <button id="trigger-savings-${uniqueId}" class="p-1 hover:bg-[var(--color-surface-hover)] rounded-lg text-[var(--color-text-secondary)] transition-colors">
            ${ICONS.dots}
          </button>
          ${GenericDropdown({
    id: `dropdown-savings-${uniqueId}`,
    items: [
      { label: 'Extrato', icon: ICONS.statement, id: `btn-statement-${uniqueId}` },
      ...(isCustom ? [{ label: 'Movimentar', icon: ICONS.move, id: `btn-move-${uniqueId}` }] : []),
      { label: 'Editar', icon: ICONS.edit, id: `btn-edit-${uniqueId}` },
      { label: 'Excluir', icon: ICONS.trash, variant: 'danger', id: `btn-delete-${uniqueId}` }
    ]
  })}
        </div>
      </div>

      <div class="mt-auto">
        <div class="-mx-5 border-t border-[var(--color-border)] mb-3.5"></div>
        <p class="text-[10px] text-[var(--color-text-secondary)] opacity-40 mb-1.5 uppercase tracking-wider">${isCustom ? 'Economia Atual' : 'Saldo'}</p>
        <div class="flex items-baseline gap-1">
          <span class="text-[12px] font-medium text-[var(--color-text-secondary)]">R$</span>
          <span class="text-[26px] font-semibold text-[var(--color-text)] tracking-tight leading-none">${integers}</span>
          <span class="text-[14px] font-medium text-[var(--color-text-secondary)]">,${decimals}</span>
        </div>
      </div>

    </div>
  `;
}

function renderAssetCard(asset: any, theme: string): string {
  const isImovel = asset.assetType === 'imovel';
  const value = asset.value || 0;
  const [integers, decimals] = formatBRL(value).split(',');

  const tagClass = isImovel
    ? 'bg-blue-500/15 text-blue-400'
    : 'bg-amber-500/15 text-amber-400';
  const tag = isImovel ? 'Imóvel' : 'Veículo';

  const subtitle = isImovel
    ? `${asset.tipoImovel || 'Imóvel'}${asset.endereco ? ' · ' + asset.endereco : ''}`
    : `${asset.tipoVeiculo || 'Veículo'} · ${asset.anoNome || ''}`;

  const deleteLottie = theme === 'dark' ? '/assets/lottie/lixobranco.json' : '/assets/lottie/lixopreto.json';
  const statementLottie = theme === 'dark' ? '/assets/lottie/pepelbranco.json' : '/assets/lottie/papelpreto.json';

  const dotColor = isImovel ? 'bg-blue-400' : 'bg-amber-400';
  const labelColor = isImovel ? 'text-blue-400' : 'text-amber-400';

  const detailParts = !isImovel
    ? [
      asset.placa ? `<span class="font-mono uppercase tracking-widest">${asset.placa}</span>` : '',
      asset.cor ? `<span>${asset.cor}</span>` : '',
      asset.km ? `<span>${new Intl.NumberFormat('pt-BR').format(asset.km)} km</span>` : '',
    ].filter(Boolean)
    : [
      asset.area ? `<span>${asset.area} m²</span>` : '',
    ].filter(Boolean);

  return `
    <div class="savings-card-liquid flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl hover:border-[var(--color-border-light)] transition-colors duration-300 p-5" style="will-change: transform;" data-asset-id="${asset.id}">

      <div class="flex items-start justify-between gap-2 mb-5">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 mb-2.5">
            <span class="w-1.5 h-1.5 rounded-full ${dotColor} opacity-70 shrink-0"></span>
            <span class="text-[10px] font-medium ${labelColor} opacity-70 uppercase tracking-wider">${tag}</span>
          </div>
          <h3 class="text-[14px] font-semibold text-[var(--color-text)] truncate leading-tight">${asset.name}</h3>
          <p class="text-[11px] text-[var(--color-text-secondary)] opacity-40 mt-0.5 truncate">${subtitle}</p>
        </div>
        <div class="relative shrink-0">
          <button id="trigger-asset-${asset.id}" class="p-1 hover:bg-[var(--color-surface-hover)] rounded-lg text-[var(--color-text-secondary)] transition-colors">
            ${ICONS.dots}
          </button>
          ${GenericDropdown({
    id: `dropdown-asset-${asset.id}`,
    items: [
      { label: 'Editar', icon: ICONS.edit, id: `btn-edit-asset-${asset.id}` },
      { label: 'Excluir', icon: ICONS.trash, variant: 'danger', id: `btn-delete-asset-${asset.id}` }
    ]
  })}
        </div>
      </div>

      <div class="mt-auto">
        <div class="-mx-5 border-t border-[var(--color-border)] mb-3.5"></div>
        <p class="text-[10px] text-[var(--color-text-secondary)] opacity-40 mb-1.5 uppercase tracking-wider">${isImovel ? 'Valor de Mercado' : 'Valor FIPE'}</p>
        <div class="flex items-baseline gap-1">
          <span class="text-[12px] font-medium text-[var(--color-text-secondary)]">R$</span>
          <span class="text-[26px] font-semibold text-[var(--color-text)] tracking-tight leading-none">${integers}</span>
          <span class="text-[14px] font-medium text-[var(--color-text-secondary)]">,${decimals}</span>
        </div>
      </div>

      ${detailParts.length > 0 ? `
      <div class="mt-4">
        <div class="-mx-5 border-t border-[var(--color-border)] mb-3.5"></div>
        <div class="flex items-center gap-2.5 flex-wrap">
          ${detailParts.map((p, i) => i === 0 ? `<span class="text-[10px] text-[var(--color-text-secondary)] opacity-45">${p}</span>` : `<span class="w-px h-3 bg-[var(--color-border)]"></span><span class="text-[10px] text-[var(--color-text-secondary)] opacity-45">${p}</span>`).join('')}
        </div>
      </div>
      ` : ''}

    </div>
  `;
}

function renderTransactionItem(item: any, isIncome: boolean, date: Date, description: string) {
  return `
    <div class="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:border-white/[0.08] transition-all group cursor-default">
      <div class="flex items-center gap-3.5">
        <div class="w-9 h-9 rounded-[14px] flex items-center justify-center ${isIncome ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'} shadow-sm">
          ${isIncome ? ICONS.income : ICONS.expense}
        </div>
        <div class="flex flex-col gap-0.5">
          <span class="text-[13px] font-semibold text-[var(--color-text)] opacity-90 group-hover:opacity-100 transition-opacity">${description}</span>
          <span class="text-[10px] font-medium text-[var(--color-text-secondary)] opacity-40 uppercase tracking-wider">${date.toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
      <div class="flex flex-col items-end">
        <span class="text-[13px] font-bold ${isIncome ? 'text-emerald-400' : 'text-red-400'} tracking-tight">
          ${isIncome ? '+' : '-'} R$ ${formatBRL(Math.abs(item.value || item.amount || 0))}
        </span>
      </div>
    </div>
  `;
}

// --- ANIMAÇÕES ---
function animateLiquidEntrance() {
  const cards = document.querySelectorAll<HTMLElement>('.savings-card-liquid');
  if (!cards.length) return;

  gsap.killTweensOf(cards);

  gsap.fromTo(cards,
    { opacity: 0, y: 30, scaleY: 1.05, scaleX: 0.98 },
    {
      opacity: 1,
      y: 0,
      scaleY: 1,
      scaleX: 1,
      duration: 0.7,
      stagger: 0.05,
      ease: 'elastic.out(1.2, 0.5)',
      clearProps: 'transform'
    }
  );
}

// --- LÓGICA DE NEGÓCIO (MODAIS) ---
async function openCreateSavingsModal() {
  const user = requireAuth();
  if (!user) return;

  Modal({
    title: 'Criar Nova Caixinha',
    maxWidth: 'max-w-md',
    content: `
      <div class="space-y-4">
        ${Input({ id: 'new-savings-name', label: 'Nome da Caixinha', type: 'text', placeholder: 'Ex: Férias 2024', required: true })}
        ${Input({ id: 'new-savings-target', label: 'Meta (R$)', type: 'text', placeholder: 'Ex: 5.000,00', required: true })}
        ${Input({ id: 'new-savings-deadline', label: 'Prazo', type: 'date', required: true })}
      </div>
    `,
    confirmText: 'Criar',
    showCancel: false,
    onConfirm: async (formData: any) => {
      try {
        const name = formData['new-savings-name'];
        const target = parseFloat(formData['new-savings-target'].replace(/\./g, '').replace(',', '.'));
        const deadline = formData['new-savings-deadline'];

        if (!name || !target || target <= 0 || !deadline) {
          toaster.create({ title: "Aviso", description: "Preencha todos os campos corretamente.", type: "error" });
          return;
        }

        await addDoc(collection(db, 'users', user.uid, 'savings'), {
          name, target, deadline: new Date(deadline), currentBalance: 0, createdAt: Timestamp.now(), type: 'custom'
        });

        toaster.create({ title: "Sucesso", description: "Caixinha criada!", type: "success" });
        setTimeout(() => loadSavings(user.uid), 600);
      } catch (error) {
        toaster.create({ title: "Erro", description: "Erro ao criar caixinha.", type: "error" });
      }
    }
  });
}

async function deleteSavings(savings: any, uniqueId: string) {
  const user = requireAuth();
  if (!user) return;

  const isCustom = savings.type === 'custom';
  DeleteConfirmationModal({
    title: isCustom ? 'Excluir Caixinha' : 'Excluir Poupança',
    description: isCustom ? 'Todas as movimentações serão perdidas. Deseja continuar?' : 'Tem certeza que deseja ocultar esta poupança?',
    onConfirm: async () => {
      try {
        const savingsRef = doc(db, 'users', user.uid, 'savings', savings.id);
        await updateDoc(savingsRef, { deleted: true, deletedAt: Timestamp.now() });

        toaster.create({ title: "Sucesso", description: "Item excluído com sucesso!", type: "success" });
        window.dispatchEvent(new CustomEvent('app-sync-completed'));
        loadSavings(user.uid);
      } catch (error) {
        toaster.create({ title: "Erro", description: "Não foi possível excluir.", type: "error" });
      }
    }
  });
}

async function openCaixinhaStatementModal(caixinha: any) {
  const user = requireAuth();
  if (!user) return;

  try {
    const movementsSnapshot = await getDocs(collection(db, 'users', user.uid, 'caixinhas', caixinha.id, 'movements'));
    const movements = movementsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => new Date(b.date?.toDate?.() || b.date || 0).getTime() - new Date(a.date?.toDate?.() || a.date || 0).getTime());

    Modal({
      title: `Extrato - ${caixinha.name}`,
      maxWidth: 'max-w-2xl',
      content: `
        <style>.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }</style>
        <div class="flex flex-col w-full">
          ${movements.length > 0
          ? `<div class="space-y-2 max-h-[400px] overflow-y-auto hide-scrollbar w-full">
                 ${movements.map((m: any) => renderTransactionItem(m, m.type === 'receita', m.date?.toDate?.() || new Date(m.date), m.description || (m.type === 'receita' ? 'Depósito' : 'Saque'))).join('')}
               </div>`
          : `<div class="text-center py-8"><p class="text-[13px] text-[var(--color-text-secondary)]">Nenhuma movimentação.</p></div>`
        }
        </div>
      `,
      showFooter: false, showConfirm: false, showCancel: false
    });
  } catch (error) {
    toaster.create({ title: "Erro", description: "Erro ao carregar extrato.", type: "error" });
  }
}

async function openStatementModal(accountId: string, accountName: string, bankName: string) {
  const user = requireAuth();
  if (!user) return;

  try {
    const allTransactions = await loadPluggyRecords<any>(user.uid, 'transactions', { dedupe: false });
    const transactions = allTransactions
      .filter((tx: any) => tx.accountId === accountId)
      .sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    Modal({
      title: `Extrato - ${bankName}`,
      maxWidth: 'max-w-2xl',
      content: `
        <style>.hide-scrollbar::-webkit-scrollbar { display: none; } .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }</style>
        <div class="flex flex-col w-full">
          ${transactions.length > 0
          ? `<div class="space-y-2 max-h-[400px] overflow-y-auto hide-scrollbar w-full">
                 ${transactions.slice(0, 50).map((tx: any) => renderTransactionItem(tx, tx.type === 'CREDIT' || tx.type === 'INCOME', new Date(tx.date), tx.description || 'Transação')).join('')}
               </div>`
          : `<div class="text-center py-8"><p class="text-[13px] text-[var(--color-text-secondary)]">Nenhuma transação.</p></div>`
        }
        </div>
      `,
      showFooter: false, showConfirm: false, showCancel: false
    });
  } catch (error) {
    toaster.create({ title: "Erro", description: "Erro ao carregar extrato.", type: "error" });
  }
}

async function openMoveModal(caixinha: any) {
  const user = requireAuth();
  if (!user) return;

  Modal({
    title: `Movimentar - ${caixinha.name}`,
    maxWidth: 'max-w-md',
    content: `
      <div class="space-y-4">
        ${Select({ id: 'move-type', label: 'Tipo', options: [{ value: 'receita', label: 'Depósito' }, { value: 'despesa', label: 'Retirada' }], value: 'receita' })}
        ${Input({ id: 'move-value', label: 'Valor', type: 'text', placeholder: 'Ex: 1.000,00', required: true })}
        ${Input({ id: 'move-description', label: 'Descrição (Opcional)', type: 'text', placeholder: 'Ex: Aporte mensal', required: false })}
      </div>
    `,
    confirmText: 'Confirmar',
    showCancel: false,
    onConfirm: async (formData: any) => {
      try {
        const moveType = formData['move-type'];
        const value = parseFloat(formData['move-value'].replace(/\./g, '').replace(',', '.'));
        const description = formData['move-description'];

        if (!value || value <= 0) return toaster.create({ title: "Erro", description: "Valor inválido.", type: "error" });

        const currentBalance = caixinha.currentBalance || 0;
        const newBalance = moveType === 'receita' ? currentBalance + value : currentBalance - value;

        if (newBalance < 0) return toaster.create({ title: "Erro", description: "Saldo insuficiente.", type: "error" });

        await addDoc(collection(db, 'users', user.uid, 'caixinhas', caixinha.id, 'movements'), {
          type: moveType, value, description: description || '', date: Timestamp.now(), newBalance
        });

        await updateDoc(doc(db, 'users', user.uid, 'savings', caixinha.id), { currentBalance: newBalance });

        toaster.create({ title: "Sucesso", description: "Movimentação registrada!", type: "success" });
        window.dispatchEvent(new CustomEvent('app-sync-completed'));
        loadSavings(user.uid);
      } catch (error) {
        toaster.create({ title: "Erro", description: "Erro ao processar movimentação.", type: "error" });
      }
    }
  });

  setTimeout(() => attachSelectListeners('move-type'), 100);
}

async function openEditModal(account: any, bankName: string) {
  const user = requireAuth();
  if (!user) return;

  const currentName = account.name || `Poupança ${account.number || account.id.substring(0, 8)}`;

  Modal({
    title: `Editar - ${bankName}`,
    maxWidth: 'max-w-md',
    content: `
      <div class="space-y-4">
        ${Input({ id: 'savings-name', label: 'Nome da Poupança/Caixinha', type: 'text', value: currentName, placeholder: 'Ex: Fundo de Emergência', required: true })}
        <p class="text-[11px] text-[var(--color-text-secondary)]">Identificador: <span class="font-medium">${account.number || account.id.substring(0, 8)}</span></p>
      </div>
    `,
    confirmText: 'Salvar',
    showCancel: false,
    onConfirm: async (formData: any) => {
      try {
        const newName = formData['savings-name'];
        if (!newName || newName === currentName) return toaster.create({ title: "Info", description: "Nenhuma alteração feita.", type: "message" });

        if (account.type === 'custom') {
          await updateDoc(doc(db, 'users', user.uid, 'savings', account.id), { name: newName });
        } else {
          await updateDoc(getPluggyDocRef(account), { name: newName });
        }

        toaster.create({ title: "Sucesso", description: "Atualizado com sucesso!", type: "success" });
        window.dispatchEvent(new CustomEvent('app-sync-completed'));
        loadSavings(user.uid);
      } catch (error) {
        toaster.create({ title: "Erro", description: "Erro ao atualizar.", type: "error" });
      }
    }
  });
}

async function openEditAssetModal(asset: any) {
  const user = requireAuth();
  if (!user) return;

  if (asset.assetType === 'imovel') {
    Modal({
      title: 'Editar Imóvel',
      maxWidth: 'max-w-md',
      content: `
        <div class="space-y-4">
          ${Input({ id: 'edit-imovel-nome', label: 'Nome', type: 'text', value: asset.name, required: true })}
          <div class="flex flex-col gap-1.5">
            <label for="edit-imovel-tipo" class="text-sm text-gray-400 ml-1">Tipo</label>
            <select id="edit-imovel-tipo" name="edit-imovel-tipo" class="w-full px-4 py-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-[13px] text-[var(--color-input-text)] focus:outline-none focus:border-[#D97757] transition-colors cursor-pointer">
              <option value="">Selecione...</option>
              <option value="Casa" ${asset.tipoImovel === 'Casa' ? 'selected' : ''}>Casa</option>
              <option value="Apartamento" ${asset.tipoImovel === 'Apartamento' ? 'selected' : ''}>Apartamento</option>
              <option value="Terreno" ${asset.tipoImovel === 'Terreno' ? 'selected' : ''}>Terreno</option>
              <option value="Sala Comercial" ${asset.tipoImovel === 'Sala Comercial' ? 'selected' : ''}>Sala Comercial</option>
              <option value="Galpão" ${asset.tipoImovel === 'Galpão' ? 'selected' : ''}>Galpão</option>
              <option value="Fazenda/Sítio" ${asset.tipoImovel === 'Fazenda/Sítio' ? 'selected' : ''}>Fazenda/Sítio</option>
              <option value="Outro" ${asset.tipoImovel === 'Outro' ? 'selected' : ''}>Outro</option>
            </select>
          </div>
          ${Input({ id: 'edit-imovel-endereco', label: 'Endereço', type: 'text', value: asset.endereco || '', required: false })}
          <div class="grid grid-cols-2 gap-3">
            ${Input({ id: 'edit-imovel-area', label: 'Área (m²)', type: 'number', value: (asset.area || 0).toString(), required: false })}
            ${Input({ id: 'edit-imovel-valor-compra', label: 'Valor de Compra (R$)', type: 'text', value: formatBRL(asset.valorCompra || 0), required: true })}
          </div>
          ${Input({ id: 'edit-imovel-valor-mercado', label: 'Valor de Mercado (R$)', type: 'text', value: formatBRL(asset.valorMercado || 0), required: true })}
        </div>
      `,
      confirmText: 'Salvar',
      showCancel: false,
      onConfirm: async (formData: any) => {
        const nome = (formData['edit-imovel-nome'] as string)?.trim();
        const valorCompra = parseFloat(formData['edit-imovel-valor-compra'].toString().replace(/\./g, '').replace(',', '.'));
        const valorMercado = parseFloat(formData['edit-imovel-valor-mercado'].toString().replace(/\./g, '').replace(',', '.'));

        if (!nome) {
          toaster.create({ title: 'Aviso', description: 'Preencha o nome.', type: 'error' });
          throw new Error('PREVENT_CLOSE');
        }
        if (valorMercado <= 0 || valorCompra <= 0) {
          toaster.create({ title: 'Aviso', description: 'Informe os valores corretamente.', type: 'error' });
          throw new Error('PREVENT_CLOSE');
        }

        await updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), {
          name: nome,
          tipoImovel: formData['edit-imovel-tipo'] || 'Outro',
          endereco: formData['edit-imovel-endereco'] || '',
          area: parseFloat(formData['edit-imovel-area']) || 0,
          valorCompra,
          valorMercado,
          value: valorMercado,
          updatedAt: Timestamp.now(),
        });

        toaster.create({ title: 'Sucesso', description: 'Imóvel atualizado!', type: 'success' });
        setTimeout(() => loadSavings(user.uid), 600);
      },
    });
  } else {
    Modal({
      title: 'Editar Veículo',
      maxWidth: 'max-w-md',
      content: `
        <div class="space-y-4">
          ${Input({ id: 'edit-veiculo-name', label: 'Nome', type: 'text', value: asset.name, required: false })}
          <div class="flex flex-col gap-1.5">
            <label class="text-sm text-gray-400 ml-1">Valor FIPE</label>
            <input type="text" id="edit-veiculo-valor" value="${formatBRL(asset.valorFipe || 0)}" readonly class="w-full px-4 py-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-[13px] text-[var(--color-input-text)] opacity-70 cursor-not-allowed" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            ${Input({ id: 'edit-veiculo-cor', label: 'Cor', type: 'text', value: asset.cor || '', required: false })}
            ${Input({ id: 'edit-veiculo-placa', label: 'Placa', type: 'text', value: asset.placa || '', required: false })}
          </div>
          ${Input({ id: 'edit-veiculo-km', label: 'Quilometragem (km)', type: 'number', value: (asset.km || 0).toString(), required: false })}
        </div>
      `,
      confirmText: 'Salvar',
      showCancel: false,
      onConfirm: async (formData: any) => {
        await updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), {
          name: formData['edit-veiculo-name'] || asset.name,
          cor: formData['edit-veiculo-cor'] || '',
          placa: (formData['edit-veiculo-placa'] as string || '').toUpperCase(),
          km: parseFloat(formData['edit-veiculo-km']) || 0,
          updatedAt: Timestamp.now(),
        });

        toaster.create({ title: 'Sucesso', description: 'Veículo atualizado!', type: 'success' });
        setTimeout(() => loadSavings(user.uid), 600);
      },
    });
  }
}

async function deleteAsset(asset: any) {
  const user = requireAuth();
  if (!user) return;

  DeleteConfirmationModal({
    title: 'Excluir Bem Material',
    description: `Deseja excluir "${asset.name}"? Esta ação não pode ser desfeita.`,
    onConfirm: async () => {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'assets', asset.id), {
          deleted: true,
          deletedAt: Timestamp.now()
        });
        toaster.create({ title: 'Sucesso', description: 'Bem material excluído.', type: 'success' });
        loadSavings(user.uid);
      } catch {
        toaster.create({ title: 'Erro', description: 'Não foi possível excluir.', type: 'error' });
      }
    }
  });
}

// --- CORE LOADER ---
async function loadSavings(userId: string) {
  const container = document.getElementById('patrimony-list-container');
  if (!container) return;

  try {
    let accounts: any[] = [];
    let savingsSnapshot: any = { docs: [] };
    let assetsSnapshot: any = { docs: [] };

    try {
      accounts = await loadPluggyRecords<any>(userId, 'accounts').catch(() => []);
    } catch (e) {
      console.warn('Erro ao carregar contas Pluggy:', e);
    }

    try {
      savingsSnapshot = await getDocs(collection(db, 'users', userId, 'savings'));
    } catch (e) {
      console.warn('Erro ao carregar savings:', e);
    }

    try {
      assetsSnapshot = await getDocs(collection(db, 'users', userId, 'assets'));
    } catch (e) {
      console.warn('Erro ao carregar assets:', e);
    }

    const isPluggySavings = (acc: any) => {
      const type = (acc.type || '').toUpperCase();
      const subtype = (acc.subtype || '').toUpperCase();
      const originalType = (acc.originalType || '').toUpperCase();
      const originalSubtype = (acc.originalSubtype || '').toUpperCase();
      const name = (acc.name || '').toLowerCase();
      
      return (
        type === 'SAVINGS' ||
        subtype === 'SAVINGS_ACCOUNT' || subtype === 'SAVINGS' ||
        originalType === 'SAVINGS_ACCOUNT' || originalType === 'SAVINGS' ||
        originalSubtype === 'SAVINGS_ACCOUNT' || originalSubtype === 'SAVINGS' ||
        name.includes('poupan') || name.includes('caixinha')
      );
    };

    const allPluggySavings = accounts.filter((acc: any) => 
      acc.type !== 'CREDIT' && 
      isPluggySavings(acc)
    );

    const allCustomSavings = (savingsSnapshot.docs || [])
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((s: any) => !s.deleted);
    const assets = (assetsSnapshot.docs || [])
      .map((d: any) => ({ id: d.id, ...d.data() }))
      .filter((a: any) => !a.deleted);

    if (!allPluggySavings.length && !allCustomSavings.length && !assets.length) {
      container.innerHTML = `<div class="mt-4">${EmptyState({ title: 'Sem reservas', description: 'Suas poupanças, caixinhas e bens materiais aparecerão aqui.', icon: '' })}</div>`;
      initEmptyStateLotties();
      return;
    }

    const theme = useTheme().current;
    const renderSection = (title: string, items: any[], renderFn: (item: any, theme: string) => string) => items.length ? `
      <div class="mb-10">
        <h3 class="text-[12px] font-bold text-[var(--color-text)] mb-4 uppercase tracking-widest opacity-60 ml-1">${title}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          ${items.map(item => renderFn(item, theme)).join('')}
        </div>
      </div>
    ` : '';

    const getBalance = (acc: any) => {
      if (acc.type === 'custom') return acc.currentBalance ?? 0;
      return acc.bankData?.closingBalance ?? acc.balance ?? acc.currentBalance ?? acc.balanceAmount ?? 0;
    };

    const renderFiltered = () => {
      const filterFn = currentSavingsFilter === 'with-balance'
        ? (acc: any) => getBalance(acc) !== 0
        : () => true;

      const pluggySavings = allPluggySavings.filter(filterFn);
      const customSavings = allCustomSavings.filter(filterFn);

      const html =
        renderSection('Poupanças Integradas', pluggySavings, renderSavingsCard) +
        renderSection('Minhas Caixinhas', customSavings, renderSavingsCard) +
        renderSection('Bens Materiais', assets, renderAssetCard);
      
      if (!html.trim()) {
        container.innerHTML = `<div class="mt-4">${EmptyState({ title: 'Sem resultados', description: 'Nenhuma reserva com saldo encontrada. Use o filtro "Todos" para ver tudo.', icon: '' })}</div>`;
        initEmptyStateLotties();
        return;
      }

      container.innerHTML = html;
      requestAnimationFrame(() => animateLiquidEntrance());

      // Re-attach savings listeners
      [...pluggySavings, ...customSavings].forEach(acc => {
        const uniqueId = acc.id || `savings-${acc.itemId}-${Math.random()}`;
        attachGenericDropdownListeners(`trigger-savings-${uniqueId}`, `dropdown-savings-${uniqueId}`);

        const isCustom = acc.type === 'custom';

        document.getElementById(`btn-statement-${uniqueId}`)?.addEventListener('click', () => isCustom ? openCaixinhaStatementModal(acc) : openStatementModal(acc.id, acc.name, acc.institution?.name));
        document.getElementById(`btn-edit-${uniqueId}`)?.addEventListener('click', () => openEditModal(acc, isCustom ? 'Minha Poupança' : acc.institution?.name));
        document.getElementById(`btn-delete-${uniqueId}`)?.addEventListener('click', () => deleteSavings(acc, uniqueId));
        if (isCustom) document.getElementById(`btn-move-${uniqueId}`)?.addEventListener('click', () => openMoveModal(acc));
      });

      // Re-attach asset listeners
      assets.forEach((asset: any) => {
        attachGenericDropdownListeners(`trigger-asset-${asset.id}`, `dropdown-asset-${asset.id}`);
        document.getElementById(`btn-edit-asset-${asset.id}`)?.addEventListener('click', () => openEditAssetModal(asset));
        document.getElementById(`btn-delete-asset-${asset.id}`)?.addEventListener('click', () => deleteAsset(asset));
      });
    };

    // Initial render
    renderFiltered();

    // Attach filter listeners
    attachSavingsFilterListeners(() => renderFiltered());

  } catch (error) {
    console.error('Patrimony load error:', error);
    container.innerHTML = `<div class="mt-4">${EmptyState({ title: 'Erro de conexão', description: 'Tente recarregar a página.', icon: '' })}</div>`;
    initEmptyStateLotties();
  }
}

function showPatrimonyWelcomeModal() {
  const uid = auth.currentUser?.uid || '';
  const key = `patrimony_welcome_v6_${uid}`;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');

  const content = `
    <div style="display:flex;flex-direction:column;overflow:hidden;border-radius:12px;">

      <div style="position:relative;flex-shrink:0;">
        <img src="/assets/background.png" style="width:100%;height:180px;object-fit:cover;display:block;" alt=""/>
        <button id="patrimony-welcome-x" type="button"
          style="position:absolute;top:12px;right:12px;width:30px;height:30px;border-radius:50%;background:rgba(0,0,0,0.35);backdrop-filter:blur(8px);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;transition:background 0.2s;"
          onmouseover="this.style.background='rgba(0,0,0,0.55)'" onmouseout="this.style.background='rgba(0,0,0,0.35)'">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style="padding:24px 24px 28px;display:flex;flex-direction:column;gap:0;">
        <h2 style="font-size:19px;font-weight:700;color:var(--color-text);letter-spacing:-0.03em;line-height:1.2;margin:0 0 8px;">
          Caixinhas agora é Patrimônio
        </h2>
        <p style="font-size:12px;color:var(--color-text-secondary);opacity:0.55;line-height:1.6;margin:0 0 20px;">
          Gerencie poupanças, crie reservas com metas e acompanhe seus bens materiais em um único lugar.
        </p>

        <hr style="margin:0 -24px 20px;border:none;border-top:1px solid var(--color-border);"/>

        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;flex-direction:column;gap:2px;">
            <p style="font-size:12px;font-weight:600;color:var(--color-text);margin:0;">Poupança e Caixinhas</p>
            <p style="font-size:11px;color:var(--color-text-secondary);opacity:0.6;margin:0;line-height:1.5;">Saldos e reservas com metas</p>
          </div>
          <div style="display:flex;flex-direction:column;gap:2px;">
            <p style="font-size:12px;font-weight:600;color:var(--color-text);margin:0;">Bens Materiais</p>
            <p style="font-size:11px;color:var(--color-text-secondary);opacity:0.6;margin:0;line-height:1.5;">Imóveis e veículos com FIPE</p>
          </div>
        </div>
      </div>

    </div>
  `;

  const { closeModal } = Modal({
    title: '',
    content,
    maxWidth: 'max-w-md',
    showHeader: false,
    showFooter: false,
    showConfirm: false,
    fieldsPadding: 'p-0',
  });

  setTimeout(() => {
    document.getElementById('patrimony-welcome-x')?.addEventListener('click', closeModal);
  }, 50);
}

export function renderPatrimony(user: any) {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  sessionStorage.setItem('currentPage', 'patrimony');
  sessionStorage.removeItem('currentTab');

  app.innerHTML = `
    <div class="min-h-screen text-[var(--color-text)] flex flex-col relative overflow-hidden bg-[var(--color-background)]">
      ${BrilhoHeader()}
      ${Header({ user })}
      <style>
        @keyframes fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadein { animation: fadein 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      </style>
      <main class="flex-1 w-full max-w-6xl mx-auto px-4 md:px-10 p-8 pt-24 md:pt-32">
        <div class="px-2 md:px-0">${PatrimonyContent()}</div>
      </main>
    </div>
  `;

  attachHeaderListeners();
  initEmptyStateLotties();
  attachGenericDropdownListeners('btn-create-savings', 'dropdown-create-savings');

  document.getElementById('btn-create-caixinha')?.addEventListener('click', openCreateSavingsModal);
  document.getElementById('btn-create-bem-material')?.addEventListener('click', () => openBemMaterialModal(() => loadSavings(user.uid)));

  loadSavings(user.uid);
  setTimeout(() => showPatrimonyWelcomeModal(), 600);
}