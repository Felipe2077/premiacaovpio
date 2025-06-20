// apps/api/src/routes/automation.routes.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { AutomationController } from '../controllers/automation.controller';

/**
 * Plugin de rotas para automação do ETL
 * Registra endpoints para controle e monitoramento do sistema
 */
const automationRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  const controller = new AutomationController();

  /**
   * POST /api/automation/trigger-update
   * Dispara atualização completa ou parcial do sistema
   */
  fastify.post(
    '/api/automation/trigger-update',
    {
      schema: {
        description: 'Dispara atualização do sistema ETL',
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
                  periodId: { type: 'number' },
                  periodMesAno: { type: 'string' },
                  executionTimeMs: { type: 'number' },
                  recordsProcessed: {
                    type: 'object',
                    properties: {
                      rawRecords: { type: 'number' },
                      performanceRecords: { type: 'number' },
                      rankingRecords: { type: 'number' },
                    },
                  },
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
        description: 'Dispara recálculo após aprovação de expurgo',
        tags: ['Automation'],
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
      },
    },
    controller.triggerExpurgoRecalculation.bind(controller)
  );

  /**
   * GET /api/automation/status
   * Status geral do sistema de automação
   */
  fastify.get(
    '/api/automation/status',
    {
      schema: {
        description: 'Status geral do sistema de automação',
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

  fastify.log.info('✅ Rotas de Automação registradas');
};

export default fp(automationRoutes, {
  name: 'automation-routes',
});
