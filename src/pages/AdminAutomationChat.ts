import { BrilhoHeader } from '../components/BrilhoHeader';
import { Header, attachHeaderListeners } from '../components/Header';
import coinImg from '../assets/logo/coin.png';
import coinsImg from '../assets/coins.png';
import { API_BASE } from '../lib/apiConfig';
import { auth, db } from '../lib/firebase';
import {
  doc, setDoc, updateDoc, getDoc, serverTimestamp,
} from 'firebase/firestore';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Avvvatars from 'avvvatars-react';
import { MonthSelector, attachMonthSelectorListeners, toMonthKey } from '../components/MonthSelector';
import { createCoinChatAssistant } from '../lib/coinChatAssistant';

(window as any).ModoChat = () => {
  const current = localStorage.getItem('ai-chat-dev-mode') === 'true';
  localStorage.setItem('ai-chat-dev-mode', String(!current));
  const status = !current ? 'ATIVADO' : 'DESATIVADO';
  console.log(`%c[Coinzinha Dev] Modo Chat Dev: ${status}`, 'color: #D97757; font-weight: bold; font-size: 12px;');
  // Trigger a re-render instead of full reload so we stay on the page
  window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin-automation-chat' } }));
};

// ── Markdown rico ─────────────────────────────────────────────────────────────
function renderMarkdown(raw: string): string {
  let text = stripEmojis(raw);

  // ── Pré-processamento: normalizar markdown inline sem quebras ────────────────
  // Inserir \n\n antes de headings quando estão grudados em texto anterior
  text = text.replace(/([^\n])\s*(#{1,3} )/g, '$1\n\n$2');
  // Corrigir "--- ## Heading" e "--- ### Heading" sem quebrar separadores de tabela (|---|)
  text = text.replace(/(?<![|])-{3,}(?![|-])\s*(#{1,3} )/g, '\n\n$1');
  text = text.replace(/([^\n])\s*(?<![|])-{3,}(?![|-])\s*\n/g, '$1\n\n---\n\n');
  // Limpar newlines excessivos
  text = text.replace(/\n{3,}/g, '\n\n');

  // Fenced code blocks
  text = text.replace(/```([\w]*)\n?([\s\S]*?)```/g, (_m, _lang, code) =>
    `<pre><code>${escHtml(code.trim())}</code></pre>`
  );

  // Inline code
  text = text.replace(/`([^`]+)`/g, (_m, c) => `<code>${escHtml(c)}</code>`);

  // Tables
  text = text.replace(/(\|.+\|\n?)+/g, (block) => {
    const rows = block.trim().split('\n').filter(r => r.trim());
    const isSep    = (r: string) => /^[\|\s\-:]+$/.test(r);
    const isTotal  = (r: string) => /total|subtotal|soma/i.test(r);
    const getCells = (r: string) => r.split('|').slice(1, -1).map(c => c.trim());

    // Determinar número de colunas pelo cabeçalho
    const headRow = rows.find(r => !isSep(r));
    const colCount = headRow ? getCells(headRow).length : 0;

    // Separar linhas de total para renderizar lado a lado
    const dataRows  = rows.filter(r => !isSep(r));
    const totalRows = dataRows.filter((r, i) => i > 0 && isTotal(r));
    const bodyRows  = dataRows.filter((r, i) => i > 0 && !isTotal(r));

    if (!dataRows.length || !colCount) return block;

    const normCells = (r: string) => {
      let c = getCells(r).slice(0, colCount);
      while (c.length < colCount) c.push('');
      return c;
    };

    let html = '<div class="md-table-wrap"><table>';

    // Cabeçalho
    html += '<thead><tr>' + normCells(dataRows[0]).map(c => `<th>${c}</th>`).join('') + '</tr></thead>';

    // Corpo
    if (bodyRows.length) {
      html += '<tbody>' + bodyRows.map(r =>
        '<tr>' + normCells(r).map(c => `<td>${c}</td>`).join('') + '</tr>'
      ).join('') + '</tbody>';
    }

    // Totais — renderizar respeitando colunas da tabela
    if (totalRows.length) {
      html += '<tfoot>';
      if (totalRows.length === 2) {
        // Dois totais: primeiro à esquerda (col 1), segundo à direita (última col)
        const p0 = getCells(totalRows[0]).filter(x => x);
        const p1 = getCells(totalRows[1]).filter(x => x);
        const mid = colCount - 2; // colunas do meio vazias
        html += '<tr>';
        html += `<td><span class="tfoot-label">${p0[0] || ''}</span><strong>${p0[1] || ''}</strong></td>`;
        if (mid > 0) html += `<td colspan="${mid}"></td>`;
        html += `<td class="tfoot-right"><span class="tfoot-label">${p1[0] || ''}</span><strong>${p1[1] || ''}</strong></td>`;
        html += '</tr>';
      } else {
        // Um total ou mais de dois: cada um na sua coluna natural
        totalRows.forEach(r => {
          const cells = normCells(r);
          html += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
        });
      }
      html += '</tfoot>';
    }

    html += '</table></div>';
    return html;
  });

  // Horizontal rules
  text = text.replace(/^---+$/gm, '<hr>');

  // Blockquotes
  text = text.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Checklists
  text = text.replace(/^\[ \] (.+)$/gm,
    '<label class="md-check"><span class="md-checkbox"></span><span>$1</span></label>'
  );
  text = text.replace(/^\[x\] (.+)$/gmi,
    '<label class="md-check md-checked"><span class="md-checkbox"></span><span>$1</span></label>'
  );

  // Headers
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Bold / italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Bullet lists — group consecutive items
  text = text.replace(/(^[-•] .+(\n|$))+/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^[-•] /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Numbered lists
  text = text.replace(/(^\d+\. .+(\n|$))+/gm, (block) => {
    const items = block.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });

  // Paragraphs
  text = text
    .split(/\n{2,}/)
    .map(p => {
      p = p.trim();
      if (!p) return '';
      if (/^<(h[1-3]|ul|ol|pre|hr|blockquote|div|label|table)/.test(p)) return p;
      return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return text;
}

function escHtml(s: string) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function stripEmojis(s: string): string {
  return s.replace(/[\u{1F000}-\u{1FFFF}]|[\u{2600}-\u{27BF}]|[\u{1F300}-\u{1F9FF}]|[\u{FE00}-\u{FEFF}]|[\u{200D}]/gu, '').replace(/\s{2,}/g, ' ');
}

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Message { role: 'user' | 'assistant'; content: string; }

// ── Render ────────────────────────────────────────────────────────────────────
export function renderAdminAutomationChat(user: any) {
  if (user?.isAdmin !== true) {
    window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'dashboard' } }));
    return;
  }
  const IS_DEV_MODE = localStorage.getItem('ai-chat-dev-mode') === 'true';

  const initialPrompt: string = sessionStorage.getItem('ai-chat-prompt') || '';
  sessionStorage.removeItem('ai-chat-prompt');

  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div id="chat-shell" class="h-screen flex flex-col bg-[var(--color-background)] text-[var(--color-text)] overflow-hidden">
      ${BrilhoHeader()}
      ${Header({ user })}

      <style>
        /* ── Layout body ───────────────────────────────────────── */
        #chat-body {
          flex: 1;
          display: flex;
          flex-direction: row;
          justify-content: center;
          overflow: hidden;
          padding: 78px 12px 12px;
          position: relative;
          z-index: 1;
        }

        /* ── Chat principal ────────────────────────────────────── */
        #chat-main {
          width: 100%;
          max-width: 780px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-width: 0;
          position: relative;
        }

        #chat-toolbar {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 8px 20px 0;
        }

        .chat-toolbar-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .chat-toolbar-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--color-text-secondary);
          opacity: 0.65;
        }

        .chat-quick-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .chat-quick-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .chat-quick-btn:hover {
          color: var(--color-text);
          background: var(--color-surface-hover);
          border-color: var(--color-border-light);
        }

        #chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px 8px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          z-index: 1;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        #chat-messages::-webkit-scrollbar { display: none; }

        .msg-user-wrapper {
          align-self: flex-end;
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 85%;
          justify-content: flex-end;
        }
        .msg-user {
          background: var(--color-surface, #141414);
          border: 1px solid var(--color-border);
          color: var(--color-text);
          border-radius: 18px 18px 10px 18px;
          padding: 12px 18px;
          font-size: 14.5px;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .msg-user-avatar-root {
          width: 28px; height: 28px;
          border-radius: 50%;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          pointer-events: none;
          filter: saturate(0.6) brightness(1.1);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.05);
          overflow: hidden;
        }
        .msg-ai-wrapper {
          align-self: flex-start;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          max-width: 98%;
        }
        .msg-ai-avatar {
          width: 26px; height: 26px;
          border-radius: 50%;
          flex-shrink: 0;
          margin-top: 11px;
          opacity: 1;
          object-fit: cover;
        }
        .msg-ai {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          border-radius: 0;
          padding: 8px 0 8px;
          font-size: 15.5px;
          line-height: 1.8;
          word-break: break-word;
          color: var(--color-text);
          position: relative;
        }

        /* Estilo para o cursor dinâmico que fica colado no texto */
        .writing-cursor::after {
          content: '';
          display: inline-block;
          width: 2px;
          height: 1.1em;
          background: var(--color-text);
          margin-left: 2px;
          vertical-align: text-bottom;
          animation: cursor-pulse 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          border-radius: 1px;
        }

        @keyframes cursor-pulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.9; }
        }

        .msg-ai-wrapper, .msg-user-wrapper {
          animation: messageIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes messageIn {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .msg-ai.writing-active > * {
          animation: textFadeIn 0.2s ease-out forwards;
        }
        @keyframes textFadeIn {
          from { opacity: 0.85; }
          to { opacity: 1; }
        }

        /* Markdown styles */
        .msg-ai > *:first-child { margin-top: 0 !important; }
        .msg-ai p { margin: 0 0 10px; }
        .msg-ai p:last-child { margin-bottom: 0; }
        .msg-ai h1 { font-size: 17px; font-weight: 700; margin: 14px 0 8px; }
        .msg-ai h2 { font-size: 15px; font-weight: 700; margin: 12px 0 6px; }
        .msg-ai h3 { font-size: 13px; font-weight: 500; margin: 14px 0 6px; color: var(--color-text-secondary); letter-spacing: 0.04em; text-transform: uppercase; }
        .msg-ai strong { font-weight: 600; }
        .msg-ai em { font-style: italic; }
        .msg-ai ul, .msg-ai ol { margin: 8px 0; padding-left: 20px; }
        .msg-ai li { margin-bottom: 5px; }
        .msg-ai hr { border: none; border-top: 1px solid var(--color-border); margin: 14px 0; }
        .msg-ai blockquote {
          border: 1px solid var(--color-border);
          margin: 6px 0;
          padding: 10px 16px;
          background: var(--color-surface-hover);
          border-radius: 10px;
          font-size: 13.5px;
          color: var(--color-text);
          transition: border-color 0.2s;
        }
        .msg-ai blockquote:hover {
          border-color: var(--color-border-light);
        }
        .msg-ai pre {
          background: var(--color-background);
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 14px 16px;
          overflow-x: auto;
          margin: 10px 0;
          font-size: 13px;
        }
        .msg-ai code { font-family: 'Menlo', 'Consolas', monospace; font-size: 12.5px; }
        .msg-ai pre code { display: block; }
        .msg-ai .md-table-wrap {
          overflow-x: auto;
          margin: 16px 0;
          border-radius: 14px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
        }
        .msg-ai table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .msg-ai thead tr { border-bottom: 1px solid var(--color-border-light); }
        .msg-ai th {
          background: transparent;
          color: var(--color-text-secondary);
          font-weight: 500;
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 12px 16px;
          text-align: left;
        }
        .msg-ai td {
          padding: 11px 16px;
          color: var(--color-text);
          font-size: 13.5px;
          border-bottom: 1px solid var(--color-border-light);
        }
        .msg-ai tr:last-child td { border-bottom: none; }
        .msg-ai tbody tr:hover td { background: var(--color-surface-hover); }
        .msg-ai tfoot tr { border-top: 1px solid var(--color-border); }
        .msg-ai tfoot td { font-weight: 600; color: var(--color-text); padding: 11px 16px; }
        .msg-ai tfoot td.tfoot-right { text-align: right; }
        .msg-ai tfoot .tfoot-label { font-weight: 400; font-size: 11px; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; display: block; margin-bottom: 2px; }
        .msg-ai .md-check {
          display: flex; align-items: flex-start; gap: 10px;
          margin: 6px 0; cursor: default; font-size: 14px;
        }
        .msg-ai .md-checkbox {
          flex-shrink: 0; width: 16px; height: 16px;
          border: 1.5px solid var(--color-border); border-radius: 4px;
          margin-top: 2px; display: flex; align-items: center; justify-content: center;
        }
        .msg-ai .md-checked .md-checkbox { background: var(--color-text); border-color: var(--color-text); }
        .msg-ai .md-checked .md-checkbox::after {
          content: ''; width: 8px; height: 5px;
          border-left: 2px solid var(--color-background); border-bottom: 2px solid var(--color-background);
          transform: rotate(-45deg) translateY(-1px); display: block;
        }

        /* Action buttons após resposta IA */
        .ai-actions-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          padding: 4px 0 4px 38px;
          animation: fadeInUp 0.3s ease forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .ai-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 20px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text-secondary);
          font-size: 12.5px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.18s ease;
          white-space: nowrap;
        }
        .ai-action-btn:hover {
          background: var(--color-surface-hover);
          border-color: var(--color-border-light);
          color: var(--color-text);
          transform: translateY(-1px);
        }
        .ai-action-btn:active { transform: translateY(0); }

        .coin-chat-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 16px;
          padding: 12px 14px;
          margin: 4px 0;
        }

        /* -- Dev Mode Badge ───────────────────────────────────── */
        #dev-mode-badge-container {
          position: sticky;
          top: 0;
          z-index: 50;
          background: var(--color-background);
          transform: translateZ(0); /* Hardware acceleration */
        }

        .dev-mode-badge {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background: rgba(45, 45, 44, 0.4);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(217, 119, 87, 0.15);
          border-radius: 12px;
          margin: 10px 20px 0;
          color: #D97757;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .dev-mode-badge.inactive {
          color: var(--color-text-secondary);
          background: var(--color-surface);
          border-color: var(--color-border);
          opacity: 0.6;
        }

        .dev-mode-badge .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 10px currentColor;
        }

        .dev-mode-badge.active .status-dot {
          animation: pulseDev 1.5s infinite;
        }

        @keyframes pulseDev {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        /* -- Dev Banner Glued to Input ────────────────────────── */
        #dev-mode-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin: 0 auto -1px auto;
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

        /* -- Empty State ────────────────────────────────────────── */
        #chat-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          gap: 16px;
          animation: fadeInUp 0.5s ease-out forwards;
        }

        #chat-empty-state img {
          filter: grayscale(0.2) brightness(1.1);
          opacity: 0.8;
          animation: floating 3s ease-in-out infinite;
        }

        @keyframes floating {
          from { transform: translateY(0px); }
          65% { transform: translateY(-8px); }
          to { transform: translateY(0px); }
        }

        .coin-chat-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }

        .coin-chat-card-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--color-text);
        }

        .coin-chat-card-subtitle {
          font-size: 11px;
          color: var(--color-text-secondary);
          margin-top: 1px;
        }

        .coin-chat-card-body {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .coin-chat-list {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .coin-chat-section {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .coin-chat-section-title {
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--color-text-secondary);
          opacity: 0.75;
        }

        .coin-chat-item {
          border: none;
          border-bottom: 1px solid var(--color-border);
          background: transparent;
          border-radius: 0;
          padding: 10px 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .coin-chat-item:last-child {
          border-bottom: none;
          padding-bottom: 0;
        }

        .coin-chat-item:first-child {
          padding-top: 4px;
        }

        .coin-chat-item-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .coin-chat-item-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text);
          line-height: 1.4;
        }

        .coin-chat-item-amount {
          white-space: nowrap;
          font-size: 13px;
          font-weight: 600;
        }

        .coin-chat-item-amount.is-positive { color: #8FDBA2; }
        .coin-chat-item-amount.is-negative { color: #FF8080; }

        .coin-chat-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .coin-chat-chip {
          display: inline-flex;
          align-items: center;
          padding: 2px 7px;
          border-radius: 999px;
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          font-size: 10px;
          font-weight: 500;
          opacity: 0.7;
        }

        .coin-chat-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }

        .coin-chat-item .coin-chat-actions {
          padding-top: 8px;
          margin-left: -14px;
          margin-right: -14px;
          padding-left: 14px;
          padding-right: 14px;
          border-top: 1px solid var(--color-border);
        }

        .coin-chat-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 4px 10px;
          border-radius: 999px;
          border: 1px solid var(--color-border);
          background: transparent;
          color: var(--color-text-secondary);
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .coin-chat-action-btn:hover {
          color: var(--color-text);
          background: var(--color-surface-hover);
          border-color: var(--color-border-light);
        }

        .coin-chat-action-btn[data-variant="danger"] {
          color: rgba(248, 113, 113, 0.75);
          border-color: rgba(248, 113, 113, 0.2);
        }

        .coin-chat-action-btn[data-variant="danger"]:hover {
          background: rgba(248, 113, 113, 0.08);
          border-color: rgba(248, 113, 113, 0.4);
          color: #f87171;
        }

        .coin-chat-inline,
        .coin-chat-empty,
        .coin-chat-footnote {
          font-size: 12.5px;
          line-height: 1.6;
          color: var(--color-text-secondary);
        }

        .coin-chat-modal-btn {
          width: 100%;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid var(--color-border);
          background: var(--color-surface);
          color: var(--color-text);
          font-size: 13px;
          font-weight: 700;
          text-align: left;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .coin-chat-modal-btn:hover {
          background: var(--color-surface-hover);
          border-color: var(--color-border-light);
        }

        /* Typing animation */
        .typing-dots span {
          display: inline-block; width: 6px; height: 6px;
          border-radius: 50%; background: var(--color-text-secondary);
          animation: bounce 1.2s infinite; margin: 0 2px;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-5px); opacity: 1; }
        }

        /* ── Input area ────────────────────────────────────────── */
        #chat-input-area {
          flex-shrink: 0;
          padding: 10px 16px 16px;
          background: linear-gradient(to top, var(--color-background) 60%, transparent);
        }
        #chat-input-inner { position: relative; z-index: 1; }
        #chat-input {
          width: 100%;
          resize: none;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 20px;
          padding: 14px 110px 14px 20px;
          font-size: 15px;
          line-height: 1.5;
          min-height: 52px;
        }
        #chat-input.multiline {
          padding: 14px 20px 48px 20px;
          color: var(--color-text);
          outline: none;
          font-family: inherit;
          transition: border-color 0.2s, background 0.2s;
          max-height: 160px;
          overflow-y: auto;
          box-shadow: none;
          scrollbar-width: none;
          -ms-overflow-style: none;
          position: relative;
          z-index: 1;
        }
        #chat-input::-webkit-scrollbar { display: none; }
        #chat-input::placeholder { color: var(--color-text-secondary); opacity: 0.5; }
        #chat-input:focus { border-color: var(--color-border-light); background: var(--color-surface-hover); }
        #chat-submit {
          position: absolute;
          bottom: 10px;
          right: 12px;
          transform: none;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          opacity: 0.4;
          color: var(--color-text-secondary);
          z-index: 2;
        }
        #chat-submit:not(:disabled) { 
          color: var(--color-text); 
        }
        #chat-submit:not(:disabled):hover { 
          background: rgba(255,255,255,0.05); 
          transform: scale(1.05);
        }
        #chat-submit:not(:disabled):active { transform: scale(0.96); }
        
        /* Multiline logic simplified - keeping bottom alignment */
        #chat-input.multiline ~ #chat-submit:not(:disabled):hover { transform: scale(1.05); }
        #chat-input.multiline ~ #chat-submit:not(:disabled):active { transform: scale(0.96); }

        #chat-credits-pill {
          position: absolute;
          right: 56px;
          bottom: 14px;
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
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        /* Multiline logic simplified - keeping bottom alignment */
        #chat-input.multiline ~ #chat-credits-pill { 
          transform: none; 
        }
        #chat-credits-pill img {
          width: 14px;
          height: 14px;
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

      <div id="chat-body">

        <!-- ── Chat principal ── -->
        <div id="chat-main">


          <div id="chat-messages"></div>
          <div id="chat-input-area">
            <div id="dev-mode-banner" class="${IS_DEV_MODE ? 'active' : 'inactive'}">
              <span class="status-dot"></span>
              <span>MODO DEV (MOCK ATIVO)</span>
            </div>
            <div id="chat-input-inner">
              <textarea id="chat-input" rows="1" placeholder="Continue a conversa..."></textarea>
              <div id="chat-credits-pill">
                <img src="${coinsImg}" alt="Coins">
                <span>1.000</span>
              </div>
              <button id="chat-submit" disabled>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  attachHeaderListeners();

  const messagesEl   = document.getElementById('chat-messages')!;
  const inputEl      = document.getElementById('chat-input') as HTMLTextAreaElement;
  const submitBtn    = document.getElementById('chat-submit') as HTMLButtonElement;
  const chatMainEl   = document.getElementById('chat-main')!;
  const creditsSpan  = document.querySelector('#chat-credits-pill span') as HTMLSpanElement;

  let aiCredits = parseInt(localStorage.getItem('coin-ai-credits') || '1000', 10);
  if (creditsSpan) creditsSpan.textContent = aiCredits.toLocaleString('pt-BR');

  function deductTokens() {
    const cost = Math.floor(Math.random() * 8) + 2; // Custo simulado 2 a 9 tokens
    aiCredits = Math.max(0, aiCredits - cost);
    localStorage.setItem('coin-ai-credits', aiCredits.toString());
    if (creditsSpan) {
      creditsSpan.textContent = aiCredits.toLocaleString('pt-BR');
      creditsSpan.parentElement!.style.transform = 'scale(1.08)';
      setTimeout(() => { if (creditsSpan.parentElement) creditsSpan.parentElement.style.transform = 'scale(1)'; }, 200);
    }
  }

  const history: Message[] = [];
  let isStreaming = false;
  let chatId: string | null = null;
  const uid = auth.currentUser?.uid;
  const storedMonthKey = sessionStorage.getItem('ai-chat-month');
  let activeMonthKey = storedMonthKey && /^\d{4}-\d{2}$/.test(storedMonthKey) ? storedMonthKey : toMonthKey(new Date());

  const monthSelectorApi = attachMonthSelectorListeners({
    id: 'chat-month-selector',
    initialDate: new Date(`${activeMonthKey}-01T12:00:00`),
    onMonthChange: (date) => {
      activeMonthKey = toMonthKey(date);
      sessionStorage.setItem('ai-chat-month', activeMonthKey);
    }
  });

  const setActiveMonthKey = (monthKey: string) => {
    activeMonthKey = monthKey;
    sessionStorage.setItem('ai-chat-month', activeMonthKey);
    monthSelectorApi?.setCurrentDate?.(new Date(`${monthKey}-01T12:00:00`));
  };

  // Ações contextuais vindas do card clicado
  interface CardAction { label: string; page: string; icon: string; }
  const pendingActions: CardAction[] = (() => {
    try { return JSON.parse(sessionStorage.getItem('ai-chat-actions') || '[]'); } catch { return []; }
  })();
  sessionStorage.removeItem('ai-chat-actions');

  // ── Salvar chat no Firestore ────────────────────────────────────────────────
  async function saveChat() {
    if (!uid) return;
    const data = {
      title: history.find(m => m.role === 'user')?.content.slice(0, 80) ?? 'Chat sem título',
      messages: history,
      updatedAt: serverTimestamp(),
    };
    if (!chatId) {
      chatId = `chat_${Date.now()}`;
      await setDoc(doc(db, `users/${uid}/aiChats/${chatId}`), {
        ...data,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, `users/${uid}/aiChats/${chatId}`), data);
    }
  }

  // Armazena prefill capturado do bloco COIN_ACTION da última resposta da IA
  let pendingActionPrefill: Record<string, string> | null = null;

  const localAssistant = uid
    ? createCoinChatAssistant({
        userId: uid,
        getCurrentMonthKey: () => activeMonthKey,
        setCurrentMonthKey: setActiveMonthKey,
        pushAssistantMessage: appendLocalAssistantMsg,
        getPendingActionPrefill: () => {
          const prefill = pendingActionPrefill;
          pendingActionPrefill = null; // consome o prefill após leitura
          return prefill;
        },
      })
    : null;


  // ── Auto-resize do input ────────────────────────────────────────────────────
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.classList.remove('multiline');
    const naturalHeight = inputEl.scrollHeight;

    if (naturalHeight > 56) {
      inputEl.classList.add('multiline');
    }
    inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + 'px';
    submitBtn.disabled = inputEl.value.trim().length === 0 || isStreaming;
  });

  inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!submitBtn.disabled) submitBtn.click(); }
  });

  // ── Mensagens na tela ───────────────────────────────────────────────────────
  function appendUserMsg(text: string) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-user-wrapper';
    const avatarValue = user.email || user.displayName || 'u';
    wrapper.innerHTML = `
      <div class="msg-user">${text}</div>
      <div class="msg-user-avatar-root" data-value="${avatarValue}"></div>
    `;
    messagesEl.appendChild(wrapper);
    scrollBottom();
    const avatarEl = wrapper.querySelector('.msg-user-avatar-root')!;
    const root = createRoot(avatarEl);
    root.render(createElement(Avvvatars, { value: avatarValue, size: 28, style: 'shape' }));
  }

  function appendTyping(): HTMLDivElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-ai-wrapper';
    wrapper.innerHTML = `<img src="${coinImg}" class="msg-ai-avatar" alt="Coinzinha" />`;

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const lottieSrc = isLight ? '/assets/lottie/chatpreto.json' : '/assets/lottie/chatbranco.json';
    const content = document.createElement('div');
    content.style.display = 'flex';
    content.style.alignItems = 'center';
    content.style.gap = '8px';
    content.innerHTML = `
      <lottie-player src="${lottieSrc}" background="transparent" speed="1" style="width: 32px; height: 32px; margin-top: 11px;"></lottie-player>
      <span id="ai-thinking-text" class="brand-shine" style="font-size: 13.5px; display: none; margin-top: 11px; font-weight: 500;"></span>
    `;
    wrapper.appendChild(content);
    messagesEl.appendChild(wrapper);
    scrollBottom();

    setTimeout(() => {
      const player = content.querySelector('lottie-player') as any;
      if (!player) return;
      const playCycle = () => {
        if (!content.isConnected) return;
        player.play();
        player.addEventListener('complete', () => {
          setTimeout(() => { if (content.isConnected) playCycle(); }, 1000);
        }, { once: true });
      };
      playCycle();
    }, 100);

    return content;
  }

  function appendAiMsg(html: string) {
    const wrapper = document.createElement('div');
    wrapper.className = 'msg-ai-wrapper';
    wrapper.innerHTML = `<img src="${coinImg}" class="msg-ai-avatar" alt="Coinzinha" />`;
    const content = document.createElement('div');
    content.className = 'msg-ai';
    content.innerHTML = html;
    wrapper.appendChild(content);
    messagesEl.appendChild(wrapper);
  }

  async function appendLocalAssistantMsg(content: string) {
    appendAiMsg(renderMarkdown(content));
    history.push({ role: 'assistant', content });
    scrollBottom();
    await saveChat().catch(console.error);
  }

  function scrollBottom() {
    requestAnimationFrame(() => {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    });
  }

  const handleChatActionClick = async (target: HTMLElement) => {
    const actionEl = target.closest<HTMLElement>('[data-chat-action]');
    if (!actionEl || !localAssistant) return;
    const action = actionEl.dataset.chatAction;
    if (!action) return;
    const response = await localAssistant.handleAction(action, actionEl.dataset);
    if (response) {
      await appendLocalAssistantMsg(response);
    }
  };

  chatMainEl.addEventListener('click', (event) => {
    void handleChatActionClick(event.target as HTMLElement);
  });


  // ── Enviar mensagem ─────────────────────────────────────────────────────────
  async function sendMessage(prompt: string) {
    if (!prompt.trim() || isStreaming) return;
    isStreaming = true;
    submitBtn.disabled = true;

    history.push({ role: 'user', content: prompt });
    removeEmptyState();
    appendUserMsg(prompt);
    inputEl.value = '';
    inputEl.classList.remove('multiline');
    inputEl.style.height = 'auto';

    if (localAssistant) {
      const localResponse = await localAssistant.handlePrompt(prompt);
      if (localResponse) {
        await appendLocalAssistantMsg(localResponse);
        isStreaming = false;
        submitBtn.disabled = inputEl.value.trim().length === 0;
        deductTokens();
        return;
      }
    }

    if (IS_DEV_MODE) {
      const mockResponse = "⚠️ **Modo Dev Ativo**: Não consegui resolver esse comando localmente e a conexão com a IA real está bloqueada no Modo Dev.";
      const aiDiv = appendTyping();
      setTimeout(async () => {
        aiDiv.parentElement?.remove(); // remove typing indication
        await appendLocalAssistantMsg(mockResponse);
        isStreaming = false;
        submitBtn.disabled = inputEl.value.trim().length === 0;
        deductTokens();
      }, 1500);
      return;
    }

    const aiDiv = appendTyping();
    let fullText = '';
    let displayedText = '';
    let queue = '';
    let isReadingDone = false;

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE}/api/ai/automation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt, history: history.slice(0, -1), monthKey: activeMonthKey }),
      });

      if (!res.ok || !res.body) {
        aiDiv.textContent = 'Erro ao conectar com a IA.';
        isStreaming = false;
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let isFirstText = true;

      const processQueue = async () => {
        if (!aiDiv.isConnected) return;

        if (queue.length > 0) {
          // Lógica de digitação premium:
          // Se a fila estiver grande, acelera. Se estiver pequena, digita caractere por caractere.
          // Adiciona um fator de aleatoriedade para parecer mais humano.
          const idealBatch = queue.length > 50 ? Math.ceil(queue.length / 12) : 1;
          const randomFactor = Math.random() > 0.8 ? 2 : 1;
          const batchSize = Math.min(queue.length, idealBatch * randomFactor);
          
          displayedText += queue.substring(0, batchSize);
          queue = queue.substring(batchSize);
          aiDiv.innerHTML = renderMarkdown(displayedText);
          
          // Anexar cursor ao último elemento de texto (p, li, etc)
          const lastChild = aiDiv.querySelector('p:last-child, li:last-child, td:last-child, h1:last-child, h2:last-child, h3:last-child, code:last-child');
          if (lastChild) {
            lastChild.classList.add('writing-cursor');
          } else {
            aiDiv.classList.add('writing-cursor');
          }
          
          scrollBottom();
        }

        if (!isReadingDone || queue.length > 0) {
          // Velocidade dinâmica baseada no tamanho da fila pendente
          const delay = queue.length > 100 ? 5 : (queue.length > 20 ? 12 : 20);
          requestAnimationFrame(() => setTimeout(processQueue, delay));
        } else if (fullText) {
          // Remover classes de cursor e estado de escrita ao terminar
          aiDiv.querySelectorAll('.writing-cursor').forEach(el => el.classList.remove('writing-cursor'));
          aiDiv.classList.remove('writing-cursor');
          aiDiv.classList.remove('writing-active');
          
          // ── Processa blocos COIN_ACTION (criar dados) ──────────────────────
          const coinActionMatch = fullText.match(/<!--COIN_ACTION:(\{.+?\})-->/s);
          if (coinActionMatch) {
            try {
              pendingActionPrefill = JSON.parse(coinActionMatch[1]);
            } catch { /* ignora JSON inválido */ }
            fullText = fullText.replace(/\s*<!--COIN_ACTION:\{.+?\}-->/s, '').trimEnd();
          }

          // ── Processa blocos COIN_RENDER (mostrar cards interativos) ────────
          const renderMatches = [...fullText.matchAll(/<!--COIN_RENDER:(\{.+?\})-->/gs)];
          if (renderMatches.length > 0) {
            fullText = fullText.replace(/\s*<!--COIN_RENDER:\{.+?\}-->/gs, '').trimEnd();
          }

          displayedText = fullText;
          aiDiv.innerHTML = renderMarkdown(fullText);

          history.push({ role: 'assistant', content: fullText });
          saveChat().catch(console.error);
          handlePendingActions();

          // Renderiza os cards COIN_RENDER após a resposta de texto
          if (renderMatches.length > 0 && localAssistant) {
            for (const match of renderMatches) {
              try {
                const { type } = JSON.parse(match[1]);
                const actionMap: Record<string, string> = {
                  subscriptions:  'show-subscriptions',
                  reminders:      'show-reminders',
                  transactions:   'show-transactions',
                  savings:        'show-savings',
                  assets:         'show-assets',
                  totalization:   'show-totalization',
                };
                const action = actionMap[type];
                if (action) {
                  const cardHtml = await localAssistant.handleAction(action, {} as DOMStringMap);
                  if (cardHtml) await appendLocalAssistantMsg(cardHtml);
                }
              } catch { /* ignora bloco inválido */ }
            }
          }

          // ── Processa automaticamente e dispara o COIN_ACTION (ex: modal de criação) ────────
          if (pendingActionPrefill && pendingActionPrefill.action && localAssistant) {
            try {
              const cardHtml = await localAssistant.handleAction(
                pendingActionPrefill.action,
                pendingActionPrefill as unknown as DOMStringMap,
              );
              if (cardHtml) await appendLocalAssistantMsg(cardHtml);
            } catch (err) {
              console.error('Erro ao processar acao da IA:', err);
            }
          }

          deductTokens();
        }
      };

      // Inicia o processo de renderização suave
      processQueue();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          isReadingDone = true;
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) {
              queue = ''; // Limpa fila para não sobrescrever erro
              aiDiv.textContent = parsed.error;
              isReadingDone = true;
              aiDiv.classList.remove('writing-active');
              return;
            }
            if (parsed.thinking) {
              const thinkingSpan = aiDiv.querySelector('#ai-thinking-text') as HTMLElement;
              if (thinkingSpan) {
                thinkingSpan.style.display = 'inline-block';
                thinkingSpan.textContent = parsed.thinking;
              }
            }
            if (parsed.text) {
              if (isFirstText) {
                isFirstText = false;
                aiDiv.className = 'msg-ai';
                aiDiv.style.cssText = '';
                aiDiv.innerHTML = '';
                aiDiv.classList.add('writing-active');
              }
              fullText += parsed.text;
              queue += parsed.text;
            }
          } catch { /* ignore */ }
        }
      }

      function handlePendingActions() {
        if (pendingActions.length && history.filter(m => m.role === 'assistant').length === 1) {
          const actionsRow = document.createElement('div');
          actionsRow.className = 'ai-actions-row';
          actionsRow.innerHTML = pendingActions.map(a =>
            `<button class="ai-action-btn" data-page="${a.page}">${a.icon}${a.label}</button>`
          ).join('');
          messagesEl.appendChild(actionsRow);
          actionsRow.querySelectorAll<HTMLButtonElement>('.ai-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: btn.dataset.page } }));
            });
          });
          scrollBottom();
        }
      }

    } catch {
      queue = ''; // Limpa fila 
      isReadingDone = true;
      aiDiv.classList.remove('writing-active');
      aiDiv.textContent = 'Erro de conexão. Tente novamente.';
    } finally {
      isStreaming = false;
      submitBtn.disabled = inputEl.value.trim().length === 0;
    }
  }

  submitBtn.addEventListener('click', () => {
    const val = inputEl.value.trim();
    if (!val) return;
    sendMessage(val);
    inputEl.value = '';
    inputEl.classList.remove('multiline');
    inputEl.style.height = 'auto';
    submitBtn.disabled = true;
  });

  // ── Inicialização ───────────────────────────────────────────────────────────
  const savedId = sessionStorage.getItem('ai-chat-resume');
  sessionStorage.removeItem('ai-chat-resume');
  sessionStorage.removeItem('ai-chat-data'); // limpa dado legado

  if (savedId && uid) {
    // Busca o chat direto do Firestore (evita corrupção de data-json)
    (async () => {
      try {
        const snap = await getDoc(doc(db, `users/${uid}/aiChats/${savedId}`));
        if (snap.exists()) {
          const data = snap.data();
          chatId = savedId;
          const messages: Message[] = Array.isArray(data.messages) ? data.messages : [];
          messages.forEach(m => {
            history.push(m);
            if (m.role === 'user') appendUserMsg(m.content);
            else appendAiMsg(renderMarkdown(m.content));
          });
          if (messages.length > 0) {
            scrollBottom();
          } else {
            renderEmptyState();
          }
        } else {
          renderEmptyState();
        }
      } catch {
        renderEmptyState();
      }
    })();
  } else if (initialPrompt) {
    sendMessage(initialPrompt);
  } else {
    renderEmptyState();
  }

  function renderEmptyState() {
    if (history.length > 0) return;
    const empty = document.createElement('div');
    empty.id = 'chat-empty-state';
    empty.innerHTML = `
      <img src="${coinImg}" class="w-14 h-14 mb-2" alt="Coin" />
      <div>
        <h2 class="text-[20px] font-bold text-[var(--color-text)] mb-1">Automação com <span class="brand-shine" style="font-family: 'Dancing Script', cursive; font-size: 26px; vertical-align: middle; transform: translateY(-3px); margin-left: 3px;">Coinzinha</span></h2>
        <p class="text-[13px] text-[var(--color-text-secondary)] opacity-60 max-w-[340px] leading-relaxed">
          Descreva o que deseja automatizar e a Coinzinha irá executar para você.
        </p>
      </div>
    `;
    messagesEl.appendChild(empty);
  }

  function removeEmptyState() {
    const empty = document.getElementById('chat-empty-state');
    if (empty) empty.remove();
  }
}
