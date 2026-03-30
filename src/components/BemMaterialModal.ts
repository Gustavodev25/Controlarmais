import { Modal } from './Modal';
import { Input } from './Input';
import { Select, attachSelectListeners } from './Select';
import { toaster } from './Toast';
import { auth, db } from '../lib/firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

const FIPE_BASE = 'https://parallelum.com.br/fipe/api/v1';

type FipeTipo = 'carros' | 'motos' | 'caminhoes';

interface FipeMarca { codigo: string; nome: string; }
interface FipeModelo { codigo: number; nome: string; }
interface FipeAno { codigo: string; nome: string; }
interface FipePreco {
  Valor: string;
  Marca: string;
  Modelo: string;
  AnoModelo: number;
  Combustivel: string;
  CodigoFipe: string;
}

const parseBRL = (v: string) =>
  parseFloat((v || '0').replace(/\./g, '').replace(',', '.')) || 0;

const parseFipeValue = (v: string) =>
  parseFloat((v || '0').replace('R$', '').trim().replace(/\./g, '').replace(',', '.')) || 0;

async function fipeFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${FIPE_BASE}${path}`);
  if (!res.ok) throw new Error(`FIPE ${res.status}`);
  return res.json();
}

const inputCls = 'w-full px-4 py-3 bg-[var(--color-input-bg)] border border-[var(--color-border-light)] rounded-xl text-[13px] text-[var(--color-text)] placeholder-[var(--color-text-secondary)]/40 focus:outline-none focus:border-[#D97757]/40 focus:ring-4 focus:ring-[#D97757]/5 transition-all duration-300';
const getSelectCls = (disabled = false) =>
  inputCls + (disabled ? ' opacity-50 cursor-not-allowed' : ' cursor-pointer');

// ─── STEP 1: Seleção de tipo ──────────────────────────────────────────────────

function typeSelectionContent(): string {
  return `
    <div class="space-y-6">
      <div class="space-y-1">
        <p style="font-size:15px;font-weight:600;color:var(--color-text);letter-spacing:-0.01em;">Escolha uma categoria</p>
        <p style="font-size:12px;color:var(--color-text-secondary);margin-top:4px;">Selecione o tipo de bem que deseja adicionar</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button type="button" id="bm-select-imovel"
          class="group flex flex-col items-start gap-1 p-4 rounded-2xl border transition-all duration-300"
          style="background:var(--color-surface-hover);border-color:var(--color-border);">
          <p style="font-size:13px;font-weight:600;color:var(--color-text);">Imóvel</p>
          <p style="font-size:11px;color:var(--color-text-secondary);margin-top:2px;">Casas, aptos e terrenos</p>
        </button>

        <button type="button" id="bm-select-veiculo"
          class="group flex flex-col items-start gap-1 p-4 rounded-2xl border transition-all duration-300"
          style="background:var(--color-surface-hover);border-color:var(--color-border);">
          <p style="font-size:13px;font-weight:600;color:var(--color-text);">Veículo</p>
          <p style="font-size:11px;color:var(--color-text-secondary);margin-top:2px;">Carros, motos e vans</p>
        </button>

        <button type="button" id="bm-select-investimento"
          class="group flex flex-col items-start gap-1 p-4 rounded-2xl border transition-all duration-300"
          style="background:var(--color-surface-hover);border-color:var(--color-border);">
          <p style="font-size:13px;font-weight:600;color:var(--color-text);">Investimento</p>
          <p style="font-size:11px;color:var(--color-text-secondary);margin-top:2px;">Ações, FIIs, CDB e mais</p>
        </button>

        <button type="button" id="bm-select-outros"
          class="group flex flex-col items-start gap-1 p-4 rounded-2xl border transition-all duration-300"
          style="background:var(--color-surface-hover);border-color:var(--color-border);">
          <p style="font-size:13px;font-weight:600;color:var(--color-text);">Outros</p>
          <p style="font-size:11px;color:var(--color-text-secondary);margin-top:2px;">Joias, arte e demais bens</p>
        </button>
      </div>
    </div>
  `;
}

// ─── IMÓVEL ──────────────────────────────────────────────────────────────────

function imovelContent(): string {
  return `
    <div class="space-y-5">
      ${Input({ id: 'imovel-nome', label: 'Nome do Bem', type: 'text', placeholder: 'Ex: Apartamento em Balneário', required: true })}
      
      <div class="flex flex-col gap-2 scale-items hover:translate-x-1 transition-transform duration-300">
        <label for="imovel-tipo" class="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-secondary)] font-semibold ml-1">Tipo de Imóvel</label>
        <select id="imovel-tipo" name="imovel-tipo" class="${getSelectCls()}">
          <option value="">Selecione...</option>
          <option value="Casa">Casa</option>
          <option value="Apartamento">Apartamento</option>
          <option value="Terreno">Terreno</option>
          <option value="Sala Comercial">Sala Comercial</option>
          <option value="Galpão">Galpão</option>
          <option value="Fazenda/Sítio">Fazenda/Sítio</option>
          <option value="Outro">Outro</option>
        </select>
      </div>

      ${Input({ id: 'imovel-endereco', label: 'Localização (Opcional)', type: 'text', placeholder: 'Rua, Cidade, Estado', required: false })}
      
      <div class="grid grid-cols-2 gap-4">
        ${Input({ id: 'imovel-area', label: 'Área Privativa (m²)', type: 'number', placeholder: '0', required: false })}
        ${Input({ id: 'imovel-valor-compra', label: 'Custo de Aquisição', type: 'text', placeholder: 'R$ 0,00', required: true })}
      </div>
      
      <div class="pt-2 border-t border-[var(--color-border-light)] mt-2">
        ${Input({ id: 'imovel-valor-mercado', label: 'Avaliação de Mercado', type: 'text', placeholder: 'R$ 0,00', required: true })}
        <p class="text-[10px] text-[var(--color-text-secondary)] mt-2 italic ml-1">* Este valor será usado para o cálculo do seu patrimônio atual.</p>
      </div>
    </div>
  `;
}

async function openImovelModal(uid: string, onCreated: () => void) {
  Modal({
    title: 'Cadastrar Imóvel',
    maxWidth: 'max-w-md',
    content: imovelContent(),
    confirmText: 'Cadastrar',
    showCancel: false,
    onConfirm: async (formData: any) => {
      const nome = (formData['imovel-nome'] as string)?.trim();
      const valorCompra = parseBRL(formData['imovel-valor-compra']);
      const valorMercado = parseBRL(formData['imovel-valor-mercado']);

      if (!nome) {
        toaster.create({ title: 'Aviso', description: 'Preencha o nome do imóvel.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }
      if (valorCompra <= 0 || valorMercado <= 0) {
        toaster.create({ title: 'Aviso', description: 'Informe os valores corretamente.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }

      await addDoc(collection(db, 'users', uid, 'assets'), {
        assetType: 'imovel',
        name: nome,
        tipoImovel: formData['imovel-tipo'] || 'Outro',
        endereco: formData['imovel-endereco'] || '',
        area: parseFloat(formData['imovel-area']) || 0,
        valorCompra,
        valorMercado,
        value: valorMercado,
        createdAt: Timestamp.now(),
      });

      toaster.create({ title: 'Sucesso', description: 'Imóvel cadastrado!', type: 'success' });
      setTimeout(onCreated, 600);
    },
  });
}

// ─── VEÍCULO ─────────────────────────────────────────────────────────────────

function veiculoContent(): string {
  return `
    <div class="space-y-5">
      
      <!-- Tipo de Veículo -->
      <div class="flex flex-col gap-2">
        <div class="space-y-0.5">
          <p class="text-[13px] font-semibold text-[var(--color-text)] tracking-tight">Tipo de automóvel</p>
          <p class="text-[11px] text-[var(--color-text-secondary)]">Escolha a categoria do veículo</p>
        </div>

        <div class="fipe-tipo-wrapper relative flex p-1 rounded-xl bg-[var(--color-surface-hover)]/30 border border-[var(--color-border-light)]" style="isolation: isolate;">

          <div id="fipe-tipo-blob"
            class="absolute pointer-events-none rounded-lg opacity-0"
            style="
              background: var(--color-surface);
              border: 1px solid var(--color-border-light);
              box-shadow: 0 1px 4px rgba(0,0,0,0.12);
              will-change: left, width, top, height;
            "></div>

          <button type="button" id="fipe-btn-carros" data-tipo="carros"
            class="fipe-tipo-btn relative z-10 flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-[12px] font-medium select-none cursor-pointer"
            style="color: var(--color-text-secondary); transition: color 0.3s ease, font-weight 0.3s ease;">
            Carro
          </button>

          <button type="button" id="fipe-btn-motos" data-tipo="motos"
            class="fipe-tipo-btn relative z-10 flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-[12px] font-medium select-none cursor-pointer"
            style="color: var(--color-text-secondary); transition: color 0.3s ease, font-weight 0.3s ease;">
            Moto
          </button>

          <button type="button" id="fipe-btn-caminhoes" data-tipo="caminhoes"
            class="fipe-tipo-btn relative z-10 flex-1 flex items-center justify-center py-2 px-3 rounded-lg text-[12px] font-medium select-none cursor-pointer"
            style="color: var(--color-text-secondary); transition: color 0.3s ease, font-weight 0.3s ease;">
            Caminhão
          </button>
        </div>
        <input type="hidden" id="fipe-tipo" name="fipe-tipo" value="">
      </div>

      <div class="space-y-4 pt-2">
        ${Select({ id: 'fipe-marca', label: 'Marca', value: '', options: [{ label: 'Escolha o tipo acima', value: '' }] })}
        <input type="hidden" id="fipe-marca-nome" name="fipe-marca-nome" value="">

        ${Select({ id: 'fipe-modelo', label: 'Modelo', value: '', options: [{ label: 'Aguardando marca...', value: '' }] })}
        <input type="hidden" id="fipe-modelo-nome" name="fipe-modelo-nome" value="">

        ${Select({ id: 'fipe-ano', label: 'Ano e Versão', value: '', options: [{ label: 'Aguardando modelo...', value: '' }] })}
        <input type="hidden" id="fipe-ano-nome" name="fipe-ano-nome" value="">
      </div>

      <div class="flex flex-col gap-2">
        <label class="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] font-semibold ml-1">Avaliação FIPE (R$)</label>
        <div class="relative group">
          <input type="text" id="fipe-valor" name="fipe-valor" readonly
            placeholder="—"
            class="${inputCls.replace('px-4', 'px-5')} bg-[var(--color-surface)] font-medium text-[15px] tracking-tight" />
          <div id="fipe-loading" class="absolute right-4 top-1/2 -translate-y-1/2 hidden">
            <div class="w-4 h-4 border-2 border-[#D97757]/30 border-t-[#D97757] rounded-full animate-spin"></div>
          </div>
        </div>
        <input type="hidden" id="fipe-codigo" name="fipe-codigo" value="">
        <input type="hidden" id="fipe-combustivel" name="fipe-combustivel" value="">
      </div>

      <div class="grid grid-cols-2 gap-4 pb-2">
        ${Input({ id: 'veiculo-cor', label: 'Cor Predominante', type: 'text', placeholder: 'Ex: Prata', required: false })}
        ${Input({ id: 'veiculo-placa', label: 'Placa', type: 'text', placeholder: 'Opcional', required: false })}
      </div>
    </div>
  `;
}

function updateSelectOptions(selectId: string, options: { label: string; value: string }[]) {
  const input = document.getElementById(selectId) as HTMLInputElement;
  if (!input) return;
  input.dataset.options = JSON.stringify(options);
  const oldPortal = document.getElementById(`${selectId}-menu-portal`);
  oldPortal?.remove();
  setTimeout(() => attachSelectListeners(selectId), 50);
}

// Animate the liquid blob to the selected button's position
function animateTipoBlob(btn: HTMLElement) {
  const blob = document.getElementById('fipe-tipo-blob') as HTMLElement | null;
  if (!blob) return;
  const wrapper = btn.closest('.fipe-tipo-wrapper') as HTMLElement | null;
  if (!wrapper) return;

  const wRect = wrapper.getBoundingClientRect();
  const bRect = btn.getBoundingClientRect();

  const left = bRect.left - wRect.left;
  const top = bRect.top - wRect.top;
  const width = bRect.width;
  const height = bRect.height;

  const spring = 'cubic-bezier(0.34, 1.45, 0.64, 1)';

  if (blob.style.opacity === '0') {
    // First activation: snap then fade in
    blob.style.transition = 'none';
    blob.style.left = `${left}px`;
    blob.style.top = `${top}px`;
    blob.style.width = `${width}px`;
    blob.style.height = `${height}px`;
    blob.getBoundingClientRect(); // force reflow
    blob.style.transition = `opacity 0.2s ease`;
    blob.style.opacity = '1';
  } else {
    // Subsequent: liquid slide with spring
    blob.style.transition = [
      `left 0.45s ${spring}`,
      `width 0.45s ${spring}`,
      `top 0.3s ease`,
      `height 0.3s ease`,
    ].join(', ');
    blob.style.left = `${left}px`;
    blob.style.top = `${top}px`;
    blob.style.width = `${width}px`;
    blob.style.height = `${height}px`;
  }
}

function attachVeiculoListeners() {
  const getEl = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

  const setupMarcaListener = () => {
    const oldPortal = document.getElementById('fipe-marca-menu-portal');
    oldPortal?.remove();

    attachSelectListeners('fipe-marca', async (marcaCod: string) => {
      if (!marcaCod) return;

      const tipo = getEl<HTMLInputElement>('fipe-tipo').value as FipeTipo;
      const marcaNome = (document.getElementById('fipe-marca-trigger-text')?.textContent || '').trim();

      getEl<HTMLInputElement>('fipe-marca-nome').value = marcaNome;
      getEl<HTMLInputElement>('fipe-ano').value = '';
      getEl<HTMLInputElement>('fipe-valor').value = '';

      updateSelectOptions('fipe-modelo', [{ label: 'Carregando modelos...', value: '' }]);

      try {
        const data = await fipeFetch<{ modelos: FipeModelo[] }>(`/${tipo}/marcas/${marcaCod}/modelos`);
        updateSelectOptions('fipe-modelo', [
          { label: 'Selecione o modelo', value: '' },
          ...data.modelos.map(m => ({ label: m.nome, value: m.codigo.toString() }))
        ]);
        setTimeout(setupModeloListener, 100);
      } catch {
        updateSelectOptions('fipe-modelo', [{ label: 'Erro ao carregar modelos', value: '' }]);
      }

      updateSelectOptions('fipe-ano', [{ label: 'Selecione o modelo primeiro', value: '' }]);
    });
  };

  const setupModeloListener = () => {
    const oldPortal = document.getElementById('fipe-modelo-menu-portal');
    oldPortal?.remove();

    attachSelectListeners('fipe-modelo', async (modeloCod: string) => {
      if (!modeloCod) return;

      const tipo = getEl<HTMLInputElement>('fipe-tipo').value as FipeTipo;
      const marcaInput = getEl<HTMLInputElement>('fipe-marca');
      const modeloNome = (document.getElementById('fipe-modelo-trigger-text')?.textContent || '').trim();

      getEl<HTMLInputElement>('fipe-modelo-nome').value = modeloNome;
      getEl<HTMLInputElement>('fipe-ano').value = '';
      getEl<HTMLInputElement>('fipe-valor').value = '';

      updateSelectOptions('fipe-ano', [{ label: 'Carregando anos...', value: '' }]);

      try {
        const anos = await fipeFetch<FipeAno[]>(`/${tipo}/marcas/${marcaInput.value}/modelos/${modeloCod}/anos`);
        updateSelectOptions('fipe-ano', [
          { label: 'Selecione o ano', value: '' },
          ...anos.map(a => ({ label: a.nome, value: a.codigo }))
        ]);
        setTimeout(setupAnoListener, 100);
      } catch {
        updateSelectOptions('fipe-ano', [{ label: 'Erro ao carregar anos', value: '' }]);
      }
    });
  };

  const setupAnoListener = () => {
    const oldPortal = document.getElementById('fipe-ano-menu-portal');
    oldPortal?.remove();

    attachSelectListeners('fipe-ano', async (anoCod: string) => {
      if (!anoCod) return;

      const tipo = getEl<HTMLInputElement>('fipe-tipo').value as FipeTipo;
      const marcaInput = getEl<HTMLInputElement>('fipe-marca');
      const modeloInput = getEl<HTMLInputElement>('fipe-modelo');
      const anoNome = (document.getElementById('fipe-ano-trigger-text')?.textContent || '').trim();

      getEl<HTMLInputElement>('fipe-ano-nome').value = anoNome;

      const loader = getEl<HTMLElement>('fipe-loading');
      const valorInput = getEl<HTMLInputElement>('fipe-valor');

      loader?.classList.remove('hidden');
      valorInput.value = 'Consultando...';

      try {
        const preco = await fipeFetch<FipePreco>(
          `/${tipo}/marcas/${marcaInput.value}/modelos/${modeloInput.value}/anos/${anoCod}`
        );
        valorInput.value = preco.Valor;
        getEl<HTMLInputElement>('fipe-codigo').value = preco.CodigoFipe || '';
        getEl<HTMLInputElement>('fipe-combustivel').value = preco.Combustivel || '';
      } catch {
        valorInput.value = '';
        toaster.create({ title: 'Erro FIPE', description: 'Não foi possível consultar o valor.', type: 'error' });
      } finally {
        loader?.classList.add('hidden');
      }
    });
  };

  // Tipo buttons — liquid blob + active text color
  document.querySelectorAll<HTMLElement>('.fipe-tipo-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tipo = btn.dataset.tipo as FipeTipo;
      getEl<HTMLInputElement>('fipe-tipo').value = tipo;

      // Update active state for all buttons
      document.querySelectorAll<HTMLElement>('.fipe-tipo-btn').forEach(b => {
        b.style.color = 'var(--color-text-secondary)';
        b.style.fontWeight = '500';
      });
      btn.style.color = 'var(--color-text)';
      btn.style.fontWeight = '600';

      // Animate liquid blob to selected button
      animateTipoBlob(btn);

      const marcaInput = getEl<HTMLInputElement>('fipe-marca');
      const modeloInput = getEl<HTMLInputElement>('fipe-modelo');
      const anoInput = getEl<HTMLInputElement>('fipe-ano');

      marcaInput.value = '';
      modeloInput.value = '';
      anoInput.value = '';
      getEl<HTMLInputElement>('fipe-valor').value = '';

      updateSelectOptions('fipe-marca', [{ label: 'Carregando marcas...', value: '' }]);

      try {
        const brands = await fipeFetch<FipeMarca[]>(`/${tipo}/marcas`);
        updateSelectOptions('fipe-marca', [
          { label: 'Selecione a marca', value: '' },
          ...brands.map(b => ({ label: b.nome, value: b.codigo }))
        ]);
        setTimeout(setupMarcaListener, 100);
      } catch {
        updateSelectOptions('fipe-marca', [{ label: 'Erro ao carregar marcas', value: '' }]);
        toaster.create({ title: 'Erro FIPE', description: 'Não foi possível carregar as marcas.', type: 'error' });
      }

      updateSelectOptions('fipe-modelo', [{ label: 'Selecione a marca primeiro', value: '' }]);
      updateSelectOptions('fipe-ano', [{ label: 'Selecione o modelo primeiro', value: '' }]);
    });
  });
}

async function openVeiculoModal(uid: string, onCreated: () => void) {
  Modal({
    title: 'Cadastrar Veículo',
    maxWidth: 'max-w-md',
    content: veiculoContent(),
    confirmText: 'Cadastrar',
    showCancel: false,
    onConfirm: async (formData: any) => {
      const tipo = formData['fipe-tipo'] as FipeTipo;
      const marcaCod = formData['fipe-marca'] as string;
      const modeloCod = formData['fipe-modelo'] as string;
      const anoCod = formData['fipe-ano'] as string;
      const marcaNome = formData['fipe-marca-nome'] as string;
      const modeloNome = formData['fipe-modelo-nome'] as string;
      const anoNome = formData['fipe-ano-nome'] as string;
      const fipeValorStr = formData['fipe-valor'] as string;

      if (!tipo) {
        toaster.create({ title: 'Aviso', description: 'Selecione o tipo de veículo.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }
      if (!marcaCod || !modeloCod || !anoCod) {
        toaster.create({ title: 'Aviso', description: 'Selecione marca, modelo e ano.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }
      if (!fipeValorStr || fipeValorStr === 'Consultando...') {
        toaster.create({ title: 'Aviso', description: 'Aguarde o valor FIPE ser carregado.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }

      const valorFipe = parseFipeValue(fipeValorStr);
      const tipoLabel = tipo === 'carros' ? 'Carro' : tipo === 'motos' ? 'Moto' : 'Caminhão';

      await addDoc(collection(db, 'users', uid, 'assets'), {
        assetType: 'veiculo',
        name: `${marcaNome} ${modeloNome}`,
        tipoVeiculo: tipoLabel,
        marcaCodigo: marcaCod,
        marcaNome,
        modeloCodigo: modeloCod,
        modeloNome,
        anoCodigo: anoCod,
        anoNome,
        codigoFipe: formData['fipe-codigo'] || '',
        combustivel: formData['fipe-combustivel'] || '',
        valorFipe,
        cor: formData['veiculo-cor'] || '',
        placa: (formData['veiculo-placa'] as string || '').toUpperCase(),
        km: parseFloat(formData['veiculo-km']) || 0,
        value: valorFipe,
        createdAt: Timestamp.now(),
      });

      toaster.create({ title: 'Sucesso', description: 'Veículo cadastrado!', type: 'success' });
      setTimeout(onCreated, 600);
    },
  });

  setTimeout(attachVeiculoListeners, 150);
}

// ─── INVESTIMENTO ─────────────────────────────────────────────────────────────

function investimentoContent(): string {
  return `
    <div class="space-y-5">
      ${Input({ id: 'inv-nome', label: 'Nome do Investimento', type: 'text', placeholder: 'Ex: Tesouro Selic 2029', required: true })}

      <div class="space-y-4 pt-2">
        ${Select({ id: 'inv-tipo', label: 'Tipo de Investimento', value: '', options: [
          { label: 'Selecione o tipo', value: '' },
          { label: 'Ações', value: 'Ações' },
          { label: 'FIIs', value: 'FIIs' },
          { label: 'CDB', value: 'CDB' },
          { label: 'Tesouro Direto', value: 'Tesouro Direto' },
          { label: 'Criptomoedas', value: 'Criptomoedas' },
          { label: 'Fundos', value: 'Fundos' },
          { label: 'Previdência', value: 'Previdência' },
          { label: 'LCI/LCA', value: 'LCI/LCA' },
          { label: 'Outro', value: 'Outro' },
        ] })}
      </div>

      <div class="grid grid-cols-2 gap-4">
        ${Input({ id: 'inv-valor-aportado', label: 'Valor Aportado', type: 'text', placeholder: 'R$ 0,00', required: true })}
        ${Input({ id: 'inv-valor-atual', label: 'Valor Atual', type: 'text', placeholder: 'R$ 0,00', required: true })}
      </div>

      <p class="text-[10px] text-[var(--color-text-secondary)] italic ml-1">* O Valor Atual será usado para o cálculo do seu patrimônio.</p>
    </div>
  `;
}

function openInvestimentoModal(uid: string, onCreated: () => void) {
  Modal({
    title: 'Cadastrar Investimento',
    maxWidth: 'max-w-md',
    content: investimentoContent(),
    confirmText: 'Cadastrar',
    showCancel: false,
    onConfirm: async (formData: any) => {
      const nome = (formData['inv-nome'] as string)?.trim();
      const tipo = formData['inv-tipo'] as string;
      const valorAportado = parseBRL(formData['inv-valor-aportado']);
      const valorAtual = parseBRL(formData['inv-valor-atual']);

      if (!nome) {
        toaster.create({ title: 'Aviso', description: 'Preencha o nome do investimento.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }
      if (!tipo) {
        toaster.create({ title: 'Aviso', description: 'Selecione o tipo de investimento.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }
      if (valorAtual <= 0) {
        toaster.create({ title: 'Aviso', description: 'Informe o valor atual do investimento.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }

      await addDoc(collection(db, 'users', uid, 'assets'), {
        assetType: 'investimento',
        name: nome,
        tipoInvestimento: tipo,
        valorAportado,
        value: valorAtual,
        createdAt: Timestamp.now(),
      });

      toaster.create({ title: 'Sucesso', description: 'Investimento cadastrado!', type: 'success' });
      setTimeout(onCreated, 600);
    },
  });

  setTimeout(() => attachSelectListeners('inv-tipo'), 150);
}

// ─── OUTROS ───────────────────────────────────────────────────────────────────

function outrosContent(): string {
  return `
    <div class="space-y-5">
      ${Input({ id: 'outro-nome', label: 'Nome do Bem', type: 'text', placeholder: 'Ex: Relógio colecionável', required: true })}

      <div class="space-y-4 pt-2">
        ${Select({ id: 'outro-categoria', label: 'Categoria', value: '', options: [
          { label: 'Selecione a categoria', value: '' },
          { label: 'Joias e Acessórios', value: 'Joias e Acessórios' },
          { label: 'Arte e Colecionáveis', value: 'Arte e Colecionáveis' },
          { label: 'Eletrônicos', value: 'Eletrônicos' },
          { label: 'Móveis e Decoração', value: 'Móveis e Decoração' },
          { label: 'Equipamentos', value: 'Equipamentos' },
          { label: 'Outro', value: 'Outro' },
        ] })}
      </div>

      ${Input({ id: 'outro-descricao', label: 'Descrição (Opcional)', type: 'text', placeholder: 'Ex: Edição limitada, ano 2010', required: false })}

      <div class="pt-2 border-t border-[var(--color-border-light)] mt-2">
        ${Input({ id: 'outro-valor', label: 'Valor Estimado', type: 'text', placeholder: 'R$ 0,00', required: true })}
        <p class="text-[10px] text-[var(--color-text-secondary)] mt-2 italic ml-1">* Este valor será usado para o cálculo do seu patrimônio atual.</p>
      </div>
    </div>
  `;
}

function openOutrosModal(uid: string, onCreated: () => void) {
  Modal({
    title: 'Cadastrar Outro Bem',
    maxWidth: 'max-w-md',
    content: outrosContent(),
    confirmText: 'Cadastrar',
    showCancel: false,
    onConfirm: async (formData: any) => {
      const nome = (formData['outro-nome'] as string)?.trim();
      const categoria = formData['outro-categoria'] as string;
      const descricao = (formData['outro-descricao'] as string)?.trim() || '';
      const valor = parseBRL(formData['outro-valor']);

      if (!nome) {
        toaster.create({ title: 'Aviso', description: 'Preencha o nome do bem.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }
      if (!categoria) {
        toaster.create({ title: 'Aviso', description: 'Selecione a categoria.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }
      if (valor <= 0) {
        toaster.create({ title: 'Aviso', description: 'Informe o valor estimado do bem.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }

      await addDoc(collection(db, 'users', uid, 'assets'), {
        assetType: 'outros',
        name: nome,
        categoria,
        descricao,
        value: valor,
        createdAt: Timestamp.now(),
      });

      toaster.create({ title: 'Sucesso', description: 'Bem cadastrado!', type: 'success' });
      setTimeout(onCreated, 600);
    },
  });

  setTimeout(() => attachSelectListeners('outro-categoria'), 150);
}

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────────────────

export function openBemMaterialModal(onCreated: () => void) {
  const user = auth.currentUser;
  if (!user) {
    toaster.create({ title: 'Erro', description: 'Usuário não autenticado.', type: 'error' });
    return;
  }

  const { closeModal } = Modal({
    title: 'Novo Bem Material',
    maxWidth: 'max-w-md',
    fieldsPadding: 'p-6 pb-10',
    content: typeSelectionContent(),
    showFooter: false,
  });

  setTimeout(() => {
    document.getElementById('bm-select-imovel')?.addEventListener('click', () => {
      closeModal();
      setTimeout(() => openImovelModal(user.uid, onCreated), 250);
    });
    document.getElementById('bm-select-veiculo')?.addEventListener('click', () => {
      closeModal();
      setTimeout(() => openVeiculoModal(user.uid, onCreated), 250);
    });
    document.getElementById('bm-select-investimento')?.addEventListener('click', () => {
      closeModal();
      setTimeout(() => openInvestimentoModal(user.uid, onCreated), 250);
    });
    document.getElementById('bm-select-outros')?.addEventListener('click', () => {
      closeModal();
      setTimeout(() => openOutrosModal(user.uid, onCreated), 250);
    });
  }, 100);
}
