interface OTPInputOptions {
    id?: string;
    length?: number;
}

export function OTPInput({ id = 'otp-container', length = 6 }: OTPInputOptions = {}) {
    return `
        <style>
            .otp-container {
                display: flex;
                gap: 12px;
                margin: 32px 0;
                justify-content: center;
                width: 100%;
            }
            .otp-slot {
                position: relative;
                width: 52px;
                height: 64px;
                background: var(--color-surface);
                border: 1px solid var(--color-border);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: text;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                overflow: hidden;
            }
            .otp-slot:hover {
                background: var(--color-surface-hover);
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            }
            /* Estado de Foco */
            .otp-slot.focused { 
                border-color: var(--color-text);
                background: var(--color-background);
                box-shadow: 0 0 0 2px var(--color-text); 
                transform: translateY(-2px);
            }
            /* Estado de Erro */
            .otp-slot.error {
                border-color: #EF4444;
                box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.3);
                background: rgba(239, 68, 68, 0.05);
                animation: otp-shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
            }
            /* Estado de Sucesso */
            .otp-slot.success { 
                border-color: #10B981; 
                box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
                background: rgba(16, 185, 129, 0.05);
            }

            @keyframes otp-shake {
                10%, 90% { transform: translate3d(-1px, 0, 0); }
                20%, 80% { transform: translate3d(2px, 0, 0); }
                30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                40%, 60% { transform: translate3d(4px, 0, 0); }
            }

            .otp-input-hidden {
                position: absolute;
                inset: 0;
                width: 100%; 
                height: 100%;
                opacity: 0;
                cursor: text;
                font-size: 16px;
                z-index: 2;
                caret-color: transparent; /* Esconde o cursor padrão */
                padding: 0; 
                margin: 0;
            }
            .otp-input-hidden:focus { outline: none; }

            .otp-digit {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 3;
                pointer-events: none;
                font-family: 'DM Mono', 'Fira Code', ui-monospace, monospace;
                font-size: 24px;
                font-weight: 500;
                color: var(--color-text);
                line-height: 1;
                text-align: center;
                transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
            }

            .otp-slot.has-value .otp-digit {
                transform: translate(-50%, -50%) scale(1.1);
            }

            .otp-cursor {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                z-index: 3;
                width: 2px;
                height: 28px;
                background: var(--color-text);
                pointer-events: none;
                display: none;
                border-radius: 4px;
                animation: otp-blink 1s step-start infinite;
            }
            
            @keyframes otp-blink {
                50% { opacity: 0; }
            }
            
            .otp-slot.focused:not(.has-value) .otp-cursor { display: block; }
        </style>

        <div class="otp-container" id="${id}" role="group" aria-label="Código de verificação">
            ${Array.from({ length }).map((_, i) => `
                <div class="otp-slot" data-index="${i}">
                    <input
                        type="text"
                        inputmode="numeric"
                        autocomplete="${i === 0 ? 'one-time-code' : 'off'}"
                        maxlength="1"
                        class="otp-input-hidden"
                        aria-label="Dígito ${i + 1} de ${length}"
                        pattern="\\d*"
                    />
                    <span class="otp-digit"></span>
                    <div class="otp-cursor"></div>
                </div>
            `).join('')}
        </div>
    `;
}

export function attachOTPEvents(
    containerId: string,
    onComplete?: (code: string) => void,
) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const slots = container.querySelectorAll('.otp-slot') as NodeListOf<HTMLDivElement>;
    const inputs = container.querySelectorAll('.otp-input-hidden') as NodeListOf<HTMLInputElement>;
    let isCompleting = false;

    function getCode(): string {
        return Array.from(inputs).map(i => i.value).join('');
    }

    function renderDigit(idx: number, value: string) {
        if (!slots[idx]) return;
        const slot = slots[idx];
        const digitEl = slot.querySelector('.otp-digit') as HTMLElement;
        if (digitEl) digitEl.textContent = value;
        slot.classList.toggle('has-value', !!value);
    }

    function setFocus(idx: number) {
        slots.forEach((s, i) => s.classList.toggle('focused', i === idx));
    }

    function triggerSuccess() {
        slots.forEach(slot => {
            slot.classList.remove('error');
            slot.classList.add('success');
        });
    }

    function triggerError() {
        slots.forEach(slot => {
            slot.classList.remove('error', 'success');
            void slot.offsetWidth; // Force reflow
            slot.classList.add('error');
            setTimeout(() => slot.classList.remove('error'), 400);
        });
    }

    function checkCompletion() {
        const code = getCode();
        if (code.length === inputs.length && onComplete && !isCompleting) {
            isCompleting = true;
            setTimeout(() => {
                triggerSuccess();
                onComplete(code);
                isCompleting = false;
            }, 50);
        } else if (code.length < inputs.length) {
            slots.forEach(s => s.classList.remove('success', 'error'));
        }
    }

    // Eventos
    slots.forEach((slot, idx) => {
        slot.addEventListener('click', () => {
            // Find the correct input to focus when slot is visually clicked
            const firstEmptyIdx = Array.from(inputs).findIndex(input => !input.value);
            const targetIdx = firstEmptyIdx === -1 ? inputs.length - 1 : Math.min(idx, firstEmptyIdx);
            inputs[targetIdx].focus();
        });
    });

    inputs.forEach((input, idx) => {
        if (idx === 0) {
            setTimeout(() => input.focus(), 100);
        }

        input.addEventListener('focus', () => {
            slots.forEach(s => s.classList.remove('error', 'success'));
            setFocus(idx);
            
            if (input.value) {
                input.select();
            }
        });

        input.addEventListener('blur', () => slots[idx].classList.remove('focused'));

        input.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Backspace') {
                if (input.value) {
                    input.value = '';
                    renderDigit(idx, '');
                } else if (idx > 0) {
                    inputs[idx - 1].value = '';
                    renderDigit(idx - 1, '');
                    inputs[idx - 1].focus();
                }
                checkCompletion();
                e.preventDefault();
            }
            if (e.key === 'ArrowLeft' && idx > 0) {
                inputs[idx - 1].focus();
                e.preventDefault();
            }
            if (e.key === 'ArrowRight' && idx < inputs.length - 1) {
                inputs[idx + 1].focus();
                e.preventDefault();
            }
        });

        input.addEventListener('input', (e: Event) => {
            const raw = (e.target as HTMLInputElement).value;

            if (raw.length <= 1) {
                if (raw && !/^\d$/.test(raw)) {
                    input.value = '';
                    renderDigit(idx, '');
                    return;
                }

                renderDigit(idx, raw);

                if (raw && idx < inputs.length - 1) {
                    inputs[idx + 1].focus();
                }
                checkCompletion();
                return;
            }

            // Fallback for auto-fill or multi-character input
            const digits = raw.replace(/\D/g, '').slice(0, inputs.length).split('');
            input.value = digits[0] || '';
            renderDigit(idx, input.value);
            
            digits.forEach((char, i) => {
                if (inputs[idx + i]) {
                    inputs[idx + i].value = char;
                    renderDigit(idx + i, char);
                }
            });

            const nextIdx = Math.min(idx + digits.length, inputs.length - 1);
            inputs[nextIdx]?.focus();

            checkCompletion();
        });

        input.addEventListener('paste', (e: ClipboardEvent) => {
            e.preventDefault();
            const pastedText = e.clipboardData?.getData('text') ?? '';
            const digits = pastedText.replace(/\D/g, '').slice(0, inputs.length).split('');

            if (digits.length === 0) return;

            inputs.forEach((inp, i) => {
                const char = digits[i] || '';
                inp.value = char;
                renderDigit(i, char);
            });

            const nextIdx = Math.min(digits.length, inputs.length - 1);
            inputs[nextIdx]?.focus();

            checkCompletion();
        });
    });

    return { triggerError, triggerSuccess };
}