// src/hooks/useCalculationActions.ts - VERSÃO CORRIGIDA
import { ParametersAPI } from '@/services/parameters.api'; // ✅ USAR A VERSÃO CORRIGIDA
import { RegrasAplicadasPadrao } from '@sistema-premiacao/shared-types';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface UseCalculationActionsProps {
  fetchResults: (period: string) => Promise<void>;
  selectedPeriodMesAno?: string;
}

export const useCalculationActions = ({
  fetchResults,
  selectedPeriodMesAno,
}: UseCalculationActionsProps) => {
  const [calculatedValuePreview, setCalculatedValuePreview] = useState<
    number | null
  >(null);
  const [isCalculatingPreview, setIsCalculatingPreview] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  // ✅ FUNÇÃO DE CHAMADA API COM MELHOR TRATAMENTO DE ERRO
  const handleApiCalculation = useCallback(async (payload: any) => {
    try {
      console.log('🔄 Enviando payload para API:', payload);

      // Validar payload antes de enviar
      if (!payload.criterionId) {
        throw new Error('Critério não especificado');
      }

      if (!payload.calculationMethod) {
        throw new Error('Método de cálculo não especificado');
      }

      const result = await ParametersAPI.calculate(payload);
      console.log('✅ Resultado da API:', result);

      return result;
    } catch (error) {
      console.error('❌ Erro na chamada API de cálculo:', error);

      // Tratamento de erros específicos
      if (error instanceof Error) {
        if (error.message.includes('500')) {
          toast.error(
            'Erro interno do servidor. Verifique se existem dados históricos.'
          );
        } else if (error.message.includes('404')) {
          toast.error(
            'Endpoint não encontrado. Verifique a configuração da API.'
          );
        } else if (error.message.includes('400')) {
          toast.error('Dados inválidos para cálculo. Verifique os parâmetros.');
        } else {
          toast.error(`Erro: ${error.message}`);
        }
      } else {
        toast.error('Erro desconhecido ao calcular.');
      }

      throw error;
    }
  }, []);

  // ✅ PREVIEW COM MELHOR TRATAMENTO DE ERRO
  const handlePreviewCalculation = useCallback(
    async (payload: any) => {
      setIsCalculatingPreview(true);
      setCalculatedValuePreview(null);

      try {
        const result = await handleApiCalculation(payload);

        if (result && typeof result.value === 'number') {
          setCalculatedValuePreview(result.value);
          console.log('✅ Preview calculado:', result.value);
        } else {
          console.warn('⚠️ Resultado de preview inválido:', result);
          toast.warning('Resultado do cálculo não é válido');
        }
      } catch (error) {
        // Erro já tratado em handleApiCalculation
        setCalculatedValuePreview(null);
      } finally {
        setIsCalculatingPreview(false);
      }
    },
    [handleApiCalculation]
  );

  // ✅ APLICAR CÁLCULO COM MELHOR TRATAMENTO
  const handleApplyCalculation = useCallback(
    async (payload: any, onSuccess?: () => void) => {
      setIsApplying(true);

      try {
        await handleApiCalculation(payload);
        toast.success('Meta calculada e aplicada com sucesso!');

        if (onSuccess) {
          onSuccess();
        }

        if (selectedPeriodMesAno) {
          await fetchResults(selectedPeriodMesAno);
        }
      } catch (error) {
        // Erro já tratado em handleApiCalculation
      } finally {
        setIsApplying(false);
      }
    },
    [handleApiCalculation, selectedPeriodMesAno, fetchResults]
  );

  // ✅ ACEITAR SUGESTÃO COM VALIDAÇÃO
  const handleAcceptSuggestion = useCallback(
    async (
      criterionId: number,
      sectorId: number | null,
      competitionPeriodId: number,
      suggestedValue: number,
      defaultSettingsApplied: RegrasAplicadasPadrao | null,
      criterionName: string,
      sectorName?: string
    ) => {
      console.log('🎯 Aceitando sugestão:', {
        criterionId,
        sectorId,
        competitionPeriodId,
        suggestedValue,
      });

      if (!criterionId || suggestedValue == null || !competitionPeriodId) {
        toast.error('Dados insuficientes para aceitar sugestão');
        return;
      }

      setIsApplying(true);

      const payload = {
        criterionId,
        sectorId,
        competitionPeriodId,
        calculationMethod:
          defaultSettingsApplied?.calculationMethod || 'manual',
        adjustmentPercentage: defaultSettingsApplied?.adjustmentPercentage || 0,
        finalValue: suggestedValue,
        wasRounded: defaultSettingsApplied?.roundingMethod !== 'none',
        roundingMethod: defaultSettingsApplied?.roundingMethod || 'none',
        roundingDecimalPlaces:
          defaultSettingsApplied?.roundingDecimalPlaces || 0,
        saveAsDefault: false,
        justificativa: `Sugestão do sistema aceita (baseada em ${defaultSettingsApplied?.calculationMethodLabel || 'regra padrão'})`,
        previewOnly: false,
      };

      try {
        await handleApiCalculation(payload);
        toast.success(
          `Meta sugerida para ${criterionName} / ${sectorName || 'Geral'} aceita e aplicada!`
        );

        if (selectedPeriodMesAno) {
          await fetchResults(selectedPeriodMesAno);
        }
      } catch (error) {
        console.error('❌ Erro ao aceitar sugestão:', error);
      } finally {
        setIsApplying(false);
      }
    },
    [handleApiCalculation, fetchResults, selectedPeriodMesAno]
  );

  return {
    calculatedValuePreview,
    isCalculatingPreview,
    isApplying,
    setIsApplying,
    handleApiCalculation,
    handlePreviewCalculation,
    handleApplyCalculation,
    handleAcceptSuggestion,
    setCalculatedValuePreview,
  };
};
