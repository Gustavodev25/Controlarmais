import gsap from 'gsap';

// ── Bancos digitais/populares fixos (curadoria manual) ──
const BANKS = [
  { name: 'Nubank', imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/212.svg' },
  { name: 'Inter', imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/215.svg' },
  { name: 'C6 Bank', imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/726.svg' },
  { name: 'Itaú', imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/201.svg' },
  { name: 'Bradesco', imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/203.svg' },
  { name: 'Banco do Brasil', imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/211.svg' },
  { name: 'Santander', imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/208.svg' },
  { name: 'BTG Pactual', imageUrl: 'https://cdn.pluggy.ai/assets/connector-icons/214.svg' },
];

let carouselAnimationId: number | null = null;
let carouselCleanupFns: Array<() => void> = [];

export function BankCarouselLanding(): string {
  const items = BANKS.map((bank) => `
    <div class="bank-carousel-item" title="${bank.name}" aria-label="${bank.name}">
      <div class="bank-carousel-logo-shell">
        <img
          src="${bank.imageUrl}"
          alt="${bank.name}"
          loading="lazy"
          draggable="false"
          onerror="this.closest('.bank-carousel-item').style.display='none';"
        />
      </div>
    </div>
  `).join('');

  return `
    <style>
      #landing-bank-carousel-section {
        position: relative;
        z-index: 1;
        width: 100%;
        padding: 64px 0 0;
        overflow: hidden;
      }

      .bank-carousel-label {
        text-align: center;
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.28);
        letter-spacing: 0.045em;
        margin: 0 0 28px;
      }

      .bank-carousel-track-wrapper {
        position: relative;
        width: 100%;
        overflow: hidden;
        padding: 12px 0 18px;

        mask-image: linear-gradient(
          to right,
          transparent 0%,
          rgba(0, 0, 0, 0.01) 2%,
          rgba(0, 0, 0, 0.04) 5%,
          rgba(0, 0, 0, 0.10) 8%,
          rgba(0, 0, 0, 0.20) 12%,
          rgba(0, 0, 0, 0.35) 17%,
          rgba(0, 0, 0, 0.55) 22%,
          rgba(0, 0, 0, 0.78) 28%,
          #000 35%,
          #000 65%,
          rgba(0, 0, 0, 0.78) 72%,
          rgba(0, 0, 0, 0.55) 78%,
          rgba(0, 0, 0, 0.35) 83%,
          rgba(0, 0, 0, 0.20) 88%,
          rgba(0, 0, 0, 0.10) 92%,
          rgba(0, 0, 0, 0.04) 95%,
          rgba(0, 0, 0, 0.01) 98%,
          transparent 100%
        );
        -webkit-mask-image: linear-gradient(
          to right,
          transparent 0%,
          rgba(0, 0, 0, 0.01) 2%,
          rgba(0, 0, 0, 0.04) 5%,
          rgba(0, 0, 0, 0.10) 8%,
          rgba(0, 0, 0, 0.20) 12%,
          rgba(0, 0, 0, 0.35) 17%,
          rgba(0, 0, 0, 0.55) 22%,
          rgba(0, 0, 0, 0.78) 28%,
          #000 35%,
          #000 65%,
          rgba(0, 0, 0, 0.78) 72%,
          rgba(0, 0, 0, 0.55) 78%,
          rgba(0, 0, 0, 0.35) 83%,
          rgba(0, 0, 0, 0.20) 88%,
          rgba(0, 0, 0, 0.10) 92%,
          rgba(0, 0, 0, 0.04) 95%,
          rgba(0, 0, 0, 0.01) 98%,
          transparent 100%
        );

        will-change: opacity, transform, filter;
      }

      .bank-carousel-track {
        display: flex;
        align-items: center;
        gap: 58px;
        width: max-content;
        will-change: transform;
        transform: translate3d(0, 0, 0);
      }

      .bank-carousel-item {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 54px;
        height: 54px;
        opacity: 0.5;
        transform-origin: center center;
        will-change: transform, opacity, filter;
        -webkit-tap-highlight-color: transparent;
      }

      .bank-carousel-logo-shell {
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;

        /* fundo removido */
        background: transparent;
        border: 0;
        box-shadow: none;

        transform-origin: center center;
        will-change: transform;
      }

      .bank-carousel-item img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: block;
        user-select: none;
        pointer-events: none;

        /* border radius direto na imagem do banco */
        border-radius: 15px;
      }

      @media (max-width: 768px) {
        #landing-bank-carousel-section {
          padding: 48px 0 0;
        }

        .bank-carousel-label {
          font-size: 11.5px;
          margin-bottom: 22px;
          padding: 0 20px;
        }

        .bank-carousel-track {
          gap: 46px;
        }

        .bank-carousel-item {
          width: 46px;
          height: 46px;
        }

        .bank-carousel-logo-shell {
          width: 44px;
          height: 44px;
        }

        .bank-carousel-item img {
          border-radius: 13px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .bank-carousel-track,
        .bank-carousel-track-wrapper,
        .bank-carousel-item,
        .bank-carousel-logo-shell {
          transform: none !important;
          filter: none !important;
          animation: none !important;
        }
      }
    </style>

    <section id="landing-bank-carousel-section" aria-label="Bancos compatíveis com o Controlar Plus">
      <p class="bank-carousel-label">Conecte com os principais bancos do Brasil</p>

      <div class="bank-carousel-track-wrapper" id="bank-carousel-track-wrapper">
        <div id="bank-carousel-track" class="bank-carousel-track">
          ${items}${items}${items}${items}
        </div>
      </div>
    </section>
  `;
}

function startInfiniteScroll(track: HTMLElement) {
  if (carouselAnimationId !== null) {
    cancelAnimationFrame(carouselAnimationId);
    carouselAnimationId = null;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  // mais lento e mais premium
  const speed = window.innerWidth < 768 ? 0.14 : 0.18;

  let offset = 0;
  let singleWidth = 0;

  const updateWidth = () => {
    const itemsNodes = track.querySelectorAll('.bank-carousel-item');

    if (itemsNodes.length >= BANKS.length * 2) {
      const firstItem = itemsNodes[0] as HTMLElement;
      const nextSetFirstItem = itemsNodes[BANKS.length] as HTMLElement;
      singleWidth = nextSetFirstItem.offsetLeft - firstItem.offsetLeft;
    } else {
      singleWidth = track.scrollWidth / 2;
    }
  };

  updateWidth();

  const onResize = () => {
    updateWidth();
  };

  window.addEventListener('resize', onResize);

  carouselCleanupFns.push(() => {
    window.removeEventListener('resize', onResize);
  });

  function animate() {
    if (!document.body.contains(track)) {
      carouselAnimationId = null;
      return;
    }

    if (singleWidth > 0) {
      offset -= speed;

      if (Math.abs(offset) >= singleWidth) {
        offset += singleWidth;
      }

      gsap.set(track, {
        x: offset,
        force3D: true,
      });
    }

    carouselAnimationId = requestAnimationFrame(animate);
  }

  carouselAnimationId = requestAnimationFrame(animate);
}

function animateCarouselEntrance() {
  const wrapper = document.getElementById('bank-carousel-track-wrapper');
  const label = document.querySelector<HTMLElement>('.bank-carousel-label');
  const items = gsap.utils.toArray<HTMLElement>('.bank-carousel-item');
  const shells = gsap.utils.toArray<HTMLElement>('.bank-carousel-logo-shell');

  if (!wrapper || items.length === 0) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduceMotion) {
    gsap.set([wrapper, label, ...items], {
      opacity: 1,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      filter: 'none',
    });
    return;
  }

  gsap.set(label, {
    opacity: 0,
    y: 12,
    filter: 'blur(6px)',
  });

  gsap.set(wrapper, {
    opacity: 0,
    y: 18,
    scaleX: 0.96,
    scaleY: 1.05,
    filter: 'blur(10px)',
  });

  gsap.set(items, {
    opacity: 0,
    y: 18,
    scaleX: 0.72,
    scaleY: 1.18,
    filter: 'blur(8px)',
  });

  const tl = gsap.timeline({
    defaults: {
      overwrite: 'auto',
    },
  });

  tl.to(label, {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    duration: 0.48,
    ease: 'power3.out',
  });

  tl.to(
    wrapper,
    {
      opacity: 1,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      filter: 'blur(0px)',
      duration: 0.88,
      ease: 'elastic.out(0.9, 0.52)',
    },
    '-=0.22'
  );

  tl.to(
    items,
    {
      opacity: 0.5,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      filter: 'blur(0px)',
      duration: 0.82,
      ease: 'elastic.out(0.92, 0.5)',
      stagger: {
        each: 0.035,
        from: 'center',
      },
      clearProps: 'filter',
    },
    '-=0.56'
  );

  shells.forEach((shell, index) => {
    gsap.to(shell, {
      y: index % 2 === 0 ? -3 : 3,
      scale: index % 3 === 0 ? 1.065 : 1.035,
      duration: 3.2 + index * 0.08,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: index * 0.08,
    });
  });

  items.forEach((item, index) => {
    gsap.to(item, {
      opacity: index % 2 === 0 ? 0.64 : 0.44,
      duration: 2.8 + index * 0.06,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: index * 0.05,
    });
  });
}

function setupCarouselHover() {
  const items = gsap.utils.toArray<HTMLElement>('.bank-carousel-item');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  items.forEach((item) => {
    const shell = item.querySelector<HTMLElement>('.bank-carousel-logo-shell');
    if (!shell) return;

    const onEnter = () => {
      gsap.killTweensOf([item, shell]);

      gsap.to(item, {
        opacity: 0.95,
        scaleX: 1.16,
        scaleY: 0.94,
        y: -5,
        duration: 0.48,
        ease: 'elastic.out(0.9, 0.42)',
      });

      gsap.to(shell, {
        scale: 1.08,
        duration: 0.52,
        ease: 'elastic.out(0.9, 0.42)',
      });
    };

    const onLeave = () => {
      gsap.killTweensOf([item, shell]);

      gsap.to(item, {
        opacity: 0.5,
        scaleX: 1,
        scaleY: 1,
        y: 0,
        duration: 0.76,
        ease: 'elastic.out(0.82, 0.5)',
      });

      gsap.to(shell, {
        scale: 1,
        duration: 0.76,
        ease: 'elastic.out(0.82, 0.5)',
      });
    };

    const onPointerDown = () => {
      gsap.to(item, {
        scaleX: 0.9,
        scaleY: 1.13,
        duration: 0.12,
        ease: 'power3.out',
      });
    };

    const onPointerUp = () => {
      onEnter();
    };

    item.addEventListener('mouseenter', onEnter);
    item.addEventListener('mouseleave', onLeave);
    item.addEventListener('pointerdown', onPointerDown);
    item.addEventListener('pointerup', onPointerUp);
    item.addEventListener('pointercancel', onLeave);

    carouselCleanupFns.push(() => {
      item.removeEventListener('mouseenter', onEnter);
      item.removeEventListener('mouseleave', onLeave);
      item.removeEventListener('pointerdown', onPointerDown);
      item.removeEventListener('pointerup', onPointerUp);
      item.removeEventListener('pointercancel', onLeave);
    });
  });
}

export function attachBankCarouselListeners() {
  cleanupBankCarousel();

  const track = document.getElementById('bank-carousel-track');
  if (!track) return;

  animateCarouselEntrance();
  setupCarouselHover();

  requestAnimationFrame(() => {
    startInfiniteScroll(track);
  });
}

export function cleanupBankCarousel() {
  if (carouselAnimationId !== null) {
    cancelAnimationFrame(carouselAnimationId);
    carouselAnimationId = null;
  }

  carouselCleanupFns.forEach((cleanup) => cleanup());
  carouselCleanupFns = [];

  gsap.killTweensOf([
    '#bank-carousel-track',
    '#bank-carousel-track-wrapper',
    '.bank-carousel-label',
    '.bank-carousel-item',
    '.bank-carousel-logo-shell',
  ]);
}
