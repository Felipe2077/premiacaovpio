// apps/api/src/modules/parameters/parameter.service.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { PerformanceDataEntity } from '@/entity/performance-data.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { UserEntity } from '@/entity/user.entity';
import {
  CalculateParameterDto,
  CreateParameterDto,
  ParameterMetadata,
  UpdateParameterDto,
} from '@sistema-premiacao/shared-types';
import 'reflect-metadata';
import { DeepPartial, FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { AuditLogService } from '../audit/audit.service';
import { CriterionCalculationSettingsService } from './criterion-calculation-settings.service';

export class ParameterService {
  private parameterRepo: Repository<ParameterValueEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private sectorRepo: Repository<SectorEntity>;
  private performanceDataRepo: Repository<PerformanceDataEntity>;
  private auditLogService: AuditLogService;
  private criterionCalculationSettingsService: CriterionCalculationSettingsService;

  constructor() {
    this.parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
    this.performanceDataRepo = AppDataSource.getRepository(
      PerformanceDataEntity
    );
    this.auditLogService = new AuditLogService();
    this.criterionCalculationSettingsService =
      new CriterionCalculationSettingsService();

    console.log('[ParameterService] Instanciado e repositórios configurados.');
  }

  private formatDate(dateInput: Date | string | undefined | null): string {
    if (dateInput === null || dateInput === undefined) {
      throw new Error('Data inválida ou não fornecida para formatação.');
    }
    try {
      const dateObject = new Date(dateInput);
      if (isNaN(dateObject.getTime())) {
        throw new Error(`Valor de data inválido fornecido: ${dateInput}`);
      }
      return dateObject.toISOString().split('T')[0]!; // Formato YYYY-MM-DD
    } catch (e: unknown) {
      let errorMessage = `Erro ao formatar data: ${dateInput}`;
      if (e instanceof Error) {
        errorMessage += ` - ${e.message}`;
      }
      console.error(errorMessage, e);
      throw new Error('Formato de data inválido para formatDate.');
    }
  }

  async createParameter(
    data: CreateParameterDto,
    actingUser: UserEntity
  ): Promise<ParameterValueEntity> {
    console.log(`[ParameterService] Criando parâmetro/meta:`, data);
    if (
      !data.criterionId ||
      !data.competitionPeriodId ||
      data.valor === undefined ||
      !data.dataInicioEfetivo ||
      !data.justificativa
    ) {
      throw new Error(
        'Campos obrigatórios (criterionId, competitionPeriodId, valor, dataInicioEfetivo, justificativa) estão faltando.'
      );
    }

    const criterion = await this.criterionRepo.findOneBy({
      id: data.criterionId,
    });
    if (!criterion)
      throw new Error(`Critério com ID ${data.criterionId} não encontrado.`);

    const competitionPeriod = await this.periodRepo.findOneBy({
      id: data.competitionPeriodId,
    });
    if (!competitionPeriod)
      throw new Error(
        `Período de competição com ID ${data.competitionPeriodId} não encontrado.`
      );

    if (competitionPeriod.status !== 'PLANEJAMENTO') {
      console.warn(
        `[ParameterService] Alerta: Criando meta para período ${competitionPeriod.mesAno} (status: ${competitionPeriod.status}) que não está em PLANEJAMENTO.`
      );
    }

    const whereExisting: FindOptionsWhere<ParameterValueEntity> = {
      criterionId: data.criterionId,
      competitionPeriodId: data.competitionPeriodId,
      dataFimEfetivo: IsNull(),
      sectorId:
        data.sectorId === undefined || data.sectorId === null
          ? IsNull()
          : data.sectorId,
    };
    const existingActiveParameter = await this.parameterRepo.findOne({
      where: whereExisting,
    });

    if (existingActiveParameter) {
      throw new Error(
        `Já existe uma meta ativa para este critério (${criterion.nome}), setor (${data.sectorId === null || data.sectorId === undefined ? 'Geral' : data.sectorId}) e período (${competitionPeriod.mesAno}). Expire a meta existente antes de criar uma nova.`
      );
    }

    const parameterToCreate = this.parameterRepo.create({
      nomeParametro:
        data.nomeParametro ||
        `META_${criterion.nome.toUpperCase().replace(/\s+/g, '_')}${data.sectorId ? `_SETOR${data.sectorId}` : '_GERAL'}`,
      valor: String(data.valor),
      dataInicioEfetivo: this.formatDate(data.dataInicioEfetivo),
      dataFimEfetivo: null,
      criterionId: data.criterionId,
      sectorId: data.sectorId,
      competitionPeriodId: data.competitionPeriodId,
      justificativa: data.justificativa,
      createdByUserId: actingUser.id,
      metadata: data.metadata, // Adicionar os metadados se fornecidos
    });

    const savedParameter = await this.parameterRepo.save(parameterToCreate);
    // await this.auditLogService.registerLog('META_CRIADA', actingUser.id, actingUser.nome, { newValues: savedParameter });
    console.log(
      `[ParameterService] Parâmetro/Meta criado com ID: ${savedParameter.id}`
    );
    return savedParameter;
  }

  async calculateParameter(
    data: CalculateParameterDto,
    actingUser: UserEntity
  ): Promise<{ value: number; metadata: ParameterMetadata }> {
    console.log(`[ParameterService] Processando cálculo de meta:`, data);

    // Validar dados de entrada
    if (
      !data.criterionId ||
      !data.competitionPeriodId ||
      !data.calculationMethod ||
      data.finalValue === undefined
    ) {
      throw new Error(
        'Campos obrigatórios (criterionId, competitionPeriodId, calculationMethod, finalValue) estão faltando.'
      );
    }

    // Buscar o critério
    const criterion = await this.criterionRepo.findOneBy({
      id: data.criterionId,
    });
    if (!criterion) {
      throw new Error(`Critério com ID ${data.criterionId} não encontrado.`);
    }

    // Buscar o período
    const competitionPeriod = await this.periodRepo.findOneBy({
      id: data.competitionPeriodId,
    });
    if (!competitionPeriod) {
      throw new Error(
        `Período de competição com ID ${data.competitionPeriodId} não encontrado.`
      );
    }

    // Buscar dados históricos de desempenho para calcular o valor base
    const historicalData = await this.getHistoricalPerformanceData(
      data.criterionId,
      data.sectorId,
      competitionPeriod
    );

    // Calcular valor base conforme o método selecionado (para metadados)
    let baseValue = 0;
    try {
      switch (data.calculationMethod) {
        case 'media3':
          baseValue = this.calculateAverage(historicalData, 3);
          break;
        case 'media6':
          baseValue = this.calculateAverage(historicalData, 6);
          break;
        case 'ultimo':
          baseValue = this.getLastValue(historicalData);
          break;
        case 'melhor3':
          baseValue = this.getBestValue(
            historicalData,
            3,
            criterion.sentido_melhor
          );
          break;
        default:
          console.warn(
            `[ParameterService] Método de cálculo não reconhecido: ${data.calculationMethod}, usando valor fornecido.`
          );
          baseValue = data.finalValue;
      }
    } catch (error) {
      console.error(`[ParameterService] Erro ao calcular valor base:`, error);
      // Se houver erro no cálculo, usamos o valor final fornecido
      baseValue = data.finalValue;
    }

    // Salvar configurações como padrão se solicitado
    if (data.saveAsDefault) {
      try {
        await this.criterionCalculationSettingsService.saveSettings({
          criterionId: data.criterionId,
          calculationMethod: data.calculationMethod,
          adjustmentPercentage: data.adjustmentPercentage,
          requiresRounding: data.wasRounded,
          roundingMethod: data.roundingMethod,
          roundingDecimalPlaces: data.roundingDecimalPlaces,
        });
        console.log(
          `[ParameterService] Configurações de cálculo salvas como padrão para critério ID: ${data.criterionId}`
        );
      } catch (error) {
        console.error(
          `[ParameterService] Erro ao salvar configurações de cálculo:`,
          error
        );
        // Não interromper o fluxo se houver erro ao salvar configurações
      }
    }

    // Preparar metadados
    const metadata: ParameterMetadata = {
      calculationMethod: data.calculationMethod,
      adjustmentPercentage: data.adjustmentPercentage,
      baseValue,
      wasRounded: data.wasRounded,
      roundingMethod: data.roundingMethod,
      roundingDecimalPlaces: data.roundingDecimalPlaces,
    };

    // Usar o valor final já arredondado enviado pelo frontend
    return { value: data.finalValue, metadata };
  }

  // Métodos auxiliares para cálculo
  private async getHistoricalPerformanceData(
    criterionId: number,
    sectorId: number | undefined | null,
    currentPeriod: CompetitionPeriodEntity
  ): Promise<PerformanceDataEntity[]> {
    console.log(
      `[ParameterService] Buscando dados históricos para critério ID: ${criterionId}, setor ID: ${sectorId}`
    );

    // Construir a consulta base
    const queryBuilder = this.performanceDataRepo
      .createQueryBuilder('pd')
      .where('pd.criterionId = :criterionId', { criterionId })
      .andWhere('pd.competitionPeriodId != :currentPeriodId', {
        currentPeriodId: currentPeriod.id,
      });

    // Adicionar filtro de setor
    if (sectorId !== undefined) {
      if (sectorId === null) {
        queryBuilder.andWhere('pd.sectorId IS NULL');
      } else {
        queryBuilder.andWhere('pd.sectorId = :sectorId', { sectorId });
      }
    }

    // Ordenar por período (mais recente primeiro)
    queryBuilder
      .leftJoin('pd.competitionPeriod', 'cp')
      .orderBy('cp.mesAno', 'DESC')
      .limit(12); // Limitar aos últimos 12 meses

    return queryBuilder.getMany();
  }

  private calculateAverage(
    data: PerformanceDataEntity[],
    months: number
  ): number {
    if (!data || data.length === 0) {
      throw new Error(
        'Não há dados históricos suficientes para calcular a média.'
      );
    }

    // Limitar ao número de meses solicitado
    const recentData = data.slice(0, months);

    if (recentData.length < months) {
      console.warn(
        `[ParameterService] Aviso: Solicitada média de ${months} meses, mas só há ${recentData.length} disponíveis.`
      );
    }

    // Usar a propriedade 'valor' em vez de 'realizedValue'
    const validValues = recentData
      .filter((item) => item.valor !== null && !isNaN(Number(item.valor)))
      .map((item) => Number(item.valor));

    if (validValues.length === 0) {
      throw new Error('Não há valores válidos para calcular a média.');
    }

    const sum = validValues.reduce((acc, val) => acc + val, 0);
    return sum / validValues.length;
  }

  private getLastValue(data: PerformanceDataEntity[]): number {
    if (!data || data.length === 0) {
      throw new Error('Não há dados históricos para obter o último valor.');
    }

    // O primeiro item é o mais recente devido à ordenação na consulta
    const lastItem = data[0];

    if (!lastItem || lastItem.valor === null || isNaN(Number(lastItem.valor))) {
      throw new Error('O último valor realizado não é válido.');
    }

    return Number(lastItem.valor);
  }

  private getBestValue(
    data: PerformanceDataEntity[],
    months: number,
    direction: string | undefined
  ): number {
    if (!data || data.length === 0) {
      throw new Error('Não há dados históricos para obter o melhor valor.');
    }

    // Limitar ao número de meses solicitado
    const recentData = data.slice(0, months);

    if (recentData.length < months) {
      console.warn(
        `[ParameterService] Aviso: Solicitados ${months} meses para melhor valor, mas só há ${recentData.length} disponíveis.`
      );
    }

    // Filtrar valores válidos (usar 'valor' em vez de 'realizedValue')
    const validValues = recentData
      .filter((item) => item.valor !== null && !isNaN(Number(item.valor)))
      .map((item) => Number(item.valor));

    if (validValues.length === 0) {
      throw new Error('Não há valores válidos para determinar o melhor.');
    }

    // Determinar o melhor valor com base na direção
    if (direction === 'MENOR') {
      return Math.min(...validValues);
    } else {
      // Por padrão, consideramos que maior é melhor
      return Math.max(...validValues);
    }
  }

  async findParametersForPeriod(
    periodMesAno: string,
    sectorIdInput?: number,
    criterionIdInput?: number,
    onlyActive: boolean = true
  ): Promise<ParameterValueEntity[]> {
    console.log(
      `[ParameterService] Buscando parâmetros para período ${periodMesAno}, setor ${sectorIdInput}, critério ${criterionIdInput}, ativas: ${onlyActive}`
    );

    // Buscar o período pelo mesAno
    const competitionPeriod = await this.periodRepo.findOneBy({
      mesAno: periodMesAno,
    });

    if (!competitionPeriod) {
      console.warn(
        `[ParameterService] Período ${periodMesAno} não encontrado.`
      );
      return [];
    }

    // Construir a consulta base
    const queryBuilder = this.parameterRepo
      .createQueryBuilder('param')
      .leftJoinAndSelect('param.criterio', 'criterio')
      .leftJoinAndSelect('param.setor', 'setor')
      .leftJoinAndSelect('param.criadoPor', 'criadoPor')
      .leftJoinAndSelect('param.competitionPeriod', 'competitionPeriod')
      .where('param.competitionPeriodId = :periodId', {
        periodId: competitionPeriod.id,
      });

    // Adicionar filtros se fornecidos
    if (criterionIdInput !== undefined) {
      queryBuilder.andWhere('param.criterionId = :criterionId', {
        criterionId: criterionIdInput,
      });
    }

    // Tratar o filtro de setor de forma especial
    if (sectorIdInput !== undefined) {
      if (sectorIdInput === null) {
        queryBuilder.andWhere('param.sectorId IS NULL');
      } else {
        queryBuilder.andWhere('param.sectorId = :sectorId', {
          sectorId: sectorIdInput,
        });
      }
    }

    // Adicionar filtros de data para parâmetros ativos
    if (onlyActive) {
      queryBuilder
        .andWhere(
          '(param.dataFimEfetivo IS NULL OR param.dataFimEfetivo >= :dataInicio)',
          { dataInicio: this.formatDate(competitionPeriod.dataInicio) }
        )
        .andWhere('param.dataInicioEfetivo <= :dataFim', {
          dataFim: this.formatDate(competitionPeriod.dataFim),
        });
    }

    // Ordenar os resultados
    queryBuilder.orderBy({
      'param.criterionId': 'ASC',
      'param.sectorId': 'ASC',
      'param.dataInicioEfetivo': 'DESC',
      'param.createdAt': 'DESC',
    });

    // Executar a consulta e retornar os resultados
    const parameters = await queryBuilder.getMany();

    console.log(
      `[ParameterService] ${parameters.length} parâmetros encontrados para ${periodMesAno}.`
    );

    // Log detalhado para debug
    if (parameters.length === 0) {
      console.log(
        `[ParameterService] Nenhum parâmetro encontrado com os filtros aplicados.`
      );
    } else {
      console.log(
        `[ParameterService] Parâmetros encontrados:`,
        parameters.map((p) => ({
          id: p.id,
          criterionId: p.criterionId,
          sectorId: p.sectorId,
          valor: p.valor,
          dataInicioEfetivo: p.dataInicioEfetivo,
          dataFimEfetivo: p.dataFimEfetivo,
        }))
      );
    }

    return parameters;
  }

  async findParameterById(id: number): Promise<ParameterValueEntity | null> {
    console.log(`[ParameterService] Buscando parâmetro por ID: ${id}`);
    return this.parameterRepo.findOne({
      where: { id },
      relations: ['criterio', 'setor', 'criadoPor', 'competitionPeriod'],
    });
  }

  async updateParameter(
    id: number,
    data: UpdateParameterDto,
    actingUser: UserEntity
  ): Promise<ParameterValueEntity> {
    console.log(
      `[ParameterService] Tentando atualizar parâmetro ID: ${id} com dados:`,
      data
    );
    const oldParameter = await this.findParameterById(id);
    if (!oldParameter) {
      throw new Error(
        `Parâmetro com ID ${id} não encontrado para atualização.`
      );
    }
    if (oldParameter.dataFimEfetivo !== null) {
      throw new Error(
        `Parâmetro com ID ${id} já está expirado (dataFimEfetivo: ${oldParameter.dataFimEfetivo}). Crie um novo.`
      );
    }
    if (oldParameter.competitionPeriod?.status !== 'PLANEJAMENTO') {
      throw new Error(
        `Metas do período ${oldParameter.competitionPeriod?.mesAno} (status: ${oldParameter.competitionPeriod?.status}) não podem ser alteradas. Apenas de períodos em PLANEJAMENTO.`
      );
    }

    if (
      data.valor === undefined &&
      data.dataInicioEfetivo === undefined &&
      data.nomeParametro === undefined &&
      data.justificativa === undefined
    ) {
      throw new Error('Nenhum dado para atualizar foi fornecido.');
    }
    if (!data.justificativa) {
      throw new Error('Justificativa é obrigatória para atualizar parâmetro.');
    }

    let newParamDataInicioEfetivo: string;
    if (data.dataInicioEfetivo) {
      newParamDataInicioEfetivo = this.formatDate(data.dataInicioEfetivo);
      if (
        new Date(newParamDataInicioEfetivo) <
          new Date(
            this.formatDate(oldParameter.competitionPeriod.dataInicio)
          ) ||
        new Date(newParamDataInicioEfetivo) >
          new Date(this.formatDate(oldParameter.competitionPeriod.dataFim))
      ) {
        throw new Error(
          `A nova data de início (${newParamDataInicioEfetivo}) deve estar dentro do período de competição (${oldParameter.competitionPeriod.dataInicio} a ${oldParameter.competitionPeriod.dataFim}).`
        );
      }
    } else {
      newParamDataInicioEfetivo = oldParameter.dataInicioEfetivo; // Mantém a data de início se não for alterada
    }

    // Expirar o parâmetro antigo: dataFimEfetivo é um dia antes do novo dataInicioEfetivo
    const oldParamEndDate = new Date(newParamDataInicioEfetivo);
    oldParamEndDate.setUTCDate(oldParamEndDate.getUTCDate() - 1); // Usa UTC para evitar problemas de fuso/hora

    if (oldParamEndDate < new Date(oldParameter.dataInicioEfetivo)) {
      throw new Error(
        `A data de fim calculada para o parâmetro antigo (${this.formatDate(oldParamEndDate)}) não pode ser anterior à sua data de início (${oldParameter.dataInicioEfetivo}). Verifique a nova data de início.`
      );
    }
    oldParameter.dataFimEfetivo = this.formatDate(oldParamEndDate);
    oldParameter.justificativa =
      `${oldParameter.justificativa || ''} (Versionado em ${new Date().toISOString()} por ${actingUser.nome}: ${data.justificativa})`.trim();

    const newParameterData: DeepPartial<ParameterValueEntity> = {
      nomeParametro: data.nomeParametro || oldParameter.nomeParametro,
      valor: data.valor !== undefined ? String(data.valor) : oldParameter.valor,
      dataInicioEfetivo: newParamDataInicioEfetivo,
      dataFimEfetivo: null,
      criterionId: oldParameter.criterionId,
      sectorId: oldParameter.sectorId,
      competitionPeriodId: oldParameter.competitionPeriodId,
      justificativa: data.justificativa, // Justificativa da nova versão
      createdByUserId: actingUser.id,
      previousVersionId: oldParameter.id, // Garantir que o previousVersionId seja definido
      metadata: data.metadata || oldParameter.metadata, // Preservar ou atualizar os metadados
    };

    // Verificar se o valor foi alterado
    const isValueChanged =
      data.valor !== undefined && String(data.valor) !== oldParameter.valor;
    const newValue =
      data.valor !== undefined ? String(data.valor) : oldParameter.valor;

    let savedNewParameter: ParameterValueEntity;
    await AppDataSource.manager.transaction(
      async (transactionalEntityManager) => {
        // 1. Expirar o parâmetro antigo
        await transactionalEntityManager.save(
          ParameterValueEntity,
          oldParameter
        );
        console.log(
          `[ParameterService] Parâmetro antigo ID ${oldParameter.id} expirado em ${oldParameter.dataFimEfetivo}.`
        );

        // 2. Criar o novo parâmetro versionado
        const newEntityInstance = transactionalEntityManager.create(
          ParameterValueEntity,
          newParameterData
        );
        savedNewParameter = await transactionalEntityManager.save(
          ParameterValueEntity,
          newEntityInstance
        );
        console.log(
          `[ParameterService] Novo parâmetro versionado criado com ID: ${savedNewParameter.id}`
        );

        // 3. Atualizar a tabela performance_data se o valor foi alterado
        if (isValueChanged) {
          const numericValue = parseFloat(newValue);
          if (!isNaN(numericValue)) {
            const updateResult = await transactionalEntityManager.update(
              'performance_data',
              {
                criterionId: oldParameter.criterionId,
                sectorId: oldParameter.sectorId,
                competitionPeriodId: oldParameter.competitionPeriodId,
              },
              {
                targetValue: numericValue,
              }
            );

            console.log(
              `[ParameterService] Atualizados ${updateResult.affected} registros em performance_data com o novo valor de meta: ${numericValue}`
            );

            // 4. Também atualizar a tabela criterion_scores
            const updateScoresResult = await transactionalEntityManager.update(
              'criterion_scores',
              {
                criterionId: oldParameter.criterionId,
                sectorId: oldParameter.sectorId,
                competitionPeriodId: oldParameter.competitionPeriodId,
              },
              {
                targetValue: numericValue,
              }
            );

            console.log(
              `[ParameterService] Atualizados ${updateScoresResult.affected} registros em criterion_scores com o novo valor de meta: ${numericValue}`
            );
          } else {
            console.warn(
              `[ParameterService] Não foi possível converter o valor "${newValue}" para número. As tabelas performance_data e criterion_scores não foram atualizadas.`
            );
          }
        } else {
          console.log(
            `[ParameterService] Valor da meta não foi alterado. Nenhuma atualização necessária em performance_data ou criterion_scores.`
          );
        }
      }
    );

    // await this.auditLogService.registerLog('META_ATUALIZADA', actingUser.id, actingUser.nome, { oldValues: oldParameter, newValues: savedNewParameter! });
    return savedNewParameter!;
  }

  async deleteParameter(
    id: number,
    actingUser: UserEntity,
    justification: string
  ): Promise<ParameterValueEntity> {
    console.log(
      `[ParameterService] Tentando deletar (logicamente) parâmetro ID: ${id}`
    );
    const parameter = await this.findParameterById(id);
    if (!parameter) {
      throw new Error(`Parâmetro com ID ${id} não encontrado.`);
    }
    if (parameter.dataFimEfetivo !== null) {
      throw new Error(`Parâmetro ID ${id} já está expirado/deletado.`);
    }

    if (
      parameter.competitionPeriod &&
      parameter.competitionPeriod.status !== 'PLANEJAMENTO'
    ) {
      throw new Error(
        `Parâmetro do período ${parameter.competitionPeriod.mesAno} (status ${parameter.competitionPeriod.status}) não pode ser deletado. Apenas expirado via atualização se necessário.`
      );
    }
    if (!justification) {
      throw new Error('Justificativa é obrigatória para deletar parâmetro.');
    }

    const todayString = this.formatDate(new Date());
    // Não pode deletar (expirar) se a data de início for no futuro.
    // A deleção lógica define o fim para hoje, então a meta precisa ter começado.
    if (new Date(parameter.dataInicioEfetivo) > new Date(todayString)) {
      throw new Error(
        `Não é possível marcar como deletado um parâmetro (${parameter.dataInicioEfetivo}) que ainda não iniciou sua vigência.`
      );
    }

    parameter.dataFimEfetivo = todayString;
    parameter.justificativa =
      `${parameter.justificativa || ''} (Deletado em ${todayString} por ${actingUser.nome}: ${justification})`.trim();

    const savedParameter = await this.parameterRepo.save(parameter);
    console.log(
      `[ParameterService] Parâmetro ID ${id} deletado logicamente em ${savedParameter.dataFimEfetivo}.`
    );
    // await this.auditLogService.registerLog('META_DELETADA', actingUser.id, actingUser.nome, { parameterId: id, justification });
    return savedParameter;
  }
}
