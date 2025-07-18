// apps/api/src/modules/operational-goals/algorithms/combustivel.algorithm.ts
import { AppDataSource } from '@/database/data-source';
import { RawOracleFleetPerformanceEntity } from '@/entity/raw-data/raw-oracle-fleet-performance.entity';
import { DateCalculator } from '@/utils/date-calculator';
import { Between, Repository } from 'typeorm';
import { OperationalGoalsOracleService } from '../oracle-data.service';
import {
  CombustivelInput,
  CombustivelResult,
  FuelDataQuality,
  HistoricalEfficiency,
} from '../types/calculation.types';

export class CombustivelAlgorithm {
  private rawFleetRepo: Repository<RawOracleFleetPerformanceEntity>;
  private oracleService: OperationalGoalsOracleService;
  private dateCalculator: DateCalculator;

  constructor() {
    this.rawFleetRepo = AppDataSource.getRepository(
      RawOracleFleetPerformanceEntity
    );
    this.oracleService = new OperationalGoalsOracleService();
    this.dateCalculator = new DateCalculator();

    console.log('[CombustivelAlgorithm] Algoritmo de Combustível inicializado');
  }

  /**
   * Calcula meta de combustível baseada na KM prevista e eficiência histórica
   */
  async calculateCombustivel(
    input: CombustivelInput
  ): Promise<CombustivelResult> {
    console.log(
      `[CombustivelAlgorithm] Calculando meta de combustível para setor ${input.sectorId}`
    );

    try {
      // 1. Determinar período de análise (últimos N meses)
      const analysisMonths = input.referenceMonths || 3;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - analysisMonths);

      console.log(
        `[CombustivelAlgorithm] Analisando eficiência dos últimos ${analysisMonths} meses`
      );

      // 2. Buscar dados históricos de eficiência
      const historicalEfficiency = await this.getHistoricalEfficiency(
        input.sectorId,
        analysisMonths
      );

      if (
        historicalEfficiency.totalKm === 0 ||
        historicalEfficiency.totalLiters === 0
      ) {
        throw new Error(
          `Dados históricos insuficientes para setor ${input.sectorId}`
        );
      }

      // 3. Buscar fator de redução configurado
      const fatorReducao = await this.getFatorReducao();

      // 4. Calcular previsão bruta de combustível
      const litrosPrevistoBruto =
        input.kmPrevista / historicalEfficiency.avgKmPerLiter;

      // 5. Aplicar fator de redução para meta
      const reductionApplied = litrosPrevistoBruto * fatorReducao;
      const metaLitros = litrosPrevistoBruto - reductionApplied;

      // 6. Analisar tendência da eficiência
      const efficiencyTrend = this.analyzeEfficiencyTrend(historicalEfficiency);

      // 7. Calcular qualidade dos dados
      const dataQuality = this.calculateFuelDataQuality(historicalEfficiency);

      // 8. Gerar avisos se necessário
      const warnings = this.generateFuelWarnings(
        input.kmPrevista,
        historicalEfficiency,
        metaLitros,
        dataQuality
      );

      // 9. Buscar nome do setor
      const sectorName = await this.getSectorName(input.sectorId);

      const result: CombustivelResult = {
        sectorId: input.sectorId,
        sectorName,
        kmPrevista: input.kmPrevista,
        historical3Months: historicalEfficiency,
        fatorReducao,
        metaLitros,
        calculationDetails: {
          litrosPrevistoBruto,
          reductionApplied,
          avgEfficiency: historicalEfficiency.avgKmPerLiter,
          efficiencyTrend,
        },
        dataQuality,
        warnings: warnings.length > 0 ? warnings : undefined,
      };

      console.log(
        `[CombustivelAlgorithm] Meta calculada: ${metaLitros.toFixed(0)} litros (eficiência: ${historicalEfficiency.avgKmPerLiter.toFixed(2)} km/L)`
      );

      return result;
    } catch (error) {
      console.error(
        `[CombustivelAlgorithm] Erro ao calcular meta de combustível:`,
        error
      );
      throw new Error(
        `Falha no cálculo de combustível: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Busca dados históricos de eficiência de combustível
   */
  private async getHistoricalEfficiency(
    sectorId: number,
    monthsBack: number
  ): Promise<HistoricalEfficiency> {
    const sectorName = await this.getSectorName(sectorId);

    // Calcular período de análise
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsBack);

    const startMonth = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}`;
    const endMonth = `${endDate.getFullYear()}-${endDate.getMonth().toString().padStart(2, '0')}`;

    console.log(
      `[CombustivelAlgorithm] Buscando dados de ${startMonth} a ${endMonth} para ${sectorName}`
    );

    // Buscar dados nas Raw Entities existentes
    const rawData = await this.rawFleetRepo.find({
      where: {
        sectorName: sectorName,
        metricMonth: Between(startMonth, endMonth),
      },
      order: { metricMonth: 'ASC' },
    });

    if (rawData.length === 0) {
      // Fallback: buscar dados diretamente do Oracle
      return await this.getEfficiencyFromOracle(sectorId, monthsBack);
    }

    // Processar dados das Raw Entities
    const monthlyData = rawData.map((row) => ({
      month: row.metricMonth,
      km: row.totalKm,
      liters: row.totalFuelLiters,
      efficiency: row.avgKmL,
    }));

    const totalKm = monthlyData.reduce((sum, month) => sum + month.km, 0);
    const totalLiters = monthlyData.reduce(
      (sum, month) => sum + month.liters,
      0
    );
    const avgKmPerLiter = totalKm / totalLiters;

    // Calcular tendência
    const trend = this.calculateEfficiencyTrend(monthlyData);

    return {
      totalKm,
      totalLiters,
      avgKmPerLiter,
      monthlyData,
      trend,
    };
  }

  /**
   * Busca eficiência diretamente do Oracle (fallback)
   */
  private async getEfficiencyFromOracle(
    sectorId: number,
    monthsBack: number
  ): Promise<HistoricalEfficiency> {
    const consolidatedData =
      await this.oracleService.fetchMonthlyConsolidatedData(monthsBack);
    const sectorName = await this.getSectorName(sectorId);

    const sectorData = consolidatedData.filter((row) => {
      // Mapear nome Oracle para setor
      const garageMappings: Record<string, string> = {
        'GARAGEM GAMA': 'GAMA',
        'GARAGEM PARANOA': 'PARANOÁ',
        'GARAGEM SANTA MARIA': 'SANTA MARIA',
        'GARAGEM SAO SEBASTIAO': 'SÃO SEBASTIÃO',
      };

      return garageMappings[row.garagem] === sectorName;
    });

    if (sectorData.length === 0) {
      throw new Error(
        `Nenhum dado de eficiência encontrado para setor ${sectorName}`
      );
    }

    const monthlyData = sectorData.map((row) => ({
      month: row.ano_mes,
      km: row.total_km,
      liters: row.total_litros,
      efficiency: row.total_km / row.total_litros,
    }));

    const totalKm = monthlyData.reduce((sum, month) => sum + month.km, 0);
    const totalLiters = monthlyData.reduce(
      (sum, month) => sum + month.liters,
      0
    );
    const avgKmPerLiter = totalKm / totalLiters;

    const trend = this.calculateEfficiencyTrend(monthlyData);

    return {
      totalKm,
      totalLiters,
      avgKmPerLiter,
      monthlyData,
      trend,
    };
  }

  /**
   * Calcula tendência da eficiência ao longo do tempo
   */
  private calculateEfficiencyTrend(
    monthlyData: Array<{ month: string; efficiency: number }>
  ): {
    slope: number;
    correlation: number;
  } {
    if (monthlyData.length < 2) {
      return { slope: 0, correlation: 0 };
    }

    const n = monthlyData.length;
    const xValues = monthlyData.map((_, index) => index); // 0, 1, 2...
    const yValues = monthlyData.map((data) => data.efficiency);

    // Calcular regressão linear simples
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
    const sumYY = yValues.reduce((sum, y) => sum + y * y, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Coeficiente de correlação
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)
    );
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    return { slope, correlation };
  }

  /**
   * Analisa tendência da eficiência
   */
  private analyzeEfficiencyTrend(
    historical: HistoricalEfficiency
  ): 'IMPROVING' | 'STABLE' | 'DEGRADING' {
    const { slope, correlation } = historical.trend;

    // Se correlação é fraca, considerar estável
    if (Math.abs(correlation) < 0.3) {
      return 'STABLE';
    }

    // Tendência baseada na inclinação
    if (slope > 0.01) {
      // Melhorando mais que 0.01 km/L por mês
      return 'IMPROVING';
    } else if (slope < -0.01) {
      // Piorando mais que 0.01 km/L por mês
      return 'DEGRADING';
    } else {
      return 'STABLE';
    }
  }

  /**
   * Calcula qualidade dos dados de combustível
   */
  private calculateFuelDataQuality(
    historical: HistoricalEfficiency
  ): FuelDataQuality {
    const expectedMonths = 3; // Padrão
    const completeness = historical.monthlyData.length / expectedMonths;

    // Detectar meses anômalos (eficiência muito diferente da média)
    const efficiencies = historical.monthlyData.map((m) => m.efficiency);
    const avgEfficiency =
      efficiencies.reduce((a, b) => a + b, 0) / efficiencies.length;
    const stdDev = Math.sqrt(
      efficiencies.reduce(
        (acc, eff) => acc + Math.pow(eff - avgEfficiency, 2),
        0
      ) / efficiencies.length
    );

    const anomalousMonths = historical.monthlyData
      .filter(
        (month) => Math.abs(month.efficiency - avgEfficiency) > stdDev * 1.5
      )
      .map((month) => month.month);

    // Confiabilidade baseada na variabilidade
    const reliability = Math.max(0, 1 - stdDev / avgEfficiency);

    return {
      completeness: Math.min(1, completeness),
      reliability: Math.min(1, reliability),
      anomalousMonths,
    };
  }

  /**
   * Gera avisos sobre a qualidade do cálculo
   */
  private generateFuelWarnings(
    kmPrevista: number,
    historical: HistoricalEfficiency,
    metaLitros: number,
    dataQuality: FuelDataQuality
  ): string[] {
    const warnings: string[] = [];

    if (dataQuality.completeness < 0.8) {
      warnings.push(
        `Dados incompletos: apenas ${Math.round(dataQuality.completeness * 100)}% dos meses esperados`
      );
    }

    if (dataQuality.reliability < 0.7) {
      warnings.push(
        'Alta variabilidade na eficiência histórica - confiança reduzida'
      );
    }

    if (dataQuality.anomalousMonths.length > 0) {
      warnings.push(
        `Meses com eficiência anômala detectados: ${dataQuality.anomalousMonths.join(', ')}`
      );
    }

    if (historical.avgKmPerLiter < 2) {
      warnings.push('Eficiência histórica muito baixa - verificar dados');
    }

    if (historical.avgKmPerLiter > 15) {
      warnings.push('Eficiência histórica muito alta - verificar dados');
    }

    if (metaLitros < 1000) {
      warnings.push('Meta de combustível muito baixa - revisar cálculo');
    }

    const projectedEfficiency = kmPrevista / metaLitros;
    const efficiencyImprovement =
      (projectedEfficiency - historical.avgKmPerLiter) /
      historical.avgKmPerLiter;

    if (efficiencyImprovement > 0.1) {
      // Mais que 10% de melhoria esperada
      warnings.push(
        `Meta implica melhoria de eficiência de ${(efficiencyImprovement * 100).toFixed(1)}% - verificar viabilidade`
      );
    }

    return warnings;
  }

  /**
   * Busca fator de redução configurado
   */
  private async getFatorReducao(): Promise<number> {
    // Por enquanto retorna valor padrão
    // TODO: Integrar com OperationalGoalsParametersService
    return 0.015; // 1.5%
  }

  /**
   * Busca nome do setor
   */
  private async getSectorName(sectorId: number): Promise<string> {
    const sectorMapping = {
      1: 'GAMA',
      2: 'PARANOÁ',
      3: 'SANTA MARIA',
      4: 'SÃO SEBASTIÃO',
    };

    return (
      sectorMapping[sectorId as keyof typeof sectorMapping] ||
      `Setor ${sectorId}`
    );
  }

  /**
   * Valida se o cálculo de combustível pode ser executado
   */
  async validateCombustivelCalculation(input: CombustivelInput): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validar KM prevista
      if (input.kmPrevista <= 0) {
        errors.push('KM prevista deve ser maior que zero');
      }

      if (input.kmPrevista > 200000) {
        // Limite realista
        warnings.push('KM prevista muito alta - verificar cálculo anterior');
      }

      // Validar disponibilidade de dados históricos
      try {
        const historical = await this.getHistoricalEfficiency(
          input.sectorId,
          input.referenceMonths || 3
        );

        if (historical.monthlyData.length < 2) {
          warnings.push(
            'Poucos dados históricos disponíveis - confiança reduzida'
          );
        }

        if (historical.avgKmPerLiter < 1 || historical.avgKmPerLiter > 20) {
          errors.push('Eficiência histórica fora da faixa realista');
        }
      } catch (error) {
        errors.push('Dados históricos de eficiência não disponíveis');
      }

      // Testar conectividade Oracle
      const oracleTest = await this.oracleService.testConnection();
      if (!oracleTest.isConnected) {
        warnings.push('Conexão Oracle instável - usando dados em cache');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      errors.push(
        `Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );

      return {
        isValid: false,
        errors,
        warnings,
      };
    }
  }

  /**
   * Simula cálculo de combustível para testes/preview
   */
  async simulateCombustivelCalculation(
    kmPrevista: number,
    avgKmPerLiter: number,
    fatorReducao: number = 0.015
  ): Promise<{
    litrosPrevistoBruto: number;
    reductionApplied: number;
    metaLitros: number;
    projectedEfficiency: number;
  }> {
    const litrosPrevistoBruto = kmPrevista / avgKmPerLiter;
    const reductionApplied = litrosPrevistoBruto * fatorReducao;
    const metaLitros = litrosPrevistoBruto - reductionApplied;
    const projectedEfficiency = kmPrevista / metaLitros;

    return {
      litrosPrevistoBruto,
      reductionApplied,
      metaLitros,
      projectedEfficiency,
    };
  }
}
