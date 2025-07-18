// apps/api/src/modules/operational-goals/algorithms/saldo.algorithm.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { IsNull, Repository } from 'typeorm';
import {
  SaldoDevedorInput,
  SaldoDevedorResult,
} from '../types/calculation.types';

export class SaldoAlgorithm {
  private parameterRepo: Repository<ParameterValueEntity>;
  private performanceRepo: Repository<PerformanceDataEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;

  constructor() {
    this.parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    this.performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);

    console.log('[SaldoAlgorithm] Algoritmo de Sistema de Saldo inicializado');
  }

  /**
   * Calcula saldo devedor baseado no desempenho do mês anterior
   */
  async calculateSaldoDevedor(
    input: SaldoDevedorInput
  ): Promise<SaldoDevedorResult> {
    console.log(
      `[SaldoAlgorithm] Calculando saldo devedor para setor ${input.sectorId}, critério ${input.criterionType}`
    );

    try {
      // 1. Buscar período anterior
      const previousPeriod = await this.getPreviousPeriod(
        input.currentPeriodId
      );

      if (!previousPeriod) {
        console.log(
          '[SaldoAlgorithm] Nenhum período anterior encontrado - saldo devedor = 0'
        );
        return this.createZeroSaldoResult(input);
      }

      // 2. Buscar critério
      const criterion = await this.criterionRepo.findOne({
        where: { nome: input.criterionType },
      });

      if (!criterion) {
        throw new Error(`Critério '${input.criterionType}' não encontrado`);
      }

      // 3. Buscar meta aprovada do período anterior
      const metaAnterior = await this.parameterRepo.findOne({
        where: {
          competitionPeriodId: previousPeriod.id,
          sectorId: input.sectorId,
          criterionId: criterion.id,
          dataFimEfetivo: IsNull(), // Meta ativa
        },
        order: { versao: 'DESC' }, // Versão mais recente
      });

      // 4. Buscar gasto real do período anterior
      const gastoReal = await this.performanceRepo.findOne({
        where: {
          competitionPeriodId: previousPeriod.id,
          sectorId: input.sectorId,
          criterionId: criterion.id,
        },
        order: { loadTimestamp: 'DESC' }, // Dados mais recentes
      });

      if (!metaAnterior) {
        console.log(
          `[SaldoAlgorithm] Meta anterior não encontrada para setor ${input.sectorId}, critério ${input.criterionType}`
        );
        return this.createZeroSaldoResult(input, previousPeriod.mesAno);
      }

      if (!gastoReal || gastoReal.valor === null) {
        console.log(
          `[SaldoAlgorithm] Gasto real não encontrado para setor ${input.sectorId}, critério ${input.criterionType}`
        );
        return this.createZeroSaldoResult(input, previousPeriod.mesAno);
      }

      // 5. Buscar percentual de tolerância
      const tolerancia = await this.getToleranciaPercentual();

      // 6. Executar cálculo do saldo
      const metaAprovada = parseFloat(metaAnterior.valor);
      const gastoRealizado = gastoReal.valor;

      const saldoResult = this.executeSaldoCalculation(
        metaAprovada,
        gastoRealizado,
        tolerancia,
        input,
        previousPeriod.mesAno
      );

      console.log(
        `[SaldoAlgorithm] Saldo calculado: R$ ${saldoResult.saldoDevedor.toFixed(2)} para setor ${input.sectorId}`
      );

      return saldoResult;
    } catch (error) {
      console.error(`[SaldoAlgorithm] Erro ao calcular saldo devedor:`, error);
      throw new Error(
        `Falha no cálculo de saldo devedor: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      );
    }
  }

  /**
   * Executa o cálculo core do sistema de saldo
   */
  private executeSaldoCalculation(
    metaAprovada: number,
    gastoRealizado: number,
    tolerancia: number,
    input: SaldoDevedorInput,
    previousPeriodMesAno: string
  ): SaldoDevedorResult {
    // 1. Calcular teto de gasto permitido
    const tetoGasto = metaAprovada * (1 + tolerancia);

    // 2. Verificar se houve excedente
    const excedente = Math.max(0, gastoRealizado - tetoGasto);
    const saldoDevedor = excedente;

    // 3. Calcular percentual de excedente
    const percentualExcedente =
      metaAprovada > 0
        ? ((gastoRealizado - metaAprovada) / metaAprovada) * 100
        : 0;

    // 4. Gerar recomendações se necessário
    const recommendations = this.generateRecommendations(
      saldoDevedor,
      percentualExcedente,
      tolerancia
    );

    return {
      sectorId: input.sectorId,
      criterionType: input.criterionType,
      saldoDevedor,
      tetoGasto,
      excedente,
      previousPeriodData: {
        metaAprovada,
        gastoReal: gastoRealizado,
        periodMesAno: previousPeriodMesAno,
      },
      detalhes: {
        toleranciaAplicada: tolerancia,
        percentualExcedente,
        hadPreviousPeriod: true,
      },
      recommendations: recommendations.length > 0 ? recommendations : undefined,
    };
  }

  /**
   * Busca período anterior baseado no período atual
   */
  private async getPreviousPeriod(
    currentPeriodId: number
  ): Promise<CompetitionPeriodEntity | null> {
    const currentPeriod = await this.periodRepo.findOne({
      where: { id: currentPeriodId },
    });

    if (!currentPeriod) {
      throw new Error(
        `Período de competição ${currentPeriodId} não encontrado`
      );
    }

    // Parse do formato YYYY-MM
    const [year, month] = currentPeriod.mesAno.split('-').map(Number);

    let prevYear = year;
    let prevMonth = month - 1;

    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const previousMesAno = `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;

    return await this.periodRepo.findOne({
      where: { mesAno: previousMesAno },
    });
  }

  /**
   * Busca percentual de tolerância configurado
   */
  private async getToleranciaPercentual(): Promise<number> {
    // Importar serviço de parâmetros quando disponível
    // Por enquanto, valor padrão
    return 0.08; // 8% de tolerância padrão
  }

  /**
   * Cria resultado com saldo zero (sem período anterior ou dados)
   */
  private createZeroSaldoResult(
    input: SaldoDevedorInput,
    previousPeriodMesAno?: string
  ): SaldoDevedorResult {
    return {
      sectorId: input.sectorId,
      criterionType: input.criterionType,
      saldoDevedor: 0,
      tetoGasto: 0,
      excedente: 0,
      previousPeriodData: previousPeriodMesAno
        ? {
            metaAprovada: 0,
            gastoReal: 0,
            periodMesAno: previousPeriodMesAno,
          }
        : null,
      detalhes: {
        toleranciaAplicada: 0,
        percentualExcedente: 0,
        hadPreviousPeriod: !!previousPeriodMesAno,
      },
    };
  }

  /**
   * Gera recomendações baseadas no resultado do saldo
   */
  private generateRecommendations(
    saldoDevedor: number,
    percentualExcedente: number,
    tolerancia: number
  ): string[] {
    const recommendations: string[] = [];

    if (saldoDevedor > 0) {
      recommendations.push(
        `Saldo devedor de R$ ${saldoDevedor.toFixed(2)} será descontado da meta atual`
      );

      if (percentualExcedente > tolerancia * 100 * 2) {
        // Mais que 2x a tolerância
        recommendations.push(
          'Excedente significativo detectado - revisar controles operacionais'
        );
      }

      if (saldoDevedor > 5000) {
        // Valor alto em reais
        recommendations.push(
          'Considerar parcelamento do saldo devedor para evitar meta negativa'
        );
      }
    }

    return recommendations;
  }

  /**
   * Valida se o cálculo de saldo pode ser executado
   */
  async validateSaldoCalculation(input: SaldoDevedorInput): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validar critério
      const criterion = await this.criterionRepo.findOne({
        where: { nome: input.criterionType },
      });

      if (!criterion) {
        errors.push(`Critério '${input.criterionType}' não encontrado`);
      }

      // Validar período atual
      const currentPeriod = await this.periodRepo.findOne({
        where: { id: input.currentPeriodId },
      });

      if (!currentPeriod) {
        errors.push('Período de competição atual não encontrado');
      } else if (currentPeriod.status !== 'PLANEJAMENTO') {
        errors.push(
          'Período deve estar em status PLANEJAMENTO para calcular saldo'
        );
      }

      // Verificar período anterior
      const previousPeriod = await this.getPreviousPeriod(
        input.currentPeriodId
      );
      if (!previousPeriod) {
        warnings.push('Nenhum período anterior encontrado - saldo será zero');
      } else if (previousPeriod.status !== 'FECHADA') {
        warnings.push(
          'Período anterior não está FECHADO - dados podem estar incompletos'
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

  /**
   * Simula cálculo de saldo para testes/preview
   */
  async simulateSaldoCalculation(
    metaAprovada: number,
    gastoReal: number,
    toleranciaPercent: number = 8
  ): Promise<{
    tetoGasto: number;
    excedente: number;
    saldoDevedor: number;
    percentualExcedente: number;
  }> {
    const tolerancia = toleranciaPercent / 100;
    const tetoGasto = metaAprovada * (1 + tolerancia);
    const excedente = Math.max(0, gastoReal - tetoGasto);
    const saldoDevedor = excedente;
    const percentualExcedente =
      metaAprovada > 0 ? ((gastoReal - metaAprovada) / metaAprovada) * 100 : 0;

    return {
      tetoGasto,
      excedente,
      saldoDevedor,
      percentualExcedente,
    };
  }
}
