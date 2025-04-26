// apps/api/src/modules/ranking/ranking.service.ts
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

// Interface auxiliar para os resultados por critério
interface CriterionResult {
  sectorId: number;
  sectorName: string;
  criterionId: number;
  criterionName: string;
  performanceValue: number | null;
  targetValue: number | null;
  diffRatio: number | null;
  rank?: number;
  points: number | null; // <--- CORREÇÃO TS2322: Alterado de points?: number para points: number | null
}

export class RankingService {
  private sectorRepo = AppDataSource.getRepository(SectorEntity);
  private criterionRepo = AppDataSource.getRepository(CriterionEntity);
  private parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
  private performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);

  async getCurrentRanking(period?: string): Promise<EntradaRanking[]> {
    console.log(
      `[RankingService] Calculando ranking para o período: ${period || 'Último disponível'}`
    );

    try {
      const targetDate = '2025-04-30'; // MVP Fixo

      console.log(`[RankingService] Buscando dados base...`);
      const activeSectors = await this.sectorRepo.findBy({ ativo: true });
      const activeCriteria = await this.criterionRepo.findBy({ ativo: true });
      // Log Detalhado Removido por Clareza - Adicionar se precisar depurar de novo
      // console.log('[RankingService] Setores ativos BUSCADOS:', JSON.stringify(activeSectors, null, 2));
      // console.log('[RankingService] Critérios ativos BUSCADOS:', JSON.stringify(activeCriteria, null, 2));

      if (!activeSectors.length || !activeCriteria.length) {
        console.warn('[RankingService] Sem setores ou critérios ativos.');
        return [];
      }
      console.log(
        `[RankingService] Setores: ${activeSectors.length}, Critérios: ${activeCriteria.length}`
      );

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

      const sectorScores: {
        [sectorId: number]: { nome: string; totalScore: number };
      } = {};
      activeSectors.forEach((s) => {
        sectorScores[s.id] = { nome: s.nome, totalScore: 0 };
      });
      // console.log('[RankingService] Scores iniciais:', JSON.stringify(sectorScores));

      const detailedResults: EntradaResultadoDetalhado[] = [];

      // ----- INÍCIO CÁLCULO POR CRITÉRIO -----
      for (const criterion of activeCriteria) {
        console.log(
          `\n[RankingService] Processando Critério ID: ${criterion.id} (${criterion.nome})`
        );
        const resultsForCriterion: CriterionResult[] = [];

        // 1. Coleta e Calcula Razão
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

          let diffRatio: number | null = null;
          if (rawValue !== null && targetValue !== null && targetValue !== 0) {
            diffRatio = rawValue / targetValue;
          } else if (rawValue !== null && targetValue === 0) {
            diffRatio = Infinity;
          } else {
            diffRatio = null;
          }

          // Não precisa mais logar aqui dentro, vamos logar o criterionResults completo depois
          // console.log(`  Setor ${sector.id}: Valor=${rawValue}, Meta=${targetValue}, Razão=${diffRatio?.toFixed(3)}`);
          resultsForCriterion.push({
            sectorId: sector.id,
            sectorName: sector.nome,
            criterionId: criterion.id,
            criterionName: criterion.nome,
            performanceValue: rawValue,
            targetValue: targetValue,
            diffRatio: diffRatio,
            points: null, // Inicializa points como null
          });
        }

        // 2. Rankear Setores
        resultsForCriterion.sort((a, b) => {
          if (a.diffRatio === null) return 1;
          if (b.diffRatio === null) return -1;
          if (a.diffRatio === Infinity)
            return criterion.sentido_melhor === 'MAIOR' ? -1 : 1; // Infinito é "melhor" se maior for melhor, "pior" se menor for melhor
          if (b.diffRatio === Infinity)
            return criterion.sentido_melhor === 'MAIOR' ? 1 : -1;
          if (criterion.sentido_melhor === 'MAIOR') {
            return b.diffRatio - a.diffRatio;
          } else {
            return a.diffRatio - b.diffRatio;
          }
        });
        resultsForCriterion.forEach((result, index) => {
          result.rank = index + 1;
        });

        // 3. Atribuir Pontos e Acumular Score + Popular detailedResults
        const useInvertedScale =
          criterion.index === 10 || criterion.index === 11;
        resultsForCriterion.forEach((result) => {
          let points: number | null = null;
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
              points = null;
          }
          result.points = points; // Atribui os pontos calculados (number | null)

          // --- CORREÇÃO TS2532: Garantir que o if envolva todas as operações ---
          const currentSectorScore = sectorScores[result.sectorId];
          if (currentSectorScore && points !== null) {
            // Verifica se o setor existe E se os pontos são válidos
            currentSectorScore.totalScore += points; // Acumula no score total
            console.log(
              `  Setor ${result.sectorId} (${result.sectorName}): Rank=${result.rank}, Pontos=${points} (Invertido=${useInvertedScale}) p/ Critério ${criterion.nome}`
            );

            // Guarda resultado detalhado DENTRO DO IF para garantir consistência
            detailedResults.push({
              // --- CORREÇÃO TS2561: Usar 'setorId' (minúsculo) ---
              setorId: result.sectorId,
              //----------------------------------------------------
              setorNome: result.sectorName,
              criterioId: result.criterionId,
              criterioNome: result.criterionName,
              periodo: targetDate.substring(0, 7),
              valorRealizado: result.performanceValue,
              valorMeta: result.targetValue,
              percentualAtingimento: result.diffRatio,
              pontos: result.points, // points aqui é number | null
            });
          } else if (!currentSectorScore) {
            console.error(
              `ERRO DE LÓGICA: Setor com ID ${result.sectorId} não encontrado em sectorScores!`
            );
          }
          // --- FIM DA CORREÇÃO TS2532 ---
        });
      } // ----- FIM CÁLCULO POR CRITÉRIO -----

      console.log(
        '[RankingService] Scores FINAIS antes de ranquear:',
        JSON.stringify(sectorScores)
      );

      // --- PASSO 3: Calcular Ranking Final ---
      const finalRankingArray = Object.values(sectorScores)
        .sort((a, b) => a.totalScore - b.totalScore)
        .map((score, index) => ({
          RANK: index + 1,
          SETOR: score.nome,
          PONTUACAO: parseFloat(score.totalScore.toFixed(2)),
        }));

      console.log(
        '[RankingService] Ranking final calculado:',
        finalRankingArray
      );
      return finalRankingArray;
    } catch (error) {
      console.error('[RankingService] Erro ao calcular ranking:', error);
      throw new Error('Falha ao calcular ranking.');
    }
  }

  // TODO: Criar método para retornar 'detailedResults' para o endpoint /api/results
  // async getDetailedResults(period?: string): Promise<EntradaResultadoDetalhado[]> {
  //    // Lógica similar, mas retorna detailedResults em vez de finalRankingArray
  //    // ... (pode reusar partes do cálculo acima) ...
  //    return detailedResults;
  // }
}
