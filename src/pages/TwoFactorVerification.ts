import { OTPInput, attachOTPEvents } from '../components/OTPInput';
import { Button, setButtonLoading } from '../components/Button';
import { toaster } from '../components/Toast';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, deleteField } from 'firebase/firestore';
import { getApiBaseUrl } from '../lib/stripe';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { authManager } from './Auth';
import { themeManager } from '../components/ThemeManager';

export function renderTwoFactorVerification(user: any) {
    themeManager.forceDark();
    const app = document.querySelector<HTMLDivElement>('#app')!;
    
    // Obscure email for display
    const rawEmail = user.email || '';
    const emailParts = rawEmail.split('@');
    const obscureEmail = emailParts.length === 2 
        ? `${emailParts[0].substring(0, 3)}***@${emailParts[1]}` 
        : rawEmail;

    app.innerHTML = `
      <div class="min-h-screen w-full flex flex-col items-center justify-center text-white p-4 relative overflow-hidden">
        ${BrilhoHeader()}
        <div class="w-16 h-16 rounded-[22px] bg-[#141414] border border-[#2B2B2B] shadow-2xl flex items-center justify-center absolute top-8 z-10 overflow-hidden">
          <img src="/assets/logo/logocomfundo.png" alt="Logo" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110 filter brightness-[1.15]" style="will-change: transform;">
        </div>

        <div class="w-full flex flex-col justify-center items-center shrink-0 p-4">
          <div id="dynamic-container" class="rounded-[24px] shadow-lg w-full max-w-md overflow-hidden relative" style="background: #141414; border: 1px solid #2B2B2B; will-change: height; transition: height 0.6s cubic-bezier(0.32, 0.72, 0, 1), transform 0.6s cubic-bezier(0.32, 0.72, 0, 1);">
            <div id="dynamic-content" class="p-7 w-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]">
              <div class="mb-6">
                <h2 class="text-2xl font-bold text-[var(--color-text)] mb-2">Verificação 2FA</h2>
                <p class="text-[var(--color-text-secondary)] text-xs leading-relaxed">
                  Para sua segurança, precisamos validar sua identidade.<br/>
                  Digite o código que enviamos para <span class="text-[var(--color-text)] font-medium">${obscureEmail}</span>
                </p>
              </div>

              <form id="2fa-form" class="space-y-4">
                ${OTPInput({ id: 'login-2fa-otp' })}

                <div class="flex items-center justify-between gap-2 mt-4 px-1">
                  <span id="2fa-countdown" class="text-[12px] text-[var(--color-text-secondary)]">Expira em 10:00</span>
                  <button id="btn-resend-2fa" type="button" class="text-[12px] text-accent-color opacity-70 hover:opacity-100 transition-colors" style="color: #D97757;">
                    Reenviar código
                  </button>
                </div>

                <div class="mt-6">
                  ${Button({ text: 'Validar código', type: 'submit' })}
                </div>

                <div class="mt-6 text-center">
                  <a href="#" id="btn-cancel-2fa" class="text-[var(--color-text-secondary)] opacity-60 text-xs font-normal hover:text-[#D97757] hover:opacity-100 transition-colors">Cancelar e Sair</a>
                </div>
              </form>
            </div>
          </div>
        </div>

        <p class="absolute bottom-8 text-[var(--color-text-secondary)] opacity-30 text-[10px] uppercase tracking-widest pointer-events-none">
          © 2026 Controlar+ — Todos os direitos reservados
        </p>
      </div>
    `;

    // Timeline do Countdown
    let countdownInterval: any;
    const startCountdown = () => {
        let remaining = 10 * 60;
        if (countdownInterval) clearInterval(countdownInterval);
        
        countdownInterval = setInterval(() => {
            remaining--;
            const countEl = document.getElementById('2fa-countdown');
            if (!countEl || remaining <= 0) {
                if (countdownInterval) clearInterval(countdownInterval);
                if (countEl) countEl.textContent = 'Código expirado';
                return;
            }
            const m = Math.floor(remaining / 60).toString().padStart(2, '0');
            const s = (remaining % 60).toString().padStart(2, '0');
            countEl.textContent = `Expira em ${m}:${s}`;
        }, 1000);
    };

    // Func trigger OTP resend
    const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
    const sendNewCode = async () => {
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        
        await setDoc(doc(db, 'users', user.uid), {
            twoFactorPendingCode: otp,
            twoFactorPendingExpiry: expiresAt,
        }, { merge: true });

        await fetch(`${getApiBaseUrl()}/api/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: rawEmail, otp, type: '2fa-login' }),
        });

        toaster.create({ title: 'Código reenviado', description: 'Por favor, consulte seu e-mail.', type: 'success' });
        startCountdown();
    };

    // Events
    attachOTPEvents('login-2fa-otp');
    startCountdown();

    const form = document.getElementById('2fa-form') as HTMLFormElement;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        setButtonLoading(submitBtn, true);

        try {
            const inputs = document.querySelectorAll('#login-2fa-otp .otp-input-hidden') as NodeListOf<HTMLInputElement>;
            const code = Array.from(inputs).map(i => i.value).join('');

            if (code.length < 6) {
                throw new Error('Por favor, insira os 6 dígitos.');
            }

            const userSnap = await getDoc(doc(db, 'users', user.uid));
            const data = userSnap.data();
            const storedCode = data?.twoFactorPendingCode;
            const expiry = data?.twoFactorPendingExpiry;

            if (!storedCode || !expiry) {
                throw new Error('Código expirado ou inválido. Solicite um novo.');
            }

            if (new Date() > new Date(expiry)) {
                throw new Error('Os 10 minutos passaram. Solicite um novo código.');
            }

            if (code !== storedCode) {
                throw new Error('O código digitado não confere. Tente novamente.');
            }

            // Success!!
            if (countdownInterval) clearInterval(countdownInterval);

            // Reseta pending code no firestore pra não reutilizar
            await setDoc(doc(db, 'users', user.uid), {
                twoFactorPendingCode: deleteField(),
                twoFactorPendingExpiry: deleteField(),
            }, { merge: true });

            sessionStorage.setItem(`2fa_verified_${user.uid}`, 'true');
            toaster.create({ title: 'Identidade confirmada', description: 'Abrindo o painel...', type: 'success' });
            
            // Força a UI a re-avaliar o estado de auth após 2FA para carregar o dashboard
            setTimeout(() => {
                window.location.reload();
            }, 800);

        } catch (error: any) {
            toaster.create({ title: 'Erro de Autenticação', description: error.message, type: 'error' });
        } finally {
            setButtonLoading(submitBtn, false);
        }
    });

    document.getElementById('btn-resend-2fa')?.addEventListener('click', () => {
        sendNewCode();
    });

    document.getElementById('btn-cancel-2fa')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await signOut(auth);
        authManager.render();
    });

    // Enviar código imediatamente assim que renderizar a view a primeira vez
    // (Pode não ser ideal no mount pq a pessoa pode fechar, recarregar. Mas é assim a melhor UX de 2FA.)
    sendNewCode();
}
