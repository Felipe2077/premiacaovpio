// apps/api/src/routes/audit.routes.ts
import { requirePermissions, viewReports } from '@/middleware/rbac.middleware';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin de rotas de auditoria
 */
const auditRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/audit-logs - Listar logs de auditoria
   */
  fastify.get(
    '/api/audit-logs',
    {
      preHandler: [
        (fastify as any).authenticate,
        requirePermissions('view_all_audit_logs' as any),
      ],
    },
    async (request, reply) => {
      try {
        const queryParams = request.query as { limit?: string };
        const limit = queryParams.limit ? parseInt(queryParams.limit, 10) : 50;

        if (isNaN(limit) || limit < 1 || limit > 1000) {
          return reply.status(400).send({
            error: 'limit deve ser um número entre 1 e 1000',
          });
        }

        const data = await fastify.services.auditLog.getAuditLogs(limit);

        request.log.info(`Retornando ${data.length} logs de auditoria`);
        reply.send(data);
      } catch (error: any) {
        request.log.error(`Erro em getAuditLogs: ${error.message}`);
        reply.status(500).send({
          error: error.message || 'Erro interno ao buscar logs de auditoria.',
        });
      }
    }
  );

  /**
   * GET /api/history/criterion-sector - Histórico critério-setor
   */
  fastify.get(
    '/api/history/criterion-sector',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    async (request, reply) => {
      try {
        request.log.info(
          'Recebida requisição GET /api/history/criterion-sector'
        );

        const query = request.query as {
          criterionId?: string;
          sectorId?: string;
          limit?: string;
        };

        if (!query.criterionId || !query.sectorId) {
          request.log.warn('Parâmetros obrigatórios ausentes:', query);
          return reply.status(400).send({
            error: 'Parâmetros criterionId e sectorId são obrigatórios',
          });
        }

        const criterionId = parseInt(query.criterionId, 10);
        const sectorId = parseInt(query.sectorId, 10);
        const limit = query.limit ? parseInt(query.limit, 10) : 24;

        if (isNaN(criterionId) || isNaN(sectorId)) {
          request.log.warn('IDs inválidos:', {
            criterionId: query.criterionId,
            sectorId: query.sectorId,
          });
          return reply.status(400).send({
            error: 'criterionId e sectorId devem ser números válidos',
          });
        }

        if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
          return reply.status(400).send({
            error: 'limit deve ser um número entre 1 e 100',
          });
        }

        request.log.info(
          `Buscando histórico: criterionId=${criterionId}, sectorId=${sectorId}, limit=${limit}`
        );

        const historyData =
          await fastify.services.history.getCriterionSectorHistory(
            criterionId,
            sectorId,
            limit
          );

        request.log.info(
          `Histórico retornado: ${historyData.timeline.length} entradas, período: ${historyData.summary.timeSpan}`
        );

        reply.send(historyData);
      } catch (error: any) {
        request.log.error(`Erro ao buscar histórico: ${error.message}`, error);

        if (error.message.includes('não encontrado')) {
          reply.status(404).send({ error: error.message });
        } else if (
          error.message.includes('critério') ||
          error.message.includes('setor')
        ) {
          reply.status(400).send({ error: error.message });
        } else {
          reply.status(500).send({
            error:
              'Erro interno ao buscar histórico. Tente novamente mais tarde.',
          });
        }
      }
    }
  );

  fastify.log.info('✅ Rotas de Auditoria registradas');
};

export default fp(auditRoutes, {
  name: 'audit-routes',
});
