// apps/api/src/modules/expurgos/expurgo.service.ts (MÉTODO CONVERTTORESPONSEDTO PÚBLICO)

import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import {
  ExpurgoEventEntity,
  ExpurgoStatus,
} from '@/entity/expurgo-event.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { UserEntity } from '@/entity/user.entity';
import {
  ApproveRejectExpurgoDto,
  CreateExpurgoDto,
  ExpurgoResponseDto,
  FindExpurgosDto,
  validateApproveRejectExpurgo,
  validateCreateExpurgo,
} from '@sistema-premiacao/shared-types';
import 'reflect-metadata';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { AuditLogService } from '../audit/audit.service';

/**
 * Serviço responsável pela gestão completa de expurgos
 * Implementa o workflow: Solicitação → Análise → Aprovação/Rejeição
 */
export class ExpurgoService {
  private readonly expurgoRepo: Repository<ExpurgoEventEntity>;
  private readonly periodRepo: Repository<CompetitionPeriodEntity>;
  private readonly criterionRepo: Repository<CriterionEntity>;
  private readonly sectorRepo: Repository<SectorEntity>;
  private readonly userRepo: Repository<UserEntity>;
  private readonly auditLogService: AuditLogService;

  // Critérios elegíveis para expurgo
  private readonly ELIGIBLE_CRITERIA = [
    'QUEBRA',
    'DEFEITO',
    'KM OCIOSA',
    'FALTA FUNC',
    'ATRASO',
  ];

  constructor() {
    this.expurgoRepo = AppDataSource.getRepository(ExpurgoEventEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
    this.userRepo = AppDataSource.getRepository(UserEntity);
    this.auditLogService = new AuditLogService();

    console.log(
      '[ExpurgoService] Serviço inicializado com repositórios configurados.'
    );
  }

  // =====================================
  // MÉTODOS UTILITÁRIOS PRIVADOS
  // =====================================

  /**
   * Formata data para o padrão ISO (YYYY-MM-DD)
   */
  private formatDate(dateInput: Date | string): string {
    if (!dateInput) {
      throw new Error('Data não fornecida para formatação.');
    }

    try {
      const dateObject = new Date(dateInput);
      if (isNaN(dateObject.getTime())) {
        throw new Error(`Data inválida: ${dateInput}`);
      }
      return dateObject.toISOString().split('T')[0]!;
    } catch (error) {
      console.error('[ExpurgoService] Erro ao formatar data:', error);
      throw new Error(`Formato de data inválido: ${dateInput}`);
    }
  }

  /**
   * Valida se o critério é elegível para expurgo
   */
  private validateEligibleCriterion(criterionName: string): void {
    const upperCaseName = criterionName.toUpperCase().trim();

    if (!this.ELIGIBLE_CRITERIA.includes(upperCaseName)) {
      throw new Error(
        `Critério '${criterionName}' não é elegível para expurgo. ` +
          `Critérios elegíveis: ${this.ELIGIBLE_CRITERIA.join(', ')}`
      );
    }
  }

  /**
   * Valida se a data do evento está dentro do período de competição
   */
  private validateEventDateWithinPeriod(
    eventDate: string,
    period: CompetitionPeriodEntity
  ): void {
    const eventDateObj = new Date(eventDate);
    const periodStart = new Date(period.dataInicio);
    const periodEnd = new Date(period.dataFim);

    if (eventDateObj < periodStart || eventDateObj > periodEnd) {
      throw new Error(
        `Data do evento (${eventDate}) deve estar dentro do período de competição ` +
          `(${period.dataInicio} a ${period.dataFim})`
      );
    }
  }

  /**
   * Valida entidades relacionadas e suas regras de negócio
   */
  private async validateRelatedEntities(data: {
    competitionPeriodId: number;
    sectorId: number;
    criterionId: number;
    dataEvento: string;
  }): Promise<{
    period: CompetitionPeriodEntity;
    sector: SectorEntity;
    criterion: CriterionEntity;
  }> {
    console.log('[ExpurgoService] Validando entidades relacionadas:', data);

    // Buscar período
    const period = await this.periodRepo.findOne({
      where: { id: data.competitionPeriodId },
    });

    if (!period) {
      throw new Error(
        `Período de competição com ID ${data.competitionPeriodId} não encontrado.`
      );
    }

    // Validar se período permite expurgos (não pode estar fechado há muito tempo)
    if (period.status === 'FECHADA') {
      console.warn(
        `[ExpurgoService] Tentativa de expurgo em período fechado: ${period.mesAno}`
      );
      // Permitir por enquanto, mas registrar warning
    }

    // Buscar setor
    const sector = await this.sectorRepo.findOne({
      where: { id: data.sectorId, ativo: true },
    });

    if (!sector) {
      throw new Error(
        `Setor com ID ${data.sectorId} não encontrado ou não está ativo.`
      );
    }

    // Buscar critério
    const criterion = await this.criterionRepo.findOne({
      where: { id: data.criterionId, ativo: true },
    });

    if (!criterion) {
      throw new Error(
        `Critério com ID ${data.criterionId} não encontrado ou não está ativo.`
      );
    }

    // Validar elegibilidade do critério
    this.validateEligibleCriterion(criterion.nome);

    // Validar data do evento
    this.validateEventDateWithinPeriod(data.dataEvento, period);

    console.log(
      '[ExpurgoService] Validação de entidades concluída com sucesso.'
    );

    return { period, sector, criterion };
  }

  // =====================================
  // MÉTODO PÚBLICO PARA CONVERSÃO
  // =====================================

  /**
   * ⭐ MÉTODO TORNADO PÚBLICO
   * Converte entity para DTO de resposta
   */
  public convertToResponseDto(entity: ExpurgoEventEntity): ExpurgoResponseDto {
    return {
      id: entity.id,
      competitionPeriodId: entity.competitionPeriodId,
      competitionPeriod: entity.competitionPeriod
        ? {
            id: entity.competitionPeriod.id,
            mesAno: entity.competitionPeriod.mesAno,
            status: entity.competitionPeriod.status,
          }
        : undefined,
      sectorId: entity.sectorId,
      sector: entity.sector
        ? {
            id: entity.sector.id,
            nome: entity.sector.nome,
          }
        : undefined,
      criterionId: entity.criterionId,
      criterion: entity.criterion
        ? {
            id: entity.criterion.id,
            nome: entity.criterion.nome,
            unidade_medida: entity.criterion.unidade_medida,
          }
        : undefined,
      dataEvento: entity.dataEvento,
      descricaoEvento: entity.descricaoEvento,
      justificativaSolicitacao: entity.justificativaSolicitacao,
      status: entity.status,
      valorAjusteNumerico: entity.valorAjusteNumerico,
      registradoPorUserId: entity.registradoPorUserId,
      registradoPor: entity.registradoPor
        ? {
            id: entity.registradoPor.id,
            nome: entity.registradoPor.nome,
            email: entity.registradoPor.email,
          }
        : undefined,
      aprovadoPorUserId: entity.aprovadoPorUserId,
      aprovadoPor: entity.aprovadoPor
        ? {
            id: entity.aprovadoPor.id,
            nome: entity.aprovadoPor.nome,
            email: entity.aprovadoPor.email,
          }
        : undefined,
      aprovadoEm: entity.aprovadoEm,
      justificativaAprovacao: entity.justificativaAprovacao,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  // =====================================
  // MÉTODOS PÚBLICOS - CRUD
  // =====================================

  /**
   * Solicita um novo expurgo
   */
  async requestExpurgo(
    data: CreateExpurgoDto,
    requestingUser: UserEntity
  ): Promise<ExpurgoResponseDto> {
    console.log(
      `[ExpurgoService] Usuário ${requestingUser.id} (${requestingUser.nome}) ` +
        `solicitando expurgo:`,
      { ...data, valorAjusteNumerico: data.valorAjusteNumerico }
    );

    try {
      // Validar dados de entrada
      const validatedData = validateCreateExpurgo(data);

      // Validar entidades relacionadas
      const { period, sector, criterion } = await this.validateRelatedEntities({
        competitionPeriodId: validatedData.competitionPeriodId,
        sectorId: validatedData.sectorId,
        criterionId: validatedData.criterionId,
        dataEvento: validatedData.dataEvento,
      });

      // Verificar se não existe expurgo pendente para mesma combinação
      const existingPendingExpurgo = await this.expurgoRepo.findOne({
        where: {
          competitionPeriodId: validatedData.competitionPeriodId,
          sectorId: validatedData.sectorId,
          criterionId: validatedData.criterionId,
          dataEvento: validatedData.dataEvento,
          status: ExpurgoStatus.PENDENTE,
        },
      });

      if (existingPendingExpurgo) {
        throw new Error(
          `Já existe um expurgo pendente para o critério '${criterion.nome}' ` +
            `do setor '${sector.nome}' na data ${validatedData.dataEvento}. ` +
            `ID do expurgo existente: ${existingPendingExpurgo.id}`
        );
      }

      // Criar nova solicitação de expurgo
      const newExpurgo = this.expurgoRepo.create({
        competitionPeriodId: validatedData.competitionPeriodId,
        sectorId: validatedData.sectorId,
        criterionId: validatedData.criterionId,
        dataEvento: this.formatDate(validatedData.dataEvento),
        descricaoEvento: validatedData.descricaoEvento.trim(),
        justificativaSolicitacao: validatedData.justificativaSolicitacao.trim(),
        valorAjusteNumerico: validatedData.valorAjusteNumerico,
        status: ExpurgoStatus.PENDENTE,
        registradoPorUserId: requestingUser.id,
      });

      const savedExpurgo = await this.expurgoRepo.save(newExpurgo);

      // Registrar auditoria
      await this.auditLogService.createLog({
        userId: requestingUser.id,
        userName: requestingUser.nome,
        actionType: 'EXPURGO_SOLICITADO',
        entityType: 'ExpurgoEventEntity',
        entityId: savedExpurgo.id.toString(),
        details: {
          criterionName: criterion.nome,
          sectorName: sector.nome,
          periodMesAno: period.mesAno,
          valorAjuste: validatedData.valorAjusteNumerico,
          dataEvento: validatedData.dataEvento,
        },
        justification: validatedData.justificativaSolicitacao,
        competitionPeriodId: validatedData.competitionPeriodId,
      });

      console.log(
        `[ExpurgoService] Expurgo ID ${savedExpurgo.id} criado com sucesso ` +
          `para ${criterion.nome} - ${sector.nome} - ${period.mesAno}`
      );

      // Carregar relações para resposta completa
      const expurgoWithRelations = await this.findExpurgoById(savedExpurgo.id);
      if (!expurgoWithRelations) {
        throw new Error('Erro interno: expurgo criado mas não encontrado.');
      }

      return this.convertToResponseDto(expurgoWithRelations);
    } catch (error: any) {
      console.error('[ExpurgoService] Erro ao criar expurgo:', error);
      throw error;
    }
  }

  /**
   * Aprova um expurgo pendente
   */
  async approveExpurgo(
    expurgoId: number,
    dto: ApproveRejectExpurgoDto,
    approvingUser: UserEntity
  ): Promise<ExpurgoResponseDto> {
    console.log(
      `[ExpurgoService] Usuário ${approvingUser.id} (${approvingUser.nome}) ` +
        `aprovando expurgo ID: ${expurgoId}`
    );

    try {
      // Validar dados de entrada
      const validatedData = validateApproveRejectExpurgo(dto);

      // Buscar expurgo
      const expurgo = await this.findExpurgoById(expurgoId);
      if (!expurgo) {
        throw new Error(`Expurgo com ID ${expurgoId} não encontrado.`);
      }

      // Validar se pode ser aprovado
      if (!expurgo.canBeReviewed()) {
        throw new Error(
          `Expurgo ID ${expurgoId} não pode ser aprovado. ` +
            `Status atual: ${expurgo.getStatusDescription()}`
        );
      }

      // Validar se não é auto-aprovação (regra de negócio)
      if (expurgo.registradoPorUserId === approvingUser.id) {
        throw new Error(
          'Usuário não pode aprovar expurgo solicitado por ele mesmo.'
        );
      }

      // Atualizar status e dados de aprovação
      expurgo.status = ExpurgoStatus.APROVADO;
      expurgo.aprovadoPorUserId = approvingUser.id;
      expurgo.justificativaAprovacao =
        validatedData.justificativaAprovacaoOuRejeicao.trim();
      expurgo.aprovadoEm = new Date();

      const updatedExpurgo = await this.expurgoRepo.save(expurgo);

      // Registrar auditoria
      await this.auditLogService.createLog({
        userId: approvingUser.id,
        userName: approvingUser.nome,
        actionType: 'EXPURGO_APROVADO',
        entityType: 'ExpurgoEventEntity',
        entityId: updatedExpurgo.id.toString(),
        details: {
          originalSolicitante: expurgo.registradoPor?.nome || 'Desconhecido',
          criterionName: expurgo.criterion?.nome || 'Desconhecido',
          sectorName: expurgo.sector?.nome || 'Desconhecido',
          valorAjuste: expurgo.valorAjusteNumerico,
          dataEvento: expurgo.dataEvento,
        },
        justification: validatedData.justificativaAprovacaoOuRejeicao,
        competitionPeriodId: expurgo.competitionPeriodId,
      });

      console.log(
        `[ExpurgoService] Expurgo ID ${updatedExpurgo.id} APROVADO por ` +
          `${approvingUser.nome}`
      );

      return this.convertToResponseDto(updatedExpurgo);
    } catch (error: any) {
      console.error(
        `[ExpurgoService] Erro ao aprovar expurgo ${expurgoId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Rejeita um expurgo pendente
   */
  async rejectExpurgo(
    expurgoId: number,
    dto: ApproveRejectExpurgoDto,
    rejectingUser: UserEntity
  ): Promise<ExpurgoResponseDto> {
    console.log(
      `[ExpurgoService] Usuário ${rejectingUser.id} (${rejectingUser.nome}) ` +
        `rejeitando expurgo ID: ${expurgoId}`
    );

    try {
      // Validar dados de entrada
      const validatedData = validateApproveRejectExpurgo(dto);

      // Buscar expurgo
      const expurgo = await this.findExpurgoById(expurgoId);
      if (!expurgo) {
        throw new Error(`Expurgo com ID ${expurgoId} não encontrado.`);
      }

      // Validar se pode ser rejeitado
      if (!expurgo.canBeReviewed()) {
        throw new Error(
          `Expurgo ID ${expurgoId} não pode ser rejeitado. ` +
            `Status atual: ${expurgo.getStatusDescription()}`
        );
      }

      // Atualizar status e dados de rejeição
      expurgo.status = ExpurgoStatus.REJEITADO;
      expurgo.aprovadoPorUserId = rejectingUser.id;
      expurgo.justificativaAprovacao =
        validatedData.justificativaAprovacaoOuRejeicao.trim();
      expurgo.aprovadoEm = new Date();

      const updatedExpurgo = await this.expurgoRepo.save(expurgo);

      // Registrar auditoria
      await this.auditLogService.createLog({
        userId: rejectingUser.id,
        userName: rejectingUser.nome,
        actionType: 'EXPURGO_REJEITADO',
        entityType: 'ExpurgoEventEntity',
        entityId: updatedExpurgo.id.toString(),
        details: {
          originalSolicitante: expurgo.registradoPor?.nome || 'Desconhecido',
          criterionName: expurgo.criterion?.nome || 'Desconhecido',
          sectorName: expurgo.sector?.nome || 'Desconhecido',
          valorAjuste: expurgo.valorAjusteNumerico,
          dataEvento: expurgo.dataEvento,
        },
        justification: validatedData.justificativaAprovacaoOuRejeicao,
        competitionPeriodId: expurgo.competitionPeriodId,
      });

      console.log(
        `[ExpurgoService] Expurgo ID ${updatedExpurgo.id} REJEITADO por ` +
          `${rejectingUser.nome}`
      );

      return this.convertToResponseDto(updatedExpurgo);
    } catch (error: any) {
      console.error(
        `[ExpurgoService] Erro ao rejeitar expurgo ${expurgoId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Busca expurgo por ID com todas as relações
   */
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
      ],
    });
  }

  /**
   * Busca expurgos com filtros
   */
  async findExpurgos(
    filters: FindExpurgosDto = {}
  ): Promise<ExpurgoResponseDto[]> {
    console.log('[ExpurgoService] Buscando expurgos com filtros:', filters);

    try {
      const whereClause: FindOptionsWhere<ExpurgoEventEntity> = {};

      // Aplicar filtros
      if (filters.competitionPeriodId) {
        whereClause.competitionPeriodId = filters.competitionPeriodId;
      }

      if (filters.sectorId) {
        whereClause.sectorId = filters.sectorId;
      }

      if (filters.criterionId) {
        whereClause.criterionId = filters.criterionId;
      }

      if (filters.status) {
        whereClause.status = filters.status;
      }

      // Filtro por range de datas
      if (filters.dataEventoInicio && filters.dataEventoFim) {
        whereClause.dataEvento = Between(
          filters.dataEventoInicio,
          filters.dataEventoFim
        );
      } else if (filters.dataEventoInicio) {
        whereClause.dataEvento = filters.dataEventoInicio;
      }

      const expurgos = await this.expurgoRepo.find({
        where: whereClause,
        relations: [
          'competitionPeriod',
          'sector',
          'criterion',
          'registradoPor',
          'aprovadoPor',
        ],
        order: {
          dataEvento: 'DESC',
          createdAt: 'DESC',
        },
      });

      console.log(`[ExpurgoService] Encontrados ${expurgos.length} expurgos`);

      return expurgos.map((expurgo) => this.convertToResponseDto(expurgo));
    } catch (error: any) {
      console.error('[ExpurgoService] Erro ao buscar expurgos:', error);
      throw new Error(`Erro ao buscar expurgos: ${error.message}`);
    }
  }

  // =====================================
  // MÉTODOS DE RELATÓRIOS E ESTATÍSTICAS
  // =====================================

  /**
   * Busca expurgos por período de competição
   */
  async findExpurgosByPeriod(
    periodMesAno: string
  ): Promise<ExpurgoResponseDto[]> {
    console.log(
      `[ExpurgoService] Buscando expurgos para período: ${periodMesAno}`
    );

    const period = await this.periodRepo.findOne({
      where: { mesAno: periodMesAno },
    });

    if (!period) {
      throw new Error(`Período ${periodMesAno} não encontrado.`);
    }

    return this.findExpurgos({ competitionPeriodId: period.id });
  }

  /**
   * Busca expurgos aprovados por período (para aplicação no cálculo)
   */
  async findApprovedExpurgosByPeriod(
    periodMesAno: string
  ): Promise<ExpurgoResponseDto[]> {
    console.log(
      `[ExpurgoService] Buscando expurgos APROVADOS para período: ${periodMesAno}`
    );

    const period = await this.periodRepo.findOne({
      where: { mesAno: periodMesAno },
    });

    if (!period) {
      throw new Error(`Período ${periodMesAno} não encontrado.`);
    }

    return this.findExpurgos({
      competitionPeriodId: period.id,
      status: ExpurgoStatus.APROVADO,
    });
  }

  /**
   * Estatísticas de expurgos por período
   */
  async getExpurgoStatistics(periodMesAno?: string): Promise<{
    total: number;
    pendentes: number;
    aprovados: number;
    rejeitados: number;
    byCriterion: Record<string, number>;
    bySector: Record<string, number>;
    valorTotalAjustes: number;
  }> {
    console.log(
      `[ExpurgoService] Gerando estatísticas${periodMesAno ? ` para ${periodMesAno}` : ''}`
    );

    const filters: FindExpurgosDto = {};

    if (periodMesAno) {
      const period = await this.periodRepo.findOne({
        where: { mesAno: periodMesAno },
      });

      if (!period) {
        throw new Error(`Período ${periodMesAno} não encontrado.`);
      }

      filters.competitionPeriodId = period.id;
    }

    const expurgos = await this.findExpurgos(filters);

    const stats = {
      total: expurgos.length,
      pendentes: expurgos.filter((e) => e.status === ExpurgoStatus.PENDENTE)
        .length,
      aprovados: expurgos.filter((e) => e.status === ExpurgoStatus.APROVADO)
        .length,
      rejeitados: expurgos.filter((e) => e.status === ExpurgoStatus.REJEITADO)
        .length,
      byCriterion: {} as Record<string, number>,
      bySector: {} as Record<string, number>,
      valorTotalAjustes: 0,
    };

    // Calcular estatísticas detalhadas
    expurgos.forEach((expurgo) => {
      // Por critério
      const criterionName = expurgo.criterion?.nome || 'Desconhecido';
      stats.byCriterion[criterionName] =
        (stats.byCriterion[criterionName] || 0) + 1;

      // Por setor
      const sectorName = expurgo.sector?.nome || 'Desconhecido';
      stats.bySector[sectorName] = (stats.bySector[sectorName] || 0) + 1;

      // Valor total de ajustes (apenas aprovados)
      if (expurgo.status === ExpurgoStatus.APROVADO) {
        stats.valorTotalAjustes += Math.abs(expurgo.valorAjusteNumerico);
      }
    });

    return stats;
  }

  // =====================================
  // MÉTODOS DE MANUTENÇÃO
  // =====================================

  /**
   * Cancela expurgo pendente (apenas pelo próprio solicitante)
   */
  async cancelExpurgo(
    expurgoId: number,
    cancelingUser: UserEntity,
    reason: string
  ): Promise<ExpurgoResponseDto> {
    console.log(
      `[ExpurgoService] Usuário ${cancelingUser.id} cancelando expurgo ${expurgoId}`
    );

    const expurgo = await this.findExpurgoById(expurgoId);
    if (!expurgo) {
      throw new Error(`Expurgo com ID ${expurgoId} não encontrado.`);
    }

    // Validar permissões
    if (expurgo.registradoPorUserId !== cancelingUser.id) {
      throw new Error('Apenas o solicitante pode cancelar o expurgo.');
    }

    if (!expurgo.isPendente()) {
      throw new Error(
        `Expurgo não pode ser cancelado. Status atual: ${expurgo.getStatusDescription()}`
      );
    }

    // "Cancelar" = Rejeitar com justificativa especial
    expurgo.status = ExpurgoStatus.REJEITADO;
    expurgo.aprovadoPorUserId = cancelingUser.id;
    expurgo.justificativaAprovacao = `CANCELADO PELO SOLICITANTE: ${reason.trim()}`;
    expurgo.aprovadoEm = new Date();

    const updatedExpurgo = await this.expurgoRepo.save(expurgo);

    // Registrar auditoria
    await this.auditLogService.createLog({
      userId: cancelingUser.id,
      userName: cancelingUser.nome,
      actionType: 'EXPURGO_CANCELADO',
      entityType: 'ExpurgoEventEntity',
      entityId: updatedExpurgo.id.toString(),
      justification: reason,
      competitionPeriodId: expurgo.competitionPeriodId,
    });

    return this.convertToResponseDto(updatedExpurgo);
  }

  /**
   * Valida consistência dos dados de expurgo
   */
  async validateExpurgoData(): Promise<{
    inconsistencies: Array<{
      expurgoId: number;
      issue: string;
    }>;
    totalChecked: number;
  }> {
    console.log(
      '[ExpurgoService] Validando consistência dos dados de expurgo...'
    );

    const allExpurgos = await this.expurgoRepo.find({
      relations: ['competitionPeriod', 'sector', 'criterion'],
    });

    const inconsistencies: Array<{ expurgoId: number; issue: string }> = [];

    for (const expurgo of allExpurgos) {
      // Verificar relações
      if (!expurgo.competitionPeriod) {
        inconsistencies.push({
          expurgoId: expurgo.id,
          issue: 'Período de competição não encontrado',
        });
      }

      if (!expurgo.sector) {
        inconsistencies.push({
          expurgoId: expurgo.id,
          issue: 'Setor não encontrado',
        });
      }

      if (!expurgo.criterion) {
        inconsistencies.push({
          expurgoId: expurgo.id,
          issue: 'Critério não encontrado',
        });
      }

      // Verificar valores
      if (expurgo.valorAjusteNumerico === 0) {
        inconsistencies.push({
          expurgoId: expurgo.id,
          issue: 'Valor de ajuste é zero',
        });
      }

      // Verificar aprovações órfãs
      if (expurgo.aprovadoPorUserId && !expurgo.aprovadoEm) {
        inconsistencies.push({
          expurgoId: expurgo.id,
          issue: 'Aprovado por usuário mas sem timestamp de aprovação',
        });
      }
    }

    return {
      inconsistencies,
      totalChecked: allExpurgos.length,
    };
  }
}
