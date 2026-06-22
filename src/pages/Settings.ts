import { Header, attachHeaderListeners } from '../components/Header';
import gsap from 'gsap';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { renderDashboard } from './Dashboard';
import { ProfileTab, attachProfileListeners } from './configuracoes/ProfileTab';
import { SecurityTab, attachSecurityListeners } from './configuracoes/SecurityTab';
import { PlanTab, attachPlanListeners } from './configuracoes/PlanTab';
import { FinanceiroTab, attachFinanceiroListeners, resetFinanceiroSession, isFinanceiroSaving } from './configuracoes/FinanceiroTab';
import type { UserSession } from '../lib/sessions';
import { subscribeToSessions } from '../lib/sessions';
import { db } from '../lib/firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { syncStripeSubscription, syncAsaasSubscription } from '../lib/stripe';

export function renderSettings(user: any, initialTab: 'profile' | 'security' | 'plan' | 'financeiro' = 'profile') {
  const app = document.querySelector<HTMLDivElement>('#app')!;

  // Garante que dados do Firestore sempre sejam carregados nesta nova sessão de Settings
  resetFinanceiroSession();

  let activeTab = initialTab;
  let userData: any = null;
  let invoices: any[] = [];
  let sessions: UserSession[] = [];
  let isFirstRender = true;
  let planSynced = false;
  let lastInvoiceCount = 0;
  let autoSyncInterval: ReturnType<typeof setTimeout> | null = null;
  let updateViewTimeout: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_DELAY = 150; // ms - evita múltiplos re-renders rápidos

  const triggerPlanSync = async () => {
    if (planSynced) return;

    const isAsaasUser = Boolean(
      userData?.subscription?.provider === 'asaas' ||
      userData?.subscription?.asaasSubscriptionId ||
      userData?.subscription?.asaasCustomerId ||
      userData?.asaasSubscriptionId ||
      userData?.asaasCustomerId
    );
    const isStripeUser = Boolean(userData?.subscription?.stripeCustomerId);

    if (!isAsaasUser && !isStripeUser) return;

    planSynced = true;
    try {
      if (isAsaasUser) {
        console.log('[Settings] Syncing subscription from Asaas...');
        await syncAsaasSubscription();
        console.log('[Settings] Asaas subscription synced successfully.');
      } else {
        console.log('[Settings] Syncing subscription from Stripe...');
        await syncStripeSubscription();
        console.log('[Settings] Stripe subscription synced successfully.');
      }
    } catch (err: any) {
      console.warn('[Settings] Sync subscription failed:', err.message);
      planSynced = false; // allow retry on next tab switch
    }
  };

  // Auto-sync when new invoices are detected
  const detectAndSyncNewInvoices = async () => {
    if (activeTab !== 'plan') return;
    if (!userData?.subscription?.stripeCustomerId) return;

    const currentInvoiceCount = invoices.length;
    if (currentInvoiceCount > lastInvoiceCount) {
      console.log(`[Settings] Nova fatura detectada! (${lastInvoiceCount} → ${currentInvoiceCount}). Sincronizando...`);
      lastInvoiceCount = currentInvoiceCount;
      planSynced = false;
      await triggerPlanSync();
    }
  };

  // Listen to Firestore user data
  const unsubFirestore = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
    if (docSnap.exists()) {
      userData = docSnap.data();
      // Não re-renderiza a aba financeiro se acabou de salvar (evita sobrescrever dados)
      if (activeTab === 'financeiro' && isFinanceiroSaving()) {
        return;
      }
      updateView();
    } else {
      userData = { uid: user.uid, email: user.email };
      updateView();
    }
  });

  const unsubInvoices = onSnapshot(collection(db, `users/${user.uid}/invoices`), (snapshot: any) => {
    invoices = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    updateView();
  });

  const unsubSessions = subscribeToSessions(user.uid, (data) => {
    sessions = data;
    updateView();
  });

  const updateView = () => {
    // Debounce para evitar múltiplas renderizações rápidas (causa "piscadas")
    if (updateViewTimeout) clearTimeout(updateViewTimeout);
    updateViewTimeout = setTimeout(() => {
      performUpdate();
    }, DEBOUNCE_DELAY);
  };

  const handleReRender = () => updateView();
  window.addEventListener('re-render-settings', handleReRender);

  const renderContent = () => {
    if (activeTab === 'profile') {
      if (autoSyncInterval) clearInterval(autoSyncInterval);
      return ProfileTab(userData || user);
    }
    if (activeTab === 'security') {
      if (autoSyncInterval) clearInterval(autoSyncInterval);
      return SecurityTab(userData, sessions);
    }
    if (activeTab === 'plan') {
      triggerPlanSync();
      lastInvoiceCount = invoices.length;

      // Auto-sync a cada 15 segundos quando na aba de plano
      if (autoSyncInterval) clearInterval(autoSyncInterval);
      autoSyncInterval = setInterval(detectAndSyncNewInvoices, 15000);

      return PlanTab({ ...userData, invoices: invoices.length > 0 ? invoices : (userData?.invoices || []) });
    }
    if (activeTab === 'financeiro') {
      if (autoSyncInterval) clearInterval(autoSyncInterval);
      return FinanceiroTab(userData || user);
    }
    return '';
  };

  const animateActivePill = (instant: boolean) => {
    const activeBtn = document.querySelector(`.sidebar-tab.active`) as HTMLElement;
    const pill = document.getElementById('active-tab-pill');
    if (!activeBtn || !pill) return;

    const isMobile = window.innerWidth < 768;
    const NAVPAD = 6;

    if (isMobile) {
      gsap.to(pill, {
        display: 'block',
        left: activeBtn.offsetLeft + NAVPAD,
        right: 'auto',
        top: NAVPAD,
        y: 0,
        x: 0,
        width: activeBtn.offsetWidth,
        height: activeBtn.offsetHeight,
        duration: instant ? 0 : 0.45,
        ease: 'expo.out'
      });
    } else {
      gsap.to(pill, {
        display: 'block',
        left: NAVPAD,
        right: NAVPAD,
        top: 0,
        y: activeBtn.offsetTop + NAVPAD,
        x: 0,
        width: 'auto',
        height: activeBtn.offsetHeight,
        duration: instant ? 0 : 0.45,
        ease: 'expo.out'
      });
    }
  };

  const performUpdate = () => {
    const settingsShell = document.getElementById('settings-shell');
    if (settingsShell) {
      const content = document.getElementById('settings-content-wrapper');
      if (content) content.innerHTML = renderContent();

      document.querySelectorAll('.sidebar-tab').forEach(btn => {
        if (btn.getAttribute('data-tab') === activeTab) {
          btn.classList.add('active');
          btn.classList.remove('text-[var(--color-text-secondary)]', 'hover:text-[var(--color-text)]');
        } else {
          btn.classList.remove('active');
          btn.classList.add('text-[var(--color-text-secondary)]', 'hover:text-[var(--color-text)]');
        }
      });

      animateActivePill(false);
      attachContentListeners();
      return;
    }

    app.innerHTML = `
      <style>
        @keyframes fadein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fadein { animation: fadein 0.25s ease forwards; }
        .sidebar-tab.active { color: var(--color-text); font-weight: 600; }
        .active-pill { position: absolute; background: var(--color-surface-hover); border-radius: 11px; pointer-events: none; z-index: 0; }
        #settings-nav { scrollbar-width: none; -ms-overflow-style: none; }
        #settings-nav::-webkit-scrollbar { display: none; }
      </style>

      <div id="settings-shell" class="min-h-screen text-[var(--color-text)] flex flex-col relative overflow-x-hidden">
        ${BrilhoHeader()}
        ${Header({ user })}

        <main class="flex-1 w-full max-w-5xl mx-auto px-3 sm:px-6 md:px-12 pt-20 md:pt-28 pb-10 flex flex-col md:flex-row items-start gap-4 md:gap-6 relative z-10">
          <aside class="w-full md:w-56 shrink-0 flex flex-col gap-1">
            <button id="btn-back-dashboard" class="sidebar-item flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors mb-3 md:mb-5 text-[12px] font-medium tracking-wide group">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="group-hover:-translate-x-0.5 transition-transform">
                <path d="M19 12H5"></path><polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Voltar ao painel
            </button>

            <nav id="settings-nav" class="relative p-1.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[20px] shadow-2xl overflow-x-auto md:overflow-visible">
              <div id="active-tab-pill" class="active-pill" style="display: none;"></div>
              <ul class="flex flex-row md:flex-col gap-0.5 relative z-10 m-0 p-0 list-none">
                <li class="shrink-0 md:shrink-[unset]"><button id="tab-profile" class="sidebar-item sidebar-tab md:w-full flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-[13px] font-medium transition-all duration-150 text-left whitespace-nowrap ${activeTab === 'profile' ? 'active' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}" data-tab="profile">Meu Perfil</button></li>
                <li class="shrink-0 md:shrink-[unset]"><button id="tab-security" class="sidebar-item sidebar-tab md:w-full flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-[13px] font-medium transition-all duration-150 text-left whitespace-nowrap ${activeTab === 'security' ? 'active' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}" data-tab="security">Segurança</button></li>
                <li class="shrink-0 md:shrink-[unset]"><button id="tab-plan" class="sidebar-item sidebar-tab md:w-full flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-[13px] font-medium transition-all duration-150 text-left whitespace-nowrap ${activeTab === 'plan' ? 'active' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}" data-tab="plan">Meu Plano</button></li>
                <li class="shrink-0 md:shrink-[unset]"><button id="tab-financeiro" class="sidebar-item sidebar-tab md:w-full flex items-center gap-3 px-3 py-2.5 rounded-[11px] text-[13px] font-medium transition-all duration-150 text-left whitespace-nowrap ${activeTab === 'financeiro' ? 'active' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'}" data-tab="financeiro">Financeiro</button></li>
              </ul>
            </nav>
          </aside>

          <div id="settings-content-wrapper" class="flex-1 min-w-0 w-full">
            ${renderContent()}
          </div>
        </main>
      </div>
    `;

    if (isFirstRender) {
      const navContainer = document.getElementById('settings-nav');
      const items = document.querySelectorAll('.sidebar-item');
      if (navContainer && items.length > 0) {
        gsap.set(navContainer, { opacity: 1, scaleX: 0.18, scaleY: 0.06, y: -12, borderRadius: '100px', transformOrigin: 'top center' });
        gsap.set(items, { opacity: 0, y: 14, x: -6, scale: 0.92, filter: 'blur(8px)' });
        const tl = gsap.timeline({ onComplete: () => { isFirstRender = false; animateActivePill(true); } });
        tl.to(navContainer, { scaleX: 1, scaleY: 1, y: 0, borderRadius: '20px', duration: 0.65, ease: 'elastic.out(1.05, 0.68)' });
        tl.to(items, { opacity: 1, y: 0, x: 0, scale: 1, filter: 'blur(0px)', stagger: 0.048, duration: 0.55, ease: 'power4.out' }, '-=0.4');
      } else {
        isFirstRender = false;
      }
    }

    attachHeaderListeners();
    attachSidebarListeners();
    attachContentListeners();
  };

  const handleTabClick = (id: string, newTab: 'profile' | 'security' | 'plan' | 'financeiro') => {
    const btn = document.getElementById(id);
    if (!btn || activeTab === newTab) return;
    if (newTab === 'plan') planSynced = false; // re-sync every time user opens plan tab
    activeTab = newTab;
    updateView();
    gsap.to(btn, { scale: 0.96, duration: 0.1, yoyo: true, repeat: 1 });
  };

  const attachContentListeners = () => {
    if (activeTab === 'profile') attachProfileListeners(userData || user);
    else if (activeTab === 'security') attachSecurityListeners();
    else if (activeTab === 'plan') attachPlanListeners({ ...userData, invoices: invoices.length > 0 ? invoices : (userData?.invoices || []) });
    else if (activeTab === 'financeiro') attachFinanceiroListeners();
  };

  const attachSidebarListeners = () => {
    document.getElementById('btn-back-dashboard')?.addEventListener('click', () => {
      unsubFirestore(); unsubSessions(); unsubInvoices();
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { page: 'dashboard' } }));
    });

    document.getElementById('tab-profile')?.addEventListener('click', () => handleTabClick('tab-profile', 'profile'));
    document.getElementById('tab-security')?.addEventListener('click', () => handleTabClick('tab-security', 'security'));
    document.getElementById('tab-plan')?.addEventListener('click', () => handleTabClick('tab-plan', 'plan'));
    document.getElementById('tab-financeiro')?.addEventListener('click', () => handleTabClick('tab-financeiro', 'financeiro'));
  };

  window.addEventListener('app-navigate', () => {
    if (autoSyncInterval) clearInterval(autoSyncInterval);
    unsubFirestore(); unsubSessions(); unsubInvoices();
  }, { once: true });

  updateView();
}