// apps/api/src/routes/scheduling.routes.ts
import { SchedulingController } from '@/controllers/scheduling.controller';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin de rotas para sistema de agendamento
 * Fornece APIs completas para CRUD e controle de agendamentos automáticos
 */
const schedulingRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  const controller = new SchedulingController();

  // ===== ROTAS DE AGENDAMENTOS =====

  /**
   * POST /api/scheduling/schedules
   * Cria um novo agendamento
   */
  fastify.post(
    '/api/scheduling/schedules',
    {
      schema: {
        description: 'Cria um novo agendamento automático',
        tags: ['Scheduling'],
        body: {
          type: 'object',
          required: ['name', 'frequency', 'timeOfDay', 'jobType'],
          properties: {
            name: {
              type: 'string',
              description: 'Nome descritivo do agendamento',
              minLength: 1,
              maxLength: 100,
            },
            description: {
              type: 'string',
              description: 'Descrição detalhada (opcional)',
              maxLength: 500,
            },
            frequency: {
              type: 'string',
              enum: ['MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY'],
              description: 'Frequência de execução',
            },
            timeOfDay: {
              type: 'string',
              // CORREÇÃO: Aspas de fechamento adicionada na expressão regular
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
              description: 'Horário de execução (HH:MM)',
            },
            weekDays: {
              type: 'object',
              description: 'Dias da semana (para frequência WEEKLY)',
              properties: {
                monday: { type: 'boolean' },
                tuesday: { type: 'boolean' },
                wednesday: { type: 'boolean' },
                thursday: { type: 'boolean' },
                friday: { type: 'boolean' },
                saturday: { type: 'boolean' },
                sunday: { type: 'boolean' },
              },
            },
            dayOfMonth: {
              type: 'number',
              minimum: 1,
              maximum: 31,
              description: 'Dia do mês (para frequência MONTHLY)',
            },
            jobType: {
              type: 'string',
              enum: ['FULL_ETL', 'PARTIAL_RECALCULATION', 'DATA_VALIDATION'],
              description: 'Tipo de job a ser executado',
            },
            jobOptions: {
              type: 'object',
              description: 'Opções específicas do job',
              additionalProperties: true,
            },
            advancedConfig: {
              type: 'object',
              description: 'Configurações avançadas',
              properties: {
                timezone: { type: 'string' },
                retryAttempts: { type: 'number', minimum: 0, maximum: 10 },
                retryDelay: { type: 'number', minimum: 1 },
                timeoutMinutes: { type: 'number', minimum: 1 },
                onlyIfActivePeriod: { type: 'boolean' }, // CORREÇÃO: Corrigido "Activee" para "Active"
                emailNotifications: { type: 'boolean' },
                slackNotifications: { type: 'boolean' },
                skipIfPreviousRunning: { type: 'boolean' },
              },
            },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  frequency: { type: 'string' },
                  timeOfDay: { type: 'string' },
                  cronExpression: { type: 'string' },
                  nextRunAt: { type: 'string', format: 'date-time' },
                  isActive: { type: 'boolean' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    controller.createSchedule.bind(controller)
  );

  /**
   * GET /api/scheduling/schedules
   * Lista agendamentos com filtros opcionais
   */
  fastify.get(
    '/api/scheduling/schedules',
    {
      schema: {
        description: 'Lista todos os agendamentos com filtros opcionais',
        tags: ['Scheduling'],
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'PAUSED', 'ERROR'],
              description: 'Filtrar por status',
            },
            frequency: {
              type: 'string',
              enum: ['MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY'],
              description: 'Filtrar por frequência',
            },
            jobType: {
              type: 'string',
              enum: ['FULL_ETL', 'PARTIAL_RECALCULATION', 'DATA_VALIDATION'],
              description: 'Filtrar por tipo de job',
            },
            limit: {
              type: 'string',
              description: 'Limite de resultados',
            },
            offset: {
              type: 'string',
              description: 'Offset para paginação',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  schedules: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        name: { type: 'string' },
                        frequency: { type: 'string' },
                        timeOfDay: { type: 'string' },
                        status: { type: 'string' },
                        nextRunAt: { type: 'string', format: 'date-time' },
                        lastRunAt: { type: 'string', format: 'date-time' },
                        executionCount: { type: 'number' },
                      },
                    },
                  },
                  total: { type: 'number' },
                  limit: { type: 'number' },
                  offset: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    controller.getSchedules.bind(controller)
  );

  /**
   * GET /api/scheduling/schedules/:id
   * Busca agendamento específico por ID
   */
  fastify.get(
    '/api/scheduling/schedules/:id',
    {
      schema: {
        description: 'Busca agendamento por ID',
        tags: ['Scheduling'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            // CORREÇÃO: Aspas de fechamento adicionada na expressão regular
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  frequency: { type: 'string' },
                  timeOfDay: { type: 'string' },
                  weekDays: { type: 'object' },
                  dayOfMonth: { type: 'number' },
                  jobType: { type: 'string' },
                  cronExpression: { type: 'string' },
                  isActive: { type: 'boolean' },
                  status: { type: 'string' },
                  nextRunAt: { type: 'string', format: 'date-time' },
                  lastRunAt: { type: 'string', format: 'date-time' },
                  lastRunStatus: { type: 'string' },
                  executionCount: { type: 'number' },
                  consecutiveFailures: { type: 'number' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    controller.getScheduleById.bind(controller)
  );

  /**
   * PUT /api/scheduling/schedules/:id
   * Atualiza um agendamento existente
   */
  fastify.put(
    '/api/scheduling/schedules/:id',
    {
      schema: {
        description: 'Atualiza agendamento existente',
        tags: ['Scheduling'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            // CORREÇÃO: Aspas de fechamento adicionada na expressão regular
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            description: { type: 'string', maxLength: 500 },
            frequency: {
              type: 'string',
              enum: ['MANUAL', 'DAILY', 'WEEKLY', 'MONTHLY'],
            },
            timeOfDay: {
              type: 'string',
              // CORREÇÃO: Aspas de fechamento adicionada na expressão regular
              pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$',
            },
            weekDays: {
              type: 'object',
              properties: {
                monday: { type: 'boolean' },
                tuesday: { type: 'boolean' },
                wednesday: { type: 'boolean' },
                thursday: { type: 'boolean' },
                friday: { type: 'boolean' },
                saturday: { type: 'boolean' },
                sunday: { type: 'boolean' },
              },
            },
            dayOfMonth: { type: 'number', minimum: 1, maximum: 31 },
            jobType: {
              type: 'string',
              enum: ['FULL_ETL', 'PARTIAL_RECALCULATION', 'DATA_VALIDATION'],
            },
            isActive: { type: 'boolean' },
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE', 'PAUSED', 'ERROR'],
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    controller.updateSchedule.bind(controller)
  );

  /**
   * DELETE /api/scheduling/schedules/:id
   * Remove um agendamento
   */
  fastify.delete(
    '/api/scheduling/schedules/:id',
    {
      schema: {
        description: 'Remove agendamento',
        tags: ['Scheduling'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            // CORREÇÃO: Aspas de fechamento adicionada na expressão regular
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    controller.deleteSchedule.bind(controller)
  );

  /**
   * POST /api/scheduling/schedules/:id/execute
   * Executa agendamento imediatamente
   */
  fastify.post(
    '/api/scheduling/schedules/:id/execute',
    {
      schema: {
        description: 'Executa agendamento imediatamente',
        tags: ['Scheduling'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            // CORREÇÃO: Aspas de fechamento adicionada na expressão regular
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  scheduleId: { type: 'number' },
                  executedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    controller.executeScheduleNow.bind(controller)
  );

  // ===== ROTAS DO SISTEMA =====

  /**
   * GET /api/scheduling/system/status
   * Status do sistema de agendamento
   */
  fastify.get(
    '/api/scheduling/system/status',
    {
      schema: {
        description: 'Retorna status do sistema de agendamento',
        tags: ['Scheduling System'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  isEnabled: { type: 'boolean' },
                  activeSchedules: { type: 'number' },
                  runningJobs: { type: 'number' },
                  nextExecution: { type: 'string', format: 'date-time' },
                  lastExecution: { type: 'string', format: 'date-time' },
                  totalExecutions: { type: 'number' },
                  failedExecutions: { type: 'number' },
                  uptime: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    controller.getSystemStatus.bind(controller)
  );

  /**
   * POST /api/scheduling/system/restart
   * Reinicia sistema de agendamento
   */
  fastify.post(
    '/api/scheduling/system/restart',
    {
      schema: {
        description: 'Reinicia todo o sistema de agendamento',
        tags: ['Scheduling System'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  restartedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    controller.restartSystem.bind(controller)
  );

  /**
   * GET /api/scheduling/system/health
   * Verificação de saúde do sistema
   */
  fastify.get(
    '/api/scheduling/system/health',
    {
      schema: {
        description: 'Executa verificação de saúde do sistema',
        tags: ['Scheduling System'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  fixed: { type: 'number' },
                  errors: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  checkedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    controller.healthCheck.bind(controller)
  );

  // ===== ROTAS DE UTILIDADES =====

  /**
   * GET /api/scheduling/templates
   * Templates predefinidos de agendamento
   */
  fastify.get(
    '/api/scheduling/templates',
    {
      schema: {
        description: 'Retorna templates predefinidos de agendamento',
        tags: ['Scheduling'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    config: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
    },
    controller.getScheduleTemplates.bind(controller)
  );

  fastify.log.info('✅ Rotas de Agendamento registradas');
};

export default fp(schedulingRoutes, {
  name: 'scheduling-routes',
});
