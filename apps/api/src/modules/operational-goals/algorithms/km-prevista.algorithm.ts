// apps/api/src/modules/operational-goals/algorithms/km-prevista.algorithm.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { DateCalculator } from '@/utils/date-calculator';
import { Repository } from 'typeorm';
import { OperationalGoalsOracleService } from '../oracle-data.service';
import { SectorMappingService } from '../sector-mapping.service';
import {
  DailyAverages,
  DailyKmData,
  DataQualityMetrics,
  KmPrevistaInput,
  KmPrevistaResult,
  MonthCalendar,
} from '../types/calculation.types';

export class KmPrevistaAlgorithm {
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private oracleService: OperationalGoalsOracleService;
  private sectorMapping: SectorMappingService;
  private dateCalculator: DateCalculator;

  constructor() {
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.oracleService = new OperationalGoalsOracleService();
    this.sectorMapping = new SectorMappingService();
    this.dateCalculator = new DateCalculator();

    console.log('[KmPrevistaAlgorithm] Algoritmo KM Prevista inicializado');
  }

  /**
   * Calcula KM prevista para um setor específico
   */
  async calculateKmPrevista(input: KmPrevistaInput): Promise<KmPrevistaResult> {
    console.log(
      `[KmPrevistaAlgorithm] Calculando KM prevista para setor ${input.sectorId}`
    );

    try {
      // 1. Buscar período e determinar mês de referência
      const period = await this.periodRepo.findOne({
        where: { id: input.competitionPeriodId },
      });

      if (!period) {
        throw new Error(
          `Período de competição ${input.competitionPeriodId} não encontrado`
        );
      }

      // 2. Calcular período de referência (mês anterior)
      const referenceMonth = this.calculateReferenceMonth(period.mesAno);
      const referenceRange =
        this.dateCalculator.convertPeriodToDateRange(referenceMonth);
      const referenceRangeFormatted =
        this.dateCalculator.formatDateRangeForQuery(referenceRange);

      console.log(
        `[KmPrevistaAlgorithm] Período de referência: ${referenceMonth}`
      );

      // 3. Buscar dados históricos do Oracle
      const oracleData = await this.oracleService.fetchDailyKmAndFuelForGoals(
        referenceRangeFormatted.startDate,
        referenceRangeFormatted.endDate
      );

      // 4. Filtrar dados do setor específico
      const sectorData = await this.filterSectorData(
        oracleData,
        input.sectorId
      );

      if (sectorData.length === 0) {
        throw new Error(
          `Nenhum dado histórico encontrado para o setor ${input.sectorId}`
        );
      }

      // 5. Converter dados Oracle para formato interno
      const dailyKmData = this.convertOracleToDaily(sectorData, referenceMonth);

      // 6. Analisar padrões diários considerando feriados históricos
      const dailyAverages = this.analyzeDailyPatterns(dailyKmData);

      // 7. Calcular calendário do mês futuro
      const futureCalendar = this.calculateFutureCalendar(
        period.mesAno,
        input.holidayClassifications
      );

      // 8. Projetar KM para o mês futuro
      const projectedKm = this.projectKmForMonth(dailyAverages, futureCalendar);

      // 9. Calcular métricas de qualidade dos dados
      const dataQuality = this.calculateDataQuality(
        dailyKmData,
        referenceRange
      );

      // 10. Calcular confiança da projeção
      const confidence = this.calculateConfidence(
        dataQuality,
        dailyAverages,
        futureCalendar
      );

      // 11. Gerar avisos se necessário
      const warnings = this.generateWarnings(
        dataQuality,
        dailyAverages,
        projectedKm
      );

      const result: KmPrevistaResult = {
        sectorId: input.sectorId,
        sectorName: await this.getSectorName(input.sectorId),
        projectedKm,
        confidence,
        calculationDetails: {
          referenceMonth,
          historicalData: dailyKmData,
          dailyAverages,
          futureCalendar,
          dataQuality,
        },
        warnings: warnings.length > 0 ? warnings : undefined,
      };

      console.log(
        `[KmPrevistaAlgorithm] KM prevista calculada: ${projectedKm.toFixed(0)} km (confiança: ${(confidence * 100).toFixed(1)}%)`
      );

      return result;
    } catch (error) {
      console.error(
        `[KmPrevistaAlgorithm] Erro ao calcular KM prevista:`,
        error
      );
      throw new Error(
        `Falha no cálculo de KM prevista: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Calcula mês de referência (anterior ao período de previsão)
   */
  private calculateReferenceMonth(futurePeriod: string): string {
    const [year, month] = futurePeriod.split('-').map(Number);

    let refYear = year;
    let refMonth = month - 1;

    if (refMonth === 0) {
      refMonth = 12;
      refYear = year - 1;
    }

    return `${refYear}-${refMonth.toString().padStart(2, '0')}`;
  }

  /**
   * Filtra dados Oracle para setor específico
   */
  private async filterSectorData(
    oracleData: any[],
    sectorId: number
  ): Promise<any[]> {
    const sectorData: any[] = [];

    for (const row of oracleData) {
      const mappedSector = this.sectorMapping.mapOracleToSectorSync(row.NOMEGA);
      if (mappedSector?.id === sectorId) {
        sectorData.push(row);
      }
    }

    return sectorData;
  }

  /**
   * Converte dados Oracle para formato interno com classificação de dias
   */
  private convertOracleToDaily(
    oracleData: any[],
    referenceMonth: string
  ): DailyKmData[] {
    const dailyData: DailyKmData[] = [];

    for (const row of oracleData) {
      const date = this.dateCalculator.formatDateAsString(
        new Date(row.DATAABASTCARRO)
      );
      const dayOfWeek = new Date(row.DATAABASTCARRO).getDay();

      // Classificar tipo do dia (simplificado - feriados históricos seriam ideais)
      let dayType: 'UTIL' | 'SABADO' | 'DOMINGO_FERIADO';
      if (dayOfWeek === 0) {
        dayType = 'DOMINGO_FERIADO';
      } else if (dayOfWeek === 6) {
        dayType = 'SABADO';
      } else {
        dayType = 'UTIL';
      }

      dailyData.push({
        date,
        dayType,
        totalKm: row.KM || 0,
        vehicleCount: 1, // Simplificado - seria ideal buscar contagem real
        avgKmPerVehicle: row.KM || 0,
      });
    }

    return dailyData.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Analisa padrões diários e calcula médias por tipo de dia
   */
  private analyzeDailyPatterns(dailyData: DailyKmData[]): DailyAverages {
    const patterns = {
      util: [] as number[],
      sabado: [] as number[],
      domingoFeriado: [] as number[],
    };

    // Agrupar por tipo de dia
    for (const day of dailyData) {
      switch (day.dayType) {
        case 'UTIL':
          patterns.util.push(day.totalKm);
          break;
        case 'SABADO':
          patterns.sabado.push(day.totalKm);
          break;
        case 'DOMINGO_FERIADO':
          patterns.domingoFeriado.push(day.totalKm);
          break;
      }
    }

    return {
      util: this.calculateStatsForPattern(patterns.util),
      sabado: this.calculateStatsForPattern(patterns.sabado),
      domingoFeriado: this.calculateStatsForPattern(patterns.domingoFeriado),
    };
  }

  /**
   * Calcula estatísticas para um padrão de dias
   */
  private calculateStatsForPattern(values: number[]): {
    avgKm: number;
    count: number;
    stdDev: number;
  } {
    if (values.length === 0) {
      return { avgKm: 0, count: 0, stdDev: 0 };
    }

    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;

    const variance =
      values.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    return {
      avgKm: avg,
      count: values.length,
      stdDev,
    };
  }

  /**
   * Calcula calendário do mês futuro com feriados classificados
   */
  private calculateFutureCalendar(
    futurePeriod: string,
    holidayClassifications: Array<{ date: string; classification: any }>
  ): MonthCalendar {
    const [year, month] = futurePeriod.split('-').map(Number);

    const monthStats = this.dateCalculator.calculateMonthlyStats(
      year,
      month,
      holidayClassifications
    );

    return {
      year,
      month,
      totalDays: monthStats.totalDays,
      utilDays: monthStats.weekdays,
      sabadoDays: monthStats.saturdays,
      domingoFeriadoDays: monthStats.sundays,
      projectedByType: {
        util: monthStats.weekdays,
        sabado: monthStats.saturdays,
        domingoFeriado: monthStats.sundays,
      },
    };
  }

  /**
   * Projeta KM para o mês futuro baseado nos padrões históricos
   */
  private projectKmForMonth(
    averages: DailyAverages,
    calendar: MonthCalendar
  ): number {
    const kmUtil = averages.util.avgKm * calendar.utilDays;
    const kmSabado = averages.sabado.avgKm * calendar.sabadoDays;
    const kmDomingoFeriado =
      averages.domingoFeriado.avgKm * calendar.domingoFeriadoDays;

    const totalProjected = kmUtil + kmSabado + kmDomingoFeriado;

    console.log(`[KmPrevistaAlgorithm] Projeção detalhada:`);
    console.log(
      `  - Úteis: ${averages.util.avgKm.toFixed(0)} km/dia × ${calendar.utilDays} dias = ${kmUtil.toFixed(0)} km`
    );
    console.log(
      `  - Sábados: ${averages.sabado.avgKm.toFixed(0)} km/dia × ${calendar.sabadoDays} dias = ${kmSabado.toFixed(0)} km`
    );
    console.log(
      `  - Dom/Feriados: ${averages.domingoFeriado.avgKm.toFixed(0)} km/dia × ${calendar.domingoFeriadoDays} dias = ${kmDomingoFeriado.toFixed(0)} km`
    );

    return totalProjected;
  }

  /**
   * Calcula métricas de qualidade dos dados
   */
  private calculateDataQuality(
    dailyData: DailyKmData[],
    referenceRange: any
  ): DataQualityMetrics {
    const totalDaysInMonth = this.dateCalculator.calculateDaysDifference(
      this.dateCalculator.formatDateAsString(referenceRange.startDate),
      this.dateCalculator.formatDateAsString(referenceRange.endDate)
    );

    const completeness = dailyData.length / totalDaysInMonth;

    // Detectar anomalias (valores muito acima ou abaixo da média)
    const allKmValues = dailyData.map((d) => d.totalKm);
    const avgKm = allKmValues.reduce((a, b) => a + b, 0) / allKmValues.length;
    const stdDev = Math.sqrt(
      allKmValues.reduce((acc, val) => acc + Math.pow(val - avgKm, 2), 0) /
        allKmValues.length
    );

    const anomaliesDetected = allKmValues.filter(
      (km) => Math.abs(km - avgKm) > stdDev * 2
    ).length;

    // Consistência baseada no desvio padrão relativo
    const consistency = Math.max(0, 1 - stdDev / avgKm);

    return {
      completeness: Math.min(1, completeness),
      consistency: Math.min(1, consistency),
      anomaliesDetected,
      recommendedConfidence: Math.min(completeness, consistency),
    };
  }

  /**
   * Calcula confiança da projeção
   */
  private calculateConfidence(
    dataQuality: DataQualityMetrics,
    averages: DailyAverages,
    calendar: MonthCalendar
  ): number {
    // Fatores que afetam a confiança
    const qualityFactor = dataQuality.recommendedConfidence;

    // Penalizar se não há dados suficientes para algum tipo de dia
    const patternCompleteness = Math.min(
      averages.util.count > 0 ? 1 : 0.5,
      averages.sabado.count > 0 ? 1 : 0.7,
      averages.domingoFeriado.count > 0 ? 1 : 0.8
    );

    // Confiança final
    const confidence = qualityFactor * patternCompleteness;

    return Math.max(0.1, Math.min(1, confidence)); // Entre 10% e 100%
  }

  /**
   * Gera avisos baseados na análise dos dados
   */
  private generateWarnings(
    dataQuality: DataQualityMetrics,
    averages: DailyAverages,
    projectedKm: number
  ): string[] {
    const warnings: string[] = [];

    if (dataQuality.completeness < 0.8) {
      warnings.push(
        `Dados incompletos: apenas ${(dataQuality.completeness * 100).toFixed(0)}% dos dias têm dados`
      );
    }

    if (dataQuality.anomaliesDetected > 5) {
      warnings.push(
        `${dataQuality.anomaliesDetected} anomalias detectadas nos dados históricos`
      );
    }

    if (averages.util.count === 0) {
      warnings.push(
        'Nenhum dado de dias úteis encontrado - projeção pode ser imprecisa'
      );
    }

    if (projectedKm < 1000) {
      warnings.push('Projeção de KM muito baixa - verificar dados de entrada');
    }

    if (projectedKm > 100000) {
      warnings.push('Projeção de KM muito alta - verificar dados de entrada');
    }

    return warnings;
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
   * Valida se o cálculo de KM prevista pode ser executado
   */
  async validateKmPrevistaCalculation(input: KmPrevistaInput): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validar período
      const period = await this.periodRepo.findOne({
        where: { id: input.competitionPeriodId },
      });

      if (!period) {
        errors.push('Período de competição não encontrado');
      } else if (period.status !== 'PLANEJAMENTO') {
        errors.push('Período deve estar em status PLANEJAMENTO');
      }

      // Validar classificações de feriados
      if (
        !input.holidayClassifications ||
        input.holidayClassifications.length === 0
      ) {
        warnings.push('Nenhuma classificação de feriado fornecida');
      }

      // Testar conectividade Oracle
      const oracleTest = await this.oracleService.testConnection();
      if (!oracleTest.isConnected) {
        errors.push(
          'Falha na conexão com Oracle - dados históricos indisponíveis'
        );
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
}
