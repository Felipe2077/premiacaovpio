// apps/web/src/services/parameters.api.ts - VERSÃO CORRIGIDA
import { HistoricalDataItem } from '@/types/parameters.types';

export class ParametersAPI {
  static async calculate(payload: any): Promise<any> {
    // ✅ CORREÇÃO: Usar a URL correta com porta 3001
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const response = await fetch(`${API_BASE_URL}/api/parameters/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // ✅ ADICIONAR CREDENTIALS
      body: JSON.stringify(payload),
    });

    console.log('📡 [ParametersAPI] Response status:', response.status);
    console.log('📡 [ParametersAPI] Response URL:', response.url);

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `Erro ${response.status}` }));

      console.error('❌ [ParametersAPI] Error data:', errorData);

      throw new Error(
        errorData.message ||
          errorData.error ||
          `Erro ${response.status}: ${response.statusText}`
      );
    }

    const result = await response.json();
    console.log('✅ [ParametersAPI] Success result:', result);
    return result;
  }

  static async fetchHistoricalData(
    criterionId: number,
    sectorId: number | null,
    currentPeriodYYYYMM: string,
    count: number = 6
  ): Promise<HistoricalDataItem[]> {
    // ✅ CORREÇÃO: Usar a URL correta com porta 3001
    const API_BASE_URL =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    let apiUrl = `${API_BASE_URL}/api/results/historical?criterionId=${criterionId}&currentPeriod=${currentPeriodYYYYMM}&count=${count}`;

    if (sectorId !== null && sectorId !== undefined) {
      apiUrl += `&sectorId=${sectorId}`;
    }

    console.log('📡 [ParametersAPI] Fetching historical data from:', apiUrl);

    const response = await fetch(apiUrl, {
      credentials: 'include', // ✅ ADICIONAR CREDENTIALS
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ [ParametersAPI] Historical data error:', errorBody);
      throw new Error(
        `Erro ${response.status}: ${response.statusText} - ${errorBody}`
      );
    }

    const result = await response.json();
    console.log('✅ [ParametersAPI] Historical data result:', result);

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
