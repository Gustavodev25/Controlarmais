interface InputProps {
  id: string;
  type: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  inputmode?: string;
}

export function Input({ id, type, label, placeholder = '', required = false, value = '', inputmode }: InputProps): string {
  const isPassword = type === 'password';
  return `
    <div class="flex flex-col ${label ? 'gap-2' : ''}">
      ${label ? `<label for="${id}" class="text-[10px] uppercase tracking-[0.15em] text-[var(--color-text-secondary)] font-semibold ml-1">${label}</label>` : ''}
      <div class="relative w-full">
        <input 
          type="${type}" 
          id="${id}" 
          name="${id}" 
          value="${value}"
          ${required ? 'required' : ''}
          ${inputmode ? `inputmode="${inputmode}"` : ''}
          placeholder="${placeholder}"
          class="w-full px-4 py-3 bg-[var(--color-input-bg)] border border-[var(--color-border-light)] rounded-xl text-[13px] text-[var(--color-text)] placeholder-[var(--color-input-placeholder)] focus:outline-none focus:border-[#D97757]/40 focus:ring-4 focus:ring-[#D97757]/5 transition-all duration-300 ${isPassword ? 'pr-10' : ''}"
        >
        ${isPassword ? `
          <button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center transition-colors password-toggle" data-target="${id}">
            <lottie-player src="/assets/lottie/olho.json" style="width: 22px; height: 22px;" speed="1.8" class="eye-lottie opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center brightness-0 invert"></lottie-player>
          </button>
        ` : ''}
      </div>
    </div>
  `;
}