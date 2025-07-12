// apps/api/src/modules/expurgos/expurgo.service.ts

import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ExpurgoAutomationHook } from './expurgo-automation.hook';

import {
  ExpurgoEventEntity,
  ExpurgoStatus,
} from '@/entity/expurgo-event.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { UserEntity } from '@/entity/user.entity';
import {
  ApproveExpurgoDto,
  CreateExpurgoDto,
  ExpurgoResponseDto,
  ExpurgoStatisticsDto,
  FindExpurgosDto,
  RejectExpurgoDto,
  validateApproveExpurgo,
  validateCreateExpurgo,
  validateRejectExpurgo,
} from '@sistema-premiacao/shared-types';
import 'reflect-metadata';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { AuditLogService } from '../audit/audit.service';
import { QueueService } from '../queue/queue.service';
import { ExpurgoAttachmentService } from './expurgo-attachment.service';

/**
 * Serviço responsável pela gestão completa de expurgos
 * Implementa o workflow: Solicitação → Análise → Aprovação/Rejeição (com valores flexíveis)
 * Integrado com sistema de anexos e validação de roles
 */
export class ExpurgoService {
  private readonly expurgoRepo: Repository<ExpurgoEventEntity>;
  private readonly periodRepo: Repository<CompetitionPeriodEntity>;
  private readonly criterionRepo: Repository<CriterionEntity>;
  private readonly sectorRepo: Repository<SectorEntity>;
  private readonly userRepo: Repository<UserEntity>;
  private readonly auditLogService: AuditLogService;
  private readonly attachmentService: ExpurgoAttachmentService;
  private readonly automationHook: ExpurgoAutomationHook;
  private readonly queueService: QueueService;

  // Critérios elegíveis para expurgo
  private readonly ELIGIBLE_CRITERIA = [
    'QUEBRA',
    'DEFEITO',
    'KM OCIOSA',
    'FALTA FUNC',
    'ATRASO',
    'PEÇAS',
    'PNEUS',
  ];

  constructor() {
    this.expurgoRepo = AppDataSource.getRepository(ExpurgoEventEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
    this.userRepo = AppDataSource.getRepository(UserEntity);
    this.auditLogService = new AuditLogService();
    this.attachmentService = new ExpurgoAttachmentService();
    this.automationHook = new ExpurgoAutomationHook();
    this.queueService = new QueueService();

    console.log(
      '[ExpurgoService] Serviço inicializado com repositórios e serviços configurados.'
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
   * 🆕 Valida permissões baseadas em roles (preparado para quando roles estiverem implementadas)
   */
  private async validateUserPermissions(
    user: UserEntity,
    action: 'REQUEST' | 'APPROVE' | 'REJECT',
    targetSectorId?: number
  ): Promise<void> {
    // TODO: Implementar validação real quando sistema de roles estiver funcionando

    // Regras futuras:
    // - REQUEST: Usuário deve ter role GERENTE e estar associado ao setor
    // - APPROVE/REJECT: Usuário deve ter role DIRETOR

    console.log(
      `[ExpurgoService] Validando permissões: User ${user.id}, Action: ${action}, Setor: ${targetSectorId}`
    );

    // Por enquanto, apenas log - implementação completa virá quando roles estiverem funcionando

    // Exemplo de validação futura:
    // if (action === 'REQUEST') {
    //   const userSector = await this.getUserSector(user.id);
    //   if (userSector?.id !== targetSectorId) {
    //     throw new Error('Usuário só pode solicitar expurgos para seu próprio setor');
    //   }
    // }

    // if (action === 'APPROVE' || action === 'REJECT') {
    //   const hasDirectorRole = await this.userHasRole(user.id, 'DIRETOR');
    //   if (!hasDirectorRole) {
    //     throw new Error('Apenas diretores podem aprovar/rejeitar expurgos');
    //   }
    // }
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

    // Validar se período permite expurgos
    if (period.status === 'FECHADA') {
      // Permitir, mas registrar warning
      console.warn(
        `[ExpurgoService] Expurgo solicitado para período fechado: ${period.mesAno}`
      );
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

  /**
   * 🆕 Determina status baseado no valor aprovado vs solicitado
   */
  private determineApprovalStatus(
    valorSolicitado: number,
    valorAprovado: number
  ): ExpurgoStatus {
    const solicitadoAbs = Math.abs(valorSolicitado);
    const aprovadoAbs = Math.abs(valorAprovado);

    if (aprovadoAbs >= solicitadoAbs) {
      return ExpurgoStatus.APROVADO; // Aprovação integral
    } else {
      return ExpurgoStatus.APROVADO_PARCIAL; // Aprovação parcial
    }
  }

  // =====================================
  // MÉTODO PÚBLICO PARA CONVERSÃO
  // =====================================

  /**
   * Converte entity para DTO de resposta (ATUALIZADO)
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

      // 🆕 VALORES SEPARADOS
      valorSolicitado: entity.valorSolicitado,
      valorAprovado: entity.valorAprovado,

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

      // 🆕 DADOS DE ANEXOS
      anexos: entity.anexos?.map((anexo) => ({
        id: anexo.id,
        originalFileName: anexo.originalFileName,
        fileSize: anexo.fileSize,
        mimeType: anexo.mimeType,
        uploadedAt: anexo.uploadedAt,
        uploadedBy: anexo.uploadedBy
          ? {
              id: anexo.uploadedBy.id,
              nome: anexo.uploadedBy.nome,
            }
          : undefined,
        description: anexo.description,
        downloadUrl: `/api/expurgos/anexos/${anexo.id}/download`, // URL para download
      })),
      quantidadeAnexos: entity.getQuantidadeAnexos(),

      // 🆕 CAMPOS CALCULADOS
      percentualAprovacao: entity.getPercentualAprovacao(),
      valorEfetivo: entity.getValorEfetivo(),
      houveReducao: entity.houveReducaoValor(),

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  // =====================================
  // MÉTODOS PÚBLICOS - CRUD ATUALIZADOS
  // =====================================

  /**
   * Solicita um novo expurgo (ATUALIZADO)
   */
  async requestExpurgo(
    data: CreateExpurgoDto,
    requestingUser: UserEntity
  ): Promise<ExpurgoResponseDto> {
    console.log(
      `[ExpurgoService] Usuário ${requestingUser.id} (${requestingUser.nome}) ` +
        `solicitando expurgo:`,
      { ...data, valorSolicitado: data.valorSolicitado }
    );

    try {
      // Validar dados de entrada
      const validatedData = validateCreateExpurgo(data);

      // 🆕 Validar permissões do usuário
      await this.validateUserPermissions(
        requestingUser,
        'REQUEST',
        validatedData.sectorId
      );

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
        valorSolicitado: validatedData.valorSolicitado, // 🆕 CAMPO ATUALIZADO
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
          valorSolicitado: validatedData.valorSolicitado, // 🆕 ATUALIZADO
          dataEvento: validatedData.dataEvento,
        },
        justification: validatedData.justificativaSolicitacao,
        competitionPeriodId: validatedData.competitionPeriodId,
      });

      this.queueService.addNotificationJob({
        recipient: { userRole: 'DIRETOR' },
        type: 'EXPURGO_SOLICITADO',
        message: `O gerente ${requestingUser.nome} solicitou um novo expurgo para o setor ${sector.nome}.`,
        link: `/admin/expurgos/${savedExpurgo.id}`
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
   * 🆕 Aprova um expurgo com valor customizado
   */
  async approveExpurgoWithValue(
    expurgoId: number,
    dto: ApproveExpurgoDto,
    approvingUser: UserEntity
  ): Promise<ExpurgoResponseDto> {
    console.log(
      `[ExpurgoService] Usuário ${approvingUser.id} (${approvingUser.nome}) ` +
        `aprovando expurgo ID: ${expurgoId} com valor: ${dto.valorAprovado}`
    );

    try {
      // Validar dados de entrada
      const validatedData = validateApproveExpurgo(dto);

      // 🆕 Validar permissões do usuário
      await this.validateUserPermissions(approvingUser, 'APPROVE');

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

      // Validar se não é auto-aprovação
      if (expurgo.registradoPorUserId === approvingUser.id) {
        throw new Error(
          'Usuário não pode aprovar expurgo solicitado por ele mesmo.'
        );
      }

      // 🆕 Validar valor aprovado vs solicitado
      const valorSolicitadoAbs = Math.abs(expurgo.valorSolicitado);
      const valorAprovadoAbs = Math.abs(validatedData.valorAprovado);

      if (valorAprovadoAbs > valorSolicitadoAbs) {
        throw new Error(
          `Valor aprovado (${valorAprovadoAbs}) não pode ser maior que o valor solicitado (${valorSolicitadoAbs})`
        );
      }

      // 🆕 Determinar status baseado nos valores
      const newStatus = this.determineApprovalStatus(
        expurgo.valorSolicitado,
        validatedData.valorAprovado
      );

      // Atualizar expurgo
      expurgo.status = newStatus;
      expurgo.valorAprovado = validatedData.valorAprovado; // 🆕 CAMPO NOVO
      expurgo.aprovadoPorUserId = approvingUser.id;
      expurgo.justificativaAprovacao =
        validatedData.justificativaAprovacao.trim();
      expurgo.aprovadoEm = new Date();

      const updatedExpurgo = await this.expurgoRepo.save(expurgo);

      // Registrar auditoria
      await this.auditLogService.createLog({
        userId: approvingUser.id,
        userName: approvingUser.nome,
        actionType:
          newStatus === ExpurgoStatus.APROVADO
            ? 'EXPURGO_APROVADO_INTEGRAL'
            : 'EXPURGO_APROVADO_PARCIAL',
        entityType: 'ExpurgoEventEntity',
        entityId: updatedExpurgo.id.toString(),
        details: {
          originalSolicitante: expurgo.registradoPor?.nome || 'Desconhecido',
          criterionName: expurgo.criterion?.nome || 'Desconhecido',
          sectorName: expurgo.sector?.nome || 'Desconhecido',
          valorSolicitado: expurgo.valorSolicitado,
          valorAprovado: validatedData.valorAprovado,
          percentualAprovacao: updatedExpurgo.getPercentualAprovacao(),
          dataEvento: expurgo.dataEvento,
        },
        justification: validatedData.justificativaAprovacao,
        competitionPeriodId: expurgo.competitionPeriodId,
      });

      this.queueService.addNotificationJob({
        recipient: { userId: expurgo.registradoPorUserId },
        type: 'EXPURGO_APROVADO',
        message: `Seu expurgo para o critério "${expurgo.criterion?.nome}" foi aprovado.`,
        link: `/expurgos/${updatedExpurgo.id}`
      });

      console.log(
        `[ExpurgoService] Expurgo ID ${updatedExpurgo.id} ${newStatus} por ` +
          `${approvingUser.nome} - Valor: ${validatedData.valorAprovado}/${expurgo.valorSolicitado}`
      );

      // 🚀 ===== DISPARO AUTOMÁTICO DO RECÁLCULO =====
      console.log(
        `[ExpurgoService] 🚀 Disparando recálculo automático pós-aprovação...`
      );

      // Executa de forma assíncrona para não bloquear a resposta ao usuário
      this.automationHook
        .onExpurgoApproved(expurgoId, approvingUser.id)
        .then(() => {
          console.log(
            `[ExpurgoService] ✅ Recálculo automático concluído para expurgo ${expurgoId}`
          );
        })
        .catch((error) => {
          console.error(
            `[ExpurgoService] ❌ Erro no recálculo automático para expurgo ${expurgoId}:`,
            error
          );
          // Em produção, você pode querer enviar notificação para administradores
          // await this.notifyAdministrators('Falha no recálculo automático', error, expurgoId);
        });

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
   * Método auxiliar para verificar se sistema está pronto para automação
   * Útil para validações antes de operações críticas
   */
  async isSystemReadyForAutomation(): Promise<boolean> {
    try {
      return await this.automationHook.isSystemReadyForAutomation();
    } catch (error) {
      console.error(
        '[ExpurgoService] Erro ao verificar prontidão do sistema para automação:',
        error
      );
      return false;
    }
  }

  /**
   * Método para testar conectividade com sistema de automação
   * Útil para healthchecks e diagnósticos
   */
  async testAutomationConnectivity(): Promise<{
    isReady: boolean;
    activePeriod: string | null;
    error?: string;
  }> {
    try {
      const isReady = await this.isSystemReadyForAutomation();

      if (isReady) {
        // Buscar informações da vigência ativa para diagnóstico
        const activePeriod = await this.periodRepo.findOne({
          where: { status: 'ATIVA' },
        });

        return {
          isReady: true,
          activePeriod: activePeriod?.mesAno || null,
        };
      } else {
        return {
          isReady: false,
          activePeriod: null,
          error: 'Nenhuma vigência ativa encontrada ou sistema não pronto',
        };
      }
    } catch (error) {
      console.error(
        '[ExpurgoService] Erro ao testar conectividade com automação:',
        error
      );
      return {
        isReady: false,
        activePeriod: null,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  // ===== MÉTODO OPCIONAL: Disparo manual de recálculo =====
  /**
   * Permite disparar recálculo manual para um expurgo específico
   * Útil para casos de erro ou necessidade de reprocessamento
   */
  async triggerManualRecalculation(
    expurgoId: number,
    triggeringUser: UserEntity,
    reason: string = 'Recálculo manual solicitado'
  ): Promise<{ success: boolean; message: string; error?: string }> {
    console.log(
      `[ExpurgoService] Usuário ${triggeringUser.id} solicitou recálculo manual para expurgo ${expurgoId}`
    );

    try {
      // Verificar se expurgo existe e está aprovado
      const expurgo = await this.findExpurgoById(expurgoId);
      if (!expurgo) {
        throw new Error(`Expurgo com ID ${expurgoId} não encontrado`);
      }

      if (!expurgo.isAprovado()) {
        throw new Error(
          `Expurgo ${expurgoId} não está aprovado. Status: ${expurgo.getStatusDescription()}`
        );
      }

      // Verificar se sistema está pronto
      const systemReady = await this.isSystemReadyForAutomation();
      if (!systemReady) {
        throw new Error(
          'Sistema de automação não está pronto (nenhuma vigência ativa)'
        );
      }

      // Registrar auditoria da solicitação manual
      await this.auditLogService.createLog({
        userId: triggeringUser.id,
        userName: triggeringUser.nome,
        actionType: 'RECALCULO_MANUAL_SOLICITADO',
        entityType: 'ExpurgoEventEntity',
        entityId: expurgoId.toString(),
        details: {
          reason,
          expurgoStatus: expurgo.status,
          valorAprovado: expurgo.valorAprovado,
        },
        justification: reason,
        competitionPeriodId: expurgo.competitionPeriodId,
      });

      // Disparar recálculo
      await this.automationHook.onExpurgoApproved(expurgoId, triggeringUser.id);

      return {
        success: true,
        message: 'Recálculo manual disparado com sucesso',
      };
    } catch (error) {
      console.error(
        `[ExpurgoService] Erro no recálculo manual para expurgo ${expurgoId}:`,
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      return {
        success: false,
        message: 'Falha ao disparar recálculo manual',
        error: errorMessage,
      };
    }
  }

  /**
   * 🆕 Rejeita um expurgo
   */
  async rejectExpurgo(
    expurgoId: number,
    dto: RejectExpurgoDto,
    rejectingUser: UserEntity
  ): Promise<ExpurgoResponseDto> {
    console.log(
      `[ExpurgoService] Usuário ${rejectingUser.id} (${rejectingUser.nome}) ` +
        `rejeitando expurgo ID: ${expurgoId}`
    );

    try {
      // Validar dados de entrada
      const validatedData = validateRejectExpurgo(dto);

      // 🆕 Validar permissões do usuário
      await this.validateUserPermissions(rejectingUser, 'REJECT');

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
        validatedData.justificativaRejeicao.trim();
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
          valorSolicitado: expurgo.valorSolicitado,
          dataEvento: expurgo.dataEvento,
        },
        justification: validatedData.justificativaRejeicao,
        competitionPeriodId: expurgo.competitionPeriodId,
      });

      this.queueService.addNotificationJob({
        recipient: { userId: expurgo.registradoPorUserId },
        type: 'EXPURGO_REJEITADO',
        message: `Seu expurgo para o critério "${expurgo.criterion?.nome}" foi rejeitado.`,
        link: `/expurgos/${updatedExpurgo.id}`
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
   * Busca expurgo por ID com todas as relações (ATUALIZADO)
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
        'anexos', // 🆕 INCLUIR ANEXOS
        'anexos.uploadedBy', // 🆕 INCLUIR DADOS DO UPLOADER
      ],
    });
  }

  /**
   * Busca expurgos com filtros (ATUALIZADO)
   */
  async findExpurgos(
    filters: FindExpurgosDto = {}
  ): Promise<ExpurgoResponseDto[]> {
    console.log('[ExpurgoService] Buscando expurgos com filtros:', filters);

    try {
      const whereClause: FindOptionsWhere<ExpurgoEventEntity> = {};

      // Aplicar filtros existentes
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

      // 🆕 NOVOS FILTROS
      if (filters.registradoPorUserId) {
        whereClause.registradoPorUserId = filters.registradoPorUserId;
      }

      if (filters.aprovadoPorUserId) {
        whereClause.aprovadoPorUserId = filters.aprovadoPorUserId;
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

      const queryBuilder = this.expurgoRepo
        .createQueryBuilder('expurgo')
        .leftJoinAndSelect('expurgo.competitionPeriod', 'period')
        .leftJoinAndSelect('expurgo.sector', 'sector')
        .leftJoinAndSelect('expurgo.criterion', 'criterion')
        .leftJoinAndSelect('expurgo.registradoPor', 'registradoPor')
        .leftJoinAndSelect('expurgo.aprovadoPor', 'aprovadoPor')
        .leftJoinAndSelect('expurgo.anexos', 'anexos') // 🆕 INCLUIR ANEXOS
        .leftJoinAndSelect('anexos.uploadedBy', 'anexoUploader'); // 🆕 DADOS DO UPLOADER

      // Aplicar filtros WHERE
      Object.entries(whereClause).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'dataEvento' && typeof value === 'object') {
            // Filtro Between para datas
            queryBuilder.andWhere(
              `expurgo.${key} BETWEEN :startDate AND :endDate`,
              {
                startDate: (value as any).from,
                endDate: (value as any).to,
              }
            );
          } else {
            queryBuilder.andWhere(`expurgo.${key} = :${key}`, { [key]: value });
          }
        }
      });

      // 🆕 FILTROS ESPECIAIS
      if (filters.comAnexos !== undefined) {
        if (filters.comAnexos) {
          queryBuilder.andWhere('anexos.id IS NOT NULL');
        } else {
          queryBuilder.andWhere('anexos.id IS NULL');
        }
      }

      if (filters.valorMinimoSolicitado !== undefined) {
        queryBuilder.andWhere('ABS(expurgo.valorSolicitado) >= :valorMinimo', {
          valorMinimo: Math.abs(filters.valorMinimoSolicitado),
        });
      }

      if (filters.valorMaximoSolicitado !== undefined) {
        queryBuilder.andWhere('ABS(expurgo.valorSolicitado) <= :valorMaximo', {
          valorMaximo: Math.abs(filters.valorMaximoSolicitado),
        });
      }

      queryBuilder
        .orderBy('expurgo.dataEvento', 'DESC')
        .addOrderBy('expurgo.createdAt', 'DESC');

      const expurgos = await queryBuilder.getMany();

      console.log(`[ExpurgoService] Encontrados ${expurgos.length} expurgos`);

      return expurgos.map((expurgo) => this.convertToResponseDto(expurgo));
    } catch (error: any) {
      console.error('[ExpurgoService] Erro ao buscar expurgos:', error);
      throw new Error(`Erro ao buscar expurgos: ${error.message}`);
    }
  }

  // =====================================
  // 🆕 MÉTODOS PARA ANEXOS
  // =====================================

  /**
   * Faz upload de anexo para um expurgo
   */
  async uploadAttachment(
    expurgoId: number,
    file: any, // Será tipado conforme implementação do upload
    uploadingUser: UserEntity,
    description?: string
  ): Promise<any> {
    return this.attachmentService.uploadAttachment(
      expurgoId,
      file,
      uploadingUser,
      description
    );
  }

  /**
   * Remove anexo de um expurgo
   */
  async deleteAttachment(
    attachmentId: number,
    deletingUser: UserEntity,
    reason: string
  ): Promise<void> {
    return this.attachmentService.deleteAttachment(
      attachmentId,
      deletingUser,
      reason
    );
  }

  /**
   * Busca anexos de um expurgo
   */
  async getExpurgoAttachments(expurgoId: number) {
    return this.attachmentService.findAttachmentsByExpurgo(expurgoId);
  }

  /**
   * Obtém caminho do arquivo para download
   */
  async getAttachmentDownloadPath(attachmentId: number): Promise<string> {
    return this.attachmentService.getFilePathForDownload(attachmentId);
  }

  // =====================================
  // MÉTODOS DE RELATÓRIOS E ESTATÍSTICAS (ATUALIZADOS)
  // =====================================

  /**
   * Estatísticas de expurgos por período (ATUALIZADA)
   */
  async getExpurgoStatistics(
    periodMesAno?: string
  ): Promise<ExpurgoStatisticsDto> {
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

    const stats: ExpurgoStatisticsDto = {
      periodo: periodMesAno,
      total: expurgos.length,
      pendentes: expurgos.filter((e) => e.status === ExpurgoStatus.PENDENTE)
        .length,
      aprovados: expurgos.filter((e) => e.status === ExpurgoStatus.APROVADO)
        .length,
      aprovadosParciais: expurgos.filter(
        (e) => e.status === ExpurgoStatus.APROVADO_PARCIAL
      ).length, // 🆕
      rejeitados: expurgos.filter((e) => e.status === ExpurgoStatus.REJEITADO)
        .length,
      bySector: {},
      byCriterion: {},
      valorTotalSolicitado: 0,
      valorTotalAprovado: 0,
      percentualAprovacaoGeral: 0,
      totalAnexos: 0, // 🆕
      expurgosComAnexos: 0, // 🆕
    };

    // Calcular estatísticas detalhadas
    expurgos.forEach((expurgo) => {
      // Por setor
      const sectorName = expurgo.sector?.nome || 'Desconhecido';
      if (!stats.bySector[sectorName]) {
        stats.bySector[sectorName] = {
          total: 0,
          pendentes: 0,
          aprovados: 0,
          rejeitados: 0,
          valorTotalSolicitado: 0,
          valorTotalAprovado: 0,
        };
      }

      stats.bySector[sectorName].total++;
      stats.bySector[sectorName].valorTotalSolicitado += Math.abs(
        expurgo.valorSolicitado
      );

      switch (expurgo.status) {
        case ExpurgoStatus.PENDENTE:
          stats.bySector[sectorName].pendentes++;
          break;
        case ExpurgoStatus.APROVADO:
        case ExpurgoStatus.APROVADO_PARCIAL:
          stats.bySector[sectorName].aprovados++;
          if (expurgo.valorAprovado) {
            stats.bySector[sectorName].valorTotalAprovado += Math.abs(
              expurgo.valorAprovado
            );
          }
          break;
        case ExpurgoStatus.REJEITADO:
          stats.bySector[sectorName].rejeitados++;
          break;
      }

      // Por critério
      const criterionName = expurgo.criterion?.nome || 'Desconhecido';
      if (!stats.byCriterion[criterionName]) {
        stats.byCriterion[criterionName] = {
          total: 0,
          valorTotalSolicitado: 0,
          valorTotalAprovado: 0,
        };
      }

      stats.byCriterion[criterionName].total++;
      stats.byCriterion[criterionName].valorTotalSolicitado += Math.abs(
        expurgo.valorSolicitado
      );

      if (
        expurgo.status === ExpurgoStatus.APROVADO ||
        expurgo.status === ExpurgoStatus.APROVADO_PARCIAL
      ) {
        if (expurgo.valorAprovado) {
          stats.byCriterion[criterionName].valorTotalAprovado += Math.abs(
            expurgo.valorAprovado
          );
        }
      }

      // Totais gerais
      stats.valorTotalSolicitado += Math.abs(expurgo.valorSolicitado);
      if (
        expurgo.status === ExpurgoStatus.APROVADO ||
        expurgo.status === ExpurgoStatus.APROVADO_PARCIAL
      ) {
        if (expurgo.valorAprovado) {
          stats.valorTotalAprovado += Math.abs(expurgo.valorAprovado);
        }
      }

      // 🆕 Estatísticas de anexos
      if (expurgo.quantidadeAnexos && expurgo.quantidadeAnexos > 0) {
        stats.totalAnexos += expurgo.quantidadeAnexos;
        stats.expurgosComAnexos++;
      }
    });

    // Calcular percentual de aprovação geral
    if (stats.valorTotalSolicitado > 0) {
      stats.percentualAprovacaoGeral =
        (stats.valorTotalAprovado / stats.valorTotalSolicitado) * 100;
    }

    return stats;
  }

  // =====================================
  // MÉTODOS DE MANUTENÇÃO (MANTIDOS)
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
   * Valida consistência dos dados de expurgo (ATUALIZADA)
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

      // 🆕 Verificar valores (atualizado para nova estrutura)
      if (expurgo.valorSolicitado === 0) {
        inconsistencies.push({
          expurgoId: expurgo.id,
          issue: 'Valor solicitado é zero',
        });
      }

      // 🆕 Verificar consistência valor aprovado vs status
      if (
        expurgo.isAprovado() &&
        (!expurgo.valorAprovado || expurgo.valorAprovado === 0)
      ) {
        inconsistencies.push({
          expurgoId: expurgo.id,
          issue: 'Status aprovado mas sem valor aprovado válido',
        });
      }

      // 🆕 Verificar se valor aprovado não é maior que solicitado
      if (
        expurgo.valorAprovado &&
        Math.abs(expurgo.valorAprovado) > Math.abs(expurgo.valorSolicitado)
      ) {
        inconsistencies.push({
          expurgoId: expurgo.id,
          issue: 'Valor aprovado maior que valor solicitado',
        });
      }

      // 🆕 Verificar consistência do status APROVADO_PARCIAL
      if (expurgo.status === ExpurgoStatus.APROVADO_PARCIAL) {
        if (
          !expurgo.valorAprovado ||
          Math.abs(expurgo.valorAprovado) >= Math.abs(expurgo.valorSolicitado)
        ) {
          inconsistencies.push({
            expurgoId: expurgo.id,
            issue: 'Status APROVADO_PARCIAL mas valor aprovado >= solicitado',
          });
        }
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

  // =====================================
  // 🆕 MÉTODOS AUXILIARES PARA ROLES (PREPARAÇÃO FUTURA)
  // =====================================

  /**
   * 🆕 Busca setor associado ao usuário (preparado para quando roles estiverem implementadas)
   */
  private async getUserSector(userId: number): Promise<SectorEntity | null> {
    // TODO: Implementar quando tabela de associação user-sector existir
    // Por enquanto retorna null

    // Exemplo futuro:
    // const userSector = await this.userSectorRepo.findOne({
    //   where: { userId },
    //   relations: ['sector']
    // });
    // return userSector?.sector || null;

    return null;
  }

  /**
   * 🆕 Verifica se usuário tem role específica (preparado para quando roles estiverem implementadas)
   */
  private async userHasRole(
    userId: number,
    roleName: string
  ): Promise<boolean> {
    // TODO: Implementar quando sistema de roles estiver funcionando
    // Por enquanto retorna true (sem validação)

    // Exemplo futuro:
    // const userRoles = await this.userRepo.findOne({
    //   where: { id: userId },
    //   relations: ['roles']
    // });
    // return userRoles?.roles.some(role => role.nome === roleName) || false;

    return true;
  }

  /**
   * 🆕 Busca expurgos por setor do usuário logado
   */
  async findExpurgosByUserSector(
    userId: number,
    filters: Omit<FindExpurgosDto, 'sectorId'> = {}
  ): Promise<ExpurgoResponseDto[]> {
    console.log(
      `[ExpurgoService] Buscando expurgos do setor do usuário ${userId}`
    );

    // TODO: Quando associação user-sector estiver implementada
    const userSector = await this.getUserSector(userId);

    if (!userSector) {
      console.warn(
        `[ExpurgoService] Usuário ${userId} não tem setor associado`
      );
      return [];
    }

    return this.findExpurgos({
      ...filters,
      sectorId: userSector.id,
    });
  }

  /**
   * 🆕 Busca expurgos pendentes para aprovação (role DIRETOR)
   */
  async findPendingExpurgosForApproval(
    approvingUserId: number,
    filters: FindExpurgosDto = {}
  ): Promise<ExpurgoResponseDto[]> {
    console.log(
      `[ExpurgoService] Buscando expurgos pendentes para aprovação pelo usuário ${approvingUserId}`
    );

    // TODO: Validar se usuário tem role DIRETOR
    const hasDirectorRole = await this.userHasRole(approvingUserId, 'DIRETOR');

    if (!hasDirectorRole) {
      throw new Error(
        'Usuário não tem permissão para visualizar expurgos pendentes de aprovação'
      );
    }

    return this.findExpurgos({
      ...filters,
      status: ExpurgoStatus.PENDENTE,
    });
  }

  // =====================================
  // 🆕 MÉTODOS DE BUSCA AVANÇADA
  // =====================================

  /**
   * 🆕 Busca expurgos com estatísticas resumidas
   */
  async findExpurgosWithSummary(filters: FindExpurgosDto = {}): Promise<{
    expurgos: ExpurgoResponseDto[];
    summary: {
      total: number;
      porStatus: Record<string, number>;
      valorTotalSolicitado: number;
      valorTotalAprovado: number;
      percentualAprovacao: number;
    };
  }> {
    const expurgos = await this.findExpurgos(filters);

    const summary = {
      total: expurgos.length,
      porStatus: {} as Record<string, number>,
      valorTotalSolicitado: 0,
      valorTotalAprovado: 0,
      percentualAprovacao: 0,
    };

    expurgos.forEach((expurgo) => {
      // Contagem por status
      const status = expurgo.status;
      summary.porStatus[status] = (summary.porStatus[status] || 0) + 1;

      // Valores
      summary.valorTotalSolicitado += Math.abs(expurgo.valorSolicitado);

      if (
        expurgo.valorAprovado &&
        (expurgo.status === ExpurgoStatus.APROVADO ||
          expurgo.status === ExpurgoStatus.APROVADO_PARCIAL)
      ) {
        summary.valorTotalAprovado += Math.abs(expurgo.valorAprovado);
      }
    });

    // Percentual de aprovação
    if (summary.valorTotalSolicitado > 0) {
      summary.percentualAprovacao =
        (summary.valorTotalAprovado / summary.valorTotalSolicitado) * 100;
    }

    return { expurgos, summary };
  }

  /**
   * 🆕 Busca expurgos com impacto significativo (valores altos)
   */
  async findHighImpactExpurgos(
    thresholdValue: number = 50,
    periodMesAno?: string
  ): Promise<ExpurgoResponseDto[]> {
    console.log(
      `[ExpurgoService] Buscando expurgos com impacto >= ${thresholdValue}`
    );

    const filters: FindExpurgosDto = {
      valorMinimoSolicitado: thresholdValue,
    };

    if (periodMesAno) {
      const period = await this.periodRepo.findOne({
        where: { mesAno: periodMesAno },
      });

      if (period) {
        filters.competitionPeriodId = period.id;
      }
    }

    const expurgos = await this.findExpurgos(filters);

    // Ordenar por valor solicitado (maior primeiro)
    return expurgos.sort(
      (a, b) => Math.abs(b.valorSolicitado) - Math.abs(a.valorSolicitado)
    );
  }

  /**
   * 🆕 Relatório de eficiência de aprovação por critério
   */
  async getApprovalEfficiencyByCriterion(periodMesAno?: string): Promise<
    Array<{
      criterionId: number;
      criterionName: string;
      totalSolicitados: number;
      totalAprovados: number;
      percentualAprovacao: number;
      valorMedioSolicitado: number;
      valorMedioAprovado: number;
      eficienciaAprovacao: number; // % do valor aprovado vs solicitado
    }>
  > {
    const filters: FindExpurgosDto = {};

    if (periodMesAno) {
      const period = await this.periodRepo.findOne({
        where: { mesAno: periodMesAno },
      });

      if (period) {
        filters.competitionPeriodId = period.id;
      }
    }

    const expurgos = await this.findExpurgos(filters);

    // Agrupar por critério
    const groupedByCriterion: Record<
      number,
      {
        criterionName: string;
        expurgos: ExpurgoResponseDto[];
      }
    > = {};

    expurgos.forEach((expurgo) => {
      if (!groupedByCriterion[expurgo.criterionId]) {
        groupedByCriterion[expurgo.criterionId] = {
          criterionName: expurgo.criterion?.nome || 'Desconhecido',
          expurgos: [],
        };
      }
      groupedByCriterion[expurgo.criterionId]!.expurgos.push(expurgo);
    });

    // Calcular estatísticas por critério
    return Object.entries(groupedByCriterion)
      .map(([criterionIdStr, data]) => {
        const criterionId = parseInt(criterionIdStr);
        const { criterionName, expurgos: criterionExpurgos } = data;

        const aprovados = criterionExpurgos.filter(
          (e) =>
            e.status === ExpurgoStatus.APROVADO ||
            e.status === ExpurgoStatus.APROVADO_PARCIAL
        );

        const totalValorSolicitado = criterionExpurgos.reduce(
          (sum, e) => sum + Math.abs(e.valorSolicitado),
          0
        );
        const totalValorAprovado = aprovados.reduce(
          (sum, e) => sum + Math.abs(e.valorAprovado || 0),
          0
        );

        const percentualAprovacao =
          criterionExpurgos.length > 0
            ? (aprovados.length / criterionExpurgos.length) * 100
            : 0;

        const valorMedioSolicitado =
          criterionExpurgos.length > 0
            ? totalValorSolicitado / criterionExpurgos.length
            : 0;

        const valorMedioAprovado =
          aprovados.length > 0 ? totalValorAprovado / aprovados.length : 0;

        const eficienciaAprovacao =
          totalValorSolicitado > 0
            ? (totalValorAprovado / totalValorSolicitado) * 100
            : 0;

        return {
          criterionId,
          criterionName,
          totalSolicitados: criterionExpurgos.length,
          totalAprovados: aprovados.length,
          percentualAprovacao: Number(percentualAprovacao.toFixed(2)),
          valorMedioSolicitado: Number(valorMedioSolicitado.toFixed(2)),
          valorMedioAprovado: Number(valorMedioAprovado.toFixed(2)),
          eficienciaAprovacao: Number(eficienciaAprovacao.toFixed(2)),
        };
      })
      .sort((a, b) => b.eficienciaAprovacao - a.eficienciaAprovacao);
  }
}
