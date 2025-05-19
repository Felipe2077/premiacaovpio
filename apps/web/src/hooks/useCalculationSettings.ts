// src/hooks/useCalculationSettings.ts

import { useEffect, useState } from 'react';

export function useCalculationSettings(criterionId: number) {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/criteria/${criterionId}/calculation-settings`
        );

        if (response.status === 404) {
          // Configurações padrão se não encontradas
          setSettings({
            calculationMethod: 'media3',
            adjustmentPercentage: 0,
            requiresRounding: true,
            roundingMethod: 'nearest',
            roundingDecimalPlaces: 0,
          });
          return;
        }

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setSettings(data.defaultSettings || data);
      } catch (err) {
        console.error(
          `Erro ao buscar configurações para critério ${criterionId}:`,
          err
        );
        setError(err instanceof Error ? err : new Error(String(err)));
        // Configurações padrão em caso de erro
        setSettings({
          calculationMethod: 'media3',
          adjustmentPercentage: 0,
          requiresRounding: true,
          roundingMethod: 'nearest',
          roundingDecimalPlaces: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [criterionId]);

  return { settings, isLoading, error };
}
