// src/components/parameters/PlanningCellCard.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Criterion,
  EntradaResultadoDetalhado,
  RegrasAplicadasPadrao, // Certifique-se que este tipo está exportado e importado corretamente
} from '@sistema-premiacao/shared-types';
import {
  Calculator,
  CheckCircle2,
  Edit,
  History,
  ThumbsUp,
} from 'lucide-react';
import React from 'react';
import { CalculationSettings } from './CalculationSettings';

interface PlanningCellCardProps {
  criterion: Criterion;
  cellData: EntradaResultadoDetalhado | null;
  isLoadingMatrixData: boolean;
  competitionPeriodId: number; // <<< NOVA PROP: ID do período de planejamento atual
  onEdit: () => void;
  onCalculate: () => void;
  onAcceptSuggestion: (
    // <<< NOVA PROP
    criterionId: number,
    sectorId: number | null,
    competitionPeriodId: number, // Passaremos o ID do período
    suggestedValue: number,
    defaultSettingsApplied: RegrasAplicadasPadrao // Passa as regras que geraram a sugestão
  ) => void;
}

const PlanningCellSkeleton: React.FC = () => {
  // ... (Skeleton Loader como definido anteriormente) ...
  return (
    <div className='p-3 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 animate-pulse min-h-[175px] flex flex-col justify-between'>
      <div>
        <div className='text-center mb-3'>
          <div className='h-6 bg-slate-300 dark:bg-slate-700 rounded w-20 mx-auto mb-1'></div>
          <div className='h-3 bg-slate-300 dark:bg-slate-700 rounded w-24 mx-auto'></div>
        </div>
        <div className='mt-3 pt-2 border-t border-slate-200 dark:border-slate-700'>
          <div className='h-3 bg-slate-300 dark:bg-slate-700 rounded w-3/4 mb-2'></div>
          <div className='h-3 bg-slate-300 dark:bg-slate-700 rounded w-full mb-1'></div>
          <div className='h-3 bg-slate-300 dark:bg-slate-700 rounded w-1/2'></div>
        </div>
      </div>
      <div className='flex justify-around mt-3 pt-2 border-t border-slate-200 dark:border-slate-700'>
        <div className='h-8 w-8 bg-slate-300 dark:bg-slate-700 rounded'></div>
        <div className='h-8 w-8 bg-slate-300 dark:bg-slate-700 rounded'></div>
        <div className='h-8 w-8 bg-slate-300 dark:bg-slate-700 rounded'></div>
        <div className='h-8 w-8 bg-slate-300 dark:bg-slate-700 rounded'></div>
      </div>
    </div>
  );
};

export function PlanningCellCard({
  criterion,
  cellData,
  isLoadingMatrixData,
  competitionPeriodId, // <<< RECEBE A NOVA PROP
  onEdit,
  onCalculate,
  onAcceptSuggestion,
}: PlanningCellCardProps) {
  if (isLoadingMatrixData || !cellData) {
    return <PlanningCellSkeleton />;
  }

  const {
    metaPropostaPadrao,
    metaAnteriorValor,
    metaAnteriorPeriodo,
    regrasAplicadasPadrao,
    metaDefinidaValor,
    isMetaDefinida,
  } = cellData;

  const displayValue = isMetaDefinida ? metaDefinidaValor : metaPropostaPadrao;
  const displayLabel = isMetaDefinida ? 'Meta Definida' : 'Meta Proposta';
  const numDisplayDecimalPlaces = criterion.casasDecimaisPadrao ?? 0;

  const handleAccept = () => {
    // Verifica se onAcceptSuggestion existe, se a meta não está definida, se há uma proposta e regras
    if (
      onAcceptSuggestion &&
      !isMetaDefinida &&
      metaPropostaPadrao !== null &&
      metaPropostaPadrao !== undefined &&
      regrasAplicadasPadrao
    ) {
      onAcceptSuggestion(
        criterion.id,
        cellData.setorId, // setorId vem de cellData (que é EntradaResultadoDetalhado)
        competitionPeriodId, // Usa a prop recebida
        metaPropostaPadrao,
        regrasAplicadasPadrao
      );
    } else {
      console.warn('Não é possível aceitar sugestão:', {
        onAcceptSuggestion,
        isMetaDefinida,
        metaPropostaPadrao,
        regrasAplicadasPadrao,
      });
      // Adicionar um toast.error aqui seria bom se a ação fosse inesperadamente indisponível
    }
  };

  return (
    <div
      className={`p-3 rounded-md border shadow-sm min-h-[175px] flex flex-col justify-between ${isMetaDefinida ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700' : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'}`}
    >
      <div>
        {' '}
        {/* Conteúdo principal */}
        <div className='text-center mb-2'>
          {isMetaDefinida && (
            <div className='flex justify-center items-center text-green-600 text-xs mb-0.5'>
              <CheckCircle2 className='h-3.5 w-3.5 mr-1' />
              <span>Confirmada</span>
            </div>
          )}
          <div
            className={`text-xl font-semibold ${isMetaDefinida ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'}`}
          >
            {displayValue !== null && displayValue !== undefined
              ? displayValue.toLocaleString('pt-BR', {
                  minimumFractionDigits: numDisplayDecimalPlaces,
                  maximumFractionDigits: numDisplayDecimalPlaces,
                })
              : '-'}
          </div>
          <div
            className={`text-xs ${isMetaDefinida ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'} mt-0.5`}
          >
            {displayLabel}
          </div>
        </div>
        <div
          className={`mt-2 pt-2 border-t border-opacity-50 dark:border-opacity-50 ${isMetaDefinida ? 'border-green-200 dark:border-green-700' : 'border-blue-200 dark:border-blue-700'}`}
        >
          <div className='text-xs text-slate-600 dark:text-slate-400 flex justify-between mb-1.5'>
            <span>
              Meta Anterior{metaAnteriorPeriodo && ` (${metaAnteriorPeriodo})`}:
            </span>
            <span className='font-medium'>
              {metaAnteriorValor !== null && metaAnteriorValor !== undefined
                ? Number(metaAnteriorValor).toLocaleString('pt-BR', {
                    minimumFractionDigits: numDisplayDecimalPlaces,
                    maximumFractionDigits: numDisplayDecimalPlaces,
                  })
                : '-'}
            </span>
          </div>
          {regrasAplicadasPadrao ? (
            <CalculationSettings
              criterionId={criterion.id}
              regrasParaExibicao={regrasAplicadasPadrao}
            />
          ) : (
            <div className='text-xs text-gray-400 mt-1 italic'>
              Regras de cálculo padrão não informadas.
            </div>
          )}
        </div>
      </div>

      {/* Botões de Ação Integrados */}
      <div
        className={`flex items-center justify-around mt-auto pt-2 border-t border-opacity-50 dark:border-opacity-50 ${isMetaDefinida ? 'border-green-200 dark:border-green-700' : 'border-blue-200 dark:border-blue-700'}`}
      >
        <TooltipProvider>
          {onAcceptSuggestion &&
          !isMetaDefinida &&
          metaPropostaPadrao !== null &&
          metaPropostaPadrao !== undefined ? (
            <Tooltip delayDuration={200}>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={handleAccept}
                  className='text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-800/40'
                  disabled={isMetaDefinida ? true : false}
                >
                  <ThumbsUp className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent className='bg-slate-800 text-white'>
                <p>
                  Aceitar Sugestão (
                  {metaPropostaPadrao.toLocaleString('pt-BR', {
                    minimumFractionDigits: numDisplayDecimalPlaces,
                    maximumFractionDigits: numDisplayDecimalPlaces,
                  })}
                  )
                </p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className='w-9 h-9'></div>
          )}
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onEdit}
                className='text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-800/40'
              >
                <Edit className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent className='bg-slate-800 text-white'>
              <p>
                {isMetaDefinida
                  ? 'Editar Meta Definida'
                  : 'Definir Meta Manualmente'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                onClick={onCalculate}
                className='text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-800/40'
              >
                <Calculator className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent className='bg-slate-800 text-white'>
              <p>Personalizar Cálculo (Modal)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip delayDuration={200}>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='icon'
                className='text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700/40'
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
