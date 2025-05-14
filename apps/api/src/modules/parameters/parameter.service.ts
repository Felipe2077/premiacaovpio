// apps/api/src/modules/parameters/parameter.service.ts (VERSÃO FINAL COM CRUD COMPLETO)
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { UserEntity } from '@/entity/user.entity';
import {
  CreateParameterDto,
  UpdateParameterDto,
} from '@sistema-premiacao/shared-types';
import 'reflect-metadata';
import {
  DeepPartial,
  FindOptionsWhere,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Or,
  Repository,
} from 'typeorm';
import { AuditLogService } from '../audit/audit.service';

export class ParameterService {
  private parameterRepo: Repository<ParameterValueEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private sectorRepo: Repository<SectorEntity>;
  private auditLogService: AuditLogService;

  constructor() {
    this.parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
    this.auditLogService = new AuditLogService(); // Supondo que AuditLogService está pronto para uso
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
    });

    const savedParameter = await this.parameterRepo.save(parameterToCreate);
    // await this.auditLogService.registerLog('META_CRIADA', actingUser.id, actingUser.nome, { newValues: savedParameter });
    console.log(
      `[ParameterService] Parâmetro/Meta criado com ID: ${savedParameter.id}`
    );
    return savedParameter;
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
    const competitionPeriod = await this.periodRepo.findOneBy({
      mesAno: periodMesAno,
    });
    if (!competitionPeriod) {
      return [];
    }

    const whereClause: FindOptionsWhere<ParameterValueEntity> = {
      competitionPeriodId: competitionPeriod.id,
    };

    if (onlyActive) {
      whereClause.dataInicioEfetivo = LessThanOrEqual(
        this.formatDate(competitionPeriod.dataFim)
      );
      whereClause.dataFimEfetivo = Or(
        IsNull(),
        MoreThanOrEqual(this.formatDate(competitionPeriod.dataInicio))
      );
    }

    if (sectorIdInput !== undefined) {
      whereClause.sectorId = sectorIdInput === null ? IsNull() : sectorIdInput;
    }
    if (criterionIdInput !== undefined) {
      whereClause.criterionId = criterionIdInput;
    }

    const parameters = await this.parameterRepo.find({
      where: whereClause,
      relations: ['criterio', 'setor', 'criadoPor', 'competitionPeriod'],
      order: {
        criterionId: 'ASC',
        sectorId: 'ASC',
        dataInicioEfetivo: 'DESC',
        createdAt: 'DESC',
      },
    });
    console.log(
      `[ParameterService] ${parameters.length} parâmetros encontrados para ${periodMesAno}.`
    );
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
      previousVersionId: oldParameter.id,
    };

    let savedNewParameter: ParameterValueEntity;
    await AppDataSource.manager.transaction(
      async (transactionalEntityManager) => {
        await transactionalEntityManager.save(
          ParameterValueEntity,
          oldParameter
        );
        console.log(
          `[ParameterService] Parâmetro antigo ID ${oldParameter.id} expirado em ${oldParameter.dataFimEfetivo}.`
        );
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
