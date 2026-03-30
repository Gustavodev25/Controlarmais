# Liquid Effects na Tela de Autenticação

## 📝 Visão Geral

A tela de autenticação (Login/Signup) agora possui **efeitos dinâmicos de "liquid UI"** que criam uma experiência visual fluida e moderna. Todos os efeitos utilizam **GSAP** (GreenSock Animation Platform) e **CSS animations** para máxima performance.

---

## 🎨 Efeitos Implementados

### 1. **Transição Liquid entre Passos** (GSAP)

Quando você alterna entre Login → Signup ou entre Step 1 → Step 2:

- **Fase 1: Colapso (Close Phase)**
  - Conteúdo desaparece com blur efeito
  - Container comprime com border-radius dinâmico (pill shape)
  - Duração: 250ms

- **Fase 2: Expansão (Open Phase)** - 3 fases
  - **Fase A**: Expansão horizontal (blob shape) - scaleX e border-radius
  - **Fase B**: Ajuste vertical com overshoot suave
  - **Fase C**: Elastic settle com efeito de mola (elastic.out)

```javascript
// Fase A: Horizontal stretch (blob shape)
gsap.to(containerDiv, {
  height: `${newHeight * 1.08}px`,
  borderRadius: '28px',
  duration: 0.15,
  ease: 'power3.out'
})

// Fase B: Vertical adjust
gsap.to(containerDiv, {
  height: `${newHeight * 0.98}px`,
  borderRadius: '20px',
  duration: 0.22,
  ease: 'power3.out'
})

// Fase C: Elastic settle
gsap.to(containerDiv, {
  height: `${newHeight}px`,
  borderRadius: '12px',
  duration: 0.6,
  ease: 'elastic.out(1.15, 0.42)'
})
```

---

### 2. **Cascade de Campos** (CSS + GSAP)

Os campos do formulário aparecem em cascata:

- Cada campo entra com um delay de `0.04s` a `0.05s`
- Animação: `translateX(-20px)` → `translateX(0)` com blur dissolve
- Easing: `cubic-bezier(0.32, 0.72, 0, 1)` (smooth power)
- Stagger automático criando efeito de onda

```css
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px) scaleX(0.9);
    filter: blur(6px);
  }
  to {
    opacity: 1;
    transform: translateX(0) scaleX(1);
    filter: blur(0);
  }
}
```

---

### 3. **Container Glow Pulsante** (CSS Keyframes)

O container da autenticação possui um glow suave que pulsa:

- Animação de sombra (box-shadow) sincronizada a 4s
- Cor laranja (#D97757) com opacidade variável
- Cria sensação de vida e dinamismo
- Desativa-se em scroll para performance

```css
@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(217, 119, 87, 0.1);
  }
  50% {
    box-shadow: 0 0 40px rgba(217, 119, 87, 0.2);
  }
}
```

---

### 4. **Efeito Shimmer nos Botões** (CSS)

Botões de submit possuem um efeito de brilho passando:

- Gradiente linear de direita para esquerda
- Animação suave de 0.5s
- Ativada ao hover
- Cria sensação de fluidez

```css
button[type="submit"]::before {
  content: '';
  position: absolute;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  animation: shimmer 0.5s ease;
}
```

---

### 5. **Focus Liquid Glow nos Inputs** (CSS)

Quando um input recebe foco:

- Box-shadow com múltiplas camadas de glow
- Scale leve (1.01) para sensação de expansão
- Transição suave em 0.3s

```css
input:focus {
  box-shadow: 0 0 0 2px rgba(217, 119, 87, 0.2),
              0 0 20px rgba(217, 119, 87, 0.1);
  transform: scale(1.01);
}
```

---

### 6. **Checkbox Bounce** (CSS)

Checkbox com animação de "bounce" ao ser marcado:

- Escala de 0.8 → 1.15 → 1.0
- Rotação dinâmica (-10° → 5° → 0°)
- Easing: `cubic-bezier(0.68, -0.55, 0.265, 1.55)` (elastic bounce)

```css
@keyframes checkBounce {
  0% { transform: scale(0.8) rotate(-10deg); }
  50% { transform: scale(1.15) rotate(5deg); }
  100% { transform: scale(1) rotate(0deg); }
}
```

---

### 7. **Underline Liquid nos Links** (CSS)

Links com efeito de underline fluido ao hover:

- Linha aparece da esquerda para direita
- Transição em 0.4s com easing cubic
- Cria sensação de fluidez

```css
a::after {
  content: '';
  width: 0;
  height: 2px;
  background: currentColor;
  transition: width 0.4s cubic-bezier(0.32, 0.72, 0, 1);
}

a:hover::after {
  width: 100%;
}
```

---

### 8. **Logo Pop Animation** (CSS)

Logo da marca ao entrar na página:

- Entrada com scale (0.3 → 1.1 → 1.0)
- Rotação dinâmica (-45° → 5° → 0°)
- Easing: bounce (cubic-bezier para simular mola)

```css
@keyframes logoPop {
  0% {
    opacity: 0;
    transform: scale(0.3) rotate(-45deg);
  }
  50% {
    transform: scale(1.1) rotate(5deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}
```

---

### 9. **Grid Form Cascade** (CSS)

Campos em grid (como Step 2 com telefone + nascimento):

- Cada coluna entra em sequência
- Scale suave: 0.95 → 1.0
- Blur dissolve: 5px → 0px
- Delay crescente por ordem

---

### 10. **Button Hover Transform** (CSS)

Botões com hover effects dinâmicos:

- Mudança de cor suave
- Transform no active (scale 0.97)
- Transição em 0.3s
- Efeito visual de "pressão"

---

## ⚙️ Configurações e Customização

### Velocidades das Animações

No arquivo `Auth.ts`, você pode ajustar:

```javascript
// Fase de fechamento (250ms)
await new Promise(r => setTimeout(r, 250));

// Duração das fases de abertura
animation.to(containerDiv, {
  duration: 0.15, // Fase A
})
animation.to(containerDiv, {
  duration: 0.22, // Fase B
})
animation.to(containerDiv, {
  duration: 0.6, // Fase C
})
```

### Cores e Glows

No arquivo `auth.css`, customize:

```css
/* Mudar cor primária do glow */
--glow-color: #D97757; /* Laranja padrão */

/* Ajustar intensidade do blur */
filter: blur(8px); /* Aumentar/diminuir conforme necessário */
```

### Easing Curves

GSAP oferece múltiplas opções de easing:

- `power1.out`, `power2.out`, `power3.out` - Saída suave
- `elastic.out(1.15, 0.42)` - Efeito de mola
- `back.in()` - Efeito de recuo
- `sine.inOut` - Suave e natural

---

## 🎯 Performance

Todas as animações utilizam:

- ✅ **GPU Acceleration**: `will-change: transform, border-radius`
- ✅ **GSAP Timeline**: Otimizado para performance
- ✅ **CSS Animations**: Hardware accelerated
- ✅ **Debounced**: Eventos de entrada aguardam término de animações

### FPS Target

- Desktop: 60 FPS
- Mobile: 30 FPS (graceful degradation)

---

## 📱 Responsividade

Animações se adaptam ao tamanho da tela:

```css
@media (max-width: 640px) {
  /* Animações mais rápidas em mobile */
  duration: 0.4s;
  /* Delays menores */
  animation-delay: 0.02s;
}
```

---

## 🔧 Estrutura do Código

### Arquivos Principais

1. **`src/pages/Auth.ts`** - Lógica principal de autenticação com animações GSAP
2. **`src/styles/auth.css`** - Estilos e animações CSS
3. **`src/main.ts`** - Integração com o fluxo global de autenticação

### Classe `AuthManager`

```javascript
class AuthManager {
  private state: AuthState
  private animation: gsap.core.Timeline

  changeAuthView()     // Anima transição entre views
  toggleAuth()         // Alterna login/signup
  goToPrevStep()       // Volta ao passo anterior
  render()            // Renderiza a interface
}
```

---

## 🎬 Timeline das Animações

### Login → Signup Step 1

```
0ms:     Close phase inicia
200ms:   Conteúdo atualizado
250ms:   Open phase inicia
400ms:   Container termina fase A (stretch)
620ms:   Container termina fase B (overshoot)
1200ms:  Container termina fase C (elastic settle)
         Campos começam a aparecer em cascata
```

---

## 🌈 Tema Light/Dark

Os efeitos se adaptam aos temas:

```css
/* Dark mode (padrão) */
html[data-theme="dark"] {
  /* Cores mais suaves */
  glow: rgba(217, 119, 87, 0.1);
}

/* Light mode */
html[data-theme="light"] {
  /* Cores mais vibrantes */
  glow: rgba(217, 119, 87, 0.2);
}
```

---

## 📊 Resumo dos Efeitos

| Efeito | Tipo | Duração | Trigger |
|--------|------|---------|---------|
| Transição Liquid | GSAP | 1.2s | Mudança de view |
| Cascade Campos | CSS | 0.5s | Carregamento |
| Glow Pulsante | CSS | 4s | Contínuo |
| Shimmer Button | CSS | 0.5s | Hover |
| Focus Glow | CSS | 0.3s | Focus input |
| Checkbox Bounce | CSS | 0.4s | Click |
| Link Underline | CSS | 0.4s | Hover |
| Logo Pop | CSS | 0.8s | Page load |

---

## 🚀 Próximos Passos Opcionais

Para expandir ainda mais os efeitos:

1. **Particle Effects**: Adicionar partículas ao mudar de tela
2. **SVG Morphing**: Morph shapes com SVG para logo
3. **Blur Transitions**: Blur crescente/decrescente sincronizado
4. **Wave Effects**: Ondas no fundo durante animações
5. **Sound Design**: Efeitos sonoros suaves sincronizados

---

## 📚 Referências

- [GSAP Docs](https://greensock.com/gsap/)
- [CSS Animations MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/animation)
- [Easing Functions](https://easings.net/)
- [GPU Performance](https://web.dev/animations-guide/)

---

**Criado com ❤️ para uma experiência de autenticação moderna e fluida.**
