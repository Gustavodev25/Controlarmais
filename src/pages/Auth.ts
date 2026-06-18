import gsap from 'gsap';
import { Input } from '../components/Input';
import { Button, setButtonLoading } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { toaster } from '../components/Toast';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { themeManager } from '../components/ThemeManager';
import { auth, db } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { renderPasswordRecovery } from './PasswordRecovery';
import { API_BASE } from '../lib/apiConfig';

interface AuthState {
  isLogin: boolean;
  signupData: {
    name: string;
    email: string;
    password: string;
    [key: string]: any;
  };
}

function getSignupDeviceInfo() {
  const userAgent = navigator.userAgent || '';
  const browserPlatform = navigator.platform || '';
  const hasTouchMac = /Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1;
  const isAndroid = /Android/i.test(userAgent);
  const isIos = /iPhone|iPad|iPod/i.test(userAgent) || hasTouchMac;
  const isMobile = isAndroid || isIos || /Mobile|Mobi/i.test(userAgent);
  const signupPlatform = isAndroid
    ? 'android'
    : isIos
      ? 'iphone'
      : isMobile
        ? 'mobile'
        : 'desktop';

  return {
    createdFromMobile: isMobile,
    signupSource: isMobile ? 'mobile' : 'desktop',
    signupPlatform,
    userAgent,
    browserPlatform,
  };
}

class AuthManager {
  private state: AuthState = {
    isLogin: true,
    signupData: { name: '', email: '', password: '' }
  };

  private animation: gsap.core.Timeline | null = null;

  constructor() {
    this.loadState();
  }

  private loadState() {
    const isLogin = sessionStorage.getItem('isLogin') !== 'false';
    const signupData = JSON.parse(sessionStorage.getItem('signupData') || '{"name":"","email":"","password":""}');

    this.state = { isLogin, signupData };
  }

  private saveState() {
    sessionStorage.setItem('isLogin', String(this.state.isLogin));
    sessionStorage.setItem('signupData', JSON.stringify(this.state.signupData));
  }

  showLogin() {
    this.state.isLogin = true;
    this.render();
  }

  showSignup() {
    this.state.isLogin = false;
    this.render();
  }

  clearState() {
    sessionStorage.removeItem('signupData');
  }

  getAuthHTML() {
    if (this.state.isLogin) {
      return this.getLoginHTML();
    } else {
      return this.getSignupHTML();
    }
  }

  private getLoginHTML() {
    return `
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-white mb-2">Acesse sua conta</h2>
        <p class="text-gray-400 text-xs leading-relaxed">Gerencie seu negócio com inteligência e precisão. Entre para continuar.</p>
      </div>
      <form id="auth-form" class="space-y-4">
        ${Input({ id: 'email', type: 'email', label: 'Email', required: true })}
        ${Input({ id: 'password', type: 'password', label: 'Senha', required: true })}

        <div class="flex items-center mt-6 mb-6">
          ${Checkbox({ id: 'remember', label: 'Lembrar de mim', checked: true })}
        </div>

        <div class="mt-2">
          ${Button({ text: 'Entrar', type: 'submit' })}
        </div>

        <div class="flex justify-between items-center mt-8 px-1">
          <a href="#" id="forgot-password" class="text-white/40 text-[10px] font-normal hover:text-[#D97757] transition-colors">Esqueceu a senha?</a>
          <a href="#" id="toggle-auth" class="text-white/60 text-[10px] font-normal hover:text-[#D97757] transition-colors text-right">Ainda não tem conta? <b>Criar uma conta</b></a>
        </div>
      </form>
    `;
  }

  private getSignupHTML() {
    return `
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-white mb-2">Crie sua conta</h2>
        <p class="text-gray-400 text-xs leading-relaxed">Antes, crie sua conta</p>
      </div>
      <form id="auth-form" class="space-y-4">
        ${Input({ id: 'name', type: 'text', label: 'Nome Completo', required: true, value: this.state.signupData.name })}
        ${Input({ id: 'email', type: 'email', label: 'Email', required: true, value: this.state.signupData.email })}
        ${Input({ id: 'password', type: 'password', label: 'Senha', required: true, value: this.state.signupData.password })}

        <div class="mt-2">
          ${Button({ text: 'Criar minha conta', type: 'submit' })}
        </div>
        <div class="flex justify-between items-center mt-6 gap-4">
          <div class="max-w-[200px]">
            ${Checkbox({ id: 'terms', label: 'Ao clicar em cadastrar, você concorda com nossos <a href="/termos-de-uso" target="_blank" rel="noopener noreferrer" class="text-white/60 underline hover:text-[#D97757]">termos de uso</a>.', required: true })}
          </div>
          <a href="#" id="toggle-auth" class="text-white/60 text-xs font-normal hover:text-[#D97757] transition-colors text-right shrink-0">Já tenho conta</a>
        </div>
      </form>
    `;
  }

  async changeAuthView() {
    const containerDiv = document.getElementById('dynamic-container');
    const contentDiv = document.getElementById('dynamic-content');
    if (!containerDiv || !contentDiv) return;

    if (this.animation) {
      this.animation.kill();
      this.animation = null;
    }

    // ─── CLOSE: apenas o conteúdo dissolve, card faz squish sutil ────────────
    await gsap.timeline()
      .to(contentDiv, {
        opacity: 0,
        filter: 'blur(6px)',
        y: -8,
        scale: 0.95,
        duration: 0.18,
        ease: 'power2.in',
      }, 0)
      .to(containerDiv, {
        scaleX: 1.014,
        scaleY: 0.974,
        duration: 0.18,
        ease: 'power2.in',
      }, 0);

    // ─── Troca conteúdo e mede nova altura ───────────────────────────────────
    const oldHeight = containerDiv.offsetHeight;

    contentDiv.style.visibility = 'hidden';
    contentDiv.innerHTML = this.getAuthHTML();

    containerDiv.style.height = 'auto';
    void containerDiv.offsetHeight;
    const newHeight = containerDiv.scrollHeight;
    containerDiv.style.height = `${oldHeight}px`;
    containerDiv.style.overflow = 'hidden';
    void containerDiv.offsetHeight;

    // Set initial GSAP states BEFORE restoring visibility to avoid one-frame flash
    gsap.set(contentDiv, { opacity: 0, filter: 'blur(6px)', y: 10, scale: 0.95 });

    const formItems = contentDiv.querySelectorAll('form > *');
    if (formItems.length > 0) {
      gsap.set(formItems, { opacity: 0, y: 6 });
    }

    contentDiv.style.visibility = '';

    // ─── OPEN: altura elástica, escala volta ao normal ────────────────────────
    const openTl = gsap.timeline({
      onComplete: () => {
        containerDiv.style.height = 'auto';
        containerDiv.style.overflow = 'hidden';
      },
    });

    openTl.to(containerDiv, {
      scaleX: 1,
      scaleY: 1,
      height: newHeight,
      boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
      duration: 0.75,
      ease: 'elastic.out(0.9, 0.52)',
    }, 0);

    openTl.to(contentDiv, {
      opacity: 1,
      filter: 'blur(0px)',
      y: 0,
      scale: 1,
      duration: 0.32,
      ease: 'power3.out',
      clearProps: 'opacity,filter,transform',
    }, 0.14);

    if (formItems.length > 0) {
      openTl.to(formItems, {
        opacity: 1,
        y: 0,
        duration: 0.24,
        stagger: 0.04,
        ease: 'power3.out',
        clearProps: 'opacity,transform',
      }, 0.2);
    }

    this.saveState();
    this.attachAuthListeners();
  }

  toggleAuth(e: Event) {
    e.preventDefault();
    this.state.isLogin = !this.state.isLogin;
    if (this.state.isLogin) {
      this.clearState();
    }
    this.changeAuthView();
  }

  private attachAuthListeners() {
    const toggleBtn = document.getElementById('toggle-auth');
    toggleBtn?.addEventListener('click', (e) => this.toggleAuth(e));

    const forgotPasswordBtn = document.getElementById('forgot-password');
    forgotPasswordBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      renderPasswordRecovery();
    });

    const submitBtn = document.querySelector<HTMLButtonElement>('#auth-form button[type="submit"]');
    if (submitBtn) this.setupAuthButtonMorph(submitBtn);

    // Password toggles
    const passwordToggles = document.querySelectorAll('.password-toggle');
    passwordToggles.forEach(btn => {
      const newBtn = btn.cloneNode(true) as HTMLButtonElement;
      btn.parentNode?.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', () => {
        const targetId = newBtn.getAttribute('data-target');
        if (targetId) {
          const input = document.getElementById(targetId) as HTMLInputElement;
          if (input) {
            const lottiePlayer = newBtn.querySelector('.eye-lottie') as any;
            if (input.type === 'password') {
              input.type = 'text';
              if (lottiePlayer) {
                lottiePlayer.setDirection(1);
                lottiePlayer.play();
              }
            } else {
              input.type = 'password';
              if (lottiePlayer) {
                lottiePlayer.setDirection(-1);
                lottiePlayer.play();
              }
            }
          }
        }
      });
    });

    // Form submission
    const form = document.getElementById('auth-form') as HTMLFormElement;
    form?.addEventListener('submit', (e) => this.handleFormSubmit(e));
  }

  private async handleFormSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    let keepSubmitButtonLoading = false;
    if (submitBtn) setButtonLoading(submitBtn, true);

    try {
      if (this.state.isLogin) {
        const emailInput = document.getElementById('email') as HTMLInputElement;
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        const rememberInput = document.getElementById('remember') as HTMLInputElement;

        const email = emailInput?.value;
        const password = passwordInput?.value;
        const remember = rememberInput?.checked ?? false;

        const persistenceType = remember ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistenceType);

        await signInWithEmailAndPassword(auth, email, password);
        toaster.create({ title: "Bem-vindo!", description: "Acesso autorizado.", type: "success" });
      } else {
        // Signup
        const nameInput = document.getElementById('name') as HTMLInputElement;
        const emailInput = document.getElementById('email') as HTMLInputElement;
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        const termsInput = document.getElementById('terms') as HTMLInputElement;

        if (!termsInput?.checked) throw new Error("Concorde com os termos.");

        const signupData = {
          name: nameInput.value,
          email: emailInput.value,
          password: passwordInput.value
        };

        sessionStorage.setItem('stripeSignupRedirectInProgress', '1');
        sessionStorage.setItem('stripeSignupSetupInProgress', '1');
        sessionStorage.setItem('stripeSignupInlineRedirectInProgress', '1');

        const userCredential = await createUserWithEmailAndPassword(auth, signupData.email, signupData.password);
        await updateProfile(userCredential.user, { displayName: signupData.name });

        const now = new Date().toISOString();
        const signupDevice = getSignupDeviceInfo();
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          id: userCredential.user.uid,
          uid: userCredential.user.uid,
          name: signupData.name,
          email: signupData.email,
          phone: null,
          createdAt: now,
          updatedAt: now,
          createdFromMobile: signupDevice.createdFromMobile,
          signupSource: signupDevice.signupSource,
          signupPlatform: signupDevice.signupPlatform,
          isAdmin: false,
          extraSyncCredits: 0,
          device: {
            createdFromMobile: signupDevice.createdFromMobile,
            signupSource: signupDevice.signupSource,
            signupPlatform: signupDevice.signupPlatform,
            userAgent: signupDevice.userAgent,
            browserPlatform: signupDevice.browserPlatform,
            capturedAt: now,
          },
          profile: {
            id: userCredential.user.uid,
            name: signupData.name,
            email: signupData.email,
            phone: null,
            address: {
              cep: null,
              street: null,
              neighborhood: null,
              city: null,
              state: null,
            }
          },
          subscription: {
            provider: 'stripe',
            plan: 'free',
            status: 'pending',
            billingCycle: 'mensal',
            price: '35,90',
            autoRenew: true,
            cancelAtPeriodEnd: false,
          },
          invoices: [],
        }, { merge: true });



        keepSubmitButtonLoading = true;
        window.dispatchEvent(new CustomEvent('auth-complete', {
          detail: { signupData }
        }));
      }
    } catch (error: any) {
      sessionStorage.removeItem('stripeSignupRedirectInProgress');
      sessionStorage.removeItem('stripeSignupSetupInProgress');
      sessionStorage.removeItem('stripeSignupInlineRedirectInProgress');
      let errorMsg = error.message || "Erro na tentativa de acesso.";
      if (error.code === 'auth/invalid-credential') errorMsg = "Email ou senha incorretos.";
      else if (error.code === 'auth/email-already-in-use') errorMsg = "Email já cadastrado.";
      else if (error.code === 'auth/weak-password') errorMsg = "A senha deve ter pelo menos 6 caracteres.";

      toaster.create({ title: "Atenção", description: errorMsg, type: "error" });
    } finally {
      if (submitBtn && !keepSubmitButtonLoading) setButtonLoading(submitBtn, false);
    }
  }

  private setupAuthButtonMorph(btn: HTMLButtonElement) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      btn.addEventListener('mouseenter', () => { btn.style.backgroundColor = '#E2886A'; });
      btn.addEventListener('mouseleave', () => { btn.style.backgroundColor = '#D97757'; });
      return;
    }

    gsap.set(btn, { transformOrigin: 'center center', borderRadius: 8 });

    const onEnter = () => {
      if (btn.disabled) return;
      gsap.killTweensOf(btn);
      gsap.to(btn, {
        scaleX: 1.045,
        scaleY: 0.965,
        y: -2,
        borderRadius: 14,
        backgroundColor: '#E2886A',
        boxShadow: '0 12px 30px rgba(217,119,87,0.35)',
        duration: 0.44,
        ease: 'elastic.out(0.9, 0.46)',
      });
    };

    const onLeave = () => {
      if (btn.disabled) return;
      gsap.killTweensOf(btn);
      gsap.to(btn, {
        scaleX: 1,
        scaleY: 1,
        y: 0,
        borderRadius: 8,
        backgroundColor: '#D97757',
        boxShadow: '0 4px 15px rgba(217,119,87,0.2)',
        duration: 0.68,
        ease: 'elastic.out(0.85, 0.5)',
      });
    };

    const onDown = () => {
      if (btn.disabled) return;
      gsap.killTweensOf(btn);
      gsap.to(btn, {
        scaleX: 0.97,
        scaleY: 1.06,
        y: 0,
        borderRadius: 18,
        duration: 0.14,
        ease: 'power3.out',
      });
    };

    btn.addEventListener('mouseenter', onEnter);
    btn.addEventListener('mouseleave', onLeave);
    btn.addEventListener('pointerdown', onDown);
    btn.addEventListener('pointerup', onEnter);
    btn.addEventListener('pointercancel', onLeave);
  }

  render() {
    themeManager.forceDark();
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    const app = document.querySelector<HTMLDivElement>('#app')!;
    app.innerHTML = `
      <div style="min-height: 100vh; width: 100%; background-color: #0C0C0C; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; padding: 16px; position: relative; overflow-x: hidden;">
        ${BrilhoHeader()}
        <div class="w-16 h-16 rounded-[22px] flex items-center justify-center absolute top-8 z-10 overflow-hidden"
          style="background: rgba(255,255,255,0.06); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);">
          <img src="/assets/logo/logocomfundo.png" alt="Logo" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110 filter brightness-[1.15]" style="will-change: transform;">
        </div>

        <div style="width: 100%; max-width: 448px; display: flex; flex-direction: column; align-items: center; padding: 16px;">
          <div id="dynamic-container" style="background: #111111; border: 1px solid #222222; border-radius: 24px; box-shadow: 0 4px 30px rgba(0,0,0,0.5); width: 100%; overflow: hidden; position: relative; z-index: 1; will-change: transform, border-radius, box-shadow;">
            <div id="dynamic-content" style="padding: 28px; width: 100%;">
              ${this.getAuthHTML()}
            </div>
          </div>
        </div>

        <p style="position: absolute; bottom: 32px; color: rgba(255,255,255,0.2); font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; pointer-events: none;">
          © 2026 Controlar+ — Todos os direitos reservados
        </p>
      </div>
    `;

    this.attachAuthListeners();
  }
}

export const authManager = new AuthManager();
