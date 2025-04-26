// apps/api/src/modules/ranking/ranking.service.ts (VERSÃO CORRIGIDA E COMPLETA)
import { AppDataSource } from '@/database/data-source';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { SectorEntity } from '@/entity/sector.entity';
import {
  EntradaRanking,
  EntradaResultadoDetalhado,
} from '@sistema-premiacao/shared-types';
import {
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';

// Interface auxiliar interna
interface CriterionResult {
  sectorId: number;
  sectorName: string;
  criterionId: number;
  criterionName: string;
  performanceValue: number | null;
  targetValue: number | null;
  diffRatio: number | null; // Razão para ranking (pode ser NaN, Infinity ou null)
  rank?: number;
  points: number | null; // Tipo corrigido
}
interface SectorScoreAccumulator {
  nome: string;
  totalScore: number;
}

export class RankingService {
  private sectorRepo = AppDataSource.getRepository(SectorEntity);
  private criterionRepo = AppDataSource.getRepository(CriterionEntity);
  private parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
  private performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);

  // --- MÉTODO PRIVADO: Lógica Central de Cálculo ---
  private async calculateAllResults(period?: string): Promise<{
    ranking: EntradaRanking[];
    details: EntradaResultadoDetalhado[];
  }> {
    console.log(
      `[RankingService] Iniciando cálculo base para o período: ${period || 'Último disponível'}`
    );
    const targetDate = '2025-04-30'; // MVP Fixo

    // 1. Buscar Dados Base
    console.log(`[RankingService] Buscando dados base...`);
    const activeSectors = await this.sectorRepo.findBy({ ativo: true });
    const activeCriteria = await this.criterionRepo.findBy({ ativo: true });

    if (!activeSectors.length || !activeCriteria.length) {
      console.warn('[RankingService] Helper: Sem setores ou critérios ativos.');
      return { ranking: [], details: [] };
    }
    console.log(
      `[RankingService] Setores: ${activeSectors.length}, Critérios: ${activeCriteria.length}`
    );

    // 2. Buscar Dados do Período
    console.log(
      `[RankingService] Buscando dados de desempenho para ${targetDate}...`
    );
    const performanceData = await this.performanceRepo.find({
      where: { metricDate: targetDate },
    });
    console.log(
      `[RankingService] Desempenho encontrado: ${performanceData.length}`
    );

    console.log(
      `[RankingService] Buscando parâmetros vigentes para ${targetDate}...`
    );
    const whereParams: FindOptionsWhere<ParameterValueEntity> = {
      dataInicioEfetivo: LessThanOrEqual(targetDate),
      dataFimEfetivo: IsNull(),
    };
    const whereParamsExpired: FindOptionsWhere<ParameterValueEntity> = {
      dataInicioEfetivo: LessThanOrEqual(targetDate),
      dataFimEfetivo: MoreThanOrEqual(targetDate),
    };
    const currentParameters = await this.parameterRepo.find({
      where: [whereParams, whereParamsExpired],
    });
    console.log(
      `[RankingService] Parâmetros encontrados: ${currentParameters.length}`
    );

    // 3. Preparar Acumuladores
    const sectorScores: { [id: number]: SectorScoreAccumulator } = {};
    activeSectors.forEach((s) => {
      sectorScores[s.id] = { nome: s.nome, totalScore: 0 };
    });
    const allDetailedResults: EntradaResultadoDetalhado[] = [];

    // 4. Calcular por Critério
    for (const criterion of activeCriteria) {
      console.log(
        `\n[RankingService] Processando Critério ID: ${criterion.id} (${criterion.nome})`
      );
      const resultsForCriterion: CriterionResult[] = [];

      // 4.1 Coleta dados e calcula razão inicial para cada setor
      for (const sector of activeSectors) {
        const perf = performanceData.find(
          (p) => p.sectorId === sector.id && p.criterionId === criterion.id
        );
        const rawValue = perf ? perf.valor : null;

        let targetParam = currentParameters.find(
          (p) =>
            p.criterionId === criterion.id &&
            p.sectorId === sector.id &&
            p.nomeParametro.startsWith('META_')
        );
        if (!targetParam) {
          targetParam = currentParameters.find(
            (p) =>
              p.criterionId === criterion.id &&
              !p.sectorId &&
              p.nomeParametro.startsWith('META_')
          );
        }
        const targetString = targetParam ? targetParam.valor : null;
        const targetValue = targetString ? parseFloat(targetString) : null;

        // Lógica de Cálculo da Razão (simplificada - ajustar conforme regra de negócio!)
        let diffRatio: number | null = null;
        if (rawValue !== null && targetValue !== null && targetValue !== 0) {
          // Exemplo simples: quanto menor a razão, melhor se sentido=MENOR
          // Quanto maior a razão, melhor se sentido=MAIOR
          diffRatio = rawValue / targetValue;
        } else if (rawValue !== null && targetValue === 0) {
          // Atingiu algo com meta zero. É infinitamente bom ou ruim? Depende do sentido.
          // Se MAIOR é melhor, é Infinito (bom). Se MENOR é melhor, é Infinito (ruim).
          diffRatio =
            criterion.sentido_melhor === 'MAIOR' ? Infinity : -Infinity; // Usar -Infinity para 'MENOR é melhor' com meta zero pode ajudar no sort
        } else if (rawValue === null && targetValue !== null) {
          // Não atingiu nada, mas tinha meta. Considerar como pior possível? Ou nulo?
          diffRatio = null; // Deixar nulo por enquanto
        } else {
          // rawValue é null e targetValue é null ou 0
          diffRatio = null;
        }

        resultsForCriterion.push({
          sectorId: sector.id,
          sectorName: sector.nome,
          criterionId: criterion.id,
          criterionName: criterion.nome,
          performanceValue: rawValue,
          targetValue: targetValue,
          diffRatio: diffRatio,
          points: null,
        });
      } // Fim loop setores

      // 4.2 Rankear Setores (com tratamento de nulos/infinitos)
      resultsForCriterion.sort((a, b) => {
        const valA = a.diffRatio;
        const valB = b.diffRatio;

        // Nulos vão para o fim (pior posição)
        if (valA === null && valB === null) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;

        // Infinitos (tratamento depende do sentido)
        if (!isFinite(valA) && !isFinite(valB)) return 0; // Empate Infinito/ -Infinito
        if (!isFinite(valA))
          return valA === Infinity
            ? criterion.sentido_melhor === 'MAIOR'
              ? -1
              : 1
            : criterion.sentido_melhor === 'MENOR'
              ? -1
              : 1; // A é Inf ou -Inf
        if (!isFinite(valB))
          return valB === Infinity
            ? criterion.sentido_melhor === 'MAIOR'
              ? 1
              : -1
            : criterion.sentido_melhor === 'MENOR'
              ? 1
              : -1; // B é Inf ou -Inf

        // Ordenação normal para números finitos
        if (criterion.sentido_melhor === 'MAIOR') {
          return valB - valA; // Maior razão/valor vem primeiro
        } else {
          // 'MENOR' (ou default) é melhor
          return valA - valB; // Menor razão/valor vem primeiro
        }
      });
      resultsForCriterion.forEach((result, index) => {
        result.rank = index + 1;
      });

      // 4.3 Atribuir Pontos e Acumular Score + Popular detailedResults
      const useInvertedScale = criterion.index === 10 || criterion.index === 11;
      resultsForCriterion.forEach((result) => {
        let points: number | null = null;
        // --- SWITCH COMPLETO ---
        switch (result.rank) {
          case 1:
            points = useInvertedScale ? 2.5 : 1.0;
            break;
          case 2:
            points = useInvertedScale ? 2.0 : 1.5;
            break;
          case 3:
            points = useInvertedScale ? 1.5 : 2.0;
            break;
          case 4:
            points = useInvertedScale ? 1.0 : 2.5;
            break;
          default:
            points = null; // Se não houver rank (ex: <= 4 setores, ou dados nulos)
        }
        // -----------------------
        result.points = points;

        // --- IF CORRIGIDO ENVOLVENDO AS DUAS OPERAÇÕES ---
        const currentSectorScore = sectorScores[result.sectorId];
        if (currentSectorScore && points !== null) {
          currentSectorScore.totalScore += points; // Acumula no score total
          // Guarda resultado detalhado
          allDetailedResults.push({
            setorId: result.sectorId, // Corrigido
            setorNome: result.sectorName,
            criterioId: result.criterionId,
            criterioNome: result.criterionName,
            periodo: targetDate.substring(0, 7), // Ex: '2025-04'
            valorRealizado: result.performanceValue,
            valorMeta: result.targetValue,
            percentualAtingimento: result.diffRatio, // Ainda é a razão, pode precisar de formatação/ajuste
            pontos: result.points, // points é number | null aqui
          });
        } else if (!currentSectorScore) {
          console.error(
            `ERRO DE LÓGICA: Setor com ID ${result.sectorId} não encontrado em sectorScores!`
          );
        }
        // --- FIM IF CORRIGIDO ---
      }); // Fim forEach result

      console.log(
        `[RankingService] Processamento finalizado para Critério: ${criterion.nome}`
      );
    } // ----- FIM CÁLCULO POR CRITÉRIO -----

    // 5. Calcular Ranking Final
    console.log('[RankingService] Calculando ranking final...');
    console.log(
      '[RankingService] Scores FINAIS antes de ranquear:',
      JSON.stringify(sectorScores)
    );

    const finalRankingArray = Object.values(sectorScores)
      .sort((a, b) => a.totalScore - b.totalScore) // MENOR score total é melhor
      .map((score, index) => ({
        RANK: index + 1,
        SETOR: score.nome,
        PONTUACAO: parseFloat(score.totalScore.toFixed(2)),
      }));

    console.log('[RankingService] Ranking final calculado:', finalRankingArray);
    return { ranking: finalRankingArray, details: allDetailedResults };
  } // Fim calculateAllResults

  // --- MÉTODOS PÚBLICOS ---
  async getCurrentRanking(period?: string): Promise<EntradaRanking[]> {
    console.log(
      `[RankingService] GET CURRENT RANKING para período: ${period || 'Default'}`
    );
    try {
      const { ranking } = await this.calculateAllResults(period);
      return ranking;
    } catch (error) {
      console.error('[RankingService] Erro em getCurrentRanking:', error);
      throw new Error('Falha ao calcular ranking.');
    }
  }

  async getDetailedResults(
    period?: string
  ): Promise<EntradaResultadoDetalhado[]> {
    console.log(
      `[RankingService] GET DETAILED RESULTS para período: ${period || 'Default'}`
    );
    try {
      const { details } = await this.calculateAllResults(period);
      return details;
    } catch (error) {
      console.error('[RankingService] Erro em getDetailedResults:', error);
      throw new Error('Falha ao buscar resultados detalhados.');
    }
  }
} // Fim Classe
