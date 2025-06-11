// apps/api/src/routes/results.routes.ts
import { ResultsController } from '@/controllers/results.controller';
import { viewReports } from '@/middleware/rbac.middleware';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin de rotas de resultados e rankings
 */
const resultsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Instanciar controller com serviços injetados
  const controller = new ResultsController({
    ranking: fastify.services.ranking,
  });

  /**
   * GET /api/ranking - Ranking atual do sistema
   */
  fastify.get(
    '/api/ranking',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    controller.getCurrentRanking.bind(controller)
  );

  /**
   * GET /api/results/by-date - Resultados por data específica
   */
  fastify.get(
    '/api/results/by-date',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    controller.getResultsByDate.bind(controller)
  );

  /**
   * GET /api/results - Resultados gerais com período opcional
   */
  fastify.get(
    '/api/results',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    controller.getResults.bind(controller)
  );

  /**
   * GET /api/results/current - Resultados do período ativo
   */
  fastify.get(
    '/api/results/current',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    controller.getCurrentResults.bind(controller)
  );

  /**
   * GET /api/results/by-period - Resultados por período (YYYY-MM)
   */
  fastify.get(
    '/api/results/by-period',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    controller.getResultsByPeriod.bind(controller)
  );

  /**
   * GET /api/results/period/:id - Resultados por ID do período
   */
  fastify.get<{ Params: { id: string } }>(
    '/api/results/period/:id',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    controller.getResultsByPeriodId.bind(controller)
  );

  fastify.log.info('✅ Rotas de Resultados registradas');
};

export default fp(resultsRoutes, {
  name: 'results-routes',
});
