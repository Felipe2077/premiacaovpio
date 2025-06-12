// apps/web/src/services/parameters.api.ts
import { HistoricalDataItem } from '@/types/parameters.types';

export class ParametersAPI {
  static async calculate(payload: any): Promise<any> {
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    console.log(
      '🔍 [ParametersAPI] Fazendo requisição para:',
      `${API_BASE_URL}/api/parameters/calculate`
    );

    const response = await fetch(`${API_BASE_URL}/api/parameters/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    console.log('📡 [ParametersAPI] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `Erro ${response.status}` }));
      throw new Error(
        errorData.message ||
          errorData.error ||
          `Erro ${response.status}: ${response.statusText}`
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
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    let apiUrl = `${API_BASE_URL}/api/results/historical?criterionId=${criterionId}&currentPeriod=${currentPeriodYYYYMM}&count=${count}`;

    if (sectorId !== null && sectorId !== undefined) {
      apiUrl += `&sectorId=${sectorId}`;
    }

    const response = await fetch(apiUrl, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
