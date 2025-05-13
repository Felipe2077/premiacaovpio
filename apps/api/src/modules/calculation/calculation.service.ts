// apps/api/src/modules/calculation/calculation.service.ts (ESQUELETO INICIAL)
import { AppDataSource } from '@/database/data-source';
import { CriterionScoreEntity } from '@/entity/calculation/criterion-score.entity';
import { FinalRankingEntity } from '@/entity/calculation/final-ranking.entity';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { SectorEntity } from '@/entity/sector.entity';
import 'reflect-metadata';
import { DeepPartial, Repository } from 'typeorm';

// Interface para ajudar a estruturar os dados durante o cálculo
interface SectorPerformance {
  sectorId: number;
  sectorName: string;
  criterionId: number;
  criterionName: string;
  criterionSense: 'MAIOR' | 'MENOR' | null; // Sentido do critério
  realizedValue: number | null;
  targetValue: number | null;
  percentVsTarget?: number | null; // (Realizado / Meta) * 100 (ou lógica especial)
  rankInCriterion?: number;
  scoreInCriterion?: number;
}

export class CalculationService {
  private performanceDataRepo: Repository<PerformanceDataEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private sectorRepo: Repository<SectorEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private criterionScoreRepo: Repository<CriterionScoreEntity>;
  private finalRankingRepo: Repository<FinalRankingEntity>;
  // private parameterRepo: Repository<ParameterValueEntity>; // Se for buscar metas aqui

  constructor() {
    this.performanceDataRepo = AppDataSource.getRepository(
      PerformanceDataEntity
    );
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.criterionScoreRepo = AppDataSource.getRepository(CriterionScoreEntity);
    this.finalRankingRepo = AppDataSource.getRepository(FinalRankingEntity);
    // this.parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    console.log(
      '[CalculationService] Instanciado e repositórios configurados.'
    );
  }

  /**
   * Calcula o ranking e a pontuação para um determinado período e salva os resultados.
   * @param periodMesAno Mês/Ano no formato 'YYYY-MM'
   */
  async calculateAndSavePeriodRanking(periodMesAno: string): Promise<void> {
    console.log(
      `\n[CalculationService] Iniciando cálculo do ranking para o período: ${periodMesAno}`
    );

    try {
      const competitionPeriod = await this.periodRepo.findOneBy({
        mesAno: periodMesAno,
      });
      if (!competitionPeriod) {
        console.error(
          `[CalculationService] Período ${periodMesAno} não encontrado.`
        );
        throw new Error(`Período ${periodMesAno} não encontrado para cálculo.`);
      }
      // Futuramente, só calcular se o status for 'ATIVA' e estiver após dataFim, ou se for um recálculo
      // if (competitionPeriod.status !== 'ATIVA' && /* ... outras condições ... */ ) {
      //     console.warn(`[CalculationService] Período ${periodMesAno} não está em status 'ATIVA' ou apto para cálculo.`);
      //     return;
      // }
      console.log(
        `[CalculationService] Calculando para periodId: ${competitionPeriod.id} (${competitionPeriod.mesAno})`
      );

      // 1. Limpar resultados antigos para este período (se for recalcular)
      console.log(
        `[CalculationService] Limpando criterion_scores e final_rankings para o período ${periodMesAno}...`
      );
      await this.criterionScoreRepo.delete({
        competitionPeriodId: competitionPeriod.id,
      });
      await this.finalRankingRepo.delete({
        competitionPeriodId: competitionPeriod.id,
      });

      // 2. Buscar todos os dados de performance já processados pelo ETL para este período
      const performanceEntries = await this.performanceDataRepo.find({
        where: { competitionPeriodId: competitionPeriod.id },
        relations: ['setor', 'criterio'], // Carrega setor e critério para ter nomes e sentido_melhor
      });

      if (performanceEntries.length === 0) {
        console.warn(
          `[CalculationService] Nenhum dado de performance encontrado para o período ${periodMesAno}. Cálculo não pode prosseguir.`
        );
        return;
      }
      console.log(
        `[CalculationService] ${performanceEntries.length} registros de performance encontrados para o período.`
      );

      // 3. Buscar todos os critérios ativos e setores ativos (para iterar e garantir que todos são considerados)
      const activeCriteria = await this.criterionRepo.find({
        where: { ativo: true },
        order: { id: 'ASC' },
      });
      const activeSectors = await this.sectorRepo.find({
        where: { ativo: true },
        order: { id: 'ASC' },
      });

      const allCriterionScores: DeepPartial<CriterionScoreEntity>[] = [];
      const sectorTotalScores: {
        [sectorId: number]: { sectorName: string; totalScore: number };
      } = {};

      // 4. Calcular % vs Meta, Rankear e Pontuar para cada Critério
      for (const criterion of activeCriteria) {
        console.log(
          `\n[CalculationService] Processando critério: ${criterion.nome}`
        );
        const performancesForCriterion: SectorPerformance[] = [];
        const criterionNameUpper = criterion.nome.toUpperCase();

        for (const sector of activeSectors) {
          const perfEntry = performanceEntries.find(
            (p) => p.sectorId === sector.id && p.criterionId === criterion.id
          );

          const realizedValue = perfEntry?.valor ?? null;
          const targetValueFromPerf = perfEntry?.targetValue ?? null;
          let percentVsTarget: number | null | undefined = undefined;

          // --- LÓGICA ESPECIAL PARA FALTA FUNC (ANTES DE CALCULAR % PADRÃO) ---
          if (
            criterionNameUpper === 'FALTA FUNC' &&
            realizedValue !== null &&
            realizedValue <= 10
          ) {
            percentVsTarget = 0; // Força o melhor percentual possível (MENOR É MELHOR)
            console.log(
              `  -> Setor ${sector.nome} (FALTA FUNC): Realizado ${realizedValue} <= 10. % para ranking definido como 0.`
            );
          }
          // --- FIM LÓGICA ESPECIAL FALTA FUNC ---
          else if (targetValueFromPerf !== null && realizedValue !== null) {
            // Cálculo padrão do %
            if (targetValueFromPerf === 0) {
              // Regra Meta Zero
              percentVsTarget = realizedValue === 0 ? 0 : realizedValue * 100;
            } else {
              percentVsTarget = (realizedValue / targetValueFromPerf) * 100;
            }
            percentVsTarget = Number(percentVsTarget.toFixed(4));
          } else if (realizedValue !== null && targetValueFromPerf === null) {
            console.warn(
              `  -> Setor ${sector.nome}, Critério <span class="math-inline">\{criterion\.nome\}\: Realizado\=</span>{realizedValue}, Meta=NULA. % não calculado.`
            );
          }

          performancesForCriterion.push({
            sectorId: sector.id,
            sectorName: sector.nome,
            criterionId: criterion.id,
            criterionName: criterion.nome,
            criterionSense: criterion.sentido_melhor as
              | 'MAIOR'
              | 'MENOR'
              | null,
            realizedValue: realizedValue,
            targetValue: targetValueFromPerf,
            percentVsTarget: percentVsTarget,
            // Rank e Score serão preenchidos depois
          });
        }

        // --- Lógica de Ranking e Pontuação para o critério atual ---
        if (criterion.sentido_melhor === 'MENOR') {
          performancesForCriterion.sort(
            (a, b) =>
              (a.percentVsTarget ?? Infinity) - (b.percentVsTarget ?? Infinity)
          );
        } else if (criterion.sentido_melhor === 'MAIOR') {
          performancesForCriterion.sort(
            (a, b) =>
              (b.percentVsTarget ?? -Infinity) -
              (a.percentVsTarget ?? -Infinity)
          );
        } else {
          console.warn(
            `[CalculationService] Critério ${criterion.nome} sem 'sentido_melhor' definido. Não será rankeado.`
          );
          // Pula para o próximo critério ou atribui pontuação padrão?
          // Por agora, vamos pular o cálculo de pontos para este critério.
          performancesForCriterion.forEach((p) => (p.scoreInCriterion = 2.5)); // Ou uma pontuação neutra/padrão
        }

        // Atribuir rank e pontos (Lógica de desempate simples: mesma pontuação)
        const pointsScale = [1.0, 1.5, 2.0, 2.5];
        let currentRank = 0;
        let lastPercent: number | null = null;
        let TiedCount = 1;

        performancesForCriterion.forEach((p, index) => {
          if (p.percentVsTarget !== null) {
            // Só rankeia se tiver percentual
            if (p.percentVsTarget !== lastPercent) {
              currentRank = index + 1;
              TiedCount = 1;
            } else {
              TiedCount++; // Houve empate com o anterior
            }
            p.rankInCriterion = currentRank;
            // Se escala invertida fosse necessária, a lógica de pointsScale mudaria aqui
            p.scoreInCriterion =
              pointsScale[currentRank - 1] ||
              pointsScale[pointsScale.length - 1]; // Pega ponto ou último se rank > 4
            lastPercent = p.percentVsTarget!;
          } else {
            p.rankInCriterion = null!; // Não pode rankear sem percentual
            p.scoreInCriterion = 2.5; // Pontuação Padrão/Pior para quem não tem meta/valor? (A DEFINIR)
            console.warn(
              `  -> Setor ${p.sectorName}, Critério ${p.criterionName}: Sem % vs Meta, pontuação padrão aplicada.`
            );
          }

          // Acumular pontuação total do setor
          if (!sectorTotalScores[p.sectorId]) {
            sectorTotalScores[p.sectorId] = {
              sectorName: p.sectorName,
              totalScore: 0,
            };
          }
          sectorTotalScores[p.sectorId]!.totalScore += p.scoreInCriterion || 0; // Garante que soma número

          allCriterionScores.push({
            competitionPeriodId: competitionPeriod.id,
            sectorId: p.sectorId,
            criterionId: p.criterionId,
            realizedValue: p.realizedValue,
            targetValue: p.targetValue,
            percentVsTarget: p.percentVsTarget,
            rankInCriterion: p.rankInCriterion,
            scoreInCriterion: p.scoreInCriterion,
          });
          console.log(
            `  -> Setor ${p.sectorName}: Real.=${p.realizedValue}, Meta=${p.targetValue}, %=${p.percentVsTarget}, Rank=${p.rankInCriterion}, Pts=${p.scoreInCriterion}`
          );
        });
        // TODO: Implementar regra "Falta Func <= 10" (ajustaria o scoreInCriterion aqui)
        // TODO: Implementar regra "Escala Invertida" (ajustaria o pointsScale ou o scoreInCriterion)
      }

      // 5. Salvar Scores por Critério
      if (allCriterionScores.length > 0) {
        console.log(
          `[CalculationService] Salvando ${allCriterionScores.length} registros em criterion_scores...`
        );
        await this.criterionScoreRepo.save(allCriterionScores, { chunk: 200 });
        console.log(
          `[CalculationService] Registros salvos em criterion_scores.`
        );
      }

      // 6. Calcular e Salvar Ranking Final
      const finalRankingArray = Object.values(sectorTotalScores).sort(
        (a, b) => a.totalScore - b.totalScore
      ); // Menor pontuação total é melhor

      const finalRankingsToSave: DeepPartial<FinalRankingEntity>[] = [];
      let currentGeneralRank = 0;
      let lastGeneralScore: number | null = null;

      finalRankingArray.forEach((s, index) => {
        if (s.totalScore !== lastGeneralScore) {
          currentGeneralRank = index + 1;
        }
        lastGeneralScore = s.totalScore;
        const sectorEntity = activeSectors.find(
          (as) => as.nome === s.sectorName
        );
        if (sectorEntity) {
          finalRankingsToSave.push({
            competitionPeriodId: competitionPeriod.id,
            sectorId: sectorEntity.id,
            totalScore: Number(s.totalScore.toFixed(2)),
            rankPosition: currentGeneralRank,
          });
        }
      });

      if (finalRankingsToSave.length > 0) {
        console.log(
          `[CalculationService] Salvando ${finalRankingsToSave.length} registros em final_rankings...`
        );
        await this.finalRankingRepo.save(finalRankingsToSave);
        console.log(`[CalculationService] Registros salvos em final_rankings.`);
      }

      console.log(
        `\n[CalculationService] Cálculo do ranking para ${periodMesAno} concluído.`
      );
    } catch (error: unknown) {
      let errorMessage = `[CalculationService] ERRO INESPERADO durante cálculo para ${periodMesAno}:`;
      if (error instanceof Error) {
        errorMessage = `[CalculationService] ERRO para <span class="math-inline">\{periodMesAno\} \(</span>{error.name}): ${error.message}`;
      }
      console.error(errorMessage, error);
    }
  }
}
