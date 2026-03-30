import { Modal } from '../../components/Modal';

export function openInvoiceModal(invoice: any) {
  const formattedDate = new Date(invoice.date?.seconds * 1000 || invoice.date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const isStripeInvoice = invoice?.provider === 'stripe' || invoice?.stripeInvoiceId;

  const statusMap: Record<string, { label: string; color: string }> = {
    CONFIRMED: { label: 'Confirmado', color: '#2dd4a0' },
    RECEIVED: { label: 'Recebido', color: '#2dd4a0' },
    PAID: { label: 'Pago', color: '#2dd4a0' },
    PENDING: { label: 'Pendente', color: '#facc15' },
    OPEN: { label: 'Em aberto', color: '#facc15' },
    OVERDUE: { label: 'Vencido', color: '#f87171' },
    DUNNING: { label: 'Em cobranca', color: '#fb923c' },
    UNCOLLECTIBLE: { label: 'Inadimplente', color: '#f87171' },
    VOID: { label: 'Cancelada', color: '#94a3b8' },
  };

  const normalizedStatus = String(invoice.status || '').toUpperCase();
  const status = statusMap[normalizedStatus] || { label: invoice.status || 'Processado', color: '#94a3b8' };

  const content = `
    <div class="flex flex-col">
      <div class="flex items-center justify-between py-6 px-[32px] border-b border-[var(--color-border-light)]">
        <div>
          <p class="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5">Status do Pagamento</p>
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" style="background: ${status.color}; box-shadow: 0 0 8px ${status.color}44;"></span>
            <span class="text-[14px] font-medium text-[var(--color-text)]">${status.label}</span>
          </div>
        </div>
        <div class="text-right">
          <p class="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5">Valor Total</p>
          <p class="text-[20px] font-semibold text-[var(--color-text)] font-mono">R$ ${invoice.amount || invoice.valor || invoice.total || (invoice.value ? String(invoice.value).replace('.', ',') : '0,00')}</p>
        </div>
      </div>

      <div class="p-[32px] space-y-6">
        <div class="grid grid-cols-2 gap-y-6">
          <div>
            <p class="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5">Data da Fatura</p>
            <p class="text-[13px] text-[var(--color-text)] font-medium font-mono">${formattedDate}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5">ID da Transacao</p>
            <p class="text-[13px] text-[var(--color-text)] font-mono opacity-60">${invoice.id?.substring(0, 12).toUpperCase()}...</p>
          </div>
          <div class="col-span-2 pb-2">
            <p class="text-[10px] uppercase tracking-widest text-[var(--color-text-secondary)] mb-1.5">Descricao</p>
            <p class="text-[13px] text-[var(--color-text)] leading-relaxed">${invoice.description || 'Assinatura Plano Pro - Controlar+'}</p>
          </div>
        </div>

        <div class="bg-[var(--color-surface-hover)] p-6 rounded-2xl border border-[var(--color-border-light)]/40">
          <div class="flex items-center justify-between gap-4">
            <div class="flex-1">
              <p class="text-[12px] font-medium text-[var(--color-text)] mb-0.5">Pagamento Seguro</p>
              <p class="text-[11px] text-[var(--color-text-secondary)] leading-tight opacity-70">
                ${isStripeInvoice ? 'Processado via Stripe Billing e Checkout hospedado.' : 'Processado via infraestrutura certified Asaas v3.'}
              </p>
            </div>
            <div class="shrink-0 flex items-center">
              ${isStripeInvoice ? 
                '<img src="/assets/logo/stripe.png" alt="Stripe" class="h-10 object-contain opacity-100 brightness-110 rounded-[6px]" />' : 
                '<span class="text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)] opacity-70">Asaas</span>'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  Modal({
    title: 'Detalhes da Fatura',
    content,
    showFooter: false,
    showCloseButton: true,
    fieldsPadding: 'p-0'
  });
}
