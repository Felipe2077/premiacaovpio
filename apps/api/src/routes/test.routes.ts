// apps/api/src/routes/test.routes.ts
import { adminOnly, requireRoles } from '@/middleware/rbac.middleware';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin de rotas de teste para autenticação e permissões
 */
const testRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * Teste básico de permissões
   * GET /api/test/permissions
   */
  fastify.get(
    '/api/test/permissions',
    {
      preHandler: [(fastify as any).authenticate],
    },
    async (request, reply) => {
      return {
        message: 'Teste de permissões - usuário autenticado',
        user: {
          id: (request as any).user?.id,
          email: (request as any).user?.email,
          roles: (request as any).user?.roles,
          permissions: (request as any).user?.permissions,
        },
        timestamp: new Date().toISOString(),
        endpoint: 'test/permissions',
      };
    }
  );

  /**
   * Teste restrito para diretores
   * GET /api/test/admin-only
   */
  fastify.get(
    '/api/test/admin-only',
    {
      preHandler: [(fastify as any).authenticate, adminOnly],
    },
    async (request, reply) => {
      return {
        message: 'Área restrita - apenas diretores têm acesso',
        user: {
          id: (request as any).user?.id,
          email: (request as any).user?.email,
          roles: (request as any).user?.roles,
        },
        timestamp: new Date().toISOString(),
        endpoint: 'test/admin-only',
        accessLevel: 'DIRETOR',
      };
    }
  );

  /**
   * Teste para diretores e gerentes
   * GET /api/test/manager-or-admin
   */
  fastify.get(
    '/api/test/manager-or-admin',
    {
      preHandler: [
        (fastify as any).authenticate,
        requireRoles('DIRETOR' as any, 'GERENTE' as any),
      ],
    },
    async (request, reply) => {
      return {
        message: 'Área para diretores e gerentes',
        user: {
          id: (request as any).user?.id,
          email: (request as any).user?.email,
          roles: (request as any).user?.roles,
        },
        timestamp: new Date().toISOString(),
        endpoint: 'test/manager-or-admin',
        allowedRoles: ['DIRETOR', 'GERENTE'],
      };
    }
  );

  fastify.log.info('✅ Rotas de Teste registradas');
};

export default fp(testRoutes, {
  name: 'test-routes',
});
