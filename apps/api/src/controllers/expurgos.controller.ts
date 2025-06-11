// apps/api/src/controllers/expurgos.controller.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { ExpurgoService } from '@/modules/expurgos/expurgo.service';
import { AuthService } from '@/services/auth.service';
import {
  ApproveExpurgoDto,
  CreateExpurgoDto,
  ExpurgoStatus,
  FindExpurgosDto,
  RejectExpurgoDto,
} from '@sistema-premiacao/shared-types';
import { FastifyReply, FastifyRequest } from 'fastify';

interface Services {
  expurgo: ExpurgoService;
  auth: AuthService;
}

/**
 * Controller para rotas de expurgos
 */
export class ExpurgosController {
  constructor(private services: Services) {}

  /**
   * GET /api/expurgos - Listar expurgos com filtros
   */
  async getExpurgos(request: FastifyRequest, reply: FastifyReply) {
    try {
      request.log.info(
        '[API] GET /api/expurgos - Iniciando busca de expurgos...'
      );

      const queryParams = request.query as any;
      request.log.info('[API] Query params recebidos:', queryParams);

      // Usar o tipo correto do shared-types
      const filters: FindExpurgosDto = {};

      // Converter IDs numéricos
      if (queryParams.competitionPeriodId) {
        const periodId = parseInt(queryParams.competitionPeriodId, 10);
        if (isNaN(periodId)) {
          return reply.status(400).send({
            error: 'competitionPeriodId deve ser um número válido',
          });
        }
        filters.competitionPeriodId = periodId;
      }

      // Suporte para busca por mesAno
      if (queryParams.periodMesAno && !filters.competitionPeriodId) {
        const period = await AppDataSource.getRepository(
          CompetitionPeriodEntity
        ).findOne({
          where: { mesAno: queryParams.periodMesAno },
        });

        if (period) {
          filters.competitionPeriodId = period.id;
          request.log.info(
            `[API] Convertido mesAno ${queryParams.periodMesAno} para periodId ${period.id}`
          );
        }
      }

      // Processar outros filtros
      const validationResult = this.processFilters(queryParams, filters);
      if (validationResult.error) {
        return reply.status(400).send({ error: validationResult.error });
      }

      request.log.info('[API] Filtros processados:', filters);

      await AppDataSource.initialize();

      const expurgos = await this.services.expurgo.findExpurgos(filters);

      request.log.info(`[API] Retornando ${expurgos.length} expurgos`);
      reply.send(expurgos);
    } catch (error: any) {
      request.log.error('[API] Erro em getExpurgos:', error);
      reply.status(500).send({
        error: error.message || 'Erro interno ao buscar expurgos.',
      });
    }
  }

  /**
   * GET /api/expurgos/:id - Buscar expurgo por ID
   */
  async getExpurgoById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      const expurgoId = parseInt(params.id, 10);

      request.log.info(`[API] GET /api/expurgos/${expurgoId}`);

      if (isNaN(expurgoId) || expurgoId <= 0) {
        return reply.status(400).send({
          error: 'ID do expurgo deve ser um número positivo',
        });
      }

      await AppDataSource.initialize();

      const expurgo = await this.services.expurgo.findExpurgoById(expurgoId);

      if (!expurgo) {
        return reply.status(404).send({
          message: `Expurgo com ID ${expurgoId} não encontrado.`,
        });
      }

      const expurgoDto = this.services.expurgo.convertToResponseDto(expurgo);

      request.log.info(`[API] Expurgo ${expurgoId} encontrado`);
      reply.send(expurgoDto);
    } catch (error: any) {
      request.log.error(`[API] Erro em getExpurgoById:`, error);
      reply.status(500).send({
        error: error.message || 'Erro interno ao buscar expurgo.',
      });
    }
  }

  /**
   * POST /api/expurgos/request - Solicitar expurgo
   */
  async requestExpurgo(request: FastifyRequest, reply: FastifyReply) {
    try {
      request.log.info(
        '[API] POST /api/expurgos/request - Dados recebidos:',
        request.body
      );

      if (!request.body || typeof request.body !== 'object') {
        return reply.status(400).send({
          error: 'Body da requisição é obrigatório e deve ser um objeto JSON',
        });
      }

      const data = request.body as any;

      // Validação completa
      const validationError = this.validateExpurgoRequest(data);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

      // Criar DTO limpo usando o tipo correto
      const createExpurgoDto: CreateExpurgoDto = {
        competitionPeriodId: data.competitionPeriodId,
        sectorId: data.sectorId,
        criterionId: data.criterionId,
        dataEvento: data.dataEvento,
        descricaoEvento: data.descricaoEvento.trim(),
        justificativaSolicitacao: data.justificativaSolicitacao.trim(),
        valorSolicitado: data.valorSolicitado, // Usar o nome correto do DTO
      };

      // Usar usuário autenticado real
      const requestingUser = await this.services.auth.getUserById(
        request.user!.id
      );
      if (!requestingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      await AppDataSource.initialize();

      const newExpurgo = await this.services.expurgo.requestExpurgo(
        createExpurgoDto,
        requestingUser as any
      );

      request.log.info(
        `[API] Expurgo criado com sucesso - ID: ${newExpurgo.id} por ${requestingUser.email}`
      );
      reply.status(201).send(newExpurgo);
    } catch (error: any) {
      request.log.error('[API] Erro em requestExpurgo:', error);

      let statusCode = 500;
      if (
        error.message.includes('não encontrado') ||
        error.message.includes('não encontrada')
      ) {
        statusCode = 404;
      } else if (
        error.message.includes('não é elegível') ||
        error.message.includes('deve estar dentro') ||
        error.message.includes('já existe') ||
        error.message.includes('obrigatórios')
      ) {
        statusCode = 400;
      } else if (error.message.includes('já existe um expurgo pendente')) {
        statusCode = 409;
      }

      reply.status(statusCode).send({
        error: error.message || 'Erro interno ao solicitar expurgo.',
      });
    }
  }

  /**
   * POST /api/expurgos/:id/approve - Aprovar expurgo
   */
  async approveExpurgo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      const expurgoId = parseInt(params.id, 10);

      request.log.info(`[API] POST /api/expurgos/${expurgoId}/approve`);

      if (isNaN(expurgoId) || expurgoId <= 0) {
        return reply.status(400).send({
          error: 'ID do expurgo deve ser um número positivo',
        });
      }

      if (!request.body || typeof request.body !== 'object') {
        return reply.status(400).send({
          error: 'Body da requisição é obrigatório',
        });
      }

      const dto = request.body as any;

      // Validação do DTO de aprovação
      const validationError = this.validateApprovalDto(dto);
      if (validationError) {
        return reply.status(400).send({ error: validationError });
      }

      const approveDto: ApproveExpurgoDto = {
        valorAprovado: dto.valorAprovado,
        justificativaAprovacao: dto.justificativaAprovacao.trim(),
        observacoes: dto.observacoes ? dto.observacoes.trim() : undefined,
      };

      // Usar usuário autenticado real
      const approvingUser = await this.services.auth.getUserById(
        request.user!.id
      );
      if (!approvingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      await AppDataSource.initialize();

      const approvedExpurgo =
        await this.services.expurgo.approveExpurgoWithValue(
          expurgoId,
          approveDto,
          approvingUser as any
        );

      request.log.info(
        `[API] Expurgo ${expurgoId} aprovado com sucesso por ${approvingUser.email} - Valor: ${dto.valorAprovado}`
      );
      reply.send(approvedExpurgo);
    } catch (error: any) {
      request.log.error(`[API] Erro em approveExpurgo:`, error);

      let statusCode = 500;
      if (
        error.message.includes('não encontrado') ||
        error.message.includes('não encontrada')
      ) {
        statusCode = 404;
      } else if (
        error.message.includes('não pode ser aprovado') ||
        error.message.includes('não pode aprovar') ||
        error.message.includes('Status atual') ||
        error.message.includes('não pode ser maior')
      ) {
        statusCode = 409;
      } else if (
        error.message.includes('obrigatória') ||
        error.message.includes('deve ser')
      ) {
        statusCode = 400;
      }

      reply.status(statusCode).send({
        error: error.message || 'Erro interno ao aprovar expurgo.',
      });
    }
  }

  /**
   * POST /api/expurgos/:id/reject - Rejeitar expurgo
   */
  async rejectExpurgo(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      const expurgoId = parseInt(params.id, 10);

      request.log.info(`[API] POST /api/expurgos/${expurgoId}/reject`);

      if (isNaN(expurgoId) || expurgoId <= 0) {
        return reply.status(400).send({
          error: 'ID do expurgo deve ser um número positivo',
        });
      }

      if (!request.body || typeof request.body !== 'object') {
        return reply.status(400).send({
          error: 'Body da requisição é obrigatório',
        });
      }

      const dto = request.body as any;

      if (
        !dto.justificativaRejeicao ||
        typeof dto.justificativaRejeicao !== 'string' ||
        dto.justificativaRejeicao.trim().length < 10
      ) {
        return reply.status(400).send({
          error:
            'justificativaRejeicao é obrigatória e deve ter pelo menos 10 caracteres',
        });
      }

      const rejectDto: RejectExpurgoDto = {
        justificativaRejeicao: dto.justificativaRejeicao.trim(),
        observacoes: dto.observacoes ? dto.observacoes.trim() : undefined,
      };

      // Usar usuário autenticado real
      const rejectingUser = await this.services.auth.getUserById(
        request.user!.id
      );
      if (!rejectingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      await AppDataSource.initialize();

      const rejectedExpurgo = await this.services.expurgo.rejectExpurgo(
        expurgoId,
        rejectDto,
        rejectingUser as any
      );

      request.log.info(
        `[API] Expurgo ${expurgoId} rejeitado com sucesso por ${rejectingUser.email}`
      );
      reply.send(rejectedExpurgo);
    } catch (error: any) {
      request.log.error(`[API] Erro em rejectExpurgo:`, error);

      let statusCode = 500;
      if (
        error.message.includes('não encontrado') ||
        error.message.includes('não encontrada')
      ) {
        statusCode = 404;
      } else if (
        error.message.includes('não pode ser rejeitado') ||
        error.message.includes('Status atual')
      ) {
        statusCode = 409;
      } else if (error.message.includes('obrigatória')) {
        statusCode = 400;
      }

      reply.status(statusCode).send({
        error: error.message || 'Erro interno ao rejeitar expurgo.',
      });
    }
  }

  /**
   * Método auxiliar unificado para processar filtros
   */
  private processFilters(
    queryParams: any,
    filters: FindExpurgosDto
  ): { error?: string } {
    // Processar filtros numéricos
    const numericFields = [
      'sectorId',
      'criterionId',
      'registradoPorUserId',
      'aprovadoPorUserId',
      'valorMinimoSolicitado',
      'valorMaximoSolicitado',
    ];

    for (const field of numericFields) {
      if (queryParams[field]) {
        const value = parseFloat(queryParams[field]);
        if (isNaN(value)) {
          return { error: `${field} deve ser um número válido` };
        }
        (filters as any)[field] = value;
      }
    }

    // Processar filtro booleano
    if (queryParams.comAnexos !== undefined) {
      filters.comAnexos = queryParams.comAnexos === 'true';
    }

    // Processar status usando o enum correto
    if (queryParams.status) {
      const statusUpper = queryParams.status.toUpperCase();
      const validStatuses = Object.values(ExpurgoStatus);

      if (!validStatuses.includes(statusUpper as ExpurgoStatus)) {
        return {
          error: `Status deve ser um de: ${validStatuses.join(', ')}`,
        };
      }
      filters.status = statusUpper as ExpurgoStatus;
    }

    // Processar filtros de data
    const dateFields = ['dataEventoInicio', 'dataEventoFim'];
    for (const field of dateFields) {
      if (queryParams[field]) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(queryParams[field])) {
          return {
            error: `${field} deve estar no formato YYYY-MM-DD`,
          };
        }
        (filters as any)[field] = queryParams[field];
      }
    }

    return {}; // Sucesso, sem erro
  }

  /**
   * Validação de requisição de expurgo
   */
  private validateExpurgoRequest(data: any): string | null {
    const requiredFields = [
      'competitionPeriodId',
      'sectorId',
      'criterionId',
      'dataEvento',
      'descricaoEvento',
      'justificativaSolicitacao',
      'valorSolicitado',
    ];

    const missingFields = requiredFields.filter(
      (field) =>
        data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missingFields.length > 0) {
      return `Campos obrigatórios ausentes: ${missingFields.join(', ')}`;
    }

    if (
      !Number.isInteger(data.competitionPeriodId) ||
      data.competitionPeriodId <= 0
    ) {
      return 'competitionPeriodId deve ser um número inteiro positivo';
    }

    if (!Number.isInteger(data.sectorId) || data.sectorId <= 0) {
      return 'sectorId deve ser um número inteiro positivo';
    }

    if (!Number.isInteger(data.criterionId) || data.criterionId <= 0) {
      return 'criterionId deve ser um número inteiro positivo';
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.dataEvento)) {
      return 'dataEvento deve estar no formato YYYY-MM-DD';
    }

    if (
      typeof data.descricaoEvento !== 'string' ||
      data.descricaoEvento.trim().length < 10
    ) {
      return 'descricaoEvento deve ter pelo menos 10 caracteres';
    }

    if (
      typeof data.justificativaSolicitacao !== 'string' ||
      data.justificativaSolicitacao.trim().length < 20
    ) {
      return 'justificativaSolicitacao deve ter pelo menos 20 caracteres';
    }

    if (
      typeof data.valorSolicitado !== 'number' ||
      !isFinite(data.valorSolicitado)
    ) {
      return 'valorSolicitado deve ser um número válido';
    }

    if (data.valorSolicitado === 0) {
      return 'valorSolicitado não pode ser zero';
    }

    return null;
  }

  /**
   * Validação de DTO de aprovação
   */
  private validateApprovalDto(dto: any): string | null {
    if (!dto.valorAprovado || typeof dto.valorAprovado !== 'number') {
      return 'valorAprovado é obrigatório e deve ser um número';
    }

    if (
      !dto.justificativaAprovacao ||
      typeof dto.justificativaAprovacao !== 'string'
    ) {
      return 'justificativaAprovacao é obrigatória';
    }

    if (dto.valorAprovado === 0) {
      return 'valorAprovado não pode ser zero';
    }

    if (!isFinite(dto.valorAprovado)) {
      return 'valorAprovado deve ser um número válido';
    }

    if (dto.justificativaAprovacao.trim().length < 10) {
      return 'justificativaAprovacao deve ter pelo menos 10 caracteres';
    }

    return null;
  }
}
