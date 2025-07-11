// apps/api/src/modules/parameters/parameter.service.ts - PARTE 1/4
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { RawMySqlOcorrenciaHorariaEntity } from '@/entity/raw-data/raw-mysql-ocorrencia-horaria.entity';
import { RawMySqlQuebraDefeitoEntity } from '@/entity/raw-data/raw-mysql-quebra-defeito.entity';
import { RawOracleAusenciaEntity } from '@/entity/raw-data/raw-oracle-ausencia.entity';
import { RawOracleColisaoEntity } from '@/entity/raw-data/raw-oracle-colisao.entity';
import { RawOracleEstoqueCustoEntity } from '@/entity/raw-data/raw-oracle-estoque-custo.entity';
import { RawOracleFleetPerformanceEntity } from '@/entity/raw-data/raw-oracle-fleet-performance.entity';
import { RawOracleIpkCalculadoEntity } from '@/entity/raw-data/raw-oracle-ipk-calculado.entity';
import { RawOracleKmOciosaComponentsEntity } from '@/entity/raw-data/raw-oracle-km-ociosa.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { UserEntity } from '@/entity/user.entity';
import {
  CalculateParameterDto,
  CreateParameterDto,
  CriterionCalculationSettingsDto,
  ParameterMetadata,
  UpdateParameterDto,
} from '@sistema-premiacao/shared-types';
import 'reflect-metadata';
import {
  Between,
  DeepPartial,
  FindOptionsWhere,
  In,
  IsNull,
  Repository,
} from 'typeorm';
import { AuditLogService } from '../audit/audit.service';
import { ExpurgoAutomationHook } from '../expurgos/expurgo-automation.hook';
import { CriterionCalculationSettingsService } from './criterion-calculation-settings.service';

interface RawDataTableMapping {
  entity: any; // TypeORM entity class
  valueColumn: string;
  dateColumn: string; // Nome da coluna de data/mês na tabela raw
  sectorColumn: string;
  dateGranularity: 'day' | 'month'; // Indica se a data é diária (YYYY-MM-DD) ou mensal (YYYY-MM)
  filterColumn?: string;
  filterValue?: string;
}

/**
 * Serviço responsável pela gestão de parâmetros/metas do sistema de premiação
 * Implementa operações CRUD, cálculo automático e versionamento de metas
 */
export class ParameterService {
  private readonly parameterRepo: Repository<ParameterValueEntity>;
  private readonly periodRepo: Repository<CompetitionPeriodEntity>;
  private readonly criterionRepo: Repository<CriterionEntity>;
  private readonly sectorRepo: Repository<SectorEntity>;
  private readonly performanceDataRepo: Repository<PerformanceDataEntity>;
  private readonly auditLogService: AuditLogService;
  private readonly criterionCalculationSettingsService: CriterionCalculationSettingsService;
  private automationHook: ExpurgoAutomationHook;
  private readonly rawDataTableMappings: { [key: string]: RawDataTableMapping };

  constructor() {
    this.parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
    this.performanceDataRepo = AppDataSource.getRepository(
      PerformanceDataEntity
    );
    this.auditLogService = new AuditLogService();
    this.automationHook = new ExpurgoAutomationHook();
    this.criterionCalculationSettingsService =
      new CriterionCalculationSettingsService();

    // Inicializa o mapeamento das tabelas raw
    this.rawDataTableMappings = {
      ATRASO: {
        entity: RawMySqlOcorrenciaHorariaEntity,
        valueColumn: 'totalCount',
        dateColumn: 'metricDate',
        sectorColumn: 'sectorName',
        dateGranularity: 'day',
        filterColumn: 'criterionName',
        filterValue: 'ATRASO',
      },

      'FURO POR VIAGEM': {
        entity: RawMySqlOcorrenciaHorariaEntity,
        valueColumn: 'totalCount',
        dateColumn: 'metricDate',
        sectorColumn: 'sectorName',
        dateGranularity: 'day',
        filterColumn: 'criterionName',
        filterValue: 'FURO POR VIAGEM',
      },
      QUEBRA: {
        entity: RawMySqlQuebraDefeitoEntity,
        valueColumn: 'totalCount',
        dateColumn: 'metricDate',
        sectorColumn: 'sectorName',
        dateGranularity: 'day',
        filterColumn: 'occurrenceType',
        filterValue: 'QUEBRA',
      },
      DEFEITO: {
        entity: RawMySqlQuebraDefeitoEntity,
        valueColumn: 'totalCount',
        dateColumn: 'metricDate',
        sectorColumn: 'sectorName',
        dateGranularity: 'day',
        filterColumn: 'occurrenceType',
        filterValue: 'DEFEITO',
      },
      'FALTA FUNC': {
        entity: RawOracleAusenciaEntity,
        valueColumn: 'employeeCount',
        dateColumn: 'metricDate',
        sectorColumn: 'sectorName',
        dateGranularity: 'day',
        filterColumn: 'occurrenceType',
        filterValue: 'FALTA FUNC',
      },
      'ATESTADO FUNC': {
        entity: RawOracleAusenciaEntity,
        valueColumn: 'employeeCount',
        dateColumn: 'metricDate',
        sectorColumn: 'sectorName',
        dateGranularity: 'day',
        filterColumn: 'occurrenceType',
        filterValue: 'ATESTADO FUNC',
      },
      COLISÃO: {
        entity: RawOracleColisaoEntity,
        valueColumn: 'totalCount',
        dateColumn: 'metricDate',
        sectorColumn: 'sectorName',
        dateGranularity: 'day',
      },
      'FALTA FROTA': {
        // Assumindo que FALTA FROTA está em RawMySqlOcorrenciaHorariaEntity
        // e que o criterionName é 'FALTA FROTA'
        entity: RawMySqlOcorrenciaHorariaEntity,
        valueColumn: 'totalCount',
        dateColumn: 'metricDate',
        sectorColumn: 'sectorName',
        dateGranularity: 'day',
        filterColumn: 'criterionName',
        filterValue: 'FALTA FROTA',
      },
      IPK: {
        entity: RawOracleIpkCalculadoEntity,
        valueColumn: 'ipkValue',
        dateColumn: 'metricMonth',
        sectorColumn: 'sectorName',
        dateGranularity: 'month',
      },
      'MEDIA KM/L': {
        entity: RawOracleFleetPerformanceEntity,
        valueColumn: 'avgKmL',
        dateColumn: 'metricMonth',
        sectorColumn: 'sectorName',
        dateGranularity: 'month',
      },
      'KM OCIOSA': {
        entity: RawOracleKmOciosaComponentsEntity,
        valueColumn: 'kmOperacional',
        dateColumn: 'metricMonth',
        sectorColumn: 'sectorName',
        dateGranularity: 'month',
      },
      PEÇAS: {
        entity: RawOracleEstoqueCustoEntity,
        valueColumn: 'totalValue',
        dateColumn: 'metricDate',
        sectorColumn: 'sectorName',
        dateGranularity: 'day',
        filterColumn: 'criterionName',
        filterValue: 'PEÇAS',
      },
      PNEUS: {
        entity: RawOracleEstoqueCustoEntity,
        valueColumn: 'totalValue',
        dateColumn: 'metricDate',
        sectorColumn: 'sectorName',
        dateGranularity: 'day',
        filterColumn: 'criterionName',
        filterValue: 'PNEUS',
      },
      COMBUSTIVEL: {
        entity: RawOracleFleetPerformanceEntity,
        valueColumn: 'totalFuelLiters',
        dateColumn: 'metricMonth',
        sectorColumn: 'sectorName',
        dateGranularity: 'month',
      },
      'FURO POR ATRASO': {
        entity: RawMySqlOcorrenciaHorariaEntity,
        valueColumn: 'totalCount',
        dateColumn: 'metricDate',
        sectorColumn: 'sectorName',
        dateGranularity: 'day',
        filterColumn: 'criterionName',
        filterValue: 'FURO POR ATRASO',
      },
    };

    console.log('[ParameterService] Instanciado e repositórios configurados.');
  }

  // =====================================
  // MÉTODOS UTILITÁRIOS PRIVADOS
  // =====================================

  /**
   * Formata uma data para o padrão ISO (YYYY-MM-DD)
   */
  private formatDate(dateInput: Date | string | undefined | null): string {
    if (dateInput === null || dateInput === undefined) {
      throw new Error('Data inválida ou não fornecida para formatação.');
    }

    try {
      const dateObject = new Date(dateInput);
      if (isNaN(dateObject.getTime())) {
        throw new Error(`Valor de data inválido fornecido: ${dateInput}`);
      }
      return dateObject.toISOString().split('T')[0]!;
    } catch (e: unknown) {
      const errorMessage = `Erro ao formatar data: ${dateInput}${e instanceof Error ? ` - ${e.message}` : ''}`;
      console.error(errorMessage, e);
      throw new Error('Formato de data inválido para formatDate.');
    }
  }

  /**
   * Gera lista de períodos anteriores para análise histórica
   */
  private generatePreviousPeriodStrings(
    currentPeriodMesAno: string,
    count: number
  ): string[] {
    const periods: string[] = [];
    const parts = currentPeriodMesAno.split('-');

    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      console.error(
        '[ParameterService] Formato de período inválido:',
        currentPeriodMesAno
      );
      return periods;
    }

    let year = parseInt(parts[0]!, 10);
    let month = parseInt(parts[1]!, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      console.error(
        '[ParameterService] Ano ou mês inválido:',
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

  /**
   * Normaliza sectorId para queries (trata undefined/null consistentemente)
   */
  private normalizeSectorId(
    sectorId: number | undefined | null
  ): number | null {
    return sectorId === undefined || sectorId === null ? null : sectorId;
  }

  /**
   * Cria condição WHERE para busca de parâmetros por setor
   */
  private createSectorWhereCondition(
    sectorId: number | undefined | null
  ): FindOptionsWhere<ParameterValueEntity>['sectorId'] {
    return sectorId === undefined || sectorId === null ? IsNull() : sectorId;
  }

  /**
   * Cria condição WHERE type-safe para PerformanceDataEntity
   */
  private createPerformanceDataWhereCondition(
    criterionId: number,
    sectorId: number | null | undefined,
    competitionPeriodId: number
  ): FindOptionsWhere<PerformanceDataEntity> {
    return {
      criterionId,
      competitionPeriodId,
      sectorId:
        sectorId === null || sectorId === undefined ? IsNull() : sectorId,
    };
  }

  /**
   * Gera nome padronizado para parâmetro
   */
  private generateParameterName(
    criterion: CriterionEntity,
    sector: SectorEntity | null,
    competitionPeriod: CompetitionPeriodEntity,
    sectorId?: number | null
  ): string {
    const criterionPart = criterion.nome.toUpperCase().replace(/\s+/g, '_');
    const sectorPart = sectorId
      ? `_SETOR${sectorId}`
      : sector
        ? `_${sector.nome.toUpperCase().replace(/\s+/g, '_')}`
        : '_GERAL';
    const periodPart = competitionPeriod.mesAno.replace('-', '');

    return `META_${criterionPart}${sectorPart}_${periodPart}`;
  }

  // =====================================
  // MÉTODOS DE CÁLCULO HISTÓRICO
  // =====================================

  /**
   * Busca dados históricos de performance para cálculo de metas
   */
  private async getHistoricalPerformanceData(
    criterionId: number,
    sectorId: number | undefined | null,
    currentPeriod: CompetitionPeriodEntity,
    count: number = 12
  ): Promise<PerformanceDataEntity[]> {
    console.log(
      `[ParameterService] Buscando dados históricos - Critério: ${criterionId}, Setor: ${sectorId}, Período atual: ${currentPeriod.mesAno}`
    );

    const previousPeriodStrings = this.generatePreviousPeriodStrings(
      currentPeriod.mesAno,
      count
    );
    if (previousPeriodStrings.length === 0) {
      console.warn(
        '[ParameterService] Nenhum período anterior gerado para análise histórica'
      );
      return [];
    }

    const historicalPeriods = await this.periodRepo.find({
      where: { mesAno: In(previousPeriodStrings) },
    });

    if (historicalPeriods.length === 0) {
      console.warn(
        '[ParameterService] Nenhum período histórico encontrado no banco'
      );
      return [];
    }

    const historicalPeriodIds = historicalPeriods.map((p) => p.id);
    const whereClause: FindOptionsWhere<PerformanceDataEntity> = {
      criterionId,
      competitionPeriodId: In(historicalPeriodIds),
      sectorId: this.createSectorWhereCondition(sectorId),
    };

    const historicalData = await this.performanceDataRepo.find({
      where: whereClause,
      relations: ['competitionPeriod'],
      order: { competitionPeriod: { mesAno: 'DESC' } },
    });

    console.log(
      `[ParameterService] ${historicalData.length} registros históricos encontrados`
    );
    return historicalData;
  }

  /**
   * Calcula média dos últimos N períodos
   */
  private calculateAverage(
    data: PerformanceDataEntity[],
    months: number
  ): number {
    const validData = data
      .filter((item) => item.valor !== null && !isNaN(Number(item.valor)))
      .slice(0, months);

    if (validData.length === 0) {
      throw new Error(
        `Não há dados históricos válidos para calcular a média de ${months} meses.`
      );
    }

    if (validData.length < months) {
      console.warn(
        `[ParameterService] Solicitada média de ${months} meses, mas apenas ${validData.length} períodos disponíveis`
      );
    }

    const sum = validData.reduce((acc, item) => acc + Number(item.valor), 0);
    return sum / validData.length;
  }

  /**
   * Obtém o valor do período mais recente
   */
  private getLastValue(data: PerformanceDataEntity[]): number {
    if (!data || data.length === 0) {
      throw new Error('Não há dados históricos para obter o último valor.');
    }

    const lastItem = data[0]; // Primeiro item devido à ordenação DESC
    if (!lastItem || lastItem.valor === null || lastItem.valor === undefined) {
      throw new Error('O último valor realizado não é válido.');
    }

    const numericValue = Number(lastItem.valor);
    if (isNaN(numericValue)) {
      throw new Error(`Último valor não é numérico: ${lastItem.valor}`);
    }

    return numericValue;
  }

  /**
   * Obtém o melhor valor dos últimos N períodos baseado na direção do critério
   */
  private getBestValue(
    data: PerformanceDataEntity[],
    months: number,
    direction?: 'MAIOR' | 'MENOR'
  ): number {
    if (!data || data.length === 0) {
      throw new Error(
        'Não há dados históricos para determinar o melhor valor.'
      );
    }

    const validData = data
      .filter((item) => item.valor !== null && !isNaN(Number(item.valor)))
      .slice(0, months);

    if (validData.length === 0) {
      throw new Error('Não há valores válidos para determinar o melhor valor.');
    }

    if (validData.length < months) {
      console.warn(
        `[ParameterService] Solicitados ${months} meses para melhor valor, apenas ${validData.length} disponíveis`
      );
    }

    const values = validData.map((item) => Number(item.valor));

    switch (direction) {
      case 'MAIOR':
        return Math.max(...values);
      case 'MENOR':
        return Math.min(...values);
      default:
        throw new Error(
          "Direção 'sentido_melhor' não definida ou inválida para getBestValue."
        );
    }
  }

  /**
   * Calcula valor base conforme método especificado
   */
  private calculateBaseValue(
    data: PerformanceDataEntity[],
    method: string,
    criterion: CriterionEntity,
    fallbackValue?: number
  ): number {
    try {
      switch (method) {
        case 'media3':
          return this.calculateAverage(data, 3);
        case 'media6':
          return this.calculateAverage(data, 6);
        case 'ultimo':
          return this.getLastValue(data);
        case 'melhor3':
          return this.getBestValue(
            data,
            3,
            criterion.sentido_melhor as 'MAIOR' | 'MENOR'
          );
        case 'manual':
          return fallbackValue ?? 0;
        default:
          console.warn(
            `[ParameterService] Método '${method}' não implementado`
          );
          return fallbackValue ?? 0;
      }
    } catch (error: any) {
      console.warn(
        `[ParameterService] Erro no cálculo '${method}': ${error.message}`
      );
      return fallbackValue ?? 0;
    }
  }

  // =====================================
  // MÉTODO PRINCIPAL: CALCULAR/APLICAR PARÂMETRO
  // =====================================

  /**
   * Calcula ou aplica parâmetros de meta
   * - previewOnly: true = apenas calcula e retorna resultado
   * - previewOnly: false = calcula e persiste no banco
   */
  async calculateParameter(
    data: CalculateParameterDto,
    actingUser: UserEntity
  ): Promise<
    ParameterValueEntity | { value: number; metadata: ParameterMetadata }
  > {
    console.log(
      `[ParameterService] ${data.previewOnly ? 'Preview' : 'Aplicação'} de cálculo de meta:`,
      {
        criterionId: data.criterionId,
        sectorId: data.sectorId,
        method: data.calculationMethod,
        finalValue: data.finalValue,
      }
    );

    // Validações básicas
    this.validateCalculateParameterInput(data);

    // Buscar entidades relacionadas
    const { criterion, competitionPeriod, sector } =
      await this.loadRelatedEntities(
        data.criterionId,
        data.competitionPeriodId,
        data.sectorId
      );

    // Buscar dados históricos para calcular baseValue de referência
    const historicalData = await this.getHistoricalPerformanceData(
      data.criterionId,
      data.sectorId,
      competitionPeriod
    );

    // Calcular valor base para metadados (mesmo que não seja usado para persistência)
    const baseValue = this.calculateBaseValue(
      historicalData,
      data.calculationMethod,
      criterion,
      data.finalValue
    );

    const metadataToSave: ParameterMetadata = {
      calculationMethod: data.calculationMethod,
      adjustmentPercentage: data.adjustmentPercentage,
      baseValue,
      wasRounded: data.wasRounded,
      roundingMethod: data.roundingMethod,
      roundingDecimalPlaces: data.roundingDecimalPlaces,
    };

    // MODO PREVIEW: apenas retorna cálculo sem persistir
    if (data.previewOnly) {
      return this.handlePreviewMode(data, metadataToSave);
    }

    // MODO APLICAÇÃO: persiste a meta no banco
    return this.handleApplicationMode(
      data,
      actingUser,
      criterion,
      competitionPeriod,
      sector,
      metadataToSave
    );
  }

  /**
   * Valida entrada do método calculateParameter
   */
  private validateCalculateParameterInput(data: CalculateParameterDto): void {
    if (
      !data.criterionId ||
      !data.competitionPeriodId ||
      !data.calculationMethod
    ) {
      throw new Error(
        'Campos obrigatórios ausentes: criterionId, competitionPeriodId, calculationMethod'
      );
    }

    if (data.previewOnly && data.finalValue === undefined) {
      throw new Error('Campo finalValue é obrigatório para preview.');
    }

    if (!data.previewOnly) {
      if (!data.justificativa) {
        throw new Error('Justificativa é obrigatória para aplicar uma meta.');
      }
      if (data.finalValue === undefined || data.finalValue === null) {
        throw new Error(
          'Valor final da meta (finalValue) é obrigatório para aplicação.'
        );
      }
    }
  }

  /**
   * Carrega entidades relacionadas necessárias
   */
  private async loadRelatedEntities(
    criterionId: number,
    competitionPeriodId: number,
    sectorId?: number | null
  ) {
    const [criterion, competitionPeriod, sector] = await Promise.all([
      this.criterionRepo.findOneByOrFail({ id: criterionId }),
      this.periodRepo.findOneByOrFail({ id: competitionPeriodId }),
      sectorId != null
        ? this.sectorRepo.findOneBy({ id: sectorId })
        : Promise.resolve(null),
    ]);

    return { criterion, competitionPeriod, sector };
  }

  /**
   * Trata modo preview (não persiste dados)
   */
  private async handlePreviewMode(
    data: CalculateParameterDto,
    metadata: ParameterMetadata
  ): Promise<{ value: number; metadata: ParameterMetadata }> {
    if (data.saveAsDefault) {
      await this.saveCalculationSettingsAsDefault(data);
    }

    return { value: data.finalValue!, metadata };
  }

  /**
   * Trata modo aplicação (persiste dados)
   */
  private async handleApplicationMode(
    data: CalculateParameterDto,
    actingUser: UserEntity,
    criterion: CriterionEntity,
    competitionPeriod: CompetitionPeriodEntity,
    sector: SectorEntity | null,
    metadata: ParameterMetadata
  ): Promise<ParameterValueEntity> {
    // Validação de status do período
    if (competitionPeriod.status !== 'PLANEJAMENTO') {
      throw new Error(
        `Metas só podem ser definidas para períodos em PLANEJAMENTO. ` +
          `Período ${competitionPeriod.mesAno} está em status: ${competitionPeriod.status}`
      );
    }

    const finalValueToSave = data.finalValue!;
    console.log(
      `[ParameterService] Aplicando valor final: ${finalValueToSave}`
    );

    let savedParameter!: ParameterValueEntity;

    await AppDataSource.manager.transaction(
      async (transactionalEntityManager) => {
        savedParameter = await this.persistParameterInTransaction(
          data,
          actingUser,
          criterion,
          competitionPeriod,
          sector,
          finalValueToSave,
          metadata,
          transactionalEntityManager
        );
      }
    );

    return savedParameter;
  }

  /**
   * Persiste parâmetro dentro de transação (UPSERT + atualização performance_data)
   */
  private async persistParameterInTransaction(
    data: CalculateParameterDto,
    actingUser: UserEntity,
    criterion: CriterionEntity,
    competitionPeriod: CompetitionPeriodEntity,
    sector: SectorEntity | null,
    finalValue: number,
    metadata: ParameterMetadata,
    transactionalEntityManager: any
  ): Promise<ParameterValueEntity> {
    const parameterRepoTx =
      transactionalEntityManager.getRepository(ParameterValueEntity);
    const performanceDataRepoTx = transactionalEntityManager.getRepository(
      PerformanceDataEntity
    );

    // Buscar parâmetro existente (UPSERT pattern)
    const existingParameter = await this.findExistingParameter(
      parameterRepoTx,
      data.criterionId,
      data.competitionPeriodId,
      data.sectorId
    );

    let savedParameter: ParameterValueEntity;
    let actionType: string;

    if (existingParameter) {
      // ATUALIZAR parâmetro existente
      savedParameter = await this.updateExistingParameter(
        parameterRepoTx,
        existingParameter,
        finalValue,
        metadata,
        data.justificativa!,
        actingUser
      );
      actionType = 'META_ATUALIZADA_VIA_CALCULO';
    } else {
      // CRIAR novo parâmetro
      savedParameter = await this.createNewParameter(
        parameterRepoTx,
        data,
        actingUser,
        criterion,
        competitionPeriod,
        sector,
        finalValue,
        metadata
      );
      actionType = 'META_CRIADA_VIA_CALCULO';
    }

    // 🎯 CORREÇÃO PRINCIPAL: Atualizar performance_data DENTRO da transação
    await this.updatePerformanceDataInTransaction(
      performanceDataRepoTx,
      data.criterionId,
      data.sectorId,
      data.competitionPeriodId,
      competitionPeriod,
      finalValue
    );

    // Salvar configurações como padrão se solicitado
    if (data.saveAsDefault) {
      await this.saveCalculationSettingsAsDefault(data);
    }

    // Registrar auditoria
    await this.auditLogService.createLog({
      userId: actingUser.id,
      userName: actingUser.nome,
      actionType,
      entityType: 'ParameterValueEntity',
      entityId: savedParameter.id.toString(),
      details: {
        appliedData: data,
        savedValue: finalValue,
        savedMetadata: metadata,
      },
      justification: data.justificativa!,
      competitionPeriodId: data.competitionPeriodId,
    });

    return savedParameter;
  }

  /**
   * Atualiza performance_data DENTRO da transação
   */
  private async updatePerformanceDataInTransaction(
    performanceDataRepo: Repository<PerformanceDataEntity>,
    criterionId: number,
    sectorId: number | undefined | null,
    competitionPeriodId: number,
    competitionPeriod: CompetitionPeriodEntity,
    targetValue: number
  ): Promise<void> {
    const numericTargetValue = parseFloat(String(targetValue));

    if (isNaN(numericTargetValue)) {
      console.warn(
        `[ParameterService] Valor "${targetValue}" não é numérico. Performance_data não atualizada.`
      );
      return;
    }

    try {
      const updateQuery = `
        UPDATE performance_data 
        SET "targetValue" = $1 
        WHERE "criterionId" = $2 
          AND "competitionPeriodId" = $3 
          AND (
            ($4::INTEGER IS NULL AND "sectorId" IS NULL) OR 
            ("sectorId" = $4)
          )
      `;

      const updateParams = [
        numericTargetValue,
        criterionId,
        competitionPeriodId,
        sectorId || null,
      ];

      const updateResult = await performanceDataRepo.query(
        updateQuery,
        updateParams
      );

      // Se não atualizou nenhum registro, INSERIR novo
      if (updateResult[1] === 0) {
        const insertQuery = `
          INSERT INTO performance_data ("criterionId", "competitionPeriodId", "sectorId", "metricDate", "targetValue", "valor")
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `;

        const insertParams = [
          criterionId,
          competitionPeriodId,
          sectorId || null,
          this.formatDate(competitionPeriod.dataInicio),
          numericTargetValue,
          null,
        ];

        await performanceDataRepo.query(insertQuery, insertParams);
      }

      console.log(
        `[ParameterService] Performance_data processada com targetValue: ${numericTargetValue}`
      );
    } catch (error: any) {
      console.error(
        `[ERROR updatePerformanceDataInTransaction] Falha ao processar performance_data:`,
        error
      );
      throw new Error(`Erro ao atualizar performance_data: ${error.message}`);
    }
  }

  /**
   * Busca parâmetro existente para UPSERT
   */
  private async findExistingParameter(
    parameterRepo: Repository<ParameterValueEntity>,
    criterionId: number,
    competitionPeriodId: number,
    sectorId?: number | null
  ): Promise<ParameterValueEntity | null> {
    const whereCondition: FindOptionsWhere<ParameterValueEntity> = {
      criterionId,
      competitionPeriodId,
      dataFimEfetivo: IsNull(),
      sectorId: this.createSectorWhereCondition(sectorId),
    };

    return parameterRepo.findOne({ where: whereCondition });
  }

  /**
   * Atualiza parâmetro existente
   */
  private async updateExistingParameter(
    parameterRepo: Repository<ParameterValueEntity>,
    existingParameter: ParameterValueEntity,
    finalValue: number,
    metadata: ParameterMetadata,
    justificativa: string,
    actingUser: UserEntity
  ): Promise<ParameterValueEntity> {
    existingParameter.valor = String(finalValue);
    existingParameter.justificativa = `${justificativa} (Atualizada via assistente em ${new Date().toISOString()})`;
    existingParameter.metadata = metadata;
    existingParameter.createdByUserId = actingUser.id;

    return parameterRepo.save(existingParameter);
  }

  /**
   * Cria novo parâmetro
   */
  private async createNewParameter(
    parameterRepo: Repository<ParameterValueEntity>,
    data: CalculateParameterDto,
    actingUser: UserEntity,
    criterion: CriterionEntity,
    competitionPeriod: CompetitionPeriodEntity,
    sector: SectorEntity | null,
    finalValue: number,
    metadata: ParameterMetadata
  ): Promise<ParameterValueEntity> {
    const parameterName = this.generateParameterName(
      criterion,
      sector,
      competitionPeriod,
      data.sectorId
    );

    const newParameter = parameterRepo.create({
      nomeParametro: parameterName,
      valor: String(finalValue),
      dataInicioEfetivo: this.formatDate(competitionPeriod.dataInicio),
      dataFimEfetivo: null,
      criterionId: data.criterionId,
      sectorId: this.normalizeSectorId(data.sectorId),
      competitionPeriodId: data.competitionPeriodId,
      justificativa: data.justificativa!,
      createdByUserId: actingUser.id,
      metadata,
    });

    return parameterRepo.save(newParameter);
  }

  /**
   * Salva configurações de cálculo como padrão para o critério
   */
  private async saveCalculationSettingsAsDefault(
    data: CalculateParameterDto
  ): Promise<void> {
    try {
      const settingsDto: CriterionCalculationSettingsDto = {
        criterionId: data.criterionId,
        calculationMethod: data.calculationMethod,
        adjustmentPercentage: data.adjustmentPercentage,
        requiresRounding: data.wasRounded ?? true,
        roundingMethod:
          data.roundingMethod as CriterionCalculationSettingsDto['roundingMethod'],
        roundingDecimalPlaces: data.roundingDecimalPlaces,
      };

      await this.criterionCalculationSettingsService.saveSettings(settingsDto);
      console.log(
        `[ParameterService] Configurações salvas como padrão para critério ${data.criterionId}`
      );
    } catch (error) {
      console.error(
        `[ParameterService] Erro ao salvar configurações padrão:`,
        error
      );
    }
  }

  // =====================================
  // MÉTODOS CRUD TRADICIONAIS
  // =====================================

  /**
   * Cria novo parâmetro manualmente
   */
  async createParameter(
    data: CreateParameterDto,
    actingUser: UserEntity
  ): Promise<ParameterValueEntity> {
    console.log('[ParameterService] Criando parâmetro manual:', data);

    this.validateCreateParameterInput(data);

    const { criterion, competitionPeriod, sector } =
      await this.loadRelatedEntities(
        data.criterionId,
        data.competitionPeriodId,
        data.sectorId
      );

    if (competitionPeriod.status !== 'PLANEJAMENTO') {
      console.warn(
        `[ParameterService] Criando meta para período ${competitionPeriod.mesAno} ` +
          `em status ${competitionPeriod.status} (não é PLANEJAMENTO)`
      );
    }

    // Verificar se já existe meta ativa
    await this.validateNoExistingActiveParameter(
      data.criterionId,
      data.competitionPeriodId,
      data.sectorId,
      criterion.nome,
      competitionPeriod.mesAno
    );

    const parameterName = this.generateParameterName(
      criterion,
      sector,
      competitionPeriod,
      data.sectorId
    );

    const parameterToCreate = this.parameterRepo.create({
      nomeParametro: data.nomeParametro || parameterName,
      valor: String(data.valor),
      dataInicioEfetivo: this.formatDate(data.dataInicioEfetivo),
      dataFimEfetivo: null,
      criterionId: data.criterionId,
      sectorId: this.normalizeSectorId(data.sectorId),
      competitionPeriodId: data.competitionPeriodId,
      justificativa: data.justificativa,
      createdByUserId: actingUser.id,
      metadata: data.metadata,
    });

    const savedParameter = await this.parameterRepo.save(parameterToCreate);

    await this.auditLogService.createLog({
      userId: actingUser.id,
      userName: actingUser.nome,
      actionType: 'META_CRIADA_MANUALMENTE',
      entityType: 'ParameterValueEntity',
      entityId: savedParameter.id.toString(),
      details: { newValue: savedParameter },
      justification: data.justificativa,
      competitionPeriodId: data.competitionPeriodId,
    });

    console.log(
      `[ParameterService] Parâmetro criado com ID: ${savedParameter.id}`
    );

    // 🚀 NOVO: Hook de automação para meta criada
    console.log(
      `[ParameterService] 🚀 Disparando hook de automação para meta criada...`
    );

    this.automationHook
      .onMetaChanged(savedParameter.id, actingUser.id)
      .then((result) => {
        console.log(
          `[ParameterService] ✅ Hook de meta criada: ${result.message}`
        );
      })
      .catch((error) => {
        console.error(
          `[ParameterService] ❌ Erro no hook de meta criada:`,
          error
        );
      });

    return savedParameter;
  }

  /**
   * Valida entrada do createParameter
   */
  private validateCreateParameterInput(data: CreateParameterDto): void {
    if (
      !data.criterionId ||
      !data.competitionPeriodId ||
      data.valor === undefined ||
      !data.dataInicioEfetivo ||
      !data.justificativa
    ) {
      throw new Error(
        'Campos obrigatórios ausentes: criterionId, competitionPeriodId, valor, dataInicioEfetivo, justificativa'
      );
    }
  }

  /**
   * Valida que não existe parâmetro ativo para a combinação critério/setor/período
   */
  private async validateNoExistingActiveParameter(
    criterionId: number,
    competitionPeriodId: number,
    sectorId: number | undefined | null,
    criterionName: string,
    periodMesAno: string
  ): Promise<void> {
    const whereExisting: FindOptionsWhere<ParameterValueEntity> = {
      criterionId,
      competitionPeriodId,
      dataFimEfetivo: IsNull(),
      sectorId: this.createSectorWhereCondition(sectorId),
    };

    const existingActiveParameter = await this.parameterRepo.findOne({
      where: whereExisting,
    });

    if (existingActiveParameter) {
      throw new Error(
        `Já existe meta ativa para critério "${criterionName}", ` +
          `setor "${sectorId ?? 'Geral'}" e período "${periodMesAno}". ` +
          `Expire a meta existente antes de criar nova.`
      );
    }
  }

  /**
   * Busca parâmetros para um período específico
   */
  async findParametersForPeriod(
    periodMesAno: string,
    sectorIdInput?: number,
    criterionIdInput?: number,
    onlyActive: boolean = true
  ): Promise<ParameterValueEntity[]> {
    console.log(
      `[ParameterService] Buscando parâmetros - Período: ${periodMesAno}, ` +
        `Setor: ${sectorIdInput}, Critério: ${criterionIdInput}, Apenas ativos: ${onlyActive}`
    );

    const competitionPeriod = await this.periodRepo.findOneBy({
      mesAno: periodMesAno,
    });
    if (!competitionPeriod) {
      console.warn(`[ParameterService] Período ${periodMesAno} não encontrado`);
      return [];
    }

    const queryBuilder = this.parameterRepo
      .createQueryBuilder('param')
      .leftJoinAndSelect('param.criterio', 'criterio')
      .leftJoinAndSelect('param.setor', 'setor')
      .leftJoinAndSelect('param.criadoPor', 'criadoPor')
      .leftJoinAndSelect('param.competitionPeriod', 'competitionPeriod')
      .where('param.competitionPeriodId = :periodId', {
        periodId: competitionPeriod.id,
      });

    // Filtros opcionais
    if (criterionIdInput !== undefined) {
      queryBuilder.andWhere('param.criterionId = :criterionId', {
        criterionId: criterionIdInput,
      });
    }

    if (sectorIdInput !== undefined) {
      if (sectorIdInput === null) {
        queryBuilder.andWhere('param.sectorId IS NULL');
      } else {
        queryBuilder.andWhere('param.sectorId = :sectorId', {
          sectorId: sectorIdInput,
        });
      }
    }

    // Filtro de parâmetros ativos
    if (onlyActive) {
      const referenceDate = this.formatDate(competitionPeriod.dataFim);
      queryBuilder
        .andWhere('param.dataInicioEfetivo <= :referenceDate', {
          referenceDate,
        })
        .andWhere(
          '(param.dataFimEfetivo IS NULL OR param.dataFimEfetivo >= :referenceDate)',
          { referenceDate }
        );
    }

    queryBuilder.orderBy({
      'param.dataInicioEfetivo': 'DESC',
      'param.createdAt': 'DESC',
    });

    const parameters = await queryBuilder.getMany();
    console.log(
      `[ParameterService] ${parameters.length} parâmetros encontrados`
    );

    return parameters;
  }

  /**
   * Busca parâmetro por ID
   */
  async findParameterById(id: number): Promise<ParameterValueEntity | null> {
    console.log(`[ParameterService] Buscando parâmetro por ID: ${id}`);

    return this.parameterRepo.findOne({
      where: { id },
      relations: [
        'criterio',
        'setor',
        'criadoPor',
        'competitionPeriod',
        'previousVersion',
      ],
    });
  }

  // =====================================
  // ⭐ MÉTODO UPDATEPARAMETER CORRIGIDO ⭐
  // =====================================

  /**
   * Atualiza parâmetro com versionamento por timestamp (CORRIGIDO)
   */
  async updateParameter(
    id: number,
    data: UpdateParameterDto,
    actingUser: UserEntity
  ): Promise<ParameterValueEntity> {
    console.log(`[ParameterService] Atualizando parâmetro ID: ${id}`, {
      valor: data.valor,
      dataInicioEfetivo: data.dataInicioEfetivo,
      justificativa: data.justificativa ? '[FORNECIDA]' : '[AUSENTE]',
    });

    const oldParameter = await this.findParameterById(id);
    if (!oldParameter) {
      throw new Error(
        `Parâmetro com ID ${id} não encontrado para atualização.`
      );
    }

    // Validações básicas
    this.validateUpdateParameter(oldParameter, data);

    //  Versionamento por timestamp
    const updatedParameter = await this.executeParameterVersioningByTimestamp(
      oldParameter,
      data,
      actingUser
    );

    // 🚀 NOVO: Hook de automação para meta alterada
    console.log(
      `[ParameterService] 🚀 Disparando hook de automação para meta alterada...`
    );

    this.automationHook
      .onMetaChanged(updatedParameter.id, actingUser.id)
      .then((result) => {
        console.log(
          `[ParameterService] ✅ Hook de meta alterada: ${result.message}`
        );
      })
      .catch((error) => {
        console.error(
          `[ParameterService] ❌ Erro no hook de meta alterada:`,
          error
        );
      });

    return updatedParameter;
  }

  async testAutomationConnectivity(): Promise<{
    isReady: boolean;
    message: string;
  }> {
    try {
      const isReady = await this.automationHook.isSystemReadyForAutomation();

      return {
        isReady,
        message: isReady
          ? 'Sistema de automação está pronto'
          : 'Sistema de automação não está pronto',
      };
    } catch (error) {
      console.error(
        '[ParameterService] Erro ao testar conectividade com automação:',
        error
      );

      return {
        isReady: false,
        message: `Erro na conectividade: ${error instanceof Error ? error.message : 'Desconhecido'}`,
      };
    }
  }

  /**
   * Valida dados para atualização de parâmetro (SIMPLIFICADA)
   */
  private validateUpdateParameter(
    oldParameter: ParameterValueEntity,
    data: UpdateParameterDto
  ): void {
    if (oldParameter.dataFimEfetivo !== null) {
      throw new Error(
        `Parâmetro ID ${oldParameter.id} já está expirado (${oldParameter.dataFimEfetivo}). Crie um novo.`
      );
    }

    if (!oldParameter.competitionPeriod) {
      throw new Error('Período de competição do parâmetro não carregado.');
    }

    if (oldParameter.competitionPeriod.status !== 'PLANEJAMENTO') {
      throw new Error(
        `Metas do período ${oldParameter.competitionPeriod.mesAno} ` +
          `(status: ${oldParameter.competitionPeriod.status}) não podem ser alteradas. ` +
          `Apenas períodos em PLANEJAMENTO.`
      );
    }

    if (!data.justificativa) {
      throw new Error('Justificativa é obrigatória para atualizar parâmetro.');
    }

    const hasChanges =
      data.valor !== undefined ||
      data.dataInicioEfetivo !== undefined ||
      data.nomeParametro !== undefined;

    if (!hasChanges) {
      throw new Error('Nenhum dado para atualizar foi fornecido.');
    }
  }

  /**
   * ⭐ NOVA IMPLEMENTAÇÃO: Executa versionamento usando timestamp
   */
  private async executeParameterVersioningByTimestamp(
    oldParameter: ParameterValueEntity,
    data: UpdateParameterDto,
    actingUser: UserEntity
  ): Promise<ParameterValueEntity> {
    let savedNewParameter!: ParameterValueEntity;

    await AppDataSource.manager.transaction(
      async (transactionalEntityManager) => {
        const parameterRepoTx =
          transactionalEntityManager.getRepository(ParameterValueEntity);

        // 1. ⭐ CALCULAR PRÓXIMA VERSÃO
        const nextVersion = await this.calculateNextVersion(
          parameterRepoTx,
          oldParameter.criterionId!,
          oldParameter.sectorId,
          oldParameter.competitionPeriodId
        );

        // 2. ⭐ EXPIRAR PARÂMETRO ATUAL (timestamp exato)
        const timestampExpiracao = new Date().toISOString();
        oldParameter.dataFimEfetivo =
          timestampExpiracao.split('T')[0] ||
          timestampExpiracao.substring(0, 10);
        oldParameter.justificativa = this.buildVersioningJustification(
          oldParameter.justificativa,
          data.justificativa!,
          actingUser.nome,
          timestampExpiracao
        );

        await transactionalEntityManager.save(
          ParameterValueEntity,
          oldParameter
        );
        console.log(
          `[ParameterService] Parâmetro antigo ID ${oldParameter.id} expirado em ${timestampExpiracao}`
        );

        // 3. ⭐ CRIAR NOVO PARÂMETRO (MESMA dataInicioEfetivo!)
        const newParameterData: DeepPartial<ParameterValueEntity> = {
          nomeParametro: data.nomeParametro || oldParameter.nomeParametro,
          valor:
            data.valor !== undefined ? String(data.valor) : oldParameter.valor,
          dataInicioEfetivo: oldParameter.dataInicioEfetivo, // ⭐ MESMA DATA!
          dataFimEfetivo: null,
          versao: nextVersion, // ⭐ NOVA VERSÃO
          criterionId: oldParameter.criterionId,
          sectorId: oldParameter.sectorId,
          competitionPeriodId: oldParameter.competitionPeriodId,
          justificativa: data.justificativa,
          createdByUserId: actingUser.id,
          previousVersionId: oldParameter.id,
          metadata: data.metadata || oldParameter.metadata,
        };

        const newEntityInstance = transactionalEntityManager.create(
          ParameterValueEntity,
          newParameterData
        );
        savedNewParameter = await transactionalEntityManager.save(
          ParameterValueEntity,
          newEntityInstance
        );

        console.log(
          `[ParameterService] Novo parâmetro versionado - ID: ${savedNewParameter.id}, Versão: ${nextVersion}`
        );

        // 4. ⭐ ATUALIZAR PERFORMANCE_DATA SE VALOR ALTERADO
        const isValueChanged =
          data.valor !== undefined && String(data.valor) !== oldParameter.valor;
        if (isValueChanged) {
          await this.updatePerformanceDataForValueChange(
            transactionalEntityManager,
            oldParameter,
            String(data.valor)
          );
        }
      }
    );

    // 5. Registrar auditoria
    await this.auditLogService.createLog({
      userId: actingUser.id,
      userName: actingUser.nome,
      actionType: 'META_VERSIONADA_TIMESTAMP',
      entityType: 'ParameterValueEntity',
      entityId: savedNewParameter.id.toString(),
      details: {
        oldParameterId: oldParameter.id,
        oldVersion: oldParameter.versao || 1,
        newVersion: savedNewParameter.versao,
        newParameter: savedNewParameter,
        changeTimestamp: new Date().toISOString(),
      },
      justification: data.justificativa!,
      competitionPeriodId: savedNewParameter.competitionPeriodId,
    });

    return savedNewParameter;
  }

  /**
   * ⭐ NOVO: Calcula próxima versão para uma combinação critério/setor/período
   */
  private async calculateNextVersion(
    parameterRepo: Repository<ParameterValueEntity>,
    criterionId: number,
    sectorId: number | null | undefined,
    competitionPeriodId: number
  ): Promise<number> {
    const maxVersionResult = await parameterRepo
      .createQueryBuilder('param')
      .select('MAX(param.versao)', 'maxVersao')
      .where('param.criterionId = :criterionId', { criterionId })
      .andWhere('param.competitionPeriodId = :competitionPeriodId', {
        competitionPeriodId,
      })
      .andWhere(
        sectorId !== null && sectorId !== undefined
          ? 'param.sectorId = :sectorId'
          : 'param.sectorId IS NULL',
        sectorId !== null && sectorId !== undefined ? { sectorId } : {}
      )
      .getRawOne();

    const currentMaxVersion = maxVersionResult?.maxVersao || 0;
    const nextVersion = currentMaxVersion + 1;

    console.log(
      `[ParameterService] Calculando próxima versão - Atual: ${currentMaxVersion}, Próxima: ${nextVersion}`
    );

    return nextVersion;
  }

  /**
   * ⭐ NOVO: Constrói justificativa para versionamento
   */
  private buildVersioningJustification(
    oldJustificativa: string | undefined,
    newJustificativa: string,
    userName: string,
    timestamp: string
  ): string {
    const baseText = oldJustificativa || '';
    return `${baseText} (Versionado em ${timestamp} por ${userName}. Nova just.: ${newJustificativa})`.trim();
  }

  /**
   * Atualiza performance_data quando valor da meta é alterado
   */
  private async updatePerformanceDataForValueChange(
    transactionalEntityManager: any,
    oldParameter: ParameterValueEntity,
    newValue: string
  ): Promise<void> {
    const numericValue = parseFloat(newValue);

    if (isNaN(numericValue)) {
      console.warn(
        `[ParameterService] Valor "${newValue}" não é numérico. ` +
          `Performance_data não atualizada.`
      );
      return;
    }

    const updateCriteria = {
      criterionId: oldParameter.criterionId,
      sectorId: oldParameter.sectorId,
      competitionPeriodId: oldParameter.competitionPeriodId,
    };

    // Atualizar performance_data
    const pdUpdateResult = await transactionalEntityManager.update(
      PerformanceDataEntity,
      updateCriteria,
      { targetValue: numericValue }
    );

    console.log(
      `[ParameterService] ${pdUpdateResult.affected} registros atualizados ` +
        `em performance_data com targetValue: ${numericValue}`
    );

    // Atualizar criterion_scores (se existir a tabela)
    try {
      const csUpdateResult = await transactionalEntityManager.update(
        'criterion_scores',
        updateCriteria,
        { targetValue: numericValue }
      );

      console.log(
        `[ParameterService] ${csUpdateResult.affected} registros atualizados ` +
          `em criterion_scores com targetValue: ${numericValue}`
      );
    } catch (error) {
      console.warn(
        '[ParameterService] Falha ao atualizar criterion_scores (talvez não exista):',
        error
      );
    }
  }

  /**
   * Exclui (expira) parâmetro logicamente
   */
  async deleteParameter(
    id: number,
    actingUser: UserEntity,
    justification: string
  ): Promise<ParameterValueEntity> {
    console.log(`[ParameterService] Expirando parâmetro ID: ${id}`);

    const parameter = await this.findParameterById(id);
    if (!parameter) {
      throw new Error(`Parâmetro com ID ${id} não encontrado.`);
    }

    this.validateDeleteParameter(parameter, justification);

    const todayString = this.formatDate(new Date());

    // Validar se pode expirar
    if (new Date(parameter.dataInicioEfetivo) > new Date(todayString)) {
      throw new Error(
        `Não é possível expirar parâmetro (${parameter.dataInicioEfetivo}) ` +
          `que ainda não iniciou sua vigência.`
      );
    }

    // Expirar parâmetro
    parameter.dataFimEfetivo = todayString;
    parameter.justificativa =
      `${parameter.justificativa || ''} ` +
      `(Expirado em ${todayString} por ${actingUser.nome}: ${justification})`.trim();

    const savedParameter = await this.parameterRepo.save(parameter);

    // Registrar auditoria
    await this.auditLogService.createLog({
      userId: actingUser.id,
      userName: actingUser.nome,
      actionType: 'META_EXPIRADA',
      entityType: 'ParameterValueEntity',
      entityId: savedParameter.id.toString(),
      justification,
      competitionPeriodId: savedParameter.competitionPeriodId,
    });

    console.log(
      `[ParameterService] Parâmetro ID ${id} expirado em ${savedParameter.dataFimEfetivo}`
    );
    return savedParameter;
  }

  /**
   * Valida exclusão de parâmetro
   */
  private validateDeleteParameter(
    parameter: ParameterValueEntity,
    justification: string
  ): void {
    if (parameter.dataFimEfetivo !== null) {
      throw new Error(
        `Parâmetro ID ${parameter.id} já está expirado/deletado.`
      );
    }

    if (
      parameter.competitionPeriod &&
      parameter.competitionPeriod.status !== 'PLANEJAMENTO'
    ) {
      throw new Error(
        `Parâmetro do período ${parameter.competitionPeriod.mesAno} ` +
          `(status ${parameter.competitionPeriod.status}) não pode ser deletado. ` +
          `Apenas expirado via atualização se necessário.`
      );
    }

    if (!justification) {
      throw new Error('Justificativa é obrigatória para expirar parâmetro.');
    }
  }

  // =====================================
  // MÉTODOS AUXILIARES E UTILITÁRIOS
  // =====================================

  /**
   * Busca parâmetros ativos por critério e setor para um período
   */
  async findActiveParameterByCriterionAndSector(
    criterionId: number,
    sectorId: number | null,
    competitionPeriodId: number
  ): Promise<ParameterValueEntity | null> {
    const whereCondition: FindOptionsWhere<ParameterValueEntity> = {
      criterionId,
      competitionPeriodId,
      dataFimEfetivo: IsNull(),
      sectorId: this.createSectorWhereCondition(sectorId),
    };

    return this.parameterRepo.findOne({
      where: whereCondition,
      relations: ['criterio', 'setor', 'competitionPeriod'],
    });
  }

  /**
   * Busca todos os parâmetros ativos para um período
   */
  async findAllActiveParametersForPeriod(
    periodMesAno: string
  ): Promise<ParameterValueEntity[]> {
    return this.findParametersForPeriod(
      periodMesAno,
      undefined,
      undefined,
      true
    );
  }

  /**
   * Verifica se existe parâmetro ativo para critério/setor/período
   */
  async hasActiveParameter(
    criterionId: number,
    sectorId: number | null,
    competitionPeriodId: number
  ): Promise<boolean> {
    const parameter = await this.findActiveParameterByCriterionAndSector(
      criterionId,
      sectorId,
      competitionPeriodId
    );
    return parameter !== null;
  }

  /**
   * Busca histórico de versões de um parâmetro
   */
  async findParameterVersionHistory(
    parameterId: number
  ): Promise<ParameterValueEntity[]> {
    const queryBuilder = this.parameterRepo
      .createQueryBuilder('param')
      .leftJoinAndSelect('param.criterio', 'criterio')
      .leftJoinAndSelect('param.setor', 'setor')
      .leftJoinAndSelect('param.criadoPor', 'criadoPor')
      .leftJoinAndSelect('param.competitionPeriod', 'competitionPeriod')
      .where(
        '(param.id = :parameterId OR param.previousVersionId = :parameterId)',
        { parameterId }
      )
      .orderBy('param.versao', 'DESC')
      .addOrderBy('param.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  /**
   * Estatísticas de parâmetros para um período
   */
  async getParameterStatisticsForPeriod(periodMesAno: string): Promise<{
    total: number;
    active: number;
    expired: number;
    byCriterion: Record<string, number>;
  }> {
    const competitionPeriod = await this.periodRepo.findOneBy({
      mesAno: periodMesAno,
    });
    if (!competitionPeriod) {
      throw new Error(`Período ${periodMesAno} não encontrado.`);
    }

    const allParameters = await this.parameterRepo.find({
      where: { competitionPeriodId: competitionPeriod.id },
      relations: ['criterio'],
    });

    const now = new Date();
    const active = allParameters.filter(
      (p) => p.dataFimEfetivo === null || new Date(p.dataFimEfetivo) >= now
    );
    const expired = allParameters.filter(
      (p) => p.dataFimEfetivo !== null && new Date(p.dataFimEfetivo) < now
    );

    const byCriterion: Record<string, number> = {};
    allParameters.forEach((p) => {
      const criterionName = p.criterio?.nome || 'Unknown';
      byCriterion[criterionName] = (byCriterion[criterionName] || 0) + 1;
    });

    return {
      total: allParameters.length,
      active: active.length,
      expired: expired.length,
      byCriterion,
    };
  }

  /**
   * Busca parâmetros que expiram em uma data específica
   */
  async findParametersExpiringOnDate(
    date: Date
  ): Promise<ParameterValueEntity[]> {
    const dateString = this.formatDate(date);

    return this.parameterRepo.find({
      where: { dataFimEfetivo: dateString },
      relations: ['criterio', 'setor', 'competitionPeriod'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Busca parâmetros criados por um usuário específico
   */
  async findParametersByUser(
    userId: number,
    limit?: number
  ): Promise<ParameterValueEntity[]> {
    const queryBuilder = this.parameterRepo
      .createQueryBuilder('param')
      .leftJoinAndSelect('param.criterio', 'criterio')
      .leftJoinAndSelect('param.setor', 'setor')
      .leftJoinAndSelect('param.competitionPeriod', 'competitionPeriod')
      .where('param.createdByUserId = :userId', { userId })
      .orderBy('param.createdAt', 'DESC');

    if (limit) {
      queryBuilder.limit(limit);
    }

    return queryBuilder.getMany();
  }

  /**
   * Busca parâmetros por valor em um range
   */
  async findParametersByValueRange(
    minValue: number,
    maxValue: number,
    periodMesAno?: string
  ): Promise<ParameterValueEntity[]> {
    const queryBuilder = this.parameterRepo
      .createQueryBuilder('param')
      .leftJoinAndSelect('param.criterio', 'criterio')
      .leftJoinAndSelect('param.setor', 'setor')
      .leftJoinAndSelect('param.competitionPeriod', 'competitionPeriod')
      .where('CAST(param.valor AS DECIMAL) BETWEEN :minValue AND :maxValue', {
        minValue,
        maxValue,
      });

    if (periodMesAno) {
      queryBuilder
        .innerJoin('param.competitionPeriod', 'cp')
        .andWhere('cp.mesAno = :periodMesAno', { periodMesAno });
    }

    return queryBuilder.getMany();
  }

  /**
   * Conta parâmetros ativos por critério
   */
  async countActiveParametersByCriterion(): Promise<Record<string, number>> {
    const result = await this.parameterRepo
      .createQueryBuilder('param')
      .innerJoin('param.criterio', 'criterio')
      .select('criterio.nome', 'criterionName')
      .addSelect('COUNT(*)', 'count')
      .where('param.dataFimEfetivo IS NULL')
      .groupBy('criterio.nome')
      .getRawMany();

    const counts: Record<string, number> = {};
    result.forEach((row) => {
      counts[row.criterionName] = parseInt(row.count, 10);
    });

    return counts;
  }

  /**
   * Calcula a projeção de valor para um critério com base em um período de amostra.
   */
  async getProjectionData(data: {
    criterionId: number;
    startDate: string;
    endDate: string;
    targetMonth: string;
  }): Promise<any[]> {
    const { criterionId, startDate, endDate, targetMonth } = data;

    console.log(
      `[ParameterService] Calculando projeção para critério ${criterionId} ` +
        `de ${startDate} a ${endDate} para o mês ${targetMonth}`
    );

    // 1. Obter o critério para acessar o nome e mapeamento
    const criterion = await this.criterionRepo.findOneBy({ id: criterionId });
    if (!criterion) {
      console.warn(
        `[ParameterService] Critério com ID ${criterionId} não encontrado.`
      );
      return [];
    }

    const criterionNameUpper = criterion.nome.toUpperCase();

    // 2. Calcular o número de dias no período de amostra e no mês alvo
    const start = new Date(startDate);
    const end = new Date(endDate);
    const sampleDays =
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;

    const [year, month] = targetMonth.split('-').map(Number) as [
      number,
      number,
    ];
    const targetMonthDays = new Date(year, month, 0).getDate();

    if (sampleDays <= 0) {
      console.warn(
        `[ParameterService] Período de amostra inválido (${sampleDays} dias).`
      );
      return [];
    }

    let results: any[] = [];

    // Lógica especial para KM OCIOSA
    if (criterionNameUpper === 'KM OCIOSA') {
      const rawKmOciosaRepo = AppDataSource.getRepository(
        RawOracleKmOciosaComponentsEntity
      );

      // Buscar dados brutos de KM Ociosa para o período de amostragem
      const rawData = await rawKmOciosaRepo.find({
        where: {
          metricMonth: Between(
            startDate.substring(0, 7),
            endDate.substring(0, 7)
          ),
        },
      });

      // Agrupar por setor e calcular o percentual de ociosidade
      const groupedBySector = rawData.reduce(
        (acc, item) => {
          const sector = item.sectorName || 'Geral';
          if (!acc[sector]) {
            acc[sector] = { kmOperacional: 0, kmHodometroAjustado: 0 };
          }
          acc[sector].kmOperacional += Number(item.kmOperacional) || 0;
          acc[sector].kmHodometroAjustado +=
            Number(item.kmHodometroAjustado) || 0;
          return acc;
        },
        {} as Record<
          string,
          { kmOperacional: number; kmHodometroAjustado: number }
        >
      );

      results = Object.entries(groupedBySector).map(([sectorName, totals]) => {
        let percentOciosa = 0;
        if (totals.kmOperacional > 0) {
          percentOciosa =
            ((totals.kmHodometroAjustado - totals.kmOperacional) /
              totals.kmOperacional) *
            100;
          percentOciosa = Number(percentOciosa.toFixed(4));
        } else {
          // Se KM Operacional é 0, e Hodômetro é positivo, ociosidade é alta. Se ambos 0, ociosidade 0.
          percentOciosa = totals.kmHodometroAjustado > 0 ? 9999 : 0; // Usar um valor alto para indicar alta ociosidade
        }
        return {
          sectorName: sectorName,
          realizadoNoPeriodo: percentOciosa, // O 'realizado' para projeção é o percentual
        };
      });
    } else {
      // Lógica existente para outros critérios
      const mapping = this.rawDataTableMappings[criterionNameUpper];
      if (!mapping) {
        console.warn(
          `[ParameterService] Mapeamento de tabela raw não encontrado para o critério: ${criterion.nome}`
        );
        return [];
      }

      const rawRepo = AppDataSource.getRepository(mapping.entity);
      const alias = 'raw';

      // 3. Construir a query dinamicamente
      const queryBuilder = rawRepo
        .createQueryBuilder(alias)
        .select(`${alias}.${mapping.sectorColumn}`, 'sectorName')
        .addSelect(`SUM(${alias}.${mapping.valueColumn})`, 'realizadoNoPeriodo')
        .groupBy(`${alias}.${mapping.sectorColumn}`);

      // Adicionar filtro de data
      if (mapping.dateGranularity === 'day') {
        queryBuilder.andWhere(
          `${alias}.${mapping.dateColumn} BETWEEN :startDate AND :endDate`,
          {
            startDate,
            endDate,
          }
        );
      } else {
        // Para granularidade mensal, extrair o mês/ano e comparar
        // Assumindo que metricMonth está no formato YYYY-MM
        const startMonth = startDate.substring(0, 7); // YYYY-MM
        const endMonth = endDate.substring(0, 7); // YYYY-MM
        queryBuilder.andWhere(
          `${alias}.${mapping.dateColumn} BETWEEN :startMonth AND :endMonth`,
          {
            startMonth,
            endMonth,
          }
        );
      }

      // Adicionar filtro específico do critério, se houver
      if (mapping.filterColumn && mapping.filterValue) {
        queryBuilder.andWhere(
          `${alias}.${mapping.filterColumn} = :filterValue`,
          {
            filterValue: mapping.filterValue,
          }
        );
      }

      results = await queryBuilder.getRawMany();
    }

    console.log(
      `[ParameterService] ${results.length} resultados brutos encontrados para projeção.`
    );

    // 4. Calcular a projeção para cada setor
    const projection = results.map((result) => {
      const realizado = parseFloat(result.realizadoNoPeriodo || '0'); // Garante que é um número
      const dailyAverage = realizado / sampleDays;
      const projectedValue = dailyAverage * targetMonthDays;

      return {
        sectorName: result.sectorName || 'Geral', // Nome do setor pode ser null/undefined
        realizadoNoPeriodo: realizado,
        valorProjetado: projectedValue,
      };
    });

    console.log(
      `[ParameterService] Projeção calculada:`,
      JSON.stringify(projection)
    );

    return projection;
  }

  /**
   * Busca parâmetros sem metadados (para migração/cleanup)
   */
  async findParametersWithoutMetadata(): Promise<ParameterValueEntity[]> {
    return this.parameterRepo.find({
      where: { metadata: IsNull() },
      relations: ['criterio', 'setor', 'competitionPeriod'],
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Valida consistência de dados entre parameter_values e performance_data
   */
  async validateParameterDataConsistency(periodMesAno?: string): Promise<{
    inconsistencies: Array<{
      parameterId: number;
      criterionId: number;
      sectorId: number | null;
      parameterValue: string;
      performanceTargetValue: number | null;
      issue: string;
    }>;
    totalChecked: number;
  }> {
    const parameters = periodMesAno
      ? await this.findParametersForPeriod(
          periodMesAno,
          undefined,
          undefined,
          true
        )
      : await this.parameterRepo.find({
          where: { dataFimEfetivo: IsNull() },
          relations: ['competitionPeriod'],
        });

    const inconsistencies: any[] = [];

    for (const param of parameters) {
      // Validar se criterionId é válido (não pode ser null para performance_data)
      if (!param.criterionId) {
        inconsistencies.push({
          parameterId: param.id,
          criterionId: param.criterionId || 0,
          sectorId: param.sectorId,
          parameterValue: param.valor,
          performanceTargetValue: null,
          issue:
            'Parameter has null criterionId - cannot sync with performance_data',
        });
        continue;
      }

      // Usar função utilitária para criar condição WHERE type-safe
      const whereCondition = this.createPerformanceDataWhereCondition(
        param.criterionId,
        param.sectorId,
        param.competitionPeriodId
      );

      const performanceData = await this.performanceDataRepo.findOne({
        where: whereCondition,
      });

      const paramValue = parseFloat(param.valor);

      if (!performanceData) {
        inconsistencies.push({
          parameterId: param.id,
          criterionId: param.criterionId,
          sectorId: param.sectorId,
          parameterValue: param.valor,
          performanceTargetValue: null,
          issue: 'Missing performance_data entry',
        });
      } else if (
        !isNaN(paramValue) &&
        performanceData.targetValue !== null &&
        Math.abs(paramValue - performanceData.targetValue!) > 0.01
      ) {
        inconsistencies.push({
          parameterId: param.id,
          criterionId: param.criterionId,
          sectorId: param.sectorId,
          parameterValue: param.valor,
          performanceTargetValue: performanceData.targetValue,
          issue: 'Value mismatch between parameter_values and performance_data',
        });
      }
    }

    return {
      inconsistencies,
      totalChecked: parameters.length,
    };
  }

  /**
   * Corrige inconsistências de dados sincronizando performance_data com parameter_values
   */
  async syncParameterDataWithPerformanceData(
    periodMesAno: string,
    dryRun: boolean = true
  ): Promise<{
    fixed: number;
    errors: Array<{ parameterId: number; error: string }>;
  }> {
    const parameters = await this.findParametersForPeriod(
      periodMesAno,
      undefined,
      undefined,
      true
    );
    let fixed = 0;
    const errors: Array<{ parameterId: number; error: string }> = [];

    if (!dryRun) {
      await AppDataSource.manager.transaction(
        async (transactionalEntityManager) => {
          const performanceDataRepo = transactionalEntityManager.getRepository(
            PerformanceDataEntity
          );

          for (const param of parameters) {
            try {
              // Validar se criterionId é válido
              if (!param.criterionId) {
                errors.push({
                  parameterId: param.id,
                  error:
                    'Parameter has null criterionId - cannot create performance_data entry',
                });
                continue;
              }

              const paramValue = parseFloat(param.valor);
              if (isNaN(paramValue)) {
                errors.push({
                  parameterId: param.id,
                  error: 'Parameter value is not numeric',
                });
                continue;
              }

              // Usar função utilitária para criar condição WHERE type-safe
              const whereCondition = this.createPerformanceDataWhereCondition(
                param.criterionId,
                param.sectorId,
                param.competitionPeriodId
              );

              let performanceData = await performanceDataRepo.findOne({
                where: whereCondition,
              });

              if (!performanceData) {
                // Criar entrada missing - garantir que tipos sejam compatíveis
                const createData: Partial<PerformanceDataEntity> = {
                  criterionId: param.criterionId, // Já validado que não é null
                  competitionPeriodId: param.competitionPeriodId,
                  metricDate: this.formatDate(
                    param.competitionPeriod!.dataInicio
                  ),
                  targetValue: paramValue,
                  valor: null,
                };

                // Tratar sectorId adequadamente
                if (param.sectorId !== null && param.sectorId !== undefined) {
                  createData.sectorId = param.sectorId;
                }
                // Se param.sectorId for null/undefined, não incluímos no createData

                performanceData = performanceDataRepo.create(createData);
              } else {
                // Atualizar valor divergente
                performanceData.targetValue = paramValue;
              }

              await performanceDataRepo.save(performanceData);
              fixed++;
            } catch (error: any) {
              errors.push({
                parameterId: param.id,
                error: error.message,
              });
            }
          }
        }
      );
    } else {
      // Modo dry-run: apenas contar o que seria corrigido
      const { inconsistencies } =
        await this.validateParameterDataConsistency(periodMesAno);
      fixed = inconsistencies.length;
    }

    return { fixed, errors };
  }
}
