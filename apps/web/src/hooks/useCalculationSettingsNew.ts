// src/hooks/useCalculationSettings.ts
import { CalculationSettings } from '@/types/parameters.types';
import { Criterio as Criterion } from '@sistema-premiacao/shared-types';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface UseCalculationSettingsProps {
  uniqueCriteria: Criterion[];
  fetchCriterionCalculationSettings: (criterionId: number) => Promise<any>;
}

export const useCalculationSettingsNew = ({
  uniqueCriteria,
  fetchCriterionCalculationSettings,
}: UseCalculationSettingsProps) => {
  const [settings, setSettings] = useState<CalculationSettings>({
    calculationMethod: 'media3',
    calculationAdjustment: '0',
    roundingMethod: 'none',
    decimalPlaces: '2',
    saveAsDefault: false,
  });

  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  const loadDefaultSettings = useCallback(
    async (criterionId: number) => {
      setIsLoadingSettings(true);
      try {
        const criterioAtual = uniqueCriteria.find((c) => c.id === criterionId);
        const casasDecimaisDoCriterioStr =
          criterioAtual?.casasDecimaisPadrao?.toString() || '0';

        const casasDecimaisNum = parseInt(casasDecimaisDoCriterioStr, 10);
        const apiSettings =
          await fetchCriterionCalculationSettings(criterionId);

        let effectiveRoundingMethod = 'none';

        if (apiSettings) {
          if (casasDecimaisNum > 0) {
            effectiveRoundingMethod = 'none';
          } else {
            effectiveRoundingMethod = apiSettings.roundingMethod || 'none';
          }

          setSettings({
            calculationMethod: apiSettings.calculationMethod || 'media3',
            calculationAdjustment:
              apiSettings.adjustmentPercentage?.toString() || '0',
            roundingMethod: effectiveRoundingMethod,
            decimalPlaces: casasDecimaisDoCriterioStr,
            saveAsDefault: false,
          });
        } else {
          setSettings({
            calculationMethod: 'media3',
            calculationAdjustment: '0',
            roundingMethod: casasDecimaisNum > 0 ? 'none' : 'none',
            decimalPlaces: casasDecimaisDoCriterioStr,
            saveAsDefault: false,
          });
        }
      } catch (error) {
        console.error('Erro ao carregar configurações de cálculo:', error);
        toast.error('Não foi possível carregar as configurações padrão.');

        const criterioAtualOnError = uniqueCriteria.find(
          (c) => c.id === criterionId
        );
        const casasDecimaisOnErrorStr =
          criterioAtualOnError?.casasDecimaisPadrao?.toString() || '0';

        setSettings({
          calculationMethod: 'media3',
          calculationAdjustment: '0',
          roundingMethod: 'none',
          decimalPlaces: casasDecimaisOnErrorStr,
          saveAsDefault: false,
        });
      } finally {
        setIsLoadingSettings(false);
      }
    },
    [uniqueCriteria, fetchCriterionCalculationSettings]
  );

  const updateSetting = <K extends keyof CalculationSettings>(
    key: K,
    value: CalculationSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return {
    settings,
    isLoadingSettings,
    loadDefaultSettings,
    updateSetting,
    setCalculationMethod: (value: string) =>
      updateSetting('calculationMethod', value),
    setCalculationAdjustment: (value: string) =>
      updateSetting('calculationAdjustment', value),
    setRoundingMethod: (value: string) =>
      updateSetting('roundingMethod', value),
    setDecimalPlaces: (value: string) => updateSetting('decimalPlaces', value),
    setSaveAsDefault: (value: boolean) => updateSetting('saveAsDefault', value),
  };
};
