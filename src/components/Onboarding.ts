import gsap from 'gsap';

type OnboardingPlacement = 'auto' | 'top' | 'right' | 'bottom' | 'left' | 'center';

interface OnboardingStep {
  id: string;
  title: string;
  body: string;
  selector?: string | string[];
  placement?: OnboardingPlacement;
  mapItems?: Array<{
    title: string;
    body: string;
  }>;
}

const STYLE_ID = 'controlar-onboarding-styles';
const ROOT_ID = 'controlar-onboarding-root';
const LAUNCHER_ID = 'controlar-onboarding-launcher';
const STORAGE_VERSION = 'v2';

const MODULE_MAP = [
  {
    title: 'Visao Geral',
    body: 'O painel inicial junta saldo previsto, receitas, despesas, contas, cartoes, categorias e calendario.',
  },
  {
    title: 'Movimentacoes',
    body: 'Lista entradas e saidas das contas correntes, com busca, filtros por conta, tipo e periodo.',
  },
  {
    title: 'Cartao de Credito',
    body: 'Mostra faturas atual, ultima e historico, alem de transacoes, estornos e ajustes de fechamento.',
  },
  {
    title: 'Categorias',
    body: 'Permite criar, editar e organizar categorias usadas nas movimentacoes e relatorios.',
  },
  {
    title: 'Lembretes',
    body: 'Guarda contas, compromissos e receitas recorrentes que precisam de acompanhamento.',
  },
  {
    title: 'Assinaturas',
    body: 'Controla servicos recorrentes, status de pagamento e totais do mes.',
  },
  {
    title: 'Bancos Conectados',
    body: 'Gerencia conexoes bancarias, contas manuais, sincronizacoes e creditos de sync.',
  },
  {
    title: 'Patrimonio',
    body: 'Reune caixinhas, poupancas e bens materiais para acompanhar seu patrimonio.',
  },
  {
    title: 'Configuracoes',
    body: 'No avatar ficam perfil, seguranca, plano, financeiro, novidades, suporte e saida da conta.',
  },
];

const OVERVIEW_STEPS: OnboardingStep[] = [
  {
    id: 'overview-welcome',
    title: 'Bem-vindo ao tour',
    body: 'Este balao mostra os pontos importantes da tela e acompanha voce em cada modulo. Use avancar para seguir o roteiro ou abra o tutorial quando quiser pelo botao flutuante.',
    selector: ['#app-header', 'main'],
    placement: 'bottom',
  },
  {
    id: 'overview-map',
    title: 'O que cada tela faz',
    body: 'Este e o mapa rapido do sistema. Na Visao Geral voce entende o todo; nos outros modulos voce detalha, edita e acompanha cada area.',
    selector: ['#app-nav-container', '#mobile-menu-btn', '#app-header'],
    placement: 'bottom',
    mapItems: MODULE_MAP,
  },
  {
    id: 'overview-nav-dashboard',
    title: 'Visao Geral',
    body: 'Volte para este painel sempre que quiser uma leitura rapida da sua vida financeira do mes.',
    selector: ['#nav-btn-dashboard', '#mobile-nav-dashboard', '#header-logo-wrapper'],
    placement: 'bottom',
  },
  {
    id: 'overview-nav-transactions',
    title: 'Menu de transacoes',
    body: 'Aqui ficam Movimentacoes, Cartao de Credito e Categorias. No desktop, abra o menu para escolher; no celular, use o menu lateral.',
    selector: ['#nav-btn-transactions', '#mobile-menu-btn'],
    placement: 'bottom',
  },
  {
    id: 'overview-nav-recurring',
    title: 'Recorrencias',
    body: 'Use este menu para alternar entre Lembretes e Assinaturas, duas areas que alimentam a previsao do dashboard.',
    selector: ['#nav-btn-recorrencias', '#mobile-menu-btn'],
    placement: 'bottom',
  },
  {
    id: 'overview-nav-banks',
    title: 'Bancos e patrimonio',
    body: 'Bancos Conectados cuida das contas e sincronizacoes. Patrimonio acompanha reservas, caixinhas e bens materiais.',
    selector: ['#nav-btn-banks', '#nav-btn-patrimony', '#mobile-menu-btn'],
    placement: 'bottom',
  },
  {
    id: 'overview-avatar',
    title: 'Perfil e ajustes',
    body: 'Clique no avatar para acessar perfil, plano, seguranca, financeiro, novidades e suporte.',
    selector: '#topbar-avatar-container',
    placement: 'bottom',
  },
];

const PAGE_STEPS: Record<string, OnboardingStep[]> = {
  dashboard: [
    {
      id: 'dashboard-intro',
      title: 'Visao Geral',
      body: 'Esta tela resume o mes. Ela combina contas, cartoes, recorrencias e configuracoes financeiras para mostrar o saldo livre previsto.',
      selector: '#dashboard-dynamic-content',
      placement: 'center',
    },
    {
      id: 'dashboard-balance',
      title: 'Saldo livre previsto',
      body: 'O card principal calcula quanto deve sobrar considerando seu saldo atual, receitas previstas e despesas do mes.',
      selector: '.overview-card-main',
    },
    {
      id: 'dashboard-config',
      title: 'Ajuste a previsao',
      body: 'Este botao liga ou desliga itens usados na previsao, como salario, vale, assinaturas, lembretes e cartoes.',
      selector: '#overview-config-trigger',
    },
    {
      id: 'dashboard-kpis',
      title: 'Indicadores rapidos',
      body: 'Os cards menores mostram salario bruto, proximo pagamento, receitas e despesas para voce bater o olho no mes.',
      selector: '.overview-card-small',
    },
    {
      id: 'dashboard-accounts',
      title: 'Saldo em contas',
      body: 'Aqui voce escolhe quais contas entram no saldo total. O filtro permite incluir ou ocultar contas da previsao.',
      selector: ['.accounts-balance-card', '#dashboard-accounts-filter-trigger'],
    },
    {
      id: 'dashboard-credit-stack',
      title: 'Cartoes no painel',
      body: 'A pilha mostra fatura atual, ultima ou historico. Arraste quando houver mais de um cartao e ajuste o filtro pelo seletor.',
      selector: '#cc-stack-container',
    },
    {
      id: 'dashboard-category-chart',
      title: 'Gastos por categoria',
      body: 'O grafico mostra onde o dinheiro esta indo no mes, agrupando suas transacoes por categoria.',
      selector: '.category-spent-card',
    },
    {
      id: 'dashboard-calendar',
      title: 'Calendario de gastos',
      body: 'Use o calendario para enxergar dias com movimentacoes, receitas, despesas e lembretes.',
      selector: '.spending-calendar-card',
    },
  ],
  'connected-banks': [
    {
      id: 'banks-intro',
      title: 'Bancos Conectados',
      body: 'Nesta tela voce conecta bancos, acompanha contas sincronizadas e cria contas manuais quando precisar.',
      selector: 'main',
      placement: 'center',
    },
    {
      id: 'banks-connect',
      title: 'Conectar conta',
      body: 'Use este botao para iniciar uma nova conexao bancaria automatica.',
      selector: '#btn-connect-bank-header',
    },
    {
      id: 'banks-manual',
      title: 'Conta manual',
      body: 'Crie contas manuais para registrar saldos e lancamentos que nao vem de banco conectado.',
      selector: '#btn-create-manual-account',
    },
    {
      id: 'banks-credits',
      title: 'Coins de sincronizacao',
      body: 'Quando disponivel, este indicador mostra creditos para sincronizar dados bancarios adicionais.',
      selector: ['#connect-credits-display', '#btn-connect-bank-header'],
    },
    {
      id: 'banks-list',
      title: 'Lista de contas',
      body: 'As contas aparecem aqui com saldo, status e acoes de sincronizacao ou gerenciamento.',
      selector: '#accounts-list-container',
    },
  ],
  'credit-cards': [
    {
      id: 'cards-intro',
      title: 'Cartoes de Credito',
      body: 'Aqui voce acompanha faturas, limites, transacoes de cartao, estornos e configuracoes de fechamento.',
      selector: 'main',
      placement: 'center',
    },
    {
      id: 'cards-selector',
      title: 'Escolha o cartao',
      body: 'Use o seletor para alternar entre os cartoes conectados.',
      selector: '#card-selector-slot',
    },
    {
      id: 'cards-summary',
      title: 'Resumo de faturas',
      body: 'Estes cards alternam entre historico, ultima fatura e fatura atual. Clique em um deles para filtrar a tabela.',
      selector: '#summary-cards',
    },
    {
      id: 'cards-closing',
      title: 'Fechamento',
      body: 'Configure datas de fechamento e vencimento para deixar as faturas mais precisas.',
      selector: '#btn-closing-settings',
    },
    {
      id: 'cards-manual',
      title: 'Lancamento manual',
      body: 'Quando o cartao permitir, este botao adiciona uma compra manualmente.',
      selector: '#btn-manual-cc-transaction',
    },
    {
      id: 'cards-table',
      title: 'Tabela de transacoes',
      body: 'A tabela detalha compras, pagamentos, encargos e acoes de cada item da fatura selecionada.',
      selector: '#credit-cards-container',
    },
  ],
  categories: [
    {
      id: 'categories-intro',
      title: 'Categorias',
      body: 'Categorias organizam gastos e receitas. Elas aparecem nos graficos, filtros e listas de movimentacoes.',
      selector: 'main',
      placement: 'center',
    },
    {
      id: 'categories-create',
      title: 'Criar categoria',
      body: 'Adicione categorias personalizadas para deixar a organizacao com a sua cara.',
      selector: '#btn-create-category',
    },
    {
      id: 'categories-list',
      title: 'Grupos de categorias',
      body: 'As categorias sao agrupadas por tipo. Passe o mouse ou toque nas acoes para editar e excluir.',
      selector: '#categories-container',
    },
  ],
  transactions: [
    {
      id: 'transactions-intro',
      title: 'Movimentacoes',
      body: 'Esta tela lista entradas e saidas das contas correntes, separando transacoes de cartao, poupanca e investimentos.',
      selector: 'main',
      placement: 'center',
    },
    {
      id: 'transactions-search',
      title: 'Busca',
      body: 'Pesquise por descricao, categoria ou informacoes da movimentacao.',
      selector: '#tx-search-input',
    },
    {
      id: 'transactions-filter',
      title: 'Filtros',
      body: 'Filtre por conta, tipo de movimentacao e periodo para encontrar exatamente o que precisa.',
      selector: '#tx-filter-toggle',
    },
    {
      id: 'transactions-manual',
      title: 'Lancamento manual',
      body: 'Em contas manuais, este botao adiciona receitas ou despesas sem depender da sincronizacao bancaria.',
      selector: '#btn-manual-transaction',
    },
    {
      id: 'transactions-table',
      title: 'Lista de movimentacoes',
      body: 'A lista mostra data, descricao, categoria, valor e acoes disponiveis para cada lancamento.',
      selector: '#transactions-container',
    },
  ],
  reminders: [
    {
      id: 'reminders-intro',
      title: 'Lembretes',
      body: 'Use lembretes para contas, compromissos e receitas que precisam aparecer na sua rotina financeira.',
      selector: 'main',
      placement: 'center',
    },
    {
      id: 'reminders-create',
      title: 'Novo lembrete',
      body: 'Crie lembretes de receita ou despesa com valor, frequencia e vencimento.',
      selector: '#btn-add-reminder',
    },
    {
      id: 'reminders-summary',
      title: 'Resumo mensal',
      body: 'Quando houver lembretes, o resumo mostra valores a receber, a pagar e total mensal.',
      selector: ['.rem-summary', '#btn-add-reminder'],
    },
    {
      id: 'reminders-filters',
      title: 'Filtros e mes',
      body: 'Alterne status, tipo e mes para acompanhar apenas o que importa agora.',
      selector: ['#rem-toolbar', '#rem-status-selector', '#rem-month-selector'],
    },
    {
      id: 'reminders-list',
      title: 'Lista de lembretes',
      body: 'Os cards indicam frequencia, valor, status e alertas de vencimento.',
      selector: '#reminders-list-container',
    },
  ],
  subscriptions: [
    {
      id: 'subscriptions-intro',
      title: 'Assinaturas',
      body: 'Aqui ficam servicos recorrentes e pagamentos mensais, com status de aberto ou pago.',
      selector: 'main',
      placement: 'center',
    },
    {
      id: 'subscriptions-create',
      title: 'Nova assinatura',
      body: 'Cadastre assinaturas e recorrencias fixas para entrar na previsao do mes.',
      selector: '#btn-add-subscription',
    },
    {
      id: 'subscriptions-summary',
      title: 'Resumo do mes',
      body: 'Veja total do mes, o que ja foi pago e o que ainda falta pagar.',
      selector: ['.subs-summary', '#btn-add-subscription'],
    },
    {
      id: 'subscriptions-search',
      title: 'Busca e filtros',
      body: 'Pesquise pelo nome da assinatura e alterne status ou mes para organizar a lista.',
      selector: ['#subs-search', '#subs-status-selector', '#subs-month-selector'],
    },
    {
      id: 'subscriptions-list',
      title: 'Lista de assinaturas',
      body: 'Os cards mostram valor, vencimento, status e acoes para confirmar pagamento ou editar.',
      selector: '#subscriptions-list-container',
    },
  ],
  patrimony: [
    {
      id: 'patrimony-intro',
      title: 'Patrimonio',
      body: 'Esta tela concentra caixinhas, poupancas e bens materiais para acompanhar sua evolucao patrimonial.',
      selector: 'main',
      placement: 'center',
    },
    {
      id: 'patrimony-create',
      title: 'Adicionar item',
      body: 'Crie caixinhas ou bens materiais pelo menu de criacao.',
      selector: '#btn-create-savings',
    },
    {
      id: 'patrimony-filter',
      title: 'Filtro de reservas',
      body: 'Alterne a visualizacao para focar em todos os itens ou apenas nos que tem saldo.',
      selector: '#savings-filter',
    },
    {
      id: 'patrimony-list',
      title: 'Lista patrimonial',
      body: 'Aqui aparecem reservas e bens com valores, metas, extrato e acoes de edicao.',
      selector: '#patrimony-list-container',
    },
  ],
  settings: [
    {
      id: 'settings-intro',
      title: 'Configuracoes',
      body: 'Aqui voce cuida de perfil, seguranca, plano e parametros financeiros usados no dashboard.',
      selector: '#settings-shell main',
      placement: 'center',
    },
    {
      id: 'settings-tabs',
      title: 'Abas laterais',
      body: 'Troque entre Meu Perfil, Seguranca, Meu Plano e Financeiro por este menu.',
      selector: '#settings-nav',
    },
    {
      id: 'settings-profile',
      title: 'Meu Perfil',
      body: 'Atualize dados pessoais usados para conta, assinatura e suporte.',
      selector: '#tab-profile',
    },
    {
      id: 'settings-security',
      title: 'Seguranca',
      body: 'Gerencie senha, sessoes e recursos de protecao da conta.',
      selector: '#tab-security',
    },
    {
      id: 'settings-plan',
      title: 'Meu Plano',
      body: 'Veja assinatura, faturas e informacoes do plano ativo.',
      selector: '#tab-plan',
    },
    {
      id: 'settings-financeiro',
      title: 'Financeiro',
      body: 'Configure salario, vale e descontos que alimentam a previsao da Visao Geral.',
      selector: '#tab-financeiro',
    },
  ],
  updates: [
    {
      id: 'updates-intro',
      title: 'O que ha de novo',
      body: 'Esta tela mostra melhorias, correcoes e novidades publicadas no sistema.',
      selector: '#updates-shell main',
      placement: 'center',
    },
    {
      id: 'updates-header',
      title: 'Resumo de novidades',
      body: 'O topo apresenta a proposta da pagina e prepara a linha do tempo de atualizacoes.',
      selector: '#header-text',
    },
    {
      id: 'updates-timeline',
      title: 'Linha do tempo',
      body: 'As atualizacoes aparecem em ordem cronologica com versao, tags e detalhes.',
      selector: ['#updates-timeline', '#updates-dynamic-content'],
    },
  ],
  admin: [
    {
      id: 'admin-intro',
      title: 'Painel Admin',
      body: 'O painel administrativo concentra metricas, usuarios, configuracoes e status de integracoes.',
      selector: '#admin-shell main',
      placement: 'center',
    },
    {
      id: 'admin-kpis',
      title: 'Indicadores administrativos',
      body: 'Os cards mostram numeros importantes do sistema para acompanhamento rapido.',
      selector: ['.admin-kpi-card', '.growth-kpi-card', 'main'],
    },
    {
      id: 'admin-tables',
      title: 'Tabelas e operacoes',
      body: 'Use tabelas, filtros e botoes de acao para revisar usuarios, sincronizacoes e operacoes.',
      selector: ['.admin-table', '.cc-table-wrapper', 'main'],
    },
  ],
  'admin-subscriptions': [
    {
      id: 'admin-users-intro',
      title: 'Gestao de usuarios',
      body: 'Acompanhe funil, trials, assinaturas, bancos conectados e ultimo acesso.',
      selector: '#admin-subscriptions-content-area',
      placement: 'center',
    },
    {
      id: 'admin-users-search',
      title: 'Busca e filtros',
      body: 'Use busca, periodo e filtros para encontrar segmentos especificos de usuarios.',
      selector: ['#admin-user-search', '.admin-filters-scroller'],
    },
    {
      id: 'admin-users-table',
      title: 'Tabela de usuarios',
      body: 'A tabela permite ordenar, abrir detalhes, revisar funil e executar acoes administrativas.',
      selector: '#admin-subscriptions-content-area',
    },
  ],
  'admin-abandoned-carts': [
    {
      id: 'admin-carts-intro',
      title: 'Carrinhos abandonados',
      body: 'Acompanhe usuarios que iniciaram cadastro ou checkout e precisam de recuperacao.',
      selector: '#admin-abandoned-content-area',
      placement: 'center',
    },
  ],
  'admin-updates': [
    {
      id: 'admin-updates-intro',
      title: 'Atualizacoes',
      body: 'Crie, edite, publique e dispare comunicados de novidades do sistema.',
      selector: '#btn-create-update',
    },
    {
      id: 'admin-updates-list',
      title: 'Listagem',
      body: 'Revise rascunhos e publicacoes, com acoes de editar, excluir ou notificar.',
      selector: ['#cl-table-scroll', '#cl-cards', '.cc-table-wrapper'],
    },
  ],
  'admin-automation': [
    {
      id: 'admin-automation-intro',
      title: 'Automacao com IA',
      body: 'Use o campo central para pedir analises, acoes e automacoes assistidas.',
      selector: '#ai-input-wrapper',
    },
    {
      id: 'admin-automation-suggestions',
      title: 'Sugestoes',
      body: 'Os cards ajudam a iniciar pedidos comuns sem precisar escrever do zero.',
      selector: ['.suggestion-card', '#suggestions-grid', 'main'],
    },
  ],
  'admin-automation-chat': [
    {
      id: 'admin-chat-intro',
      title: 'Conversa de automacao',
      body: 'Continue a conversa, acompanhe respostas e use acoes sugeridas pela IA.',
      selector: '#chat-shell',
      placement: 'center',
    },
    {
      id: 'admin-chat-input',
      title: 'Entrada de mensagem',
      body: 'Digite o proximo comando ou pergunta neste campo.',
      selector: '#chat-input-area',
    },
  ],
};

const CSS = `
  #${LAUNCHER_ID} {
    position: fixed;
    right: 24px;
    bottom: 24px;
    width: 54px;
    height: 54px;
    border: 1px solid color-mix(in srgb, var(--color-border) 72%, rgba(217,119,87,0.42));
    border-radius: 999px;
    background:
      radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18), transparent 36%),
      linear-gradient(145deg, color-mix(in srgb, var(--color-surface) 86%, rgba(217,119,87,0.16)), var(--color-surface));
    color: var(--color-text);
    box-shadow: 0 18px 45px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.08);
    backdrop-filter: blur(18px) saturate(1.28);
    -webkit-backdrop-filter: blur(18px) saturate(1.28);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9990;
    padding: 0;
    opacity: 0;
    transform: translateY(16px) scale(0.82);
    pointer-events: none;
    transition: border-color 0.25s ease, background-color 0.25s ease, bottom 0.25s ease;
  }

  #${LAUNCHER_ID}.is-topbar {
    position: relative;
    right: auto;
    bottom: auto;
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    border: 0;
    background: transparent;
    color: var(--color-text-secondary);
    box-shadow: none;
    transform: none;
    z-index: 11;
    margin-right: 2px;
  }

  #${LAUNCHER_ID}.is-visible {
    opacity: 1;
    transform: translateY(0) scale(1);
    pointer-events: auto;
  }

  #${LAUNCHER_ID}.is-offset {
    bottom: 92px;
  }

  #${LAUNCHER_ID}.is-topbar.is-offset {
    bottom: auto;
  }

  #${LAUNCHER_ID}:hover {
    border-color: rgba(217,119,87,0.62);
  }

  #${LAUNCHER_ID}.is-topbar:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  #${LAUNCHER_ID}:focus-visible {
    outline: 2px solid #D97757;
    outline-offset: 3px;
  }

  #${LAUNCHER_ID} .cm-launcher-icon {
    width: 23px;
    height: 23px;
  }

  #${LAUNCHER_ID}.is-topbar .cm-launcher-icon {
    width: 21px;
    height: 21px;
    transform-origin: center;
    animation: cm-onboarding-shake 4s ease infinite;
  }

  #${LAUNCHER_ID} .cm-launcher-pulse {
    position: absolute;
    inset: -5px;
    border-radius: inherit;
    border: 1px solid rgba(217,119,87,0.34);
    animation: cm-onboarding-pulse 2.4s ease-out infinite;
    pointer-events: none;
  }

  #${LAUNCHER_ID}.is-topbar .cm-launcher-pulse {
    display: none;
  }

  #${LAUNCHER_ID} .cm-launcher-tip {
    position: absolute;
    right: 66px;
    top: 50%;
    transform: translateY(-50%) translateX(6px);
    padding: 7px 10px;
    border-radius: 12px;
    background: var(--dropdown-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-menu);
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  #${LAUNCHER_ID}:hover .cm-launcher-tip,
  #${LAUNCHER_ID}:focus-visible .cm-launcher-tip {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }

  #${LAUNCHER_ID}.is-topbar .cm-launcher-tip {
    display: none;
  }

  #${ROOT_ID} {
    position: fixed;
    inset: 0;
    z-index: 10020;
    pointer-events: none;
    display: none;
  }

  #${ROOT_ID}.is-active {
    display: block;
  }

  .cm-onboarding-spotlight {
    position: fixed;
    left: 0;
    top: 0;
    width: 0;
    height: 0;
    border-radius: 18px;
    box-shadow: 0 0 0 9999px rgba(0,0,0,0.65);
    pointer-events: none;
    transform-origin: center center;
    will-change: transform, width, height, border-radius, box-shadow;
  }

  .cm-onboarding-spotlight::before,
  .cm-onboarding-spotlight::after,
  .cm-onboarding-beacon {
    display: none;
  }

  .cm-onboarding-panel {
    position: fixed;
    left: 0;
    top: 0;
    width: min(392px, calc(100vw - 28px));
    border: 1px solid var(--color-border);
    border-radius: 12px;
    background: var(--dropdown-bg);
    color: var(--color-text);
    box-shadow: 0 10px 40px rgba(0,0,0,0.35);
    pointer-events: auto;
    overflow: hidden;
    transform-origin: center center;
    will-change: transform, left, top;
  }

  .cm-onboarding-panel-inner {
    position: relative;
    z-index: 1;
    transform-origin: center center;
    will-change: transform;
  }

  .cm-onboarding-panel::before {
    display: none;
  }

  .cm-onboarding-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 14px 0 18px;
  }

  .cm-onboarding-content {
    position: relative;
    z-index: 1;
    padding: 8px 18px 18px;
  }

  .cm-onboarding-kicker {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #D97757;
    font-size: 11px;
    font-weight: 700;
  }

  .cm-onboarding-kicker-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: #D97757;
  }

  .cm-onboarding-title {
    margin: 0;
    color: var(--color-text);
    font-size: 18px;
    line-height: 1.18;
    font-weight: 750;
    letter-spacing: 0;
  }

  .cm-onboarding-body {
    margin: 8px 0 0;
    color: var(--color-text-secondary);
    font-size: 13px;
    line-height: 1.55;
  }

  .cm-onboarding-map {
    margin-top: 13px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 7px;
    max-height: 248px;
    overflow-y: auto;
    padding-right: 2px;
    scrollbar-width: none;
  }

  .cm-onboarding-map::-webkit-scrollbar {
    display: none;
  }

  .cm-onboarding-map-item {
    padding: 10px 11px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--color-surface-hover) 72%, transparent);
    border: 1px solid var(--color-border-light);
  }

  .cm-onboarding-map-title {
    display: block;
    color: var(--color-text);
    font-size: 12px;
    font-weight: 750;
    line-height: 1.2;
  }

  .cm-onboarding-map-body {
    display: block;
    margin-top: 3px;
    color: var(--color-text-secondary);
    font-size: 11px;
    line-height: 1.35;
  }

  .cm-onboarding-footer {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px 14px 18px;
    border-top: 1px solid var(--color-border-light);
    background: transparent;
  }

  .cm-onboarding-dots {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
  }

  .cm-onboarding-dot {
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: var(--color-text-secondary);
    opacity: 0.28;
    transition: width 0.25s ease, opacity 0.25s ease, background 0.25s ease;
  }

  .cm-onboarding-dot.is-active {
    width: 18px;
    opacity: 1;
    background: #D97757;
  }

  .cm-onboarding-actions {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-shrink: 0;
  }

  .cm-onboarding-btn {
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 12px;
    font-weight: 600;
    padding: 0 11px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    transition: background 0.2s ease, border-color 0.2s ease;
  }

  .cm-onboarding-btn:hover {
    background: var(--color-surface-hover);
    border-color: rgba(217,119,87,0.42);
  }

  .cm-onboarding-btn:active {
    transform: scale(0.96);
  }

  .cm-onboarding-btn-primary {
    background: #D97757;
    border-color: #D97757;
    color: white;
  }

  .cm-onboarding-btn-primary:hover {
    background: #E2886A;
    border-color: #E2886A;
  }

  .cm-onboarding-icon-btn {
    width: 34px;
    padding: 0;
  }

  .cm-onboarding-close {
    width: 30px;
    height: 30px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease, color 0.2s ease;
  }

  .cm-onboarding-close:hover {
    background: var(--color-surface-hover);
    color: var(--color-text);
  }

  .cm-onboarding-mini-actions {
    margin-top: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  @keyframes cm-onboarding-pulse {
    0% { opacity: 0.72; transform: scale(0.94); }
    70% { opacity: 0; transform: scale(1.25); }
    100% { opacity: 0; transform: scale(1.25); }
  }

  @keyframes cm-onboarding-shake {
    0%, 85%, 100% { transform: rotate(0deg); }
    88% { transform: rotate(-10deg); }
    91% { transform: rotate(8deg); }
    94% { transform: rotate(-6deg); }
    97% { transform: rotate(4deg); }
  }

  @keyframes cm-onboarding-ring {
    0% { opacity: 0.68; transform: scale(0.98); }
    80% { opacity: 0; transform: scale(1.06); }
    100% { opacity: 0; transform: scale(1.06); }
  }

  @media (max-width: 640px) {
    #${LAUNCHER_ID} {
      right: 18px;
      bottom: 18px;
      width: 52px;
      height: 52px;
    }

    #${LAUNCHER_ID}.is-topbar {
      right: auto;
      bottom: auto;
      width: 38px;
      height: 38px;
      flex-basis: 38px;
      margin-right: 0;
    }

    #${LAUNCHER_ID}.is-topbar .cm-launcher-icon {
      width: 19px;
      height: 19px;
    }

    #${LAUNCHER_ID}.is-offset {
      bottom: 82px;
    }

    #${LAUNCHER_ID} .cm-launcher-tip {
      display: none;
    }

    .cm-onboarding-panel {
      width: calc(100vw - 24px);
      border-radius: 20px;
    }

    .cm-onboarding-content {
      padding: 17px;
    }

    .cm-onboarding-title {
      font-size: 17px;
      padding-right: 26px;
    }

    .cm-onboarding-footer {
      align-items: stretch;
      flex-direction: column;
      padding: 12px 14px 14px;
    }

    .cm-onboarding-actions {
      width: 100%;
      justify-content: flex-end;
    }

    .cm-onboarding-map {
      max-height: 214px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    #${LAUNCHER_ID} .cm-launcher-pulse,
    .cm-onboarding-spotlight::before {
      animation: none;
    }
  }
`;

class ControlarOnboarding {
  private uid = 'anon';
  private isReady = false;
  private active = false;
  private mode: 'overview' | 'page' = 'page';
  private stepIndex = 0;
  private steps: OnboardingStep[] = [];
  private observer: MutationObserver | null = null;
  private raf = 0;
  private autoStartTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTarget: HTMLElement | null = null;
  private hasPositionedPanel = false;
  private hasPositionedSpotlight = false;
  private autoToursEnabled = false;

  init(uid?: string | null): void {
    this.uid = uid || this.uid || 'anon';
    this.ensureStyles();
    this.ensureLauncher();
    this.ensureRoot();
    this.bindGlobalListeners();
    this.observeApp();
    this.refreshSoon();
    this.scheduleAutoStart();
  }

  setUser(uid?: string | null): void {
    this.uid = uid || 'anon';
    this.refreshSoon();
    this.scheduleAutoStart();
  }

  enableAutoTours(uid?: string | null): void {
    if (uid) this.uid = uid;
    this.autoToursEnabled = true;
    this.refreshSoon(180);
    this.scheduleAutoStart();
  }

  disableAutoTours(): void {
    this.autoToursEnabled = false;
    if (this.autoStartTimer) window.clearTimeout(this.autoStartTimer);
  }

  hideForSignedOut(): void {
    this.disableAutoTours();
    this.close(false);
    document.getElementById(LAUNCHER_ID)?.classList.remove('is-visible');
    this.uid = 'anon';
  }

  refreshSoon(delay = 80): void {
    window.clearTimeout(this.retryTimer as any);
    this.retryTimer = window.setTimeout(() => {
      this.updateLauncherVisibility();
      if (this.active) this.renderStep(false);
      else this.scheduleAutoStart();
    }, delay);
  }

  start(mode: 'overview' | 'page' = 'page', source: 'manual' | 'auto' = 'manual'): void {
    const nextSteps = mode === 'overview' ? OVERVIEW_STEPS : this.getCurrentPageSteps();
    this.steps = nextSteps.length ? nextSteps : OVERVIEW_STEPS;
    this.mode = mode;
    this.stepIndex = 0;
    this.active = true;
    this.hasPositionedPanel = false;
    this.hasPositionedSpotlight = false;
    if (mode === 'page' && source === 'auto') {
      this.markPageSeen(this.getCurrentPageKey());
    } else {
      this.markSeen();
    }
    this.ensureRoot();
    document.getElementById(ROOT_ID)?.classList.add('is-active');
    this.renderStep(true);
  }

  startNotification(): void {
    this.steps = [{
      id: 'notify-launcher',
      title: 'Dica: Tutorial rapido',
      body: 'Sempre que tiver duvidas sobre esta tela, clique neste icone para ver um tutorial passo a passo de como usa-la.',
      selector: `#${LAUNCHER_ID}`,
      placement: 'bottom',
    }];
    this.mode = 'overview';
    this.stepIndex = 0;
    this.active = true;
    this.hasPositionedPanel = false;
    this.hasPositionedSpotlight = false;
    this.markSeen();
    this.ensureRoot();
    document.getElementById(ROOT_ID)?.classList.add('is-active');
    this.renderStep(true);
  }

  private getCurrentPageSteps(): OnboardingStep[] {
    const page = sessionStorage.getItem('currentPage') || 'dashboard';
    return PAGE_STEPS[page] || [
      {
        id: `${page}-generic`,
        title: 'Tutorial da tela',
        body: 'Use este tour para identificar a navegacao, acoes principais e areas de conteudo desta tela.',
        selector: ['main', '#app-header'],
        placement: 'center',
      },
    ];
  }

  private ensureStyles(): void {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  private ensureLauncher(): void {
    if (document.getElementById(LAUNCHER_ID)) return;
    const button = document.createElement('button');
    button.id = LAUNCHER_ID;
    button.type = 'button';
    button.setAttribute('aria-label', 'Abrir tutorial');
    button.innerHTML = `
      <span class="cm-launcher-pulse"></span>
      <svg class="cm-launcher-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 3.75c-4.55 0-8.25 3.25-8.25 7.25 0 2.28 1.2 4.31 3.08 5.64-.08.74-.34 1.68-.98 2.61-.18.26.07.6.37.49 1.34-.49 2.55-1.1 3.43-1.75.75.17 1.54.26 2.35.26 4.55 0 8.25-3.25 8.25-7.25S16.55 3.75 12 3.75Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M9.8 9.15A2.2 2.2 0 0 1 12 7.5c1.24 0 2.25.83 2.25 1.98 0 1.36-1.3 1.78-2.02 2.37-.5.41-.62.77-.62 1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        <path d="M12 15.9h.01" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>
      </svg>
      <span class="cm-launcher-tip">Abrir tutorial</span>
    `;
    button.addEventListener('click', () => this.start('page'));
    document.body.appendChild(button);

    gsap.to(button, {
      scale: 1,
      y: 0,
      opacity: 1,
      duration: 0.65,
      ease: 'elastic.out(1.15, 0.5)',
      delay: 0.1,
    });
  }

  private ensureRoot(): void {
    if (document.getElementById(ROOT_ID)) return;
    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.innerHTML = `
      <div class="cm-onboarding-spotlight"></div>
      <div class="cm-onboarding-beacon"></div>
      <section class="cm-onboarding-panel" role="dialog" aria-live="polite" aria-label="Tutorial do sistema">
        <div class="cm-onboarding-panel-inner">
          <div class="cm-onboarding-header">
            <div class="cm-onboarding-kicker"></div>
            <button class="cm-onboarding-close" type="button" aria-label="Fechar tutorial">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="cm-onboarding-content"></div>
          <div class="cm-onboarding-footer">
            <div class="cm-onboarding-dots"></div>
            <div class="cm-onboarding-actions">
              <button class="cm-onboarding-btn cm-onboarding-icon-btn" type="button" data-onboarding-prev aria-label="Voltar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m15 18-6-6 6-6" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <button class="cm-onboarding-btn" type="button" data-onboarding-map>Mapa</button>
              <button class="cm-onboarding-btn cm-onboarding-btn-primary" type="button" data-onboarding-next>Avancar</button>
            </div>
          </div>
        </div>
      </section>
    `;
    document.body.appendChild(root);

    root.querySelector('.cm-onboarding-close')?.addEventListener('click', () => this.close(false));
    root.querySelector('[data-onboarding-prev]')?.addEventListener('click', () => this.prev());
    root.querySelector('[data-onboarding-next]')?.addEventListener('click', () => this.next());
    root.querySelector('[data-onboarding-map]')?.addEventListener('click', () => this.start('overview'));
  }

  private bindGlobalListeners(): void {
    if (this.isReady) return;
    this.isReady = true;

    window.addEventListener('resize', () => this.renderStep(false));
    window.addEventListener('scroll', () => this.renderStep(false), true);
    window.addEventListener('keydown', (event) => {
      if (!this.active) return;
      if (event.key === 'Escape') this.close(false);
      if (event.key === 'ArrowRight') this.next();
      if (event.key === 'ArrowLeft') this.prev();
    });
  }

  private observeApp(): void {
    if (this.observer) return;
    const app = document.getElementById('app');
    if (!app) {
      window.setTimeout(() => this.observeApp(), 200);
      return;
    }
    this.observer = new MutationObserver(() => this.refreshSoon(120));
    this.observer.observe(app, { childList: true, subtree: true });
  }

  private scheduleAutoStart(): void {
    if (this.autoStartTimer) window.clearTimeout(this.autoStartTimer);
    if (!this.autoToursEnabled || this.uid === 'anon' || this.active) return;

    const page = this.getCurrentPageKey();
    if (this.hasPageSeen(page)) return;

    this.autoStartTimer = window.setTimeout(() => {
      const currentPage = this.getCurrentPageKey();
      if (!this.autoToursEnabled || this.active || this.uid === 'anon') return;
      if (this.hasPageSeen(currentPage)) return;
      if (!this.shouldShowOnboarding()) return;
      this.start('page', 'auto');
    }, 900);
  }

  private storageKey(kind: 'seen' | 'completed'): string {
    return `controlar-onboarding-${kind}-${STORAGE_VERSION}-${this.uid}`;
  }

  private pageStorageKey(page: string): string {
    return `controlar-onboarding-page-${STORAGE_VERSION}-${this.uid}-${page}`;
  }

  private getCurrentPageKey(): string {
    return sessionStorage.getItem('currentPage') || 'dashboard';
  }

  private hasPageSeen(page: string): boolean {
    try {
      return localStorage.getItem(this.pageStorageKey(page)) === 'true';
    } catch {
      return true;
    }
  }

  private markPageSeen(page: string): void {
    try {
      localStorage.setItem(this.pageStorageKey(page), 'true');
    } catch {}
  }

  private hasSeen(): boolean {
    try {
      return localStorage.getItem(this.storageKey('seen')) === 'true';
    } catch {
      return true;
    }
  }

  private markSeen(): void {
    try {
      localStorage.setItem(this.storageKey('seen'), 'true');
    } catch {}
  }

  private markCompleted(): void {
    try {
      localStorage.setItem(this.storageKey('completed'), 'true');
      localStorage.setItem(this.storageKey('seen'), 'true');
      if (this.mode === 'page') {
        localStorage.setItem(this.pageStorageKey(this.getCurrentPageKey()), 'true');
      }
    } catch {}
  }

  private shouldShowOnboarding(): boolean {
    const header = document.getElementById('app-header');
    const page = sessionStorage.getItem('currentPage');
    const app = document.getElementById('app');
    return Boolean(header && app && page && page !== 'checkout');
  }

  private updateLauncherVisibility(): void {
    this.ensureLauncher();
    const launcher = document.getElementById(LAUNCHER_ID);
    if (!launcher) return;

    const avatar = document.getElementById('topbar-avatar-container');
    const topbarActions = avatar?.parentElement || null;
    const isTopbarReady = Boolean(topbarActions && avatar);

    if (topbarActions && avatar && launcher.parentElement !== topbarActions) {
      topbarActions.insertBefore(launcher, avatar);
      gsap.fromTo(
        launcher,
        { opacity: 0, scaleX: 0.82, scaleY: 1.14, y: -6 },
        { opacity: 1, scaleX: 1, scaleY: 1, y: 0, duration: 0.52, ease: 'elastic.out(1.1, 0.55)', clearProps: 'transform' }
      );
    }

    launcher.classList.toggle('is-topbar', isTopbarReady);
    launcher.classList.toggle('is-visible', this.shouldShowOnboarding() && isTopbarReady);
    launcher.classList.toggle('is-offset', Boolean(document.getElementById('coin-fab-btn')));
  }

  private next(): void {
    if (!this.active) return;
    if (this.stepIndex >= this.steps.length - 1) {
      this.close(true);
      return;
    }
    this.stepIndex += 1;
    this.renderStep(true);
  }

  private prev(): void {
    if (!this.active || this.stepIndex <= 0) return;
    this.stepIndex -= 1;
    this.renderStep(true);
  }

  private close(completed: boolean): void {
    if (completed) this.markCompleted();
    this.active = false;
    this.lastTarget = null;
    this.hasPositionedPanel = false;
    this.hasPositionedSpotlight = false;

    const root = document.getElementById(ROOT_ID);
    const panel = root?.querySelector<HTMLElement>('.cm-onboarding-panel');
    const spotlight = root?.querySelector<HTMLElement>('.cm-onboarding-spotlight');
    const beacon = root?.querySelector<HTMLElement>('.cm-onboarding-beacon');

    if (panel && root?.classList.contains('is-active')) {
      gsap.to(panel, {
        opacity: 0,
        scaleX: 0.92,
        scaleY: 1.06,
        y: '+=8',
        duration: 0.18,
        ease: 'power2.in',
        onComplete: () => {
          root?.classList.remove('is-active');
          gsap.set([panel, spotlight, beacon].filter(Boolean), { clearProps: 'all' });
        },
      });
      gsap.to([spotlight, beacon].filter(Boolean), { opacity: 0, duration: 0.16, ease: 'power1.in' });
    } else {
      root?.classList.remove('is-active');
    }
  }

  private renderStep(animate: boolean): void {
    if (!this.active) return;

    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(() => {
      const root = document.getElementById(ROOT_ID);
      const panel = root?.querySelector<HTMLElement>('.cm-onboarding-panel');
      const panelInner = root?.querySelector<HTMLElement>('.cm-onboarding-panel-inner');
      const content = root?.querySelector<HTMLElement>('.cm-onboarding-content');
      const dots = root?.querySelector<HTMLElement>('.cm-onboarding-dots');
      const nextButton = root?.querySelector<HTMLButtonElement>('[data-onboarding-next]');
      const prevButton = root?.querySelector<HTMLButtonElement>('[data-onboarding-prev]');
      const mapButton = root?.querySelector<HTMLButtonElement>('[data-onboarding-map]');
      const kicker = root?.querySelector<HTMLElement>('.cm-onboarding-kicker');

      if (!root || !panel || !panelInner || !content || !dots || !nextButton || !prevButton || !mapButton) return;

      const step = this.steps[this.stepIndex];
      if (!step) return;

      root.classList.add('is-active');
      if (kicker) {
        kicker.innerHTML = `
          <span class="cm-onboarding-kicker-dot"></span>
          <span>Passo ${this.stepIndex + 1} de ${this.steps.length}</span>
        `;
      }
      this.renderContent(panel, panelInner, content, step, animate);
      dots.innerHTML = this.steps.map((_, index) => `<span class="cm-onboarding-dot ${index === this.stepIndex ? 'is-active' : ''}"></span>`).join('');
      nextButton.textContent = this.stepIndex === this.steps.length - 1 ? 'Concluir' : 'Avancar';
      prevButton.disabled = this.stepIndex === 0;
      prevButton.style.opacity = this.stepIndex === 0 ? '0.45' : '1';
      mapButton.style.display = this.mode === 'overview' ? 'none' : 'inline-flex';

      const target = this.findTarget(step.selector);
      if (target && target !== this.lastTarget && !this.isElementInViewport(target)) {
        target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        window.setTimeout(() => this.positionElements(step, target, animate), 360);
      }

      this.positionElements(step, target, animate);
      this.lastTarget = target;

      if (animate) {
        window.setTimeout(() => this.renderStep(false), 220);
      }
    });
  }

  private renderContent(panel: HTMLElement, panelInner: HTMLElement, content: HTMLElement, step: OnboardingStep, animate: boolean): void {
    const html = `
      <h3 class="cm-onboarding-title">${this.escapeHtml(step.title)}</h3>
      <p class="cm-onboarding-body">${this.escapeHtml(step.body)}</p>
      ${step.mapItems?.length ? `
        <div class="cm-onboarding-map">
          ${step.mapItems.map(item => `
            <div class="cm-onboarding-map-item">
              <span class="cm-onboarding-map-title">${this.escapeHtml(item.title)}</span>
              <span class="cm-onboarding-map-body">${this.escapeHtml(item.body)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;

    const signature = `${this.mode}-${this.stepIndex}-${step.id}`;
    const isSameStep = content.dataset.onboardingStep === signature && content.innerHTML.trim() !== '';

    if (isSameStep) return;

    if (animate) {
      const oldHeight = panel.offsetHeight || panel.scrollHeight;
      const finalShadow = '0 30px 90px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)';
      const activeShadow = '0 34px 105px rgba(0,0,0,0.62), 0 0 0 1px rgba(217,119,87,0.2), inset 0 1px 0 rgba(255,255,255,0.12)';

      gsap.killTweensOf([panel, panelInner, content]);
      panel.style.height = `${oldHeight}px`;

      const exitTl = gsap.timeline();

      exitTl.to(panelInner, {
        scaleX: 1.025,
        scaleY: 0.965,
        y: -1,
        duration: 0.24,
        ease: 'power2.out',
      }, 0);

      exitTl.to(panel, {
        borderRadius: '25px',
        boxShadow: activeShadow,
        duration: 0.24,
        ease: 'power2.out',
      }, 0);

      exitTl.to(content, {
        opacity: 0,
        y: -6,
        scale: 0.992,
        filter: 'blur(6px)',
        duration: 0.22,
        ease: 'power2.inOut',
        onComplete: () => {
          content.innerHTML = html;
          content.dataset.onboardingStep = signature;

          const newHeight = panel.scrollHeight;
          gsap.set(content, { opacity: 0, y: 13, scale: 0.98, filter: 'blur(8px)' });

          const enterTl = gsap.timeline({
            onComplete: () => {
              panel.style.height = '';
              gsap.set(panelInner, { scaleX: 1, scaleY: 1, y: 0 });
            },
          });

          enterTl.to(panel, {
            height: newHeight,
            borderRadius: '20px',
            duration: 0.46,
            ease: 'power3.out',
          }, 0);

          enterTl.to(panelInner, {
            scaleX: 0.994,
            scaleY: 1.018,
            y: 1,
            duration: 0.46,
            ease: 'power3.out',
          }, 0);

          enterTl.to(content, {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.42,
            ease: 'power2.out',
          }, 0.1);

          enterTl.to(panel, {
            borderRadius: '22px',
            boxShadow: finalShadow,
            duration: 0.78,
            ease: 'elastic.out(0.92, 0.62)',
          }, 0.28);

          enterTl.to(panelInner, {
            scaleX: 1,
            scaleY: 1,
            y: 0,
            duration: 0.78,
            ease: 'elastic.out(0.92, 0.62)',
          }, 0.28);
        },
      }, 0);
    } else if (content.innerHTML.trim() === '') {
      content.innerHTML = html;
      content.dataset.onboardingStep = signature;
    }
  }

  private positionElements(step: OnboardingStep, target: HTMLElement | null, animate: boolean): void {
    const root = document.getElementById(ROOT_ID);
    const panel = root?.querySelector<HTMLElement>('.cm-onboarding-panel');
    const spotlight = root?.querySelector<HTMLElement>('.cm-onboarding-spotlight');
    const beacon = root?.querySelector<HTMLElement>('.cm-onboarding-beacon');
    if (!root || !panel || !spotlight || !beacon) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 16;
    const margin = 14;
    const panelRect = panel.getBoundingClientRect();
    const panelWidth = Math.min(392, viewportWidth - margin * 2);
    const panelHeight = Math.min(panelRect.height || 260, viewportHeight - margin * 2);

    let targetRect: DOMRect | null = target?.getBoundingClientRect() || null;
    if (targetRect && (targetRect.width < 4 || targetRect.height < 4)) {
      targetRect = null;
    }

    if (!targetRect) {
      const x = Math.max(margin, (viewportWidth - panelWidth) / 2);
      const y = Math.max(margin, (viewportHeight - panelHeight) / 2);
      this.animatePanel(panel, x, y, animate);
      gsap.to([spotlight, beacon], { opacity: 0, duration: animate ? 0.18 : 0, ease: 'power1.out' });
      return;
    }

    const pad = viewportWidth < 640 ? 8 : 10;
    let spotX = targetRect.left - pad;
    let spotY = targetRect.top - pad;
    let spotW = targetRect.width + pad * 2;
    let spotH = targetRect.height + pad * 2;
    let radius = Math.min(24, Math.max(14, spotH / 5));

    // Snap to edges for full-width or header/main elements to prevent bleeding
    if (targetRect.width > viewportWidth * 0.9 || target.tagName.toLowerCase() === 'main' || target.tagName.toLowerCase() === 'header') {
      spotX = 0;
      spotW = viewportWidth;
      radius = 0; // Square edges for layout blocks
    }
    
    // Snap to top if it's a header or touches the top
    if (targetRect.top <= 10 || target.tagName.toLowerCase() === 'header') {
      spotY = 0;
      spotH = targetRect.bottom;
      radius = 0;
    }

    // Snap to bottom if it touches the bottom
    if (targetRect.bottom >= viewportHeight - 10) {
      spotH = viewportHeight - spotY;
      radius = 0;
    }

    const placement = this.resolvePlacement(step.placement || 'auto', targetRect, panelWidth, panelHeight, gap, margin);
    const coords = this.getPanelCoords(placement, targetRect, panelWidth, panelHeight, gap, margin);

    this.animateSpotlight(spotlight, spotX, spotY, spotW, spotH, radius, animate);
    this.animateBeacon(beacon, targetRect, animate);
    this.animatePanel(panel, coords.x, coords.y, animate);
  }

  private resolvePlacement(
    preferred: OnboardingPlacement,
    rect: DOMRect,
    panelWidth: number,
    panelHeight: number,
    gap: number,
    margin: number
  ): OnboardingPlacement {
    if (window.innerWidth < 640) return 'bottom';
    if (preferred !== 'auto' && preferred !== 'center') return preferred;
    if (preferred === 'center') return 'center';

    const spaceRight = window.innerWidth - rect.right - margin;
    const spaceLeft = rect.left - margin;
    const spaceBottom = window.innerHeight - rect.bottom - margin;
    const spaceTop = rect.top - margin;

    if (spaceRight >= panelWidth + gap) return 'right';
    if (spaceLeft >= panelWidth + gap) return 'left';
    if (spaceBottom >= panelHeight + gap) return 'bottom';
    if (spaceTop >= panelHeight + gap) return 'top';
    return 'bottom';
  }

  private getPanelCoords(
    placement: OnboardingPlacement,
    rect: DOMRect,
    panelWidth: number,
    panelHeight: number,
    gap: number,
    margin: number
  ): { x: number; y: number } {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const clampX = (x: number) => Math.min(Math.max(margin, x), viewportWidth - panelWidth - margin);
    const clampY = (y: number) => Math.min(Math.max(margin, y), viewportHeight - panelHeight - margin);

    if (placement === 'center') {
      return {
        x: clampX((viewportWidth - panelWidth) / 2),
        y: clampY((viewportHeight - panelHeight) / 2),
      };
    }

    if (window.innerWidth < 640) {
      return {
        x: clampX((viewportWidth - panelWidth) / 2),
        y: clampY(viewportHeight - panelHeight - 14),
      };
    }

    if (placement === 'right') {
      return { x: clampX(rect.right + gap), y: clampY(rect.top + rect.height / 2 - panelHeight / 2) };
    }
    if (placement === 'left') {
      return { x: clampX(rect.left - panelWidth - gap), y: clampY(rect.top + rect.height / 2 - panelHeight / 2) };
    }
    if (placement === 'top') {
      return { x: clampX(rect.left + rect.width / 2 - panelWidth / 2), y: clampY(rect.top - panelHeight - gap) };
    }
    return { x: clampX(rect.left + rect.width / 2 - panelWidth / 2), y: clampY(rect.bottom + gap) };
  }

  private animateSpotlight(
    spotlight: HTMLElement,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    animate: boolean
  ): void {
    const rawX = Number(gsap.getProperty(spotlight, 'x'));
    const rawY = Number(gsap.getProperty(spotlight, 'y'));
    const currentX = Number.isFinite(rawX) ? rawX : x;
    const currentY = Number.isFinite(rawY) ? rawY : y;
    const deltaX = x - currentX;
    const deltaY = y - currentY;
    const isHorizontal = Math.abs(deltaX) >= Math.abs(deltaY);
    const pullX = isHorizontal ? (deltaX > 0 ? 6 : -6) : 0;
    const pullY = !isHorizontal ? (deltaY > 0 ? 5 : -5) : 0;

    gsap.killTweensOf(spotlight);

    if (!animate || !this.hasPositionedSpotlight) {
      this.hasPositionedSpotlight = true;
      gsap.set(spotlight, {
        x,
        y,
        width,
        height,
        borderRadius: radius,
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
      });
      return;
    }

    const tl = gsap.timeline({ defaults: { overwrite: 'auto' } });

    tl.to(spotlight, {
      x: currentX + pullX,
      y: currentY + pullY,
      scaleX: 1.025,
      scaleY: 0.965,
      borderRadius: Math.max(22, radius + 5),
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.68)',
      duration: 0.24,
      ease: 'power2.out',
    }, 0);

    tl.to(spotlight, {
      x,
      y,
      width,
      height,
      scaleX: 0.994,
      scaleY: 1.018,
      borderRadius: Math.max(12, radius - 1),
      opacity: 1,
      duration: 0.46,
      ease: 'power3.out',
    }, 0.16);

    tl.to(spotlight, {
      scaleX: 1,
      scaleY: 1,
      borderRadius: radius,
      boxShadow: '0 0 0 9999px rgba(0,0,0,0.65)',
      duration: 0.78,
      ease: 'elastic.out(0.92, 0.62)',
    }, 0.42);
  }

  private animateBeacon(beacon: HTMLElement, rect: DOMRect, animate: boolean): void {
    const x = Math.min(window.innerWidth - 22, Math.max(22, rect.right));
    const y = Math.min(window.innerHeight - 22, Math.max(22, rect.top));
    gsap.to(beacon, {
      x,
      y,
      opacity: 1,
      duration: animate ? 0.38 : 0,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  }

  private animatePanel(panel: HTMLElement, x: number, y: number, animate: boolean): void {
    if (!this.hasPositionedPanel) {
      gsap.set(panel, {
        x,
        y,
        opacity: 0,
        scaleX: 0.86,
        scaleY: 1.12,
        borderRadius: '28px',
      });
      this.hasPositionedPanel = true;
      gsap.to(panel, {
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        borderRadius: '22px',
        duration: 0.72,
        ease: 'elastic.out(1.08, 0.62)',
        overwrite: 'auto',
      });
      return;
    }

    gsap.to(panel, {
      x,
      y,
      opacity: 1,
      scaleX: animate ? 1.01 : 1,
      scaleY: animate ? 0.99 : 1,
      duration: animate ? 0.68 : 0,
      ease: 'elastic.out(0.9, 0.72)',
      overwrite: 'auto',
      onComplete: () => {
        if (animate) {
          gsap.to(panel, { scaleX: 1, scaleY: 1, duration: 0.28, ease: 'power2.out' });
        }
      },
    });
  }

  private findTarget(selector?: string | string[]): HTMLElement | null {
    if (!selector) return null;
    const selectors = Array.isArray(selector) ? selector : [selector];

    for (const item of selectors) {
      const elements = Array.from(document.querySelectorAll<HTMLElement>(item));
      const visible = elements.find((element) => this.isVisible(element));
      if (visible) return visible;
    }

    return null;
  }

  private isVisible(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return (
      rect.width > 4 &&
      rect.height > 4 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      Number(style.opacity || '1') > 0.05
    );
  }

  private isElementInViewport(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    return rect.top >= 72 && rect.left >= 0 && rect.bottom <= window.innerHeight - 72 && rect.right <= window.innerWidth;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

export const onboarding = new ControlarOnboarding();
