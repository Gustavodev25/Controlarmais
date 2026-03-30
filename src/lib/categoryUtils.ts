import { CategoryService } from '../services/categoryService';

export const PLUGGY_TO_CATEGORY_FALLBACK: Record<string, string> = {
  // Alimentação
  'eating out': 'Restaurante',
  'food delivery': 'Delivery',
  'groceries': 'Supermercado',
  'restaurants': 'Restaurante',
  'bars and pubs': 'Bares',
  'bakeries': 'Padaria',
  'fast food': 'Fast Food',
  'coffee shops': 'Cafeteria',
  'dining out': 'Restaurante',
  'food': 'Alimentação',

  // Viagem e Transporte
  'accommodation': 'Hospedagem',
  'airport and airlines': 'Passagens aéreas',
  'mileage programs': 'Programas de milhas',
  'travel': 'Viagem',
  'hotels': 'Hospedagem',
  'transportation': 'Transporte',
  'transport': 'Transporte',
  'bicycle': 'Bicicleta',
  'car rental': 'Aluguel carro',
  'gas stations': 'Combustível',
  'parking': 'Estacionamento',
  'public transportation': 'Ônibus / metrô',
  'taxi and ride-hailing': 'Táxi / apps',
  'uber': 'Apps de transporte',
  '99app': 'Apps de transporte',
  'vehicle maintenance': 'Manutenção',
  'toll': 'Pedágio',
  'tolls': 'Pedágio',

  // Finanças e Taxas
  'account fees': 'Tarifas conta',
  'credit card': 'Cartão de crédito',
  'credit card fees': 'Tarifas cartão',
  'income taxes': 'IR',
  'interests charged': 'Juros',
  'interest charged': 'Juros',
  'interest': 'Juros',
  'loans': 'Empréstimos',
  'taxes': 'Impostos',
  'financing': 'Financiamento',
  'real estate financing': 'Financiamento imobiliário',
  'vehicle financing': 'Financiamento veicular',
  'late payment and overdraft costs': 'Multas e juros',
  'investments': 'Investimentos',
  'savings': 'Poupança',
  'overdraft': 'Cheque especial',
  'wire transfer fees and atm fees': 'Tarifas bancárias',
  'bank slip': 'Boleto',
  'credit card payment': 'Pagamento cartão',
  'debt card': 'Cartão débito',
  'debit card': 'Cartão débito',

  // Transferências
  'same person transfer - pix': 'Transf. própria Pix',
  'transfer - pix': 'Transf. Pix',
  'transfer - ted': 'Transf. TED',
  'transfer - doc': 'Transf. DOC',
  'transfer': 'Transferência',
  'transfers': 'Transferência',
  'wire transfer': 'Transferência',
  'pix': 'Pix',
  'same person transfer': 'Transf. própria',
  'deposit': 'Depósito',
  'withdrawal': 'Saque',
  'atm withdrawal': 'Saque caixa',

  // Entretenimento e Lazer
  'cinema, theater and concerts': 'Cinema / shows',
  'entertainment': 'Lazer',
  'leisure': 'Lazer',
  'lottery': 'Loterias',
  'music streaming': 'Streaming música',
  'video streaming': 'Streaming vídeo',
  'gaming': 'Jogos',
  'games': 'Jogos',
  'sports': 'Esportes',

  // Compras
  'clothing': 'Roupas',
  'electronics': 'Eletrônicos',
  'online shopping': 'Compras online',
  'shopping': 'Compras',
  'furniture': 'Móveis',
  'pets': 'Pets',
  'pet shop': 'Pet Shop',
  'gifts': 'Presentes',
  'beauty': 'Beleza',

  // Moradia e Utilidades
  'rent': 'Aluguel',
  'condominium': 'Condomínio',
  'utilities': 'Serviços',
  'electricity': 'Energia',
  'water': 'Água',
  'internet': 'Internet',
  'telephone': 'Telefone',
  'phone': 'Telefone',
  'home': 'Moradia',

  // Saúde e Bem-estar
  'health': 'Saúde',
  'health insurance': 'Plano de saúde',
  'pharmacy': 'Farmácia',
  'gym': 'Academia',
  'dental': 'Dentista',

  // Educação e Trabalho
  'education': 'Educação',
  'school': 'Escola',
  'courses': 'Cursos',
  'work': 'Trabalho',

  // Seguros
  'insurance': 'Seguro',
  'life insurance': 'Seguro vida',
  'vehicle insurance': 'Seguro auto',
  'home insurance': 'Seguro residencial',

  // Receitas
  'salary': 'Salário',
  'income': 'Renda',
  'investment-income': 'Investimentos',
  'retirement': 'Aposentadoria',
  'government aid': 'Benefícios governo',
  'non-recurring income': 'Renda eventual',
  'refund': 'Reembolso',
  'cashback': 'Cashback',
  'alimony': 'Pensão',
  'benefit programs': 'Programas de benefícios',

  // Outros
  'digital services': 'Serviços digitais',
  'donation': 'Doações',
  'subscriptions': 'Assinaturas',
  'subscription': 'Assinatura',
  'reversal': 'Estorno',
  'other': 'Outros',
  'others': 'Outros',
  'n/a': 'Outros',
  'university': 'Universidade',
  'housing': 'Moradia',
  'automotive': 'Automotivo',
  'accomodation': 'Hospedagem',
  'uncategorized': 'Sem categoria',
};

export function getCategoryName(tx: { categoryId?: string; category?: string }, categoryMap: Map<string, string>): string {
  const catIdKey = (tx.categoryId || '').toLowerCase().trim();
  const catNameKey = (tx.category || '').toLowerCase().trim();

  // 1. User mappings from Firestore (mapped by id or original name)
  if (catIdKey && categoryMap.has(catIdKey)) return categoryMap.get(catIdKey)!;
  if (catNameKey && categoryMap.has(catNameKey)) return categoryMap.get(catNameKey)!;

  // 2. Exact match in fallback
  if (catNameKey && PLUGGY_TO_CATEGORY_FALLBACK[catNameKey]) {
    return PLUGGY_TO_CATEGORY_FALLBACK[catNameKey];
  }

  // 3. Partial match in fallback
  if (catNameKey) {
    for (const [fallbackKey, fallbackName] of Object.entries(PLUGGY_TO_CATEGORY_FALLBACK)) {
      if (catNameKey.includes(fallbackKey) || fallbackKey.includes(catNameKey)) {
        return fallbackName;
      }
    }
  }

  // 4. Manual mapping additions (plural forms, etc.)
  if (catNameKey === 'transfers') return 'Transferências';
  if (catNameKey === 'transportation') return 'Transporte';

  // 5. Fallback as last resort
  if (tx.category && isNaN(Number(tx.category))) {
    return tx.category.charAt(0).toUpperCase() + tx.category.slice(1);
  }

  return 'Outros';
}
