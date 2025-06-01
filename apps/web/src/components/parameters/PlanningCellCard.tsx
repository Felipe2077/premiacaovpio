// // src/components/parameters/PlanningCellCard.tsx
// 'use client';

// import { useCalculationSettings } from '@/hooks/useCalculationSettings'; // Hook que busca as regras padrão
// import {
//   Period as CompetitionPeriod,
//   Criterion,
// } from '@/hooks/useParametersData'; // Ajuste os tipos se necessário
// import { calculateProposedMeta } from '@/utils/calculationUtils'; // Nossas funções de cálculo
// import { useEffect, useState } from 'react';
// import { CalculationSettings } from './CalculationSettings'; // Para exibir as regras textualmente

// // Props que o PlanningCellCard receberá
// interface PlanningCellCardProps {
//   criterion: Criterion; // Contém id, nome, casasDecimaisPadrao, sentido_melhor
//   sectorId: number | null;
//   periodoAtual: CompetitionPeriod; // Para saber para qual mês estamos planejando
//   fetchHistoricalData: (
//     criterionId: number,
//     sectorId: number | null,
//     currentPeriodYYYYMM: string, // Este será o periodoAtual.mesAno
//     count: number
//   ) => Promise<any[]>; // Função para buscar o histórico
// }

// // Função para formatar YYYY-MM-DD para YYYY-MM (pode vir de utils se usada em mais lugares)
// const formatDateToYearMonth = (dateInput: Date | string | number): string => {
//   const date = new Date(dateInput);
//   if (isNaN(date.getTime())) return 'data-invalida';
//   const year = date.getUTCFullYear();
//   const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
//   return `${year}-${month}`;
// };

// export function PlanningCellCard({
//   criterion,
//   sectorId,
//   periodoAtual,
//   fetchHistoricalData,
// }: PlanningCellCardProps) {
//   const { settings: defaultSettings, isLoading: isLoadingSettings } =
//     useCalculationSettings(criterion.id);

//   const [historicalData, setHistoricalData] = useState<any[] | null>(null);
//   const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

//   const [metaProposta, setMetaProposta] = useState<number | null>(null);
//   const [metaAnterior, setMetaAnterior] = useState<number | null>(null);
//   const [periodoMetaAnterior, setPeriodoMetaAnterior] = useState<string | null>(
//     null
//   );
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (!criterion || !periodoAtual || !defaultSettings) {
//       // Aguarda settings também
//       return;
//     }

//     const loadDataAndCalculate = async () => {
//       setIsLoadingHistory(true);
//       setError(null);
//       setMetaProposta(null); // Reseta antes de calcular
//       setMetaAnterior(null);
//       setPeriodoMetaAnterior(null);

//       try {
//         // fetchHistoricalData busca dados ANTERIORES ao currentPeriodYYYYMM fornecido.
//         // Se periodoAtual.mesAno é "2025-05" (Maio, para o qual estamos planejando),
//         // fetchHistoricalData com "2025-05" buscará Abril, Março, etc.
//         const history = await fetchHistoricalData(
//           criterion.id,
//           sectorId,
//           periodoAtual.mesAno, // Passa o mesAno do período de planejamento
//           6 // Busca os últimos 6 meses para ter dados para media3, media6, etc.
//         );
//         setHistoricalData(history);

//         // 1. Extrair Meta Anterior
//         if (history && history.length > 0) {
//           // Assumindo que o primeiro item é o mais recente (mês anterior ao de planejamento)
//           // e que ele contém 'valorMeta'
//           const prevMonthData = history[0];
//           if (
//             prevMonthData &&
//             prevMonthData.valorMeta !== null &&
//             prevMonthData.valorMeta !== undefined
//           ) {
//             setMetaAnterior(prevMonthData.valorMeta);
//             setPeriodoMetaAnterior(prevMonthData.periodo); // Para exibir "Meta Anterior (Abr/2025): valor"
//           }
//         }

//         // 2. Calcular Meta Proposta
//         // Determinar as casas decimais efetivas (Configuração salva > Padrão do Critério > Fallback)
//         const effectiveDecimalPlaces =
//           defaultSettings.roundingDecimalPlaces?.toString() ||
//           criterion.casasDecimaisPadrao?.toString() ||
//           '0'; // Fallback para 0 casas se nada definido

//         const proposed = calculateProposedMeta({
//           historicalData: history,
//           calculationMethod: defaultSettings.calculationMethod,
//           adjustmentPercentage:
//             defaultSettings.adjustmentPercentage?.toString() || '0',
//           roundingMethod: defaultSettings.roundingMethod || 'none',
//           decimalPlaces: effectiveDecimalPlaces,
//           criterionBetterDirection: criterion.sentido_melhor,
//         });
//         setMetaProposta(proposed);
//       } catch (err) {
//         console.error('Erro no PlanningCellCard:', err);
//         setError('Falha ao calcular proposta.');
//       } finally {
//         setIsLoadingHistory(false);
//       }
//     };

//     loadDataAndCalculate();
//   }, [
//     criterion,
//     sectorId,
//     periodoAtual,
//     fetchHistoricalData,
//     defaultSettings, // Recalcula se as settings padrão mudarem
//   ]);

//   const isLoading = isLoadingSettings || isLoadingHistory;

//   if (isLoading) {
//     return (
//       <div className='p-3 text-xs text-gray-400 min-h-[100px] flex justify-center items-center'>
//         Calculando proposta...
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className='p-3 text-xs text-red-500 min-h-[100px] flex justify-center items-center'>
//         {error}
//       </div>
//     );
//   }

//   // Formatar para exibição (usando casasDecimaisPadrao do critério para consistência)
//   const displayDecimalPlaces =
//     criterion.casasDecimaisPadrao !== undefined
//       ? criterion.casasDecimaisPadrao
//       : 0;

//   return (
//     <div className='p-3 bg-blue-50 rounded-md border border-blue-100'>
//       <div className='text-center'>
//         <div className='text-lg font-semibold'>
//           {metaProposta !== null
//             ? metaProposta.toLocaleString('pt-BR', {
//                 minimumFractionDigits: displayDecimalPlaces,
//                 maximumFractionDigits: displayDecimalPlaces,
//               })
//             : '-'}
//         </div>
//         <div className='text-xs text-gray-500 mt-1'>Meta Proposta</div>
//       </div>

//       <div className='mt-3 pt-2 border-t border-blue-100'>
//         <div className='text-xs text-gray-600 flex justify-between'>
//           <span>
//             Meta Anterior
//             {periodoMetaAnterior && ` (${periodoMetaAnterior})`}:
//           </span>
//           <span className='font-medium'>
//             {metaAnterior !== null
//               ? metaAnterior.toLocaleString('pt-BR', {
//                   minimumFractionDigits: displayDecimalPlaces,
//                   maximumFractionDigits: displayDecimalPlaces,
//                 })
//               : '-'}
//           </span>
//         </div>
//         {/* O CalculationSettings apenas exibe as regras, não precisa recalcular */}
//         <CalculationSettings criterionId={criterion.id} />
//       </div>
//       {/* Os botões de ação (Editar, Calcular no Modal, Histórico) virão do ParametersMatrix */}
//     </div>
//   );
// }
// src/components/parameters/PlanningCellCard.tsx
'use client';

import { Button } from '@/components/ui/button'; // Para os botões de ação
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCalculationSettings } from '@/hooks/useCalculationSettings';
import {
  Period as CompetitionPeriod,
  Criterion,
  Sector,
} from '@/hooks/useParametersData'; // Ajuste se seus tipos estiverem em outro lugar
import { calculateProposedMeta } from '@/utils/calculationUtils';
import { Calculator, Edit, History } from 'lucide-react'; // Ícones
import React, { useEffect, useMemo, useState } from 'react';
import { CalculationSettings } from './CalculationSettings'; // Para exibir as regras textualmente

interface PlanningCellCardProps {
  criterion: Criterion; // Inclui id, nome, casasDecimaisPadrao, sentido_melhor
  sector: Sector | null; // Objeto completo do setor
  periodoAtual: CompetitionPeriod;
  fetchHistoricalData: (
    criterionId: number,
    sectorId: number | null,
    currentPeriodYYYYMM: string,
    count: number
  ) => Promise<any[]>;
  onEdit: () => void; // Função para editar manualmente (recebida de ParametersMatrix)
  onCalculate: () => void; // Função para abrir o modal de cálculo (recebida de ParametersMatrix)
  // onHistory: () => void; // Se tiver uma função para ver histórico
}

// Componente Skeleton Loader
const PlanningCellSkeleton: React.FC = () => {
  return (
    <div className='p-3 bg-blue-50 rounded-md border border-blue-100 animate-pulse min-h-[160px]'>
      {' '}
      {/* Dimensão aproximada */}
      <div className='text-center mb-3'>
        <div className='h-7 bg-slate-200 rounded w-1/2 mx-auto mb-1'></div>
        <div className='h-3 bg-slate-200 rounded w-1/3 mx-auto'></div>
      </div>
      <div className='mt-3 pt-2 border-t border-blue-100'>
        <div className='h-4 bg-slate-200 rounded w-3/4 mb-2'></div>
        <div className='h-3 bg-slate-200 rounded w-1/2 mb-1'></div>
        <div className='h-3 bg-slate-200 rounded w-1/2'></div>
      </div>
      <div className='flex justify-between mt-4 pt-2 border-t border-gray-100'>
        <div className='h-6 w-6 bg-slate-200 rounded-full'></div>
        <div className='h-6 w-6 bg-slate-200 rounded-full'></div>
        <div className='h-6 w-6 bg-slate-200 rounded-full'></div>
      </div>
    </div>
  );
};

export function PlanningCellCard({
  criterion,
  sector,
  periodoAtual,
  fetchHistoricalData,
  onEdit,
  onCalculate,
}: PlanningCellCardProps) {
  // 1. Buscar as configurações padrão para este critério
  const {
    settings: defaultSettings,
    isLoading: isLoadingSettings,
    error: settingsError,
  } = useCalculationSettings(criterion.id);

  // 2. Estados para dados históricos e valores calculados
  const [historicalData, setHistoricalData] = useState<any[] | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // useEffect para buscar dados históricos quando as props necessárias estiverem disponíveis
  useEffect(() => {
    if (!criterion || !periodoAtual || !fetchHistoricalData) {
      return;
    }

    const loadHistory = async () => {
      setIsLoadingHistory(true);
      setHistoryError(null);
      try {
        // periodoAtual.mesAno é o mês para o qual estamos planejando (ex: "2025-05")
        // fetchHistoricalData busca dados ANTERIORES a este período.
        const history = await fetchHistoricalData(
          criterion.id,
          sector?.id || null, // Usa o ID do setor passado na prop
          periodoAtual.mesAno,
          6 // Ex: busca os últimos 6 meses de dados
        );
        setHistoricalData(history);
      } catch (err: any) {
        console.error(
          `Erro ao buscar histórico para critério ${criterion.id}, setor ${sector?.id}:`,
          err
        );
        setHistoryError(err.message || 'Falha ao buscar histórico.');
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [criterion, sector?.id, periodoAtual, fetchHistoricalData]);

  // 3. Memoizar o cálculo da meta proposta e meta anterior
  const { metaProposta, metaAnterior, periodoMetaAnterior } = useMemo(() => {
    if (!defaultSettings || !historicalData) {
      return {
        metaProposta: null,
        metaAnterior: null,
        periodoMetaAnterior: null,
      };
    }

    // Extrair Meta Anterior
    let anterior: number | null = null;
    let periodoAnterior: string | null = null;
    if (
      historicalData.length > 0 &&
      historicalData[0]?.valorMeta !== null &&
      historicalData[0]?.valorMeta !== undefined
    ) {
      anterior = historicalData[0].valorMeta;
      periodoAnterior = historicalData[0].periodo;
    }

    // Determinar casas decimais para o cálculo e exibição da proposta
    // Prioridade: Configuração salva (defaultSettings) > Padrão do critério > Fallback
    const effectiveDecimalPlacesStr =
      defaultSettings.roundingDecimalPlaces?.toString() ||
      criterion.casasDecimaisPadrao?.toString() ||
      '0'; // Usar '0' como fallback se tudo for nulo

    const proposed = calculateProposedMeta({
      historicalData,
      calculationMethod: defaultSettings.calculationMethod,
      adjustmentPercentage:
        defaultSettings.adjustmentPercentage?.toString() || '0',
      roundingMethod: defaultSettings.roundingMethod || 'none',
      decimalPlaces: effectiveDecimalPlacesStr,
      criterionBetterDirection: criterion.sentido_melhor,
    });

    return {
      metaProposta: proposed,
      metaAnterior: anterior,
      periodoMetaAnterior: periodoAnterior,
    };
  }, [
    defaultSettings,
    historicalData,
    criterion.casasDecimaisPadrao,
    criterion.sentido_melhor,
  ]);

  // Estado geral de carregamento para o card
  const isLoadingCardData = isLoadingSettings || isLoadingHistory;

  if (isLoadingCardData) {
    return <PlanningCellSkeleton />;
  }

  if (settingsError || historyError) {
    return (
      <div className='p-3 text-xs text-red-500 min-h-[100px] flex justify-center items-center'>
        {settingsError || historyError}
      </div>
    );
  }

  if (!defaultSettings) {
    // Segurança caso settings não carregue por algum motivo não pego pelo error state do hook
    return (
      <div className='p-3 text-xs text-gray-400 min-h-[100px] flex justify-center items-center'>
        Configurações não disponíveis.
      </div>
    );
  }

  // Casas decimais para EXIBIÇÃO (pode ser diferente das usadas no cálculo se a regra mudar)
  // Aqui usamos o padrão do critério para a exibição da proposta e anterior.
  const displayDecimalPlaces =
    criterion.casasDecimaisPadrao !== undefined
      ? criterion.casasDecimaisPadrao
      : 0;

  return (
    <div className='p-3 bg-blue-50 rounded-md border border-blue-100 min-h-[160px] flex flex-col justify-between'>
      <div>
        <div className='text-center'>
          <div className='text-lg font-semibold'>
            {metaProposta !== null
              ? metaProposta.toLocaleString('pt-BR', {
                  minimumFractionDigits: displayDecimalPlaces,
                  maximumFractionDigits: displayDecimalPlaces,
                })
              : '-'}
          </div>
          <div className='text-xs text-gray-500 mt-1'>Meta Proposta</div>
        </div>

        <div className='mt-3 pt-2 border-t border-blue-100'>
          <div className='text-xs text-gray-600 flex justify-between'>
            <span>
              Meta Anterior
              {periodoMetaAnterior && ` (${periodoMetaAnterior})`}:
            </span>
            <span className='font-medium'>
              {metaAnterior !== null
                ? metaAnterior.toLocaleString('pt-BR', {
                    minimumFractionDigits: displayDecimalPlaces,
                    maximumFractionDigits: displayDecimalPlaces,
                  })
                : '-'}
            </span>
          </div>
          {/* CalculationSettings exibe as regras que FORAM USADAS para a proposta acima */}
          <CalculationSettings criterionId={criterion.id} />
        </div>
      </div>

      {/* Botões de Ação Integrados */}
      <div className='flex justify-between mt-auto pt-2 border-t border-gray-100'>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onEdit}
                className='text-blue-600 hover:text-blue-800'
              >
                <Edit className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Editar Meta Manualmente</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onCalculate}
                className='text-emerald-600 hover:text-emerald-800'
              >
                <Calculator className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Personalizar Cálculo (Abrir Modal)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                /* onClick={onHistory} */ className='text-gray-500 hover:text-gray-700'
              >
                <History className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ver Histórico</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
