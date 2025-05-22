// src/modules/historical/historical-results.routes.ts

import { historicalResultsService } from '@/modules/historical/historical-results.service';
import { FastifyInstance, FastifyRequest } from 'fastify';

interface HistoricalResultsQuery {
  criterionId?: string;
  sectorId?: string;
  currentPeriod?: string;
  count?: string;
}

export async function registerHistoricalResultsRoutes(
  fastify: FastifyInstance
) {
  fastify.get(
    '/api/results/historical',
    async (
      request: FastifyRequest<{ Querystring: HistoricalResultsQuery }>,
      reply
    ) => {
      try {
        const { criterionId, sectorId, currentPeriod, count } = request.query;

        // Validar parâmetros obrigatórios
        if (!criterionId || !sectorId || !currentPeriod) {
          return reply.status(400).send({
            success: false,
            error:
              'Parâmetros obrigatórios: criterionId, sectorId, currentPeriod',
          });
        }

        // Validar formato do período
        if (!currentPeriod.match(/^\d{4}-\d{2}$/)) {
          return reply.status(400).send({
            success: false,
            error: 'Formato de período inválido. Use YYYY-MM',
          });
        }

        console.log(
          `[API] GET /api/results/historical - Critério: ${criterionId}, Setor: ${sectorId}, Período: ${currentPeriod}, Count: ${count || '6 (padrão)'}`
        );

        // Converter para números
        const criterionIdNum = parseInt(criterionId, 10);
        const sectorIdNum = parseInt(sectorId, 10);
        const countNum = count ? parseInt(count, 10) : 6;

        // Validar conversões
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

        // Buscar dados históricos
        const data = await historicalResultsService.getHistoricalResults(
          criterionIdNum,
          sectorIdNum,
          currentPeriod,
          countNum
        );

        console.log(
          `[API] GET /api/results/historical - Resultados encontrados: ${data.history.length} períodos`
        );

        // Retornar os dados
        return reply.send({
          success: true,
          data,
        });
      } catch (error: any) {
        console.error(
          `[API] ERRO em /api/results/historical: ${error.message}`,
          error
        );
        return reply.status(500).send({
          success: false,
          error: error.message || 'Erro interno do servidor',
        });
      }
    }
  );
}
