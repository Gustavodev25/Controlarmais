import { Modal } from '../../components/Modal';
import { API_BASE } from '../../lib/apiConfig';
import { Input } from '../../components/Input';
import { toaster } from '../../components/Toast';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export function openUpdateCardModal(userData: any) {
    const content = `
    <div class="space-y-6 pt-2">
      <div class="space-y-4">
        ${Input({ id: 'update-cardName', type: 'text', label: 'Nome no cartão', placeholder: 'Como impresso no cartão', required: true })}
        ${Input({ id: 'update-cardNumber', type: 'text', label: 'Número do cartão', placeholder: '0000 0000 0000 0000', required: true })}
        
        <div class="grid grid-cols-2 gap-4">
          ${Input({ id: 'update-expiry', type: 'text', label: 'Expiração', placeholder: 'MM/AA', required: true })}
          ${Input({ id: 'update-cvv', type: 'password', label: 'CVV', placeholder: '•••', required: true })}
        </div>
        
        ${Input({ id: 'update-cpf', type: 'text', label: 'CPF do titular', placeholder: '000.000.000-00', required: true, value: userData?.profile?.cpf || '' })}
      </div>
      
      <div class="bg-[var(--color-surface-hover)] p-4 rounded-2xl border border-[var(--color-border-light)]/40 mt-6">
        <div class="flex gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[var(--color-text-secondary)] mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
          <p class="text-[11px] text-[var(--color-text-secondary)] leading-tight opacity-70">
            <strong>Informação importante:</strong> Ao atualizar, cobraremos as próximas faturas neste novo cartão. As faturas já vencidas devem ser pagas individualmente.
          </p>
        </div>
      </div>
    </div>
  `;

    Modal({
        title: 'Atualizar Cartão',
        content,
        confirmText: 'Salvar Alterações',
        showCancel: false,
        showCloseButton: true,
        maxWidth: 'max-w-md',
        onConfirm: async (data) => {
            try {
                const subscriptionId = userData?.subscription?.asaasSubscriptionId || userData?.subscriptionId;
                if (!subscriptionId) throw new Error("ID da assinatura não encontrado.");

                const expiryParts = String(data['update-expiry']).split('/');
                if (expiryParts.length !== 2) throw new Error("Validade inválida. Use MM/AA");

                const payload = {
                    creditCard: {
                        holderName: data['update-cardName'],
                        number: String(data['update-cardNumber']).replace(/\D/g, ''),
                        expiryMonth: expiryParts[0],
                        expiryYear: '20' + expiryParts[1],
                        ccv: data['update-cvv']
                    },
                    creditCardHolderInfo: {
                        name: data['update-cardName'],
                        email: userData.email,
                        cpfCnpj: String(data['update-cpf']).replace(/\D/g, ''),
                        postalCode: (userData?.profile?.address?.cep || '00000000').replace(/\D/g, ''),
                        addressNumber: userData?.profile?.address?.number || '0',
                        phone: (userData?.profile?.phone || '').replace(/\D/g, '')
                    },
                    remoteIp: '127.0.0.1'
                };

                const res = await fetch(`${API_BASE}/api/asaas/update-subscription-card/${subscriptionId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await res.json();
                if (!res.ok) throw new Error(result.errors?.[0]?.description || 'Erro ao atualizar cartão no Asaas');

                // Atualizar no Firebase
                const last4 = payload.creditCard.number.slice(-4);
                const brand = result.creditCard?.creditCardBrand || 'VISA';
                const newToken = result.creditCardToken || null;
                const userRef = doc(db, 'users', userData.uid || userData.id);

                const updatePayload: Record<string, any> = {
                    'subscription.creditCardLast4': last4,
                    'subscription.creditCardBrand': brand,
                    'paymentMethodDetails.last4': last4,
                    'paymentMethodDetails.expiry': data['update-expiry'],
                    'paymentMethodDetails.brand': brand,
                    updatedAt: new Date().toISOString()
                };

                if (newToken) {
                    updatePayload['subscription.creditCardToken'] = newToken;
                    updatePayload['paymentMethodDetails.token'] = newToken;
                }

                await updateDoc(userRef, updatePayload);

                toaster.create({ title: "Cartão atualizado!", description: "Suas faturas futuras serão cobradas no novo cartão.", type: "success" });

                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            } catch (error: any) {
                console.error('Update card error:', error);
                toaster.create({ title: "Falha na atualização", description: error.message, type: "error" });
                throw new Error('PREVENT_CLOSE');
            }
        }
    });

    // Attach masks manually
    setTimeout(() => {
        const cardNumber = document.getElementById('update-cardNumber') as HTMLInputElement;
        cardNumber?.addEventListener('input', (e: any) => {
            let v = e.target.value.replace(/\D/g, '').substring(0, 16);
            e.target.value = v.replace(/(\d{4})/g, '$1 ').trim();
        });

        const expiry = document.getElementById('update-expiry') as HTMLInputElement;
        expiry?.addEventListener('input', (e: any) => {
            let v = e.target.value.replace(/\D/g, '').substring(0, 4);
            if (v.length > 2) v = v.substring(0, 2) + '/' + v.substring(2);
            e.target.value = v;
        });

        const cpfInput = document.getElementById('update-cpf') as HTMLInputElement;
        cpfInput?.addEventListener('input', (e: any) => {
            let v = e.target.value.replace(/\D/g, '').substring(0, 11);
            if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
            else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{3})/, "$1.$2.$3");
            else if (v.length > 3) v = v.replace(/(\d{3})(\d{3})/, "$1.$2");
            e.target.value = v;
        });
    }, 100);
}
