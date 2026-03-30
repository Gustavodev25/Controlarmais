import { Header, attachHeaderListeners } from '../components/Header';
import gsap from 'gsap';
import { BrilhoHeader } from '../components/BrilhoHeader';
import { toaster } from '../components/Toast';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { GenericDropdown, attachGenericDropdownListeners } from '../components/GenericDropdown';
import { useTheme } from '../components/ThemeManager';
import { Select, attachSelectListeners } from '../components/Select';
import { CategoryService } from '../services/categoryService';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories';
import type { CategoryMapping } from '../types/category';

// Groups that contain income categories (from the mobile's DEFAULT_CATEGORIES)
const INCOME_GROUPS = new Set(['Renda']);

let unsubscribeListener: (() => void) | null = null;

export function renderCategories(user: any) {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  sessionStorage.setItem('currentPage', 'categories');
  sessionStorage.removeItem('currentTab');

  // Cleanup previous listener
  if (unsubscribeListener) {
    unsubscribeListener();
    unsubscribeListener = null;
  }

  app.innerHTML = `
    <div class="min-h-screen text-[var(--color-text)] flex flex-col relative overflow-hidden bg-[var(--color-background)]">
      ${BrilhoHeader()}
      ${Header({ user })}

      <style>
        .category-card {
           transition: border-color 0.2s ease;
         }
         .category-card:hover {
           border-color: var(--color-border-hover, var(--color-border));
         }
      </style>

      <main class="flex-1 w-full max-w-5xl mx-auto px-4 md:px-10 py-8 pt-24 md:pt-32 overflow-y-auto">
        <div class="w-full px-2 md:px-0">

          <!-- Header row -->
          <div class="flex items-center justify-between mb-10">
            <div>
              <h2 class="text-[22px] font-semibold text-[var(--color-text)] tracking-tight leading-none">Categorias</h2>
              <p class="text-[13px] text-[var(--color-text-secondary)] mt-2">Organize seus gastos e rendimentos</p>
            </div>
            <button id="btn-create-category"
              class="bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text)] px-4 py-2 rounded-xl text-[13px] font-medium transition-all duration-200">
              Criar Nova Categoria
            </button>
          </div>



          <!-- Categories -->
          <div id="categories-container" class="space-y-8">
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              ${Array(8).fill(0).map(() => `
                <div class="h-[68px] rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse opacity-30"></div>
              `).join('')}
            </div>
          </div>

        </div>
      </main>
    </div>
  `;

  attachHeaderListeners();
  loadCategories(user.uid);
  document.getElementById('btn-create-category')?.addEventListener('click', () => openCategoryModal(user.uid));
}



function animateCardsIn() {
  const cards = document.querySelectorAll<HTMLElement>('.category-card');
  gsap.set(cards, { opacity: 0 });
  gsap.fromTo(
    cards,
    { opacity: 0, y: 14, x: -6, scale: 0.92 },
    {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      duration: 0.55,
      ease: 'power4.out',
      stagger: {
        each: 0.048,
        ease: 'power1.inOut',
      },
      clearProps: 'transform',
    }
  );
}

function getCategoryType(mapping: CategoryMapping): 'expense' | 'income' {
  return INCOME_GROUPS.has(mapping.group) ? 'income' : 'expense';
}

async function loadCategories(userId: string) {
  try {
    // Ensure categoryMappings exist (initialize defaults if empty)
    const mappings = await CategoryService.ensureCategoryMappings(userId);

  const filterAndRender = (categories: CategoryMapping[]) => {
    renderCategoriesGrids(categories, categories, userId);
    setTimeout(() => animateCardsIn(), 10);
  };

  filterAndRender(mappings);

  // Real-time listener (onSnapshot) - syncs with mobile in real time
  unsubscribeListener = CategoryService.listenToCategoryMappings(userId, (updatedMappings) => {
    filterAndRender(updatedMappings);
  });

  } catch (error) {
    console.error(error);
    toaster.create({ title: 'Erro', description: 'Erro ao carregar categorias.', type: 'error' });
  }
}

function renderCategoriesGrids(filtered: CategoryMapping[], allCategories: CategoryMapping[], userId: string) {
  const container = document.getElementById('categories-container');
  if (!container) return;



  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-16 flex flex-col items-center justify-center text-center rounded-2xl border border-dashed border-[var(--color-border)]">
        <p class="text-[13px] text-[var(--color-text-secondary)] opacity-50">Nenhuma categoria encontrada</p>
      </div>`;
    return;
  }

  const grouped: Record<string, CategoryMapping[]> = {};
  filtered.forEach(c => {
    const g = c.group || 'Outros';
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push(c);
  });

  const sortedGroups = Object.keys(grouped).sort();

  container.innerHTML = sortedGroups.map(group => `
    <div class="space-y-3">
      <div class="flex items-center gap-3">
        <h3 class="text-[10px] font-bold text-[var(--color-text-secondary)] uppercase tracking-[0.18em] shrink-0 opacity-50">${group}</h3>
        <div class="h-px flex-1 bg-[var(--color-border)] opacity-20"></div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        ${grouped[group].map(c => CategoryCard(c)).join('')}
      </div>
    </div>
  `).join('');

  filtered.forEach(category => {
    attachGenericDropdownListeners(`trigger-cat-${category.id}`, `dropdown-cat-${category.id}`);
    document.getElementById(`btn-edit-cat-${category.id}`)?.addEventListener('click', (e) => {
      e.stopPropagation();
      openCategoryModal(userId, category);
    });
    document.getElementById(`btn-delete-cat-${category.id}`)?.addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDeleteCategory(userId, category.id);
    });
  });
}

function CategoryCard(category: CategoryMapping): string {
  const theme = useTheme().current;
  const deleteLottie = theme === 'dark' ? '/assets/lottie/lixobranco.json' : '/assets/lottie/lixopreto.json';
  const editLottie = theme === 'dark' ? '/assets/lottie/pepelbranco.json' : '/assets/lottie/papelpreto.json';

  return `
    <div class="category-card group relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3 min-w-0">
        <div class="min-w-0">
          <h4 class="text-[13px] font-medium text-[var(--color-text)] truncate leading-snug">${category.displayName}</h4>
          <p class="text-[10px] text-[var(--color-text-secondary)] opacity-40 truncate mt-0.5">${category.originalKey || 'Manual'}</p>
        </div>
      </div>
      <div class="relative shrink-0">
        <button id="trigger-cat-${category.id}" class="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-all opacity-0 group-hover:opacity-100">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        </button>
        ${GenericDropdown({
    id: `dropdown-cat-${category.id}`,
    items: [
      { label: 'Editar', icon: `<lottie-player src="${editLottie}" background="transparent" speed="1" style="width: 16px; height: 16px; pointer-events: none;" autoplay></lottie-player>`, id: `btn-edit-cat-${category.id}` },
      { label: 'Excluir', icon: `<lottie-player src="${deleteLottie}" background="transparent" speed="1" style="width: 16px; height: 16px; pointer-events: none;" autoplay></lottie-player>`, variant: 'danger', id: `btn-delete-cat-${category.id}` }
    ]
  })}
      </div>
    </div>
  `;
}

function openCategoryModal(userId: string, category?: CategoryMapping) {
  const selectedGroup = category?.group || 'Outros';

  const groups = [...new Set(DEFAULT_CATEGORIES.map(c => c.title))].sort();
  if (category && category.group && !groups.includes(category.group)) {
    groups.push(category.group);
    groups.sort();
  }

  Modal({
    title: category ? 'Editar Categoria' : 'Nova Categoria',
    maxWidth: 'max-w-md',
    content: `
      <div class="space-y-4">
        ${Input({ id: 'category-name', label: 'Nome', type: 'text', value: category?.displayName || '', required: true, placeholder: 'Ex: Moradia...' })}
        ${Select({
          id: 'category-group',
          label: 'Grupo',
          value: selectedGroup,
          options: groups
        })}
      </div>
    `,
    confirmText: category ? 'Salvar' : 'Criar',
    onConfirm: async (data: any) => {
      const name = data['category-name'];
      const group = data['category-group'];
      if (!name || !group) return;
      try {
        if (category) {
          // Update existing category in categoryMappings
          await CategoryService.updateFullCategoryMapping(userId, category.id, {
            displayName: name,
            group
          });
          toaster.create({ title: 'Sucesso', description: 'Categoria atualizada.', type: 'success' });
        } else {
          // Create new custom category in categoryMappings
          await CategoryService.createCustomCategory(userId, name, group);
          toaster.create({ title: 'Sucesso', description: 'Categoria criada.', type: 'success' });
        }
        // No need to manually reload - onSnapshot will update the UI
      } catch {
        toaster.create({ title: 'Erro', description: 'Erro ao salvar.', type: 'error' });
      }
    },
  });

  // Attach Select component listeners after modal renders
  setTimeout(() => {
    attachSelectListeners('category-group');
  }, 50);
}

async function confirmDeleteCategory(userId: string, id: string) {
  DeleteConfirmationModal({
    title: 'Excluir Categoria',
    description: 'Deseja excluir esta categoria?',
    onConfirm: async () => {
      try {
        await CategoryService.deleteCategoryMapping(userId, id);
        toaster.create({ title: 'Sucesso', description: 'Excluída.', type: 'success' });
        // No need to manually reload - onSnapshot will update the UI
      } catch {
        toaster.create({ title: 'Erro', description: 'Erro ao excluir.', type: 'error' });
      }
    },
  });
}
