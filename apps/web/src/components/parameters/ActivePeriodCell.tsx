// // apps/web/src/components/parameters/ActivePeriodCell.tsx
// 'use client';

// import { Badge } from '@/components/ui/badge';
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from '@/components/ui/tooltip';
// import { History, TrendingDown, TrendingUp } from 'lucide-react';
// import { memo } from 'react';

// interface ActivePeriodCellProps {
//   /** Dados da célula da API */
//   cellData: {
//     valorRealizado: number | null;
//     valorMeta: number | null;
//     percentualAtingimento: number | null;
//     setorId: number;
//     setorNome: string;
//     criterioId: number;
//     criterioNome: string;
//   };

//   /** Informações do critério para lógica de cores */
//   criterion: {
//     id: number;
//     nome: string;
//     sentido_melhor?: 'MAIOR' | 'MENOR';
//     casasDecimaisPadrao?: number;
//   };

//   /** Dados de todos os setores para ranking relativo */
//   allSectorData: Array<{
//     setorId: number;
//     percentualAtingimento: number | null;
//   }>;

//   /** Callback para histórico (opcional) */
//   onOpenHistory?: (data: {
//     criterionId: number;
//     sectorId: number;
//     criterionName: string;
//     sectorName: string;
//   }) => void;

//   /** Indica se está carregando */
//   isLoading?: boolean;
// }

// /**
//  * Calcula a cor baseada no desempenho relativo e direção do critério
//  */
// const getPerformanceColor = (
//   percentualAtingimento: number | null,
//   criterionDirection: 'MAIOR' | 'MENOR' | undefined,
//   allPercentages: (number | null)[],
//   sectorId: number
// ): {
//   bgColor: string;
//   textColor: string;
//   borderColor: string;
//   performance: 'excellent' | 'good' | 'warning' | 'poor' | 'no-data';
// } => {
//   // Se não tem dados, retorna cor neutra
//   if (percentualAtingimento === null || percentualAtingimento === undefined) {
//     return {
//       bgColor: 'bg-gray-50 dark:bg-gray-800',
//       textColor: 'text-gray-500 dark:text-gray-400',
//       borderColor: 'border-gray-200 dark:border-gray-700',
//       performance: 'no-data',
//     };
//   }

//   // Filtrar apenas percentuais válidos para ranking
//   const validPercentages = allPercentages.filter(
//     (p): p is number => p !== null && p !== undefined && Number.isFinite(p)
//   );

//   if (validPercentages.length === 0) {
//     return {
//       bgColor: 'bg-gray-50 dark:bg-gray-800',
//       textColor: 'text-gray-500 dark:text-gray-400',
//       borderColor: 'border-gray-200 dark:border-gray-700',
//       performance: 'no-data',
//     };
//   }

//   // Ordenar percentuais baseado na direção do critério
//   const sortedPercentages = [...validPercentages].sort((a, b) => {
//     if (criterionDirection === 'MENOR') {
//       // Para "menor é melhor", menor percentual = melhor posição
//       return a - b;
//     } else {
//       // Para "maior é melhor" ou indefinido, maior percentual = melhor posição
//       return b - a;
//     }
//   });

//   // Encontrar posição do setor atual no ranking
//   const currentPosition = sortedPercentages.indexOf(percentualAtingimento) + 1;
//   const totalSectors = validPercentages.length;

//   // Calcular percentil de performance (1 = melhor, 0 = pior)
//   const percentile = 1 - (currentPosition - 1) / (totalSectors - 1 || 1);

//   // Definir cores baseadas no percentil
//   if (percentile >= 0.75) {
//     // Top 25% - Verde (Excelente)
//     return {
//       bgColor: 'bg-green-50 dark:bg-green-900/30',
//       textColor: 'text-green-800 dark:text-green-200',
//       borderColor: 'border-green-200 dark:border-green-700',
//       performance: 'excellent',
//     };
//   } else if (percentile >= 0.5) {
//     // 50-75% - Amarelo (Bom)
//     return {
//       bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
//       textColor: 'text-yellow-800 dark:text-yellow-200',
//       borderColor: 'border-yellow-200 dark:border-yellow-700',
//       performance: 'good',
//     };
//   } else if (percentile >= 0.25) {
//     // 25-50% - Laranja (Atenção)
//     return {
//       bgColor: 'bg-orange-50 dark:bg-orange-900/30',
//       textColor: 'text-orange-800 dark:text-orange-200',
//       borderColor: 'border-orange-200 dark:border-orange-700',
//       performance: 'warning',
//     };
//   } else {
//     // Bottom 25% - Vermelho (Ruim)
//     return {
//       bgColor: 'bg-red-50 dark:bg-red-900/30',
//       textColor: 'text-red-800 dark:text-red-200',
//       borderColor: 'border-red-200 dark:border-red-700',
//       performance: 'poor',
//     };
//   }
// };

// /**
//  * Formata números baseado no critério
//  */
// const formatValue = (
//   value: number | null,
//   decimalPlaces: number = 0
// ): string => {
//   if (value === null || value === undefined) return '-';
//   if (!Number.isFinite(value)) return '-';

//   return value.toLocaleString('pt-BR', {
//     minimumFractionDigits: decimalPlaces,
//     maximumFractionDigits: decimalPlaces,
//   });
// };

// /**
//  * Formata percentual
//  */
// const formatPercentage = (value: number | null): string => {
//   if (value === null || value === undefined) return '-';
//   if (!Number.isFinite(value)) return '-';

//   return `${(value * 100).toFixed(1)}%`;
// };

// /**
//  * Obtém ícone baseado na direção do critério
//  */
// const getCriterionDirectionIcon = (
//   direction: 'MAIOR' | 'MENOR' | undefined
// ) => {
//   if (direction === 'MAIOR') {
//     return <TrendingUp className='h-3 w-3' />;
//   } else if (direction === 'MENOR') {
//     return <TrendingDown className='h-3 w-3' />;
//   }
//   return null;
// };

// /**
//  * Skeleton para loading
//  */
// const ActivePeriodCellSkeleton = () => (
//   <div className='p-3 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 animate-pulse min-h-[120px] flex flex-col justify-center'>
//     <div className='space-y-3'>
//       <div className='h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto'></div>
//       <div className='h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto'></div>
//       <div className='h-6 bg-gray-300 dark:bg-gray-700 rounded w-2/3 mx-auto'></div>
//     </div>
//   </div>
// );

// const ActivePeriodCell = memo<ActivePeriodCellProps>(
//   ({
//     cellData,
//     criterion,
//     allSectorData,
//     onOpenHistory,
//     isLoading = false,
//   }) => {
//     if (isLoading) {
//       return <ActivePeriodCellSkeleton />;
//     }

//     const {
//       valorRealizado,
//       valorMeta,
//       percentualAtingimento,
//       setorId,
//       setorNome,
//       criterioId,
//       criterioNome,
//     } = cellData;

//     // Extrair percentuais de todos os setores para ranking
//     const allPercentages = allSectorData.map(
//       (sector) => sector.percentualAtingimento
//     );

//     // Calcular cores baseadas no desempenho relativo
//     const colors = getPerformanceColor(
//       percentualAtingimento,
//       criterion.sentido_melhor,
//       allPercentages,
//       setorId
//     );

//     const decimalPlaces = criterion.casasDecimaisPadrao ?? 0;

//     const handleHistoryClick = () => {
//       if (onOpenHistory) {
//         onOpenHistory({
//           criterionId: criterioId,
//           sectorId: setorId,
//           criterionName: criterioNome,
//           sectorName: setorNome,
//         });
//       }
//     };

//     return (
//       <TooltipProvider>
//         <Tooltip delayDuration={300}>
//           <TooltipTrigger asChild>
//             <div
//               className={`
//               p-3 rounded-md border transition-all duration-200 hover:shadow-md
//               min-h-[120px] flex flex-col justify-between cursor-default
//               ${colors.bgColor} ${colors.borderColor}
//             `}
//             >
//               {/* Header com ícone de direção */}
//               <div className='flex items-center justify-between mb-2'>
//                 <div className='flex items-center gap-1'>
//                   {getCriterionDirectionIcon(criterion.sentido_melhor)}
//                   <span className={`text-xs font-medium ${colors.textColor}`}>
//                     {criterion.sentido_melhor === 'MAIOR'
//                       ? 'Maior ↑'
//                       : 'Menor ↓'}
//                   </span>
//                 </div>

//                 {/* Badge de performance */}
//                 <Badge
//                   variant='outline'
//                   className={`text-xs ${colors.textColor} ${colors.borderColor}`}
//                 >
//                   {colors.performance === 'excellent' && '🏆'}
//                   {colors.performance === 'good' && '✅'}
//                   {colors.performance === 'warning' && '⚠️'}
//                   {colors.performance === 'poor' && '🔴'}
//                   {colors.performance === 'no-data' && '➖'}
//                 </Badge>
//               </div>

//               {/* Valores principais */}
//               <div className='flex-1 space-y-2'>
//                 {/* Meta */}
//                 <div className='text-center'>
//                   <div className={`text-xs ${colors.textColor} opacity-80`}>
//                     Meta
//                   </div>
//                   <div className={`text-sm font-semibold ${colors.textColor}`}>
//                     {formatValue(valorMeta, decimalPlaces)}
//                   </div>
//                 </div>

//                 {/* Separador visual */}
//                 <div className={`border-t ${colors.borderColor} my-2`}></div>

//                 {/* Realizado */}
//                 <div className='text-center'>
//                   <div className={`text-xs ${colors.textColor} opacity-80`}>
//                     Realizado
//                   </div>
//                   <div className={`text-sm font-semibold ${colors.textColor}`}>
//                     {formatValue(valorRealizado, decimalPlaces)}
//                   </div>
//                 </div>
//               </div>

//               {/* Footer com percentual */}
//               <div className='mt-3 pt-2 border-t border-current/20'>
//                 <div className='flex items-center justify-between'>
//                   <div className='flex flex-col items-center flex-1'>
//                     <div className={`text-xs ${colors.textColor} opacity-80`}>
//                       Atingimento
//                     </div>
//                     <div className={`text-lg font-bold ${colors.textColor}`}>
//                       {formatPercentage(percentualAtingimento)}
//                     </div>
//                   </div>

//                   {/* Botão de histórico */}
//                   {onOpenHistory && (
//                     <button
//                       onClick={handleHistoryClick}
//                       className={`
//                       p-1 rounded-full transition-colors duration-200
//                       hover:bg-black/10 dark:hover:bg-white/10
//                       ${colors.textColor}
//                     `}
//                       title='Ver histórico'
//                     >
//                       <History className='h-3 w-3' />
//                     </button>
//                   )}
//                 </div>
//               </div>
//             </div>
//           </TooltipTrigger>

//           <TooltipContent
//             className='max-w-xs bg-gray-900 text-white border-gray-700'
//             side='top'
//           >
//             <div className='space-y-2'>
//               <div className='font-semibold'>
//                 {setorNome} - {criterioNome}
//               </div>

//               <div className='space-y-1 text-sm'>
//                 <div>Meta: {formatValue(valorMeta, decimalPlaces)}</div>
//                 <div>
//                   Realizado: {formatValue(valorRealizado, decimalPlaces)}
//                 </div>
//                 <div>
//                   Atingimento: {formatPercentage(percentualAtingimento)}
//                 </div>
//               </div>

//               <div className='text-xs opacity-80 pt-1 border-t border-gray-700'>
//                 Direção:{' '}
//                 {criterion.sentido_melhor === 'MAIOR'
//                   ? 'Maior é melhor'
//                   : 'Menor é melhor'}
//               </div>

//               {colors.performance !== 'no-data' && (
//                 <div className='text-xs opacity-80'>
//                   Performance:{' '}
//                   {colors.performance === 'excellent'
//                     ? 'Excelente (Top 25%)'
//                     : colors.performance === 'good'
//                       ? 'Boa (50-75%)'
//                       : colors.performance === 'warning'
//                         ? 'Atenção (25-50%)'
//                         : 'Abaixo do esperado (Bottom 25%)'}
//                 </div>
//               )}
//             </div>
//           </TooltipContent>
//         </Tooltip>
//       </TooltipProvider>
//     );
//   }
// );

// ActivePeriodCell.displayName = 'ActivePeriodCell';

// export { ActivePeriodCell };
// apps/web/src/components/parameters/ActivePeriodCell.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { History, TrendingDown, TrendingUp } from 'lucide-react';
import { memo } from 'react';

interface ActivePeriodCellProps {
  /** Dados da célula da API */
  cellData: {
    valorRealizado: number | null;
    valorMeta: number | null;
    percentualAtingimento: number | null;
    setorId: number;
    setorNome: string;
    criterioId: number;
    criterioNome: string;
  };

  /** Informações do critério para lógica de cores */
  criterion: {
    id: number;
    nome: string;
    sentido_melhor?: 'MAIOR' | 'MENOR';
    casasDecimaisPadrao?: number;
  };

  /** Dados de todos os setores para ranking relativo */
  allSectorData: Array<{
    setorId: number;
    percentualAtingimento: number | null;
  }>;

  /** Callback para histórico (opcional) */
  onOpenHistory?: (data: {
    criterionId: number;
    sectorId: number;
    criterionName: string;
    sectorName: string;
  }) => void;

  /** Indica se está carregando */
  isLoading?: boolean;
}

/**
 * Calcula a cor baseada no desempenho relativo e direção do critério
 */
const getPerformanceColor = (
  percentualAtingimento: number | null,
  criterionDirection: 'MAIOR' | 'MENOR' | undefined,
  allPercentages: (number | null)[],
  sectorId: number
): {
  bgColor: string;
  textColor: string;
  borderColor: string;
  performance: 'excellent' | 'good' | 'warning' | 'poor' | 'no-data';
} => {
  // Se não tem dados, retorna cor neutra
  if (percentualAtingimento === null || percentualAtingimento === undefined) {
    return {
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      textColor: 'text-gray-500 dark:text-gray-400',
      borderColor: 'border-gray-200 dark:border-gray-700',
      performance: 'no-data',
    };
  }

  // Filtrar apenas percentuais válidos para ranking
  const validPercentages = allPercentages.filter(
    (p): p is number => p !== null && p !== undefined && Number.isFinite(p)
  );

  if (validPercentages.length === 0) {
    return {
      bgColor: 'bg-gray-50 dark:bg-gray-800',
      textColor: 'text-gray-500 dark:text-gray-400',
      borderColor: 'border-gray-200 dark:border-gray-700',
      performance: 'no-data',
    };
  }

  // Ordenar percentuais baseado na direção do critério
  const sortedPercentages = [...validPercentages].sort((a, b) => {
    if (criterionDirection === 'MENOR') {
      // Para "menor é melhor", menor percentual = melhor posição
      return a - b;
    } else {
      // Para "maior é melhor" ou indefinido, maior percentual = melhor posição
      return b - a;
    }
  });

  // Encontrar posição do setor atual no ranking
  const currentPosition = sortedPercentages.indexOf(percentualAtingimento) + 1;
  const totalSectors = validPercentages.length;

  // Calcular percentil de performance (1 = melhor, 0 = pior)
  const percentile = 1 - (currentPosition - 1) / (totalSectors - 1 || 1);

  // Definir cores baseadas no percentil
  if (percentile >= 0.75) {
    // Top 25% - Verde (Excelente)
    return {
      bgColor: 'bg-green-50 dark:bg-green-900/30',
      textColor: 'text-green-800 dark:text-green-200',
      borderColor: 'border-green-200 dark:border-green-700',
      performance: 'excellent',
    };
  } else if (percentile >= 0.5) {
    // 50-75% - Amarelo (Bom)
    return {
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
      textColor: 'text-yellow-800 dark:text-yellow-200',
      borderColor: 'border-yellow-200 dark:border-yellow-700',
      performance: 'good',
    };
  } else if (percentile >= 0.25) {
    // 25-50% - Laranja (Atenção)
    return {
      bgColor: 'bg-orange-50 dark:bg-orange-900/30',
      textColor: 'text-orange-800 dark:text-orange-200',
      borderColor: 'border-orange-200 dark:border-orange-700',
      performance: 'warning',
    };
  } else {
    // Bottom 25% - Vermelho (Ruim)
    return {
      bgColor: 'bg-red-50 dark:bg-red-900/30',
      textColor: 'text-red-800 dark:text-red-200',
      borderColor: 'border-red-200 dark:border-red-700',
      performance: 'poor',
    };
  }
};

/**
 * Formata números baseado no critério
 */
const formatValue = (
  value: number | null,
  decimalPlaces: number = 0
): string => {
  if (value === null || value === undefined) return '-';
  if (!Number.isFinite(value)) return '-';

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  });
};

/**
 * Formata percentual
 */
const formatPercentage = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  if (!Number.isFinite(value)) return '-';

  return `${(value * 100).toFixed(1)}%`;
};

/**
 * Obtém ícone baseado na direção do critério
 */
const getCriterionDirectionIcon = (
  direction: 'MAIOR' | 'MENOR' | undefined
) => {
  if (direction === 'MAIOR') {
    return <TrendingUp className='h-3 w-3' />;
  } else if (direction === 'MENOR') {
    return <TrendingDown className='h-3 w-3' />;
  }
  return null;
};

/**
 * Skeleton para loading
 */
const ActivePeriodCellSkeleton = () => (
  <div className='p-3 bg-gray-100 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 animate-pulse min-h-[120px] flex flex-col justify-center'>
    <div className='space-y-3'>
      <div className='h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mx-auto'></div>
      <div className='h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2 mx-auto'></div>
      <div className='h-6 bg-gray-300 dark:bg-gray-700 rounded w-2/3 mx-auto'></div>
    </div>
  </div>
);

const ActivePeriodCell = memo<ActivePeriodCellProps>(
  ({
    cellData,
    criterion,
    allSectorData,
    onOpenHistory,
    isLoading = false,
  }) => {
    if (isLoading) {
      return <ActivePeriodCellSkeleton />;
    }

    const {
      valorRealizado,
      valorMeta,
      percentualAtingimento,
      setorId,
      setorNome,
      criterioId,
      criterioNome,
    } = cellData;

    // Extrair percentuais de todos os setores para ranking
    const allPercentages = allSectorData.map(
      (sector) => sector.percentualAtingimento
    );

    // Calcular cores baseadas no desempenho relativo
    const colors = getPerformanceColor(
      percentualAtingimento,
      criterion.sentido_melhor,
      allPercentages,
      setorId
    );

    const decimalPlaces = criterion.casasDecimaisPadrao ?? 0;

    const handleHistoryClick = () => {
      if (onOpenHistory) {
        onOpenHistory({
          criterionId: criterioId,
          sectorId: setorId,
          criterionName: criterioNome,
          sectorName: setorNome,
        });
      }
    };

    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div
              className={`
              p-3 rounded-md border transition-all duration-200 hover:shadow-md
              min-h-[120px] flex flex-col justify-between cursor-default
              ${colors.bgColor} ${colors.borderColor}
            `}
            >
              {/* Header com ícone de direção */}
              <div className='flex items-center justify-between mb-2'>
                <div className='flex items-center gap-1'>
                  {getCriterionDirectionIcon(criterion.sentido_melhor)}
                  <span className={`text-xs font-medium ${colors.textColor}`}>
                    {criterion.sentido_melhor === 'MAIOR'
                      ? 'Maior ↑'
                      : 'Menor ↓'}
                  </span>
                </div>

                {/* Badge de performance */}
                <Badge
                  variant='outline'
                  className={`text-xs ${colors.textColor} ${colors.borderColor}`}
                >
                  {colors.performance === 'excellent' && '🏆'}
                  {colors.performance === 'good' && '✅'}
                  {colors.performance === 'warning' && '⚠️'}
                  {colors.performance === 'poor' && '🔴'}
                  {colors.performance === 'no-data' && '➖'}
                </Badge>
              </div>

              {/* Valores principais */}
              <div className='flex-1 space-y-2'>
                {/* Meta */}
                <div className='text-center'>
                  <div className={`text-xs ${colors.textColor} opacity-80`}>
                    Meta
                  </div>
                  <div className={`text-sm font-semibold ${colors.textColor}`}>
                    {formatValue(valorMeta, decimalPlaces)}
                  </div>
                </div>

                {/* Separador visual */}
                <div className={`border-t ${colors.borderColor} my-2`}></div>

                {/* Realizado */}
                <div className='text-center'>
                  <div className={`text-xs ${colors.textColor} opacity-80`}>
                    Realizado
                  </div>
                  <div className={`text-sm font-semibold ${colors.textColor}`}>
                    {formatValue(valorRealizado, decimalPlaces)}
                  </div>
                </div>
              </div>

              {/* Footer com percentual */}
              <div className='mt-3 pt-2 border-t border-current/20'>
                <div className='flex items-center justify-between'>
                  <div className='flex flex-col items-center flex-1'>
                    <div className={`text-xs ${colors.textColor} opacity-80`}>
                      Atingimento
                    </div>
                    <div className={`text-lg font-bold ${colors.textColor}`}>
                      {formatPercentage(percentualAtingimento)}
                    </div>
                  </div>

                  {/* Botão de histórico */}
                  {onOpenHistory && (
                    <button
                      onClick={handleHistoryClick}
                      className={`
                      p-1 rounded-full transition-colors duration-200
                      hover:bg-black/10 dark:hover:bg-white/10
                      ${colors.textColor}
                    `}
                      title='Ver histórico'
                    >
                      <History className='h-3 w-3' />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </TooltipTrigger>

          <TooltipContent
            className='max-w-xs bg-gray-900 text-white border-gray-700'
            side='top'
          >
            <div className='space-y-2'>
              <div className='font-semibold'>
                {setorNome} - {criterioNome}
              </div>

              <div className='space-y-1 text-sm'>
                <div>Meta: {formatValue(valorMeta, decimalPlaces)}</div>
                <div>
                  Realizado: {formatValue(valorRealizado, decimalPlaces)}
                </div>
                <div>
                  Atingimento: {formatPercentage(percentualAtingimento)}
                </div>
              </div>

              <div className='text-xs opacity-80 pt-1 border-t border-gray-700'>
                Direção:{' '}
                {criterion.sentido_melhor === 'MAIOR'
                  ? 'Maior é melhor'
                  : 'Menor é melhor'}
              </div>

              {colors.performance !== 'no-data' && (
                <div className='text-xs opacity-80'>
                  Performance:{' '}
                  {colors.performance === 'excellent'
                    ? 'Excelente (Top 25%)'
                    : colors.performance === 'good'
                      ? 'Boa (50-75%)'
                      : colors.performance === 'warning'
                        ? 'Atenção (25-50%)'
                        : 'Abaixo do esperado (Bottom 25%)'}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

ActivePeriodCell.displayName = 'ActivePeriodCell';

export { ActivePeriodCell };
