export type ToastType = "message" | "success" | "warning" | "error";

export interface ToastOptions {
    title: string;
    description?: string;
    type?: ToastType;
    duration?: number;
}

interface Toast extends ToastOptions {
    id: number;
    measuredHeight?: number;
    timeout?: ReturnType<typeof setTimeout>;
    element?: HTMLElement;
}

const toasts: Toast[] = [];
let toastId = 0;
let container: HTMLDivElement | null = null;
let isHovered = false;

function mountContainer() {
    if (container) return;
    container = document.createElement("div");
    // Centered at bottom with increased horizontal width
    container.className = "fixed bottom-5 left-1/2 -translate-x-1/2 z-[10000] pointer-events-none w-[calc(100vw-2rem)] max-w-[400px] flex flex-col justify-end";
    document.body.appendChild(container);

    const innerContainer = document.createElement("div");
    innerContainer.className = "relative pointer-events-auto w-full transition-all duration-300 ease-[cubic-bezier(0.25,0.75,0.6,0.98)]";
    innerContainer.id = "toast-inner-container";
    container.appendChild(innerContainer);

    innerContainer.addEventListener('mouseenter', () => {
        isHovered = true;
        updateTransforms();
    });
    innerContainer.addEventListener('mouseleave', () => {
        isHovered = false;
        updateTransforms();
    });
}

function updateTransforms() {
    if (!container) return;
    const innerContainer = container.querySelector('#toast-inner-container') as HTMLElement;
    if (!innerContainer) return;

    const visibleToasts = toasts.slice(Math.max(0, toasts.length - 3));

    let containerHeight = 0;
    visibleToasts.forEach((t) => {
        containerHeight += (t.measuredHeight || 80);
    });
    container.style.height = `${containerHeight}px`;
    innerContainer.style.height = `${containerHeight}px`;

    toasts.forEach((toast, index) => {
        if (!toast.element) return;
        const isVisible = index >= toasts.length - 3;
        const length = toasts.length;

        if (isVisible) {
            toast.element.style.opacity = "1";
            toast.element.style.pointerEvents = "auto";
        } else {
            toast.element.style.opacity = "0";
            toast.element.style.pointerEvents = "none";
        }

        if (index === length - 1) {
            toast.element.style.transform = "translate3d(0, 0, 0) scale(1)";
        } else {
            const offset = length - 1 - index;
            let translateY = toasts[length - 1]?.measuredHeight || 80;
            for (let i = length - 1; i > index; i--) {
                if (isHovered) {
                    translateY += (toasts[i - 1]?.measuredHeight || 80) + 16;
                } else {
                    translateY += 16;
                }
            }
            const z = -offset * 50;
            const scale = isHovered ? 1 : (1 - 0.05 * offset);
            toast.element.style.transform = `translate3d(0, calc(100% - ${translateY}px), ${z}px) scale(${scale})`;
        }
    });
}

function removeToast(id: number) {
    const index = toasts.findIndex(t => t.id === id);
    if (index !== -1) {
        const toast = toasts[index];
        if (toast.element && toast.element.parentElement) {
            // Fade out
            toast.element.style.opacity = "0";
            toast.element.style.transform = `translate3d(0, ${toast.element.style.transform.includes('calc') ? toast.element.style.transform.split(',')[1] : '0px'}, 0) scale(0.90)`;
            setTimeout(() => {
                if (toast.element && toast.element.parentElement) {
                    toast.element.parentElement.removeChild(toast.element);
                }
            }, 300);
        }
        if (toast.timeout) clearTimeout(toast.timeout);
        toasts.splice(index, 1);
        updateTransforms();
    }
}

export const toaster = {
    create: (options: ToastOptions) => addToast(options)
};

function addToast(options: ToastOptions) {
    mountContainer();
    const id = toastId++;
    const toast: Toast = { id, ...options };
    toasts.push(toast);

    const el = document.createElement("div");
    toast.element = el;

    // Use CSS variables for theme awareness
    el.className = `absolute left-0 bottom-0 bg-[var(--color-surface)] rounded-[15px] shadow-lg border border-[var(--color-border)] min-w-80 px-4 py-4 h-fit transition-all duration-300 ease-[cubic-bezier(0.25,0.75,0.6,0.98)] opacity-0 w-full box-border toast-card`;
    el.style.transform = "translate3d(0, 50px, 0) scale(0.95)"; // entry animation start

    const descHtml = options.description ? `<div class="text-[var(--color-text-secondary)] text-sm mt-1">${options.description}</div>` : '';

    el.innerHTML = `
    <div class="pr-6">
      <div class="text-[var(--color-text)] font-semibold text-sm">${options.title}</div>
      ${descHtml}
    </div>
    <button id="toast-close-${id}" class="absolute top-4 right-4 p-1 hover:bg-[var(--color-surface-hover)] rounded transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text)] cursor-pointer border-none bg-transparent">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
    </button>
  `;

    const btn = el.querySelector(`#toast-close-${id}`) as HTMLButtonElement;
    btn.onclick = () => removeToast(id);

    const innerContainer = container!.querySelector('#toast-inner-container');
    innerContainer!.appendChild(el);

    // Measure and show
    requestAnimationFrame(() => {
        toast.measuredHeight = el.getBoundingClientRect().height;
        updateTransforms();
    });

    // Auto remove
    toast.timeout = setTimeout(() => {
        if (!isHovered) {
            removeToast(id);
        } else {
            const waitHover = setInterval(() => {
                if (!isHovered) {
                    clearInterval(waitHover);
                    removeToast(id);
                }
            }, 1000);
        }
    }, options.duration ?? 4000);
}
