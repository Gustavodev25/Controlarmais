import { Input } from '../components/Input';
import { OTPInput, attachOTPEvents } from '../components/OTPInput';
import { Button, setButtonLoading } from '../components/Button';
import { toaster } from '../components/Toast';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { authManager } from './Auth';
import { getApiBaseUrl } from '../lib/stripe';
import { themeManager } from '../components/ThemeManager';

export function renderPasswordRecovery() {
    themeManager.forceDark();
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    const app = document.querySelector<HTMLDivElement>('#app')!;
    let step = 1;
    let userEmail = '';
    let recoveryOTP = '';

    const render = () => {
        let contentHTML = '';

        if (step === 1) {
            contentHTML = `
              <div class="mb-6">
                <h2 class="text-2xl font-bold text-white mb-2">Recuperar senha</h2>
                <p class="text-gray-400 text-xs leading-relaxed">Digite seu email de cadastro para receber um código de recuperação.</p>
              </div>
              <form id="recovery-form-1" class="space-y-4">
                ${Input({ id: 'recovery-email', type: 'email', label: 'Email', required: true })}
                <div class="mt-6">
                  ${Button({ text: 'Enviar código', type: 'submit' })}
                </div>
                <div class="mt-6 text-center">
                  <a href="#" id="btn-cancel-recovery" class="text-white/40 text-[12px] hover:text-[#D97757] transition-colors">Voltar para o login</a>
                </div>
              </form>
            `;
        } else if (step === 2) {
            contentHTML = `
              <div class="mb-6">
                <h2 class="text-2xl font-bold text-white mb-2">Validação de código</h2>
                <p class="text-gray-400 text-xs leading-relaxed">Enviamos um código de 6 dígitos para o email <br/><span class="text-white font-medium">${userEmail}</span></p>
              </div>
              <form id="recovery-form-2" class="space-y-4">
                ${OTPInput({ id: 'recovery-otp' })}
                
                <div class="flex items-center justify-between gap-2 mt-4 px-1">
                  <span id="recovery-countdown" class="text-[12px] text-gray-400">Expira em 10:00</span>
                  <button id="btn-resend-recovery" type="button" class="text-[12px] text-accent-color opacity-70 hover:opacity-100 transition-colors" style="color: #D97757;">
                    Reenviar código
                  </button>
                </div>

                <div class="mt-6">
                  ${Button({ text: 'Validar e continuar', type: 'submit' })}
                </div>
                <div class="mt-6 text-center">
                  <a href="#" id="btn-cancel-step-2" class="text-white/40 text-[12px] hover:text-[#D97757] transition-colors">Voltar</a>
                </div>
              </form>
            `;
        } else if (step === 3) {
            contentHTML = `
              <div class="mb-6">
                <h2 class="text-2xl font-bold text-white mb-2">Nova senha</h2>
                <p class="text-gray-400 text-xs leading-relaxed">Crie uma nova senha para acessar sua conta.</p>
              </div>
              <form id="recovery-form-3" class="space-y-4">
                ${Input({ id: 'new-password', type: 'password', label: 'Nova senha', required: true })}
                <div class="mt-6">
                  ${Button({ text: 'Redefinir senha', type: 'submit' })}
                </div>
                <div class="mt-6 text-center">
                  <a href="#" id="btn-cancel-step-3" class="text-white/40 text-[12px] hover:text-[#D97757] transition-colors">Cancelar</a>
                </div>
              </form>
            `;
        }

        app.innerHTML = `
          <div class="min-h-screen w-full flex flex-col items-center justify-center text-white p-4 relative overflow-x-hidden">
            ${BrilhoHeader()}
            <div class="w-16 h-16 rounded-[22px] bg-[#141414] border border-[#2B2B2B] shadow-2xl flex items-center justify-center absolute top-8 z-10 overflow-hidden">
              <img src="/assets/logo/logocomfundo.png" alt="Logo" class="w-full h-full object-cover transition-transform duration-500 hover:scale-110 filter brightness-[1.15]" style="will-change: transform;">
            </div>
    
            <div class="w-full flex flex-col justify-center items-center shrink-0 p-4">
              <div id="dynamic-container" class="rounded-[24px] shadow-lg w-full max-w-md overflow-hidden relative" style="background: #141414; border: 1px solid #2B2B2B;">
                <div id="dynamic-content" class="p-7 w-full transition-all duration-300">
                  ${contentHTML}
                </div>
              </div>
            </div>
    
            <p class="absolute bottom-8 text-white/20 text-[10px] uppercase tracking-widest pointer-events-none">
              © 2026 Controlar+ — Todos os direitos reservados
            </p>
          </div>
        `;

        attachListeners();
    };

    let countdownInterval: any;
    const startCountdown = () => {
        let remaining = 10 * 60;
        if (countdownInterval) clearInterval(countdownInterval);
        
        countdownInterval = setInterval(() => {
            remaining--;
            const countEl = document.getElementById('recovery-countdown');
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

    const attachListeners = () => {
        if (step === 1) {
            const form1 = document.getElementById('recovery-form-1') as HTMLFormElement;
            const btnCancel = document.getElementById('btn-cancel-recovery');
            
            btnCancel?.addEventListener('click', (e) => {
                e.preventDefault();
                authManager.render();
            });

            form1?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const emailInput = document.getElementById('recovery-email') as HTMLInputElement;
                const submitBtn = form1.querySelector('button[type="submit"]') as HTMLButtonElement;
                
                userEmail = emailInput.value.trim();
                if (!userEmail) return;

                setButtonLoading(submitBtn, true);
                try {
                    await fetch(`${getApiBaseUrl()}/api/request-password-reset`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userEmail })
                    });
                    
                    // Proceed even if it fails to avoid enumeration
                    step = 2;
                    render();
                } catch (error) {
                    toaster.create({ title: 'Erro', description: 'Não foi possível solicitar a recuperação.', type: 'error' });
                } finally {
                    setButtonLoading(submitBtn, false);
                }
            });
        } else if (step === 2) {
            attachOTPEvents('recovery-otp');
            startCountdown();

            const form2 = document.getElementById('recovery-form-2') as HTMLFormElement;
            const btnCancel = document.getElementById('btn-cancel-step-2');
            const btnResend = document.getElementById('btn-resend-recovery');

            btnCancel?.addEventListener('click', (e) => {
                e.preventDefault();
                if (countdownInterval) clearInterval(countdownInterval);
                step = 1;
                render();
            });

            btnResend?.addEventListener('click', async () => {
                try {
                    await fetch(`${getApiBaseUrl()}/api/request-password-reset`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userEmail })
                    });
                    toaster.create({ title: 'Código reenviado', description: 'O código foi reenviado para seu e-mail.', type: 'success' });
                    startCountdown();
                } catch (err) {}
            });

            form2?.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const inputs = document.querySelectorAll('#recovery-otp .otp-input-hidden') as NodeListOf<HTMLInputElement>;
                const code = Array.from(inputs).map(i => i.value).join('');

                if (code.length < 6) {
                    toaster.create({ title: 'Atenção', description: 'Por favor, insira os 6 dígitos.', type: 'error' });
                    return;
                }

                recoveryOTP = code;
                step = 3;
                if (countdownInterval) clearInterval(countdownInterval);
                render();
            });
        } else if (step === 3) {
            const form3 = document.getElementById('recovery-form-3') as HTMLFormElement;
            const btnCancel = document.getElementById('btn-cancel-step-3');

            btnCancel?.addEventListener('click', (e) => {
                e.preventDefault();
                authManager.render();
            });

            // Password toggles setup just like Auth.ts
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

            form3?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newPasswordInput = document.getElementById('new-password') as HTMLInputElement;
                const submitBtn = form3.querySelector('button[type="submit"]') as HTMLButtonElement;
                
                const newPassword = newPasswordInput.value;
                if (newPassword.length < 6) {
                    toaster.create({ title: 'Atenção', description: 'A senha deve ter no mínimo 6 caracteres.', type: 'error' });
                    return;
                }

                setButtonLoading(submitBtn, true);

                try {
                    const res = await fetch(`${getApiBaseUrl()}/api/confirm-password-reset`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: userEmail, otp: recoveryOTP, newPassword })
                    });

                    const data = await res.json();
                    if (!res.ok) {
                        throw new Error(data.error || 'Erro ao redefinir a senha.');
                    }

                    toaster.create({ title: 'Sucesso', description: 'Senha redefinida com sucesso. Faça login.', type: 'success' });
                    
                    setTimeout(() => {
                        authManager.render();
                    }, 2000);
                } catch (error: any) {
                    toaster.create({ title: 'Erro', description: error.message, type: 'error' });
                } finally {
                    setButtonLoading(submitBtn, false);
                }
            });
        }
    };

    render();
}
