import { Modal } from './Modal';
import { Input } from './Input';
import { toaster } from './Toast';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import gsap from 'gsap';

export function openCompleteProfileModal(user: any, isMandatory: boolean = false) {
  const inputClass = "w-full px-4 py-2.5 bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg text-[13px] text-[var(--color-input-text)] placeholder-[var(--color-input-placeholder)] focus:outline-none focus:border-[#D97757] transition-colors pr-10";

  const { closeModal } = Modal({
    title: 'Complete seu Perfil',
    canClose: !isMandatory,
    maxWidth: 'max-w-[480px]',
    showCancel: false,
    confirmText: 'Salvar e Continuar',
    onConfirm: async (formData) => {
      const { phone, cep, street, neighborhood, city, state } = formData;

      if (!phone || !cep || !state) {
        toaster.create({ title: "Atenção", description: "Preencha o CEP e o telefone para continuar.", type: "warning" });
        throw new Error('PREVENT_CLOSE');
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          phone: phone,
          'profile.phone': phone,
          'profile.address': {
            cep: cep,
            street: street,
            neighborhood: neighborhood,
            city: city,
            state: state
          }
        });

        toaster.create({ title: "Perfil atualizado", description: "Dados salvos com sucesso!", type: "success" });
      } catch (error: any) {
        toaster.create({ title: "Erro ao salvar", description: error.message, type: "error" });
        throw error;
      }
    },
    content: `
      <div class="space-y-4">
        <p class="text-xs text-gray-400 leading-relaxed mb-4">
          Para garantir a segurança da sua conta e o acesso total aos recursos, precisamos que você complete seu cadastro com telefone e endereço.
        </p>

        ${Input({ id: 'phone', type: 'text', label: 'Telefone', placeholder: '(00) 00000-0000', required: true })}

        <div class="flex flex-col gap-1.5">
          <label for="cep" class="text-sm text-gray-400 ml-1">CEP</label>
          <div class="relative w-full">
            <input
              type="text"
              id="cep"
              name="cep"
              required
              placeholder="00000-000"
              maxlength="9"
              class="${inputClass}"
            >
            <div id="cep-loader" class="absolute right-3 top-1/2 -translate-y-1/2 hidden pointer-events-none">
              <svg class="animate-spin h-4 w-4 text-[#D97757]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div id="cep-check" class="absolute right-2 top-1/2 -translate-y-1/2 hidden pointer-events-none">
               <lottie-player src="/assets/lottie/check.json" style="width: 18px; height: 18px;" speed="1.5" class="brightness-0 invert"></lottie-player>
            </div>
          </div>
        </div>

        <div id="address-fields" class="hidden">
          <div class="bg-[var(--color-input-bg)] border border-[var(--color-input-border)] rounded-lg px-4 py-3">
            <p class="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Endereço encontrado</p>
            <p id="address-summary-street" class="text-[13px] text-white/80"></p>
            <p id="address-summary-area" class="text-[13px] text-white/50"></p>
          </div>
          <input type="hidden" id="street" name="street">
          <input type="hidden" id="neighborhood" name="neighborhood">
          <input type="hidden" id="city" name="city">
          <input type="hidden" id="state" name="state">
        </div>
      </div>
    `
  });

  // Attach Phone and CEP logic
  setTimeout(() => {
    const phoneInput = document.getElementById('phone') as HTMLInputElement;
    phoneInput?.addEventListener('input', (e: any) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 11);
      if (val.length > 10) val = val.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
      else if (val.length > 6) val = val.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
      else if (val.length > 2) val = val.replace(/(\d{2})(\d{0,4})/, "($1) $2");
      else if (val.length > 0) val = "(" + val;
      e.target.value = val;
    });

    const cepInput = document.getElementById('cep') as HTMLInputElement;
    cepInput?.addEventListener('input', async (e: any) => {
      let val = e.target.value.replace(/\D/g, '').substring(0, 8);
      if (val.length > 5) val = val.replace(/(\d{5})(\d{0,3})/, "$1-$2");
      e.target.value = val;

      const digits = val.replace(/\D/g, '');
      if (digits.length === 8) {
        await fetchCEP(digits);
      } else {
        document.getElementById('cep-check')?.classList.add('hidden');
        document.getElementById('cep-loader')?.classList.add('hidden');
        document.getElementById('address-fields')?.classList.add('hidden');
      }
    });
  }, 100);

  async function fetchCEP(cep: string) {
    const loader = document.getElementById('cep-loader');
    const check = document.getElementById('cep-check');
    const addressFields = document.getElementById('address-fields');

    loader?.classList.remove('hidden');
    check?.classList.add('hidden');
    addressFields?.classList.add('hidden');

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        loader?.classList.add('hidden');
        toaster.create({ title: "CEP não encontrado", description: "Verifique o CEP e tente novamente.", type: "error" });
        return;
      }

      (document.getElementById('street') as HTMLInputElement).value = data.logradouro || '';
      (document.getElementById('neighborhood') as HTMLInputElement).value = data.bairro || '';
      (document.getElementById('city') as HTMLInputElement).value = data.localidade || '';
      (document.getElementById('state') as HTMLInputElement).value = data.uf || '';

      const summaryStreet = document.getElementById('address-summary-street');
      const summaryArea = document.getElementById('address-summary-area');
      if (summaryStreet) summaryStreet.textContent = [data.logradouro, data.bairro].filter(Boolean).join(', ');
      if (summaryArea) summaryArea.textContent = `${data.localidade} - ${data.uf}`;

      loader?.classList.add('hidden');
      check?.classList.remove('hidden');
      addressFields?.classList.remove('hidden');
      
      const lottieCheck = check?.querySelector('lottie-player') as any;
      if (lottieCheck) { lottieCheck.seek(0); lottieCheck.play(); }
    } catch {
      loader?.classList.add('hidden');
      toaster.create({ title: "Erro ao buscar CEP", description: "Verifique sua conexão e tente novamente.", type: "error" });
    }
  }
}
