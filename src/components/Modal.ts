import gsap from 'gsap';
import { Button, setButtonLoading } from './Button';
import { DynamicIsland } from './DynamicIsland';

let modalStylesAttached = false;
function ensureModalStyles() {
  if (modalStylesAttached) return;
  modalStylesAttached = true;
  const style = `
    .modal-container {
      background: var(--color-surface);
      border-radius: 12px;
      border: 1px solid var(--color-border);
      pointer-events: auto;
    }
    .modal-container .dynamic-island__content {
      flex-direction: column;
      align-items: stretch;
      display: flex;
    }
  `;
  const tag = document.createElement('style');
  tag.textContent = style;
  document.head.appendChild(tag);
}

interface ModalOptions {
  title: string;
  content: string;
  maxWidth?: string;
  onConfirm?: (formData: any) => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  showConfirm?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
  showCloseButton?: boolean;
  canClose?: boolean;
  fieldsPadding?: string;
}

export function Modal({
  title,
  content,
  maxWidth = 'max-w-lg',
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  showCancel = false,
  showConfirm = true,
  showHeader = true,
  showFooter = true,
  showCloseButton = true,
  canClose = true,
  fieldsPadding = 'p-4 sm:p-8'
}: ModalOptions) {
  ensureModalStyles();

  const modalId = `modal-${Math.random().toString(36).substr(2, 9)}`;
  const contentWrapperId = `${modalId}-content-wrapper`;

  const innerContent = `
    ${showHeader ? `
    <div id="${modalId}-header" class="flex items-center justify-between p-4 border-b border-[var(--color-border-light)]">
      <h2 id="${modalId}-title" class="text-[18px] font-semibold text-[var(--color-text)] tracking-tight">${title}</h2>
      ${showCloseButton && canClose ? `
      <button id="${modalId}-close" class="group w-8 h-8 rounded-full flex items-center justify-center text-[var(--color-text-secondary)]/40 hover:text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-all duration-200">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="group-hover:rotate-90 transition-transform duration-300"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
      ` : ''}
    </div>
    ` : ''}

    <form id="${modalId}-form">
      <div id="${modalId}-fields" class="${fieldsPadding} space-y-2">
        ${content}
      </div>

      ${showFooter ? `
      <div id="${modalId}-footer" class="flex gap-3 p-4 sm:p-8 border-t border-[var(--color-border-light)]">
        ${showCancel ? Button({
    text: cancelText,
    id: `${modalId}-cancel`,
    type: 'button'
  }).replace('bg-[#D97757] hover:bg-[#E2886A]', 'bg-[var(--color-surface-hover)] hover:bg-[var(--color-border-light)] !text-[var(--color-text)]') : ''}

        ${showConfirm ? Button({
    text: confirmText,
    id: `${modalId}-submit`,
    type: 'submit'
  }) : ''}
      </div>
      ` : ''}
    </form>
  `;

  const html = `
    <div id="${modalId}-wrapper" class="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div id="${modalId}-backdrop" class="absolute inset-0 backdrop-blur-sm bg-black/10"></div>

      ${DynamicIsland({
        id: modalId,
        content: innerContent,
        contentWrapperId: contentWrapperId,
        className: `modal-container relative w-full ${maxWidth} shadow-2xl my-auto`,
        hidden: true
      })}
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', html);

  const wrapper = document.getElementById(`${modalId}-wrapper`)!;
  const backdrop = document.getElementById(`${modalId}-backdrop`)!;
  const card = document.getElementById(modalId)!;
  const contentEl = document.getElementById(contentWrapperId)!;
  const headerEl = document.getElementById(`${modalId}-header`)!;
  const fieldsEl = document.getElementById(`${modalId}-fields`)!;
  const footerEl = document.getElementById(`${modalId}-footer`);
  const fieldItems = fieldsEl.querySelectorAll(':scope > *');
  const footerBtns = footerEl ? footerEl.querySelectorAll('button') : [];

  let animation: gsap.core.Timeline | null = null;
  let isClosing = false;

  const killAndReset = () => {
    if (animation) { animation.kill(); animation = null; }
  };

  // ─── OPEN — LIQUID DYNAMIC ──────────────────────────────────────────────
  const openModal = () => {
    killAndReset();

    card.classList.remove('dynamic-island--hidden');

    // Initial states
    gsap.set(backdrop, { opacity: 0 });
    gsap.set(card, {
      scaleX: 0.12,
      scaleY: 0.04,
      borderRadius: '100px',
      transformOrigin: '50% 50%',
      boxShadow: '0 0 0 0px rgba(0,0,0,0)'
    });
    gsap.set(contentEl, { opacity: 0, scale: 0.92, y: -8 });
    if (headerEl) gsap.set(headerEl, { opacity: 0, y: -10, filter: 'blur(5px)' });
    gsap.set(fieldItems, { opacity: 0, y: 14, scaleX: 0.95, scaleY: 1.05, filter: 'blur(6px)' });
    if (footerEl) gsap.set(footerEl, { opacity: 0, y: 10, filter: 'blur(4px)' });
    gsap.set(footerBtns, { opacity: 0, scale: 0.9, y: 6 });

    animation = gsap.timeline();

    // 1. Backdrop fade
    animation.to(backdrop, {
      opacity: 1, duration: 0.25, ease: 'power2.out',
    }, 0);

    // 2. Card — 3-phase liquid expansion
    // Phase A: pill estica horizontal (blob shape)
    animation.to(card, {
      scaleX: 1.06, scaleY: 0.55, borderRadius: '30px',
      duration: 0.15, ease: 'power3.out',
    }, 0.04);

    // Phase B: resolve vertical com overshoot
    animation.to(card, {
      scaleX: 0.97, scaleY: 1.04, borderRadius: '22px',
      duration: 0.22, ease: 'power3.out',
    });

    // Phase C: elastic settle
    animation.to(card, {
      scaleX: 1, scaleY: 1, borderRadius: '12px',
      duration: 0.6, ease: 'elastic.out(1.15, 0.42)',
      clearProps: 'transform,borderRadius'
    });

    // 3. Shadow pump — cresce durante expansão
    animation.to(card, {
      boxShadow: '0 24px 48px -12px rgba(0,0,0,0.4), 0 8px 16px -4px rgba(0,0,0,0.2)',
      duration: 0.5, ease: 'power2.out', clearProps: 'boxShadow'
    }, 0.08);

    // 4. Content wrapper materializa
    animation.to(contentEl, {
      opacity: 1, scale: 1, y: 0,
      duration: 0.3, ease: 'power3.out',
    }, 0.18);

    // 5. Header — slide down com blur dissolve
    if (headerEl) {
      animation.to(headerEl, {
        opacity: 1, y: 0, filter: 'blur(0px)',
        duration: 0.28, ease: 'power2.out', clearProps: 'all'
      }, 0.2);

      // Title text liquid morph
      const titleEl = document.getElementById(`${modalId}-title`);
      if (titleEl) {
        gsap.set(titleEl, { opacity: 0, x: -8, filter: 'blur(4px)' });
        animation.to(titleEl, {
          opacity: 1, x: 0, filter: 'blur(0px)',
          duration: 0.3, ease: 'power2.out', clearProps: 'all'
        }, 0.24);
      }

      // Close button pop
      const closeBtn = document.getElementById(`${modalId}-close`);
      if (closeBtn && canClose) {
        gsap.set(closeBtn, { opacity: 0, scale: 0.5, rotation: -45 });
        animation.to(closeBtn, {
          opacity: 1, scale: 1.1, rotation: 5,
          duration: 0.22, ease: 'power3.out'
        }, 0.26);
        animation.to(closeBtn, {
          scale: 1, rotation: 0,
          duration: 0.4, ease: 'elastic.out(1.2, 0.45)', clearProps: 'all'
        });
      }
    }

    // 6. Fields — cascade com squash-stretch individual
    if (fieldItems.length > 0) {
      // Phase A: slide up + decompress
      animation.to(fieldItems, {
        opacity: 1, y: -2, scaleX: 1.01, scaleY: 0.99, filter: 'blur(0px)',
        duration: 0.26, stagger: { each: 0.04, ease: 'power1.in' }, ease: 'power3.out',
      }, 0.24);

      // Phase B: elastic settle
      animation.to(fieldItems, {
        y: 0, scaleX: 1, scaleY: 1,
        duration: 0.45, stagger: { each: 0.03, ease: 'power1.in' },
        ease: 'elastic.out(1.08, 0.48)', clearProps: 'all'
      }, 0.38);
    }

    // 7. Footer — slide up suave
    if (footerEl) {
      animation.to(footerEl, {
        opacity: 1, y: 0, filter: 'blur(0px)',
        duration: 0.25, ease: 'power2.out', clearProps: 'all'
      }, 0.34);
    }

    // 8. Footer buttons — liquid pop
    if (footerBtns.length > 0) {
      animation.to(footerBtns, {
        opacity: 1, scale: 1.05, y: -2,
        duration: 0.22, stagger: 0.04, ease: 'power3.out',
      }, 0.38);
      animation.to(footerBtns, {
        scale: 1, y: 0,
        duration: 0.4, stagger: 0.03, ease: 'elastic.out(1.12, 0.45)', clearProps: 'all'
      });
    }
  };

  // ─── CLOSE — LIQUID DYNAMIC ──────────────────────────────────────────────
  const closeModal = () => {
    if (isClosing) return;
    isClosing = true;
    killAndReset();

    const currentFieldItems = fieldsEl.querySelectorAll(':scope > *');
    const currentFooterBtns = footerEl ? footerEl.querySelectorAll('button') : [];

    animation = gsap.timeline({
      onComplete: () => wrapper.remove(),
    });

    // 1. Footer buttons — shrink with reverse stagger
    if (currentFooterBtns.length > 0) {
      animation.to(currentFooterBtns, {
        opacity: 0, scale: 0.85, y: 8,
        duration: 0.12, stagger: { each: 0.03, from: 'end' }, ease: 'power2.in',
      }, 0);
    }

    // 2. Footer dissolve
    if (footerEl) {
      animation.to(footerEl, {
        opacity: 0, y: 12, filter: 'blur(4px)',
        duration: 0.14, ease: 'power2.in',
      }, 0.04);
    }

    // 3. Fields — reverse cascade with squash
    if (currentFieldItems.length > 0) {
      animation.to(currentFieldItems, {
        opacity: 0, y: 10, scaleX: 0.96, scaleY: 1.04, filter: 'blur(5px)',
        duration: 0.16, stagger: { each: 0.03, from: 'end' }, ease: 'power2.in',
      }, 0.04);
    }

    // 4. Header dissolve with blur
    if (headerEl) {
      const titleEl = document.getElementById(`${modalId}-title`);
      const closeBtn = document.getElementById(`${modalId}-close`);

      if (closeBtn) {
        animation.to(closeBtn, {
          opacity: 0, scale: 0.5, rotation: 45,
          duration: 0.12, ease: 'power3.in',
        }, 0.06);
      }
      if (titleEl) {
        animation.to(titleEl, {
          opacity: 0, x: -8, filter: 'blur(4px)',
          duration: 0.14, ease: 'power2.in',
        }, 0.06);
      }
      animation.to(headerEl, {
        opacity: 0, y: -8, filter: 'blur(5px)',
        duration: 0.14, ease: 'power2.in',
      }, 0.08);
    }

    // 5. Content wrapper compress
    animation.to(contentEl, {
      opacity: 0, scale: 0.92, y: -6,
      duration: 0.16, ease: 'power2.in',
    }, 0.1);

    // 6. Card — 3-phase liquid collapse
    // Phase A: slight horizontal stretch (anticipation)
    animation.to(card, {
      scaleX: 1.03, scaleY: 0.94, borderRadius: '26px',
      duration: 0.1, ease: 'power2.in',
    }, 0.18);

    // Phase B: vertical compress to blob
    animation.to(card, {
      scaleX: 0.85, scaleY: 0.35, borderRadius: '40px',
      boxShadow: '0 4px 12px -4px rgba(0,0,0,0.15)',
      duration: 0.14, ease: 'power3.in',
    });

    // Phase C: collapse to pill
    animation.to(card, {
      scaleX: 0.12, scaleY: 0.04, borderRadius: '100px',
      boxShadow: '0 0 0 0px rgba(0,0,0,0)',
      duration: 0.16, ease: 'back.in(1.8)',
    });

    // 7. Backdrop fade
    animation.to(backdrop, {
      opacity: 0,
      duration: 0.18, ease: 'power2.in',
    }, '-=0.16');
  };

  // ─── LISTENERS ───────────────────────────────────────────────────────────
  if (canClose) {
    document.getElementById(`${modalId}-close`)?.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', onKey);
      }
    });

    if (showCancel) {
      document.getElementById(`${modalId}-cancel`)?.addEventListener('click', closeModal);
    }
  }

  // Password toggles support
  const passwordToggles = wrapper.querySelectorAll('.password-toggle');
  passwordToggles.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-target');
      if (targetId) {
        const input = wrapper.querySelector(`#${targetId}`) as HTMLInputElement;
        if (input) {
          const lottiePlayer = btn.querySelector('.eye-lottie') as any;
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

  const form = document.getElementById(`${modalId}-form`) as HTMLFormElement;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (onConfirm) {
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      const submitBtn = document.getElementById(`${modalId}-submit`) as HTMLButtonElement;
      if (submitBtn) setButtonLoading(submitBtn, true);

      try {
        await onConfirm(data);
        closeModal();
      } catch (error: any) {
        if (error?.message === 'PREVENT_CLOSE') {
          if (submitBtn) setButtonLoading(submitBtn, false);
          return;
        }
        console.error('Modal error:', error);
        if (submitBtn) setButtonLoading(submitBtn, false);
      }
    } else {
      closeModal();
    }
  });

  // Kick off open animation
  openModal();

  const animateLayout = () => {
    const newFieldItems = fieldsEl.querySelectorAll(':scope > *');
    gsap.from(newFieldItems, {
      opacity: 0,
      y: 10,
      duration: 0.3,
      stagger: 0.04,
      ease: 'power2.out'
    });
  };

  return { closeModal, animateLayout };
}