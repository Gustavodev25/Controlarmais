import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { motion } from 'motion/react';

const testimonials = [
  {
    name: 'Mariana Costa',
    role: 'Empreendedora',
    image: 'https://randomuser.me/api/portraits/women/47.jpg',
    text: 'O Controlar+ mudou completamente como vejo o meu negócio. Finalmente parei de usar planilhas complexas e agora tenho tudo na palma da mão.',
  },
  {
    name: 'Rafael Lima',
    role: 'Desenvolvedor',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    text: 'Design absurdo e muito rápido. A funcionalidade de controle de patrimônio me ajudou a organizar meus investimentos de forma clara.',
  },
  {
    name: 'Juliana Mendes',
    role: 'Designer Autônoma',
    image: 'https://randomuser.me/api/portraits/women/32.jpg',
    text: 'Simplesmente incrível. A interface no modo escuro é um show à parte. Nunca foi tão fácil acompanhar minhas faturas e categorias.',
  },
  {
    name: 'Carlos Eduardo',
    role: 'Médico',
    image: 'https://randomuser.me/api/portraits/men/46.jpg',
    text: 'Testei vários apps, mas a clareza deste dashboard não tem igual. Consigo prever meu saldo do mês em dois cliques.',
  },
  {
    name: 'Fernanda Silva',
    role: 'Estudante',
    image: 'https://randomuser.me/api/portraits/women/44.jpg',
    text: 'Adorei a facilidade de uso. Controlar meus gastos semanais se tornou um hábito natural depois que comecei a usar.',
  },
  {
    name: 'Thiago Alves',
    role: 'Freelancer',
    image: 'https://randomuser.me/api/portraits/men/67.jpg',
    text: 'Finalmente um app que entende a vida de autônomo. Consigo separar entradas e saídas de cada projeto sem esforço.',
  },
  {
    name: 'Ana Paula Rocha',
    role: 'Professora',
    image: 'https://randomuser.me/api/portraits/women/71.jpg',
    text: 'Uso todos os dias. O calendário de gastos me deu uma visão que nenhum outro aplicativo conseguiu entregar.',
  },
  {
    name: 'Lucas Martins',
    role: 'Engenheiro',
    image: 'https://randomuser.me/api/portraits/men/22.jpg',
    text: 'Integração com Open Finance é fantástica. Meus dados chegam automaticamente e eu só preciso categorizar.',
  },
  {
    name: 'Beatriz Souza',
    role: 'Advogada',
    image: 'https://randomuser.me/api/portraits/women/18.jpg',
    text: 'Finalmente consigo ter clareza do meu patrimônio em um só lugar. O controle de imóveis e investimentos é muito completo.',
  },
];

type Testimonial = typeof testimonials[number];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

// Variant definitions — propagate from card → children automatically
const cardVariants = {
  rest: {
    y: 0,
    scaleX: 1,
    scaleY: 1,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.07)',
    boxShadow: '0 18px 52px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.06)',
    transition: {
      type: 'spring' as const,
      stiffness: 260,
      damping: 24,
      mass: 0.9,
    },
  },
  hover: {
    y: -7,
    scaleX: 1.022,
    scaleY: 0.982,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.055)',
    borderColor: 'rgba(255,255,255,0.13)',
    boxShadow: '0 28px 70px rgba(0,0,0,0.46), inset 0 1px 0 rgba(255,255,255,0.09)',
    transition: {
      type: 'spring' as const,
      stiffness: 380,
      damping: 18,
      mass: 0.85,
    },
  },
  tap: {
    y: 0,
    scaleX: 0.984,
    scaleY: 1.03,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.09)',
    boxShadow: '0 10px 30px rgba(0,0,0,0.38), inset 0 1px 0 rgba(255,255,255,0.06)',
    transition: {
      duration: 0.13,
      ease: 'easeOut' as const,
    },
  },
};

const glowVariants = {
  rest: { opacity: 0 },
  hover: {
    opacity: 1,
    transition: { duration: 0.38, ease: 'easeOut' as const },
  },
  tap: { opacity: 0.5 },
};

const avatarVariants = {
  rest: {
    scaleX: 1,
    scaleY: 1,
    borderRadius: 12,
    filter: 'grayscale(14%)',
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 22,
    },
  },
  hover: {
    scaleX: 1.08,
    scaleY: 0.94,
    borderRadius: 18,
    filter: 'grayscale(0%)',
    transition: {
      type: 'spring' as const,
      stiffness: 360,
      damping: 18,
      mass: 0.85,
    },
  },
  tap: {
    scaleX: 0.96,
    scaleY: 1.06,
    borderRadius: 14,
    filter: 'grayscale(0%)',
    transition: { duration: 0.12, ease: 'easeOut' as const },
  },
};

const textVariants = {
  rest: {
    color: 'rgba(255,255,255,0.62)',
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  hover: {
    color: 'rgba(255,255,255,0.82)',
    transition: { duration: 0.32, ease: 'easeOut' as const },
  },
  tap: { color: 'rgba(255,255,255,0.72)' },
};

const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={props.className} style={{ flex: '1 1 0', minWidth: 0, overflow: 'visible' }}>
      <motion.div
        animate={{ translateY: '-50%' }}
        transition={{
          duration: props.duration ?? 10,
          repeat: Infinity,
          ease: 'linear',
          repeatType: 'loop',
        }}
        style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 16 }}
      >
        {[...new Array(2).fill(0).map((_, index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, image, name, role }, i) => (
              <motion.div
                key={`${index}-${i}`}
                variants={cardVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  padding: '22px 22px',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  cursor: 'default',
                }}
              >
                {/* Top glow */}
                <motion.div
                  variants={glowVariants}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 'inherit',
                    pointerEvents: 'none',
                    background: 'radial-gradient(circle at 50% 0%, rgba(255,255,255,0.09), transparent 58%)',
                  }}
                />

                <motion.p
                  variants={textVariants}
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    letterSpacing: '-0.01em',
                    fontWeight: 470,
                    margin: 0,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  "{text}"
                </motion.p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 18,
                  position: 'relative',
                  zIndex: 1,
                }}>
                  <motion.img
                    variants={avatarVariants}
                    width={38}
                    height={38}
                    src={image}
                    alt={name}
                    style={{
                      width: 38,
                      height: 38,
                      objectFit: 'cover',
                      flexShrink: 0,
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    loading="lazy"
                    draggable={false}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{
                      color: 'rgba(255,255,255,0.9)',
                      fontSize: 13.5,
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                    }}>
                      {name}
                    </span>
                    <span style={{
                      color: 'rgba(255,255,255,0.36)',
                      fontSize: 12,
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.2,
                    }}>
                      {role}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </React.Fragment>
        ))]}
      </motion.div>
    </div>
  );
};

const TestimonialsSection = () => {
  return (
    <>
      <style>{`
        #landing-testimonials-section {
          position: relative;
          z-index: 1;
          width: 100%;
          padding: 112px 20px 112px;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
        }

        #landing-testimonials-label {
          margin: 0 0 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.34);
        }

        #landing-testimonials-heading {
          margin: 0 0 56px;
          max-width: 720px;
          text-align: center;
          font-size: clamp(32px, 5.8vw, 62px);
          line-height: 1;
          letter-spacing: -0.055em;
          color: #ffffff;
          font-weight: 760;
          text-wrap: balance;
        }

        #landing-testimonials-columns-wrap {
          position: relative;
          width: 100%;
          max-width: 1080px;
          height: 600px;
          overflow: visible;
          clip-path: inset(0 -80px);
          mask-image: linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%);
          -webkit-mask-image: linear-gradient(to bottom, transparent 0%, #000 14%, #000 86%, transparent 100%);
        }

        #landing-testimonials-columns {
          display: flex;
          gap: 16px;
          height: 100%;
        }

        .testi-col-2 { display: none; }
        .testi-col-3 { display: none; }

        @media (min-width: 768px) {
          .testi-col-2 { display: block; }
        }

        @media (min-width: 1024px) {
          .testi-col-3 { display: block; }
        }

        @media (max-width: 767px) {
          #landing-testimonials-section { padding: 92px 18px 92px; }
          #landing-testimonials-heading { margin-bottom: 40px; }
          #landing-testimonials-columns-wrap { height: 500px; }
        }

        @media (prefers-reduced-motion: reduce) {
          #landing-testimonials-columns-wrap * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      <section id="landing-testimonials-section">
        <p id="landing-testimonials-label">Depoimentos</p>
        <h2 id="landing-testimonials-heading">Amado por quem usa</h2>

        <div id="landing-testimonials-columns-wrap">
          <div id="landing-testimonials-columns">
            <TestimonialsColumn testimonials={firstColumn} duration={15} />
            <TestimonialsColumn testimonials={secondColumn} duration={19} className="testi-col-2" />
            <TestimonialsColumn testimonials={thirdColumn} duration={17} className="testi-col-3" />
          </div>
        </div>
      </section>
    </>
  );
};

let testimonialsReactRoot: Root | null = null;

export function attachTestimonialsLandingListeners() {
  const container = document.getElementById('landing-testimonials-react-root');
  if (!container) return;

  if (testimonialsReactRoot) {
    testimonialsReactRoot.unmount();
  }

  testimonialsReactRoot = createRoot(container);
  testimonialsReactRoot.render(<TestimonialsSection />);
}

export function cleanupTestimonialsLandingListeners() {
  if (testimonialsReactRoot) {
    testimonialsReactRoot.unmount();
    testimonialsReactRoot = null;
  }
}
