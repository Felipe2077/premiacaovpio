// apps/api/src/routes/automation.routes.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { AutomationController } from '../controllers/automation.controller';

/**
 * Plugin de rotas para automação do ETL
 * VERSÃO 2: Integrado com sistema de queue e WebSockets
 */
const automationRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  const controller = new AutomationController();

  // ===== REGISTRAR WEBSOCKETS =====
  await controller.registerWebSocketRoutes(fastify);

  /**
   * POST /api/automation/trigger-update
   * Dispara atualização do sistema ETL (com suporte a queue)
   */
  fastify.post(
    '/api/automation/trigger-update',
    {
      schema: {
        description: 'Dispara atualização do sistema ETL via queue ou síncrono',
        tags: ['Automation'],
        body: {
          type: 'object',
          properties: {
            triggeredBy: {
              type: 'string',
              enum: ['manual', 'automatic', 'expurgo', 'meta-change'],
              default: 'manual',
              description: 'Origem do disparo da atualização',
            },
            userId: {
              type: 'number',
              description: 'ID do usuário que disparou (se manual)',
            },
            partialUpdate: {
              type: 'boolean',
              default: false,
              description: 'Se true, executa apenas recálculo (sem ETL)',
            },
            useQueue: {
              type: 'boolean',
              default: true,
              description: 'Se true, usa sistema de queue assíncrono',
            },
            priority: {
              type: 'number',
              minimum: 1,
              maximum: 10,
              default: 5,
              description: 'Prioridade do job (1=baixa, 10=alta)',
            },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  jobId: { type: 'string' },
                  status: { type: 'string' },
                  mode: { type: 'string' },
                  websocketEndpoint: { type: 'string' },
                },
              },
            },
          },
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  periodId: { type: 'number' },
                  periodMesAno: { type: 'string' },
                  executionTimeMs: { type: 'number' },
                  mode: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    controller.triggerUpdate.bind(controller)
  );

  /**
   * GET /api/automation/jobs/:jobId
   * Retorna o progresso de um job específico
   */
  fastify.get(
    '/api/automation/jobs/:jobId',
    {
      schema: {
        description: 'Busca progresso de um job específico',
        tags: ['Automation', 'Jobs'],
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
          required: ['jobId'],
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
                  jobId: { type: 'string' },
                  type: { type: 'string' },
                  status: { type: 'string' },
                  progress: { type: 'number' },
                  currentStep: { type: 'string' },
                  startedAt: { type: 'string' },
                  estimatedTimeRemaining: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    controller.getJobProgress.bind(controller)
  );

  /**
   * GET /api/automation/jobs
   * Lista todos os jobs ativos
   */
  fastify.get(
    '/api/automation/jobs',
    {
      schema: {
        description: 'Lista todos os jobs ativos na queue',
        tags: ['Automation', 'Jobs'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  jobs: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        jobId: { type: 'string' },
                        type: { type: 'string' },
                        status: { type: 'string' },
                        progress: { type: 'number' },
                      },
                    },
                  },
                  totalJobs: { type: 'number' },
                  websocketClients: { type: 'number' },
                  activeSubscriptions: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
    controller.getActiveJobs.bind(controller)
  );

  /**
   * DELETE /api/automation/jobs/:jobId
   * Cancela um job específico
   */
  fastify.delete(
    '/api/automation/jobs/:jobId',
    {
      schema: {
        description: 'Cancela um job específico',
        tags: ['Automation', 'Jobs'],
        params: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
          },
          required: ['jobId'],
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
                  jobId: { type: 'string' },
                  status: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    controller.cancelJob.bind(controller)
  );

  /**
   * GET /api/automation/active-period
   * Retorna informações da vigência ativa
   */
  fastify.get(
    '/api/automation/active-period',
    {
      schema: {
        description: 'Busca informações da vigência ativa',
        tags: ['Automation'],
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
                  mesAno: { type: 'string' },
                  dataInicio: { type: 'string' },
                  dataFim: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    controller.getActivePeriod.bind(controller)
  );

  /**
   * POST /api/automation/trigger-expurgo-recalculation
   * Específico para recálculo após aprovação de expurgo
   */
  fastify.post(
    '/api/automation/trigger-expurgo-recalculation',
    {
      schema: {
        description: 'Dispara recálculo após aprovação de expurgo via queue',
        tags: ['Automation', 'Expurgo'],
        body: {
          type: 'object',
          properties: {
            userId: {
              type: 'number',
              description: 'ID do usuário que aprovou o expurgo',
            },
            expurgoId: {
              type: 'number',
              description: 'ID do expurgo aprovado',
            },
          },
        },
        response: {
          202: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  jobId: { type: 'string' },
                  expurgoId: { type: 'number' },
                  status: { type: 'string' },
                  websocketEndpoint: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    controller.triggerExpurgoRecalculation.bind(controller)
  );

  /**
   * GET /api/automation/status
   * Status geral do sistema de automação (expandido)
   */
  fastify.get(
    '/api/automation/status',
    {
      schema: {
        description:
          'Status geral do sistema de automação com informações de queue',
        tags: ['Automation'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  hasActivePeriod: { type: 'boolean' },
                  activePeriod: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      id: { type: 'number' },
                      mesAno: { type: 'string' },
                      status: { type: 'string' },
                    },
                  },
                  systemReady: { type: 'boolean' },
                  queueStatus: {
                    type: 'object',
                    properties: {
                      activeJobs: { type: 'number' },
                      processingJobs: { type: 'number' },
                      waitingJobs: { type: 'number' },
                    },
                  },
                  websocketStatus: {
                    type: 'object',
                    properties: {
                      connectedClients: { type: 'number' },
                      activeSubscriptions: { type: 'number' },
                    },
                  },
                  lastUpdate: { type: 'string' },
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
   * POST /api/automation/validate-period
   * Valida se é possível executar operações na vigência ativa
   */
  fastify.post(
    '/api/automation/validate-period',
    {
      schema: {
        description: 'Valida vigência ativa para operações',
        tags: ['Automation'],
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
                  mesAno: { type: 'string' },
                  status: { type: 'string' },
                  canUpdate: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    controller.validateActivePeriod.bind(controller)
  );

  /**
   * GET /api/automation/last-execution
   * Retorna dados da última execução ETL bem-sucedida
   * ROTA PÚBLICA - Não requer autenticação
   */
  fastify.get(
    '/api/automation/last-execution',
    {
      schema: {
        description:
          'Retorna dados da última execução ETL bem-sucedida (rota pública)',
        tags: ['Automation'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  lastExecution: {
                    type: 'object',
                    nullable: true,
                    properties: {
                      executedAt: { type: 'string', format: 'date-time' },
                      status: { type: 'string' },
                      durationMs: { type: 'number', nullable: true },
                      durationFormatted: { type: 'string', nullable: true },
                      recordsProcessed: { type: 'number', nullable: true },
                      triggeredBy: { type: 'string' },
                      periodProcessed: { type: 'string', nullable: true },
                      executedAtFormatted: { type: 'string' },
                      relativeTime: { type: 'string' },
                    },
                  },
                  hasExecutions: { type: 'boolean' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          500: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              error: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  lastExecution: { type: 'null' },
                  hasExecutions: { type: 'boolean' },
                },
              },
            },
          },
        },
      },
    },
    controller.getLastExecution.bind(controller)
  );

  /**
   * GET /api/automation/execution-history
   * Retorna histórico de execuções ETL
   * ROTA PÚBLICA - Não requer autenticação
   */
  fastify.get(
    '/api/automation/execution-history',
    {
      schema: {
        description: 'Retorna histórico de execuções ETL (rota pública)',
        tags: ['Automation'],
        querystring: {
          type: 'object',
          properties: {
            limit: {
              type: 'string',
              description: 'Número máximo de registros (máx: 50)',
              default: '10',
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
                  executions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        executedAt: { type: 'string', format: 'date-time' },
                        status: { type: 'string' },
                        durationMs: { type: 'number', nullable: true },
                        durationFormatted: { type: 'string', nullable: true },
                        recordsProcessed: { type: 'number', nullable: true },
                        triggeredBy: { type: 'string' },
                        periodProcessed: { type: 'string', nullable: true },
                        executedAtFormatted: { type: 'string' },
                        relativeTime: { type: 'string' },
                      },
                    },
                  },
                  total: { type: 'number' },
                  limit: { type: 'number' },
                  hasMore: { type: 'boolean' },
                },
              },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
    controller.getExecutionHistory.bind(controller)
  );

  fastify.log.info(
    '✅ Rotas de Automação v2 registradas (com Queue e WebSockets)'
  );
};

export default fp(automationRoutes, {
  name: 'automation-routes-v2',
});
