// apps/api/src/modules/ranking/ranking.service.ts (VERSÃO REALMENTE COMPLETA E CORRIGIDA)
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

// Interface auxiliar interna - NOMES EM PORTUGUÊS
interface ResultadoPorCriterio {
  setorId: number;
  setorNome: string;
  criterioId: number;
  criterioNome: string;
  valorRealizado: number | null;
  valorMeta: number | null;
  razaoCalculada: number | null; // Pode ser null, finite, Infinity, -Infinity
  rank?: number;
  pontos: number | null;
}
interface AcumuladorScoreSetor {
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
    const activeSectors = await this.sectorRepo.findBy({ ativo: true });
    const activeCriteria = await this.criterionRepo.findBy({ ativo: true });
    if (!activeSectors.length || !activeCriteria.length) {
      return { ranking: [], details: [] };
    }
    console.log(
      `[RankingService] Setores: ${activeSectors.length}, Critérios: ${activeCriteria.length}`
    );

    // 2. Buscar Dados do Período
    const performanceData = await this.performanceRepo.find({
      where: { metricDate: targetDate },
    });
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
      `[RankingService] Desempenho: ${performanceData.length}, Parâmetros: ${currentParameters.length}`
    );

    // 3. Preparar Acumuladores
    const sectorScores: { [id: number]: AcumuladorScoreSetor } = {};
    activeSectors.forEach((s) => {
      sectorScores[s.id] = { nome: s.nome, totalScore: 0 };
    });
    const allDetailedResults: EntradaResultadoDetalhado[] = [];

    // 4. Calcular por Critério
    for (const criterion of activeCriteria) {
      console.log(
        `\n[RankingService] Processando Critério ID: ${criterion.id} (${criterion.nome})`
      );
      const resultsForCriterion: ResultadoPorCriterio[] = [];

      // 4.1 Coleta dados e calcula razão
      for (const sector of activeSectors) {
        const perf = performanceData.find(
          (p) => p.sectorId === sector.id && p.criterionId === criterion.id
        );
        const valorRealizado = perf ? perf.valor : null;
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
        const valorMeta = targetString ? parseFloat(targetString) : null;
        let razaoCalculada: number | null = null;
        if (valorRealizado !== null && valorMeta !== null && valorMeta !== 0) {
          razaoCalculada = valorRealizado / valorMeta;
        } else if (valorRealizado !== null && valorMeta === 0) {
          razaoCalculada =
            criterion.sentido_melhor === 'MAIOR' ? Infinity : -Infinity;
        } else {
          razaoCalculada = null;
        }

        resultsForCriterion.push({
          setorId: sector.id,
          setorNome: sector.nome,
          criterioId: criterion.id,
          criterioNome: criterion.nome,
          valorRealizado: valorRealizado,
          valorMeta: valorMeta,
          razaoCalculada: razaoCalculada,
          pontos: null,
        });
      }

      // 4.2 Rankear Setores (LÓGICA DE SORT COMPLETA)
      resultsForCriterion.sort((a, b) => {
        const valA = a.razaoCalculada;
        const valB = b.razaoCalculada;

        // Nulos vão para o fim (pior posição)
        if (valA === null && valB === null) return 0;
        if (valA === null) return 1; // Null é pior que qualquer número/infinito
        if (valB === null) return -1; // Qualquer número/infinito é melhor que null

        // Infinitos
        const isAInf = !isFinite(valA);
        const isBInf = !isFinite(valB);

        if (isAInf && isBInf) {
          // Ambos infinitos
          if (valA === valB) return 0; // +Inf vs +Inf OU -Inf vs -Inf
          // Se um é +Inf e outro -Inf
          // Se MAIOR é melhor: +Inf (-1) < -Inf (1)
          // Se MENOR é melhor: -Inf (-1) < +Inf (1)
          return criterion.sentido_melhor === 'MAIOR'
            ? valA === Infinity
              ? -1
              : 1
            : valA === -Infinity
              ? -1
              : 1;
        }
        if (isAInf) {
          // A é infinito, B é finito
          // Se MAIOR é melhor: +Inf (-1) é o melhor, -Inf (1) é o pior
          // Se MENOR é melhor: -Inf (-1) é o melhor, +Inf (1) é o pior
          return valA === Infinity
            ? criterion.sentido_melhor === 'MAIOR'
              ? -1
              : 1
            : criterion.sentido_melhor === 'MENOR'
              ? -1
              : 1;
        }
        if (isBInf) {
          // B é infinito, A é finito
          // Inverte a lógica acima
          return valB === Infinity
            ? criterion.sentido_melhor === 'MAIOR'
              ? 1
              : -1
            : criterion.sentido_melhor === 'MENOR'
              ? 1
              : -1;
        }

        // Ordenação normal para números finitos
        if (criterion.sentido_melhor === 'MAIOR') {
          return valB - valA; // Maior razão/valor vem primeiro (ordem decrescente)
        } else {
          // 'MENOR' (ou default) é melhor
          return valA - valB; // Menor razão/valor vem primeiro (ordem crescente)
        }
      });
      resultsForCriterion.forEach((result, index) => {
        result.rank = index + 1;
      });

      // 4.3 Atribuir Pontos e Acumular Score + Popular detailedResults
      const useInvertedScale = criterion.index === 10 || criterion.index === 11;
      resultsForCriterion.forEach((result) => {
        let pontos: number | null = null;
        // --- SWITCH COMPLETO ---
        switch (result.rank) {
          case 1:
            pontos = useInvertedScale ? 2.5 : 1.0;
            break;
          case 2:
            pontos = useInvertedScale ? 2.0 : 1.5;
            break;
          case 3:
            pontos = useInvertedScale ? 1.5 : 2.0;
            break;
          case 4:
            pontos = useInvertedScale ? 1.0 : 2.5;
            break;
          default:
            pontos = null;
        }
        // -----------------------
        result.pontos = pontos; // Atribui à estrutura interna

        const currentSectorScore = sectorScores[result.setorId];
        if (currentSectorScore && pontos !== null) {
          currentSectorScore.totalScore += pontos;
          // Popular allDetailedResults usando nomes corretos
          allDetailedResults.push({
            setorId: result.setorId,
            setorNome: result.setorNome,
            criterioId: result.criterioId,
            criterioNome: result.criterioNome,
            periodo: targetDate.substring(0, 7),
            valorRealizado: result.valorRealizado,
            valorMeta: result.valorMeta,
            percentualAtingimento: result.razaoCalculada, // Passa a razão, front formata
            pontos: result.pontos, // Passa os pontos calculados
          });
        } else if (!currentSectorScore) {
          console.error(/*...*/);
        }
      });
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
      .sort((a, b) => a.totalScore - b.totalScore)
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
