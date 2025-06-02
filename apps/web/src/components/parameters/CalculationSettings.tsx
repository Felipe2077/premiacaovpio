// src/components/parameters/CalculationSettings.tsx

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCalculationSettings } from '@/hooks/useCalculationSettings';
import { Dot } from 'lucide-react';

interface CalculationSettingsProps {
  criterionId: number;
}

export function CalculationSettings({ criterionId }: CalculationSettingsProps) {
  const { settings, isLoading } = useCalculationSettings(criterionId);

  if (isLoading || !settings) {
    return (
      <div className='text-xs text-gray-400'>Carregando configurações...</div>
    );
  }

  const getCalculationMethodLabel = (method: string): string => {
    const methods: Record<string, string> = {
      media3: 'Média dos 3 últimos períodos',
      media6: 'Média dos 6 últimos períodos',
      media12: 'Média dos 12 últimos períodos',
      ultimo: 'Último período',
      penultimo: 'Penúltimo período',
      antepenultimo: 'Antepenúltimo período',
      manual: 'Valor manual',
      // Adicione outros métodos conforme necessário
    };

    return methods[method] || method;
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='text-xs text-gray-500 cursor-help mt-2 flex flex-col justify-start items-start gap-1'>
            <p className='font-bold'>Calculos Pré-aplicados:</p>
            <span className='flex items-center'>
              <Dot className='h-5 w-5 mr-1' />
              {getCalculationMethodLabel(settings.calculationMethod)}
            </span>
            <span className='flex items-center'>
              <Dot className='h-5 w-5 mr-1' />
              {settings.adjustmentPercentage !== 0 &&
                ` (${settings.adjustmentPercentage >= 0 ? '+' : ''}${settings.adjustmentPercentage}%)`}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent className='max-w-xs'>
          <div className='space-y-1'>
            <p>
              <strong>Método de Cálculo:</strong>{' '}
              {getCalculationMethodLabel(settings.calculationMethod)}
            </p>
            {settings.adjustmentPercentage !== 0 && (
              <p>
                <strong>Ajuste Percentual:</strong>{' '}
                {settings.adjustmentPercentage}%
              </p>
            )}
            {settings.requiresRounding && (
              <p>
                <strong>Arredondamento:</strong> {settings.roundingMethod}(
                {settings.roundingDecimalPlaces} casas decimais)
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
