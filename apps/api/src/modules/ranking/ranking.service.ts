// apps/api/src/modules/ranking/ranking.service.ts
import { AppDataSource } from '@/database/data-source'; // Usando alias ou caminho relativo
import { CriterionEntity } from '@/entity/criterion.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { EntradaRanking } from '@sistema-premiacao/shared-types';
import {
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
} from 'typeorm';

export class RankingService {
  // Repositórios do TypeORM para acessar as tabelas
  private sectorRepo = AppDataSource.getRepository(SectorEntity);
  private criterionRepo = AppDataSource.getRepository(CriterionEntity);
  private parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
  private performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
  // private auditLogRepo = AppDataSource.getRepository(AuditLogEntity); // Se precisar logar algo

  async getCurrentRanking(period?: string): Promise<EntradaRanking[]> {
    console.log(
      `[RankingService] Calculando ranking para o período: ${period || 'Último disponível'}`
    );

    // --- PASSO 1: Buscar Dados Essenciais do Banco ---
    try {
      // Definição do período (simplificado para MVP - ex: 'YYYY-MM-DD' do fim do mês)
      // No futuro, receberemos isso como parâmetro e trataremos melhor
      const targetDate = '2025-04-30'; // Fixo para nosso mock de Abril/2025

      console.log(
        `[RankingService] Buscando dados base (setores, critérios)...`
      );
      const activeSectors = await this.sectorRepo.findBy({ ativo: true });
      const activeCriteria = await this.criterionRepo.findBy({ ativo: true });

      if (!activeSectors.length || !activeCriteria.length) {
        console.warn(
          '[RankingService] Não foram encontrados setores ou critérios ativos.'
        );
        return [];
      }

      console.log(
        `[RankingService] Buscando dados de desempenho para ${targetDate}...`
      );
      const performanceData = await this.performanceRepo.find({
        where: {
          metricDate: targetDate, // Busca simples pela data exata do mock
          // Poderia buscar por mês: metricDate >= inicioMes AND metricDate <= fimMes
        },
      });
      console.log(
        `[RankingService] ${performanceData.length} registros de desempenho encontrados.`
      );

      console.log(
        `[RankingService] Buscando parâmetros vigentes para ${targetDate}...`
      );
      const whereParams: FindOptionsWhere<ParameterValueEntity> = {
        dataInicioEfetivo: LessThanOrEqual(targetDate), // Começou em ou antes de targetDate
        dataFimEfetivo: IsNull(), // Ainda está vigente (sem data de fim) OU
      };
      const whereParamsExpired: FindOptionsWhere<ParameterValueEntity> = {
        dataInicioEfetivo: LessThanOrEqual(targetDate),
        dataFimEfetivo: MoreThanOrEqual(targetDate), // Termina em ou depois de targetDate
      };
      // Busca parâmetros que estavam ativos na data alvo
      const currentParameters = await this.parameterRepo.find({
        where: [whereParams, whereParamsExpired],
      });
      console.log(
        `[RankingService] ${currentParameters.length} parâmetros vigentes encontrados.`
      );

      // --- PASSO 2: Processar e Calcular Pontuações (Lógica Principal) ---
      console.log(
        '[RankingService] Processando dados e calculando pontuações...'
      );

      const sectorScores: {
        [sectorId: number]: {
          nome: string;
          totalScore: number;
          results: any[];
        };
      } = {};

      // Inicializa score para todos os setores ativos
      for (const sector of activeSectors) {
        sectorScores[sector.id] = {
          nome: sector.nome,
          totalScore: 0,
          results: [],
        };
      }

      // Itera por cada critério para calcular pontos
      for (const criterion of activeCriteria) {
        console.log(
          `[RankingService] Calculando para Critério: ${criterion.nome}`
        );
        const criterionResults: {
          sectorId: number;
          performanceValue: number | null;
          targetValue: number | string | null;
          diffPercent?: number;
          rank?: number;
          points?: number;
        }[] = [];

        // Busca performance e meta para cada setor neste critério
        for (const sector of activeSectors) {
          const perf = performanceData.find(
            (p) => p.sectorId === sector.id && p.criterionId === criterion.id
          );
          const value = perf ? perf.valor : null;

          // Lógica para encontrar a meta correta (pode ser específica do setor/critério ou geral)
          let targetParam = currentParameters.find(
            (p) =>
              p.criterionId === criterion.id &&
              p.sectorId === sector.id &&
              p.nomeParametro.startsWith('META_') // Meta específica setor/critério
          );
          if (!targetParam) {
            targetParam = currentParameters.find(
              (p) =>
                p.criterionId === criterion.id &&
                !p.sectorId &&
                p.nomeParametro.startsWith('META_') // Meta geral do critério
            );
          }
          const target = targetParam ? targetParam.valor : null; // Valor da meta (ainda como string)

          criterionResults.push({
            sectorId: sector.id,
            performanceValue: value,
            targetValue: target,
          });
        }

        // **-- INÍCIO DA LÓGICA DE CÁLCULO (Simplificada/TODO) --**

        // TODO MVP.A.2.1: Calcular a "% de Diferença" ou Razão (Realizado vs Meta)
        // - Levar em conta o criterion.sentido_melhor ('MAIOR' ou 'MENOR')
        // - Converter targetValue (string) para number
        // - Lidar com meta zero ou valor realizado nulo
        // - Adicionar a propriedade 'diffPercent' ao criterionResults

        // TODO MVP.A.2.2: Rankear os Setores para ESTE CRITÉRIO
        // - Ordenar criterionResults com base na 'diffPercent' calculada, respeitando o 'sentido_melhor'.
        // - Atribuir rank (1 a N) a cada setor. Adicionar 'rank' ao criterionResults.

        // TODO MVP.A.2.3: Atribuir Pontos com base no Rank e Index
        // - Usar o 'rank' e o 'criterion.index' (lembrar da lógica invertida para 10/11)
        // - Definir a escala de pontos (1.0, 1.5, 2.0, 2.5) ou (2.5, 2.0, 1.5, 1.0)
        // - Adicionar 'points' ao criterionResults.
        // - Somar os pontos ao score total do setor: sectorScores[sector.id].totalScore += points;

        // **-- FIM DA LÓGICA DE CÁLCULO (Simplificada/TODO) --**

        // Por enquanto, vamos apenas logar os resultados intermediários por critério
        console.log(
          `[RankingService] Resultados intermediários para ${criterion.nome}:`,
          criterionResults
        );
        // E adicionar uma pontuação FAKE para teste:
        for (const result of criterionResults) {
          const fakePoints = Math.random() * 1.5 + 1; // Pontos aleatórios entre 1 e 2.5

          const currentSectorScore = sectorScores[result.sectorId];
          if (currentSectorScore) {
            // Se existe, atualiza score e resultados
            currentSectorScore.totalScore += fakePoints;
            currentSectorScore.results.push({
              criterio: criterion.nome,
              valor: result.performanceValue,
              meta: result.targetValue,
              pontos: parseFloat(fakePoints.toFixed(2)), // Arredonda os pontos fake
            });
          } else {
            // Isso não deveria acontecer com a lógica atual, mas é bom logar se ocorrer
            console.error(
              `ERRO DE LÓGICA: Setor com ID ${result.sectorId} encontrado em criterionResults mas não em sectorScores!`
            );
          }
        }
      } // Fim do loop de critérios

      // --- PASSO 3: Calcular Ranking Final ---
      console.log('[RankingService] Calculando ranking final...');

      const finalRankingArray = Object.values(sectorScores)
        .sort((a, b) => a.totalScore - b.totalScore) // Ordena pelo totalScore (MENOR é melhor!)
        .map((score, index) => ({
          // Mapeia para o formato de saída
          RANK: index + 1,
          SETOR: score.nome,
          PONTUACAO: parseFloat(score.totalScore.toFixed(2)), // Formata para 2 decimais
        }));

      console.log(
        '[RankingService] Ranking final calculado:',
        finalRankingArray
      );
      return finalRankingArray;
    } catch (error) {
      console.error('[RankingService] Erro ao calcular ranking:', error);
      // Logar erro em um sistema de log mais robusto em produção
      throw new Error('Falha ao calcular ranking.'); // Relança o erro para a camada da API tratar
    }
  }
}
