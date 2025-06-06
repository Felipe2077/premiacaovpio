// src/components/parameters/ParametersMatrix.tsx
'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useParametersProgress } from './hooks/useParametersProgress';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
// Importe os tipos completos de useParametersData ou shared-types
import {
  Period as CompetitionPeriodType,
  EntradaResultadoDetalhado,
  Criterion as FullCriterionType, // Este é o tipo que cellApiData terá
  RegrasAplicadasPadrao, // Use um alias se Criterion já estiver definido localmente
  Sector as SectorType,
} from '@/hooks/useParametersData'; // Ou importe de @sistema-premiacao/shared-types se for mais central
import {
  Calculator,
  ChevronDown,
  ChevronUp,
  Edit,
  // Os ícones para os botões do card agora estão dentro de PlanningCellCard
  // Edit,
  // Calculator,
  History,
  Info,
  Loader2, // Para o estado de loading da matriz
  Minus,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import React, { useMemo, useState } from 'react'; // Corrigido React.useMemo
import { Button } from '../ui/button'; // Se usar botões aqui
import { PlanningCellCard } from './PlanningCellCard';
import { SectorProgressIndicator } from './progress/SectorProgressIndicator';

// Interface CompetitionPeriod local (se diferente da importada)
// Se for igual à do hook useParametersData, não precisa redefinir.
// interface CompetitionPeriod {
//   id: number;
//   mesAno: string;
//   status: 'ATIVA' | 'FECHADA' | 'PLANEJAMENTO';
//   startDate: Date | string;
// }

interface ParametersMatrixProps {
  uniqueCriteria: FullCriterionType[];
  resultsBySector: any; // Idealmente, um tipo mais específico: Record<string, { setorNome: string, criterios: Record<string, EntradaResultadoDetalhado> }>
  sectors: SectorType[];
  onEdit: (
    // Assinatura de ParametersPage
    criterion: FullCriterionType,
    sector: SectorType | null,
    initialValue: number | string | null // Valor para preencher o form de edição
    // Adicione outros params se handleOpenEditModalFromMatrix precisar
  ) => void;
  onCreate: (
    // Assinatura de ParametersPage
    criterion: FullCriterionType,
    sector: SectorType | null,
    currentCompetitionPeriod: CompetitionPeriodType
  ) => void;
  onCalculate: (
    // Assinatura de ParametersPage
    criterion: FullCriterionType,
    sector: SectorType | null,
    currentCompetitionPeriod: CompetitionPeriodType
  ) => void;
  isLoadingMatrixData: boolean; // Renomeado de isLoading
  periodoAtual: CompetitionPeriodType | null;
  // fetchHistoricalData: (...args: any[]) => Promise<any[]>; // PlanningCellCard não usa mais
  onAcceptSuggestion: (
    // Assinatura de ParametersPage
    criterionId: number,
    sectorId: number | null,
    competitionPeriodId: number,
    suggestedValue: number,
    defaultSettingsApplied: RegrasAplicadasPadrao | null
  ) => void;
  onOpenHistory?: (data: {
    criterionId: number;
    sectorId: number;
    criterionName: string;
    sectorName: string;
  }) => void;
}

interface ParameterData {
  criterioId: number;
  criterioNome: string;
  setorId: number;
  setorNome: string;
  isMetaDefinida: boolean;
  metaDefinidaValor: number | null;
  metaPropostaPadrao: number | null;
  metaAnteriorValor: number | null;
  metaAnteriorPeriodo: string | null;
  regrasAplicadasPadrao: string | null;
  periodo: string;
}

interface ParameterMatrixProps {
  data: ParameterData[];
  isLoading: boolean;
  onAcceptSuggestion: (
    criterioId: number,
    setorId: number,
    valor: number
  ) => void;
  onEditParameter: (criterioId: number, setorId: number) => void;
  onDeleteParameter: (criterioId: number, setorId: number) => void;
  onResetParameter: (criterioId: number, setorId: number) => void;
  period: string;
}

const ParametersMatrix: React.FC<ParametersMatrixProps> = ({
  uniqueCriteria,
  resultsBySector,
  onEdit,
  onCreate,
  onCalculate,
  isLoadingMatrixData, // Renomeado
  periodoAtual,
  sectors,
  onOpenHistory,
  onAcceptSuggestion,
}) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof FullCriterionType | string; // Ajustado para ser mais flexível
    direction: 'ascending' | 'descending';
  } | null>(null);

  const sortedCriteria = useMemo(() => {
    // Corrigido para useMemo
    if (!uniqueCriteria) return [];
    const sortableCriteria = [...uniqueCriteria];
    if (sortConfig !== null) {
      sortableCriteria.sort((a, b) => {
        // Tratamento para 'index' que pode ser null
        const valA =
          sortConfig.key === 'index'
            ? (a.index ?? Infinity)
            : a[sortConfig.key as keyof FullCriterionType];
        const valB =
          sortConfig.key === 'index'
            ? (b.index ?? Infinity)
            : b[sortConfig.key as keyof FullCriterionType];

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    } else {
      sortableCriteria.sort(
        (a, b) =>
          (a.index ?? Infinity) - (b.index ?? Infinity) ||
          a.nome.localeCompare(b.nome)
      );
    }
    return sortableCriteria;
  }, [uniqueCriteria, sortConfig]);

  const { progressData, isLoading: progressLoading } = useParametersProgress(
    resultsBySector,
    uniqueCriteria
  );

  if (isLoadingMatrixData && !periodoAtual) {
    // Mostra loading principal se ainda não tem período
    return (
      <div className='flex justify-center items-center p-8 min-h-[300px]'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        <span className='ml-2 text-muted-foreground'>
          Carregando dados da matriz...
        </span>
      </div>
    );
  }

  if (!periodoAtual) {
    // Se não há período selecionado (após o loading inicial)
    return (
      <div className='flex justify-center items-center p-8 min-h-[200px] border rounded-md bg-muted/10'>
        <div className='text-muted-foreground'>
          Selecione um período para ver a matriz.
        </div>
      </div>
    );
  }

  if (
    !resultsBySector ||
    (Object.keys(resultsBySector).length === 0 && !isLoadingMatrixData)
  ) {
    return (
      <div className='flex justify-center items-center p-8 min-h-[200px] border rounded-md bg-muted/10'>
        <div className='text-muted-foreground'>
          Nenhum dado de resultado encontrado para os setores no período
          {periodoAtual.mesAno}.
        </div>
      </div>
    );
  }

  if (
    !uniqueCriteria ||
    (uniqueCriteria.length === 0 && !isLoadingMatrixData)
  ) {
    return (
      <div className='flex justify-center items-center p-8 min-h-[200px] border rounded-md bg-muted/10'>
        <div className='text-muted-foreground'>
          Nenhum critério configurado para exibição.
        </div>
      </div>
    );
  }

  const currentStatus = periodoAtual.status;
  const isPlanejamento = currentStatus === 'PLANEJAMENTO';
  const isAtiva = currentStatus === 'ATIVA';
  const isFechada = currentStatus === 'FECHADA';

  const requestSort = (key: keyof FullCriterionType | string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === 'ascending'
    ) {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof FullCriterionType | string) => {
    if (!sortConfig || sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? (
      <ChevronUp className='h-4 w-4 ml-1' />
    ) : (
      <ChevronDown className='h-4 w-4 ml-1' />
    );
  };

  const renderCellContent = (
    criterionFromLoop: FullCriterionType,
    sectorIdStr: string,
    sectorDataFromLoop: any
  ) => {
    const criterioIdMatrix = String(criterionFromLoop.id);
    const currentSector =
      sectors.find((s) => s.id === parseInt(sectorIdStr)) || null;

    const cellApiData: EntradaResultadoDetalhado | null =
      sectorDataFromLoop?.criterios &&
      criterioIdMatrix in sectorDataFromLoop.criterios
        ? sectorDataFromLoop.criterios[criterioIdMatrix]
        : null;

    if (isPlanejamento && periodoAtual) {
      // periodoAtual já é verificado acima
      // Se a API não retornou uma entrada para esta célula (cellApiData é null),
      // mas estamos em planejamento, pode ser um critério/setor sem meta sugerida ainda.
      // O PlanningCellCard pode lidar com cellApiData null e mostrar "Meta a definir" ou similar.
      // Ou podemos ter um botão "Definir Meta" aqui como fallback se cellApiData for totalmente nulo.
      if (!cellApiData && onCreate) {
        return (
          <div className='flex flex-col items-center justify-center p-3 h-full min-h-[175px] bg-muted/5 rounded-md'>
            <div className='text-muted-foreground text-sm mb-2'>
              Meta a definir
            </div>
            {currentSector && (
              <Button
                variant='outline'
                size='sm'
                onClick={() =>
                  onCreate(criterionFromLoop, currentSector, periodoAtual)
                }
              >
                Definir Meta
              </Button>
            )}
            {/* Botão para abrir o modal de cálculo, mesmo sem meta definida */}
            {onCalculate && currentSector && (
              <Button
                variant='link'
                size='sm'
                onClick={() =>
                  onCalculate(criterionFromLoop, currentSector, periodoAtual)
                }
                className='mt-1 text-xs'
              >
                Calcular no Modal
              </Button>
            )}
          </div>
        );
      }

      // Se cellApiData existe (agora vem do backend com campos de planejamento)
      if (cellApiData) {
        const handleEditInCard = () => {
          if (onEdit && periodoAtual) {
            // Adicionado check periodoAtual
            const valueToEdit = cellApiData.isMetaDefinida
              ? cellApiData.metaDefinidaValor
              : cellApiData.metaPropostaPadrao;
            // Passa o objeto cellApiData inteiro para que ParametersPage tenha todo o contexto
            onEdit(
              criterionFromLoop,
              currentSector,
              valueToEdit ?? null /*, periodoAtual, cellApiData */
            );
            // A prop onEdit em ParametersPage foi definida como handleOpenEditModalFromMatrix
            // Ela espera (criterion, sector, currentCompetitionPeriod, cellData)
          }
        };

        const handleCalculateInCard = () => {
          if (onCalculate && periodoAtual) {
            onCalculate(criterionFromLoop, currentSector, periodoAtual);
          }
        };

        return (
          <PlanningCellCard
            criterion={criterionFromLoop}
            cellData={cellApiData}
            isLoadingMatrixData={false} // Dados da célula específica já chegaram
            onEdit={handleEditInCard}
            onCalculate={handleCalculateInCard}
            onAcceptSuggestion={onAcceptSuggestion}
            competitionPeriodId={periodoAtual.id}
            onOpenHistory={onOpenHistory}
          />
        );
      }
      // Fallback se cellApiData for null mas não entrou no if(!cellApiData && onCreate)
      return (
        <div className='p-3 text-xs text-gray-400 min-h-[175px] flex justify-center items-center'>
          Carregando dados da célula...
        </div>
      );
    } else if ((isAtiva || isFechada) && cellApiData) {
      const atingimento = cellApiData.percentualAtingimento ?? 0; // Usar ?? para fallback
      const statusColor =
        atingimento >= 1
          ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700'
          : atingimento >= 0.8
            ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-800/30 dark:border-yellow-700'
            : 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-700';

      const tendencia = (cellApiData as any).tendencia || 0; // Se 'tendencia' existir
      const trendIcon =
        tendencia > 0 ? (
          <TrendingUp className='h-3 w-3 text-green-600' />
        ) : tendencia < 0 ? (
          <TrendingDown className='h-3 w-3 text-red-600' />
        ) : (
          <Minus className='h-3 w-3 text-gray-600' />
        );

      const displayDecimalPlaces = criterionFromLoop.casasDecimaisPadrao ?? 0;

      return (
        <div
          className={`p-3 rounded-md border ${statusColor} transition-all hover:shadow-sm min-h-[175px]`}
        >
          <div className='space-y-1'>
            <div className='flex justify-between text-xs'>
              <span className='text-slate-600 dark:text-slate-400'>Meta:</span>
              <span className='font-semibold'>
                {cellApiData.valorMeta !== null &&
                cellApiData.valorMeta !== undefined
                  ? Number(cellApiData.valorMeta).toLocaleString('pt-BR', {
                      minimumFractionDigits: displayDecimalPlaces,
                      maximumFractionDigits: displayDecimalPlaces,
                    })
                  : '-'}
              </span>
            </div>
            <div className='flex justify-between text-xs'>
              <span className='text-slate-600 dark:text-slate-400'>
                Realizado:
              </span>
              <span className='font-semibold'>
                {cellApiData.valorRealizado !== null &&
                cellApiData.valorRealizado !== undefined
                  ? cellApiData.valorRealizado.toLocaleString('pt-BR', {
                      minimumFractionDigits: displayDecimalPlaces,
                      maximumFractionDigits: displayDecimalPlaces,
                    })
                  : '-'}
              </span>
            </div>
          </div>
          <div className='mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 border-opacity-50'>
            <div className='flex justify-between items-center text-xs'>
              <span className='text-slate-600 dark:text-slate-400'>
                Ating.:
              </span>
              <div className='flex items-center gap-1'>
                <span
                  className={`font-semibold ${atingimento >= 1 ? 'text-green-600 dark:text-green-300' : atingimento >= 0.8 ? 'text-yellow-600 dark:text-yellow-300' : 'text-red-600 dark:text-red-300'}`}
                >
                  {cellApiData.percentualAtingimento !== null &&
                  cellApiData.percentualAtingimento !== undefined
                    ? `${(cellApiData.percentualAtingimento * 100).toFixed(1)}%`
                    : '-'}
                </span>
                {trendIcon}
              </div>
            </div>
            <div className='flex justify-between text-xs mt-1'>
              <span className='text-slate-600 dark:text-slate-400'>
                Pontos:
              </span>
              <span className='font-semibold'>
                {cellApiData.pontos !== null ? cellApiData.pontos : '-'}
              </span>
            </div>
          </div>
          <div className='flex justify-around mt-auto pt-2 border-t border-slate-200 dark:border-slate-700 border-opacity-50'>
            {onEdit &&
              periodoAtual &&
              isPlanejamento && ( // Editar só em planejamento
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() =>
                          onEdit(
                            criterionFromLoop,
                            currentSector,
                            cellApiData.valorMeta
                          )
                        }
                        className='text-blue-600 hover:text-blue-700'
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className='bg-slate-800 text-white'>
                      <p>Editar Meta</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            {onCalculate &&
              periodoAtual &&
              isPlanejamento && ( // Calcular (modal) só em planejamento
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <Button
                        variant='ghost'
                        size='icon'
                        onClick={() =>
                          onCalculate(
                            criterionFromLoop,
                            currentSector,
                            periodoAtual
                          )
                        }
                        className='text-emerald-600 hover:text-emerald-700'
                      >
                        <Calculator className='h-4 w-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className='bg-slate-800 text-white'>
                      <p>Personalizar Cálculo</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    onClick={() => {
                      if (onOpenHistory) {
                        onOpenHistory({
                          criterionId: criterionFromLoop.id,
                          sectorId: parseInt(sectorIdStr),
                          criterionName: criterionFromLoop.nome,
                          sectorName:
                            currentSector?.nome || `Setor ${sectorIdStr}`,
                        });
                      }
                    }}
                    className='text-gray-500 hover:text-gray-600'
                  >
                    <History className='h-4 w-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className='bg-slate-800 text-white'>
                  <p>Ver Histórico</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      );
    }

    // Fallback final
    return (
      <div className='p-3 text-xs text-gray-400 min-h-[175px] flex justify-center items-center'>
        {isLoadingMatrixData ? (
          <Loader2 className='h-4 w-4 animate-spin' />
        ) : (
          '-'
        )}
      </div>
    );
  };

  return (
    <div className='space-y-4'>
      <div className='flex justify-between items-center'>
        <div>
          <p className='text-sm text-muted-foreground'>
            {isPlanejamento &&
              'Fase de Planejamento - Defina as metas para o próximo período.'}
            {isAtiva &&
              'Período Ativo - Acompanhe o desempenho em relação às metas.'}
            {isFechada && 'Período Fechado - Visualize os resultados finais.'}
            {!isPlanejamento &&
              !isAtiva &&
              !isFechada &&
              'Status do período não definido.'}
          </p>
        </div>
        <div className='text-sm text-muted-foreground'>
          {resultsBySector ? Object.keys(resultsBySector).length : 0} setores •
          {uniqueCriteria?.length || 0} critérios
        </div>
      </div>
      <div className='overflow-x-auto rounded-md border'>
        <Table>
          <TableHeader className='bg-muted/30 dark:bg-slate-800'>
            <TableRow>
              <TableHead
                className='font-semibold w-[200px] cursor-pointer hover:bg-muted/50 dark:hover:bg-slate-700/50 transition-colors sticky left-0 bg-slate-50 dark:bg-slate-800 z-10'
                onClick={() => requestSort('nome')}
              >
                <div className='flex items-center'>
                  Critério {getSortIcon('nome')}
                </div>
              </TableHead>
              {resultsBySector &&
                Object.entries(resultsBySector).map(
                  ([sectorId, sectorData]) => (
                    <TableHead
                      key={sectorId}
                      className='font-semibold text-center min-w-[220px] px-2'
                    >
                      {/* Nome do setor */}
                      <div className='pb-1'>
                        {(sectorData as any).setorNome}
                      </div>

                      {/* ✅ Indicador de progresso só em PLANEJAMENTO */}
                      {isPlanejamento && (
                        <SectorProgressIndicator
                          setorNome={(sectorData as any).setorNome}
                          definidas={
                            progressData[(sectorData as any).setorNome]
                              ?.definidas || 0
                          }
                          total={
                            progressData[(sectorData as any).setorNome]
                              ?.total || 0
                          }
                          percentual={
                            progressData[(sectorData as any).setorNome]
                              ?.percentual || 0
                          }
                          isLoading={progressLoading || isLoadingMatrixData}
                        />
                      )}
                    </TableHead>
                  )
                )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCriteria.map((criterion: FullCriterionType) => (
              <TableRow
                key={criterion.id}
                className='hover:bg-muted/20 dark:hover:bg-slate-700/30'
              >
                <TableCell className='font-medium sticky left-0 bg-slate-50 dark:bg-slate-800/50 backdrop-blur-sm z-10 group-hover:bg-white dark:group-hover:bg-slate-900'>
                  <TooltipProvider>
                    <Tooltip delayDuration={200}>
                      <TooltipTrigger className='flex items-center gap-1 cursor-help text-left w-full'>
                        <div>{criterion.nome}</div>
                        {criterion.descricao && (
                          <Info className='h-3 w-3 text-muted-foreground opacity-70 flex-shrink-0' />
                        )}
                      </TooltipTrigger>
                      <TooltipContent className='max-w-xs bg-slate-800 text-white p-2 rounded shadow-lg'>
                        <div className='space-y-1'>
                          <p className='font-medium'>{criterion.nome}</p>
                          {criterion.descricao && (
                            <p className='text-xs'>{criterion.descricao}</p>
                          )}
                          {criterion.sentido_melhor && (
                            <p className='text-xs'>
                              Sentido:
                              {criterion.sentido_melhor === 'MAIOR'
                                ? 'Maior é melhor'
                                : 'Menor é melhor'}
                            </p>
                          )}
                          {criterion.unidade_medida && (
                            <p className='text-xs'>
                              Unidade: {criterion.unidade_medida}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                {resultsBySector &&
                  Object.entries(resultsBySector).map(
                    ([sectorIdStr, sectorData]) => (
                      <TableCell
                        key={`${criterion.id}-${sectorIdStr}`}
                        className='p-1 align-top'
                      >
                        {renderCellContent(criterion, sectorIdStr, sectorData)}
                      </TableCell>
                    )
                  )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {/* Legenda ... */}
    </div>
  );
};
export default ParametersMatrix;
