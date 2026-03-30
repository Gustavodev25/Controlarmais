import { BrilhoHeader } from '../components/BrilhoHeader';
import { Header, attachHeaderListeners } from '../components/Header';
import coinImg from '../assets/logo/coin.png';
import coinsImg from '../assets/coins.png';
import { db } from '../lib/firebase';
import { collection, query, orderBy, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Modal } from '../components/Modal';

// Ações que aparecem como botões após a resposta da IA para cada card
const CARD_ACTIONS: Record<string, { label: string; page: string; icon: string }[]> = {
  'Melhor momento para compras grandes': [
    { label: 'Ver Cartões', page: 'credit-cards', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>' },
    { label: 'Criar Lembrete', page: 'reminders', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' },
  ],
  'Fatura próxima do limite': [
    { label: 'Ver Cartões', page: 'credit-cards', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>' },
    { label: 'Criar Lembrete', page: 'reminders', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' },
  ],
  'Custo real das assinaturas': [
    { label: 'Ver Assinaturas', page: 'subscriptions', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>' },
  ],
  'Assinaturas que você não usa': [
    { label: 'Gerenciar Assinaturas', page: 'subscriptions', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>' },
  ],
  'Reajuste em assinaturas': [
    { label: 'Ver Assinaturas', page: 'subscriptions', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>' },
  ],
  'Distribua o que sobrou do mês': [
    { label: 'Ver Caixinhas', page: 'patrimony', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
  ],
  'Ajuste sua meta de economia': [
    { label: 'Ver Caixinhas', page: 'patrimony', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
  ],
  'Progresso das suas metas': [
    { label: 'Ver Caixinhas', page: 'patrimony', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>' },
    { label: 'Criar Lembrete', page: 'reminders', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' },
  ],
};

const SUGGESTIONS = [
  { title: 'Descubra suas despesas invisíveis', desc: 'Saiba quais gastos estão te custando muito ao longo do tempo', prompt: 'Analise minhas transações e descubra despesas invisíveis ou recorrentes que estão me custando muito sem eu perceber. Liste as principais com valores e dicas de como reduzir.' },
  { title: 'Organize seu salário sem esforço', desc: 'Automatize transferências para atingir seus objetivos mais rápido', prompt: 'Com base nos meus gastos, crie um plano de organização do salário com divisão por categorias (necessidades, lazer, investimento, reserva) usando a regra 50-30-20 adaptada à minha realidade.' },
  { title: 'Consulte seus gastos por categoria', desc: 'E saiba o quanto você está estourando o orçamento', prompt: 'Faça um relatório detalhado dos meus gastos por categoria nos últimos meses. Mostre os totais, percentuais e quais categorias estão acima do recomendável.' },
  { title: 'Faça seu dinheiro parado render', desc: 'Transforme seu dinheiro parado em rendimento', prompt: 'Analise meu histórico financeiro e sugira quanto posso separar mensalmente para investimentos. Apresente opções adequadas ao meu perfil de gastos.' },
  { title: 'Nunca mais esqueça um pagamento', desc: 'Automatize seus pagamentos recorrentes e resolva com um clique', prompt: 'Liste todos os meus compromissos financeiros recorrentes (assinaturas, contas, lembretes) e crie um calendário de pagamentos organizado por data de vencimento.' },
  { title: 'Controle suas assinaturas', desc: 'Não perca visibilidade do quanto você está gastando', prompt: 'Faça um levantamento completo de todas as minhas assinaturas ativas. Mostre o custo mensal, anual e quais posso cancelar ou substituir por alternativas mais baratas.' },
  { title: 'Separe dinheiro para comprar algo', desc: 'E alcance seus objetivos com mais facilidade', prompt: 'Quero guardar dinheiro para uma compra específica. Com base nos meus gastos atuais, quanto consigo economizar por mês? Crie um plano de metas de economia.' },
  { title: 'Equilibre o saldo das suas contas', desc: 'Garanta que não vai faltar dinheiro e fuja do especial', prompt: 'Analise meu fluxo de caixa e identifique períodos em que meu saldo fica no limite. Sugira como redistribuir os gastos para manter um saldo seguro ao longo do mês.' },
  { title: 'Controle gastos com delivery de comida', desc: 'Garanta não estourar sua meta do mês', prompt: 'Quanto estou gastando com delivery e alimentação fora de casa? Compare com o recomendado e sugira estratégias para reduzir sem abrir mão do prazer.' },
  { title: 'Distribua o que sobrou do mês', desc: 'Sugira como dividir o saldo restante entre suas caixinhas', prompt: 'Calcule exatamente quanto sobrou neste mês após todas as despesas e receitas. Liste cada caixinha ativa com seu progresso atual (valor acumulado, meta, % concluído). Em seguida, mostre uma tabela de distribuição sugerida do saldo restante, com valor a aportar em cada caixinha e justificativa. Finalize com o impacto: quanto cada meta avança com essa distribuição e a nova data estimada de conclusão.' },
  { title: 'Ajuste sua meta de economia', desc: 'Adapte seus objetivos à variação da sua renda', prompt: 'Compare minha renda dos últimos 3 meses e calcule a variação percentual. Mostre uma tabela com cada caixinha: meta original, prazo original e os dois cenários ajustados (renda aumentou / renda diminuiu). Para cada cenário, apresente o novo valor de aporte mensal sugerido e o novo prazo estimado. Destaque em negrito qual cenário se aplica à minha situação atual.' },
  { title: 'Progresso das suas metas', desc: 'Veja um resumo semanal e quando você vai atingir cada objetivo', prompt: 'Gere um relatório de progresso das minhas caixinhas com: (1) tabela com nome, valor atual, meta, % concluído e data estimada de conclusão no ritmo atual; (2) destaque para a caixinha com melhor ritmo e a com maior risco de atraso; (3) recomendação de qual ajuste fazer esta semana para manter todas as metas no prazo. Seja direto e use números reais.' },
  { title: 'Assinaturas que você não usa', desc: 'Detecte serviços parados e economize todo mês', prompt: 'Liste todas as minhas assinaturas ativas. Para cada uma, mostre: nome, valor mensal, última vez que apareceu como uso nos dados, e status (ATIVA / SUSPEITA / INATIVA). Destaque em uma tabela separada as que recomendo cancelar ou pausar, com o total que economizarei por mês e por ano se cancelar todas as indicadas. Seja objetivo.' },
  { title: 'Reajuste em assinaturas', desc: 'Identifique cobranças que aumentaram de preço', prompt: 'Compare os valores cobrados de cada assinatura nos últimos meses. Mostre uma tabela com: nome do serviço, valor anterior, valor atual, variação em R$ e em %. Destaque as que tiveram aumento acima de 10%. Para cada uma com reajuste, sugira se vale manter ou se existe alternativa mais barata. Finalize com o impacto total do reajuste no meu orçamento anual.' },
  { title: 'Custo real das assinaturas', desc: 'Some tudo que você paga em serviços recorrentes', prompt: 'Faça um inventário completo de todas as assinaturas e cobranças recorrentes. Organize numa tabela por categoria (Streaming, Saúde, Software, Educação, Outros) com: nome, valor mensal e valor anual. Mostre o subtotal por categoria e o TOTAL GERAL mensal e anual. Destaque a categoria mais cara e as 3 assinaturas de maior custo. Finalize com a porcentagem que as assinaturas representam na minha renda mensal.' },
  { title: 'Fatura próxima do limite', desc: 'Alerte quando o cartão estiver quase estourado', prompt: 'Para cada cartão de crédito, mostre: nome do cartão, limite total, valor já utilizado, limite disponível e % de uso — organizado numa tabela. Use indicadores claros: SEGURO (até 50%), ATENÇÃO (51-80%), CRÍTICO (acima de 80%). Liste os 3 maiores lançamentos de cada cartão em alerta. Finalize com recomendação de qual cartão usar para os próximos gastos e o que evitar.' },
  { title: 'Melhor momento para compras grandes', desc: 'Compre no timing certo e parcele sem sufoco', prompt: 'Com base nos ciclos de fechamento e vencimento dos meus cartões, mostre uma tabela clara com: cartão, data de fechamento, data de vencimento e janela ideal para compras (dias do mês). Depois, analise meu fluxo de caixa e diga: QUAL cartão usar, em QUAL período do mês e o motivo. Mostre também quais períodos evitar e por quê. Responda de forma direta com uma recomendação final em destaque.' },
];

export function renderAdminAutomation(user: any) {
  if (user?.isAdmin !== true) {
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'dashboard' } }));
    return;
  }
  const IS_DEV_MODE = localStorage.getItem('ai-chat-dev-mode') === 'true';

  const app = document.querySelector<HTMLDivElement>('#app')!;

  app.innerHTML = `
    <div id="admin-automation-shell" class="min-h-screen text-[var(--color-text)] flex flex-col relative overflow-hidden bg-[var(--color-background)]">
      ${BrilhoHeader()}
      ${Header({ user })}

      <style>
        @keyframes fadein {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadein { animation: fadein 0.3s ease forwards; }

        #ai-input-wrapper {
          position: relative;
          width: 100%;
          max-width: 720px;
          z-index: 1;
        }
        
        /* -- Dev Banner Glued to Input ────────────────────────── */
        #dev-mode-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin: 0 auto -1px auto; /* Overlaps exactly 1px to hide textarea top border under it */
          position: relative;
          padding: 6px 16px 8px 16px;
          border-radius: 12px 12px 0 0;
          background: var(--color-surface, #141414);
          border: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-surface, #141414);
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          z-index: 2;
          width: max-content;
        }

        #dev-mode-banner.inactive {
          display: none;
        }
        
        #dev-mode-banner .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #D97757;
          animation: pulse-dot 1.5s infinite;
        }

        @keyframes pulse-dot {
          0% { box-shadow: 0 0 0 0 rgba(217, 119, 87, 0.4); transform: scale(0.95); }
          50% { box-shadow: 0 0 0 6px rgba(217, 119, 87, 0); transform: scale(1); }
          100% { box-shadow: 0 0 0 0 rgba(217, 119, 87, 0); transform: scale(0.95); }
        }

        #ai-textarea {
          width: 100%;
          min-height: 54px;
          resize: none;
          background: var(--color-surface, #141414);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 15px 120px 15px 20px;
        }
        #ai-textarea.multiline {
          padding: 15px 20px 52px 20px;
          font-size: 15px;
          line-height: 1.6;
          color: var(--color-text);
          outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          font-family: inherit;
          position: relative;
          z-index: 1;
        }
        #ai-textarea::placeholder {
          color: var(--color-text-secondary);
          opacity: 0.6;
        }
        #ai-textarea:focus {
          border-color: rgba(255,255,255,0.18);
          box-shadow: none;
        }
        #ai-send-btn {
          position: absolute;
          bottom: 9px;
          right: 12px;
          transform: none;
          width: 38px;
          height: 38px;
          border-radius: 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          opacity: 0.3;
          z-index: 2;
          color: var(--color-text-secondary);
        }
        #ai-send-btn svg { stroke: currentColor; }
        #ai-send-btn:not(:disabled) { opacity: 1; color: var(--color-text); }
        #ai-send-btn:not(:disabled):hover { background: rgba(255,255,255,0.05); transform: scale(1.05); }
        #ai-send-btn:not(:disabled):active { transform: scale(0.96); }

        /* Multiline logic simplified - keeping bottom alignment */
        #ai-textarea.multiline ~ #ai-send-btn:not(:disabled):hover { transform: scale(1.05); }
        #ai-textarea.multiline ~ #ai-send-btn:not(:disabled):active { transform: scale(0.96); }

        #ai-credits-pill {
          position: absolute;
          right: 60px;
          bottom: 16px;
          transform: none;
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--color-surface-hover, rgba(255,255,255,0.03));
          border: 1px solid var(--color-border);
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 11px;
          line-height: 1;
          font-weight: 600;
          color: var(--color-text-secondary);
          pointer-events: none;
          z-index: 2;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          opacity: 0.85;
          transition: transform 0.2s;
        }
        #ai-textarea.multiline ~ #ai-credits-pill {
          /* Already at bottom */
          transform: none;
        }
        #ai-credits-pill img {
          width: 14px;
          height: 14px;
        }

        /* Cards carrossel */
        .suggestions-track {
          display: flex;
          gap: 12px;
          animation: scroll-left 40s linear infinite;
          width: max-content;
        }
        .suggestions-wrapper:hover .suggestions-track { animation-play-state: paused; }
        @keyframes scroll-left {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .suggestion-card {
          flex-shrink: 0;
          width: 190px;
          background: var(--color-surface, #141414);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 14px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .suggestion-card:hover {
          border-color: var(--color-text-secondary);
          background: var(--color-surface-hover, rgba(0,0,0,0.04));
          box-shadow: 0 0 10px rgba(0,0,0,0.06);
        }
        .suggestion-card .s-title { font-size: 12px; font-weight: 600; color: var(--color-text); line-height: 1.3; }

        /* Markdown básico na resposta */
        #ai-response strong { font-weight: 600; }
        #ai-response em { font-style: italic; }

        /* Histórico de chats — Versão Minimalista */
        .recent-chat-card {
          width: 100%;
          background: transparent;
          border-radius: 10px;
          padding: 11px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .recent-chat-card:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .recent-chat-card .chat-icon {
          width: 18px; height: 18px;
          color: var(--color-text-secondary);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          opacity: 0.4;
        }
        .recent-chat-card:hover .chat-icon {
          opacity: 0.8;
          color: var(--color-text);
        }
        .recent-chat-card .chat-title {
          font-size: 13px;
          color: var(--color-text-secondary);
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: left;
        }
        .recent-chat-card:hover .chat-title {
          color: var(--color-text);
        }
        .recent-chat-card .chat-date {
          font-size: 11px;
          color: var(--color-text-secondary);
          opacity: 0.3;
        }
        .recent-chat-card .chat-actions {
          display: flex;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.15s;
          flex-shrink: 0;
          margin-left: auto;
        }
        .recent-chat-card:hover .chat-actions { opacity: 1; }
        .chat-action-btn {
          width: 26px; height: 26px;
          border-radius: 6px;
          background: transparent;
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: var(--color-text-secondary);
          transition: background 0.15s, color 0.15s;
        }
        .chat-action-btn:hover { background: rgba(255,255,255,0.06); color: var(--color-text); }
        .chat-action-btn.delete:hover { background: rgba(248,113,113,0.1); color: #f87171; }
        .chat-title-input {
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.15);
          color: var(--color-text);
          font-size: 13px;
          outline: none;
          flex: 1;
          padding: 0 2px;
          font-family: inherit;
          caret-color: rgba(255,255,255,0.7);
        }
        .chat-title-input::selection {
          background: rgba(255,255,255,0.12);
          color: var(--color-text);
        }

        /* Sophisticated Brand Gloss Effect */
        .brand-shine {
          background: linear-gradient(
            110deg, 
            var(--color-text) 35%, 
            rgba(217, 119, 87, 0.4) 45%, 
            rgba(217, 119, 87, 1) 50%, 
            rgba(217, 119, 87, 0.4) 55%, 
            var(--color-text) 65%
          );
          background-size: 300% auto;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shine-sweep 10s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite;
          display: inline-block;
          font-weight: 700;
          letter-spacing: -0.01em;
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.12));
        }

        @keyframes shine-sweep {
          0% { background-position: 150% 0; }
          30%, 100% { background-position: -150% 0; }
        }
      </style>

      <main class="flex-1 w-full flex flex-col items-center justify-center px-4 pb-8 pt-24 md:pt-28" style="gap: 0;">
        <div class="w-full flex flex-col items-center animate-fadein" style="gap: 24px; max-width: 720px;">

          <!-- Título -->
          <div class="text-center w-full flex flex-col items-center">
            <img src="${coinImg}" alt="Coin" class="w-10 h-10 mb-2" />
            <h1 class="text-[22px] font-semibold tracking-tight text-[var(--color-text)]">Automação com <span class="brand-shine" style="font-family: 'Dancing Script', cursive; font-size: 28px; vertical-align: middle; transform: translateY(-4px); margin-left: 4px;">Coinzinha</span></h1>
            <p class="text-[13px] text-[var(--color-text-secondary)] mt-1">Descreva o que deseja automatizar e a Coinzinha irá executar para você.</p>
          </div>

          <!-- Input principal -->
          <div id="ai-input-wrapper">
            <div id="dev-mode-banner" class="${IS_DEV_MODE ? 'active' : 'inactive'}">
              <span class="status-dot"></span>
              <span>MODO DEV (MOCK ATIVO)</span>
            </div>
            <textarea
              id="ai-textarea"
              placeholder=""
              rows="3"
            ></textarea>
            <div id="ai-credits-pill">
              <img src="${coinsImg}" alt="Coins">
              <span>${(parseInt(localStorage.getItem('coin-ai-credits') || '1000', 10)).toLocaleString('pt-BR')}</span>
            </div>
            <button id="ai-send-btn" disabled title="Enviar">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          <!-- Histórico rápido -->
          <div id="quick-history" class="w-full flex-col items-center gap-1 mt-3" style="display: none; max-width: 720px;">
            <div id="recent-chats-list" class="w-full flex flex-col gap-0.5"></div>
            <button id="show-all-chats" class="text-[11px] text-[var(--color-text-secondary)] opacity-40 hover:opacity-100 hover:text-[var(--color-text)] transition-all py-1.5 mt-0.5">
              +0 chats
            </button>
          </div>

        </div>

        <!-- Sugestões — carrossel infinito -->
        <div class="w-full mt-10">
          <p class="text-center text-[13px] text-[var(--color-text-secondary)] mb-4">Está sem ideias? Comece por aqui!</p>
          <div class="suggestions-wrapper overflow-hidden w-full" style="mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);">
            <div class="suggestions-track">
              ${[...SUGGESTIONS, ...SUGGESTIONS].map(s => `
                <div class="suggestion-card" data-prompt="${s.prompt.replace(/"/g, '&quot;')}" data-title="${s.title.replace(/"/g, '&quot;')}" data-desc="${s.desc.replace(/"/g, '&quot;')}">
                  <span class="s-title">${s.title}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </main>
    </div>
  `;

  attachHeaderListeners();

  const textarea = document.getElementById('ai-textarea') as HTMLTextAreaElement;
  const sendBtn = document.getElementById('ai-send-btn') as HTMLButtonElement;
  // Efeito de digitação no placeholder
  const hints = [
    'Alertar quando os gastos mensais ultrapassarem R$ 10.000...',
    'Gerar relatório semanal de despesas por categoria...',
    'Identificar gastos recorrentes acima da média histórica...',
    'Notificar quando uma categoria gastar mais que o orçamento...',
    'Resumir os maiores gastos do mês automaticamente...',
    'Detectar despesas duplicadas ou suspeitas no período...',
    'Distribuir o saldo restante entre as caixinhas do mês...',
    'Calcular o progresso das minhas metas de economia...',
    'Detectar assinaturas inativas que posso cancelar...',
    'Alertar quando a fatura do cartão estiver perto do limite...',
    'Sugerir o melhor momento para fazer uma compra grande...',
  ];
  let hintIndex = 0, charIndex = 0, isDeleting = false;
  let typingTimer: ReturnType<typeof setTimeout>;

  function typeHint() {
    if (document.activeElement === textarea) { typingTimer = setTimeout(typeHint, 400); return; }
    const current = hints[hintIndex];
    if (!isDeleting) {
      charIndex++;
      textarea.placeholder = current.slice(0, charIndex);
      if (charIndex === current.length) { isDeleting = true; typingTimer = setTimeout(typeHint, 2200); return; }
      typingTimer = setTimeout(typeHint, 38);
    } else {
      charIndex--;
      textarea.placeholder = current.slice(0, charIndex);
      if (charIndex === 0) { isDeleting = false; hintIndex = (hintIndex + 1) % hints.length; typingTimer = setTimeout(typeHint, 400); return; }
      typingTimer = setTimeout(typeHint, 18);
    }
  }
  typingTimer = setTimeout(typeHint, 800);

  // Habilitar botão ao digitar e auto-resize
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.classList.remove('multiline');
    const naturalHeight = textarea.scrollHeight;

    if (naturalHeight > 56) {
      textarea.classList.add('multiline');
    }
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
    sendBtn.disabled = textarea.value.trim().length === 0;
  });

  // Enter sem Shift envia
  textarea.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!sendBtn.disabled) sendBtn.click(); }
  });

  // Cards de sugestão - abre modal com título, descrição e botão iniciar chat
  document.querySelectorAll<HTMLElement>('.suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      const title = card.dataset.title || card.querySelector('.s-title')?.textContent || '';
      const desc = card.dataset.desc || '';
      const prompt = card.dataset.prompt || '';
      const actions = CARD_ACTIONS[title] || [];

      Modal({
        title,
        content: `<p class="text-[14px] text-[var(--color-text-secondary)] leading-relaxed">${desc}</p>`,
        confirmText: 'Iniciar Chat',
        showCancel: false,
        showConfirm: true,
        onConfirm: () => {
          if (actions.length) sessionStorage.setItem('ai-chat-actions', JSON.stringify(actions));
          else sessionStorage.removeItem('ai-chat-actions');
          sessionStorage.setItem('ai-chat-prompt', prompt);
          window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin-automation-chat' } }));
        },
        maxWidth: 'max-w-sm'
      });
    });
  });

  // Envio → abre tela de chat
  sendBtn.addEventListener('click', () => {
    const prompt = textarea.value.trim();
    if (!prompt) return;
    sessionStorage.setItem('ai-chat-prompt', prompt);
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin-automation-chat' } }));
  });

  // ── Helpers de chat ─────────────────────────────────────────────────────────
  const chatCardHTML = (chat: any, extraClass = '') => `
    <div class="recent-chat-card ${extraClass}" data-id="${chat.id}" data-json='${JSON.stringify(chat).replace(/'/g, '&apos;')}'>
      <div class="chat-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      </div>
      <span class="chat-title">${chat.title}</span>
      <span class="chat-date">${chat.updatedAt ? new Date(chat.updatedAt.seconds * 1000).toLocaleDateString('pt-BR') : 'Agora'}</span>
      <div class="chat-actions">
        <button class="chat-action-btn edit" title="Renomear">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="chat-action-btn delete" title="Excluir">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
        </button>
      </div>
    </div>
  `;

  const attachChatCardEvents = (el: Element, onDelete?: () => void) => {
    const card = el as HTMLElement;
    const id = card.dataset.id!;

    card.querySelector('.edit')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const titleEl = card.querySelector('.chat-title') as HTMLElement;
      const current = titleEl.textContent || '';
      const input = document.createElement('input');
      input.className = 'chat-title-input';
      input.value = current;
      titleEl.replaceWith(input);
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      const save = async () => {
        const newTitle = input.value.trim() || current;
        const span = document.createElement('span');
        span.className = 'chat-title';
        span.textContent = newTitle;
        input.replaceWith(span);
        if (newTitle !== current && user?.uid) {
          await updateDoc(doc(db, `users/${user.uid}/aiChats/${id}`), { title: newTitle }).catch(console.error);
        }
      };
      input.addEventListener('blur', save);
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } if (e.key === 'Escape') { input.value = current; input.blur(); } });
    });

    card.querySelector('.delete')?.addEventListener('click', async (e) => {
      e.stopPropagation();
      card.style.transition = 'opacity 0.2s, transform 0.2s';
      card.style.opacity = '0';
      card.style.transform = 'translateX(-8px)';
      setTimeout(async () => {
        card.remove();
        if (user?.uid) await deleteDoc(doc(db, `users/${user.uid}/aiChats/${id}`)).catch(console.error);
        onDelete?.();
      }, 200);
    });

    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.chat-actions')) return;
      sessionStorage.setItem('ai-chat-resume', id);
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin-automation-chat' } }));
    });
  };

  // ── Histórico de Chats ──────────────────────────────────────────────────────
  const openAllChatsModal = (allChats: any[]) => {
    const { closeModal } = Modal({
      title: 'Seus Chats Salvos',
      content: `<div class="flex flex-col gap-0.5 max-h-[420px] overflow-y-auto">${allChats.map(c => chatCardHTML(c, 'modal-chat-item')).join('')}</div>`,
      showConfirm: false,
      showCancel: false,
      showFooter: false,
      maxWidth: 'max-w-md'
    });

    setTimeout(() => {
      document.querySelectorAll('.modal-chat-item').forEach(item => {
        const card = item as HTMLElement;
        card.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).closest('.chat-actions')) return;
          closeModal();
        }, true);
        attachChatCardEvents(item);
      });
    }, 100);
  };

  const fetchRecentChats = async () => {
    if (!user?.uid) return;
    try {
      const q = query(
        collection(db, `users/${user.uid}/aiChats`),
        orderBy('updatedAt', 'desc')
      );
      const snap = await getDocs(q);
      const chats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const historyDiv = document.getElementById('quick-history')!;
      const listDiv = document.getElementById('recent-chats-list')!;
      const showAllBtn = document.getElementById('show-all-chats')!;

      if (chats.length === 0) {
        historyDiv.style.display = 'none';
        return;
      }

      historyDiv.style.display = 'flex';
      const top2 = chats.slice(0, 2);
      
      listDiv.innerHTML = top2.map(chat => chatCardHTML(chat, 'top-chat-item')).join('');

      if (chats.length > 2) {
        showAllBtn.style.display = 'block';
        showAllBtn.textContent = `+${chats.length - 2} chats`;
        showAllBtn.onclick = () => openAllChatsModal(chats);
      } else {
        showAllBtn.style.display = 'none';
      }

      document.querySelectorAll('.top-chat-item').forEach(card => {
        attachChatCardEvents(card, () => {
          const remaining = listDiv.querySelectorAll('.top-chat-item');
          if (remaining.length === 0) historyDiv.style.display = 'none';
        });
      });
    } catch (e) {
      console.error('Erro ao buscar chats:', e);
    }
  };

  fetchRecentChats();
}
