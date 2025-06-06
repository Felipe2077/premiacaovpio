// apps/api/src/modules/history/history.service.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { In, Repository } from 'typeorm';

interface HistoryEntry {
  id: number;
  periodo: string;
  valorMeta: number | null;
  valorRealizado: number | null;
  percentualAtingimento: number | null;
  rank: number | null;
  pontos: number | null;
  status: 'ATIVA' | 'EXPIRADA' | 'FUTURA';
  criadoPor: string;
  justificativa: string;
  dataCriacao: string;
  dataInicioEfetivo: string;
  dataFimEfetivo: string | null;
  versao: number;
  metadata?: {
    calculationMethod?: string;
    adjustmentPercentage?: number;
    baseValue?: number;
  };
}

interface HistorySummary {
  avgAttainment: number;
  bestPeriod: { period: string; attainment: number; rank?: number };
  worstPeriod: { period: string; attainment: number; rank?: number };
  totalVersions: number;
  timeSpan: string;
  currentStreak?: { type: 'positive' | 'negative'; count: number };
}

interface HistoryData {
  summary: HistorySummary;
  timeline: HistoryEntry[];
  criterion: {
    id: number;
    nome: string;
    unidade_medida: string;
    sentido_melhor: string;
  };
  sector: {
    id: number;
    nome: string;
  };
}

export class HistoryService {
  private parameterRepo: Repository<ParameterValueEntity>;
  private performanceRepo: Repository<PerformanceDataEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private sectorRepo: Repository<SectorEntity>;

  constructor() {
    this.parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    this.performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
  }

  async getCriterionSectorHistory(
    criterionId: number,
    sectorId: number,
    limit: number = 24
  ): Promise<HistoryData> {
    // Validar critério e setor
    const criterion = await this.criterionRepo.findOneBy({ id: criterionId });
    if (!criterion) {
      throw new Error(`Critério com ID ${criterionId} não encontrado`);
    }

    const sector = await this.sectorRepo.findOneBy({ id: sectorId });
    if (!sector) {
      throw new Error(`Setor com ID ${sectorId} não encontrado`);
    }

    // Buscar parâmetros históricos para este critério/setor
    const parameters = await this.parameterRepo.find({
      where: {
        criterionId,
        sectorId,
      },
      relations: ['criadoPor', 'competitionPeriod'],
      order: {
        dataInicioEfetivo: 'DESC',
        createdAt: 'DESC',
      },
      take: limit,
    });

    if (parameters.length === 0) {
      return {
        summary: this.createEmptySummary(),
        timeline: [],
        criterion: {
          id: criterion.id,
          nome: criterion.nome,
          unidade_medida: criterion.unidade_medida || '',
          sentido_melhor: criterion.sentido_melhor || 'MENOR',
        },
        sector: {
          id: sector.id,
          nome: sector.nome,
        },
      };
    }

    // Buscar dados de performance para os períodos
    const periodIds = [
      ...new Set(parameters.map((p) => p.competitionPeriodId)),
    ];
    const performanceData = await this.getPerformanceDataForPeriods(
      criterionId,
      sectorId,
      periodIds
    );

    // Construir timeline
    const timeline = await this.buildTimeline(parameters, performanceData);

    // Calcular resumo
    const summary = this.calculateSummary(timeline);

    return {
      summary,
      timeline,
      criterion: {
        id: criterion.id,
        nome: criterion.nome,
        unidade_medida: criterion.unidade_medida || '',
        sentido_melhor: criterion.sentido_melhor || 'MENOR',
      },
      sector: {
        id: sector.id,
        nome: sector.nome,
      },
    };
  }

  private async getPerformanceDataForPeriods(
    criterionId: number,
    sectorId: number,
    periodIds: number[]
  ): Promise<Map<number, PerformanceDataEntity[]>> {
    if (periodIds.length === 0) {
      return new Map();
    }

    const data = await this.performanceRepo.find({
      where: {
        criterionId,
        sectorId,
        competitionPeriodId: In(periodIds),
      },
      order: { metricDate: 'DESC' },
    });

    // Agrupar por período
    const grouped = new Map<number, PerformanceDataEntity[]>();
    data.forEach((item) => {
      if (!grouped.has(item.competitionPeriodId)) {
        grouped.set(item.competitionPeriodId, []);
      }
      grouped.get(item.competitionPeriodId)!.push(item);
    });

    return grouped;
  }

  private async buildTimeline(
    parameters: ParameterValueEntity[],
    performanceData: Map<number, PerformanceDataEntity[]>
  ): Promise<HistoryEntry[]> {
    const timeline: HistoryEntry[] = [];
    const now = new Date();

    for (const param of parameters) {
      // Determinar status
      let status: 'ATIVA' | 'EXPIRADA' | 'FUTURA' = 'EXPIRADA';
      const startDate = new Date(param.dataInicioEfetivo);
      const endDate = param.dataFimEfetivo
        ? new Date(param.dataFimEfetivo)
        : null;

      if (startDate > now) {
        status = 'FUTURA';
      } else if (!endDate || endDate > now) {
        status = 'ATIVA';
      }

      // Buscar dados de performance para este período
      const perfData = performanceData.get(param.competitionPeriodId);

      // Calcular valor realizado (média dos valores do período)
      const valorRealizado = perfData?.length
        ? perfData.reduce(
            (sum, p) => sum + (parseFloat(String(p.valor)) || 0),
            0
          ) / perfData.length
        : null;

      // Calcular percentual de atingimento
      const valorMeta = param.valor ? parseFloat(String(param.valor)) : null;
      const percentualAtingimento =
        valorRealizado && valorMeta ? valorRealizado / valorMeta : null;

      // Simular rank e pontos (você pode implementar lógica real depois)
      const rank = this.simulateRank(percentualAtingimento);
      const pontos = this.calculatePointsFromRank(rank);

      // Determinar versão (simplificado)
      const versao = parameters.filter(
        (p) =>
          p.competitionPeriodId === param.competitionPeriodId &&
          p.createdAt <= param.createdAt
      ).length;

      timeline.push({
        id: param.id,
        periodo: param.competitionPeriod?.mesAno || 'N/A',
        valorMeta,
        valorRealizado: valorRealizado
          ? Math.round(valorRealizado * 100) / 100
          : null,
        percentualAtingimento,
        rank,
        pontos,
        status,
        criadoPor: param.criadoPor?.nome || 'Sistema',
        justificativa: param.justificativa || 'Sem justificativa',
        dataCriacao: param.createdAt.toISOString(),
        dataInicioEfetivo: param.dataInicioEfetivo,
        dataFimEfetivo: param.dataFimEfetivo,
        versao,
        metadata: param.metadata
          ? {
              calculationMethod: (param.metadata as any).calculationMethod,
              adjustmentPercentage: (param.metadata as any)
                .adjustmentPercentage,
              baseValue: (param.metadata as any).baseValue,
            }
          : undefined,
      });
    }

    return timeline.sort(
      (a, b) =>
        new Date(b.dataInicioEfetivo).getTime() -
        new Date(a.dataInicioEfetivo).getTime()
    );
  }

  private simulateRank(percentualAtingimento: number | null): number | null {
    if (percentualAtingimento === null) return null;

    // Simulação simples baseada no atingimento
    if (percentualAtingimento >= 1.1) return 1;
    if (percentualAtingimento >= 0.95) return 2;
    if (percentualAtingimento >= 0.8) return 3;
    return 4;
  }

  private calculatePointsFromRank(rank: number | null): number | null {
    if (rank === null) return null;

    const pointsMap: { [key: number]: number } = {
      1: 1.0,
      2: 1.5,
      3: 2.0,
      4: 2.5,
    };

    return pointsMap[rank] || 2.5;
  }

  private calculateSummary(timeline: HistoryEntry[]): HistorySummary {
    const validEntries = timeline.filter(
      (e) => e.percentualAtingimento !== null
    );

    if (validEntries.length === 0) {
      return this.createEmptySummary();
    }

    // Calcular média de atingimento
    const avgAttainment =
      validEntries.reduce(
        (sum, entry) => sum + (entry.percentualAtingimento || 0),
        0
      ) / validEntries.length;

    // Encontrar melhor e pior período
    const sortedByAttainment = [...validEntries].sort(
      (a, b) => (b.percentualAtingimento || 0) - (a.percentualAtingimento || 0)
    );

    const bestPeriod = {
      period: sortedByAttainment[0]!.periodo,
      attainment: sortedByAttainment[0]!.percentualAtingimento || 0,
      rank: sortedByAttainment[0]!.rank || undefined, // ✅ Converter null para undefined
    };

    const worstPeriod = {
      period: sortedByAttainment[sortedByAttainment.length - 1]!.periodo,
      attainment:
        sortedByAttainment[sortedByAttainment.length - 1]!
          .percentualAtingimento || 0,
      rank:
        sortedByAttainment[sortedByAttainment.length - 1]!.rank || undefined, // ✅ Converter null para undefined
    };

    // Calcular span de tempo
    const periods = timeline.map((e) => e.periodo).filter((p) => p !== 'N/A');
    const uniquePeriods = [...new Set(periods)].sort();
    const timeSpan =
      uniquePeriods.length > 1
        ? `${uniquePeriods[0]} - ${uniquePeriods[uniquePeriods.length - 1]} (${uniquePeriods.length} períodos)`
        : uniquePeriods[0] || 'N/A';

    // Calcular sequência atual
    const currentStreak = this.calculateCurrentStreak(validEntries);

    return {
      avgAttainment,
      bestPeriod,
      worstPeriod,
      totalVersions: timeline.length,
      timeSpan,
      currentStreak,
    };
  }

  private calculateCurrentStreak(
    entries: HistoryEntry[]
  ): { type: 'positive' | 'negative'; count: number } | undefined {
    if (entries.length < 2) return undefined;

    const recent = entries.slice(0, Math.min(6, entries.length));
    let streakType: 'positive' | 'negative' | null = null;
    let count = 0;

    for (let i = 0; i < recent.length - 1; i++) {
      const current = recent[i]!.percentualAtingimento || 0;
      const previous = recent[i + 1]!.percentualAtingimento || 0;

      if (current > previous) {
        if (streakType === 'positive' || streakType === null) {
          if (streakType === null) streakType = 'positive';
          count++;
        } else {
          break;
        }
      } else if (current < previous) {
        if (streakType === 'negative' || streakType === null) {
          if (streakType === null) streakType = 'negative';
          count++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    return count >= 2 && streakType ? { type: streakType, count } : undefined;
  }

  private createEmptySummary(): HistorySummary {
    return {
      avgAttainment: 0,
      bestPeriod: { period: 'N/A', attainment: 0 },
      worstPeriod: { period: 'N/A', attainment: 0 },
      totalVersions: 0,
      timeSpan: 'Nenhum dado disponível',
    };
  }
}
