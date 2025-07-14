'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  CompetitionPeriod,
  EntradaResultadoDetalhado,
  Criterion as FullCriterionType,
  RegrasAplicadasPadrao,
  Sector as SectorType,
} from '@/hooks/useParametersData';
import { ChevronDown, ChevronUp, Info, Loader2 } from 'lucide-react';
import React, { memo, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { ActivePeriodCell } from './ActivePeriodCell'; // ✅ NOVO IMPORT
import { useParametersProgress } from './hooks/useParametersProgress';
import { PlanningCellCard } from './PlanningCellCard';

interface ParametersMatrixProps {
  uniqueCriteria: FullCriterionType[];
  resultsBySector: any;
  sectors: SectorType[];
  onEdit: (
    criterion: FullCriterionType,
    sector: SectorType | null,
    initialValue: number | string | null
  ) => void;
  onCreate: (
    criterion: FullCriterionType,
    sector: SectorType | null,
    currentCompetitionPeriod: CompetitionPeriod
  ) => void;
  onCalculate: (
    criterion: FullCriterionType,
    sector: SectorType | null,
    currentCompetitionPeriod: CompetitionPeriod
  ) => void;
  isLoadingMatrixData: boolean;
  periodoAtual: CompetitionPeriod | null;
  onAcceptSuggestion: (
    criterionId: number,
    sectorId: number | null,
    competitionPeriodId: number,
    suggestedValue: number,
    defaultSettingsApplied: RegrasAplicadasPadrao | null,
    criterionName: string,
    sectorName?: string
  ) => void;
  onOpenHistory?: (data: {
    criterionId: number;
    sectorId: number;
    criterionName: string;
    sectorName: string;
  }) => void;
}

const MatrixRow = memo(
  ({
    criterion,
    resultsBySector,
    sectors,
    periodoAtual,
    isPlanejamento,
    isAtiva,
    isFechada,
    isPreFechada, // ✅ NOVO PARÂMETRO
    isLoadingMatrixData,
    onEdit,
    onCreate,
    onCalculate,
    onAcceptSuggestion,
    onOpenHistory,
  }: {
    criterion: FullCriterionType;
    resultsBySector: any;
    sectors: SectorType[];
    periodoAtual: CompetitionPeriod;
    isPlanejamento: boolean;
    isAtiva: boolean;
    isFechada: boolean;
    isPreFechada: boolean; // ✅ NOVO PARÂMETRO
    isLoadingMatrixData: boolean;
    onEdit: ParametersMatrixProps['onEdit'];
    onCreate: ParametersMatrixProps['onCreate'];
    onCalculate: ParametersMatrixProps['onCalculate'];
    onAcceptSuggestion: ParametersMatrixProps['onAcceptSuggestion'];
    onOpenHistory?: ParametersMatrixProps['onOpenHistory'];
  }) => {
    const renderCellContent = (
      criterionFromLoop: FullCriterionType,
      sectorIdStr: string,
      sectorDataFromLoop: any
    ) => {
      const criterioIdMatrix = String(criterionFromLoop.id);
      const currentSector =
        sectors.find((s) => s.id === parseInt(sectorIdStr)) || null;

      const cellApiData: EntradaResultadoDetalhado | null =
        sectorDataFromLoop?.criterios?.[criterioIdMatrix] ?? null;

      // ✅ MODO PLANEJAMENTO - NÃO MEXER (MANTIDO EXATAMENTE COMO ESTAVA)
      if (isPlanejamento) {
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
            </div>
          );
        }

        if (cellApiData) {
          const handleEditInCard = () => {
            if (onEdit) {
              const valueToEdit = cellApiData.isMetaDefinida
                ? cellApiData.metaDefinidaValor
                : cellApiData.metaPropostaPadrao;
              onEdit(criterionFromLoop, currentSector, valueToEdit ?? null);
            }
          };

          const handleCalculateInCard = () => {
            if (onCalculate) {
              onCalculate(criterionFromLoop, currentSector, periodoAtual);
            }
          };

          return (
            <PlanningCellCard
              criterion={criterionFromLoop}
              cellData={cellApiData}
              isLoadingMatrixData={false}
              onEdit={handleEditInCard}
              onCalculate={handleCalculateInCard}
              onAcceptSuggestion={onAcceptSuggestion}
              competitionPeriodId={periodoAtual.id}
              onOpenHistory={onOpenHistory}
            />
          );
        }
        return (
          <div className='p-3 text-xs text-gray-400 min-h-[175px] flex justify-center items-center'>
            Carregando...
          </div>
        );
      }
      // ✅ MODO ATIVA/FECHADA/PRE_FECHADA - NOVA IMPLEMENTAÇÃO MELHORADA
      else if ((isAtiva || isFechada || isPreFechada) && cellApiData) {
        // Coletar dados de todos os setores para este critério (para ranking relativo)
        const allSectorDataForCriterion = Object.entries(resultsBySector)
          .map(([sId, sData]: [string, any]) => {
            const criteriaData = sData?.criterios?.[criterioIdMatrix];
            return {
              setorId: parseInt(sId),
              percentualAtingimento:
                criteriaData?.percentualAtingimento ?? null,
            };
          })
          .filter((item) => item.percentualAtingimento !== null);

        return (
          <ActivePeriodCell
            cellData={{
              valorRealizado: cellApiData.valorRealizado,
              valorMeta: cellApiData.valorMeta,
              percentualAtingimento: cellApiData.percentualAtingimento,
              setorId: cellApiData.setorId,
              setorNome: cellApiData.setorNome,
              criterioId: cellApiData.criterioId,
              criterioNome: cellApiData.criterioNome,
            }}
            criterion={{
              id: criterionFromLoop.id,
              nome: criterionFromLoop.nome,
              sentido_melhor: criterionFromLoop.sentido_melhor,
              casasDecimaisPadrao: criterionFromLoop.casasDecimaisPadrao,
            }}
            allSectorData={allSectorDataForCriterion}
            onOpenHistory={onOpenHistory}
            isLoading={isLoadingMatrixData}
          />
        );
      }

      // ✅ FALLBACK - Se não tem dados ou está carregando
      return (
        <div className='flex flex-col items-center justify-center p-3 h-full min-h-[120px] bg-muted/5 rounded-md'>
          {isLoadingMatrixData ? (
            <Loader2 className='h-4 w-4 animate-spin' />
          ) : (
            <span className='text-muted-foreground text-sm'>Sem dados</span>
          )}
        </div>
      );
    };

    return (
      <TableRow className='hover:bg-muted/30'>
        <TableCell className='font-medium sticky left-0 bg-slate-50 dark:bg-slate-800/50 z-10'>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger className='flex items-center gap-1 text-left w-full cursor-help'>
                <div>{criterion.nome}</div>
                {criterion.descricao && (
                  <Info className='h-3 w-3 text-muted-foreground' />
                )}
              </TooltipTrigger>
              <TooltipContent className='max-w-xs bg-slate-800 text-white'>
                <p>{criterion.descricao}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
        {Object.entries(resultsBySector).map(([sectorIdStr, sectorData]) => (
          <TableCell
            key={`${criterion.id}-${sectorIdStr}`}
            className='p-1 align-top'
          >
            {renderCellContent(criterion, sectorIdStr, sectorData)}
          </TableCell>
        ))}
      </TableRow>
    );
  }
);
MatrixRow.displayName = 'MatrixRow';

const ParametersMatrix: React.FC<ParametersMatrixProps> = memo(
  ({
    uniqueCriteria,
    resultsBySector,
    onEdit,
    onCreate,
    onCalculate,
    isLoadingMatrixData,
    periodoAtual,
    sectors,
    onOpenHistory,
    onAcceptSuggestion,
  }) => {
    const [sortConfig, setSortConfig] = useState<{
      key: keyof FullCriterionType | string;
      direction: 'ascending' | 'descending';
    } | null>(null);

    const sortedCriteria = useMemo(() => {
      if (!uniqueCriteria) return [];
      const sortableCriteria = [...uniqueCriteria];
      if (sortConfig !== null) {
        sortableCriteria.sort((a, b) => {
          const valA = a[sortConfig.key as keyof FullCriterionType];
          const valB = b[sortConfig.key as keyof FullCriterionType];
          if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
        });
      }
      return sortableCriteria;
    }, [uniqueCriteria, sortConfig]);

    const { progressData, isLoading: progressLoading } = useParametersProgress(
      resultsBySector,
      uniqueCriteria
    );

    if (isLoadingMatrixData && !periodoAtual) {
      return (
        <div className='flex justify-center items-center p-8 min-h-[300px]'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
        </div>
      );
    }

    if (!periodoAtual) {
      return (
        <div className='text-center p-8'>
          Selecione um período para ver a matriz.
        </div>
      );
    }

    if (
      (!resultsBySector || Object.keys(resultsBySector).length === 0) &&
      !isLoadingMatrixData
    ) {
      return (
        <div className='text-center p-8'>
          Nenhum dado de resultado encontrado para o período.
        </div>
      );
    }

    if (
      (!uniqueCriteria || uniqueCriteria.length === 0) &&
      !isLoadingMatrixData
    ) {
      return (
        <div className='text-center p-8'>Nenhum critério configurado.</div>
      );
    }

    // ✅ DEFINIÇÃO DE STATUS - MAIS EXPLÍCITA
    const isPlanejamento = periodoAtual.status === 'PLANEJAMENTO';
    const isAtiva = periodoAtual.status === 'ATIVA';
    const isFechada = periodoAtual.status === 'FECHADA';
    const isPreFechada = periodoAtual.status === 'PRE_FECHADA'; // ✅ ADICIONADO

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

    return (
      <div className='space-y-4'>
        <div className='overflow-x-auto rounded-md border'>
          <Table>
            <TableHeader className='bg-muted/30'>
              <TableRow>
                <TableHead
                  className='font-semibold w-[200px] cursor-pointer sticky left-0 bg-slate-50 dark:bg-slate-800 z-10'
                  onClick={() => requestSort('nome')}
                >
                  <div className='flex items-center'>
                    Critério {getSortIcon('nome')}
                  </div>
                </TableHead>
                {Object.entries(resultsBySector).map(
                  ([sectorId, sectorData]) => (
                    <TableHead
                      key={sectorId}
                      className='font-semibold text-center min-w-[220px]'
                    >
                      <div>{(sectorData as any).setorNome}</div>
                    </TableHead>
                  )
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCriteria.map((criterion: FullCriterionType) => (
                <MatrixRow
                  key={criterion.id}
                  criterion={criterion}
                  resultsBySector={resultsBySector}
                  sectors={sectors}
                  periodoAtual={periodoAtual}
                  isPlanejamento={isPlanejamento}
                  isAtiva={isAtiva}
                  isFechada={isFechada}
                  isPreFechada={isPreFechada} // ✅ PASSANDO NOVO PARÂMETRO
                  isLoadingMatrixData={isLoadingMatrixData}
                  onEdit={onEdit}
                  onCreate={onCreate}
                  onCalculate={onCalculate}
                  onAcceptSuggestion={onAcceptSuggestion}
                  onOpenHistory={onOpenHistory}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
);
ParametersMatrix.displayName = 'ParametersMatrix';

export default ParametersMatrix;
