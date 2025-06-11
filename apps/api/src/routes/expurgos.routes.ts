// apps/api/src/routes/expurgos.routes.ts
import { ExpurgoAttachmentsController } from '@/controllers/expurgo-attachments.controller';
import { ExpurgosController } from '@/controllers/expurgos.controller';
import {
  approveExpurgos,
  auditAdminAction,
  rejectExpurgos,
  requestExpurgos,
  requireSectorAccess,
  viewReports,
} from '@/middleware/rbac.middleware';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin de rotas de expurgos
 */
const expurgosRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // fastify.addHook('preHandler', fastify.auth([fastify.authenticate]));

  // Instanciar controllers com serviços injetados
  const expurgosController = new ExpurgosController({
    expurgo: fastify.services.expurgo,
    auth: fastify.services.auth,
  });

  const attachmentsController = new ExpurgoAttachmentsController({
    expurgo: fastify.services.expurgo,
    auth: fastify.services.auth,
  });

  // === ROTAS DE EXPURGOS ===

  /**
   * GET /api/expurgos - Listar expurgos com filtros
   */
  fastify.get(
    '/api/expurgos',
    {
      preHandler: [
        (fastify as any).authenticate,
        viewReports,
        requestExpurgos,
        requireSectorAccess(),
      ],
    },
    expurgosController.getExpurgos.bind(expurgosController)
  );

  /**
   * GET /api/expurgos/:id - Buscar expurgo por ID
   */
  fastify.get(
    '/api/expurgos/:id',
    {
      preHandler: [(fastify as any).authenticate, viewReports, requestExpurgos],
    },
    expurgosController.getExpurgoById.bind(expurgosController)
  );

  /**
   * POST /api/expurgos/request - Solicitar expurgo
   */
  fastify.post(
    '/api/expurgos/request',
    {
      preHandler: [
        (fastify as any).authenticate,
        requestExpurgos,
        auditAdminAction('REQUEST_EXPURGO'),
      ],
    },
    expurgosController.requestExpurgo.bind(expurgosController)
  );

  /**
   * POST /api/expurgos/:id/approve - Aprovar expurgo
   */
  fastify.post(
    '/api/expurgos/:id/approve',
    {
      preHandler: [
        (fastify as any).authenticate,
        approveExpurgos,
        auditAdminAction('APPROVE_EXPURGO'),
      ],
    },
    expurgosController.approveExpurgo.bind(expurgosController)
  );

  /**
   * POST /api/expurgos/:id/reject - Rejeitar expurgo
   */
  fastify.post(
    '/api/expurgos/:id/reject',
    {
      preHandler: [
        (fastify as any).authenticate,
        rejectExpurgos,
        auditAdminAction('REJECT_EXPURGO'),
      ],
    },
    expurgosController.rejectExpurgo.bind(expurgosController)
  );

  // === ROTAS DE ANEXOS ===

  /**
   * POST /api/expurgos/:id/anexos/upload - Upload de anexo
   */
  fastify.post(
    '/api/expurgos/:id/anexos/upload',
    {
      preHandler: [(fastify as any).authenticate, requestExpurgos],
    },
    attachmentsController.uploadAttachment.bind(attachmentsController)
  );

  /**
   * GET /api/expurgos/:id/anexos - Listar anexos do expurgo
   */
  fastify.get(
    '/api/expurgos/:id/anexos',
    {
      preHandler: [(fastify as any).authenticate, viewReports, requestExpurgos],
    },
    attachmentsController.getAttachments.bind(attachmentsController)
  );

  /**
   * GET /api/expurgos/anexos/:attachmentId/download - Download de anexo
   */
  fastify.get(
    '/api/expurgos/anexos/:attachmentId/download',
    {
      preHandler: [(fastify as any).authenticate, viewReports, requestExpurgos],
    },
    attachmentsController.downloadAttachment.bind(attachmentsController)
  );

  /**
   * DELETE /api/expurgos/anexos/:attachmentId - Deletar anexo
   */
  fastify.delete(
    '/api/expurgos/anexos/:attachmentId',
    {
      preHandler: [(fastify as any).authenticate, requestExpurgos],
    },
    attachmentsController.deleteAttachment.bind(attachmentsController)
  );

  // === ROTAS DE ESTATÍSTICAS E RELATÓRIOS ===

  /**
   * GET /api/expurgos/statistics/advanced - Estatísticas avançadas
   */
  fastify.get(
    '/api/expurgos/statistics/advanced',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    async (request, reply) => {
      try {
        request.log.info('[API] GET /api/expurgos/statistics/advanced');

        const queryParams = request.query as { period?: string };

        await fastify.services.expurgo.constructor.prototype.constructor.ensureInitialized();

        const stats = await fastify.services.expurgo.getExpurgoStatistics(
          queryParams.period
        );

        request.log.info(
          `[API] Estatísticas avançadas geradas para período: ${queryParams.period || 'todos'}`
        );
        reply.send(stats);
      } catch (error: any) {
        request.log.error('[API] Erro em getExpurgoStatistics:', error);
        reply.status(500).send({
          error:
            error.message || 'Erro interno ao gerar estatísticas avançadas.',
        });
      }
    }
  );

  /**
   * GET /api/expurgos/with-summary - Expurgos com resumo
   */
  fastify.get(
    '/api/expurgos/with-summary',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    async (request, reply) => {
      try {
        request.log.info('[API] GET /api/expurgos/with-summary');

        const queryParams = request.query as {
          competitionPeriodId?: string;
          sectorId?: string;
          criterionId?: string;
          status?: string;
          periodMesAno?: string;
        };

        const filters: any = {};

        if (queryParams.competitionPeriodId) {
          filters.competitionPeriodId = parseInt(
            queryParams.competitionPeriodId,
            10
          );
        }

        if (queryParams.periodMesAno && !filters.competitionPeriodId) {
          const period =
            await fastify.services.competitionPeriod.constructor.prototype.findPeriodByMesAno(
              queryParams.periodMesAno
            );
          if (period) {
            filters.competitionPeriodId = period.id;
          }
        }

        if (queryParams.sectorId) {
          filters.sectorId = parseInt(queryParams.sectorId, 10);
        }

        if (queryParams.criterionId) {
          filters.criterionId = parseInt(queryParams.criterionId, 10);
        }

        if (queryParams.status) {
          filters.status = queryParams.status.toUpperCase();
        }

        const result =
          await fastify.services.expurgo.findExpurgosWithSummary(filters);

        request.log.info(
          `[API] Expurgos com resumo: ${result.expurgos.length} expurgos, resumo calculado`
        );
        reply.send(result);
      } catch (error: any) {
        request.log.error('[API] Erro em getExpurgosWithSummary:', error);
        reply.status(500).send({
          error: error.message || 'Erro interno ao buscar expurgos com resumo.',
        });
      }
    }
  );

  /**
   * GET /api/expurgos/high-impact - Expurgos de alto impacto
   */
  fastify.get(
    '/api/expurgos/high-impact',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    async (request, reply) => {
      try {
        request.log.info('[API] GET /api/expurgos/high-impact');

        const queryParams = request.query as {
          threshold?: string;
          period?: string;
        };

        const threshold = queryParams.threshold
          ? parseFloat(queryParams.threshold)
          : 50;

        if (isNaN(threshold) || threshold <= 0) {
          return reply.status(400).send({
            error: 'threshold deve ser um número positivo',
          });
        }

        const expurgos = await fastify.services.expurgo.findHighImpactExpurgos(
          threshold,
          queryParams.period
        );

        request.log.info(
          `[API] Encontrados ${expurgos.length} expurgos de alto impacto (>= ${threshold})`
        );
        reply.send(expurgos);
      } catch (error: any) {
        request.log.error('[API] Erro em getHighImpactExpurgos:', error);
        reply.status(500).send({
          error:
            error.message || 'Erro interno ao buscar expurgos de alto impacto.',
        });
      }
    }
  );

  /**
   * GET /api/expurgos/efficiency-report - Relatório de eficiência
   */
  fastify.get(
    '/api/expurgos/efficiency-report',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    async (request, reply) => {
      try {
        request.log.info('[API] GET /api/expurgos/efficiency-report');

        const queryParams = request.query as { period?: string };

        const report =
          await fastify.services.expurgo.getApprovalEfficiencyByCriterion(
            queryParams.period
          );

        request.log.info(
          `[API] Relatório de eficiência gerado: ${report.length} critérios analisados`
        );
        reply.send(report);
      } catch (error: any) {
        request.log.error('[API] Erro em getEfficiencyReport:', error);
        reply.status(500).send({
          error:
            error.message || 'Erro interno ao gerar relatório de eficiência.',
        });
      }
    }
  );

  fastify.log.info('✅ Rotas de Expurgos registradas');
};

export default fp(expurgosRoutes, {
  name: 'expurgos-routes',
});
