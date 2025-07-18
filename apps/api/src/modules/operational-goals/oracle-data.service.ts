// apps/api/src/modules/operational-goals/oracle-data.service.ts
import { OracleDataSource } from '@/database/data-source';
import { OracleEtlService } from '@/modules/etl/oracle-etl.service';
import { DataSource } from 'typeorm';

interface OracleKmFuelData {
  NOMEGA: string; // Nome da garagem
  DATAABASTCARRO: Date; // Data do abastecimento
  QNTCOMB: number; // Quantidade de combustível em litros
  KM: number; // KM percorrido
  KMLITRO: number; // Eficiência KM/L
}

interface OracleHistoricalData {
  garagem: string;
  ano_mes: string; // Formato YYYY-MM
  total_km: number;
  total_litros: number;
  custo_total_pneus?: number;
  custo_total_pecas?: number;
  dias_operacao: number;
}

interface OracleVehicleCount {
  codigo_garagem: string;
  nome_garagem: string;
  qtd_veiculos: number;
}

export class OperationalGoalsOracleService extends OracleEtlService {
  private oracleDataSource: DataSource;

  constructor() {
    super();
    this.oracleDataSource = OracleDataSource;

    console.log(
      '[OperationalGoalsOracleService] Instanciado estendendo OracleEtlService.'
    );
  }

  /**
   * Busca dados diários de KM e combustível para cálculo de metas
   */
  async fetchDailyKmAndFuelForGoals(
    startDate: string,
    endDate: string
  ): Promise<OracleKmFuelData[]> {
    await this.ensureOracleConnection();

    const query = `
      SELECT
        A.NOMEGA,
        A.DATAABASTCARRO,
        ROUND(A.QNTCOMB, 2) AS QNTCOMB,        
        A.KM,
        ROUND((A.KM / NULLIF(A.QNTCOMB, 0)), 2) AS KMLITRO
      FROM (
        SELECT
          G.NOMEGA,
          C.DATAABASTCARRO,
          SUM(C.QTDECOMB) AS QNTCOMB,        
          SUM(K.KMPERCORRIDOVELOC) AS KM
        FROM VWABA_CONFKMCARRO K,
             FRT_CADVEICULOS V,
             VWABA_CONSCOMBREPVEIC C,
             CTR_GARAGEM G
        WHERE V.CODIGOVEIC = K.CODIGOVEIC
          AND V.CODIGOGA = G.CODIGOGA
          AND C.CODIGOVEIC = K.CODIGOVEIC
          AND K.DATAVELOC = C.DATAABASTCARRO
          AND C.SEQUENCIAABASTCARRO = K.SEQUENCIAVELOC    
          AND C.DATAABASTCARRO BETWEEN TO_DATE(?, 'YYYY-MM-DD') AND TO_DATE(?, 'YYYY-MM-DD')
          AND V.CODIGOEMPRESA = 4
          AND V.CODIGOGA IN (31, 124, 239, 240)
          AND C.QTDECOMB > 0
          AND K.KMPERCORRIDOVELOC > 0
        GROUP BY G.NOMEGA, C.DATAABASTCARRO
      ) A
      WHERE A.QNTCOMB > 0 AND A.KM > 0
      ORDER BY A.NOMEGA, A.DATAABASTCARRO ASC
    `;

    try {
      const results = await this.oracleDataSource.query(query, [
        startDate,
        endDate,
      ]);

      console.log(
        `[OperationalGoalsOracleService] Query KM/Combustível retornou ${results.length} registros para período ${startDate} a ${endDate}`
      );

      return results.map((row: any) => ({
        NOMEGA: row.NOMEGA,
        DATAABASTCARRO: row.DATAABASTCARRO,
        QNTCOMB: parseFloat(row.QNTCOMB) || 0,
        KM: parseFloat(row.KM) || 0,
        KMLITRO: parseFloat(row.KMLITRO) || 0,
      }));
    } catch (error) {
      console.error(
        '[OperationalGoalsOracleService] Erro ao buscar dados de KM/Combustível:',
        error
      );
      throw new Error(
        `Falha ao buscar dados operacionais do Oracle: ${error.message}`
      );
    }
  }

  /**
   * Busca dados consolidados mensais para cálculo de médias históricas
   */
  async fetchMonthlyConsolidatedData(
    monthsBack: number = 12
  ): Promise<OracleHistoricalData[]> {
    await this.ensureOracleConnection();

    // Calcular período de consulta
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const query = `
      SELECT
        G.NOMEGA as garagem,
        TO_CHAR(C.DATAABASTCARRO, 'YYYY-MM') as ano_mes,
        SUM(K.KMPERCORRIDOVELOC) as total_km,
        SUM(C.QTDECOMB) as total_litros,
        COUNT(DISTINCT C.DATAABASTCARRO) as dias_operacao
      FROM VWABA_CONFKMCARRO K,
           FRT_CADVEICULOS V,
           VWABA_CONSCOMBREPVEIC C,
           CTR_GARAGEM G
      WHERE V.CODIGOVEIC = K.CODIGOVEIC
        AND V.CODIGOGA = G.CODIGOGA
        AND C.CODIGOVEIC = K.CODIGOVEIC
        AND K.DATAVELOC = C.DATAABASTCARRO
        AND C.SEQUENCIAABASTCARRO = K.SEQUENCIAVELOC    
        AND C.DATAABASTCARRO >= TO_DATE(?, 'YYYY-MM-DD')
        AND C.DATAABASTCARRO <= TO_DATE(?, 'YYYY-MM-DD')
        AND V.CODIGOEMPRESA = 4
        AND V.CODIGOGA IN (31, 124, 239, 240)
        AND C.QTDECOMB > 0
        AND K.KMPERCORRIDOVELOC > 0
      GROUP BY G.NOMEGA, TO_CHAR(C.DATAABASTCARRO, 'YYYY-MM')
      HAVING SUM(K.KMPERCORRIDOVELOC) > 0 AND SUM(C.QTDECOMB) > 0
      ORDER BY garagem, ano_mes DESC
    `;

    try {
      const results = await this.oracleDataSource.query(query, [
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
      ]);

      console.log(
        `[OperationalGoalsOracleService] Query consolidado mensal retornou ${results.length} registros para últimos ${monthsBack} meses`
      );

      return results.map((row: any) => ({
        garagem: row.GARAGEM,
        ano_mes: row.ANO_MES,
        total_km: parseFloat(row.TOTAL_KM) || 0,
        total_litros: parseFloat(row.TOTAL_LITROS) || 0,
        dias_operacao: parseInt(row.DIAS_OPERACAO) || 0,
      }));
    } catch (error) {
      console.error(
        '[OperationalGoalsOracleService] Erro ao buscar dados consolidados:',
        error
      );
      throw new Error(
        `Falha ao buscar dados históricos do Oracle: ${error.message}`
      );
    }
  }

  /**
   * Busca contagem de veículos por garagem
   */
  async fetchVehicleCountBySector(): Promise<OracleVehicleCount[]> {
    await this.ensureOracleConnection();

    const query = `
      SELECT
        V.CODIGOGA as codigo_garagem,
        G.NOMEGA as nome_garagem,
        COUNT(V.CODIGOVEIC) as qtd_veiculos
      FROM FRT_CADVEICULOS V,
           CTR_GARAGEM G
      WHERE V.CODIGOGA = G.CODIGOGA
        AND V.CODIGOEMPRESA = 4
        AND V.CODIGOGA IN (31, 124, 239, 240)
        AND V.ATIVOVEIC = 'S'
      GROUP BY V.CODIGOGA, G.NOMEGA
      ORDER BY G.NOMEGA
    `;

    try {
      const results = await this.oracleDataSource.query(query);

      console.log(
        `[OperationalGoalsOracleService] Query contagem de veículos retornou ${results.length} garagens`
      );

      return results.map((row: any) => ({
        codigo_garagem: row.CODIGO_GARAGEM,
        nome_garagem: row.NOME_GARAGEM,
        qtd_veiculos: parseInt(row.QTD_VEICULOS) || 0,
      }));
    } catch (error) {
      console.error(
        '[OperationalGoalsOracleService] Erro ao buscar contagem de veículos:',
        error
      );
      throw new Error(`Falha ao buscar cadastro da frota: ${error.message}`);
    }
  }

  /**
   * Valida disponibilidade de dados para um período específico
   */
  async validateDataAvailability(
    startDate: string,
    endDate: string
  ): Promise<{
    isValid: boolean;
    issues: string[];
    summary: any;
  }> {
    const issues: string[] = [];

    try {
      // Verificar dados de KM/Combustível
      const kmFuelData = await this.fetchDailyKmAndFuelForGoals(
        startDate,
        endDate
      );

      if (kmFuelData.length === 0) {
        issues.push('Nenhum dado de KM/Combustível encontrado para o período');
      }

      // Verificar dados por garagem
      const garagensCounts = kmFuelData.reduce(
        (acc, row) => {
          acc[row.NOMEGA] = (acc[row.NOMEGA] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const expectedGarages = [
        'GARAGEM GAMA',
        'GARAGEM PARANOA',
        'GARAGEM SANTA MARIA',
        'GARAGEM SAO SEBASTIAO',
      ];

      for (const garage of expectedGarages) {
        const count = garagensCounts[garage] || 0;
        if (count === 0) {
          issues.push(`Nenhum dado encontrado para ${garage}`);
        } else if (count < 20) {
          // Menos que 20 dias de dados
          issues.push(`Poucos dados para ${garage}: apenas ${count} registros`);
        }
      }

      // Verificar contagem de veículos
      const vehicleCount = await this.fetchVehicleCountBySector();
      if (vehicleCount.length === 0) {
        issues.push('Dados de cadastro da frota não disponíveis');
      }

      return {
        isValid: issues.length === 0,
        issues,
        summary: {
          totalRecords: kmFuelData.length,
          garagensFound: Object.keys(garagensCounts).length,
          recordsByGarage: garagensCounts,
          vehicleData: vehicleCount,
        },
      };
    } catch (error) {
      issues.push(`Erro ao validar dados: ${error.message}`);

      return {
        isValid: false,
        issues,
        summary: null,
      };
    }
  }

  /**
   * Garante que a conexão Oracle está ativa
   */
  private async ensureOracleConnection(): Promise<void> {
    if (!this.oracleDataSource.isInitialized) {
      console.log(
        '[OperationalGoalsOracleService] Inicializando conexão Oracle...'
      );
      await this.oracleDataSource.initialize();
      console.log(
        '[OperationalGoalsOracleService] Conexão Oracle inicializada.'
      );
    }
  }

  /**
   * Testa conectividade com Oracle
   */
  async testConnection(): Promise<{
    isConnected: boolean;
    message: string;
    responseTime?: number;
  }> {
    try {
      const startTime = Date.now();

      await this.ensureOracleConnection();

      // Query simples para testar conectividade
      const result = await this.oracleDataSource.query(
        'SELECT 1 as test FROM DUAL'
      );

      const responseTime = Date.now() - startTime;

      if (result && result.length > 0) {
        return {
          isConnected: true,
          message: 'Conexão Oracle OK',
          responseTime,
        };
      } else {
        return {
          isConnected: false,
          message: 'Query de teste retornou resultado vazio',
        };
      }
    } catch (error) {
      return {
        isConnected: false,
        message: `Erro de conexão: ${error.message}`,
      };
    }
  }
}
