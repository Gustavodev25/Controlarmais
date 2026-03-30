import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { toaster } from './Toast';
import { UserDropdown, attachDropdownListeners } from './UserDropdown';
import type { DropdownItem } from './UserDropdown';
import { attachThemeSwitcherListeners } from './ThemeSwitcher';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import Avvvatars from 'avvvatars-react';
import gsap from 'gsap';

import { NavSharedDropdown, attachNavSharedDropdownListeners } from './NavSharedDropdown';
import { closeAllGenericDropdowns } from './GenericDropdown';
import type { NavDropdownConfig } from './NavSharedDropdown';
import { themeManager } from './ThemeManager';
import { openSupportModal } from './SupportModal';

import { API_BASE } from '../lib/apiConfig';
import coinImg from '../assets/logo/coin.png';
const API_BASE_URL = API_BASE;
let syncEventSource: EventSource | null = null;
let mobileMenuLottieIntervals: ReturnType<typeof setInterval>[] = [];

interface HeaderProps {
  user: any;
}

export function Header({ user }: HeaderProps): string {
  const avatarValue = user.email || user.displayName || 'tim@apple.com';
  const isLight = localStorage.getItem('theme') === 'light';
  const currentPage = sessionStorage.getItem('currentPage');
  const isAdminPage = currentPage === 'admin' || currentPage === 'admin-subscriptions' || currentPage === 'admin-abandoned-carts' || currentPage === 'admin-updates';

  const dropdownItems: DropdownItem[] = [
    {
      id: 'profile-btn-dropdown',
      label: 'Meu Perfil',
      sublabel: user.displayName || user.email?.split('@')[0] || '',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>`
    },
    {
      id: 'updates-btn-dropdown',
      label: 'O que há de novo',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>`
    },
    {
      id: 'support-btn-dropdown',
      label: 'Suporte',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
      </svg>`
    },
    {
      id: 'logout-btn-dropdown',
      label: 'Sair da conta',
      variant: 'danger',
      icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>`
    }
  ];

  const isAdminUser = user.isAdmin || sessionStorage.getItem('isAdminUser') === 'true';
  if (isAdminUser) {
    if (isAdminPage) {
      dropdownItems.splice(1, 0, {
        id: 'exit-admin-btn-dropdown',
        label: 'Sair do Modo Admin',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70"><path d="M15 18l-6-6 6-6"></path></svg>`
      });
    } else {
      dropdownItems.splice(1, 0, {
        id: 'admin-btn-dropdown',
        label: 'Painel Admin',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-70"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
      });
    }
  }

  return `
    <style>
      /* ── Header entrance ── */
      #app-header {
        animation: headerSlideDown 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      @keyframes headerSlideDown {
        from { opacity: 0; transform: translateY(-12px); }
        to   { opacity: 1; transform: translateY(0); }
      }

      /* Logo hover lift */
      #header-logo-wrapper {
        transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        text-decoration: none;
      }
      #header-logo-wrapper:hover {
        opacity: 0.9;
        transform: scale(1.05);
      }

      /* Navigation items */
      .nav-link {
        position: relative;
        font-size: 13px;
        font-weight: 500;
        color: color-mix(in srgb, var(--color-text) 55%, transparent);
        transition: all 0.2s ease;
        padding: 6px 10px;
        margin-top: 0;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
        line-height: 1;
      }
      .nav-link svg {
        /* margin-top: 1px; Optical adjustment for visual centering */
      }
      .nav-link:hover, .nav-link.active, .nav-link.active-dropdown {
        color: var(--color-text);
        background: var(--color-surface-hover);
      }
      .nav-link.active {
        color: var(--color-text);
        font-weight: 600;
      }

      /* Avatar conic glow ring on hover */
      #topbar-avatar-container {
        position: relative;
      }
      #topbar-avatar-container::before {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 50%;
        background: conic-gradient(
          from 0deg,
          rgba(255,255,255,0.0) 0%,
          rgba(255,255,255,0.18) 50%,
          rgba(255,255,255,0.0) 100%
        );
        opacity: 0;
        transition: opacity 0.3s ease;
        animation: rotateConic 2.5s linear infinite paused;
      }
      #topbar-avatar-container:hover::before {
        opacity: 1;
        animation-play-state: running;
      }
      @keyframes rotateConic {
        to { transform: rotate(360deg); }
      }

      /* Avatar scale on hover */
      #topbar-avatar-container #react-avatar-root {
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                    box-shadow 0.25s ease;
      }
      #topbar-avatar-container:hover #react-avatar-root {
        transform: scale(1.08);
        box-shadow: 0 0 0 2px rgba(255,255,255,0.15),
                    0 6px 24px rgba(0,0,0,0.6);
      }

      /* ── Mobile Hamburger Menu ── */
      #mobile-menu-btn {
        display: none;
        flex-direction: column;
        gap: 5px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        transition: all 0.3s ease;
      }

      #mobile-menu-btn span {
        width: 24px;
        height: 2px;
        background-color: var(--color-text);
        border-radius: 2px;
        transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        display: block;
      }

      #mobile-menu-btn.active span:nth-child(1) {
        transform: translateY(7px) rotate(45deg);
      }

      #mobile-menu-btn.active span:nth-child(2) {
        opacity: 0;
      }

      #mobile-menu-btn.active span:nth-child(3) {
        transform: translateY(-7px) rotate(-45deg);
      }

      @media (max-width: 768px) {
        #mobile-menu-btn {
          display: flex;
        }
      }

      /* Mobile Menu */
      #mobile-menu {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: var(--color-background);
        border-top: none;
        z-index: 99;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        visibility: hidden;
        box-sizing: border-box;
      }

      .mobile-menu-content {
        padding: 0;
        padding-top: 82px;
        display: flex;
        flex-direction: column;
        gap: 0;
        background: transparent;
        border-top: 1px solid var(--color-border);
        width: 100%;
      }

      .mobile-menu-section {
        padding: 0;
        border-bottom: 1px solid var(--color-border);
        margin: 0;
        width: 100%;
      }

      .mobile-menu-section:last-child {
        border-bottom: none;
      }

      /* Estilos refeitos para desgrudar do canto e formar um card */
      .mobile-nav-link {
        padding: 12px 16px;
        font-size: 14px;
        font-weight: 500;
        color: var(--color-text);
        border-radius: 8px; /* Arredondado para parecer um card */
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.2s ease;
        margin: 6px 16px; /* Desgrudado das bordas laterais */
        width: calc(100% - 32px); /* Respeita as margens */
        box-sizing: border-box;
        border: 1px solid transparent;
      }

      .mobile-nav-link:hover {
        background-color: var(--color-surface-hover);
        color: var(--color-text);
      }

      .mobile-nav-link.active {
        background-color: var(--color-surface-hover);
        font-weight: 600;
        border: 1px solid var(--color-border); /* Borda apenas no estado ativo */
      }

      .mobile-nav-link svg {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      .mobile-nav-link lottie-player {
        width: 20px !important;
        height: 20px !important;
        flex-shrink: 0;
      }

      .mobile-menu-title {
        padding: 12px 16px;
        padding-top: 20px;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 0;
      }

    </style>

    <header
      id="app-header"
      class="h-[66px] px-4 md:px-10 flex items-center justify-between absolute top-0 left-0 right-0 z-[100] bg-transparent"
    >

      <div class="flex items-center gap-4 md:gap-8 h-full">
        <div id="header-logo-wrapper" class="flex items-center gap-2.5 select-none shrink-0 cursor-pointer">
          <img
            src="/assets/logo/logo.png"
            alt="Logo"
            class="w-9 h-9 object-contain"
          >
        </div>

        <nav id="app-nav-container" class="hidden md:flex items-center gap-2 ml-2 relative h-full">
          ${isAdminPage ? `
          <button id="nav-btn-admin-panel" class="nav-link ${currentPage === 'admin' ? 'active' : ''}">
            Painel Administrativo
          </button>
          <button id="nav-btn-admin-subscriptions" class="nav-link ${currentPage === 'admin-subscriptions' ? 'active' : ''}">
            Painel de controles do sistema
          </button>
          <button id="nav-btn-admin-abandoned-carts" class="nav-link ${currentPage === 'admin-abandoned-carts' ? 'active' : ''}">
            Carrinhos Abandonados
          </button>
          <button id="nav-btn-admin-updates" class="nav-link ${currentPage === 'admin-updates' ? 'active' : ''}">
            Atualizações
          </button>
          ` : `
          <button id="nav-btn-dashboard" class="nav-link ${sessionStorage.getItem('currentPage') === 'dashboard' ? 'active' : ''}">
            Visão Geral
          </button>

          <button id="nav-btn-transactions" class="nav-link group">
            Transações
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-40 group-hover:opacity-80 transition-opacity">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </button>

          <button id="nav-btn-recorrencias" class="nav-link group ${sessionStorage.getItem('currentPage') === 'subscriptions' ? 'active' : ''}">
            Recorrências
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="opacity-40 group-hover:opacity-80 transition-opacity">
              <path d="m6 9 6 6 6-6"></path>
            </svg>
          </button>

          <button id="nav-btn-banks" class="nav-link ${sessionStorage.getItem('currentPage') === 'connected-banks' ? 'active' : ''}">
            Bancos Conectados
          </button>

          <button id="nav-btn-patrimony" class="nav-link ${sessionStorage.getItem('currentPage') === 'patrimony' ? 'active' : ''}">
            Patrimônio
          </button>

          ${NavSharedDropdown()}
          `}
        </nav>

        <button id="mobile-menu-btn" class="md:hidden">
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      <div class="flex items-center gap-2.5 relative h-full">

        <div id="sync-progress-container" class="hidden items-center gap-3 px-3 py-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full mr-2">
          <div class="flex items-center justify-center w-5 h-5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-hover)] shrink-0 overflow-hidden" id="sync-bank-logo-container">
            <lottie-player src="/assets/lottie/sincronizar.json" background="transparent" speed="1" loop autoplay style="width: 14px; height: 14px;"></lottie-player>
          </div>
          <div class="flex flex-col min-w-[100px] max-w-[150px]">
            <div class="flex justify-between items-end mb-1">
              <span id="sync-progress-text" class="text-[10px] font-medium text-[var(--color-text-secondary)] whitespace-nowrap overflow-hidden text-ellipsis">Sincronizando...</span>
              <span id="sync-progress-percent" class="text-[9px] text-[var(--color-text-secondary)]">0%</span>
            </div>
            <div class="w-full bg-[var(--color-surface-hover)] rounded-full h-1">
              <div id="sync-progress-bar" class="bg-[#D97757] h-1 rounded-full transition-all duration-300 ease-out" style="width: 0%"></div>
            </div>
          </div>
        </div>

        <div id="topbar-avatar-container" class="cursor-pointer relative z-10">
          <div
            id="react-avatar-root"
            data-value="${avatarValue}"
            class="w-9 h-9 rounded-full flex items-center justify-center pointer-events-none ring-1 ring-white/10"
            style="filter: saturate(0.6) brightness(1.1);"
          ></div>
        </div>

        ${UserDropdown({ items: dropdownItems })}
      </div>

    </header>

    <div id="mobile-menu" class="md:hidden">
      <div class="mobile-menu-content">
        <div class="mobile-menu-section">
          ${isAdminPage ? `
          <button id="mobile-nav-admin-panel" class="mobile-nav-link ${currentPage === 'admin' ? 'active' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Painel Administrativo
          </button>
          <button id="mobile-nav-admin-subscriptions" class="mobile-nav-link ${currentPage === 'admin-subscriptions' ? 'active' : ''}">
            <lottie-player src="${isLight ? '/lottie/assinaturapreto.json' : '/lottie/assinaturabranco.json'}" background="transparent" speed="1.2" style="width: 20px; height: 20px;" data-lottie="admin-subscriptions" data-lottie-dark="/lottie/assinaturabranco.json" data-lottie-light="/lottie/assinaturapreto.json"></lottie-player>
            Painel de controles do sistema
          </button>
          <button id="mobile-nav-admin-abandoned-carts" class="mobile-nav-link ${currentPage === 'admin-abandoned-carts' ? 'active' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            Carrinhos Abandonados
          </button>
          <button id="mobile-nav-admin-updates" class="mobile-nav-link ${currentPage === 'admin-updates' ? 'active' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            Atualizações
          </button>
          ` : `
          <button id="mobile-nav-dashboard" class="mobile-nav-link ${sessionStorage.getItem('currentPage') === 'dashboard' ? 'active' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Visão Geral
          </button>
          <button id="mobile-nav-transactions" class="mobile-nav-link">
            <lottie-player src="${isLight ? '/lottie/carteirapreto.json' : '/lottie/carteirabranca.json'}" background="transparent" speed="1.2" style="width: 20px; height: 20px;" data-lottie="transactions" data-lottie-dark="/lottie/carteirabranca.json" data-lottie-light="/lottie/carteirapreto.json"></lottie-player>
            Movimentações
          </button>

          <button id="mobile-nav-credito" class="mobile-nav-link">
            <lottie-player src="${isLight ? '/lottie/cartaopreto.json' : '/lottie/cartaobranco.json'}" background="transparent" speed="1.2" style="width: 20px; height: 20px;" data-lottie="credito" data-lottie-dark="/lottie/cartaobranco.json" data-lottie-light="/lottie/cartaopreto.json"></lottie-player>
            Cartão de Crédito
          </button>

          <button id="mobile-nav-categorias" class="mobile-nav-link">
            <lottie-player src="${isLight ? '/lottie/engrenagempreto.json' : '/lottie/engrenagem.json'}" background="transparent" speed="1.2" style="width: 20px; height: 20px;" data-lottie="categorias" data-lottie-dark="/lottie/engrenagem.json" data-lottie-light="/lottie/engrenagempreto.json"></lottie-player>
            Gestão de Categorias
          </button>
        </div>

        <div class="mobile-menu-section">
          <button id="mobile-nav-lembretes" class="mobile-nav-link">
            <lottie-player src="${isLight ? '/lottie/lembretepreto.json' : '/lottie/lembretebranco.json'}" background="transparent" speed="1.2" style="width: 20px; height: 20px;" data-lottie="lembretes" data-lottie-dark="/lottie/lembretebranco.json" data-lottie-light="/lottie/lembretepreto.json"></lottie-player>
            Lembretes
          </button>

          <button id="mobile-nav-subscriptions" class="mobile-nav-link ${sessionStorage.getItem('currentPage') === 'subscriptions' ? 'active' : ''}">
            <lottie-player src="${isLight ? '/lottie/assinaturapreto.json' : '/lottie/assinaturabranco.json'}" background="transparent" speed="1.2" style="width: 20px; height: 20px;" data-lottie="subscriptions" data-lottie-dark="/lottie/assinaturabranco.json" data-lottie-light="/lottie/assinaturapreto.json"></lottie-player>
            Assinaturas
          </button>
        </div>

        <div class="mobile-menu-section">
          <button id="mobile-nav-banks" class="mobile-nav-link ${sessionStorage.getItem('currentPage') === 'connected-banks' ? 'active' : ''}">
            <lottie-player src="${isLight ? '/lottie/bancopreto.json' : '/lottie/banco.json'}" background="transparent" speed="1.2" style="width: 20px; height: 20px;" data-lottie="banks" data-lottie-dark="/lottie/banco.json" data-lottie-light="/lottie/bancopreto.json"></lottie-player>
            Bancos Conectados
          </button>

          <button id="mobile-nav-patrimony" class="mobile-nav-link ${sessionStorage.getItem('currentPage') === 'patrimony' ? 'active' : ''}">
            <lottie-player src="${isLight ? '/lottie/caixinhaspreto.json' : '/lottie/caixinhas.json'}" background="transparent" speed="1.2" style="width: 20px; height: 20px;" data-lottie="patrimony" data-lottie-dark="/lottie/caixinhas.json" data-lottie-light="/lottie/caixinhaspreto.json"></lottie-player>
            Patrimônio
          </button>


          <button id="mobile-nav-updates" class="mobile-nav-link ${sessionStorage.getItem('currentPage') === 'updates' ? 'active' : ''}">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            O que há de novo
          </button>
          `}
        </div>
      </div>
    </div>

  ${isAdminUser && currentPage !== 'admin-automation' ? `
  <button id="coin-fab-btn" style="
    position: fixed;
    bottom: 28px;
    right: 28px;
    border: none;
    background: transparent;
    box-shadow: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 0;
  ">
    <img src="${coinImg}" alt="Automação" style="width: 48px; height: 48px; object-fit: contain;" />
  </button>
  ` : ''}
  `;
}

export function attachHeaderListeners() {
  const logoutBtn = document.getElementById('logout-btn-dropdown');
  const avatarRootEl = document.getElementById('react-avatar-root');
  const navDashboard = document.getElementById('nav-btn-dashboard');
  const headerLogo = document.getElementById('header-logo-wrapper');
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  // Adiciona listeners extras para as rotas admin
  const navAdminPanel = document.getElementById('nav-btn-admin-panel');
  if (navAdminPanel) navAdminPanel.addEventListener('click', () => window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin' } })));

  const navAdminSubs = document.getElementById('nav-btn-admin-subscriptions');
  if (navAdminSubs) navAdminSubs.addEventListener('click', () => window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin-subscriptions' } })));

  const navAdminAbandoned = document.getElementById('nav-btn-admin-abandoned-carts');
  if (navAdminAbandoned) navAdminAbandoned.addEventListener('click', () => window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin-abandoned-carts' } })));

  const navAdminUpdates = document.getElementById('nav-btn-admin-updates');
  if (navAdminUpdates) navAdminUpdates.addEventListener('click', () => window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin-updates' } })));

  const coinFabBtn = document.getElementById('coin-fab-btn');
  if (coinFabBtn) coinFabBtn.addEventListener('click', () => window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin-automation' } })));

  const mobNavAdminPanel = document.getElementById('mobile-nav-admin-panel');
  if (mobNavAdminPanel) {
    mobNavAdminPanel.addEventListener('click', () => {
      mobileMenu?.classList.remove('active');
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin' } }));
    });
  }

  const mobNavAdminSubs = document.getElementById('mobile-nav-admin-subscriptions');
  if (mobNavAdminSubs) {
    mobNavAdminSubs.addEventListener('click', () => {
      mobileMenu?.classList.remove('active');
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin-subscriptions' } }));
    });
  }

  const mobNavAdminAbandoned = document.getElementById('mobile-nav-admin-abandoned-carts');
  if (mobNavAdminAbandoned) {
    mobNavAdminAbandoned.addEventListener('click', () => {
      mobileMenu?.classList.remove('active');
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin-abandoned-carts' } }));
    });
  }

  const mobNavAdminUpdates = document.getElementById('mobile-nav-admin-updates');
  if (mobNavAdminUpdates) {
    mobNavAdminUpdates.addEventListener('click', () => {
      mobileMenu?.classList.remove('active');
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin-updates' } }));
    });
  }

  // ── Logo Navigation ────────────────────────────────────────────────────────
  if (headerLogo) {
    headerLogo.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'dashboard', tab: 'overview' } }));
    });
  }

  // ── Mount React avatar ──────────────────────────────────────────────────────
  if (avatarRootEl && !avatarRootEl.dataset.mounted) {
    avatarRootEl.dataset.mounted = 'true';
    const value = avatarRootEl.getAttribute('data-value') || 'tim@apple.com';
    const root = createRoot(avatarRootEl);
    root.render(createElement(Avvvatars, { value, size: 36, style: 'shape' }));
  }

  // ── Navigation Listeners ────────────────────────────────────────────────────
  if (navDashboard) {
    navDashboard.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'dashboard', tab: 'overview' } }));
    });
  }

  const navBanks = document.getElementById('nav-btn-banks');
  if (navBanks) {
    navBanks.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'connected-banks' } }));
    });
  }

  const navPatrimony = document.getElementById('nav-btn-patrimony');
  if (navPatrimony) {
    navPatrimony.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'patrimony' } }));
    });
  }

  // ── Shared Nav Dropdown ────────────────────────────────────────────────────
  const navConfig: NavDropdownConfig = {
    'nav-btn-transactions': {
      items: [
        {
          id: 'nav-btn-movimentacoes',
          label: 'Movimentações',
          lottieDark: '/lottie/carteirabranca.json',
          lottieLight: '/lottie/carteirapreto.json',
          onClick: () => window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'transactions' } }))
        },
        {
          id: 'nav-btn-credito',
          label: 'Cartão de Crédito',
          lottieDark: '/lottie/cartaobranco.json',
          lottieLight: '/lottie/cartaopreto.json',
          onClick: () => window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'credit-cards' } }))
        },
        {
          id: 'nav-btn-categorias',
          label: 'Gestão de Categorias',
          lottieDark: '/lottie/engrenagem.json',
          lottieLight: '/lottie/engrenagempreto.json',
          onClick: () => window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'categories' } }))
        }
      ]
    },
    'nav-btn-recorrencias': {
      items: [
        {
          id: 'nav-btn-lembretes',
          label: 'Lembretes',
          lottieDark: '/lottie/lembretebranco.json',
          lottieLight: '/lottie/lembretepreto.json',
          onClick: () => window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'reminders' } }))
        },
        {
          id: 'nav-btn-assinaturas',
          label: 'Assinaturas',
          lottieDark: '/lottie/assinaturabranco.json',
          lottieLight: '/lottie/assinaturapreto.json',
          onClick: () => window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'subscriptions' } }))
        }
      ]
    }
  };

  attachNavSharedDropdownListeners('app-nav-container', navConfig);

  // ── Mobile Lottie Theme Update ──────────────────────────────────────────────
  const updateMobileLotties = (theme: string) => {
    const isLightTheme = theme === 'light';
    document.querySelectorAll<HTMLElement>('#mobile-menu lottie-player[data-lottie-dark]').forEach(player => {
      const dark = player.getAttribute('data-lottie-dark');
      const light = player.getAttribute('data-lottie-light');
      const newSrc = isLightTheme ? light : dark;
      if (newSrc && player.getAttribute('src') !== newSrc) {
        player.setAttribute('src', newSrc);
      }
    });
  };

  themeManager.subscribe((theme) => updateMobileLotties(theme));

  // ── Dropdown (abstracted) ───────────────────────────────────────────────────
  attachDropdownListeners();

  // ── Theme Switcher (animated component) ─────────────────────────────────────
  attachThemeSwitcherListeners('theme-toggle-dropdown');

  // ── Mobile Menu Toggle ──────────────────────────────────────────────────────
  if (mobileMenuBtn && mobileMenu) {
    let menuOpen = false;

    mobileMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();

      if (menuOpen) {
        // Fechar menu
        menuOpen = false;
        animateMobileMenuClose('mobile-menu', 'mobile-menu-content', mobileMenuBtn);
        mobileMenuBtn.classList.remove('active');
      } else {
        // Abrir menu
        closeAllGenericDropdowns();
        menuOpen = true;
        mobileMenuBtn.classList.add('active');
        animateMobileMenuOpen('mobile-menu', 'mobile-menu-content', mobileMenuBtn);
        // Play lottie animations when menu opens
        playMobileMenuLotties();
      }
    });

    // Close menu when a navigation item is clicked
    const closeMenu = () => {
      menuOpen = false;
      animateMobileMenuClose('mobile-menu', 'mobile-menu-content', mobileMenuBtn);
      mobileMenuBtn.classList.remove('active');
      stopMobileMenuLotties();
    };

    // Close mobile menu when avatar is clicked to open dropdown
    const avatarContainer = document.getElementById('topbar-avatar-container');
    if (avatarContainer) {
      avatarContainer.addEventListener('click', () => {
        if (menuOpen) closeMenu();
      });
    }

    // Mobile navigation listeners
    const mobileDashboard = document.getElementById('mobile-nav-dashboard');
    if (mobileDashboard) {
      mobileDashboard.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'dashboard', tab: 'overview' } }));
        closeMenu();
      });
    }

    const mobileTransactions = document.getElementById('mobile-nav-transactions');
    if (mobileTransactions) {
      mobileTransactions.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'transactions' } }));
        closeMenu();
      });
    }

    const mobileCredito = document.getElementById('mobile-nav-credito');
    if (mobileCredito) {
      mobileCredito.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'credit-cards' } }));
        closeMenu();
      });
    }

    const mobileCategorias = document.getElementById('mobile-nav-categorias');
    if (mobileCategorias) {
      mobileCategorias.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'categories' } }));
        closeMenu();
      });
    }

    const mobileLembretes = document.getElementById('mobile-nav-lembretes');
    if (mobileLembretes) {
      mobileLembretes.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'reminders' } }));
        closeMenu();
      });
    }

    const mobileSubscriptions = document.getElementById('mobile-nav-subscriptions');
    if (mobileSubscriptions) {
      mobileSubscriptions.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'subscriptions' } }));
        closeMenu();
      });
    }

    const mobileBanks = document.getElementById('mobile-nav-banks');
    if (mobileBanks) {
      mobileBanks.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'connected-banks' } }));
        closeMenu();
      });
    }

    const mobilePatrimony = document.getElementById('mobile-nav-patrimony');
    if (mobilePatrimony) {
      mobilePatrimony.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'patrimony' } }));
        closeMenu();
      });
    }

    const mobileUpdates = document.getElementById('mobile-nav-updates');
    if (mobileUpdates) {
      mobileUpdates.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'updates' } }));
        closeMenu();
      });
    }

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (menuOpen &&
        !mobileMenu.contains(e.target as Node) &&
        !mobileMenuBtn.contains(e.target as Node)) {
        closeMenu();
      }
    });
  }

  // ── Logout ──────────────────────────────────────────────────────────────────
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        sessionStorage.clear();
        toaster.create({
          title: 'Sessão encerrada',
          description: 'Até a próxima!',
          type: 'success'
        });
      } catch {
        toaster.create({
          title: 'Erro',
          description: 'Problema ao desconectar.',
          type: 'error'
        });
      }
    });
  }

  // ── Suporte ─────────────────────────────────────────────────────────────────
  const supportBtn = document.getElementById('support-btn-dropdown');
  if (supportBtn) {
    supportBtn.addEventListener('click', () => openSupportModal());
  }

  // ── Navigation (Profile) ────────────────────────────────────────────────────
  const profileBtn = document.getElementById('profile-btn-dropdown');

  if (profileBtn) {
    profileBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'settings', tab: 'profile' } }));
    });
  }

  const updatesBtn = document.getElementById('updates-btn-dropdown');
  if (updatesBtn) {
    updatesBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'updates' } }));
    });
  }

  const adminBtn = document.getElementById('admin-btn-dropdown');
  if (adminBtn) {
    adminBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'admin' } }));
    });
  }

  const exitAdminBtn = document.getElementById('exit-admin-btn-dropdown');
  if (exitAdminBtn) {
    exitAdminBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'dashboard' } }));
    });
  }

  // ── Sync SSE Listener ──────────────────────────────────────────────────────
  const user = auth.currentUser;
  if (user && !syncEventSource) {
    setupSyncSSE(user.uid);
  }
}

function setupSyncSSE(userId: string) {
  if (syncEventSource) return;

  syncEventSource = new EventSource(`${API_BASE_URL}/api/pluggy/events?userId=${userId}`);

  syncEventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const container = document.getElementById('sync-progress-container');
      const text = document.getElementById('sync-progress-text');
      const percent = document.getElementById('sync-progress-percent');
      const bar = document.getElementById('sync-progress-bar');
      const logoContainer = document.getElementById('sync-bank-logo-container');

      if (!container || !text || !percent || !bar) return;

      container.classList.remove('hidden');
      container.classList.add('flex');

      if (data.imageUrl && logoContainer) {
        logoContainer.innerHTML = `<img src="${data.imageUrl}" class="w-3.5 h-3.5 object-contain" />`;
      }

      if (data.progress !== undefined) {
        percent.textContent = `${data.progress}%`;
        bar.style.width = `${data.progress}%`;
      }
      if (data.message) {
        text.textContent = data.message;
      }

      if (data.step === 'FINALIZADO' || data.step === 'ERRO') {
        if (data.step === 'FINALIZADO') {
          // Opcional: Trigger refresh via evento
          window.dispatchEvent(new CustomEvent('app-sync-completed'));
        }

        setTimeout(() => {
          container.classList.add('animate-fadeout');
          setTimeout(() => {
            container.classList.add('hidden');
            container.classList.remove('flex', 'animate-fadeout');
          }, 400);
        }, 3000);
      }
    } catch (e) {
      console.error('SSE Error parsing data:', e);
    }
  };

  syncEventSource.onerror = () => {
    syncEventSource?.close();
    syncEventSource = null;
    // Tenta reconectar após 10s
    setTimeout(() => {
      const user = auth.currentUser;
      if (user) setupSyncSSE(user.uid);
    }, 10000);
  };
}

// ── Mobile Menu Liquid Animation ────────────────────────────────────────────────
function animateMobileMenuOpen(menuId: string, contentId: string, originElement?: HTMLElement): void {
  const menu = document.getElementById(menuId);
  const content = document.getElementById(contentId);

  if (!menu) return;

  // Pegamos todos os links e títulos para animar em cascata
  const links = menu.querySelectorAll('.mobile-nav-link, .mobile-menu-title');

  gsap.killTweensOf([menu, content, links]);

  // Calcula a posição exata do ícone em porcentagem (viewport) para o clip-path
  let originX = '50%';
  let originY = '33px';

  if (originElement) {
    const rect = originElement.getBoundingClientRect();
    originX = `${((rect.left + rect.width / 2) / window.innerWidth) * 100}%`;
    originY = `${((rect.top + rect.height / 2) / window.innerHeight) * 100}%`;
  }

  // Reset inicial: Esconde o menu num círculo minúsculo no centro do ícone
  gsap.set(menu, {
    visibility: 'visible',
    opacity: 1,
    clipPath: `circle(0% at ${originX} ${originY})`,
    backgroundColor: 'var(--color-background)',
    clearProps: 'transform',
  });

  const tl = gsap.timeline();

  // ── FASE 1: Liquid Morphing (Expansão do círculo) ──
  tl.to(menu, {
    clipPath: `circle(150% at ${originX} ${originY})`,
    duration: 0.7,
    ease: 'power3.inOut',
  }, 0);

  // ── FASE 2: Squash and Stretch do conteúdo ──
  if (content) {
    gsap.set(content, { scaleY: 1.1, scaleX: 0.95, y: 30, opacity: 0 });
    tl.to(content, {
      scaleY: 1,
      scaleX: 1,
      y: 0,
      opacity: 1,
      duration: 0.8,
      ease: 'elastic.out(1.2, 0.5)',
      clearProps: 'transform',
    }, "-=0.5");
  }

  // ── FASE 3: Elastic Overshoot em cascata nos links ──
  if (links.length) {
    gsap.set(links, { y: 25, opacity: 0 });
    tl.to(links, {
      y: 0,
      opacity: 1,
      duration: 0.6,
      stagger: 0.04,
      ease: 'back.out(1.5)',
    }, "-=0.7");
  }
}

function playMobileMenuLotties(): void {
  const menu = document.getElementById('mobile-menu');
  if (!menu) return;

  stopMobileMenuLotties();

  const lottieElements = menu.querySelectorAll<any>('lottie-player');
  lottieElements.forEach((lottie, index) => {
    if (lottie && typeof lottie.play === 'function') {
      // Remove loop attribute (presence of attribute = loop enabled)
      lottie.removeAttribute('loop');

      // Play once with stagger on open
      setTimeout(() => {
        if (typeof lottie.stop === 'function') lottie.stop();
        lottie.play();
      }, index * 60);

      // Replay every 3 seconds with stagger
      const intervalId = setInterval(() => {
        setTimeout(() => {
          if (typeof lottie.stop === 'function') lottie.stop();
          lottie.play();
        }, index * 60);
      }, 3000);

      mobileMenuLottieIntervals.push(intervalId);
    }
  });
}

function stopMobileMenuLotties(): void {
  mobileMenuLottieIntervals.forEach(id => clearInterval(id));
  mobileMenuLottieIntervals = [];
}

function animateMobileMenuClose(menuId: string, contentId: string, originElement?: HTMLElement): void {
  const menu = document.getElementById(menuId);
  if (!menu) return;

  const content = document.getElementById(contentId);
  const links = menu.querySelectorAll('.mobile-nav-link, .mobile-menu-title');

  gsap.killTweensOf([menu, content, links]);

  let originX = '50%';
  let originY = '33px';

  if (originElement) {
    const rect = originElement.getBoundingClientRect();
    originX = `${((rect.left + rect.width / 2) / window.innerWidth) * 100}%`;
    originY = `${((rect.top + rect.height / 2) / window.innerHeight) * 100}%`;
  }

  const tl = gsap.timeline({
    onComplete: () => {
      // Separar os sets garante que a visibilidade não seja anulada pelo clearProps
      if (links.length) gsap.set(links, { clearProps: 'all' });
      if (content) gsap.set(content, { clearProps: 'all' });
      gsap.set(menu, { clearProps: 'all' });
      gsap.set(menu, { visibility: 'hidden' });
    }
  });

  // ── FASE 1: Esconde o conteúdo e links em cascata reversa ──
  if (links.length) {
    tl.to(links, {
      y: -15,
      opacity: 0,
      duration: 0.25,
      stagger: -0.02,
      ease: 'power2.in',
    }, 0);
  }

  if (content) {
    tl.to(content, {
      scaleY: 1.05,
      scaleX: 0.95,
      y: -20,
      opacity: 0,
      duration: 0.3,
      ease: 'power2.in',
    }, 0);
  }

  // ── FASE 2: Contração líquida sendo "sugada" de volta pro ícone ──
  tl.to(menu, {
    clipPath: `circle(0% at ${originX} ${originY})`,
    duration: 0.5,
    ease: 'power3.inOut',
  }, "-=0.2");
}