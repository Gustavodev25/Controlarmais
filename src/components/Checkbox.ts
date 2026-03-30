interface CheckboxProps {
  id: string;
  label: string;
  required?: boolean;
  variant?: 'default' | 'accent';
  size?: 'default' | 'sm' | 'lg';
  checked?: boolean;
}

export function Checkbox({
  id,
  label,
  required = false,
  variant = 'default',
  size = 'default',
  checked = false
}: CheckboxProps): string {

  // Bordas suaves (soft square): Retornamos para um raio menor para manter o formato quadrado, 
  // mas o suficiente para quebrar a quina viva.
  const sizeClasses = {
    sm: 'w-[18px] h-[18px] rounded-[3px]',
    default: 'w-5 h-5 rounded-[4px]',
    lg: 'w-6 h-6 rounded-[6px]'
  };

  const indicatorSizeClasses = {
    sm: 'w-3 h-3',
    default: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  const variantClasses = {
    default: 'bg-[var(--color-input-bg)] border border-[var(--color-input-border)]', // bg-background border
    accent: 'bg-[var(--color-input-bg)] border-none' // bg-input
  };

  return `
    <div class="flex items-start gap-3 group cursor-pointer select-none">
      <div class="relative flex items-center justify-center shrink-0 ${sizeClasses[size]} mt-0.5">
        <input 
          type="checkbox" 
          id="${id}" 
          name="${id}" 
          ${required ? 'required' : ''} 
          ${checked ? 'checked' : ''}
          class="peer appearance-none w-full h-full outline-none cursor-pointer 
                 transition-all duration-300 ease-out
                 ${variantClasses[variant]}
                 ${sizeClasses[size]} /* Garante que o input respeite as bordas suaves */
                 checked:bg-[#D97757] checked:border-[#D97757]
                 focus-visible:ring-[3px] focus-visible:ring-[#D97757]/20
                 focus-visible:ring-offset-2
                 active:scale-90 
                 disabled:cursor-not-allowed disabled:opacity-50"
        >
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none text-white 
                    opacity-0 scale-50 -rotate-12 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] 
                    peer-checked:opacity-100 peer-checked:scale-100 peer-checked:rotate-0">
          <svg 
            class="${indicatorSizeClasses[size]} stroke-current"
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="4" 
            stroke-linecap="round" 
            stroke-linejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
      </div>
      <label 
        for="${id}" 
        class="text-[var(--color-text-secondary)] text-[10px] font-normal leading-tight cursor-pointer group-hover:text-[var(--color-text)] transition-colors pt-1"
      >
        ${label}
      </label>
    </div>
  `;
}