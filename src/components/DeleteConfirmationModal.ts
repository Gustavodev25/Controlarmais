import gsap from 'gsap';
import { Button, setButtonLoading } from './Button';
import { DynamicIsland, animateDynamicIslandEntrance } from './DynamicIsland';

// Inject styles for delete confirmation modal
const MODAL_STYLE_ID = 'delete-confirmation-modal-styles';
const MODAL_CSS = `
  .delete-confirmation-modal {
    flex-direction: column;
    align-items: stretch !important;
    gap: 0 !important;
  }
  .delete-confirmation-modal .dynamic-island__content {
    flex-direction: column !important;
    align-items: stretch !important;
    gap: 0 !important;
  }
`;

function ensureModalStyles(): void {
  if (document.getElementById(MODAL_STYLE_ID)) return;
  const tag = document.createElement('style');
  tag.id = MODAL_STYLE_ID;
  tag.textContent = MODAL_CSS;
  document.head.appendChild(tag);
}

interface DeleteConfirmationModalProps {
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
}

export function DeleteConfirmationModal({
  title,
  description,
  onConfirm
}: DeleteConfirmationModalProps) {
  ensureModalStyles();

  const modalId = `delete-modal-${Math.random().toString(36).substr(2, 9)}`;
  const contentWrapperId = `${modalId}-content-wrapper`;

  const innerContent = `
    <div class="px-5 py-3 border-b border-[var(--color-border-light)]">
      <p class="text-[11px] font-semibold tracking-[0.12em] uppercase text-[var(--color-text-secondary)]">${title}</p>
    </div>

    <div class="px-5 py-5 flex flex-col items-start gap-4">
      <!-- Content -->
      <div class="flex flex-col gap-1 w-full">
        <p class="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
          ${description}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-3 w-full mt-2" id="${modalId}-actions">
        ${Button({
    text: 'Cancelar',
    id: `${modalId}-cancel`,
    type: 'button'
  })}
        ${Button({
    text: 'Excluir',
    id: `${modalId}-confirm`,
    type: 'button'
  })}
      </div>
    </div>
  `;

  const html = `
    <div id="${modalId}-wrapper" class="fixed inset-x-0 bottom-0 z-[9999] flex flex-col justify-end items-center pointer-events-none p-4 pb-12 sm:pb-16">
      <!-- Backdrop (Transparent) -->
      <div id="${modalId}-backdrop" class="absolute inset-0 bg-transparent opacity-0 pointer-events-auto"></div>

      <!-- DynamicIsland Card -->
      ${DynamicIsland({
        id: modalId,
        content: innerContent,
        contentWrapperId: contentWrapperId,
        className: 'delete-confirmation-modal relative w-full max-w-[400px] shadow-xl pointer-events-auto',
        style: 'max-width: 400px; margin: 0 auto;',
        hidden: true
      })}
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  const wrapper = document.getElementById(`${modalId}-wrapper`)!;
  const backdrop = document.getElementById(`${modalId}-backdrop`)!;
  const card = document.getElementById(modalId)!;
  const content = document.getElementById(contentWrapperId)!;
  const cancelBtn = document.getElementById(`${modalId}-cancel`) as HTMLButtonElement;
  const confirmBtn = document.getElementById(`${modalId}-confirm`) as HTMLButtonElement;

  // Setup Buttons
  if (cancelBtn) {
    cancelBtn.classList.add('flex-1');
    cancelBtn.classList.remove('bg-[#D97757]', 'hover:bg-[#E2886A]');
    cancelBtn.classList.add('bg-[var(--color-surface-hover)]', 'hover:bg-[var(--color-border-light)]', '!text-[var(--color-text)]');
    cancelBtn.addEventListener('click', () => close());
  }

  if (confirmBtn) {
    confirmBtn.classList.add('flex-1');
    confirmBtn.classList.remove('bg-[#D97757]', 'hover:bg-[#E2886A]');
    confirmBtn.classList.add('bg-red-500', 'hover:bg-red-600', 'shadow-red-500/20');
    confirmBtn.addEventListener('click', async () => {
      setButtonLoading(confirmBtn, true);
      try {
        await onConfirm();
        close();
      } catch (error) {
        console.error(error);
        setButtonLoading(confirmBtn, false);
        // Shake card on error
        gsap.fromTo(
          card,
          { x: -8 },
          { x: 0, duration: 0.4, ease: 'elastic.out(4, 0.3)' }
        );
      }
    });
  }

  backdrop.addEventListener('click', () => close());

  // Close Animation
  const close = (onComplete?: () => void) => {
    const closeTl = gsap.timeline({
      onComplete: () => {
        wrapper.remove();
        if (onComplete) onComplete();
      }
    });

    // Content dissolves first
    closeTl.to(content, {
      opacity: 0,
      scale: 0.9,
      y: 8,
      duration: 0.14,
      ease: 'power2.in',
    });

    // Card implodes
    closeTl.to(card, {
      scaleX: 0.8,
      scaleY: 0.8,
      y: 24,
      borderRadius: '16px',
      opacity: 0,
      duration: 0.28,
      ease: 'back.in(2)'
    }, '-=0.06');

    // Backdrop fades out
    closeTl.to(backdrop, {
      opacity: 0,
      duration: 0.2
    }, '-=0.2');
  };

  // Open Animation
  const open = () => {
    // Fade in backdrop
    gsap.to(backdrop, {
      opacity: 1,
      duration: 0.2
    });

    // Show card and animate entrance
    card.classList.remove('dynamic-island--hidden');
    animateDynamicIslandEntrance(modalId, contentWrapperId);
  };

  // ─── Kick off ────────────────────────────────────────────────────────────────
  open();
}
