// src/hooks/useCalculationActions.ts
import { ParametersAPI } from '@/services/parameters.api';
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

  const handleApiCalculation = useCallback(async (payload: any) => {
    try {
      return await ParametersAPI.calculate(payload);
    } catch (error) {
      console.error('Erro na chamada API de cálculo:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Erro desconhecido ao calcular.'
      );
      throw error;
    }
  }, []);

  const handlePreviewCalculation = useCallback(
    async (payload: any) => {
      setIsCalculatingPreview(true);
      setCalculatedValuePreview(null);
      try {
        const result = await handleApiCalculation(payload);
        setCalculatedValuePreview(result.value);
        toast.info('Pré-visualização calculada.');
      } catch (error) {
        // Erro já tratado em handleApiCalculation
      } finally {
        setIsCalculatingPreview(false);
      }
    },
    [handleApiCalculation]
  );

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
      console.log(
        '[DEBUG useCalculationActions] handleAcceptSuggestion RECEBEU:'
      );
      console.log('[DEBUG] criterionId:', criterionId, typeof criterionId);
      console.log('[DEBUG] sectorId:', sectorId, typeof sectorId);

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
        roundingMethod:
          (defaultSettingsApplied?.roundingMethod as any) || 'none',
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
        console.error('Erro ao aceitar sugestão:', error);
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
