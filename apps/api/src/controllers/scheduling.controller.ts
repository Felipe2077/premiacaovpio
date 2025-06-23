// apps/api/src/controllers/scheduling.controller.ts
import { UserEntity } from '@/entity/user.entity';
import { FastifyReply, FastifyRequest } from 'fastify';
import {
  CreateScheduleDto,
  SchedulingService,
  UpdateScheduleDto,
} from '../modules/scheduling/scheduling.service';

// ===== INTERFACES DE REQUEST =====

interface CreateScheduleRequest {
  Body: CreateScheduleDto;
}

interface UpdateScheduleRequest {
  Params: { id: string };
  Body: UpdateScheduleDto;
}

interface DeleteScheduleRequest {
  Params: { id: string };
}

interface GetScheduleRequest {
  Params: { id: string };
}

interface ExecuteNowRequest {
  Params: { id: string };
}

interface GetSchedulesRequest {
  Querystring: {
    status?: string;
    frequency?: string;
    jobType?: string;
    limit?: string;
    offset?: string;
  };
}

/**
 * Controller para gerenciamento de agendamentos
 * Fornece APIs RESTful para CRUD e controle de agendamentos
 */
export class SchedulingController {
  private schedulingService: SchedulingService;

  constructor() {
    this.schedulingService = new SchedulingService();
    console.log('[SchedulingController] Inicializado');
  }

  /**
   * POST /api/scheduling/schedules
   * Cria um novo agendamento
   */
  async createSchedule(
    request: FastifyRequest<CreateScheduleRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      // TODO: Extrair usuário da autenticação
      const user = { id: 1, nome: 'Admin' } as UserEntity; // Mock

      const schedule = await this.schedulingService.createSchedule(
        request.body,
        user
      );

      reply.code(201).send({
        success: true,
        message: 'Agendamento criado com sucesso',
        data: schedule,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno';

      reply.code(400).send({
        success: false,
        message: 'Erro ao criar agendamento',
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/scheduling/schedules
   * Lista agendamentos com filtros opcionais
   */
  async getSchedules(
    request: FastifyRequest<GetSchedulesRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { status, frequency, jobType, limit, offset } = request.query;

      // Por enquanto, buscar todos
      // TODO: Implementar filtros e paginação
      const schedules = await this.schedulingService.getAllSchedules();

      // Aplicar filtros simples
      let filteredSchedules = schedules;

      if (status) {
        filteredSchedules = filteredSchedules.filter(
          (s) => s.status === status
        );
      }

      if (frequency) {
        filteredSchedules = filteredSchedules.filter(
          (s) => s.frequency === frequency
        );
      }

      if (jobType) {
        filteredSchedules = filteredSchedules.filter(
          (s) => s.jobType === jobType
        );
      }

      // Paginação simples
      const limitNum = limit ? parseInt(limit) : 50;
      const offsetNum = offset ? parseInt(offset) : 0;
      const paginatedSchedules = filteredSchedules.slice(
        offsetNum,
        offsetNum + limitNum
      );

      reply.send({
        success: true,
        message: 'Agendamentos recuperados',
        data: {
          schedules: paginatedSchedules,
          total: filteredSchedules.length,
          limit: limitNum,
          offset: offsetNum,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno';

      reply.code(500).send({
        success: false,
        message: 'Erro ao buscar agendamentos',
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/scheduling/schedules/:id
   * Busca agendamento por ID
   */
  async getScheduleById(
    request: FastifyRequest<GetScheduleRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);

      if (isNaN(id)) {
        reply.code(400).send({
          success: false,
          message: 'ID inválido',
        });
        return;
      }

      const schedule = await this.schedulingService.getScheduleById(id);

      if (!schedule) {
        reply.code(404).send({
          success: false,
          message: 'Agendamento não encontrado',
        });
        return;
      }

      reply.send({
        success: true,
        message: 'Agendamento encontrado',
        data: schedule,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno';

      reply.code(500).send({
        success: false,
        message: 'Erro ao buscar agendamento',
        error: errorMessage,
      });
    }
  }

  /**
   * PUT /api/scheduling/schedules/:id
   * Atualiza um agendamento
   */
  async updateSchedule(
    request: FastifyRequest<UpdateScheduleRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);

      if (isNaN(id)) {
        reply.code(400).send({
          success: false,
          message: 'ID inválido',
        });
        return;
      }

      // TODO: Extrair usuário da autenticação
      const user = { id: 1, nome: 'Admin' } as UserEntity; // Mock

      const schedule = await this.schedulingService.updateSchedule(
        id,
        request.body,
        user
      );

      reply.send({
        success: true,
        message: 'Agendamento atualizado com sucesso',
        data: schedule,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno';

      const statusCode = errorMessage.includes('não encontrado') ? 404 : 400;

      reply.code(statusCode).send({
        success: false,
        message: 'Erro ao atualizar agendamento',
        error: errorMessage,
      });
    }
  }

  /**
   * DELETE /api/scheduling/schedules/:id
   * Remove um agendamento
   */
  async deleteSchedule(
    request: FastifyRequest<DeleteScheduleRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);

      if (isNaN(id)) {
        reply.code(400).send({
          success: false,
          message: 'ID inválido',
        });
        return;
      }

      // TODO: Extrair usuário da autenticação
      const user = { id: 1, nome: 'Admin' } as UserEntity; // Mock

      await this.schedulingService.deleteSchedule(id, user);

      reply.send({
        success: true,
        message: 'Agendamento removido com sucesso',
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno';

      const statusCode = errorMessage.includes('não encontrado') ? 404 : 500;

      reply.code(statusCode).send({
        success: false,
        message: 'Erro ao remover agendamento',
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/scheduling/schedules/:id/execute
   * Executa um agendamento imediatamente
   */
  async executeScheduleNow(
    request: FastifyRequest<ExecuteNowRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const id = parseInt(request.params.id);

      if (isNaN(id)) {
        reply.code(400).send({
          success: false,
          message: 'ID inválido',
        });
        return;
      }

      // TODO: Extrair usuário da autenticação
      const user = { id: 1, nome: 'Admin' } as UserEntity; // Mock

      const result = await this.schedulingService.executeNow(id, user);

      reply.send({
        success: true,
        message: result,
        data: { scheduleId: id, executedAt: new Date() },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno';

      const statusCode = errorMessage.includes('não encontrado') ? 404 : 500;

      reply.code(statusCode).send({
        success: false,
        message: 'Erro ao executar agendamento',
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/scheduling/system/status
   * Retorna status do sistema de agendamento
   */
  async getSystemStatus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const status = await this.schedulingService.getSystemStatus();

      reply.send({
        success: true,
        message: 'Status do sistema recuperado',
        data: status,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno';

      reply.code(500).send({
        success: false,
        message: 'Erro ao buscar status do sistema',
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/scheduling/system/restart
   * Reinicia todos os jobs do sistema
   */
  async restartSystem(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      await this.schedulingService.restartAllJobs();

      reply.send({
        success: true,
        message: 'Sistema de agendamento reiniciado com sucesso',
        data: { restartedAt: new Date() },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno';

      reply.code(500).send({
        success: false,
        message: 'Erro ao reiniciar sistema',
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/scheduling/system/health
   * Executa verificação de saúde do sistema
   */
  async healthCheck(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const health = await this.schedulingService.healthCheck();

      const status = health.errors.length === 0 ? 200 : 207; // 207 = Multi-Status

      reply.code(status).send({
        success: health.errors.length === 0,
        message:
          health.errors.length === 0
            ? 'Sistema funcionando corretamente'
            : 'Sistema com problemas detectados',
        data: {
          fixed: health.fixed,
          errors: health.errors,
          checkedAt: new Date(),
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno';

      reply.code(500).send({
        success: false,
        message: 'Erro ao executar verificação de saúde',
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/scheduling/templates
   * Retorna templates predefinidos de agendamento
   */
  async getScheduleTemplates(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const templates = [
        {
          id: 'daily-etl-2am',
          name: 'ETL Diário às 2:00',
          description: 'Execução completa do ETL todos os dias às 2:00',
          config: {
            frequency: 'DAILY',
            timeOfDay: '02:00',
            jobType: 'FULL_ETL',
            advancedConfig: {
              onlyIfActiveePeriod: true,
              emailNotifications: true,
              skipIfPreviousRunning: true,
            },
          },
        },
        {
          id: 'weekly-etl-monday-3am',
          name: 'ETL Semanal - Segunda às 3:00',
          description: 'Execução completa do ETL toda segunda-feira às 3:00',
          config: {
            frequency: 'WEEKLY',
            timeOfDay: '03:00',
            weekDays: {
              monday: true,
              tuesday: false,
              wednesday: false,
              thursday: false,
              friday: false,
              saturday: false,
              sunday: false,
            },
            jobType: 'FULL_ETL',
            advancedConfig: {
              onlyIfActiveePeriod: true,
              emailNotifications: true,
              skipIfPreviousRunning: true,
            },
          },
        },
        {
          id: 'monthly-validation-1st-4am',
          name: 'Validação Mensal - Dia 1 às 4:00',
          description: 'Validação de dados todo dia 1 do mês às 4:00',
          config: {
            frequency: 'MONTHLY',
            timeOfDay: '04:00',
            dayOfMonth: 1,
            jobType: 'DATA_VALIDATION',
            advancedConfig: {
              onlyIfActiveePeriod: false,
              emailNotifications: true,
              skipIfPreviousRunning: false,
            },
          },
        },
        {
          id: 'daily-recalc-6am',
          name: 'Recálculo Diário às 6:00',
          description: 'Recálculo rápido todos os dias às 6:00',
          config: {
            frequency: 'DAILY',
            timeOfDay: '06:00',
            jobType: 'PARTIAL_RECALCULATION',
            advancedConfig: {
              onlyIfActiveePeriod: true,
              emailNotifications: false,
              skipIfPreviousRunning: true,
            },
          },
        },
      ];

      reply.send({
        success: true,
        message: 'Templates de agendamento disponíveis',
        data: templates,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno';

      reply.code(500).send({
        success: false,
        message: 'Erro ao buscar templates',
        error: errorMessage,
      });
    }
  }
}
