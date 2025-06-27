// apps/api/src/routes/period-officialization.routes.ts - VERSÃO COM RBAC
import { PeriodOfficializationController } from '@/controllers/period-officialization.controller';
import {
  adminOnly,
  requirePermissions,
  viewReports,
} from '@/middleware/rbac.middleware';
import { CompetitionPeriodService } from '@/modules/periods/period.service';
import { RankingService } from '@/modules/ranking/ranking.service';
import { Permission } from '@sistema-premiacao/shared-types';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * 🏛️ ROTAS PROTEGIDAS PARA OFICIALIZAÇÃO DE PERÍODOS
 *
 * Endpoints para diretores gerenciarem a oficialização de resultados
 * TODAS AS ROTAS PROTEGIDAS COM RBAC
 */
const periodOfficializationRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Instanciar serviços e controller
  const periodService = new CompetitionPeriodService();
  const rankingService = new RankingService();
  const controller = new PeriodOfficializationController(
    periodService,
    rankingService
  );

  /**
   * GET /api/periods/pending-officialization
   * 🔒 PROTEÇÃO: VIEW_REPORTS (Diretores e Gerentes podem ver)
   */
  fastify.get(
    '/api/periods/pending-officialization',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
      schema: {
        description:
          'Lista períodos em status PRE_FECHADA aguardando oficialização',
        tags: ['Period Officialization'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: {
                type: 'object',
                properties: {
                  periods: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        mesAno: { type: 'string' },
                        dataInicio: { type: 'string' },
                        dataFim: { type: 'string' },
                        status: { type: 'string' },
                        createdAt: { type: 'string' },
                      },
                    },
                  },
                  count: { type: 'number' },
                },
              },
              timestamp: { type: 'string' },
            },
          },
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
    controller.getPendingPeriods.bind(controller)
  );

  /**
   * GET /api/periods/:id/ranking-analysis
   * 🔒 PROTEÇÃO: VIEW_REPORTS (Diretores e Gerentes podem ver)
   */
  fastify.get(
    '/api/periods/:id/ranking-analysis',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
      schema: {
        description:
          'Obtém ranking com análise completa de empates para um período',
        tags: ['Period Officialization'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
      },
    },
    controller.getRankingAnalysis.bind(controller)
  );

  /**
   * POST /api/periods/:id/officialize
   * 🔒 PROTEÇÃO: APENAS DIRETOR (RESOLVE_TIES + CLOSE_PERIODS)
   */
  fastify.post(
    '/api/periods/:id/officialize',
    {
      preHandler: [
        (fastify as any).authenticate,
        adminOnly, // Apenas diretores
        requirePermissions(Permission.RESOLVE_TIES, Permission.CLOSE_PERIODS),
      ],
      schema: {
        description:
          '🔒 CRÍTICO: Oficializa um período definindo o setor vencedor (APENAS DIRETORES)',
        tags: ['Period Officialization'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        body: {
          type: 'object',
          required: ['winnerSectorId'],
          properties: {
            winnerSectorId: {
              type: 'number',
              minimum: 1,
              description: 'ID do setor vencedor oficial',
            },
            tieResolvedBy: {
              type: 'number',
              minimum: 1,
              description: 'ID do diretor que resolveu empate (opcional)',
            },
            justification: {
              type: 'string',
              minLength: 10,
              maxLength: 500,
              description: 'Justificativa obrigatória para a decisão',
            },
          },
        },
        response: {
          403: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
              required: { type: 'array' },
            },
          },
        },
      },
    },
    controller.officializePeriod.bind(controller)
  );

  /**
   * GET /api/periods/:id/tie-validation/:sectorName
   * 🔒 PROTEÇÃO: VIEW_REPORTS (Consulta para análise)
   */
  fastify.get(
    '/api/periods/:id/tie-validation/:sectorName',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
      schema: {
        description:
          'Valida elegibilidade de um setor para resolução de empate',
        tags: ['Period Officialization'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id', 'sectorName'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
            sectorName: { type: 'string', minLength: 1, maxLength: 50 },
          },
        },
      },
    },
    controller.validateSectorForTie.bind(controller)
  );

  fastify.log.info('✅ Rotas de Oficialização PROTEGIDAS registradas');
};

export default fp(periodOfficializationRoutes, {
  name: 'period-officialization-routes',
});
