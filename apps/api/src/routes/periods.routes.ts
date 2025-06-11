// apps/api/src/routes/periods.routes.ts (VERSÃO FINAL E CORRIGIDA)
import {
  auditAdminAction,
  closePeriods,
  startPeriods,
} from '@/middleware/rbac.middleware';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const periodsRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // O hook global que travava todas as rotas foi removido daqui.

  // GET /api/periods/active - ROTA PÚBLICA
  fastify.get('/api/periods/active', async (request, reply) => {
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
      reply.status(500).send({ error: error.message || 'Erro interno.' });
    }
  });

  // GET /api/periods/latest-closed - ROTA PÚBLICA
  fastify.get('/api/periods/latest-closed', async (request, reply) => {
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
      reply.status(500).send({ error: error.message || 'Erro interno.' });
    }
  });

  // GET /api/periods/planning - ROTA PÚBLICA
  fastify.get('/api/periods/planning', async (request, reply) => {
    try {
      request.log.info('GET /api/periods/planning');
      const data =
        await fastify.services.competitionPeriod.findOrCreatePlanningPeriod();
      reply.send(data);
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Erro interno.' });
    }
  });

  // GET /api/periods - ROTA PÚBLICA
  fastify.get('/api/periods', async (request, reply) => {
    try {
      request.log.info('GET /api/periods');
      const data = await fastify.services.competitionPeriod.findAllPeriods();
      reply.send(data);
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Erro interno.' });
    }
  });

  // POST /api/periods/:id/start - ROTA PROTEGIDA
  fastify.post(
    '/api/periods/:id/start',
    {
      preHandler: [
        fastify.authenticate,
        startPeriods,
        auditAdminAction('START_PERIOD'),
      ],
    },
    async (request, reply) => {
      // Sua lógica original de 'start' aqui...
      // (O corpo da função original foi omitido para brevity, mantenha o seu)
      const params = request.params as { id: string };
      const periodId = parseInt(params.id, 10);
      const actingUser = await fastify.services.auth.getUserById(
        (request as any).user!.id
      );
      if (!actingUser)
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      const updatedPeriod =
        await fastify.services.competitionPeriod.startPeriod(
          periodId,
          actingUser as any
        );
      reply.send(updatedPeriod);
    }
  );

  // POST /api/periods/:id/close - ROTA PROTEGIDA
  fastify.post(
    '/api/periods/:id/close',
    {
      preHandler: [
        fastify.authenticate,
        closePeriods,
        auditAdminAction('CLOSE_PERIOD'),
      ],
    },
    async (request, reply) => {
      // Sua lógica original de 'close' aqui...
      // (O corpo da função original foi omitido para brevity, mantenha o seu)
      const params = request.params as { id: string };
      const periodId = parseInt(params.id, 10);
      const actingUser = await fastify.services.auth.getUserById(
        (request as any).user!.id
      );
      if (!actingUser)
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      const updatedPeriod =
        await fastify.services.competitionPeriod.closePeriod(
          periodId,
          actingUser as any
        );
      reply.send(updatedPeriod);
    }
  );

  fastify.log.info('✅ Rotas de Períodos registradas');
};

export default fp(periodsRoutes, {
  name: 'periods-routes',
});
