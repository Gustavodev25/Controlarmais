import { Modal } from '../../components/Modal';
import { Input } from '../../components/Input';
import { toaster } from '../../components/Toast';
import { auth, db } from '../../lib/firebase';
import { deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';

const CONFIRM_TEXT = 'EU DESEJO EXCLUIR MINHA CONTA';

export function openDeleteAccountModal() {
  const user = auth.currentUser;
  if (!user) return;

  Modal({
    title: 'Encerrar Conta',
    confirmText: 'Excluir minha conta',
    showCancel: false,
    content: `
      <div class="space-y-5">
        <div>
          <h3 class="text-[15px] font-semibold text-[var(--color-text)] mb-1">Tem certeza absoluta?</h3>
          <p class="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            Esta ação é permanente e irreversível. Todos os seus dados, histórico financeiro e configurações serão excluídos para sempre e não poderão ser recuperados.
          </p>
        </div>

        ${Input({
          id: 'delete-password',
          type: 'password',
          label: 'Confirme sua senha',
          placeholder: '••••••••',
          required: true
        })}

        <div class="flex flex-col gap-2">
          <label for="delete-account-confirm" class="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-secondary)] font-semibold ml-1">
            Digite <span class="text-[var(--color-text)] font-bold">${CONFIRM_TEXT}</span> para confirmar
          </label>
          <input
            type="text"
            id="delete-account-confirm"
            name="delete-account-confirm"
            placeholder="${CONFIRM_TEXT}"
            autocomplete="off"
            style="text-transform: uppercase;"
            class="w-full px-4 py-3 bg-[var(--color-input-bg)] border border-[var(--color-border-light)] rounded-xl text-[13px] text-[var(--color-text)] placeholder-[var(--color-input-placeholder)] focus:outline-none focus:border-red-500/40 focus:ring-4 focus:ring-red-500/5 transition-all duration-300 font-mono tracking-wide"
          />
        </div>
      </div>
    `,
    onConfirm: async (data: any) => {
      const typed = (data['delete-account-confirm'] || '').toUpperCase().trim();

      if (typed !== CONFIRM_TEXT) {
        toaster.create({ title: 'Texto incorreto', description: `Digite exatamente: ${CONFIRM_TEXT}`, type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }

      // 1. Reautenticar antes de qualquer delete
      try {
        if (!user.email) throw new Error('no-email');
        const credential = EmailAuthProvider.credential(user.email, data['delete-password']);
        await reauthenticateWithCredential(user, credential);
      } catch {
        toaster.create({ title: 'Senha incorreta', description: 'Verifique sua senha e tente novamente.', type: 'error' });
        throw new Error('PREVENT_CLOSE');
      }

      // 2. Deletar Auth primeiro — se falhar, Firestore fica intacto
      try {
        await deleteUser(user);
      } catch (error: any) {
        toaster.create({ title: 'Erro', description: 'Não foi possível excluir a conta.', type: 'error' });
        throw error;
      }

      // 3. Deletar Firestore depois — Auth já foi removido
      try {
        await deleteDoc(doc(db, 'users', user.uid));
      } catch {
        // Auth já deletado, ignora erro de Firestore (cleanup pode ser feito server-side)
        console.warn('[DeleteAccount] Firestore cleanup failed, auth already deleted.');
      }

      toaster.create({ title: 'Conta excluída', description: 'Sua conta foi removida com sucesso.', type: 'success' });
    }
  });

  // Attach input controls after modal renders
  const input = document.getElementById('delete-account-confirm') as HTMLInputElement | null;
  if (!input) return;

  const form = input.closest('form');
  const submitBtn = form?.querySelector<HTMLButtonElement>('[id$="-submit"]');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.35';
    submitBtn.style.cursor = 'not-allowed';
    submitBtn.style.pointerEvents = 'none';
  }

  input.addEventListener('paste', (e) => e.preventDefault());
  input.addEventListener('drop', (e) => e.preventDefault());
  input.addEventListener('contextmenu', (e) => e.preventDefault());

  input.addEventListener('input', () => {
    const matches = input.value.toUpperCase().trim() === CONFIRM_TEXT;
    if (submitBtn) {
      submitBtn.disabled = !matches;
      submitBtn.style.opacity = matches ? '' : '0.35';
      submitBtn.style.cursor = matches ? '' : 'not-allowed';
      submitBtn.style.pointerEvents = matches ? '' : 'none';
    }
  });
}
