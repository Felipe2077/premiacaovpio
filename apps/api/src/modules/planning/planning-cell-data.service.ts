// apps/api/src/modules/planning/planning-cell-data.service.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity'; // Para buscar meta definida
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { RegrasAplicadasPadrao } from '@sistema-premiacao/shared-types';
import {
  FindOptionsWhere,
  In,
  IsNull,
  LessThanOrEqual,
  Repository,
} from 'typeorm';
import { calculateProposedMeta } from '../../utils/calculationUtils'; // <<< Ajuste se o nome/caminho do pacote for diferente
import { CriterionCalculationSettingsService } from '../parameters/criterion-calculation-settings.service';

interface HistoricalPerformanceDataItem {
  periodo: string;
  valorRealizado: number | null;
  valorMeta: number | null;
}

// Esta interface será o tipo de retorno do nosso serviço
export interface PlanningCellOutput {
  metaPropostaPadrao: number | null;
  metaAnteriorValor: number | null;
  metaAnteriorPeriodo: string | null;
  regrasAplicadasPadrao: RegrasAplicadasPadrao | null;
  // Novos campos para a meta já definida
  metaDefinidaValor: number | null;
  isMetaDefinida: boolean;
  idMetaDefinida?: number | null;
}

export class PlanningCellDataService {
  private criterionRepo: Repository<CriterionEntity>;
  private performanceRepo: Repository<PerformanceDataEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private parameterValueRepo: Repository<ParameterValueEntity>; // Repositório para ParameterValueEntity
  private criterionSettingsService: CriterionCalculationSettingsService;

  constructor() {
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.parameterValueRepo = AppDataSource.getRepository(ParameterValueEntity); // Inicializa o novo repo
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
      console.error(
        '[PlanningCellDataService] Formato de currentPeriodMesAno inválido:',
        currentPeriodMesAno
      );
      return periods;
    }
    let year = parseInt(parts[0]!, 10);
    let month = parseInt(parts[1]!, 10);
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
      `[PlanningCellDataService] Gerando dados para CritérioID: ${criterionId}, SetorID: ${sectorId}, Período: ${planningCompetitionPeriod.mesAno}`
    );

    let metaDefinidaValor: number | null = null;
    let isMetaDefinida: boolean = false;
    let idMetaDefinida: number | undefined = undefined;

    try {
      // 1. Buscar Detalhes do Critério
      const criterion = await this.criterionRepo.findOneBy({ id: criterionId });
      if (!criterion) {
        throw new Error(`Critério com ID ${criterionId} não encontrado.`);
      }

      // 2. Verificar se já existe uma Meta OFICIAL SALVA para este período de planejamento
      const whereClauseMetaDefinida: FindOptionsWhere<ParameterValueEntity> = {
        criterionId: criterionId,
        sectorId: sectorId === null ? IsNull() : sectorId,
        competitionPeriodId: planningCompetitionPeriod.id,
        // Considerar apenas metas ativas (sem data de fim ou com data de fim futura)
        // A data de início deve ser relevante para o período de planejamento
        dataInicioEfetivo: LessThanOrEqual(planningCompetitionPeriod.dataFim), // Começou antes ou durante o período
        dataFimEfetivo: IsNull(),
      };
      // Se houver múltiplas, pegar a mais recente (maior ID ou createdAt mais recente)
      const metaDefinidaExistente = await this.parameterValueRepo.findOne({
        where: whereClauseMetaDefinida,
        order: { createdAt: 'DESC' }, // Pega a mais recente se houver mais de uma ativa
      });

      if (metaDefinidaExistente && metaDefinidaExistente.valor !== null) {
        isMetaDefinida = true;
        metaDefinidaValor = parseFloat(metaDefinidaExistente.valor);
        idMetaDefinida = metaDefinidaExistente.id;
        console.log(
          `  [PlanningCellDataService] Meta já DEFINIDA encontrada: ID ${idMetaDefinida}, Valor ${metaDefinidaValor}`
        );
      } else {
        console.log(
          `  [PlanningCellDataService] Nenhuma meta oficial definida encontrada para esta célula.`
        );
      }

      // 3. Buscar Regras de Cálculo Padrão (para a metaPropostaPadrao)
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

      // 4. Buscar Dados Históricos (para metaPropostaPadrao e metaAnteriorValor)
      let historyCount = 6; // Padrão
      if (
        effectiveCalculationMethod === 'media3' ||
        effectiveCalculationMethod === 'melhor3'
      )
        historyCount = 3;
      if (effectiveCalculationMethod === 'ultimo') historyCount = 1;

      const previousPeriodStrings = this.generatePreviousPeriodStrings(
        planningCompetitionPeriod.mesAno,
        Math.max(historyCount, 1)
      ); // Garante pelo menos 1 para meta anterior

      let historicalValues: HistoricalPerformanceDataItem[] = [];
      if (previousPeriodStrings.length > 0) {
        const historicalPeriods = await this.periodRepo.find({
          where: { mesAno: In(previousPeriodStrings) },
        });

        if (historicalPeriods.length > 0) {
          const historicalPeriodIds = historicalPeriods.map((p) => p.id);
          const performanceWhereClause: FindOptionsWhere<PerformanceDataEntity> =
            {
              criterionId: criterionId,
              competitionPeriodId: In(historicalPeriodIds),
              sectorId: sectorId === null ? IsNull() : sectorId,
            };
          const performanceHistory = await this.performanceRepo.find({
            where: performanceWhereClause,
            relations: ['competitionPeriod'],
            order: { competitionPeriod: { mesAno: 'DESC' } },
          });
          historicalValues = previousPeriodStrings
            .map((periodStr) => {
              const foundPerformance = performanceHistory.find(
                (ph) => ph.competitionPeriod?.mesAno === periodStr
              );
              return {
                periodo: periodStr,
                valorRealizado: foundPerformance?.valor ?? null,
                valorMeta: foundPerformance?.targetValue ?? null,
              };
            })
            .sort((a, b) => b.periodo.localeCompare(a.periodo)); // Garante ordem decrescente por período
        } else {
          historicalValues = previousPeriodStrings
            .map((periodStr) => ({
              periodo: periodStr,
              valorRealizado: null,
              valorMeta: null,
            }))
            .sort((a, b) => b.periodo.localeCompare(a.periodo));
        }
      }
      console.log(
        `  [PlanningCellDataService] Histórico encontrado (${historicalValues.length}):`,
        historicalValues.slice(0, 3)
      );

      // 5. Extrair "Meta Anterior"
      let metaAnteriorValor: number | null = null;
      let metaAnteriorPeriodo: string | null = null;
      if (historicalValues.length > 0 && historicalValues[0]) {
        metaAnteriorValor = historicalValues[0].valorMeta;
        metaAnteriorPeriodo = historicalValues[0].periodo;
      }

      // 6. Calcular "Meta Proposta Padrão" (sugestão do sistema)
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
      console.log(
        `  [PlanningCellDataService] Meta Proposta Padrão calculada: ${metaPropostaPadrao}`
      );

      // 7. Montar Objeto de Regras Aplicadas
      const regrasAplicadasPadrao: RegrasAplicadasPadrao = {
        calculationMethod: effectiveCalculationMethod,
        calculationMethodLabel: this.getCalculationMethodLabel(
          effectiveCalculationMethod
        ),
        adjustmentPercentage: parseFloat(effectiveAdjustmentPercentage) || 0,
        roundingMethod: effectiveRoundingMethod as
          | 'up'
          | 'down'
          | 'nearest'
          | 'none',
        roundingDecimalPlaces: parseInt(effectiveDecimalPlacesStr, 10),
      };

      return {
        metaPropostaPadrao,
        metaAnteriorValor,
        metaAnteriorPeriodo,
        regrasAplicadasPadrao,
        metaDefinidaValor, // Valor da meta já salva para o período de planejamento
        isMetaDefinida, // Flag
        idMetaDefinida, // ID da meta salva
      };
    } catch (error) {
      console.error(
        `[PlanningCellDataService] Erro CATCH para Critério ${criterionId}, Setor ${sectorId}:`,
        error
      );
      return {
        metaPropostaPadrao: null,
        metaAnteriorValor: null,
        metaAnteriorPeriodo: null,
        regrasAplicadasPadrao: null,
        metaDefinidaValor: null,
        isMetaDefinida: false,
        idMetaDefinida: null,
      };
    }
  }
}
