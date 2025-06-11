// apps/api/src/routes/historical-results.routes.ts (VERSÃO PLUGIN CORRIGIDA)
import { historicalResultsService } from '@/modules/historical/historical-results.service';
import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

interface HistoricalResultsQuery {
  criterionId?: string;
  sectorId?: string;
  currentPeriod?: string;
  count?: string;
}

const historicalResultsRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Este hook agora só se aplica às rotas DENTRO deste arquivo.
  // fastify.addHook('preHandler', fastify.auth([fastify.authenticate]));

  fastify.get(
    '/api/results/historical',
    async (
      request: FastifyRequest<{ Querystring: HistoricalResultsQuery }>,
      reply
    ) => {
      try {
        const { criterionId, sectorId, currentPeriod, count } = request.query;

        // Sua lógica original de validação e busca...
        if (!criterionId || !sectorId || !currentPeriod) {
          return reply.status(400).send({
            success: false,
            error:
              'Parâmetros obrigatórios: criterionId, sectorId, currentPeriod',
          });
        }

        const criterionIdNum = parseInt(criterionId, 10);
        const sectorIdNum = parseInt(sectorId, 10);
        const countNum = count ? parseInt(count, 10) : 6;

        if (
          isNaN(criterionIdNum) ||
          isNaN(sectorIdNum) ||
          (count && isNaN(countNum))
        ) {
          return reply.status(400).send({
            success: false,
            error: 'criterionId, sectorId e count devem ser números válidos',
          });
        }

        const data = await historicalResultsService.getHistoricalResults(
          criterionIdNum,
          sectorIdNum,
          currentPeriod,
          countNum
        );

        return reply.send({ success: true, data });
      } catch (error: any) {
        request.log.error(
          `[API] ERRO em /api/results/historical: ${error.message}`,
          error
        );
        return reply.status(500).send({
          success: false,
          error: error.message || 'Erro interno ao buscar dados históricos.',
        });
      }
    }
  );

  fastify.log.info('✅ Rotas de Histórico de Resultados registradas');
};

export default fp(historicalResultsRoutes);
