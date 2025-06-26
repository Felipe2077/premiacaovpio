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

interface DateSearchResult {
  targetDate: string;
  dataCount: number;
  searchStrategy:
    | 'provided'
    | 'period_end'
    | 'last_day'
    | 'first_day'
    | 'most_recent'
    | 'fallback';
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
      const dateSearchResult = await this.findBestDateForPeriod(period);
      const { details } = await this.calculate(period, {
        targetDate: dateSearchResult.targetDate,
      });
      return details;
    } catch (error: any) {
      console.error('[RankingService] Erro ao calcular resultados:', error);
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

  // ========== PREPARAÇÃO DO CONTEXTO (CORRIGIDA) ==========
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

    // CORREÇÃO PRINCIPAL: Nova estratégia para determinar data alvo
    let dateSearchResult: DateSearchResult;

    if (options?.targetDate) {
      // Se uma data específica foi fornecida, validar e usar
      const dataCount = await this.countPerformanceDataForDate(
        competitionPeriod.id,
        options.targetDate
      );
      dateSearchResult = {
        targetDate: options.targetDate,
        dataCount,
        searchStrategy: 'provided',
      };
    } else {
      // Buscar a melhor data disponível para o período
      dateSearchResult = await this.findBestDateForPeriod(
        competitionPeriod.mesAno
      );
    }

    // ATIVAR DEBUG TEMPORARIAMENTE PARA INVESTIGAÇÃO
    console.log('=== DEBUG INVESTIGAÇÃO ===');
    console.log(`Período: ${competitionPeriod.mesAno}`);
    console.log(`Competition Period ID: ${competitionPeriod.id}`);
    console.log(`Data alvo selecionada: ${dateSearchResult.targetDate}`);
    console.log(`Estratégia: ${dateSearchResult.searchStrategy}`);
    console.log(`Dados encontrados: ${dateSearchResult.dataCount}`);

    // Verificar TODOS os dados de performance para este período
    const allPerformanceForPeriod = await this.performanceRepo.find({
      where: { competitionPeriodId: competitionPeriod.id },
      order: { metricDate: 'ASC', sectorId: 'ASC', criterionId: 'ASC' },
    });

    console.log(
      `Total de registros de performance para período ${competitionPeriod.mesAno}: ${allPerformanceForPeriod.length}`
    );

    // Agrupar por data
    const datasByDate = allPerformanceForPeriod.reduce(
      (acc, item) => {
        if (!acc[item.metricDate]) {
          acc[item.metricDate] = 0;
        }
        acc[item.metricDate]!++;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('Dados por data:', datasByDate);

    // Verificar especificamente GAMA + ATRASO para debug
    const gamaAtrasoData = allPerformanceForPeriod.filter(
      (p) => p.sectorId === 1 && p.criterionId === 1
    );

    console.log(
      `Dados GAMA + ATRASO encontrados:`,
      gamaAtrasoData.map((d) => ({
        metricDate: d.metricDate,
        valor: d.valor,
        sectorId: d.sectorId,
        criterionId: d.criterionId,
      }))
    );

    console.log('=== FIM DEBUG ===');

    this.log(
      `Data alvo selecionada: ${dateSearchResult.targetDate} ` +
        `(estratégia: ${dateSearchResult.searchStrategy}, ` +
        `dados encontrados: ${dateSearchResult.dataCount}) ` +
        `para período ${competitionPeriod.mesAno}`
    );

    return {
      competitionPeriod,
      activeSectors,
      activeCriteria,
      targetDate: dateSearchResult.targetDate,
      isPlanejamento: competitionPeriod.status === 'PLANEJAMENTO',
    };
  }

  // ========== NOVA ESTRATÉGIA DE BUSCA DE DATA (CORRIGIDA) ==========
  private async findBestDateForPeriod(
    periodMesAno: string
  ): Promise<DateSearchResult> {
    const competitionPeriod = await this.periodRepo.findOne({
      where: { mesAno: periodMesAno },
    });

    if (!competitionPeriod) {
      throw new Error(`Período de competição não encontrado: ${periodMesAno}`);
    }

    // 1. Se há dataFim definida no período, tentar usar ela primeiro
    if (competitionPeriod.dataFim) {
      const dataCount = await this.countPerformanceDataForDate(
        competitionPeriod.id,
        competitionPeriod.dataFim
      );

      if (dataCount > 0) {
        return {
          targetDate: competitionPeriod.dataFim,
          dataCount,
          searchStrategy: 'period_end',
        };
      }
    }

    // 2. Buscar qualquer data com dados no período (estratégia mais robusta)
    const anyPerformanceData = await this.performanceRepo.findOne({
      where: { competitionPeriodId: competitionPeriod.id },
      order: { metricDate: 'DESC', id: 'DESC' },
    });

    if (anyPerformanceData?.metricDate) {
      const dataCount = await this.countPerformanceDataForDate(
        competitionPeriod.id,
        anyPerformanceData.metricDate
      );

      return {
        targetDate: anyPerformanceData.metricDate,
        dataCount,
        searchStrategy: 'most_recent',
      };
    }

    // 3. Fallback: calcular último dia do mês
    const [year, month] = periodMesAno.split('-').map(Number);
    if (!year || !month) {
      throw new Error(`Formato inválido de mesAno: ${periodMesAno}`);
    }

    const lastDayOfMonth = new Date(year, month, 0);
    const lastDayStr = this.formatDateToString(lastDayOfMonth);

    // 4. Tentar último dia do mês
    let dataCount = await this.countPerformanceDataForDate(
      competitionPeriod.id,
      lastDayStr
    );

    if (dataCount > 0) {
      return {
        targetDate: lastDayStr,
        dataCount,
        searchStrategy: 'last_day',
      };
    }

    // 5. Tentar primeiro dia do mês
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const firstDayStr = this.formatDateToString(firstDayOfMonth);

    dataCount = await this.countPerformanceDataForDate(
      competitionPeriod.id,
      firstDayStr
    );

    if (dataCount > 0) {
      return {
        targetDate: firstDayStr,
        dataCount,
        searchStrategy: 'first_day',
      };
    }

    // 6. Fallback final: usar último dia do mês mesmo sem dados
    console.warn(
      `ATENÇÃO: Nenhum dado encontrado para período ${periodMesAno}. ` +
        `Usando último dia do mês como fallback: ${lastDayStr}`
    );

    return {
      targetDate: lastDayStr,
      dataCount: 0,
      searchStrategy: 'fallback',
    };
  }

  // ========== MÉTODOS AUXILIARES PARA DATA ==========
  private async countPerformanceDataForDate(
    competitionPeriodId: number,
    metricDate: string
  ): Promise<number> {
    return await this.performanceRepo.count({
      where: {
        competitionPeriodId,
        metricDate,
      },
    });
  }

  private formatDateToString(date: Date): string {
    const isoString = date.toISOString();
    const datePart = isoString.split('T')[0];

    if (!datePart) {
      throw new Error(`Falha ao extrair data de: ${isoString}`);
    }

    return datePart;
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

  // ========== CÁLCULO PARA ATIVO/FECHADO (CORRIGIDO) ==========
  private async calculateAtivoOuFechado(context: CalculationContext): Promise<{
    ranking: EntradaRanking[];
    details: EntradaResultadoDetalhado[];
  }> {
    const performanceData = await this.getPerformanceData(context);
    const parameters = await this.getParameters(context);

    this.log(
      `Dados de performance encontrados: ${performanceData.length} registros ` +
        `para data ${context.targetDate}`
    );

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

      // Log para debug
      this.log(
        `Processando ${sector.nome} - ${criterion.nome}: ` +
          `realizado=${valorRealizado}, meta=${valorMeta}, razao=${razaoCalculada}`
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

    // CASO ESPECIAL: Meta zero + Realizado zero = performance perfeita
    if (valorRealizado === 0 && valorMeta === 0) {
      return 1.0; // 100% da meta
    }

    // CASO NORMAL: Meta válida
    if (valorMeta !== null && valorMeta !== 0) {
      // PRECISÃO MELHORADA: usar mais casas decimais para detectar empates reais
      const razao = valorRealizado / valorMeta;
      return Number(razao.toFixed(6)); // 6 casas decimais para precisão
    }

    // CASO META ZERO + REALIZADO > 0: penalização alta
    if (valorMeta === 0 && valorRealizado > 0) {
      return 100.0; // Valor alto para ficar em último lugar
    }

    // CASO META NULL
    if (valorMeta === null) {
      return null;
    }

    return null;
  }

  private assignRanksAndPoints(
    results: ResultadoPorCriterio[],
    criterion: CriterionEntity
  ): void {
    console.log(
      `[RankingService] === ATRIBUINDO RANKS PARA ${criterion.nome} ===`
    );

    // ========== ATRIBUIR RANKS (EMPATES EXATOS APENAS) ==========
    let currentRank = 1;

    for (let i = 0; i < results.length; i++) {
      const current = results[i];

      if (
        current?.razaoCalculada === null ||
        current?.razaoCalculada === undefined
      ) {
        current!.rank = undefined;
        console.log(
          `[RankingService] ${current!.setorNome}: sem razão, sem rank`
        );
        continue;
      }

      // Contar quantos setores têm EXATAMENTE o mesmo valor
      let empatados = 1;
      for (let j = i + 1; j < results.length; j++) {
        if (results[j]?.razaoCalculada === current.razaoCalculada) {
          empatados++;
        } else {
          break; // Parar no primeiro valor diferente
        }
      }

      // Atribuir mesmo rank para todos os empatados
      for (let k = 0; k < empatados; k++) {
        results[i + k]!.rank = currentRank;
        console.log(
          `[RankingService] ${results[i + k]!.setorNome}: razão=${results[i + k]!.razaoCalculada}, rank=${currentRank}`
        );
      }

      // Avançar índice e rank
      i += empatados - 1; // -1 porque o loop já vai incrementar
      currentRank += empatados; // Próximo rank disponível
    }

    // ========== ATRIBUIR PONTOS ==========
    results.forEach((result) => {
      result.pontos = this.calculatePontos(result, criterion, false);
    });

    console.log(`[RankingService] === FIM RANKS PARA ${criterion.nome} ===`);
  }

  private calculatePontos(
    result: ResultadoPorCriterio,
    criterion: CriterionEntity,
    useInvertedScale: boolean
  ): number | null {
    // REGRA ESPECIAL: FALTA FUNC <= 10
    if (
      criterion.id === CRITERIO_FALTA_FUNC_ID &&
      result.valorRealizado !== null &&
      result.valorRealizado <= FALTA_FUNC_LIMITE
    ) {
      console.log(
        `[RankingService] ${result.setorNome}: FALTA FUNC <= 10, pontos = 1.0`
      );
      return 1.0;
    }

    // Casos sem rank válido
    if (result.rank === undefined || result.rank === null) {
      console.log(
        `[RankingService] ${result.setorNome}: sem rank, pontos = 2.5`
      );
      return 2.5;
    }

    // ========== REGRAS ESPECIAIS POR CRITÉRIO ==========

    // FURO POR VIAGEM: Meta zero - realizado 0 = 1.0, realizado > 0 empata em 1.5
    if (criterion.nome === 'FURO POR VIAGEM') {
      if (result.valorRealizado === 0 && result.valorMeta === 0) {
        console.log(
          `[RankingService] ${result.setorNome}: FURO POR VIAGEM 0/0 = 1.0 pontos`
        );
        return 1.0;
      } else if (
        result.valorRealizado !== null &&
        result.valorRealizado > 0 &&
        result.valorMeta === 0
      ) {
        console.log(
          `[RankingService] ${result.setorNome}: FURO POR VIAGEM ${result.valorRealizado}/0 = 1.5 pontos`
        );
        return 1.5;
      }
    }

    // MÉDIA KM/L: Empate em 1º = 1.5, depois escala normal 2.0, 2.5
    if (criterion.nome === 'MEDIA KM/L') {
      if (result.rank === 1) {
        console.log(
          `[RankingService] ${result.setorNome}: MÉDIA KM/L rank 1 = 1.5 pontos (regra especial)`
        );
        return 1.5;
      } else if (result.rank === 2) {
        console.log(
          `[RankingService] ${result.setorNome}: MÉDIA KM/L rank 2 = 1.5 pontos (regra especial)`
        );
        return 1.5;
      } else if (result.rank === 3) {
        console.log(
          `[RankingService] ${result.setorNome}: MÉDIA KM/L rank 3 = 2.0 pontos`
        );
        return 2.0;
      } else {
        console.log(
          `[RankingService] ${result.setorNome}: MÉDIA KM/L rank ${result.rank} = 2.5 pontos`
        );
        return 2.5;
      }
    }

    // ========== PONTUAÇÃO PADRÃO PARA OUTROS CRITÉRIOS ==========
    const pontuacao = {
      1: 1.0, // 1º lugar
      2: 1.5, // 2º lugar
      3: 2.0, // 3º lugar
      4: 2.5, // 4º lugar e demais
    };

    const pontos = pontuacao[result.rank as keyof typeof pontuacao] || 2.5;

    console.log(
      `[RankingService] ${result.setorNome}: ${criterion.nome} rank=${result.rank} → ${pontos} pontos (padrão)`
    );
    return pontos;
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

  // ========== MÉTODOS AUXILIARES (MANTIDOS) ==========
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
    const data = await this.performanceRepo.find({
      where: {
        metricDate: context.targetDate,
        competitionPeriodId: context.competitionPeriod.id,
      },
    });

    this.log(
      `Performance data query: metricDate=${context.targetDate}, ` +
        `competitionPeriodId=${context.competitionPeriod.id}, ` +
        `resultados=${data.length}`
    );

    return data;
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
    console.log(
      `[RankingService] Ordenando ${results.length} resultados para sentido: ${sentidoMelhor}`
    );

    // Log antes da ordenação
    results.forEach((r, i) => {
      console.log(
        `[RankingService] Antes ordenação [${i}]: ${r.setorNome} = ${r.razaoCalculada}`
      );
    });

    return results.sort((a, b) => {
      const valA = a.razaoCalculada;
      const valB = b.razaoCalculada;

      // Valores nulos vão para o final
      if (valA === null && valB === null) return 0;
      if (valA === null) return 1;
      if (valB === null) return -1;

      // Ordenação baseada no sentido
      if (sentidoMelhor === 'MENOR') {
        // MENOR é melhor: valores menores primeiro
        return valA - valB;
      } else {
        // MAIOR é melhor: valores maiores primeiro
        return valB - valA;
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

  // ========== MÉTODOS DE COMPATIBILIDADE (REMOVIDOS) ==========
  // Os métodos antigos de determineEffectiveDate e findBestAlternativeDate foram removidos
  // pois são substituídos pela nova estratégia findBestDateForPeriod

  // ========== MÉTODO DE DEBUG ==========
  private log(message: string, data?: any): void {
    if (this.debugMode || process.env.NODE_ENV === 'development') {
      console.log(`[RankingService] ${message}`, data || '');
    }
  }

  // ========== MÉTODO PARA ATIVAR DEBUG ==========
  public enableDebug(): void {
    this.debugMode = true;
  }

  public disableDebug(): void {
    this.debugMode = false;
  }
}
