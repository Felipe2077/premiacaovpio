// src/components/parameters/CalculationSettings.tsx
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCalculationSettings } from '@/hooks/useCalculationSettings';
import { RegrasAplicadasPadrao } from '@sistema-premiacao/shared-types';
import { Dot } from 'lucide-react';

interface CalculationSettingsProps {
  criterionId: number;
  regrasParaExibicao?: RegrasAplicadasPadrao; // Nova prop opcional
}

export function CalculationSettings({
  criterionId,
  regrasParaExibicao,
}: CalculationSettingsProps) {
  const { settings, isLoading } = useCalculationSettings(criterionId);

  // Se regrasParaExibicao foi fornecido, use ele; senão use settings do hook
  const shouldUseProvidedRules =
    regrasParaExibicao !== undefined && regrasParaExibicao !== null;

  if (isLoading && !shouldUseProvidedRules) {
    return (
      <div className='text-xs text-gray-400'>Carregando configurações...</div>
    );
  }

  // Se não tem regras fornecidas E settings está carregando/vazio, retorna loading
  if (!shouldUseProvidedRules && !settings) {
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
      melhor3: 'Melhor dos 3 últimos períodos',
      manual: 'Valor manual',
    };

    return methods[method] || method;
  };

  // Extrair valores de forma segura baseado na fonte
  let calculationMethod: string;
  let adjustmentValue: number | undefined;
  let roundingInfo: {
    requiresRounding?: boolean;
    roundingMethod?: string;
    roundingDecimalPlaces?: number;
  } = {};

  if (shouldUseProvidedRules) {
    // Usar regrasParaExibicao (vem da API de resultados)
    calculationMethod =
      regrasParaExibicao.calculationMethodLabel ||
      regrasParaExibicao.calculationMethod ||
      'Não definido';
    adjustmentValue = regrasParaExibicao.adjustmentPercentage;
    roundingInfo = {
      requiresRounding: regrasParaExibicao.roundingMethod !== 'none',
      roundingMethod: regrasParaExibicao.roundingMethod,
      roundingDecimalPlaces: regrasParaExibicao.roundingDecimalPlaces,
    };
  } else {
    // Usar settings (vem do hook useCalculationSettings)
    calculationMethod = getCalculationMethodLabel(settings.calculationMethod);
    adjustmentValue =
      typeof settings.adjustmentPercentage === 'string'
        ? parseFloat(settings.adjustmentPercentage)
        : settings.adjustmentPercentage;
    roundingInfo = {
      requiresRounding: settings.requiresRounding,
      roundingMethod: settings.roundingMethod,
      roundingDecimalPlaces: settings.roundingDecimalPlaces,
    };
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='text-xs text-gray-500 cursor-help mt-2 flex flex-col justify-start items-start gap-1'>
            <p className='font-bold'>Cálculos Pré-aplicados:</p>
            <span className='flex items-center'>
              <Dot className='h-5 w-5 mr-1' />
              {calculationMethod}
            </span>
            {adjustmentValue !== undefined && adjustmentValue !== 0 && (
              <span className='flex items-center'>
                <Dot className='h-5 w-5 mr-1' />(
                {adjustmentValue >= 0 ? '+' : ''}
                {adjustmentValue}%)
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className='max-w-xs'>
          <div className='space-y-1'>
            <p>
              <strong>Método de Cálculo:</strong> {calculationMethod}
            </p>
            {adjustmentValue !== undefined && adjustmentValue !== 0 && (
              <p>
                <strong>Ajuste Percentual:</strong> {adjustmentValue}%
              </p>
            )}
            {roundingInfo.requiresRounding && (
              <p>
                <strong>Arredondamento:</strong> {roundingInfo.roundingMethod}
                {roundingInfo.roundingDecimalPlaces !== undefined &&
                  ` (${roundingInfo.roundingDecimalPlaces} casas decimais)`}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
