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
  Criterion, // Tipo vindo de useParametersData ou shared-types
} from '@/hooks/useParametersData';
import { EntradaResultadoDetalhado } from '@sistema-premiacao/shared-types'; // Importa o tipo da API
import { Calculator, Edit, History } from 'lucide-react';
import React from 'react'; // Removido useEffect, useMemo, useState não mais necessários para busca/cálculo aqui
import { CalculationSettings } from './CalculationSettings';

// Props que o PlanningCellCard receberá
interface PlanningCellCardProps {
  criterion: Criterion; // Para passar id, nome, casasDecimaisPadrao para CalculationSettings e formatação
  // sector: Sector | null; // Não mais necessário se a API principal já considera o setor
  // periodoAtual: CompetitionPeriod; // Não mais necessário
  // fetchHistoricalData: (...args: any[]) => Promise<any[]>; // Não mais necessário

  // Dados pré-calculados vindos da API (parte de EntradaResultadoDetalhado)
  cellData: EntradaResultadoDetalhado; // Este objeto conterá os campos pré-calculados

  onEdit: () => void;
  onCalculate: () => void;
  // onHistory?: () => void;
}

// O Skeleton Loader pode ser mantido como estava ou simplificado
// Se a matriz inteira tem um loader, talvez um placeholder simples seja suficiente aqui.
const PlanningCellSkeleton: React.FC = () => {
  return (
    <div className='p-3 bg-blue-50 rounded-md border border-blue-100 animate-pulse min-h-[160px] flex justify-center items-center'>
      <span className='text-xs text-gray-400'>Carregando...</span>
    </div>
  );
};

export function PlanningCellCard({
  criterion,
  cellData, // Recebe todos os dados da célula, incluindo os pré-calculados
  onEdit,
  onCalculate,
}: PlanningCellCardProps) {
  // Se cellData ainda não chegou (ex: loading da matriz inteira), pode mostrar um skeleton ou nada.
  // Assumindo que ParametersMatrix só renderiza PlanningCellCard quando cellData (ou seu equivalente) existe.
  // Se os campos de planejamento podem ser opcionais, precisamos de checagens.
  const {
    metaPropostaPadrao,
    metaAnteriorValor,
    metaAnteriorPeriodo,
    regrasAplicadasPadrao,
  } = cellData;

  // Casas decimais para EXIBIÇÃO da meta proposta e anterior
  // Usa casasDecimaisPadrao do critério. Se não existir, fallback para 0.
  const displayDecimalPlaces = criterion.casasDecimaisPadrao ?? 0;

  return (
    <div className='p-3 bg-blue-50 rounded-md border border-blue-100 min-h-[160px] flex flex-col justify-between'>
      <div>
        <div className='text-center'>
          <div className='text-lg font-semibold'>
            {metaPropostaPadrao !== null && metaPropostaPadrao !== undefined
              ? metaPropostaPadrao.toLocaleString('pt-BR', {
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
              {metaAnteriorPeriodo && ` (${metaAnteriorPeriodo})`}:
            </span>
            <span className='font-medium'>
              {metaAnteriorValor !== null && metaAnteriorValor !== undefined
                ? metaAnteriorValor.toLocaleString('pt-BR', {
                    minimumFractionDigits: displayDecimalPlaces,
                    maximumFractionDigits: displayDecimalPlaces,
                  })
                : '-'}
            </span>
          </div>
          {/* Passa as regras pré-calculadas para CalculationSettings */}
          <CalculationSettings
            criterionId={criterion.id}
            regrasParaExibicao={regrasAplicadasPadrao || null} // Passa o objeto de regras
          />
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
