import { createElement, useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  type ResponsiveContainerProps
} from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  color?: string;
}

interface CategorySpentChartProps {
  data: CategoryData[];
}

// Nova paleta de cores em tons pastéis com gradientes suaves
const CHART_THEME = [
  { id: 'grad-lilac', start: '#C8B6FF', end: '#9B84EE', fallback: '#B29DF4' },    // Lilás
  { id: 'grad-mint', start: '#84E6D1', end: '#5EC1AB', fallback: '#71D3BC' },     // Verde Menta
  { id: 'grad-blush', start: '#FFD6A5', end: '#FDBA74', fallback: '#FEC88C' },    // Pêssego/Blush
  { id: 'grad-blue', start: '#A0C4FF', end: '#79A7F1', fallback: '#8CB5F8' },     // Azul Bebê
  { id: 'grad-rose', start: '#FFADAD', end: '#F08282', fallback: '#F89797' },     // Rosa Pastel
  { id: 'grad-yellow', start: '#FDFFB6', end: '#E5E88D', fallback: '#F1F3A2' },   // Amarelo Pastel
  { id: 'grad-gray', start: '#CBD5E1', end: '#94A3B8', fallback: '#B0BEC5' }      // Cinza Suave (Outros)
];

// Função para renderizar a porcentagem dentro da fatia, acompanhando a curva
const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  // Esconde o texto se a fatia for menor que 5% para não poluir o visual
  if (percent < 0.05) return null;

  // Calcula a posição no centro exato da fatia
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Calcula a rotação para o texto acompanhar a curva
  let rotation = -midAngle;
  // Mantém o texto sempre legível (evita ficar de cabeça para baixo)
  if (rotation < -90 || rotation > 90) {
    rotation += 180;
  }

  return createElement('text', {
    x,
    y,
    fill: '#111111', // Cor escura para dar contraste com as fatias pastéis claras
    textAnchor: 'middle',
    dominantBaseline: 'central',
    fontSize: '11px',
    fontWeight: 'bold',
    transform: `rotate(${rotation}, ${x}, ${y})` // Aplica a rotação
  }, `${(percent * 100).toFixed(0)}%`);
};

function CategorySpentChartReact({ data }: CategorySpentChartProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const chartData = useMemo(() => {
    const sorted = [...data].sort((a, b) => b.value - a.value);

    const mapTheme = (item: CategoryData, index: number) => {
      const theme = CHART_THEME[index % (CHART_THEME.length - 1)];
      return {
        ...item,
        fillUrl: `url(#${theme.id})`,
        gradientCSS: `linear-gradient(to bottom right, ${theme.start}, ${theme.end})`,
        fallbackColor: theme.fallback
      };
    };

    if (sorted.length <= 8) return sorted.map(mapTheme);

    const top = sorted.slice(0, 7);
    const rest = sorted.slice(7);
    const restValue = rest.reduce((sum, d) => sum + d.value, 0);

    const grayTheme = CHART_THEME[CHART_THEME.length - 1];

    return [
      ...top.map(mapTheme),
      {
        name: 'Outros',
        value: restValue,
        fillUrl: `url(#${grayTheme.id})`,
        gradientCSS: `linear-gradient(to bottom right, ${grayTheme.start}, ${grayTheme.end})`,
        fallbackColor: grayTheme.fallback
      }
    ];
  }, [data]);

  if (chartData.length === 0) {
    return createElement('div', {
      className: 'flex flex-col items-center justify-center h-full text-[12px] text-[var(--color-text-secondary)] py-10 opacity-50'
    }, 'Nenhum gasto registrado este mês.');
  }

  const gradientDefs = createElement('defs', { key: 'defs' },
    CHART_THEME.map(theme =>
      createElement('linearGradient', {
        id: theme.id,
        x1: '0', y1: '0', x2: '0', y2: '1',
        key: theme.id
      }, [
        createElement('stop', { offset: '0%', stopColor: theme.start, key: 'stop1' }),
        createElement('stop', { offset: '100%', stopColor: theme.end, key: 'stop2' })
      ])
    )
  );

  // Configurações distintas para Mobile e Web
  const config = isMobile ? {
    chartWidth: '100%' as any,
    height: 180,
    innerRadius: 40,
    outerRadius: 75,
    legendClass: 'w-full flex flex-col gap-2 mt-4',
    legendItemClass: 'text-[12px]'
  } : {
    chartWidth: '50%' as any,
    height: 220,
    innerRadius: 55,
    outerRadius: 105,
    legendClass: 'flex-1 pl-8 flex flex-col gap-2.5 justify-center',
    legendItemClass: 'text-[13px]'
  };

  return createElement('div', { 
    className: `w-full h-full flex ${isMobile ? 'flex-col' : 'flex-row'} items-center justify-between` 
  }, [
    createElement(ResponsiveContainer, {
      width: config.chartWidth as any,
      height: config.height,
      key: 'chart-container',
      style: { outline: 'none' },
      children: createElement(PieChart, { style: { outline: 'none' }, tabIndex: -1 }, [
        gradientDefs,
        createElement(Pie, {
          key: 'pie-main',
          data: chartData,
          cx: '50%',
          cy: '50%',
          innerRadius: config.innerRadius,
          outerRadius: config.outerRadius,
          paddingAngle: 6,
          dataKey: 'value',
          cornerRadius: 12,
          stroke: 'none',
          labelLine: false,
          label: renderCustomizedLabel
        }, chartData.map((entry, index) =>
          createElement(Cell, { key: `cell-${index}`, fill: entry.fillUrl, style: { outline: 'none' } })
        )),
        createElement(Tooltip, {
          key: 'tooltip-main',
          contentStyle: {
            backgroundColor: '#111111',
            border: '1px solid #1C1C1C',
            borderRadius: '12px',
            fontSize: '12px',
            color: '#fff'
          },
          itemStyle: { color: '#fff' },
          formatter: (value: any) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        })
      ])
    }),

    createElement('div', {
      className: config.legendClass,
      key: 'legend-container'
    }, chartData.map((entry, index) =>
      createElement('div', {
        key: `legend-${index}`,
        className: 'flex items-center justify-between group cursor-default transition-all duration-200'
      }, [
        createElement('div', { className: 'flex items-center gap-2.5 overflow-hidden' }, [
          createElement('div', {
            className: 'w-2.5 h-2.5 rounded-full shrink-0 shadow-sm',
            style: { background: entry.gradientCSS }
          }),
          createElement('span', {
            className: `${config.legendItemClass} font-medium text-[var(--color-text-secondary)] truncate group-hover:text-[var(--color-text)] transition-colors`
          }, entry.name)
        ]),
        createElement('span', {
          className: `${config.legendItemClass} font-semibold text-[var(--color-text)] ml-2`
        }, `R$ ${entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`)
      ])
    ))
  ]);
}

export function CategorySpentChartSummary(): string {
  return `
    <div class="overview-card category-spent-card relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] flex flex-col overflow-hidden z-10 h-full" style="will-change:transform; transform-origin:center center;">
      <div class="overview-card-header px-4 py-2.5 border-b border-[var(--color-border-light)] bg-[var(--color-surface-hover)] rounded-t-2xl flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" class="text-[var(--color-text-secondary)] opacity-70">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
          </svg>
          <p class="text-[9px] font-bold tracking-[0.14em] uppercase text-[var(--color-text-secondary)]">Gastos por Categoria</p>
        </div>
        <span class="text-[10px] text-[var(--color-text-secondary)] opacity-40 font-medium">Este mês</span>
      </div>
      <div id="category-spent-chart-root" class="p-5 min-h-[240px] flex items-center justify-center">
        <div class="cc-spinner"></div>
      </div>
    </div>
  `;
}

export function attachCategorySpentChartListeners(data: any[]) {
  const rootEl = document.getElementById('category-spent-chart-root');
  if (rootEl) {
    const root = createRoot(rootEl);
    root.render(createElement(CategorySpentChartReact, { data }));
  }
}