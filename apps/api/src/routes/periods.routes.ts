// apps/api/src/routes/periods.routes.ts
import { AppDataSource } from '@/database/data-source';
import {
  auditAdminAction,
  closePeriods,
  manageParameters,
  startPeriods,
  viewReports,
} from '@/middleware/rbac.middleware';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin de rotas de períodos de competição
 */
const periodsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/periods/active - Período ativo atual
   */
  fastify.get(
    '/api/periods/active',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    async (request, reply) => {
      try {
        request.log.info('GET /api/periods/active');

        const data =
          await fastify.services.competitionPeriod.findCurrentActivePeriod();
        if (!data) {
          return reply
            .status(404)
            .send({ message: 'Nenhum período ativo encontrado.' });
        }
        reply.send(data);
      } catch (error: any) {
        request.log.error(`Erro em /api/periods/active: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro interno.' });
      }
    }
  );

  /**
   * GET /api/periods/latest-closed - Último período fechado
   */
  fastify.get(
    '/api/periods/latest-closed',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    async (request, reply) => {
      try {
        request.log.info('GET /api/periods/latest-closed');

        const data =
          await fastify.services.competitionPeriod.findLatestClosedPeriod();
        if (!data) {
          return reply
            .status(404)
            .send({ message: 'Nenhum período fechado encontrado.' });
        }
        reply.send(data);
      } catch (error: any) {
        request.log.error(
          `Erro em /api/periods/latest-closed: ${error.message}`
        );
        reply.status(500).send({ error: error.message || 'Erro interno.' });
      }
    }
  );

  /**
   * GET /api/periods/planning - Período em planejamento
   */
  fastify.get(
    '/api/periods/planning',
    {
      preHandler: [(fastify as any).authenticate, manageParameters],
    },
    async (request, reply) => {
      try {
        request.log.info('GET /api/periods/planning');

        const data =
          await fastify.services.competitionPeriod.findOrCreatePlanningPeriod();
        reply.send(data);
      } catch (error: any) {
        request.log.error(`Erro em /api/periods/planning: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro interno.' });
      }
    }
  );

  /**
   * GET /api/periods - Listar todos os períodos
   */
  fastify.get(
    '/api/periods',
    {
      preHandler: [(fastify as any).authenticate, viewReports],
    },
    async (request, reply) => {
      try {
        request.log.info('GET /api/periods');

        const data = await fastify.services.competitionPeriod.findAllPeriods();
        reply.send(data);
      } catch (error: any) {
        request.log.error(`Erro em /api/periods: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro interno.' });
      }
    }
  );

  /**
   * POST /api/periods/:id/start - Iniciar período
   */
  fastify.post(
    '/api/periods/:id/start',
    {
      preHandler: [
        (fastify as any).authenticate,
        startPeriods,
        auditAdminAction('START_PERIOD'),
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as { id: string };
        const periodId = parseInt(params.id, 10);

        // Usar usuário autenticado real
        const actingUser = await fastify.services.auth.getUserById(
          (request as any).user!.id
        );
        if (!actingUser) {
          return reply.status(401).send({ error: 'Usuário não encontrado' });
        }

        request.log.info(
          `POST /api/periods/${periodId}/start solicitado por ${actingUser.email}`
        );

        if (isNaN(periodId)) {
          return reply.status(400).send({ message: 'ID do período inválido.' });
        }

        await AppDataSource.initialize();

        const updatedPeriod =
          await fastify.services.competitionPeriod.startPeriod(
            periodId,
            actingUser as any
          );
        reply.send(updatedPeriod);
      } catch (error: any) {
        request.log.error(`Erro em startPeriod: ${error.message}`);

        if (
          error.message.includes('não encontrado') ||
          error.message.includes('inválido')
        ) {
          reply.status(404).send({ error: error.message });
        } else if (error.message.includes('não está em status')) {
          reply.status(409).send({ error: error.message });
        } else {
          reply.status(500).send({
            error: error.message || 'Erro interno ao iniciar período.',
          });
        }
      }
    }
  );

  /**
   * POST /api/periods/:id/close - Fechar período
   */
  fastify.post(
    '/api/periods/:id/close',
    {
      preHandler: [
        (fastify as any).authenticate,
        closePeriods,
        auditAdminAction('CLOSE_PERIOD'),
      ],
    },
    async (request, reply) => {
      try {
        const params = request.params as { id: string };
        const periodId = parseInt(params.id, 10);

        // Usar usuário autenticado real
        const actingUser = await fastify.services.auth.getUserById(
          (request as any).user!.id
        );
        if (!actingUser) {
          return reply.status(401).send({ error: 'Usuário não encontrado' });
        }

        request.log.info(
          `POST /api/periods/${periodId}/close solicitado por ${actingUser.email}`
        );

        if (isNaN(periodId)) {
          return reply.status(400).send({ message: 'ID do período inválido.' });
        }

        await AppDataSource.initialize();

        const updatedPeriod =
          await fastify.services.competitionPeriod.closePeriod(
            periodId,
            actingUser as any
          );
        reply.send(updatedPeriod);
      } catch (error: any) {
        request.log.error(`Erro em closePeriod: ${error.message}`);

        if (
          error.message.includes('não encontrado') ||
          error.message.includes('inválido')
        ) {
          reply.status(404).send({ error: error.message });
        } else if (
          error.message.includes('não está em status') ||
          error.message.includes('só pode ser fechado após')
        ) {
          reply.status(409).send({ error: error.message });
        } else {
          reply.status(500).send({
            error: error.message || 'Erro interno ao fechar período.',
          });
        }
      }
    }
  );

  fastify.log.info('✅ Rotas de Períodos registradas');
};

export default fp(periodsRoutes, {
  name: 'periods-routes',
});
