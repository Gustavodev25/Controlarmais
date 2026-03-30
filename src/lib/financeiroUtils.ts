
export interface DescontoPersonalizado {
  id: string;
  nome: string;
  valor: number;
  tipo: 'fixo' | 'percentual';
}

export interface FinanceiroConfig {
  salarioBase: number;
  diaPagamento: number;
  isentarDesconto: boolean;
  habilitarVale: boolean;
  porcentagemVale: number;
  diaVale: number;
  descontosPersonalizados: DescontoPersonalizado[];
}

const INSS_TABLE_2025 = [
  { limit: 1518.00,  rate: 0.075 },
  { limit: 2793.88,  rate: 0.09  },
  { limit: 4190.83,  rate: 0.12  },
  { limit: 8157.41,  rate: 0.14  },
];

const IRRF_TABLE_2025 = [
  { limit: 2428.80,  rate: 0,     deduction: 0      },
  { limit: 2826.65,  rate: 0.075, deduction: 182.16 },
  { limit: 3751.05,  rate: 0.15,  deduction: 394.16 },
  { limit: 4664.68,  rate: 0.225, deduction: 675.49 },
  { limit: Infinity, rate: 0.275, deduction: 908.73 },
];

function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calcularPrevisaoFinanceira(config: FinanceiroConfig) {
  const salarioBruto = config.salarioBase || 0;
  let totalDescontos = 0;
  const detalhes: { nome: string; valor: number }[] = [];

  // 1. INSS (progressivo)
  let inssRaw = 0;
  if (!config.isentarDesconto) {
    let previousLimit = 0;
    for (const range of INSS_TABLE_2025) {
      const currentLimit = Math.min(salarioBruto, range.limit);
      if (currentLimit > previousLimit) {
        inssRaw += (currentLimit - previousLimit) * range.rate;
        previousLimit = range.limit;
      }
    }
  }
  const inss = roundToCents(inssRaw);
  if (inss > 0) {
    detalhes.push({ nome: 'INSS', valor: inss });
    totalDescontos += inss;
  }

  // 2. IRRF (sobre salário - INSS)
  const irrfBase = roundToCents(salarioBruto - inss);
  let irrf = 0;
  if (!config.isentarDesconto && irrfBase > 0) {
    const bracket = IRRF_TABLE_2025.find(b => irrfBase <= b.limit) || IRRF_TABLE_2025[IRRF_TABLE_2025.length - 1];
    irrf = roundToCents(Math.max(0, (irrfBase * bracket.rate) - bracket.deduction));
  }
  if (irrf > 0) {
    detalhes.push({ nome: 'IRRF', valor: irrf });
    totalDescontos += irrf;
  }

  // 3. Vale / Adiantamento
  let vale = 0;
  if (config.habilitarVale) {
    vale = roundToCents(salarioBruto * (config.porcentagemVale || 0) / 100);
    detalhes.push({ nome: 'Vale (adiantamento)', valor: vale });
    totalDescontos += vale;
  }

  // 4. Descontos personalizados
  (config.descontosPersonalizados || []).forEach(d => {
    let valor = 0;
    if (d.tipo === 'fixo') {
      valor = d.valor;
    } else {
      valor = roundToCents(salarioBruto * d.valor / 100);
    }
    detalhes.push({ nome: d.nome, valor });
    totalDescontos += valor;
  });

  totalDescontos = roundToCents(totalDescontos);
  const salarioLiquido = roundToCents(salarioBruto - totalDescontos);

  return { salarioBruto, inss, irrf, totalDescontos, salarioLiquido, vale, detalhes };
}

export function getProximoPagamento(diaPagamento: number) {
  const hoje = new Date();
  
  // Create date in local time
  let dataPagamento = new Date(hoje.getFullYear(), hoje.getMonth(), diaPagamento);

  // If today is past the payment day, it's next month
  if (hoje.getDate() > diaPagamento) {
    dataPagamento.setMonth(dataPagamento.getMonth() + 1);
  }

  // Reset time for accurate day difference count
  const hojeReset = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const pagReset = new Date(dataPagamento.getFullYear(), dataPagamento.getMonth(), dataPagamento.getDate());
  
  const diffTime = pagReset.getTime() - hojeReset.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const dataFormatada = `${diaPagamento.toString().padStart(2, '0')}/${meses[dataPagamento.getMonth()]}`;

  let textoRelativo = '';
  if (diffDays === 0) textoRelativo = 'Hoje';
  else if (diffDays === 1) textoRelativo = 'Amanhã';
  else textoRelativo = `Daqui a ${diffDays} dias`;

  return { dataFormatada, textoRelativo, diffDays };
}
