import { Modal } from '../../components/Modal';
import { API_BASE } from '../../lib/apiConfig';
import { Input } from '../../components/Input';
import { OTPInput, attachOTPEvents } from '../../components/OTPInput';
import { toaster } from '../../components/Toast';
import { auth } from '../../lib/firebase';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import gsap from 'gsap';

export function openChangePasswordModal() {
  let step = 1; // 1: Passwords, 2: OTP
  let passwordData: any = {};
  let currentGeneratedOtp: string = '';
  const user = auth.currentUser;

  const renderContent = () => {
    if (step === 1) {
      return `
        <p class="text-[13px] text-[var(--color-text-secondary)] mb-6 leading-relaxed">
          Para sua segurança, precisamos validar sua identidade antes de alterar a senha.
        </p>
        <div class="space-y-4">
          ${Input({
        id: 'currentPassword',
        type: 'password',
        label: 'Senha Atual',
        placeholder: '••••••••',
        required: true
      })}

          ${Input({
        id: 'newPassword',
        type: 'password',
        label: 'Nova Senha',
        placeholder: '••••••••',
        required: true
      })}

          ${Input({
        id: 'confirmPassword',
        type: 'password',
        label: 'Confirmar Nova Senha',
        placeholder: '••••••••',
        required: true
      })}
        </div>
      `;
    } else {
      return `
        <div class="text-center py-4">
          <h3 class="text-[17px] font-semibold text-[var(--color-text)] mb-2">Verifique seu e-mail</h3>
          <p class="text-[13px] text-[var(--color-text-secondary)] mb-8 px-8 leading-relaxed">
            Enviamos um código de segurança de 6 dígitos para <span class="text-[var(--color-text)] font-medium">${user?.email}</span>. Insira-o abaixo para continuar.
          </p>
          
          ${OTPInput({ id: 'change-pass-otp' })}
          
          <button type="button" id="resend-otp" class="text-[12px] text-[#D97757] hover:underline font-medium">
            Não recebi o código. Reenviar
          </button>
        </div>
      `;
    }
  };

  Modal({
    title: 'Alterar Senha',
    confirmText: 'Continuar',
    content: renderContent(),
    onConfirm: async (data: any) => {
      if (step === 1) {
        // 1. Validação básica local
        if (data.newPassword !== data.confirmPassword) {
          toaster.create({ title: "Erro", description: "As senhas não coincidem.", type: "error" });
          throw new Error("Passwords don't match");
        }

        if (data.newPassword.length < 6) {
          toaster.create({ title: "Senha Fraca", description: "A senha deve ter pelo menos 6 caracteres.", type: "warning" });
          throw new Error("Weak password");
        }

        passwordData = data;

        // 2. Re-autenticação (Segurança do Firebase)
        try {
          if (!user || !user.email) throw new Error("User not authenticated");
          const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
          await reauthenticateWithCredential(user, credential);
        } catch (error: any) {
          toaster.create({ title: "Senha Incorreta", description: "A senha atual está incorreta.", type: "error" });
          throw error;
        }

        // 3. Envio do E-mail
        try {
          currentGeneratedOtp = Math.floor(100000 + Math.random() * 900000).toString();
          const response = await fetch(`${API_BASE}/api/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ email: user?.email, otp: currentGeneratedOtp, type: 'change-password' })
          });
          if (!response.ok) throw new Error("Email server error");

          step = 2;
          await animateToStep2();
          throw new Error("PREVENT_CLOSE");
        } catch (error: any) {
          if (error.message === 'PREVENT_CLOSE') throw error;
          toaster.create({ title: "Erro de Conexão", description: "Não conseguimos enviar o código.", type: "error" });
          throw error;
        }

      } else {
        // 4. Verificação do OTP
        const otpValue = Array.from(document.querySelectorAll('#change-pass-otp .otp-input-hidden'))
          .map((input: any) => (input as HTMLInputElement).value)
          .join('');

        if (otpValue !== currentGeneratedOtp) {
          toaster.create({ title: "Código Inválido", description: "O código inserido não confere.", type: "error" });
          throw new Error("Invalid OTP");
        }

        // 5. ATUALIZAÇÃO NO FIREBASE
        try {
          if (!user) throw new Error("User not found");
          await updatePassword(user, passwordData.newPassword);
          toaster.create({ title: "Sucesso!", description: "Senha atualizada com segurança.", type: "success" });
        } catch (error: any) {
          toaster.create({ title: "Erro", description: "Falha ao atualizar a senha.", type: "error" });
          throw error;
        }
      }
    }
  });

  async function animateToStep2() {
    const modalWrapper = document.querySelector('[id^="modal-"]');
    if (!modalWrapper) return;

    const card = modalWrapper.querySelector('[id$="-card"]');
    const fieldsContainer = modalWrapper.querySelector('[id$="-fields"]');
    const submitBtnText = modalWrapper.querySelector('[id$="-submit"] .btn-text');
    const footer = modalWrapper.querySelector('[id$="-footer"]');

    if (!card || !fieldsContainer || !submitBtnText || !footer) return;

    const tl = gsap.timeline();

    tl.to([fieldsContainer, footer], {
      opacity: 0,
      y: 10,
      scale: 0.95,
      filter: 'blur(10px)',
      duration: 0.3,
      ease: 'power2.in'
    });

    tl.to(card, { scaleX: 0.8, scaleY: 0.6, borderRadius: '60px', duration: 0.4, ease: 'back.in(1.2)' }, '-=0.15');

    tl.add(() => {
      fieldsContainer.innerHTML = renderContent();
      submitBtnText.textContent = 'Verificar e Salvar';

      // USANDO O COMPONENTE OTP COMPONETIZADO
      attachOTPEvents('change-pass-otp');

      document.getElementById('resend-otp')?.addEventListener('click', () => {
        toaster.create({ title: "Aguarde", description: "Aguarde o tempo de reenvio.", type: "warning" });
      });
    });

    tl.to(card, { scaleX: 1, scaleY: 1, borderRadius: '24px', duration: 0.7, ease: 'elastic.out(1.05, 0.68)' });

    const otpFields = fieldsContainer.querySelectorAll(':scope > *');
    const footerBtns = footer.querySelectorAll('button');

    tl.to(fieldsContainer, { opacity: 1, filter: 'blur(0px)', duration: 0.1 }, '-=0.5');
    tl.to(footer, { opacity: 1, filter: 'blur(0px)', duration: 0.1 }, '-=0.5');

    tl.fromTo(otpFields,
      { opacity: 0, y: 14, x: -6, scale: 0.92, filter: 'blur(8px)' },
      { opacity: 1, y: 0, x: 0, scale: 1, filter: 'blur(0px)', stagger: 0.05, duration: 0.5, ease: 'power4.out' },
      '-=0.45');

    tl.fromTo(footerBtns,
      { opacity: 0, y: 10, scale: 0.95, filter: 'blur(6px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.3, ease: 'power3.out' },
      '-=0.3');

    return tl;
  }
}
