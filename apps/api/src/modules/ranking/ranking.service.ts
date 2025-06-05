// apps/api/src/modules/ranking/ranking.service.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { SectorEntity } from '@/entity/sector.entity';
import {
  EntradaRanking,
  EntradaResultadoDetalhado,
  RegrasAplicadasPadrao,
} from '@sistema-premiacao/shared-types';
import {
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { CriterionCalculationSettingsService } from '../parameters/criterion-calculation-settings.service';
import {
  PlanningCellDataService,
  PlanningCellOutput,
} from '../planning/planning-cell-data.service';

// Interfaces e tipos
interface ResultadoPorCriterio {
  setorId: number;
  setorNome: string;
  criterioId: number;
  criterioNome: string;
  valorRealizado: number | null;
  valorMeta: number | null;
  razaoCalculada: number | null;
  rank?: number;
  pontos: number | null;
  percentualAtingimento?: number | null;
  periodo?: string | null;
  metaPropostaPadrao?: number | null;
  metaAnteriorValor?: number | null;
  metaAnteriorPeriodo?: string | null;
  regrasAplicadasPadrao?: RegrasAplicadasPadrao | null;
  metaDefinidaValor?: number | null;
  isMetaDefinida?: boolean;
}

interface AcumuladorScoreSetor {
  setorId: number;
  nome: string;
  totalScore: number;
}

interface CalculationContext {
  competitionPeriod: CompetitionPeriodEntity;
  activeSectors: SectorEntity[];
  activeCriteria: CriterionEntity[];
  targetDate: string;
  isPlanejamento: boolean;
}

interface CalculationOptions {
  targetDate?: string;
  useFixedDate?: boolean;
}

// Constantes
const PONTUACAO_REGRAS = {
  INVERTIDA: { 1: 2.5, 2: 2.0, 3: 1.5, 4: 1.0, default: 2.5 },
  NORMAL: { 1: 1.0, 2: 1.5, 3: 2.0, 4: 2.5, default: 2.5 },
};

const CRITERIO_FALTA_FUNC_ID = 5;
const FALTA_FUNC_LIMITE = 10;

export class RankingService {
  private sectorRepo: Repository<SectorEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private parameterRepo: Repository<ParameterValueEntity>;
  private performanceRepo: Repository<PerformanceDataEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private planningCellDataService: PlanningCellDataService;
  private criterionSettingsService: CriterionCalculationSettingsService;
  private debugMode: boolean = false;

  constructor() {
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    this.performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.planningCellDataService = new PlanningCellDataService();
    this.criterionSettingsService = new CriterionCalculationSettingsService();
  }

  // ========== MÉTODOS PÚBLICOS ==========
  async getCurrentRanking(period?: string): Promise<EntradaRanking[]> {
    try {
      const { ranking } = await this.calculate(period);
      return ranking;
    } catch (error) {
      console.error('[RankingService] Erro em getCurrentRanking:', error);
      throw new Error('Falha ao calcular ranking.');
    }
  }

  async getDetailedResults(
    period?: string
  ): Promise<EntradaResultadoDetalhado[]> {
    try {
      const { details } = await this.calculate(period);
      return details;
    } catch (error) {
      console.error('[RankingService] Erro em getDetailedResults:', error);
      throw error;
    }
  }

  async getDetailedResultsByDate(
    period?: string,
    targetDate?: string
  ): Promise<EntradaResultadoDetalhado[]> {
    try {
      // Se não foi fornecida uma data específica, o sistema determinará dinamicamente
      const { details } = await this.calculate(period, {
        targetDate: targetDate || undefined,
      });
      return details;
    } catch (error) {
      console.error(
        '[RankingService] Erro em getDetailedResultsByDate:',
        error
      );
      throw error;
    }
  }

  async getDetailedResultsByDateRange(
    period: string,
    startDate: string,
    endDate: string
  ): Promise<EntradaResultadoDetalhado[]> {
    if (!period || !startDate || !endDate) {
      throw new Error('Período, data inicial e data final são obrigatórios');
    }

    try {
      const effectiveDate = await this.determineEffectiveDate(
        period,
        startDate,
        endDate
      );
      const { details } = await this.calculate(period, {
        targetDate: effectiveDate,
      });
      return details;
    } catch (error: any) {
      console.error('[RankingService] Erro ao calcular resultados:', error);

      // Tentar abordagem alternativa
      const alternativeDate = await this.findBestAlternativeDate(period);
      if (alternativeDate) {
        try {
          const { details } = await this.calculate(period, {
            targetDate: alternativeDate,
          });
          return details;
        } catch (secondError) {
          console.error(
            '[RankingService] Erro na segunda tentativa:',
            secondError
          );
        }
      }

      return [];
    }
  }

  // ========== MÉTODO PRINCIPAL DE CÁLCULO ==========
  private async calculate(
    period?: string,
    options: CalculationOptions = {}
  ): Promise<{
    ranking: EntradaRanking[];
    details: EntradaResultadoDetalhado[];
  }> {
    const context = await this.prepareCalculationContext(period, options);

    if (context.isPlanejamento) {
      const details = await this.calculatePlanejamento(context);
      return { ranking: [], details };
    }

    return await this.calculateAtivoOuFechado(context);
  }

  // ========== PREPARAÇÃO DO CONTEXTO ==========
  private async prepareCalculationContext(
    period?: string,
    options?: CalculationOptions
  ): Promise<CalculationContext> {
    const competitionPeriod = await this.getValidCompetitionPeriod(period);
    const activeSectors = await this.sectorRepo.find({
      where: { ativo: true },
      order: { nome: 'ASC' },
    });
    const activeCriteria = await this.criterionRepo.find({
      where: { ativo: true },
      order: { index: 'ASC', id: 'ASC' },
    });

    if (!activeSectors.length || !activeCriteria.length) {
      throw new Error('Nenhum setor ativo ou critério ativo encontrado');
    }

    // MUDANÇA PRINCIPAL: Determinar a data alvo dinamicamente
    let targetDate: string;

    if (options?.targetDate) {
      // Se uma data específica foi fornecida, usar ela
      targetDate = options.targetDate;
    } else {
      // Caso contrário, determinar dinamicamente baseado no período
      targetDate = await this.determineTargetDateForPeriod(competitionPeriod);
    }

    this.log(
      `Data alvo determinada: ${targetDate} para período ${competitionPeriod.mesAno}`
    );

    return {
      competitionPeriod,
      activeSectors,
      activeCriteria,
      targetDate,
      isPlanejamento: competitionPeriod.status === 'PLANEJAMENTO',
    };
  }

  // ========== NOVO MÉTODO PARA DETERMINAR DATA ALVO ==========
  private async determineTargetDateForPeriod(
    competitionPeriod: CompetitionPeriodEntity
  ): Promise<string> {
    // Se o período tem uma data fim definida, usar ela
    if (competitionPeriod.dataFim) {
      return competitionPeriod.dataFim;
    }

    // Extrair ano e mês do período
    const [year, month] = competitionPeriod.mesAno.split('-').map(Number);

    if (!year || !month) {
      throw new Error(
        `Formato inválido de mesAno: ${competitionPeriod.mesAno}`
      );
    }

    // Por padrão, usar o último dia do mês
    const lastDayOfMonth = new Date(year, month, 0);
    const targetDate = lastDayOfMonth.toISOString().split('T')[0];

    // Verificar se há dados para o último dia do mês
    const hasDataLastDay = await this.performanceRepo.count({
      where: {
        metricDate: targetDate,
        competitionPeriodId: competitionPeriod.id,
      },
    });

    if (hasDataLastDay > 0) {
      return targetDate!;
    }

    // Se não há dados no último dia, tentar o primeiro dia
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const firstDayStr = firstDayOfMonth.toISOString().split('T')[0];

    const hasDataFirstDay = await this.performanceRepo.count({
      where: {
        metricDate: firstDayStr,
        competitionPeriodId: competitionPeriod.id,
      },
    });

    if (hasDataFirstDay > 0) {
      return firstDayStr!;
    }

    // Se não há dados em nenhuma das datas padrão, buscar qualquer data com dados
    const anyData = await this.performanceRepo.findOne({
      where: { competitionPeriodId: competitionPeriod.id },
      order: { metricDate: 'DESC' },
    });

    if (anyData?.metricDate) {
      this.log(`Usando data alternativa com dados: ${anyData.metricDate}`);
      return anyData.metricDate;
    }

    // Se não há dados, retornar o último dia do mês como fallback
    this.log(
      `Nenhum dado encontrado, usando último dia do mês como fallback: ${targetDate}`
    );
    return targetDate!;
  }

  // ========== CÁLCULO PARA PLANEJAMENTO ==========
  private async calculatePlanejamento(
    context: CalculationContext
  ): Promise<EntradaResultadoDetalhado[]> {
    const results: EntradaResultadoDetalhado[] = [];

    for (const criterion of context.activeCriteria) {
      for (const sector of context.activeSectors) {
        const planningData =
          await this.planningCellDataService.getPrecalculatedDataForCell(
            criterion.id,
            sector.id,
            context.competitionPeriod
          );

        results.push(
          this.createDetailedResult({
            sector,
            criterion,
            periodo: context.competitionPeriod.mesAno,
            planningData,
          })
        );
      }
    }

    return results;
  }

  // ========== CÁLCULO PARA ATIVO/FECHADO ==========
  private async calculateAtivoOuFechado(context: CalculationContext): Promise<{
    ranking: EntradaRanking[];
    details: EntradaResultadoDetalhado[];
  }> {
    const performanceData = await this.getPerformanceData(context);
    const parameters = await this.getParameters(context);
    const sectorScores = this.initializeSectorScores(context.activeSectors);
    const allDetailedResults: EntradaResultadoDetalhado[] = [];

    for (const criterion of context.activeCriteria) {
      const criterionResults = await this.processCriterion(
        criterion,
        context,
        performanceData,
        parameters
      );

      // Atribuir ranks e pontos
      this.assignRanksAndPoints(criterionResults, criterion);

      // Acumular resultados
      for (const result of criterionResults) {
        if (result.pontos !== null && sectorScores[result.setorId]) {
          sectorScores[result.setorId]!.totalScore += result.pontos;
        }

        allDetailedResults.push(
          this.convertToDetailedResult(result, context.competitionPeriod.mesAno)
        );
      }
    }

    const ranking = this.calculateFinalRanking(
      sectorScores,
      context.activeSectors
    );
    return { ranking, details: allDetailedResults };
  }

  // ========== PROCESSAMENTO DE CRITÉRIO ==========
  private async processCriterion(
    criterion: CriterionEntity,
    context: CalculationContext,
    performanceData: PerformanceDataEntity[],
    parameters: ParameterValueEntity[]
  ): Promise<ResultadoPorCriterio[]> {
    const results: ResultadoPorCriterio[] = [];

    for (const sector of context.activeSectors) {
      const perf = performanceData.find(
        (p) => p.sectorId === sector.id && p.criterionId === criterion.id
      );

      const valorRealizado = this.calculateValorRealizado(perf, criterion);
      const targetParam = this.findTargetParameter(
        parameters,
        criterion.id,
        sector.id
      );
      const valorMeta =
        targetParam?.valor != null
          ? parseFloat(String(targetParam.valor))
          : null;

      const razaoCalculada = this.calculateRazao(
        valorRealizado,
        valorMeta,
        criterion.sentido_melhor || 'MENOR'
      );

      results.push({
        setorId: sector.id,
        setorNome: sector.nome,
        criterioId: criterion.id,
        criterioNome: criterion.nome,
        valorRealizado,
        valorMeta,
        razaoCalculada,
        pontos: null,
        periodo: context.competitionPeriod.mesAno,
      });
    }

    return this.sortResultsByCriterion(
      results,
      criterion.sentido_melhor || 'MENOR'
    );
  }

  // ========== CÁLCULOS AUXILIARES ==========
  private calculateValorRealizado(
    perf: PerformanceDataEntity | undefined,
    criterion: CriterionEntity
  ): number | null {
    if (perf?.valor == null) return null;

    const valor = parseFloat(String(perf.valor));
    const casasDecimais = criterion.casasDecimaisPadrao ?? 2;
    return Number(valor.toFixed(casasDecimais));
  }

  private calculateRazao(
    valorRealizado: number | null,
    valorMeta: number | null,
    sentidoMelhor: string
  ): number | null {
    if (valorRealizado === null) return null;

    if (valorRealizado === 0 && valorMeta === 0) return 1;

    if (valorMeta === null || valorMeta === 0) {
      if (valorRealizado === 0) return 1;
      return sentidoMelhor === 'MAIOR'
        ? Infinity
        : valorRealizado > 0
          ? Infinity
          : -Infinity;
    }

    return valorRealizado / valorMeta;
  }

  private assignRanksAndPoints(
    results: ResultadoPorCriterio[],
    criterion: CriterionEntity
  ): void {
    // Atribuir ranks
    let currentRank = 0;
    let lastRazaoValue: number | null | undefined = undefined;
    let tieCount = 0;

    results.forEach((result, index) => {
      if (
        result.razaoCalculada === null ||
        result.razaoCalculada === undefined ||
        !isFinite(result.razaoCalculada)
      ) {
        result.rank = undefined;
      } else {
        if (result.razaoCalculada !== lastRazaoValue) {
          currentRank = index + 1 - tieCount;
          tieCount = 0;
        } else {
          tieCount++;
        }
        result.rank = currentRank;
        lastRazaoValue = result.razaoCalculada;
      }
    });

    // Atribuir pontos
    const useInvertedScale = criterion.index === 0;
    results.forEach((result) => {
      result.pontos = this.calculatePontos(result, criterion, useInvertedScale);
    });
  }

  private calculatePontos(
    result: ResultadoPorCriterio,
    criterion: CriterionEntity,
    useInvertedScale: boolean
  ): number | null {
    // Regra especial para FALTA FUNC
    if (
      criterion.id === CRITERIO_FALTA_FUNC_ID &&
      result.valorRealizado !== null &&
      result.valorRealizado <= FALTA_FUNC_LIMITE
    ) {
      return 1.0;
    }

    // Verificar se todos têm mesma razão
    if (result.razaoCalculada === 1) {
      return 1.0; // Considerar contexto se necessário
    }

    if (result.rank === undefined) return 2.5;

    const regras = useInvertedScale
      ? PONTUACAO_REGRAS.INVERTIDA
      : PONTUACAO_REGRAS.NORMAL;
    return regras[result.rank as keyof typeof regras] || regras.default;
  }

  // ========== RANKING FINAL ==========
  private calculateFinalRanking(
    sectorScores: { [id: number]: AcumuladorScoreSetor },
    activeSectors: SectorEntity[]
  ): EntradaRanking[] {
    const scoresArray = Object.values(sectorScores);
    if (scoresArray.length === 0) return [];

    // Ordenar por pontuação (menor é melhor)
    const sorted = scoresArray.sort((a, b) => {
      if (a.totalScore === b.totalScore) {
        return a.setorId - b.setorId;
      }
      return a.totalScore - b.totalScore;
    });

    // Criar array inicial com ranks
    const rankingArray: EntradaRanking[] = sorted.map((score, index) => ({
      RANK: index + 1,
      SETOR: score.nome,
      PONTUACAO: parseFloat(score.totalScore.toFixed(2)),
    }));

    // Ajustar ranks para empates
    this.adjustRanksForTies(rankingArray);

    return rankingArray;
  }

  private adjustRanksForTies(rankingArray: EntradaRanking[]): void {
    if (rankingArray.length === 0) return;

    let currentRank = 1;
    rankingArray[0]!.RANK = currentRank;

    for (let i = 1; i < rankingArray.length; i++) {
      if (rankingArray[i]!.PONTUACAO === rankingArray[i - 1]!.PONTUACAO) {
        rankingArray[i]!.RANK = rankingArray[i - 1]!.RANK;
      } else {
        currentRank = i + 1;
        rankingArray[i]!.RANK = currentRank;
      }
    }
  }

  // ========== MÉTODOS AUXILIARES ==========
  private async getValidCompetitionPeriod(
    periodMesAno?: string
  ): Promise<CompetitionPeriodEntity> {
    if (periodMesAno) {
      const period = await this.periodRepo.findOne({
        where: { mesAno: periodMesAno },
      });
      if (!period) {
        throw new Error(
          `Vigência não encontrada para o período ${periodMesAno}`
        );
      }
      return period;
    }

    const period =
      (await this.periodRepo.findOne({ where: { status: 'ATIVA' } })) ||
      (await this.periodRepo.findOne({
        where: { status: 'PLANEJAMENTO' },
        order: { dataInicio: 'DESC' },
      })) ||
      (await this.periodRepo.findOne({ order: { dataInicio: 'DESC' } }));

    if (!period) {
      throw new Error('Nenhuma vigência encontrada no sistema');
    }

    return period;
  }

  private async getPerformanceData(
    context: CalculationContext
  ): Promise<PerformanceDataEntity[]> {
    // Buscar por metricDate E competitionPeriodId para maior precisão
    return await this.performanceRepo.find({
      where: {
        metricDate: context.targetDate,
        competitionPeriodId: context.competitionPeriod.id,
      },
    });
  }

  private async getParameters(
    context: CalculationContext
  ): Promise<ParameterValueEntity[]> {
    const whereClause: FindOptionsWhere<ParameterValueEntity>[] = [
      {
        dataInicioEfetivo: LessThanOrEqual(context.targetDate),
        dataFimEfetivo: IsNull(),
        competitionPeriodId: context.competitionPeriod.id,
      },
      {
        dataInicioEfetivo: LessThanOrEqual(context.targetDate),
        dataFimEfetivo: MoreThanOrEqual(context.targetDate),
        competitionPeriodId: context.competitionPeriod.id,
      },
    ];

    return await this.parameterRepo.find({
      where: whereClause,
      order: { dataInicioEfetivo: 'DESC', createdAt: 'DESC' },
    });
  }

  private findTargetParameter(
    parameters: ParameterValueEntity[],
    criterionId: number,
    sectorId: number
  ): ParameterValueEntity | undefined {
    // Buscar meta específica do setor
    let param = parameters.find(
      (p) =>
        p.criterionId === criterionId &&
        p.sectorId === sectorId &&
        p.nomeParametro.startsWith('META_')
    );

    // Se não encontrar, buscar meta genérica
    if (!param) {
      param = parameters.find(
        (p) =>
          p.criterionId === criterionId &&
          (p.sectorId === null || p.sectorId === undefined) &&
          p.nomeParametro.startsWith('META_')
      );
    }

    return param;
  }

  private initializeSectorScores(sectors: SectorEntity[]): {
    [id: number]: AcumuladorScoreSetor;
  } {
    const scores: { [id: number]: AcumuladorScoreSetor } = {};
    sectors.forEach((s) => {
      scores[s.id] = { setorId: s.id, nome: s.nome, totalScore: 0 };
    });
    return scores;
  }

  private sortResultsByCriterion(
    results: ResultadoPorCriterio[],
    sentidoMelhor: string
  ): ResultadoPorCriterio[] {
    return results.sort((a, b) => {
      if (sentidoMelhor === 'MENOR') {
        return (a.razaoCalculada ?? Infinity) - (b.razaoCalculada ?? Infinity);
      } else {
        return (
          (b.razaoCalculada ?? -Infinity) - (a.razaoCalculada ?? -Infinity)
        );
      }
    });
  }

  private createDetailedResult(data: {
    sector: SectorEntity;
    criterion: CriterionEntity;
    periodo: string;
    planningData: PlanningCellOutput;
  }): EntradaResultadoDetalhado {
    return {
      setorId: data.sector.id,
      setorNome: data.sector.nome,
      criterioId: data.criterion.id,
      criterioNome: data.criterion.nome,
      periodo: data.periodo,
      valorRealizado: null,
      valorMeta: null,
      percentualAtingimento: null,
      pontos: null,
      metaPropostaPadrao: data.planningData.metaPropostaPadrao,
      metaAnteriorValor: data.planningData.metaAnteriorValor,
      metaAnteriorPeriodo: data.planningData.metaAnteriorPeriodo,
      regrasAplicadasPadrao: data.planningData.regrasAplicadasPadrao,
      metaDefinidaValor: data.planningData.metaDefinidaValor,
      isMetaDefinida: data.planningData.isMetaDefinida,
    };
  }

  private convertToDetailedResult(
    result: ResultadoPorCriterio,
    periodo: string
  ): EntradaResultadoDetalhado {
    return {
      setorId: result.setorId,
      setorNome: result.setorNome,
      criterioId: result.criterioId,
      criterioNome: result.criterioNome,
      periodo,
      valorRealizado: result.valorRealizado,
      valorMeta: result.valorMeta,
      percentualAtingimento: result.razaoCalculada,
      pontos: result.pontos,
      metaPropostaPadrao: null,
      metaAnteriorValor: null,
      metaAnteriorPeriodo: null,
      regrasAplicadasPadrao: null,
      metaDefinidaValor: null,
      isMetaDefinida: false,
    };
  }

  private async determineEffectiveDate(
    period: string,
    startDate: string,
    endDate: string
  ): Promise<string> {
    const competitionPeriod = await this.periodRepo.findOne({
      where: { mesAno: period },
    });

    if (!competitionPeriod) {
      throw new Error(`Vigência não encontrada para o período ${period}`);
    }
    return await this.determineTargetDateForPeriod(competitionPeriod);
  }

  private async findBestAlternativeDate(
    period: string
  ): Promise<string | null> {
    const competitionPeriod = await this.periodRepo.findOne({
      where: { mesAno: period },
    });

    if (!competitionPeriod) return null;

    const allData = await this.performanceRepo.find({
      where: { competitionPeriodId: competitionPeriod.id },
    });

    if (allData.length === 0) return null;

    // Agrupar por data e encontrar a com mais dados
    const dataByDate = allData.reduce(
      (acc, curr) => {
        const date = curr.metricDate;
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    let bestDate = '';
    let maxCount = 0;

    for (const [date, count] of Object.entries(dataByDate)) {
      if (count > maxCount) {
        maxCount = count;
        bestDate = date;
      }
    }

    return bestDate || null;
  }

  // ========== MÉTODOS DE DEBUG ==========
  private log(message: string, data?: any): void {
    if (this.debugMode) {
      console.log(`[RankingService] ${message}`, data || '');
    }
  }
}
