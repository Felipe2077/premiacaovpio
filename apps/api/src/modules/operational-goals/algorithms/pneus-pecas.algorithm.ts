// apps/api/src/modules/operational-goals/algorithms/pneus-pecas.algorithm.ts
import { AppDataSource } from '@/database/data-source';
import { CriterionEntity } from '@/entity/criterion.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { DateCalculator } from '@/utils/date-calculator';
import { Between, Repository } from 'typeorm';
import {
  AnnualCostData,
  CostDataQuality,
  PneusPecasInput,
  PneusPecasResult,
  SaldoDevedorResult,
} from '../types/calculation.types';
import { SaldoAlgorithm } from './saldo.algorithm';

export class PneusPecasAlgorithm {
  private performanceRepo: Repository<PerformanceDataEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private saldoAlgorithm: SaldoAlgorithm;
  private dateCalculator: DateCalculator;

  constructor() {
    this.performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.saldoAlgorithm = new SaldoAlgorithm();
    this.dateCalculator = new DateCalculator();

    console.log('[PneusPecasAlgorithm] Algoritmo de Pneus/Peças inicializado');
  }

  /**
   * Calcula meta de Pneus ou Peças com sistema de saldo
   */
  async calculatePneusPecas(input: PneusPecasInput): Promise<PneusPecasResult> {
    console.log(
      `[PneusPecasAlgorithm] Calculando meta de ${input.criterionType} para setor ${input.sectorId}`
    );

    try {
      // 1. Buscar dados históricos de custo (12 meses)
      const annualCostData = await this.getAnnualCostData(input);

      if (annualCostData.totalKm12Months === 0) {
        throw new Error(
          `Dados históricos insuficientes para ${input.criterionType} - setor ${input.sectorId}`
        );
      }

      // 2. Calcular custo previsto baseado na KM prevista
      const custoPrevisto = input.kmPrevista * annualCostData.avgCostPerKm;

      // 3. Buscar percentual de premiação
      const percentualPremiacao = await this.getPercentualPremiacao(
        input.criterionType
      );

      // 4. Calcular meta base (com premiação)
      const reductionApplied = custoPrevisto * percentualPremiacao;
      const metaBase = custoPrevisto - reductionApplied;

      // 5. Calcular saldo devedor do período anterior
      const saldoDetails = await this.saldoAlgorithm.calculateSaldoDevedor({
        sectorId: input.sectorId,
        criterionType: input.criterionType,
        currentPeriodId: input.currentPeriodId,
      });

      // 6. Aplicar saldo devedor na meta
      const metaFinal = metaBase - saldoDetails.saldoDevedor;

      // 7. Calcular meta por veículo (informativo)
      const vehicleCount = await this.getVehicleCount(input.sectorId);
      const metaPorVeiculo = vehicleCount > 0 ? metaFinal / vehicleCount : 0;

      // 8. Calcular qualidade dos dados
      const dataQuality = this.calculateCostDataQuality(annualCostData);

      // 9. Gerar avisos
      const warnings = this.generateCostWarnings(
        input,
        annualCostData,
        metaFinal,
        saldoDetails,
        dataQuality
      );

      // 10. Buscar nome do setor
      const sectorName = await this.getSectorName(input.sectorId);

      const result: PneusPecasResult = {
        sectorId: input.sectorId,
        sectorName,
        criterionType: input.criterionType,
        kmPrevista: input.kmPrevista,
        annualCostData,
        metaBase,
        saldoDevedor: saldoDetails.saldoDevedor,
        metaFinal,
        metaPorVeiculo,
        calculationDetails: {
          custoPrevisto,
          percentualPremiacao,
          reductionApplied,
          vehicleCount,
        },
        saldoDetails,
        dataQuality,
        warnings: warnings.length > 0 ? warnings : undefined,
      };

      console.log(
        `[PneusPecasAlgorithm] Meta ${input.criterionType} calculada: R$ ${metaFinal.toFixed(2)} (saldo: R$ ${saldoDetails.saldoDevedor.toFixed(2)})`
      );

      return result;
    } catch (error) {
      console.error(
        `[PneusPecasAlgorithm] Erro ao calcular ${input.criterionType}:`,
        error
      );
      throw new Error(
        `Falha no cálculo de ${input.criterionType}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Busca dados históricos de custo dos últimos 12 meses
   */
  private async getAnnualCostData(
    input: PneusPecasInput
  ): Promise<AnnualCostData> {
    // 1. Buscar critério
    const criterion = await this.criterionRepo.findOne({
      where: { nome: input.criterionType },
    });

    if (!criterion) {
      throw new Error(`Critério '${input.criterionType}' não encontrado`);
    }

    // 2. Calcular período de análise (últimos 12 meses)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - (input.referenceMonths || 12));

    const startDateStr = this.dateCalculator.formatDateAsString(startDate);
    const endDateStr = this.dateCalculator.formatDateAsString(endDate);

    console.log(
      `[PneusPecasAlgorithm] Buscando custos de ${startDateStr} a ${endDateStr}`
    );

    // 3. Buscar dados de performance (custos realizados)
    const performanceData = await this.performanceRepo.find({
      where: {
        sectorId: input.sectorId,
        criterionId: criterion.id,
        metricDate: Between(startDateStr, endDateStr),
      },
      order: { metricDate: 'ASC' },
    });

    if (performanceData.length === 0) {
      throw new Error(
        `Nenhum dado de custo encontrado para ${input.criterionType} - setor ${input.sectorId}`
      );
    }

    // 4. Processar dados mensais
    const monthlyData = this.processMonthlyPerformanceData(performanceData);

    // 5. Calcular totais anuais
    const totalCost12Months = monthlyData.reduce(
      (sum, month) => sum + month.cost,
      0
    );
    const totalKm12Months = monthlyData.reduce(
      (sum, month) => sum + month.km,
      0
    );
    const avgCostPerKm =
      totalKm12Months > 0 ? totalCost12Months / totalKm12Months : 0;

    // 6. Analisar tendência
    const trend = this.calculateCostTrend(monthlyData);

    return {
      totalKm12Months,
      totalCost12Months,
      avgCostPerKm,
      monthlyData,
      trend,
    };
  }

  /**
   * Processa dados de performance em dados mensais consolidados
   */
  private processMonthlyPerformanceData(
    performanceData: PerformanceDataEntity[]
  ): Array<{
    month: string;
    km: number;
    cost: number;
    costPerKm: number;
  }> {
    // Agrupar por mês
    const monthlyMap = new Map<
      string,
      { km: number; cost: number; count: number }
    >();

    for (const data of performanceData) {
      const month = data.metricDate.substring(0, 7); // YYYY-MM
      const existingData = monthlyMap.get(month) || {
        km: 0,
        cost: 0,
        count: 0,
      };

      // Acumular dados do mês
      existingData.cost += data.valor || 0;
      existingData.km += data.targetValue || 0; // Assumindo que targetValue contém KM
      existingData.count += 1;

      monthlyMap.set(month, existingData);
    }

    // Converter para array ordenado
    const monthlyData: Array<{
      month: string;
      km: number;
      cost: number;
      costPerKm: number;
    }> = [];

    for (const [month, data] of monthlyMap.entries()) {
      const costPerKm = data.km > 0 ? data.cost / data.km : 0;

      monthlyData.push({
        month,
        km: data.km,
        cost: data.cost,
        costPerKm,
      });
    }

    return monthlyData.sort((a, b) => a.month.localeCompare(b.month));
  }

  /**
   * Calcula tendência dos custos ao longo do tempo
   */
  private calculateCostTrend(
    monthlyData: Array<{ month: string; costPerKm: number }>
  ): {
    slope: number;
    seasonality: number;
  } {
    if (monthlyData.length < 3) {
      return { slope: 0, seasonality: 0 };
    }

    const costs = monthlyData.map((m) => m.costPerKm);
    const n = costs.length;
    const xValues = costs.map((_, index) => index);

    // Regressão linear para tendência
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = costs.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * costs[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

    // Sazonalidade simples (variação máxima relativa)
    const avgCost = sumY / n;
    const maxVariation = Math.max(
      ...costs.map((cost) => Math.abs(cost - avgCost))
    );
    const seasonality = avgCost > 0 ? maxVariation / avgCost : 0;

    return { slope, seasonality };
  }

  /**
   * Calcula qualidade dos dados de custo
   */
  private calculateCostDataQuality(
    annualData: AnnualCostData
  ): CostDataQuality {
    const expectedMonths = 12;
    const completeness = annualData.monthlyData.length / expectedMonths;

    // Detectar meses outliers
    const costs = annualData.monthlyData.map((m) => m.costPerKm);
    const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
    const stdDev = Math.sqrt(
      costs.reduce((acc, cost) => acc + Math.pow(cost - avgCost, 2), 0) /
        costs.length
    );

    const outlierMonths = annualData.monthlyData
      .filter((month) => Math.abs(month.costPerKm - avgCost) > stdDev * 2)
      .map((month) => month.month);

    // Confiabilidade baseada na variabilidade
    const reliability = avgCost > 0 ? Math.max(0, 1 - stdDev / avgCost) : 0;

    // Correlação custo vs KM (ideal seria negativa ou neutra)
    const kmValues = annualData.monthlyData.map((m) => m.km);
    const costValues = annualData.monthlyData.map((m) => m.cost);
    const kmCorrelation = this.calculateCorrelation(kmValues, costValues);

    return {
      completeness: Math.min(1, completeness),
      reliability: Math.min(1, reliability),
      outlierMonths,
      kmCorrelation,
    };
  }

  /**
   * Calcula correlação entre duas séries
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Gera avisos sobre a qualidade do cálculo
   */
  private generateCostWarnings(
    input: PneusPecasInput,
    annualData: AnnualCostData,
    metaFinal: number,
    saldoDetails: SaldoDevedorResult,
    dataQuality: CostDataQuality
  ): string[] {
    const warnings: string[] = [];

    // Avisos sobre qualidade dos dados
    if (dataQuality.completeness < 0.8) {
      warnings.push(
        `Dados incompletos: apenas ${Math.round(dataQuality.completeness * 100)}% dos meses com dados`
      );
    }

    if (dataQuality.reliability < 0.6) {
      warnings.push(
        'Alta variabilidade nos custos históricos - confiança reduzida'
      );
    }

    if (dataQuality.outlierMonths.length > 2) {
      warnings.push(
        `Meses com custos anômalos detectados: ${dataQuality.outlierMonths.join(', ')}`
      );
    }

    // Avisos sobre valores calculados
    if (annualData.avgCostPerKm < 0.1) {
      warnings.push(
        'Custo médio por KM muito baixo - verificar dados históricos'
      );
    }

    if (annualData.avgCostPerKm > 5) {
      warnings.push(
        'Custo médio por KM muito alto - verificar dados históricos'
      );
    }

    if (metaFinal < 0) {
      warnings.push(
        `Meta final negativa (R$ ${metaFinal.toFixed(2)}) devido ao saldo devedor - considerar ajustes`
      );
    }

    if (saldoDetails.saldoDevedor > metaFinal * 0.5) {
      warnings.push(
        'Saldo devedor representa mais de 50% da meta base - impacto significativo'
      );
    }

    // Avisos sobre tendências
    if (annualData.trend.slope > 0.1) {
      warnings.push(
        'Tendência de aumento nos custos detectada - meta pode ser conservadora'
      );
    }

    return warnings;
  }

  /**
   * Busca percentual de premiação configurado
   */
  private async getPercentualPremiacao(
    criterionType: 'PNEUS' | 'PEÇAS'
  ): Promise<number> {
    // Por enquanto retorna valor padrão
    // TODO: Integrar com OperationalGoalsParametersService
    return 0.03; // 3%
  }

  /**
   * Busca contagem de veículos do setor
   */
  private async getVehicleCount(sectorId: number): Promise<number> {
    // Por enquanto retorna valor estimado
    // TODO: Buscar contagem real do Oracle
    const defaultCounts = { 1: 45, 2: 38, 3: 42, 4: 40 }; // Estimativas por setor
    return defaultCounts[sectorId as keyof typeof defaultCounts] || 40;
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
   * Valida se o cálculo pode ser executado
   */
  async validatePneusPecasCalculation(input: PneusPecasInput): Promise<{
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

      // Validar critério
      const criterion = await this.criterionRepo.findOne({
        where: { nome: input.criterionType },
      });

      if (!criterion) {
        errors.push(`Critério '${input.criterionType}' não encontrado`);
      }

      // Validar disponibilidade de dados históricos
      try {
        const annualData = await this.getAnnualCostData(input);

        if (annualData.monthlyData.length < 6) {
          warnings.push(
            'Poucos dados históricos disponíveis - confiança reduzida'
          );
        }

        if (annualData.avgCostPerKm <= 0) {
          errors.push('Dados de custo histórico inválidos');
        }
      } catch (error) {
        errors.push('Dados históricos de custo não disponíveis');
      }

      // Validar cálculo de saldo
      const saldoValidation =
        await this.saldoAlgorithm.validateSaldoCalculation({
          sectorId: input.sectorId,
          criterionType: input.criterionType,
          currentPeriodId: input.currentPeriodId,
        });

      warnings.push(...saldoValidation.warnings);

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
}
