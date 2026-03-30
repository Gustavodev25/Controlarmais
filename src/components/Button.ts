interface ButtonProps {
  text: string;
  type?: 'button' | 'submit' | 'reset';
  icon?: string;
  id?: string;
}

export function Button({ text, type = 'button', icon, id }: ButtonProps): string {
  // Nota: Adicionamos classes 'disabled:' e englobamos o conteúdo e o loader em divs separadas.
  return `
    <button 
      ${id ? `id="${id}"` : ''}
      type="${type}" 
      class="relative w-full flex items-center justify-center py-2.5 px-5 border border-transparent rounded-lg text-sm font-bold text-white bg-[#D97757] hover:bg-[#E2886A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D97757] focus:ring-offset-[#161616] active:scale-[0.98] transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-[#D97757] disabled:active:scale-100"
    >
      <div class="btn-loader-wrapper absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 scale-50 transition-all duration-200 pointer-events-none">
        <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <div class="btn-content flex items-center justify-center gap-2 transition-opacity duration-200">
        ${icon ? `<span class="btn-icon flex items-center justify-center w-5 h-5">${icon}</span>` : ''}
        <span class="btn-text">${text}</span>
      </div>
    </button>
  `;
}

export function setButtonLoading(button: HTMLButtonElement | null, isLoading: boolean) {
  if (!button) return;

  const contentWrapper = button.querySelector('.btn-content');
  const loaderWrapper = button.querySelector('.btn-loader-wrapper');

  // Controla o estado nativo e atributos de acessibilidade
  button.disabled = isLoading;
  button.setAttribute('aria-busy', isLoading.toString());

  if (isLoading) {
    // Esconde o texto/ícone (mas mantém o espaço físico deles)
    contentWrapper?.classList.add('opacity-0');
    // Mostra o loader com efeito de zoom (scale-100)
    loaderWrapper?.classList.remove('opacity-0', 'scale-50');
    loaderWrapper?.classList.add('opacity-100', 'scale-100');
  } else {
    // Restaura o texto/ícone
    contentWrapper?.classList.remove('opacity-0');
    // Esconde o loader
    loaderWrapper?.classList.add('opacity-0', 'scale-50');
    loaderWrapper?.classList.remove('opacity-100', 'scale-100');
  }
}