// src/components/parameters/CalculationSettings.tsx
'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCalculationSettings } from '@/hooks/useCalculationSettings'; // Continuaremos usando como fallback ou se não vier prop
import { RegrasAplicadasPadrao } from '@sistema-premiacao/shared-types'; // Importe o tipo que definimos
import { Dot, Loader2 } from 'lucide-react'; // Adicionado Loader2

interface CalculationSettingsProps {
  criterionId: number;
  // Nova prop opcional para receber as regras diretamente
  regrasParaExibicao?: RegrasAplicadasPadrao | null;
}

export function CalculationSettings({
  criterionId,
  regrasParaExibicao,
}: CalculationSettingsProps) {
  // Usa o hook apenas se as regras não forem fornecidas via props
  const hookResult = useCalculationSettings(criterionId, !regrasParaExibicao); // O segundo arg controla se o hook busca (enabled)

  const settingsToDisplay = regrasParaExibicao || hookResult.settings;
  const isLoading = !regrasParaExibicao && hookResult.isLoading; // Carregando apenas se buscando via hook

  if (isLoading) {
    return (
      <div className='text-xs text-gray-400 mt-2 flex items-center'>
        <Loader2 className='h-4 w-4 animate-spin mr-1' />
        Carregando regras...
      </div>
    );
  }

  if (!settingsToDisplay) {
    return (
      <div className='text-xs text-gray-400 mt-2'>
        Regras de cálculo não disponíveis.
      </div>
    );
  }

  // A função getCalculationMethodLabel pode ser mantida aqui ou movida para utils se for mais global
  const getCalculationMethodLabel = (methodKey: string): string => {
    const methods: Record<string, string> = {
      media3: 'Média dos 3 últimos períodos',
      media6: 'Média dos 6 últimos períodos',
      media12: 'Média dos 12 últimos períodos', // Se tiver
      ultimo: 'Último período realizado',
      // Adicione outros métodos que seu backend pode retornar em 'calculationMethod'
      manual: 'Definido Manualmente',
    };
    // Se o backend já manda o label em 'calculationMethodLabel', podemos usá-lo diretamente
    return (
      settingsToDisplay.calculationMethodLabel ||
      methods[methodKey] ||
      methodKey
    );
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className='text-xs text-gray-500 cursor-help mt-2 flex flex-col justify-start items-start gap-1'>
            <p className='font-semibold'>Cálculos Pré-aplicados:</p>
            <span className='flex items-center'>
              <Dot className='h-5 w-5 mr-1 text-gray-400' />{' '}
              {/* Ajuste de cor se desejar */}
              {getCalculationMethodLabel(settingsToDisplay.calculationMethod)}
            </span>
            {/* Verifica se adjustmentPercentage existe e não é 0 */}
            {settingsToDisplay.adjustmentPercentage !== null &&
              settingsToDisplay.adjustmentPercentage !== undefined &&
              settingsToDisplay.adjustmentPercentage !== 0 && (
                <span className='flex items-center'>
                  <Dot className='h-5 w-5 mr-1 text-gray-400' />
                  {`Ajuste: (${settingsToDisplay.adjustmentPercentage > 0 ? '+' : ''}${settingsToDisplay.adjustmentPercentage.toLocaleString('pt-BR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
                </span>
              )}
          </div>
        </TooltipTrigger>
        <TooltipContent className='max-w-xs'>
          <div className='space-y-1'>
            <p>
              <strong>Método de Cálculo:</strong>{' '}
              {getCalculationMethodLabel(settingsToDisplay.calculationMethod)}
            </p>
            {settingsToDisplay.adjustmentPercentage !== null &&
              settingsToDisplay.adjustmentPercentage !== undefined &&
              settingsToDisplay.adjustmentPercentage !== 0 && (
                <p>
                  <strong>Ajuste Percentual:</strong>{' '}
                  {/* Formatar como porcentagem */}
                  {settingsToDisplay.adjustmentPercentage.toLocaleString(
                    'pt-BR',
                    {
                      style: 'percent',
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }
                  )}
                </p>
              )}
            {/* O campo 'requiresRounding' não está na interface RegrasAplicadasPadrao que definimos.
                Se você quiser mostrar informações de arredondamento, elas viriam de 
                settingsToDisplay.roundingMethod e settingsToDisplay.roundingDecimalPlaces
            */}
            {settingsToDisplay.roundingMethod &&
              settingsToDisplay.roundingMethod !== 'none' && (
                <p>
                  <strong>Arredondamento:</strong>{' '}
                  {settingsToDisplay.roundingMethod} (
                  {settingsToDisplay.roundingDecimalPlaces} casa(s) decimal(is))
                </p>
              )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
