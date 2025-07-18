// apps/api/src/utils/brasil-api.client.ts
interface BrasilAPIHoliday {
  date: string; // formato YYYY-MM-DD
  name: string;
  type: 'national' | 'bank_holiday' | 'optional';
}

interface Holiday {
  date: string;
  name: string;
  type: 'NACIONAL' | 'ESTADUAL' | 'MUNICIPAL';
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fromCache?: boolean;
}

export class BrasilAPIClient {
  private readonly baseUrl = 'https://brasilapi.com.br/api';
  private readonly timeout = 10000; // 10 segundos
  private readonly cache: Map<string, { data: any; timestamp: number }> =
    new Map();
  private readonly cacheExpiration = 24 * 60 * 60 * 1000; // 24 horas

  constructor() {
    console.log('[BrasilAPIClient] Cliente inicializado com cache local');
  }

  /**
   * Busca feriados nacionais de um ano específico
   */
  async fetchNationalHolidays(year: string): Promise<APIResponse<Holiday[]>> {
    const cacheKey = `holidays_${year}`;

    try {
      // Verificar cache primeiro
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return {
          success: true,
          data: cached,
          fromCache: true,
        };
      }

      console.log(
        `[BrasilAPIClient] Buscando feriados nacionais para ${year}...`
      );

      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/feriados/v1/${year}`
      );

      if (!response.ok) {
        throw new Error(`Brasil API retornou status ${response.status}`);
      }

      const holidays: BrasilAPIHoliday[] = await response.json();

      // Converter para formato interno
      const convertedHolidays: Holiday[] = holidays.map((holiday) => ({
        date: holiday.date,
        name: this.cleanHolidayName(holiday.name),
        type: 'NACIONAL',
      }));

      // Salvar no cache
      this.saveToCache(cacheKey, convertedHolidays);

      console.log(
        `[BrasilAPIClient] ✅ ${convertedHolidays.length} feriados carregados para ${year}`
      );

      return {
        success: true,
        data: convertedHolidays,
        fromCache: false,
      };
    } catch (error) {
      console.error(
        `[BrasilAPIClient] ❌ Erro ao buscar feriados de ${year}:`,
        error
      );

      // Tentar fallback
      const fallbackHolidays = this.getFallbackHolidays(year);

      return {
        success: false,
        data: fallbackHolidays,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Busca feriados específicos de Brasília-DF
   */
  async fetchBrasiliaHolidays(year: string): Promise<Holiday[]> {
    const brasiliaHolidays: Array<{
      month: string;
      day: string;
      name: string;
      type: 'ESTADUAL' | 'MUNICIPAL';
    }> = [
      {
        month: '04',
        day: '21',
        name: 'Fundação de Brasília',
        type: 'MUNICIPAL',
      },
      {
        month: '11',
        day: '30',
        name: 'Dia do Evangélico',
        type: 'MUNICIPAL',
      },
      // Adicionar outros feriados locais conforme necessário
    ];

    return brasiliaHolidays.map((holiday) => ({
      date: `${year}-${holiday.month}-${holiday.day}`,
      name: holiday.name,
      type: holiday.type,
    }));
  }

  /**
   * Busca todos os feriados (nacionais + locais) para um ano
   */
  async fetchAllHolidays(year: string): Promise<APIResponse<Holiday[]>> {
    try {
      // Buscar feriados nacionais
      const nationalResponse = await this.fetchNationalHolidays(year);
      const nationalHolidays = nationalResponse.data || [];

      // Buscar feriados locais
      const localHolidays = await this.fetchBrasiliaHolidays(year);

      // Combinar e remover duplicatas
      const allHolidays = [...nationalHolidays, ...localHolidays];
      const uniqueHolidays = this.removeDuplicateHolidays(allHolidays);

      console.log(
        `[BrasilAPIClient] Total de feriados para ${year}: ${uniqueHolidays.length}`
      );

      return {
        success: nationalResponse.success,
        data: uniqueHolidays,
        error: nationalResponse.error,
        fromCache: nationalResponse.fromCache,
      };
    } catch (error) {
      console.error(
        `[BrasilAPIClient] Erro ao buscar todos os feriados:`,
        error
      );

      return {
        success: false,
        data: this.getFallbackHolidays(year),
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Testa conectividade com a Brasil API
   */
  async testConnection(): Promise<{
    isConnected: boolean;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/feriados/v1/2025`
      );
      const responseTime = Date.now() - startTime;

      return {
        isConnected: response.ok,
        responseTime,
        error: response.ok ? undefined : `Status ${response.status}`,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      return {
        isConnected: false,
        responseTime,
        error: error instanceof Error ? error.message : 'Erro de conexão',
      };
    }
  }

  /**
   * Busca feriados para um mês específico
   */
  async fetchHolidaysForMonth(
    year: string,
    month: string
  ): Promise<APIResponse<Holiday[]>> {
    try {
      const allHolidaysResponse = await this.fetchAllHolidays(year);

      if (!allHolidaysResponse.success || !allHolidaysResponse.data) {
        return allHolidaysResponse;
      }

      // Filtrar apenas feriados do mês específico
      const monthHolidays = allHolidaysResponse.data.filter((holiday) => {
        const holidayMonth = holiday.date.substring(5, 7); // Extrair MM de YYYY-MM-DD
        return holidayMonth === month.padStart(2, '0');
      });

      return {
        success: allHolidaysResponse.success,
        data: monthHolidays,
        fromCache: allHolidaysResponse.fromCache,
        error: allHolidaysResponse.error,
      };
    } catch (error) {
      console.error(
        `[BrasilAPIClient] Erro ao buscar feriados para ${year}-${month}:`,
        error
      );

      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Valida se um ano é válido para consulta
   */
  isValidYear(year: string): boolean {
    const yearNum = parseInt(year, 10);
    const currentYear = new Date().getFullYear();

    // Permitir consulta de 5 anos atrás até 2 anos à frente
    return yearNum >= currentYear - 5 && yearNum <= currentYear + 2;
  }

  /**
   * Fetch com timeout configurável
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'SistemaPremiacao/1.0',
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Gerenciamento de cache
   */
  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > this.cacheExpiration) {
      this.cache.delete(key);
      return null;
    }

    console.log(`[BrasilAPIClient] Cache hit para ${key}`);
    return cached.data;
  }

  private saveToCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });

    console.log(`[BrasilAPIClient] Dados salvos no cache: ${key}`);
  }

  /**
   * Remove feriados duplicados baseado na data
   */
  private removeDuplicateHolidays(holidays: Holiday[]): Holiday[] {
    const seen = new Set<string>();
    return holidays.filter((holiday) => {
      if (seen.has(holiday.date)) {
        console.log(
          `[BrasilAPIClient] Feriado duplicado removido: ${holiday.date} - ${holiday.name}`
        );
        return false;
      }
      seen.add(holiday.date);
      return true;
    });
  }

  /**
   * Limpa nomes de feriados (remove caracteres especiais, etc.)
   */
  private cleanHolidayName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-]/g, '')
      .toUpperCase();
  }

  /**
   * Feriados fixos nacionais para fallback quando a API falha
   */
  private getFallbackHolidays(year: string): Holiday[] {
    console.log(
      `[BrasilAPIClient] ⚠️ Usando feriados de fallback para ${year}`
    );

    return [
      {
        date: `${year}-01-01`,
        name: 'CONFRATERNIZAÇÃO UNIVERSAL',
        type: 'NACIONAL',
      },
      {
        date: `${year}-04-21`,
        name: 'TIRADENTES',
        type: 'NACIONAL',
      },
      {
        date: `${year}-05-01`,
        name: 'DIA DO TRABALHADOR',
        type: 'NACIONAL',
      },
      {
        date: `${year}-09-07`,
        name: 'INDEPENDÊNCIA DO BRASIL',
        type: 'NACIONAL',
      },
      {
        date: `${year}-10-12`,
        name: 'NOSSA SENHORA APARECIDA',
        type: 'NACIONAL',
      },
      {
        date: `${year}-11-02`,
        name: 'FINADOS',
        type: 'NACIONAL',
      },
      {
        date: `${year}-11-15`,
        name: 'PROCLAMAÇÃO DA REPÚBLICA',
        type: 'NACIONAL',
      },
      {
        date: `${year}-12-25`,
        name: 'NATAL',
        type: 'NACIONAL',
      },
      // Feriados específicos de Brasília
      {
        date: `${year}-04-21`,
        name: 'FUNDAÇÃO DE BRASÍLIA',
        type: 'MUNICIPAL',
      },
      {
        date: `${year}-11-30`,
        name: 'DIA DO EVANGÉLICO',
        type: 'MUNICIPAL',
      },
    ];
  }

  /**
   * Limpa cache manualmente
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[BrasilAPIClient] Cache limpo');
  }

  /**
   * Estatísticas do cache
   */
  getCacheStats(): {
    size: number;
    keys: string[];
    oldestEntry?: Date;
  } {
    const keys = Array.from(this.cache.keys());
    let oldestTimestamp = Infinity;

    for (const [, value] of this.cache) {
      if (value.timestamp < oldestTimestamp) {
        oldestTimestamp = value.timestamp;
      }
    }

    return {
      size: this.cache.size,
      keys,
      oldestEntry:
        oldestTimestamp === Infinity ? undefined : new Date(oldestTimestamp),
    };
  }
}
