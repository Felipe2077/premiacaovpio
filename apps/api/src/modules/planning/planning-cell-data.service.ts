// apps/api/src/modules/planning/planning-cell-data.service.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { calculateProposedMeta } from '@/utils/calculationUtils'; // <<< Certifique-se que este caminho está correto para sua cópia local dos utils
import { RegrasAplicadasPadrao } from '@sistema-premiacao/shared-types'; // Assumindo que este tipo está em shared-types
import { FindOptionsWhere, In, IsNull, Repository } from 'typeorm'; // <<< ADICIONADO FindOptionsWhere
import { CriterionCalculationSettingsService } from '../parameters/criterion-calculation-settings.service';

interface HistoricalPerformanceDataItem {
  periodo: string;
  valorRealizado: number | null;
  valorMeta: number | null;
}

// PlanningCellOutput deve corresponder ao que você quer adicionar em EntradaResultadoDetalhado
// Certifique-se que RegrasAplicadasPadrao está definido em shared-types
export interface PlanningCellOutput {
  metaPropostaPadrao: number | null;
  metaAnteriorValor: number | null;
  metaAnteriorPeriodo: string | null;
  regrasAplicadasPadrao: RegrasAplicadasPadrao | null;
}

export class PlanningCellDataService {
  private criterionRepo: Repository<CriterionEntity>;
  private performanceRepo: Repository<PerformanceDataEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private criterionSettingsService: CriterionCalculationSettingsService;

  constructor() {
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.criterionSettingsService = new CriterionCalculationSettingsService();
    console.log('[PlanningCellDataService] Instanciado.');
  }

  private getCalculationMethodLabel(methodKey?: string): string {
    if (!methodKey) return 'Não definido';
    const methods: Record<string, string> = {
      media3: 'Média dos 3 últimos períodos',
      media6: 'Média dos 6 últimos períodos',
      ultimo: 'Último período realizado',
      melhor3: 'Melhor dos 3 últimos períodos',
      manual: 'Definido Manualmente',
    };
    return methods[methodKey] || methodKey;
  }

  private generatePreviousPeriodStrings(
    currentPeriodMesAno: string,
    count: number
  ): string[] {
    const periods: string[] = [];
    const parts = currentPeriodMesAno.split('-');

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      // Validação mais robusta
      console.error(
        '[PlanningCellDataService] Formato de currentPeriodMesAno inválido para generatePreviousPeriodStrings:',
        currentPeriodMesAno
      );
      return periods;
    }

    let year = parseInt(parts[0]!, 10); // Usando '!' pois parts[0] é garantido como string aqui
    let month = parseInt(parts[1]!, 10); // Usando '!' pois parts[1] é garantido como string aqui

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      console.error(
        '[PlanningCellDataService] Ano ou mês inválido em currentPeriodMesAno após parseInt:',
        currentPeriodMesAno
      );
      return periods;
    }

    for (let i = 0; i < count; i++) {
      month--;
      if (month < 1) {
        month = 12;
        year--;
      }
      periods.push(`${year}-${String(month).padStart(2, '0')}`);
    }
    return periods;
  }

  public async getPrecalculatedDataForCell(
    criterionId: number,
    sectorId: number | null,
    planningCompetitionPeriod: CompetitionPeriodEntity
  ): Promise<PlanningCellOutput> {
    console.log(
      `[PlanningCellDataService] Gerando dados para CritérioID: ${criterionId}, SetorID: ${sectorId}, Período Planejamento: ${planningCompetitionPeriod.mesAno}`
    );

    try {
      const criterion = await this.criterionRepo.findOneBy({ id: criterionId });
      if (!criterion) {
        console.error(
          `[PlanningCellDataService] Critério com ID ${criterionId} não encontrado.`
        );
        return {
          metaPropostaPadrao: null,
          metaAnteriorValor: null,
          metaAnteriorPeriodo: null,
          regrasAplicadasPadrao: null,
        };
      }

      const defaultSettings =
        await this.criterionSettingsService.getSettingsForCriterion(
          criterionId
        );

      const effectiveCalculationMethod =
        defaultSettings?.calculationMethod || 'media3';
      const effectiveAdjustmentPercentage =
        defaultSettings?.adjustmentPercentage?.toString() || '0';
      const effectiveRoundingMethod = defaultSettings?.roundingMethod || 'none';
      const effectiveDecimalPlacesStr =
        defaultSettings?.roundingDecimalPlaces?.toString() ??
        criterion.casasDecimaisPadrao?.toString() ??
        '0';

      let historyCount = 6;
      if (
        effectiveCalculationMethod === 'media3' ||
        effectiveCalculationMethod === 'melhor3'
      )
        historyCount = 3;
      if (effectiveCalculationMethod === 'ultimo') historyCount = 1;

      const previousPeriodStrings = this.generatePreviousPeriodStrings(
        planningCompetitionPeriod.mesAno,
        historyCount
      );

      let historicalValues: HistoricalPerformanceDataItem[] = [];
      if (previousPeriodStrings.length > 0) {
        const historicalPeriods = await this.periodRepo.find({
          where: { mesAno: In(previousPeriodStrings) },
        });

        if (historicalPeriods.length > 0) {
          const historicalPeriodIds = historicalPeriods.map((p) => p.id);

          const whereClauseForPerformance: FindOptionsWhere<PerformanceDataEntity> =
            {
              // <<< Tipo explícito
              criterionId: criterionId,
              competitionPeriodId: In(historicalPeriodIds),
              sectorId: sectorId === null ? IsNull() : sectorId, // <<< Correção para sectorId
            };

          const performanceHistory = await this.performanceRepo.find({
            where: whereClauseForPerformance,
            relations: ['competitionPeriod'],
            order: { competitionPeriod: { mesAno: 'DESC' } },
          });

          historicalValues = previousPeriodStrings.map((periodStr) => {
            const foundPerformance = performanceHistory.find(
              (ph) => ph.competitionPeriod?.mesAno === periodStr
            );
            return {
              periodo: periodStr,
              valorRealizado: foundPerformance?.valor ?? null,
              valorMeta: foundPerformance?.targetValue ?? null,
            };
          });
        } else {
          historicalValues = previousPeriodStrings.map((periodStr) => ({
            periodo: periodStr,
            valorRealizado: null,
            valorMeta: null,
          }));
        }
      }
      console.log(
        `[PlanningCellDataService] Histórico formatado (${historicalValues.length} registros):`,
        historicalValues.slice(0, 3)
      );

      let metaAnteriorValor: number | null = null;
      let metaAnteriorPeriodo: string | null = null;

      if (
        historicalValues &&
        historicalValues.length > 0 &&
        historicalValues[0]
      ) {
        // <<< Checagem robusta
        metaAnteriorValor = historicalValues[0].valorMeta;
        metaAnteriorPeriodo = historicalValues[0].periodo;
      }

      const metaPropostaPadrao = calculateProposedMeta({
        historicalData: historicalValues,
        calculationMethod: effectiveCalculationMethod,
        adjustmentPercentage: effectiveAdjustmentPercentage,
        roundingMethod: effectiveRoundingMethod,
        decimalPlaces: effectiveDecimalPlacesStr,
        criterionBetterDirection: criterion.sentido_melhor as
          | 'MAIOR'
          | 'MENOR'
          | undefined,
      });

      const regrasAplicadasPadrao: RegrasAplicadasPadrao | null =
        defaultSettings
          ? {
              // Checa se defaultSettings existe
              calculationMethod: effectiveCalculationMethod,
              calculationMethodLabel: this.getCalculationMethodLabel(
                effectiveCalculationMethod
              ),
              adjustmentPercentage:
                parseFloat(effectiveAdjustmentPercentage) || 0,
              roundingMethod: effectiveRoundingMethod,
              roundingDecimalPlaces: parseInt(effectiveDecimalPlacesStr, 10),
            }
          : null; // Retorna null se não houver defaultSettings

      return {
        metaPropostaPadrao,
        metaAnteriorValor,
        metaAnteriorPeriodo,
        regrasAplicadasPadrao,
      };
    } catch (error) {
      console.error(
        `[PlanningCellDataService] Erro ao obter dados para célula (Critério ${criterionId}, Setor ${sectorId}):`,
        error
      );
      return {
        metaPropostaPadrao: null,
        metaAnteriorValor: null,
        metaAnteriorPeriodo: null,
        regrasAplicadasPadrao: null,
      };
    }
  }
}
