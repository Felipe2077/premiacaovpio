// apps/api/src/routes/health.routes.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin de rotas de health check
 */
const healthRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * Health check público (sem autenticação)
   * GET /health
   */
  fastify.get('/health', async (request, reply) => {
    try {
      const health = await fastify.services.auth.healthCheck();

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        auth: health,
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      };
    } catch (error: any) {
      fastify.log.error('Erro no health check público:', error);
      return reply.status(503).send({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Service temporarily unavailable',
      });
    }
  });

  /**
   * Health check autenticado
   * GET /api/health
   */
  fastify.get(
    '/api/health',
    {
      preHandler: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const health = await fastify.services.auth.healthCheck();

        return {
          status: 'authenticated',
          user: {
            id: request.user?.id,
            email: request.user?.email,
            roles: request.user?.roles,
          },
          auth: health,
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        };
      } catch (error: any) {
        fastify.log.error('Erro no health check autenticado:', error);
        return reply.status(503).send({
          status: 'error',
          timestamp: new Date().toISOString(),
          error: 'Authentication service unavailable',
        });
      }
    }
  );

  fastify.log.info('✅ Rotas de Health registradas');
};

export default fp(healthRoutes, {
  name: 'health-routes',
});
