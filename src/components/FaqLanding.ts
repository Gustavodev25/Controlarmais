import gsap from 'gsap';

export function FaqLanding(): string {
  const faqs = [
    {
      q: "Como o Controlar+ garante a segurança dos meus dados?",
      a: "Utilizamos criptografia de ponta a ponta e padrões de segurança bancária para proteger suas informações. Seus dados são somente seus e nunca são compartilhados com terceiros."
    },
    {
      q: "Posso conectar contas de qualquer banco?",
      a: "Atualmente suportamos a maioria dos grandes bancos nacionais e diversas instituições financeiras através do Open Finance. A lista é atualizada constantemente."
    },
    {
      q: "Existe versão do aplicativo para celular?",
      a: "Sim! O Controlar+ já está disponível na App Store para iPhone. A versão para Android está em desenvolvimento."
    },
    {
      q: "Posso cancelar minha assinatura quando quiser?",
      a: "Com certeza. Não possuímos fidelidade ou taxas ocultas. Você pode cancelar sua assinatura a qualquer momento e continuar usando o plano até o fim do ciclo vigente."
    }
  ];

  return `
    <section id="landing-faq-section">
      <h2 id="landing-faq-heading">Perguntas frequentes</h2>
      <div id="landing-faq-list">
        ${faqs.map((faq, i) => `
          <div class="faq-item" data-faq="${i}">
            <button class="faq-question" aria-expanded="false">
              <span class="faq-q-text">${faq.q}</span>
              <span class="faq-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </span>
            </button>
            <div class="faq-answer-wrapper">
              <div class="faq-answer">${faq.a}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

export function attachFaqListeners() {
  const items = document.querySelectorAll<HTMLElement>('.faq-item');

  items.forEach(item => {
    const btn = item.querySelector('.faq-question') as HTMLElement;
    const wrapper = item.querySelector('.faq-answer-wrapper') as HTMLElement;
    const icon = item.querySelector('.faq-icon') as HTMLElement;
    if (!btn || !wrapper) return;

    // Morph hover on question button
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduceMotion) {
      btn.addEventListener('mouseenter', () => {
        gsap.to(item, {
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderColor: 'rgba(255,255,255,0.08)',
          scaleX: 1.012,
          scaleY: 0.992,
          borderRadius: 18,
          duration: 0.4,
          ease: 'elastic.out(0.9, 0.5)',
        });
      });

      btn.addEventListener('mouseleave', () => {
        if (!item.classList.contains('active')) {
          gsap.to(item, {
            backgroundColor: 'rgba(255,255,255,0.015)',
            borderColor: 'rgba(255,255,255,0.05)',
            scaleX: 1,
            scaleY: 1,
            borderRadius: 16,
            duration: 0.55,
            ease: 'elastic.out(0.85, 0.5)',
          });
        }
      });
    }

    btn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all others
      items.forEach(otherItem => {
        if (otherItem === item) return;
        const otherWrapper = otherItem.querySelector('.faq-answer-wrapper') as HTMLElement;
        const otherIcon = otherItem.querySelector('.faq-icon') as HTMLElement;
        if (otherItem.classList.contains('active')) {
          otherItem.classList.remove('active');
          otherItem.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');

          gsap.to(otherWrapper, {
            maxHeight: 0, opacity: 0, duration: 0.3, ease: 'power3.inOut',
          });
          if (otherIcon) {
            gsap.to(otherIcon, { rotation: 0, duration: 0.4, ease: 'elastic.out(1, 0.5)' });
          }
          gsap.to(otherItem, {
            backgroundColor: 'rgba(255,255,255,0.015)',
            borderColor: 'rgba(255,255,255,0.05)',
            scaleX: 1, scaleY: 1, borderRadius: 16,
            duration: 0.5, ease: 'elastic.out(0.85, 0.5)',
          });
        }
      });

      if (!isActive) {
        // Open
        item.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');

        // Measure content height
        wrapper.style.maxHeight = 'none';
        const h = wrapper.scrollHeight;
        wrapper.style.maxHeight = '0px';

        gsap.to(wrapper, {
          maxHeight: h, opacity: 1, duration: 0.45, ease: 'power3.out',
        });

        if (icon) {
          gsap.to(icon, { rotation: 45, duration: 0.5, ease: 'elastic.out(1, 0.45)' });
        }

        // Morph card active state
        gsap.to(item, {
          backgroundColor: 'rgba(255,255,255,0.035)',
          borderColor: 'rgba(255,255,255,0.08)',
          scaleX: 1.008,
          scaleY: 0.996,
          borderRadius: 20,
          duration: 0.55,
          ease: 'elastic.out(0.9, 0.48)',
        });
      } else {
        // Close
        item.classList.remove('active');
        btn.setAttribute('aria-expanded', 'false');

        gsap.to(wrapper, {
          maxHeight: 0, opacity: 0, duration: 0.3, ease: 'power3.inOut',
        });

        if (icon) {
          gsap.to(icon, { rotation: 0, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
        }

        gsap.to(item, {
          backgroundColor: 'rgba(255,255,255,0.015)',
          borderColor: 'rgba(255,255,255,0.05)',
          scaleX: 1, scaleY: 1, borderRadius: 16,
          duration: 0.55,
          ease: 'elastic.out(0.85, 0.5)',
        });
      }
    });
  });
}
