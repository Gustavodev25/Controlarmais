import { db } from '../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toaster } from '../../components/Toast';
import { Input } from '../../components/Input';
import { Select, attachSelectListeners } from '../../components/Select';
import { type FinanceiroConfig, type DescontoPersonalizado, calcularPrevisaoFinanceira } from '../../lib/financeiroUtils';

let financeiroState: FinanceiroConfig = {
  salarioBase: 0,
  diaPagamento: 5,
  isentarDesconto: false,
  habilitarVale: false,
  porcentagemVale: 40,
  diaVale: 15,
  descontosPersonalizados: [],
};

let currentUserId: string = '';
let initializedForUser: string = '';
let dataLoadedForUser: string = ''; // UID para quem já carregamos dados reais do Firebase
let isDirty: boolean = false; // usuário fez alterações locais não salvas

/** Chame ao iniciar o Settings para garantir que dados frescos do Firestore sejam carregados */
export function resetFinanceiroSession() {
  initializedForUser = '';
  dataLoadedForUser = '';
  isDirty = false;
}

// Converte "5th_business", "15th", ou número → número
function parsePayday(payday: any): number {
  if (typeof payday === 'number') return payday;
  if (typeof payday === 'string') {
    const match = payday.match(/^(\d+)/);
    if (match) return parseInt(match[1]);
  }
  return 5;
}

// Mapeia descontos do formato mobile para o formato web
function mapDiscounts(discounts: any[]): DescontoPersonalizado[] {
  if (!Array.isArray(discounts)) return [];
  return discounts.map((d: any) => ({
    id: d.id || Date.now().toString(),
    nome: d.nome || d.name || '',
    valor: Number(d.valor ?? d.value ?? 0),
    tipo: (d.tipo || d.type || 'fixo') as 'fixo' | 'percentual',
  }));
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcularPrevisao() {
  return calcularPrevisaoFinanceira(financeiroState);
}

export function FinanceiroTab(userData: any) {
  currentUserId = userData?.uid || '';

  const financial = userData?.financial || {};
  const salary = financial.salary || {};
  const advance = financial.advance || {};
  const mobileDiscounts = financial.discounts || [];
  const fin = userData?.financeiro || userData?.financeiroConfig || {};

  // hasRealData = Firebase entregou dados reais (não só objeto vazio)
  const hasRealData = salary.base !== undefined || advance.enabled !== undefined || fin.salarioBase !== undefined;

  // Lê do Firebase se: (1) usuário diferente, (2) ainda não carregamos dados reais para este usuário
  // ou (3) sessão foi resetada (nova abertura de Settings) e usuário não fez alterações locais
  const shouldLoad = userData && !isDirty && (
    initializedForUser !== currentUserId ||
    (hasRealData && dataLoadedForUser !== currentUserId)
  );

  if (shouldLoad) {
    const salBase = Number(salary.base ?? fin.salarioBase ?? userData.salario ?? userData.salarioBase ?? 0);
    const rawAdvVal = advance.value !== undefined ? Number(advance.value) : undefined;
    const advType = advance.type ?? 'percentage';
    let pctVale = Number(fin.porcentagemVale ?? 40);
    if (!Number.isFinite(pctVale)) pctVale = 40;
    if (rawAdvVal !== undefined && Number.isFinite(rawAdvVal)) {
      if (advType !== 'percentage' || rawAdvVal > 100) {
        // Mobile saved as fixed BRL amount — convert to percentage
        pctVale = salBase > 0 ? Math.min(100, (rawAdvVal / salBase) * 100) : (Number.isFinite(Number(fin.porcentagemVale)) ? Number(fin.porcentagemVale) : 40);
      } else {
        pctVale = rawAdvVal;
      }
    }
    financeiroState = {
      salarioBase: salBase,
      diaPagamento: parsePayday(salary.payday ?? fin.diaPagamento ?? userData.diaPagamento ?? 5),
      isentarDesconto: advance.isExempt ?? salary.isExempt ?? fin.isentarDesconto ?? false,
      habilitarVale: advance.enabled ?? fin.habilitarVale ?? false,
      porcentagemVale: pctVale,
      diaVale: Number(advance.day ?? fin.diaVale ?? 15),
      descontosPersonalizados: mapDiscounts(mobileDiscounts.length ? mobileDiscounts : (fin.descontosPersonalizados || [])),
    };
    initializedForUser = currentUserId;
    if (hasRealData) dataLoadedForUser = currentUserId;
  }

  const diasOptions = Array.from({ length: 31 }, (_, i) => {
    const dia = (i + 1).toString();
    return { label: dia, value: dia };
  });

  const previsao = calcularPrevisao();

  const descontosHTML = financeiroState.descontosPersonalizados.map((d, index) => `
    <div class="flex items-center gap-2 px-3 sm:px-5 py-3 group hover:bg-[var(--color-surface-hover)]/50 transition-colors" data-desconto-index="${index}">
      <div class="flex-1 min-w-0">
        <input
          type="text"
          value="${d.nome}"
          placeholder="Nome do desconto"
          data-field="nome"
          data-index="${index}"
          class="desconto-field w-full bg-transparent text-[13px] text-[var(--color-text)] font-medium outline-none placeholder:text-[var(--color-text-secondary)]/40"
        />
      </div>
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <input
          type="number"
          value="${d.valor}"
          step="0.01"
          min="0"
          data-field="valor"
          data-index="${index}"
          class="desconto-field w-16 sm:w-20 bg-[var(--color-input-bg)] rounded-lg px-2 py-1.5 text-[12px] text-[var(--color-text)] text-right outline-none border border-[var(--color-input-border)] focus:border-[#D97757]/40 transition-colors"
        />
        <select
          data-field="tipo"
          data-index="${index}"
          class="desconto-field bg-[var(--color-input-bg)] rounded-lg px-1.5 sm:px-2 py-1.5 text-[12px] text-[var(--color-text)] outline-none border border-[var(--color-input-border)] focus:border-[#D97757]/40 transition-colors cursor-pointer appearance-none"
          style="min-width: 40px; text-align: center;"
        >
          <option value="fixo" ${d.tipo === 'fixo' ? 'selected' : ''}>R$</option>
          <option value="percentual" ${d.tipo === 'percentual' ? 'selected' : ''}>%</option>
        </select>
        <button
          data-remove-index="${index}"
          class="btn-remove-desconto w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-secondary)]/40 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    </div>
  `).join('');

  return `
    <div class="w-full animate-fadein">
      <!-- Header row -->
      <div class="flex items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <p class="text-[11px] font-semibold tracking-[0.15em] uppercase text-[#D97757]/70 mb-1">Configurações</p>
          <h2 class="text-[20px] sm:text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Financeiro</h2>
        </div>
        <button id="btn-salvar-financeiro" class="shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] px-3 sm:px-4 py-2 rounded-xl text-[12px] sm:text-[13px] font-medium transition-all duration-200">
          Salvar alterações
        </button>
      </div>

      <!-- Salário Base & Dia de Pagamento -->
      <div class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden mb-4" style="isolation: isolate;">
        <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border-light)]">
          <p class="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Renda Principal</p>
        </div>

        <div class="divide-y divide-[var(--color-border-light)]">
          <!-- Salário Base -->
          <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3">
            <div class="flex flex-col min-w-0">
              <span class="text-[13px] text-[var(--color-text)] font-medium">Salário Base</span>
              <p class="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Seu salário bruto mensal</p>
            </div>
            <div class="w-36 sm:w-44 relative shrink-0">
              ${Input({
                id: 'input-salario-base',
                label: '',
                type: 'text',
                value: financeiroState.salarioBase > 0 ? financeiroState.salarioBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '',
                placeholder: '0,00'
              })}
              <div class="absolute left-3.5 bottom-2.5 text-[12px] text-[var(--color-text-secondary)] font-medium pointer-events-none">R$</div>
              <style>
                #input-salario-base { padding-left: 32px !important; text-align: right !important; font-family: var(--font-mono); height: 38px; }
              </style>
            </div>
          </div>

          <!-- Dia de Pagamento -->
          <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3">
            <div class="flex flex-col min-w-0">
              <span class="text-[13px] text-[var(--color-text)] font-medium">Dia de Pagamento</span>
              <p class="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Dia do mês que você recebe</p>
            </div>
            <div class="w-28 sm:w-32 shrink-0">
              ${Select({
                id: 'select-dia-pagamento',
                label: '',
                value: financeiroState.diaPagamento.toString(),
                options: diasOptions,
                containerClass: 'w-full'
              })}
              <style>
                #select-dia-pagamento-trigger { height: 38px; }
              </style>
            </div>
          </div>

          <!-- Isentar Desconto -->
          <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <div class="min-w-0">
                <span class="text-[13px] text-[var(--color-text)] font-medium">PJ / Isento de Impostos</span>
                <p class="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Não calcular INSS e IRRF (ex: PJ, autônomo)</p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer h-5 shrink-0">
              <input type="checkbox" id="toggle-isentar" class="sr-only peer" ${financeiroState.isentarDesconto ? 'checked' : ''}>
              <div class="w-8 h-[18px] bg-white/10 border border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[14px] after:content-[''] after:absolute after:top-[3px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:shadow-sm after:transition-all peer-checked:bg-[#D97757] peer-checked:border-[#D97757]/50 transition-colors shadow-inner"></div>
            </label>
          </div>
        </div>
      </div>

      <!-- Vale -->
      <div class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden mb-4" style="isolation: isolate;">
        <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border-light)] flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <p class="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Vale / Adiantamento</p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer h-5 shrink-0">
            <input type="checkbox" id="toggle-vale" class="sr-only peer" ${financeiroState.habilitarVale ? 'checked' : ''}>
            <div class="w-8 h-[18px] bg-white/10 border border-white/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-[14px] after:content-[''] after:absolute after:top-[3px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:shadow-sm after:transition-all peer-checked:bg-[#D97757] peer-checked:border-[#D97757]/50 transition-colors shadow-inner"></div>
          </label>
        </div>

        <div id="vale-content" class="${financeiroState.habilitarVale ? '' : 'opacity-40 pointer-events-none'} transition-opacity duration-300">
          <div class="divide-y divide-[var(--color-border-light)]">
            <!-- Porcentagem do Vale -->
            <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3">
              <div class="flex flex-col min-w-0">
                <span class="text-[13px] text-[var(--color-text)] font-medium">Porcentagem do Vale</span>
                <p class="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Quanto do salário é adiantado</p>
              </div>
              <div class="w-28 sm:w-32 relative shrink-0">
                ${Input({
                  id: 'input-porcentagem-vale',
                  label: '',
                  type: 'number',
                  value: financeiroState.porcentagemVale.toString(),
                  placeholder: '0'
                })}
                <div class="absolute right-3.5 bottom-2.5 text-[12px] text-[var(--color-text-secondary)] font-medium pointer-events-none">%</div>
                <style>
                  #input-porcentagem-vale { padding-right: 28px !important; text-align: right !important; font-family: var(--font-mono); height: 38px; }
                </style>
              </div>
            </div>

            <!-- Dia do Vale -->
            <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 gap-3">
              <div class="flex flex-col min-w-0">
                <span class="text-[13px] text-[var(--color-text)] font-medium">Dia do Vale</span>
                <p class="text-[11px] text-[var(--color-text-secondary)] mt-0.5">Dia do mês que recebe o vale</p>
              </div>
              <div class="w-28 sm:w-32 shrink-0">
                ${Select({
                  id: 'select-dia-vale',
                  label: '',
                  value: financeiroState.diaVale.toString(),
                  options: diasOptions,
                  containerClass: 'w-full'
                })}
                <style>
                  #select-dia-vale-trigger { height: 38px; }
                </style>
              </div>
            </div>

            <!-- Valor Preview do Vale -->
            ${financeiroState.salarioBase > 0 ? `
            <div class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-[var(--color-surface-hover)]/30">
              <span class="text-[12px] text-[var(--color-text-secondary)]">Valor estimado do vale</span>
              <span id="vale-estimate-value" class="text-[14px] text-emerald-400 font-semibold font-mono">${formatCurrency(previsao.vale)}</span>
            </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Descontos Personalizados -->
      <div class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden mb-4" style="isolation: isolate;">
        <div class="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 ${financeiroState.descontosPersonalizados.length > 0 ? 'border-b border-[var(--color-border-light)]' : ''}">
          <p class="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Descontos Personalizados</p>
          <button id="btn-add-desconto" class="shrink-0 bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] px-3 sm:px-4 py-2 rounded-xl text-[12px] sm:text-[13px] font-medium transition-all duration-200 flex items-center gap-1.5">
            Adicionar
          </button>
        </div>
        
        <div id="descontos-list">
          ${financeiroState.descontosPersonalizados.length > 0 ? `
            <div class="divide-y divide-[var(--color-border-light)]">
              ${descontosHTML}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Previsão de Fechamento -->
      <div id="financeiro-preview" class="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden ${financeiroState.salarioBase > 0 ? '' : 'hidden'}" style="isolation: isolate;">
        ${financeiroState.salarioBase > 0 ? `
        <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border-light)]">
          <p class="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Previsão de Fechamento</p>
        </div>

        <div class="p-4 sm:p-6">
          <div class="space-y-2.5">
            <div class="flex items-center justify-between py-2 gap-2">
              <span class="text-[13px] text-[var(--color-text)]">Salário Bruto</span>
              <span class="text-[13px] text-[var(--color-text)] font-mono font-semibold">${formatCurrency(previsao.salarioBruto)}</span>
            </div>

            ${previsao.detalhes.map(d => `
              <div class="flex items-center justify-between py-2 gap-2">
                <span class="text-[13px] text-[var(--color-text-secondary)] min-w-0 truncate">${d.nome}</span>
                <span class="text-[13px] text-red-400/80 font-mono shrink-0">- ${formatCurrency(d.valor)}</span>
              </div>
            `).join('')}

            <div class="border-t border-[var(--color-border-light)] pt-3 mt-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-[14px] text-[var(--color-text)] font-semibold">Salário Líquido</span>
                <span class="text-[15px] sm:text-[16px] text-[#D97757] font-mono font-bold">${formatCurrency(previsao.salarioLiquido)}</span>
              </div>
              ${previsao.totalDescontos > 0 ? `
                <p class="text-[11px] text-[var(--color-text-secondary)]/60 mt-2 text-right">
                  Descontos: ${formatCurrency(previsao.totalDescontos)} (${((previsao.totalDescontos / previsao.salarioBruto) * 100).toFixed(1)}%)
                </p>
              ` : ''}
            </div>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Redundante agora que usamos userData passado pelo Settings
export async function loadFinanceiroData(userId: string) {
  console.log('[FinanceiroTab] loadFinanceiroData chamado para', userId, '(depreciado)');
}

async function saveFinanceiroData() {
  if (!currentUserId) return;
  try {
    const userRef = doc(db, 'users', currentUserId);

    // Sanitize all values before saving to avoid NaN/undefined Firestore errors
    const salarioBase = Number(financeiroState.salarioBase) || 0;
    const diaPagamento = Math.round(Number(financeiroState.diaPagamento) || 5);
    const diaVale = Math.round(Number(financeiroState.diaVale) || 15);
    const rawPct = Number(financeiroState.porcentagemVale);
    const porcentagemVale = Math.round(Number.isFinite(rawPct) ? Math.min(100, Math.max(0, rawPct)) : 40);
    const habilitarVale = Boolean(financeiroState.habilitarVale);
    const isentarDesconto = Boolean(financeiroState.isentarDesconto);
    const descontos = (financeiroState.descontosPersonalizados || []).map(d => ({
      id: String(d.id || Date.now()),
      nome: String(d.nome || ''),
      valor: Number(d.valor) || 0,
      tipo: d.tipo === 'percentual' ? 'percentual' as const : 'fixo' as const,
    }));

    await setDoc(userRef, {
      // Formato mobile (app iOS/Android)
      financial: {
        salary: {
          base: salarioBase,
          isExempt: isentarDesconto,
          payday: String(diaPagamento),
          paydayDate: null,
        },
        advance: {
          day: diaVale,
          enabled: habilitarVale,
          isExempt: isentarDesconto,
          type: 'percentage',
          value: porcentagemVale,
        },
        discounts: descontos,
      },
      // Formato legado web (backwards compat)
      salario: salarioBase,
      salarioBase: salarioBase,
      diaPagamento: diaPagamento,
      financeiro: {
        salarioBase,
        diaPagamento,
        isentarDesconto,
        habilitarVale,
        porcentagemVale,
        diaVale,
        descontosPersonalizados: descontos,
        updatedAt: new Date().toISOString(),
      },
    }, { merge: true });
    toaster.create({ title: 'Salvo!', description: 'Configurações financeiras atualizadas.', type: 'success' });
  } catch (err) {
    console.error('[FinanceiroTab] Erro ao salvar:', err);
    toaster.create({ title: 'Erro', description: 'Não foi possível salvar as configurações.', type: 'error' });
  }
}

function parseCurrencyInput(value: string): number {
  // Remove tudo exceto dígitos e vírgula/ponto
  const cleaned = value.replace(/[^\d,.-]/g, '').replace('.', '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function attachFinanceiroListeners() {
  // Helper: update just the preview section without full re-render
  const updatePreview = () => {
    const previsao = calcularPrevisao();
    const previewContainer = document.getElementById('financeiro-preview');
    if (!previewContainer) return;

    if (financeiroState.salarioBase <= 0) {
      previewContainer.innerHTML = '';
      return;
    }

    previewContainer.innerHTML = `
      <div class="px-4 sm:px-6 py-3 sm:py-4 border-b border-[var(--color-border-light)]">
        <p class="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">Previsão de Fechamento</p>
      </div>
      <div class="p-4 sm:p-6">
        <div class="space-y-2.5">
          <div class="flex items-center justify-between py-2 gap-2">
            <span class="text-[13px] text-[var(--color-text)]">Salário Bruto</span>
            <span class="text-[13px] text-[var(--color-text)] font-mono font-semibold">${formatCurrency(previsao.salarioBruto)}</span>
          </div>
          ${previsao.detalhes.map(d => `
            <div class="flex items-center justify-between py-2 gap-2">
              <span class="text-[13px] text-[var(--color-text-secondary)] min-w-0 truncate">${d.nome}</span>
              <span class="text-[13px] text-red-400/80 font-mono shrink-0">- ${formatCurrency(d.valor)}</span>
            </div>
          `).join('')}
          <div class="border-t border-[var(--color-border-light)] pt-3 mt-3">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[14px] text-[var(--color-text)] font-semibold">Salário Líquido</span>
              <span class="text-[15px] sm:text-[16px] text-[#D97757] font-mono font-bold">${formatCurrency(previsao.salarioLiquido)}</span>
            </div>
            ${previsao.totalDescontos > 0 ? `
              <p class="text-[11px] text-[var(--color-text-secondary)]/60 mt-2 text-right">
                Descontos: ${formatCurrency(previsao.totalDescontos)} (${((previsao.totalDescontos / previsao.salarioBruto) * 100).toFixed(1)}%)
              </p>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    // Also update vale estimate if visible
    const valeEstimate = document.getElementById('vale-estimate-value');
    if (valeEstimate) {
      valeEstimate.textContent = formatCurrency(previsao.vale);
    }
  };

  // Salário Base input
  const salarioInput = document.getElementById('input-salario-base') as HTMLInputElement;
  salarioInput?.addEventListener('input', (e: any) => {
    const raw = e.target.value;
    financeiroState.salarioBase = parseCurrencyInput(raw);
    isDirty = true;
  });

  salarioInput?.addEventListener('blur', () => {
    if (financeiroState.salarioBase > 0) {
      salarioInput.value = financeiroState.salarioBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    }
    updatePreview();
  });

  // Dia de Pagamento
  attachSelectListeners('select-dia-pagamento', (val) => {
    financeiroState.diaPagamento = parseInt(val);
    isDirty = true;
    updatePreview();
  });

  // Isentar Desconto — targeted update, no full re-render
  const isentarToggle = document.getElementById('toggle-isentar') as HTMLInputElement;
  isentarToggle?.addEventListener('change', () => {
    financeiroState.isentarDesconto = isentarToggle.checked;
    isDirty = true;
    updatePreview();
  });

  // Toggle Vale — targeted update, no full re-render
  const valeToggle = document.getElementById('toggle-vale') as HTMLInputElement;
  valeToggle?.addEventListener('change', () => {
    financeiroState.habilitarVale = valeToggle.checked;
    isDirty = true;
    const valeContent = document.getElementById('vale-content');
    if (valeContent) {
      if (financeiroState.habilitarVale) {
        valeContent.classList.remove('opacity-40', 'pointer-events-none');
      } else {
        valeContent.classList.add('opacity-40', 'pointer-events-none');
      }
    }
    updatePreview();
  });

  // Porcentagem do Vale
  const porcentagemInput = document.getElementById('input-porcentagem-vale') as HTMLInputElement;
  porcentagemInput?.addEventListener('input', () => {
    financeiroState.porcentagemVale = Math.min(100, Math.max(0, parseInt(porcentagemInput.value) || 0));
    isDirty = true;
  });
  porcentagemInput?.addEventListener('blur', () => {
    updatePreview();
  });

  // Dia do Vale
  attachSelectListeners('select-dia-vale', (val) => {
    financeiroState.diaVale = parseInt(val);
    isDirty = true;
    updatePreview();
  });

  // Add desconto
  const btnAddDesconto = document.getElementById('btn-add-desconto');
  btnAddDesconto?.addEventListener('click', () => {
    financeiroState.descontosPersonalizados.push({
      id: Date.now().toString(),
      nome: '',
      valor: 0,
      tipo: 'fixo',
    });
    window.dispatchEvent(new CustomEvent('re-render-settings'));
  });

  // Desconto fields
  document.querySelectorAll('.desconto-field').forEach(el => {
    const input = el as HTMLInputElement | HTMLSelectElement;
    const index = parseInt(input.dataset.index || '0');
    const field = input.dataset.field as string;

    input.addEventListener('input', () => {
      if (field === 'nome') {
        financeiroState.descontosPersonalizados[index].nome = input.value;
      } else if (field === 'valor') {
        financeiroState.descontosPersonalizados[index].valor = parseFloat(input.value) || 0;
      }
      isDirty = true;
    });

    input.addEventListener('change', () => {
      if (field === 'tipo') {
        financeiroState.descontosPersonalizados[index].tipo = input.value as 'fixo' | 'percentual';
        updatePreview();
      }
      if (field === 'valor') {
        updatePreview();
      }
    });
  });

  // Remove desconto
  document.querySelectorAll('.btn-remove-desconto').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt((btn as HTMLElement).dataset.removeIndex || '0');
      financeiroState.descontosPersonalizados.splice(index, 1);
      window.dispatchEvent(new CustomEvent('re-render-settings'));
    });
  });

  // Salvar
  const btnSalvar = document.getElementById('btn-salvar-financeiro');
  btnSalvar?.addEventListener('click', async () => {
    btnSalvar.textContent = 'Salvando...';
    (btnSalvar as HTMLButtonElement).disabled = true;
    await saveFinanceiroData();
    isDirty = false; // dados salvos — próxima atualização do Firestore pode recarregar
    btnSalvar.textContent = 'Salvar alterações';
    (btnSalvar as HTMLButtonElement).disabled = false;
  });
}
