// src/services/parameters.api.ts
import { HistoricalDataItem } from '@/types/parameters.types';

export class ParametersAPI {
  static async calculate(payload: any): Promise<any> {
    const response = await fetch('/api/parameters/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `Erro ${response.status}` }));
      throw new Error(
        errorData.message || `Erro ${response.status}: ${response.statusText}`
      );
    }

    return await response.json();
  }

  static async fetchHistoricalData(
    criterionId: number,
    sectorId: number | null,
    currentPeriodYYYYMM: string,
    count: number = 6
  ): Promise<HistoricalDataItem[]> {
    let apiUrl = `/api/results/historical?criterionId=${criterionId}&currentPeriod=${currentPeriodYYYYMM}&count=${count}`;

    if (sectorId !== null && sectorId !== undefined) {
      apiUrl += `&sectorId=${sectorId}`;
    }

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Erro ${response.status}: ${response.statusText} - ${errorBody}`
      );
    }

    const result = await response.json();

    if (result.success && result.data && result.data.history) {
      return result.data.history.map((item: any) => ({
        periodo: item.period,
        valorRealizado:
          item.realizedValue !== null ? parseFloat(item.realizedValue) : null,
        valorMeta:
          item.targetValue !== null ? parseFloat(item.targetValue) : null,
        status: item.realizedValue !== null ? 'FECHADO' : 'ABERTO_OU_SEM_DADOS',
      }));
    }

    return [];
  }
}
