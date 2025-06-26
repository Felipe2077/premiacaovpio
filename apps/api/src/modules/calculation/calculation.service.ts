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
   * Função utilitária para calcular percentual vs meta de forma segura
   * Evita valores infinitos e overflow no banco de dados
   */
  private calculateSafePercentVsTarget(
    realizedValue: number,
    targetValue: number,
    criterionName: string,
    sectorName: string
  ): number | null {
    // Limite máximo para evitar overflow no NUMERIC(10,4)
    const MAX_SAFE_PERCENTAGE = 999999.9999;

    // Caso especial: Meta zero e realizado zero = 100% (meta atingida)
    if (targetValue === 0 && realizedValue === 0) {
      console.log(
        `  -> Setor ${sectorName}, Critério ${criterionName}: Meta 0 e Realizado 0 = 100%`
      );
      return 100;
    }

    // Caso especial: Meta zero mas tem valor realizado
    if (targetValue === 0) {
      console.warn(
        `  -> Setor ${sectorName}, Critério ${criterionName}: Meta é 0 mas realizado é ${realizedValue}. Aplicando lógica especial.`
      );

      // Para meta zero, se há valor realizado, significa que ultrapassou
      // Vamos usar um percentual alto mas limitado para não causar overflow
      return realizedValue > 0 ? MAX_SAFE_PERCENTAGE : 0;
    }

    // Cálculo normal
    const percentage = (realizedValue / targetValue) * 100;

    // Verificar se o resultado é finito
    if (!Number.isFinite(percentage)) {
      console.error(
        `  -> Setor ${sectorName}, Critério ${criterionName}: Resultado não finito - ${realizedValue}/${targetValue} = ${percentage}`
      );
      return null;
    }

    // Limitar o valor para evitar overflow
    if (Math.abs(percentage) > MAX_SAFE_PERCENTAGE) {
      console.warn(
        `  -> Setor ${sectorName}, Critério ${criterionName}: Percentual muito alto (${percentage.toFixed(2)}%), limitando a ${MAX_SAFE_PERCENTAGE}%`
      );
      return percentage > 0 ? MAX_SAFE_PERCENTAGE : -MAX_SAFE_PERCENTAGE;
    }

    return Number(percentage.toFixed(4));
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

      // 3. Buscar todos os critérios ativos e setores ativos
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
          // --- CÁLCULO SEGURO DO PERCENTUAL ---
          else if (targetValueFromPerf !== null && realizedValue !== null) {
            percentVsTarget = this.calculateSafePercentVsTarget(
              realizedValue,
              targetValueFromPerf,
              criterion.nome,
              sector.nome
            );
          } else if (realizedValue !== null && targetValueFromPerf === null) {
            console.warn(
              `  -> Setor ${sector.nome}, Critério ${criterion.nome}: Realizado=${realizedValue}, Meta=NULA. % não calculado.`
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
          performancesForCriterion.forEach((p) => (p.scoreInCriterion = 2.5));
        }

        // Atribuir rank e pontos
        const pointsScale = [1.0, 1.5, 2.0, 2.5];
        let currentRank = 0;
        let lastPercent: number | null = null;
        let TiedCount = 1;

        performancesForCriterion.forEach((p, index) => {
          if (p.percentVsTarget !== null && p.percentVsTarget !== undefined) {
            // Só rankeia se tiver percentual
            if (p.percentVsTarget !== lastPercent) {
              currentRank = index + 1;
              TiedCount = 1;
            } else {
              TiedCount++;
            }
            p.rankInCriterion = currentRank;
            p.scoreInCriterion =
              pointsScale[currentRank - 1] ||
              pointsScale[pointsScale.length - 1];
            lastPercent = p.percentVsTarget!;
          } else {
            p.rankInCriterion = null!;
            p.scoreInCriterion = 2.5;
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
          sectorTotalScores[p.sectorId]!.totalScore += p.scoreInCriterion || 0;

          // *** VALIDAÇÃO FINAL ANTES DE ADICIONAR AO ARRAY ***
          const finalPercentVsTarget =
            p.percentVsTarget !== undefined ? p.percentVsTarget : null;

          // Última verificação de segurança
          if (
            finalPercentVsTarget !== null &&
            !Number.isFinite(finalPercentVsTarget)
          ) {
            console.error(
              `[CalculationService] ERRO CRÍTICO: percentVsTarget não finito detectado antes de salvar! Setor: ${p.sectorName}, Critério: ${p.criterionName}, Valor: ${finalPercentVsTarget}`
            );
            // Força para null para evitar erro no banco
            p.percentVsTarget = null;
          }

          allCriterionScores.push({
            competitionPeriodId: competitionPeriod.id,
            sectorId: p.sectorId,
            criterionId: p.criterionId,
            realizedValue: p.realizedValue,
            targetValue: p.targetValue,
            percentVsTarget: finalPercentVsTarget,
            rankInCriterion: p.rankInCriterion,
            scoreInCriterion: p.scoreInCriterion,
          });

          console.log(
            `  -> Setor ${p.sectorName}: Real.=${p.realizedValue}, Meta=${p.targetValue}, %=${finalPercentVsTarget}, Rank=${p.rankInCriterion}, Pts=${p.scoreInCriterion}`
          );
        });
      }

      // 5. Salvar Scores por Critério
      if (allCriterionScores.length > 0) {
        console.log(
          `[CalculationService] Salvando ${allCriterionScores.length} registros em criterion_scores...`
        );

        // Log de auditoria antes de salvar
        const problematicRecords = allCriterionScores.filter(
          (score) =>
            score.percentVsTarget !== null &&
            score.percentVsTarget !== undefined &&
            (!Number.isFinite(score.percentVsTarget) ||
              Math.abs(score.percentVsTarget) > 999999.9999)
        );

        if (problematicRecords.length > 0) {
          console.error(
            `[CalculationService] ATENÇÃO: ${problematicRecords.length} registros com percentVsTarget problemático detectados!`
          );
          problematicRecords.forEach((record, index) => {
            console.error(
              `  Problema ${index + 1}: Setor ${record.sectorId}, Critério ${record.criterionId}, %=${record.percentVsTarget}`
            );
          });
        }

        await this.criterionScoreRepo.save(allCriterionScores, { chunk: 200 });
        console.log(
          `[CalculationService] Registros salvos em criterion_scores.`
        );
      }

      // 6. Calcular e Salvar Ranking Final
      const finalRankingArray = Object.values(sectorTotalScores).sort(
        (a, b) => a.totalScore - b.totalScore
      );

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
        `\n[CalculationService] Cálculo do ranking para ${periodMesAno} concluído com sucesso.`
      );
    } catch (error: unknown) {
      let errorMessage = `[CalculationService] ERRO INESPERADO durante cálculo para ${periodMesAno}:`;
      if (error instanceof Error) {
        errorMessage = `[CalculationService] ERRO para ${periodMesAno} (${error.name}): ${error.message}`;
      }
      console.error(errorMessage, error);
      throw error; // Re-lança o erro para que o chamador possa tratá-lo
    }
  }
}
