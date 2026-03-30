import { Modal } from './Modal';
import { auth } from '../lib/firebase';
import { toaster } from './Toast';
import { Input } from './Input';
import { Button, setButtonLoading } from './Button';

import { API_BASE } from '../lib/apiConfig';
const API_BASE_URL = API_BASE;
let activePollingItemId: string | null = null;
let openedPopupIds = new Set<string>();

interface PluggyConnector {
  id: number;
  name: string;
  imageUrl: string;
  primaryColor: string;
  type: string;
}

// ====================== HELPERS ======================

function updateSyncProgressBar(text: string, percent: number, imageUrl?: string) {
  const syncContainer = document.getElementById('sync-progress-container');
  const syncText = document.getElementById('sync-progress-text');
  const syncPercent = document.getElementById('sync-progress-percent');
  const syncBar = document.getElementById('sync-progress-bar');
  const logoContainer = document.getElementById('sync-bank-logo-container');

  if (syncContainer && syncText && syncPercent && syncBar) {
    syncContainer.classList.remove('hidden');
    syncContainer.classList.add('flex');
    syncText.textContent = text;
    syncPercent.textContent = `${percent}%`;
    syncBar.style.width = `${percent}%`;

    if (imageUrl && logoContainer) {
      logoContainer.innerHTML = `<img src="${imageUrl}" class="w-3.5 h-3.5 object-contain" />`;
    }
  }
}

function hideSyncProgressBar() {
  const syncContainer = document.getElementById('sync-progress-container');
  if (syncContainer) syncContainer.classList.add('hidden');
}

function openOAuthPopup(url: string) {
  const width = 600, height = 700;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  window.open(url, 'PluggyAuth', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`);
}

// ====================== MODAL PRINCIPAL ======================

export async function openBankConnectModal() {
  const user = auth.currentUser;
  if (!user) {
    toaster.create({ title: "Ops!", description: "Usuário não autenticado.", type: "error" });
    return;
  }
  
  /* Connecting a bank no longer consumes daily sync credits.
    toaster.create({ title: "Limite atingido", description: "Você não possui mais créditos de sincronização hoje.", type: "warning" });
    return;
  */

  const initialContent = `
    <div id="bank-connectors-container" class="flex flex-col items-center justify-center">
      <div class="w-8 h-8 border-2 border-[var(--color-text-secondary)] border-t-[var(--color-text)] rounded-full animate-spin"></div>
      <p class="text-[13px] text-[var(--color-text-secondary)] mt-2">Buscando instituições disponíveis...</p>
    </div>
  `;

  const { closeModal: originalClose, animateLayout } = Modal({
    title: 'Conectar Banco',
    content: initialContent,
    showFooter: false,
    showCloseButton: true,
    maxWidth: 'max-w-md',
    fieldsPadding: 'p-4',
    onConfirm: () => { /* Previne fechamento automático pelo form submit */ }
  });

  const closeModal = () => {
    // NÃO anula activePollingItemId aqui — o polling pode continuar em background
    originalClose();
  };

  const cancelAndClose = () => {
    // Cancela de verdade (botão cancelar ou fechar manual)
    activePollingItemId = null;
    originalClose();
  };

  setTimeout(async () => {
    const container = document.getElementById('bank-connectors-container');
    if (!container) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/pluggy/connectors`);
      if (!response.ok) throw new Error('Falha ao buscar conectores');

      const data = await response.json();
      const connectors: PluggyConnector[] = data.results || [];
      const validConnectors = connectors.filter(c => c.type === 'PERSONAL_BANK' || c.type === 'BUSINESS_BANK');

      if (validConnectors.length === 0) {
        container.innerHTML = `<div class="p-8 text-center text-[14px] text-[var(--color-text)]">Nenhum banco disponível.</div>`;
        animateLayout();
        return;
      }

      container.classList.remove('items-center', 'justify-center');

      // ====================== RENDER GRID ======================

      const renderGrid = (list: PluggyConnector[]) => {
        if (list.length === 0) return `<div class="py-8 text-center text-[13px] text-[var(--color-text-secondary)]">Nenhum banco encontrado.</div>`;
        return list.slice(0, 15).map(c => `
          <button type="button" data-connector-id="${c.id}" class="connector-btn flex items-center justify-between w-full px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[var(--color-border)] rounded-xl hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.15)] transition-all cursor-pointer">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full border-2 border-[rgba(255,255,255,0.15)] bg-white p-1.5 shrink-0 shadow-[0_0_0_3px_rgba(255,255,255,0.05)]">
                <img src="${c.imageUrl}" class="w-full h-full object-contain rounded-full" />
              </div>
              <span class="text-[13px] font-medium text-[var(--color-text)] text-left">${c.name}</span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-40"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        `).join('');
      };

      // ====================== RENDER LISTA DE BANCOS ======================

      const renderBankList = () => {
        container.innerHTML = `
          <div class="w-full flex flex-col gap-4">
            <div class="relative flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 text-[var(--color-text-secondary)]"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="search-bank-input" placeholder="Buscar instituição..." class="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl pl-10 pr-4 py-2.5 text-[13px] text-[var(--color-text)]" autocomplete="off">
            </div>
            <div id="bank-grid" class="flex flex-col gap-2 w-full overflow-y-auto max-h-[400px] no-scrollbar">
              ${renderGrid(validConnectors)}
            </div>
          </div>
        `;
        animateLayout();

        const attachConnectorListeners = (parent: Element | Document) => {
          parent.querySelectorAll('.connector-btn').forEach(btn => btn.addEventListener('click', (e) => {
            e.preventDefault();
            const id = btn.getAttribute('data-connector-id');
            if (id) renderCredentialsStep(Number(id));
          }));
        };

        attachConnectorListeners(container);

        const input = document.getElementById('search-bank-input') as HTMLInputElement;
        input?.addEventListener('input', (e) => {
          const val = (e.target as HTMLInputElement).value.toLowerCase();
          const grid = document.getElementById('bank-grid');
          if (grid) {
            grid.innerHTML = renderGrid(validConnectors.filter(c => c.name.toLowerCase().includes(val)));
            attachConnectorListeners(grid);
          }
        });
      };

      // ====================== RENDER CREDENCIAIS ======================

      const renderCredentialsStep = (connectorId: number) => {
        const connector = validConnectors.find(c => c.id === connectorId);
        if (!connector) return;
        const isBusiness = connector.type === 'BUSINESS_BANK';

        container.innerHTML = `
          <div class="flex flex-col gap-5 animate-fadein w-full py-4">
            <div class="flex items-center gap-3 mb-2">
              <div class="w-8 h-8 rounded-full border bg-white p-1">
                <img src="${connector.imageUrl}" class="w-full h-full object-contain" />
              </div>
              <span class="text-[14px] font-medium text-[var(--color-text)]">${connector.name}</span>
            </div>
            <div class="w-full">${Input({ id: 'credential-input', type: 'text', label: `Informe seu ${isBusiness ? 'CNPJ' : 'CPF'}`, placeholder: isBusiness ? '00.000.000/0000-00' : '000.000.000-00' })}</div>
            <div class="w-full mt-2">${Button({ id: 'btn-submit-connection', text: 'Continuar', type: 'button' })}</div>
          </div>
        `;
        animateLayout();

        const input = document.getElementById('credential-input') as HTMLInputElement;
        input?.addEventListener('input', (e) => {
          let v = (e.target as HTMLInputElement).value.replace(/\D/g, '');
          if (isBusiness) {
            if (v.length > 14) v = v.slice(0, 14);
            v = v.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
          } else {
            if (v.length > 11) v = v.slice(0, 11);
            v = v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})\.(\d{3})(\d)/, '$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
          }
          (e.target as HTMLInputElement).value = v;
        });

        document.getElementById('btn-submit-connection')?.addEventListener('click', (e) => {
          e.preventDefault();
          const val = input.value.replace(/\D/g, '');
          const minLen = isBusiness ? 14 : 11;
          if (val.length < minLen) {
            toaster.create({ title: "Atenção", description: `${isBusiness ? 'CNPJ' : 'CPF'} inválido.`, type: "warning" });
            return;
          }
          renderConfirmStep(connectorId, val);
        });
      };

      // ====================== RENDER CONFIRMAÇÃO ======================

      const renderConfirmStep = (connectorId: number, credentialValue: string) => {
        const connector = validConnectors.find(c => c.id === connectorId);
        if (!connector) return;

        container.innerHTML = `
          <div class="flex flex-col items-center gap-6 w-full py-4 text-center">
            <div class="flex items-center justify-center gap-3">
              <div class="w-14 h-14 rounded-full bg-white border flex items-center justify-center p-2.5">
                <img src="/assets/logo/logo.png" class="w-full h-full object-contain" />
              </div>
              <div class="w-10 border-t-2 border-dashed border-[var(--color-border)]"></div>
              <div class="w-14 h-14 rounded-full bg-white border flex items-center justify-center p-2.5">
                <img src="${connector.imageUrl}" class="w-full h-full object-contain" />
              </div>
            </div>
            <h3 class="text-[16px] font-medium text-[var(--color-text)]">Conectar de forma segura</h3>
            <p class="text-[13px] text-[var(--color-text-secondary)]">
              O ControlarMais importará seu saldo e transações automaticamente. Suas credenciais são criptografadas e nunca salvas.
            </p>
            <div class="w-full">${Button({ id: 'btn-start-sync', text: 'Começar sincronizar', type: 'button' })}</div>
          </div>
        `;
        animateLayout();

        document.getElementById('btn-start-sync')?.addEventListener('click', async (e) => {
          const btn = e.currentTarget as HTMLButtonElement;
          setButtonLoading(btn, true);

          try {
            const user = auth.currentUser;
            if (!user) throw new Error('Não autenticado');
            const token = await user.getIdToken();

            const credentials = connector.type === 'BUSINESS_BANK'
              ? { cnpj: credentialValue }
              : { cpf: credentialValue };

            const res = await fetch(`${API_BASE_URL}/api/pluggy/create-item`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: JSON.stringify({ connectorId, credentials })
            });

            const createData = await res.json();
            if (!res.ok) throw new Error(createData.error || 'Erro ao conectar');

            const itemId: string = createData.item?.id || createData.id || createData.itemId;
            if (!itemId) throw new Error('ID do item não retornado pelo servidor');

            activePollingItemId = itemId;

            // Se já tem oauthUrl direto, abre popup
            if (createData.oauthUrl) {
              openedPopupIds.add(itemId);
              openOAuthPopup(createData.oauthUrl);
            }

            renderPollingStep(connectorId, itemId, token);

          } catch (err: any) {
            toaster.create({ title: "Erro", description: err.message, type: "error" });
            setButtonLoading(btn, false);
          }
        });
      };

      // ====================== RENDER POLLING (QR / OAuth / Aguardo) ======================

      const renderPollingStep = (connectorId: number, itemId: string, token: string) => {
        const connector = validConnectors.find(c => c.id === connectorId);

        // Atualiza mensagem no modal (se ainda estiver aberto) E na barra de progresso
        function renderWaiting(message: string, percent: number) {
          // Sempre atualiza a barra de progresso no header (funciona mesmo com modal fechado)
          updateSyncProgressBar(message, percent, connector?.imageUrl);

          // Atualiza mensagem no modal apenas se ainda estiver visível
          const msgEl = document.getElementById('polling-message');
          if (msgEl) msgEl.textContent = message;
        }

        container.innerHTML = `
          <div class="flex flex-col items-center gap-5 w-full py-4 text-center" id="polling-inner">
            <div class="flex items-center justify-center gap-3 mb-1">
              <div class="w-10 h-10 rounded-full bg-white border flex items-center justify-center p-1.5">
                <img src="${connector?.imageUrl}" class="w-full h-full object-contain" />
              </div>
            </div>

            <!-- Área de QR Code (oculta por padrão) -->
            <div id="qr-area" class="hidden flex-col items-center gap-3 w-full">
              <p class="text-[13px] font-medium text-[var(--color-text)]">Escaneie o QR Code no seu app do banco</p>
              <div class="bg-white p-3 rounded-xl border border-[var(--color-border)] inline-block">
                <img id="qr-image" src="" alt="QR Code" class="w-48 h-48 object-contain" />
              </div>
              <p class="text-[12px] text-[var(--color-text-secondary)]">Abra o aplicativo do seu banco e escaneie o código acima</p>
            </div>

            <!-- Área de OAuth (oculta por padrão) -->
            <div id="oauth-area" class="hidden flex-col items-center gap-3 w-full">
              <p class="text-[13px] font-medium text-[var(--color-text)]">Autorize no seu banco</p>
              <p class="text-[12px] text-[var(--color-text-secondary)]">Uma janela foi aberta para você autorizar o acesso. Após autorizar, retorne aqui.</p>
              <button type="button" id="btn-reopen-popup" class="text-[12px] text-[var(--color-primary)] underline">Abrir novamente</button>
            </div>

            <!-- Spinner padrão -->
            <div id="spinner-area" class="flex flex-col items-center gap-2">
              <div class="w-8 h-8 border-2 border-[var(--color-text-secondary)] border-t-[var(--color-text)] rounded-full animate-spin"></div>
            </div>

            <p id="polling-message" class="text-[13px] text-[var(--color-text-secondary)]">Iniciando conexão...</p>

            <button type="button" id="btn-cancel-polling" class="text-[12px] text-[var(--color-text-secondary)] underline opacity-70 hover:opacity-100 mt-2">Cancelar</button>
          </div>
        `;
        animateLayout();

        // Botão cancelar — cancela de verdade
        document.getElementById('btn-cancel-polling')?.addEventListener('click', () => {
          cancelAndClose();
        });

        let lastOAuthUrl: string | null = null;

        document.getElementById('btn-reopen-popup')?.addEventListener('click', () => {
          if (lastOAuthUrl) openOAuthPopup(lastOAuthUrl);
        });

        // ====================== POLLING LOOP ======================

        const checkItem = async () => {
          // Polling só para se activePollingItemId for explicitamente anulado
          if (activePollingItemId !== itemId) return;

          try {
            const req = await fetch(`${API_BASE_URL}/api/pluggy/items/${itemId}`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await req.json();

            if (!req.ok || !data.success) {
              if (activePollingItemId === itemId) setTimeout(checkItem, 3000);
              return;
            }

            const item = data.item;
            const status: string = item?.status || '';
            const paramType: string = item?.parameter?.type || '';
            const paramData: string = item?.parameter?.data || '';

            // --- WAITING_USER_INPUT ---
            if (status === 'WAITING_USER_INPUT') {

              if (paramType === 'qr_code' && paramData) {
                document.getElementById('spinner-area')?.classList.add('hidden');
                document.getElementById('oauth-area')?.classList.add('hidden');
                const qrArea = document.getElementById('qr-area');
                const qrImage = document.getElementById('qr-image') as HTMLImageElement;
                if (qrArea && qrImage) {
                  qrArea.classList.remove('hidden');
                  qrArea.classList.add('flex');
                  qrImage.src = paramData.startsWith('data:') ? paramData : `data:image/png;base64,${paramData}`;
                }
                renderWaiting('Aguardando leitura do QR Code...', 35);

              } else if (paramType === 'oauth' && paramData && !openedPopupIds.has(itemId)) {
                openedPopupIds.add(itemId);
                lastOAuthUrl = paramData;
                openOAuthPopup(paramData);

                document.getElementById('spinner-area')?.classList.add('hidden');
                document.getElementById('qr-area')?.classList.add('hidden');
                const oauthArea = document.getElementById('oauth-area');
                if (oauthArea) {
                  oauthArea.classList.remove('hidden');
                  oauthArea.classList.add('flex');
                }
                renderWaiting('Aguardando autorização no banco...', 30);

              } else {
                renderWaiting('Aguardando sua ação no banco...', 30);
              }
            }

            // --- UPDATING ---
            // IMPORTANTE: NÃO anular activePollingItemId aqui!
            // O polling precisa continuar em background até detectar UPDATED para chamar o sync.
            else if (status === 'UPDATING') {
              // Fecha o modal mas mantém o polling rodando em background
              closeModal();
              renderWaiting('Sincronizando com o banco...', 55);
              // Não retorna — continua o loop
            }

            // --- OUTDATED ---
            else if (status === 'OUTDATED') {
              renderWaiting('Quase lá, processando...', 70);
            }

            // --- UPDATED (sucesso!) ---
            else if (status === 'UPDATED') {
              // Para o polling antes de qualquer await
              activePollingItemId = null;

              renderWaiting('Conexão aprovada! Importando dados...', 90);

              // Garante que o modal esteja fechado (pode já estar, é idempotente)
              closeModal();

              setTimeout(() => {
                updateSyncProgressBar('Importando contas e transações...', 92, connector?.imageUrl);

                fetch(`${API_BASE_URL}/api/pluggy/sync`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                  body: JSON.stringify({ itemId: item.id, fullHistory: true })
                })
                  .then(r => r.json())
                  .then((syncData) => {
                    if (syncData.success) {
                      updateSyncProgressBar('Sincronização concluída!', 100, connector?.imageUrl);
                      toaster.create({
                        title: "Conectado!",
                        description: `${syncData.accounts?.length || 0} conta(s) importada(s) com sucesso.`,
                        type: "success"
                      });
                      window.dispatchEvent(new CustomEvent('app-sync-completed'));
                      setTimeout(hideSyncProgressBar, 3000);
                    } else {
                      toaster.create({ title: "Aviso", description: syncData.error || 'Erro ao importar dados.', type: "error" });
                      hideSyncProgressBar();
                    }
                  })
                  .catch(err => {
                    console.error('[Sync error]', err);
                    toaster.create({ title: "Erro", description: "Falha ao importar dados do banco.", type: "error" });
                    hideSyncProgressBar();
                  });
              }, 800);

              return; // Para o polling definitivamente
            }

            // --- LOGIN_ERROR ---
            else if (status === 'LOGIN_ERROR') {
              activePollingItemId = null;
              const errMsg = item?.error?.message || 'Credenciais inválidas ou sessão expirada.';

              // Garante que o modal está aberto para exibir o erro
              // Se já fechou (background), reabre com mensagem de erro via toaster
              const pollingInner = document.getElementById('polling-inner');
              if (pollingInner) {
                container.innerHTML = `
                  <div class="flex flex-col items-center gap-4 py-6 text-center">
                    <div class="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-red-500"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <p class="text-[14px] font-medium text-[var(--color-text)]">Falha na autenticação</p>
                    <p class="text-[13px] text-[var(--color-text-secondary)]">${errMsg}</p>
                    <div class="w-full mt-2">${Button({ id: 'btn-retry-bank', text: 'Tentar novamente', type: 'button' })}</div>
                  </div>
                `;
                document.getElementById('btn-retry-bank')?.addEventListener('click', () => renderBankList());
                animateLayout();
              } else {
                // Modal já fechado — notifica via toaster
                toaster.create({ title: "Erro de autenticação", description: errMsg, type: "error" });
              }
              hideSyncProgressBar();
              return; // Para o polling
            }

            // --- Continua o polling para qualquer outro status ---
            if (activePollingItemId === itemId) setTimeout(checkItem, 3000);

          } catch (e) {
            if (activePollingItemId === itemId) setTimeout(checkItem, 3000);
          }
        };

        // Inicia polling com delay inicial
        setTimeout(checkItem, 1500);
      };

      // Inicia renderizando a lista de bancos
      renderBankList();

    } catch (e: any) {
      const container = document.getElementById('bank-connectors-container');
      if (container) {
        container.innerHTML = `<p class="p-8 text-center text-red-500">${e.message}</p>`;
        animateLayout();
      }
    }
  }, 100);
}
