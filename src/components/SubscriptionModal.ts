import { Modal } from './Modal';
import { Input } from './Input';
import { Select, attachSelectListeners } from './Select';
import { db } from '../lib/firebase';
import { doc, collection, addDoc, setDoc, Timestamp } from 'firebase/firestore';
import { toaster } from './Toast';

interface SubscriptionPrefill {
  name?: string;
  value?: string;
  frequency?: string;
  category?: string;
}

interface SubscriptionModalProps {
  userId: string;
  editingSub?: any;
  prefill?: SubscriptionPrefill;
  userCategories: any[];
  onSaved: () => Promise<void> | void;
}

export function openSubscriptionModal({
  userId,
  editingSub = null,
  prefill = {},
  userCategories,
  onSaved
}: SubscriptionModalProps) {
  const isEditing = !!editingSub;

  const resolvedName      = isEditing ? editingSub.name : (prefill.name || '');
  const resolvedValue     = isEditing ? String(editingSub.value).replace('.', ',') : (prefill.value ? String(prefill.value).replace('.', ',') : '');
  const resolvedFrequency = isEditing ? editingSub.frequency : (prefill.frequency || 'monthly');
  const resolvedCategory  = isEditing ? editingSub.category : (prefill.category || (userCategories.length > 0 ? userCategories[0].id : 'entertainment'));

  Modal({
    title: isEditing ? 'Editar Assinatura' : 'Nova Assinatura',
    content: `
      <div class="space-y-4">
        ${Input({ id: 'sub-name', type: 'text', label: 'Nome da Assinatura', placeholder: 'Ex: Netflix, Spotify...', value: resolvedName, required: true })}
        <div class="grid grid-cols-2 gap-4">
          ${Input({ id: 'sub-value', label: 'Valor', type: 'text', inputmode: 'decimal', placeholder: '0,00', value: resolvedValue, required: true })}
          ${Select({
      id: 'sub-frequency', label: 'Frequência', value: resolvedFrequency, options: [
        { value: 'monthly', label: 'Mensal' },
        { value: 'yearly', label: 'Anual' },
        { value: 'weekly', label: 'Semanal' },
      ]
    })}
        </div>
        ${Select({
      id: 'sub-category',
      label: 'Categoria',
      value: resolvedCategory,
      options: userCategories.length > 0
        ? [...userCategories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(c => ({ value: c.id, label: c.name }))
        : [
          { value: 'entertainment', label: 'Lazer' },
          { value: 'education', label: 'Educação' },
          { value: 'health', label: 'Saúde' },
          { value: 'digital services', label: 'Serviços digitais' },
          { value: 'other', label: 'Outros' },
        ]
    })}
      </div>
    `,
    confirmText: isEditing ? 'Salvar Alterações' : 'Criar Assinatura',
    onConfirm: async (data: any) => {
      try {
        const payload = {
          name: data['sub-name'],
          title: data['sub-name'],
          description: data['sub-name'],
          value: Number(String(data['sub-value']).replace(',', '.')),
          amount: Number(String(data['sub-value']).replace(',', '.')),
          frequency: data['sub-frequency'],
          category: data['sub-category'],
          updatedAt: Timestamp.now(),
        };

        if (isEditing) {
          await setDoc(doc(db, `users/${userId}/subscriptions/${editingSub.id}`), {
            ...editingSub,
            ...payload,
            date: editingSub.date || new Date().toISOString(),
          });
          toaster.create({ title: 'Atualizada', description: 'Assinatura atualizada com sucesso!', type: 'success' });
        } else {
          await addDoc(collection(db, `users/${userId}/subscriptions`), {
            ...payload,
            createdAt: Timestamp.now(),
            date: new Date().toISOString(),
          });
          toaster.create({ title: 'Criada', description: 'Assinatura cadastrada com sucesso!', type: 'success' });
        }

        if (onSaved) await onSaved();
      } catch (err) {
        console.error('Erro ao salvar:', err);
        toaster.create({ title: 'Erro', description: 'Não foi possível salvar.', type: 'error' });
      }
    },
  });

  attachSelectListeners('sub-frequency');
  attachSelectListeners('sub-category');
}
