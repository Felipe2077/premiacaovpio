// apps/api/src/modules/expurgos/expurgo.service.ts (VERSÃO CORRIGIDA E COMPLETA)
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ExpurgoEventEntity } from '@/entity/expurgo-event.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { UserEntity } from '@/entity/user.entity';
import {
  ApproveRejectExpurgoDto,
  CreateExpurgoDto,
  ExpurgoStatus,
  FindExpurgosDto,
} from '@sistema-premiacao/shared-types';
import 'reflect-metadata';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm'; // Removido In que não era usado
import { AuditLogService } from '../audit/audit.service';

export class ExpurgoService {
  private expurgoRepo: Repository<ExpurgoEventEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private sectorRepo: Repository<SectorEntity>;
  private auditLogService: AuditLogService;

  constructor() {
    this.expurgoRepo = AppDataSource.getRepository(ExpurgoEventEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
    this.auditLogService = new AuditLogService();
    console.log('[ExpurgoService] Instanciado e repositórios configurados.');
  }

  private formatDate(dateInput: Date | string | undefined | null): string {
    if (dateInput === null || dateInput === undefined) {
      throw new Error(
        'Data inválida ou não fornecida para formatação em formatDate.'
      );
    }
    try {
      const dateObject = new Date(dateInput);
      if (isNaN(dateObject.getTime())) {
        throw new Error(
          `Valor de data inválido fornecido para formatDate: ${dateInput}`
        );
      }
      return dateObject.toISOString().split('T')[0]!;
    } catch (e: unknown) {
      let errorMessage = `Erro ao formatar data: ${dateInput}`;
      if (e instanceof Error) {
        errorMessage += ` - ${e.message}`;
      }
      console.error(errorMessage, e);
      throw new Error('Formato de data inválido fornecido para formatDate.');
    }
  }

  private async validateCommonInputs(data: {
    competitionPeriodId: number;
    sectorId: number;
    criterionId: number;
  }): Promise<{
    period: CompetitionPeriodEntity;
    sector: SectorEntity;
    criterion: CriterionEntity;
  }> {
    const period = await this.periodRepo.findOneBy({
      id: data.competitionPeriodId,
    });
    if (!period)
      throw new Error(
        `Período de competição com ID ${data.competitionPeriodId} não encontrado.`
      );

    const sector = await this.sectorRepo.findOneBy({ id: data.sectorId });
    if (!sector)
      throw new Error(`Setor com ID ${data.sectorId} não encontrado.`);

    const criterion = await this.criterionRepo.findOneBy({
      id: data.criterionId,
    });
    if (!criterion)
      throw new Error(`Critério com ID ${data.criterionId} não encontrado.`);

    const elegibleCriteria = ['QUEBRA', 'DEFEITO', 'KM OCIOSA']; // Case insensitive
    if (!elegibleCriteria.includes(criterion.nome.toUpperCase())) {
      throw new Error(
        `Critério '${criterion.nome}' não é elegível para expurgo via este sistema.`
      );
    }
    return { period, sector, criterion };
  }

  async requestExpurgo(
    data: CreateExpurgoDto,
    requestingUser: UserEntity
  ): Promise<ExpurgoEventEntity> {
    console.log(
      `[ExpurgoService] Usuário ID ${requestingUser.id} solicitando expurgo:`,
      data
    );
    if (
      !data.competitionPeriodId ||
      !data.sectorId ||
      !data.criterionId ||
      !data.dataEvento ||
      !data.descricaoEvento ||
      !data.justificativaSolicitacao ||
      data.valorAjusteNumerico === undefined
    ) {
      throw new Error(
        'Campos obrigatórios para solicitar expurgo estão faltando no DTO.'
      );
    }
    await this.validateCommonInputs(data); // Valida IDs

    // A entidade ExpurgoEventEntity agora tem competitionPeriodId, etc.
    const newExpurgoData: DeepPartial<ExpurgoEventEntity> = {
      competitionPeriodId: data.competitionPeriodId,
      sectorId: data.sectorId,
      criterionId: data.criterionId,
      dataEvento: this.formatDate(data.dataEvento),
      descricaoEvento: data.descricaoEvento,
      justificativa: data.justificativaSolicitacao, // Nome na entidade é 'justificativa' para a solicitação
      valorAjusteNumerico: data.valorAjusteNumerico,
      status: ExpurgoStatus.PENDENTE,
      registradoPorUserId: requestingUser.id,
      // registradoEm é @CreateDateColumn
    };

    const newExpurgo = this.expurgoRepo.create(newExpurgoData);
    const savedExpurgo = await this.expurgoRepo.save(newExpurgo); // Salva um único objeto
    console.log(
      `[ExpurgoService] Solicitação de expurgo ID ${savedExpurgo.id} criada com status PENDENTE.`
    );
    // await this.auditLogService.registerLog('EXPURGO_SOLICITADO', requestingUser.id, requestingUser.nome, { expurgoId: savedExpurgo.id });
    return savedExpurgo; // Retorna ExpurgoEventEntity
  }

  async approveExpurgo(
    expurgoId: number,
    dto: ApproveRejectExpurgoDto,
    approvingUser: UserEntity
  ): Promise<ExpurgoEventEntity> {
    console.log(
      `[ExpurgoService] Usuário ID ${approvingUser.id} aprovando expurgo ID: ${expurgoId}`
    );
    const expurgo = await this.expurgoRepo.findOneBy({ id: expurgoId });
    if (!expurgo)
      throw new Error(
        `Solicitação de expurgo com ID ${expurgoId} não encontrada.`
      );
    if (expurgo.status !== ExpurgoStatus.PENDENTE) {
      throw new Error(
        `Solicitação de expurgo ID ${expurgoId} não está com status PENDENTE (status atual: ${expurgo.status}).`
      );
    }
    if (!dto.justificativaAprovacaoOuRejeicao) {
      throw new Error('Justificativa é obrigatória para aprovar expurgo.');
    }

    expurgo.status = ExpurgoStatus.APROVADO;
    expurgo.aprovadoPorUserId = approvingUser.id;
    expurgo.justificativaAprovacao = dto.justificativaAprovacaoOuRejeicao;
    expurgo.aprovadoEm = new Date(); // Usa 'aprovadoEm' como na entidade

    const updatedExpurgo = await this.expurgoRepo.save(expurgo);
    console.log(`[ExpurgoService] Expurgo ID ${updatedExpurgo.id} APROVADO.`);
    // await this.auditLogService.registerLog('EXPURGO_APROVADO', approvingUser.id, approvingUser.nome, { expurgoId: updatedExpurgo.id });
    return updatedExpurgo;
  }

  async rejectExpurgo(
    expurgoId: number,
    dto: ApproveRejectExpurgoDto,
    rejectingUser: UserEntity
  ): Promise<ExpurgoEventEntity> {
    console.log(
      `[ExpurgoService] Usuário ID ${rejectingUser.id} rejeitando expurgo ID: ${expurgoId}`
    );
    const expurgo = await this.expurgoRepo.findOneBy({ id: expurgoId });
    if (!expurgo)
      throw new Error(
        `Solicitação de expurgo com ID ${expurgoId} não encontrada.`
      );
    if (expurgo.status !== ExpurgoStatus.PENDENTE) {
      throw new Error(
        `Solicitação de expurgo ID ${expurgoId} não está com status PENDENTE (status atual: ${expurgo.status}).`
      );
    }
    if (!dto.justificativaAprovacaoOuRejeicao) {
      throw new Error('Justificativa é obrigatória para rejeitar expurgo.');
    }

    expurgo.status = ExpurgoStatus.REJEITADO;
    expurgo.aprovadoPorUserId = rejectingUser.id;
    expurgo.justificativaAprovacao = dto.justificativaAprovacaoOuRejeicao;
    expurgo.aprovadoEm = new Date(); // Usa 'aprovadoEm'

    const updatedExpurgo = await this.expurgoRepo.save(expurgo);
    console.log(`[ExpurgoService] Expurgo ID ${updatedExpurgo.id} REJEITADO.`);
    // await this.auditLogService.registerLog('EXPURGO_REJEITADO', rejectingUser.id, rejectingUser.nome, { expurgoId: updatedExpurgo.id });
    return updatedExpurgo;
  }

  async findExpurgoById(id: number): Promise<ExpurgoEventEntity | null> {
    console.log(`[ExpurgoService] Buscando expurgo por ID: ${id}`);
    return this.expurgoRepo.findOne({
      where: { id },
      relations: [
        'competitionPeriod',
        'sector',
        'criterion',
        'registradoPor',
        'aprovadoPor',
      ], // Usa nomes das PROPRIEDADES de relação
    });
  }

  async findExpurgos(filters: FindExpurgosDto): Promise<ExpurgoEventEntity[]> {
    console.log(`[ExpurgoService] Buscando expurgos com filtros:`, filters);
    const whereClause: FindOptionsWhere<ExpurgoEventEntity> = {};
    if (filters.competitionPeriodId)
      whereClause.competitionPeriodId = filters.competitionPeriodId;
    if (filters.sectorId) whereClause.sectorId = filters.sectorId;
    if (filters.criterionId) whereClause.criterionId = filters.criterionId;
    if (filters.status) whereClause.status = filters.status;

    return this.expurgoRepo.find({
      where: whereClause,
      relations: [
        'competitionPeriod',
        'sector',
        'criterion',
        'registradoPor',
        'aprovadoPor',
      ], // Usa nomes das PROPRIEDADES de relação
      order: { dataEvento: 'DESC', createdAt: 'DESC' }, // Usa 'registradoEm' para ordenação
    });
  }
}
