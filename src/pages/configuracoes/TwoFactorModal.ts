import { Modal } from '../../components/Modal';
import { OTPInput, attachOTPEvents } from '../../components/OTPInput';
import { toaster } from '../../components/Toast';
import { auth, db } from '../../lib/firebase';
import { doc, setDoc, getDoc, deleteField } from 'firebase/firestore';
import { getApiBaseUrl } from '../../lib/stripe';
import gsap from 'gsap';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function openTwoFactorModal(onSuccess?: () => void) {
  let step = 1;
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  const user = auth.currentUser;
  const email = user?.email || '';

  const renderStep1 = () => `
    <div class="animate-fadein space-y-3">

      <div>
        <p class="text-[16px] text-[var(--color-text)] font-semibold tracking-tight mb-2">Autenticação em dois fatores</p>
        <p class="text-[13px] text-[var(--color-text-secondary)] leading-[1.7]">
          Para proteger sua conta, vamos enviar um <span class="text-[var(--color-text)] font-medium">código de 6 dígitos</span> para o seu e-mail cadastrado. O código é de uso único e <span class="text-[var(--color-text)] font-medium">expira em 10 minutos</span>.
        </p>
      </div>

      <p class="text-[12px] text-[var(--color-text-secondary)]/70 leading-[1.6]">
        Após ativar, toda vez que você entrar na sua conta será solicitado um código de verificação enviado para <span class="text-[var(--color-text-secondary)]">${email}</span> para confirmar sua identidade.
      </p>

    </div>
  `;

  const renderStep2 = () => `
    <div class="animate-fadein space-y-4">
      <div>
        <p class="text-[16px] text-[var(--color-text)] font-semibold tracking-tight mb-2">Digite o código</p>
        <p class="text-[13px] text-[var(--color-text-secondary)] leading-[1.7]">
          Enviamos um código de 6 dígitos para <span class="text-[var(--color-text)] font-medium">${email}</span>. Verifique sua caixa de entrada.
        </p>
      </div>

      ${OTPInput({ id: 'two-factor-otp' })}

      <div class="flex items-center gap-2">
        <span id="otp-countdown" class="text-[12px] text-[var(--color-text-secondary)]">Expira em 10:00</span>
        <span class="text-[11px] text-[var(--color-border)]">·</span>
        <button id="btn-resend-otp" type="button" class="text-[12px] text-[#D97757]/60 hover:text-[#D97757] transition-colors">
          Reenviar código
        </button>
      </div>
    </div>
  `;

  Modal({
    title: 'Autenticação 2FA',
    confirmText: 'Enviar código',
    content: renderStep1(),
    onConfirm: async () => {
      if (step === 1) {
        if (!user) throw new Error('Usuário não autenticado');

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        await setDoc(doc(db, 'users', user.uid), {
          twoFactorPendingCode: otp,
          twoFactorPendingExpiry: expiresAt,
        }, { merge: true });

        const resp = await fetch(`${getApiBaseUrl()}/api/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, otp, type: '2fa-setup' }),
        });

        if (!resp.ok) {
          toaster.create({ title: 'Erro', description: 'Não foi possível enviar o e-mail.', type: 'error' });
          throw new Error('PREVENT_CLOSE');
        }

        toaster.create({
          title: 'Código enviado!',
          description: `Verifique a caixa de entrada de ${email}`,
          type: 'success',
        });

        step = 2;
        await animateToStep2();
        throw new Error('PREVENT_CLOSE');

      } else {
        const inputs = document.querySelectorAll('#two-factor-otp .otp-input-hidden') as NodeListOf<HTMLInputElement>;
        const code = Array.from(inputs).map(i => i.value).join('');

        if (code.length < 6) {
          toaster.create({ title: 'Código incompleto', description: 'Por favor, insira os 6 dígitos.', type: 'warning' });
          throw new Error('PREVENT_CLOSE');
        }

        if (!user) throw new Error('Usuário não autenticado');

        const userSnap = await getDoc(doc(db, 'users', user.uid));
        const data = userSnap.data();
        const storedCode = data?.twoFactorPendingCode;
        const expiry = data?.twoFactorPendingExpiry;

        if (!storedCode || !expiry) {
          toaster.create({ title: 'Código expirado', description: 'Solicite um novo código.', type: 'error' });
          throw new Error('PREVENT_CLOSE');
        }

        if (new Date() > new Date(expiry)) {
          toaster.create({ title: 'Código expirado', description: 'Os 10 minutos passaram. Solicite um novo código.', type: 'error' });
          throw new Error('PREVENT_CLOSE');
        }

        if (code !== storedCode) {
          toaster.create({ title: 'Código incorreto', description: 'O código digitado não confere. Tente novamente.', type: 'error' });
          throw new Error('PREVENT_CLOSE');
        }

        if (countdownInterval) clearInterval(countdownInterval);

        await setDoc(doc(db, 'users', user.uid), {
          twoFactorEnabled: true,
          twoFactorMethod: 'email',
          twoFactorUpdatedAt: new Date().toISOString(),
          twoFactorPendingCode: deleteField(),
          twoFactorPendingExpiry: deleteField(),
        }, { merge: true });

        toaster.create({ title: '2FA Ativado!', description: 'Sua conta agora está mais protegida.', type: 'success' });

        if (onSuccess) onSuccess();
      }
    }
  });

  async function sendOTP() {
    if (!user) return;
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await setDoc(doc(db, 'users', user.uid), {
      twoFactorPendingCode: otp,
      twoFactorPendingExpiry: expiresAt,
    }, { merge: true });

    await fetch(`${getApiBaseUrl()}/api/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, type: '2fa-setup' }),
    });

    toaster.create({ title: 'Código reenviado!', description: 'Verifique seu e-mail.', type: 'success' });
    startCountdown();
  }

  function startCountdown() {
    let remaining = 10 * 60;
    const el = document.getElementById('otp-countdown');
    if (!el) return;

    if (countdownInterval) clearInterval(countdownInterval);

    countdownInterval = setInterval(() => {
      remaining--;
      const countEl = document.getElementById('otp-countdown');
      if (!countEl || remaining <= 0) {
        if (countdownInterval) clearInterval(countdownInterval);
        if (countEl) countEl.textContent = 'Código expirado';
        return;
      }
      const m = Math.floor(remaining / 60).toString().padStart(2, '0');
      const s = (remaining % 60).toString().padStart(2, '0');
      countEl.textContent = `Expira em ${m}:${s}`;
    }, 1000);
  }

  async function animateToStep2() {
    const wrapperEl = document.querySelector('[id^="modal-"][id$="-wrapper"]') as HTMLElement;
    if (!wrapperEl) return;
    const baseId = wrapperEl.id.slice(0, -'-wrapper'.length);

    const card = document.getElementById(baseId);
    const fields = document.getElementById(`${baseId}-fields`);
    const submitBtnText = document.querySelector(`#${baseId}-submit .btn-text`) as HTMLElement;

    if (!card || !fields || !submitBtnText) return;

    const tl = gsap.timeline();

    tl.to(fields, { opacity: 0, y: 10, filter: 'blur(10px)', duration: 0.3, ease: 'power2.in' });
    tl.to(card, { scaleX: 0.95, scaleY: 0.9, duration: 0.3, ease: 'back.in(1.2)' }, '-=0.1');

    tl.add(() => {
      fields.innerHTML = renderStep2();
      submitBtnText.textContent = 'Ativar Proteção';
      gsap.set(fields, { opacity: 0, y: 10, filter: 'blur(10px)' });
      attachOTPEvents('two-factor-otp');
      startCountdown();
      document.getElementById('btn-resend-otp')?.addEventListener('click', () => sendOTP());
    });

    tl.to(card, { scaleX: 1, scaleY: 1, duration: 0.6, ease: 'elastic.out(1, 0.75)' });
    tl.to(fields, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.3, ease: 'power2.out' }, '-=0.3');
  }
}

export function openDisableTwoFactorModal(onSuccess?: () => void) {
  const user = auth.currentUser;
  
  Modal({
    title: 'Desativar Autenticação 2FA',
    confirmText: 'Desativar',
    content: `
      <div class="animate-fadein space-y-3">
        <p class="text-[14px] text-[var(--color-text)]">
          Tem certeza que deseja desativar a autenticação em dois fatores (2FA)?
        </p>
        <p class="text-[13px] text-[var(--color-text-secondary)]">
          Sua conta vai perder uma camada extra de segurança e ficará mais vulnerável.
        </p>
      </div>
    `,
    onConfirm: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      
      await setDoc(doc(db, 'users', user.uid), {
        twoFactorEnabled: false,
        twoFactorMethod: deleteField(),
        twoFactorUpdatedAt: deleteField(),
        twoFactorPendingCode: deleteField(),
        twoFactorPendingExpiry: deleteField(),
      }, { merge: true });
      
      toaster.create({ title: '2FA Desativado', description: 'A proteção extra foi removida da sua conta.', type: 'success' });
      
      if (onSuccess) onSuccess();
    }
  });
}
