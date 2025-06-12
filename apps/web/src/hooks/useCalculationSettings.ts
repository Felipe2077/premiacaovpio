// src/hooks/useCalculationSettings.ts (VERSÃO MAIS RESILIENTE)

import { useEffect, useState } from 'react';

export function useCalculationSettings(criterionId: number) {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 🎯 CORREÇÃO: Usar a URL correta da API
        const response = await fetch(
          `http://localhost:3001/api/criteria/${criterionId}/calculation-settings`,
          {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        console.log(
          `[useCalculationSettings] Response status para critério ${criterionId}:`,
          response.status
        );

        // 🎯 MELHORIA: Tratar diferentes status codes
        if (response.status === 404) {
          console.log(
            `[useCalculationSettings] Configurações não encontradas para critério ${criterionId}, usando padrão`
          );
          // Configurações padrão se não encontradas
          setSettings({
            criterionId,
            calculationMethod: 'media3',
            adjustmentPercentage: 0,
            requiresRounding: true,
            roundingMethod: 'nearest',
            roundingDecimalPlaces: 0,
          });
          return;
        }

        if (response.status === 500) {
          console.warn(
            `[useCalculationSettings] Erro 500 para critério ${criterionId}, usando configurações padrão`
          );
          // Em caso de erro 500, usar configurações padrão em vez de falhar
          setSettings({
            criterionId,
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
        console.log(
          `[useCalculationSettings] Dados recebidos para critério ${criterionId}:`,
          data
        );

        // 🎯 MELHORIA: Tratar diferentes formatos de resposta
        if (data.defaultSettings) {
          setSettings(data.defaultSettings);
        } else if (data.error && data.defaultSettings) {
          // Caso o backend retorne erro mas com configurações padrão
          setSettings(data.defaultSettings);
        } else {
          setSettings(data);
        }
      } catch (err) {
        console.error(
          `[useCalculationSettings] Erro ao buscar configurações para critério ${criterionId}:`,
          err
        );

        // 🎯 MELHORIA: Não definir como erro, usar configurações padrão
        console.log(
          `[useCalculationSettings] Usando configurações padrão devido ao erro`
        );
        setSettings({
          criterionId,
          calculationMethod: 'media3',
          adjustmentPercentage: 0,
          requiresRounding: true,
          roundingMethod: 'nearest',
          roundingDecimalPlaces: 0,
        });

        // Ainda registrar o erro, mas não bloquear a UI
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };

    if (criterionId) {
      fetchSettings();
    } else {
      // Se não há criterionId, definir configurações padrão
      setSettings({
        calculationMethod: 'media3',
        adjustmentPercentage: 0,
        requiresRounding: true,
        roundingMethod: 'nearest',
        roundingDecimalPlaces: 0,
      });
      setIsLoading(false);
    }
  }, [criterionId]);

  return { settings, isLoading, error };
}
