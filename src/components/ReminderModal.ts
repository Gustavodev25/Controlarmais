import { Modal } from './Modal';
import { Input } from './Input';
import { Select, attachSelectListeners } from './Select';
import { db } from '../lib/firebase';
import { doc, collection, addDoc, setDoc, Timestamp } from 'firebase/firestore';
import { toaster } from './Toast';

interface ReminderPrefill {
  name?: string;
  value?: string;
  type?: string;
  frequency?: string;
  category?: string;
  date?: string;
}

interface ReminderModalProps {
  userId: string;
  editingReminder?: any;
  prefill?: ReminderPrefill;
  userCategories: any[];
  onSaved: () => Promise<void> | void;
}

export function openReminderModal({
  userId,
  editingReminder = null,
  prefill = {},
  userCategories,
  onSaved
}: ReminderModalProps) {
  const isEditing = !!editingReminder;

  // Valores resolvidos: edição > prefill da IA > padrão
  const resolvedType = isEditing ? editingReminder.type : (prefill.type || 'expense');
  const resolvedName = isEditing ? editingReminder.name : (prefill.name || '');
  const resolvedValue = isEditing
    ? String(editingReminder.value ?? '').replace('.', ',')
    : (prefill.value ? String(prefill.value).replace('.', ',') : '');
  const resolvedDate = isEditing
    ? (editingReminder.dueDate ||
       (editingReminder.date?.toDate
         ? editingReminder.date.toDate().toISOString().split('T')[0]
         : editingReminder.date
           ? String(editingReminder.date).split('T')[0]
           : ''))
    : (prefill.date || new Date().toISOString().split('T')[0]);
  const resolvedFrequency = isEditing ? editingReminder.frequency : (prefill.frequency || 'monthly');
  const resolvedCategory = isEditing
    ? editingReminder.category
    : (prefill.category || (userCategories.length > 0 ? userCategories[0].id : 'other'));

  Modal({
    title: isEditing ? 'Editar Lembrete' : 'Novo Lembrete',
    content: `
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          ${Select({
      id: 'reminder-type',
      label: 'Natureza',
      value: resolvedType,
      options: [
        { value: 'expense', label: 'Despesa' },
        { value: 'income', label: 'Receita' },
      ]
    })}
          ${Input({ id: 'reminder-name', type: 'text', label: 'Título', placeholder: 'Ex: Aluguel', value: resolvedName, required: true })}
        </div>
        <div class="grid grid-cols-2 gap-4">
          ${Input({ id: 'reminder-value', label: 'Valor', type: 'text', placeholder: '0,00', value: resolvedValue, required: true })}
          ${Input({ id: 'reminder-date', label: 'Vencimento', type: 'date', value: resolvedDate, required: true })}
        </div>
        <div class="grid grid-cols-2 gap-4">
          ${Select({
      id: 'reminder-frequency', label: 'Frequência', value: resolvedFrequency, options: [
        { value: 'monthly', label: 'Mensal' },
        { value: 'yearly', label: 'Anual' },
        { value: 'weekly', label: 'Semanal' },
        { value: 'once', label: 'Única vez' },
      ]
    })}
          ${Select({
      id: 'reminder-category',
      label: 'Categoria',
      value: resolvedCategory,
      options: userCategories.length > 0
        ? [...userCategories].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')).map(c => ({ value: c.id, label: c.name }))
        : [
          { value: 'bills', label: 'Contas Fixas' },
          { value: 'health', label: 'Saúde' },
          { value: 'leisure', label: 'Lazer' },
          { value: 'other', label: 'Outros' },
        ]
    })}
        </div>
      </div>
    `,
    confirmText: isEditing ? 'Salvar Alterações' : 'Criar Lembrete',
    onConfirm: async (data: any) => {
      try {
        const payload = {
          name: data['reminder-name'],
          title: data['reminder-name'],
          description: data['reminder-name'],
          value: Number(String(data['reminder-value']).replace(',', '.')) || 0,
          amount: Number(String(data['reminder-value']).replace(',', '.')) || 0,
          type: data['reminder-type'],
          frequency: data['reminder-frequency'],
          category: data['reminder-category'],
          date: new Date(data['reminder-date'] + 'T12:00:00').toISOString(),
          dueDate: data['reminder-date'],
          updatedAt: Timestamp.now(),
        };


        if (isEditing) {
          await setDoc(doc(db, `users/${userId}/reminders/${editingReminder.id}`), {
            ...editingReminder,
            ...payload,
          });
          toaster.create({ title: 'Atualizado', description: 'Lembrete atualizado com sucesso!', type: 'success' });
        } else {
          await addDoc(collection(db, `users/${userId}/reminders`), {
            ...payload,
            createdAt: Timestamp.now(),
            memberId: userId,
            status: 'pending',
            isRecurring: data['reminder-frequency'] !== 'once',
          });
          toaster.create({ title: 'Criado', description: 'Lembrete cadastrado com sucesso!', type: 'success' });
        }

        if (onSaved) await onSaved();
      } catch (err) {
        console.error('Erro ao salvar:', err);
        toaster.create({ title: 'Erro', description: 'Não foi possível salvar.', type: 'error' });
      }
    },
  });

  attachSelectListeners('reminder-type');
  attachSelectListeners('reminder-frequency');
  attachSelectListeners('reminder-category');
}

