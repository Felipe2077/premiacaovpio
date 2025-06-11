// apps/api/src/routes/admin.routes.ts
import { auditAdminAction, manageUsers } from '@/middleware/rbac.middleware';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin de rotas administrativas
 */
const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/admin/users - Listar usuários (TODO: implementar)
   */
  fastify.get(
    '/api/admin/users',
    {
      preHandler: [(fastify as any).authenticate, manageUsers],
    },
    async (request, reply) => {
      try {
        // TODO: Implementar listagem de usuários com AuthService
        request.log.info('Listagem de usuários solicitada');

        reply.send({
          message: 'Lista de usuários - implementar depois',
          requestedBy: {
            id: (request as any).user?.id,
            email: (request as any).user?.email,
          },
          timestamp: new Date().toISOString(),
          status: 'pending_implementation',
        });
      } catch (error: any) {
        request.log.error('Erro ao listar usuários:', error);
        reply.status(500).send({
          error: 'Erro interno ao listar usuários.',
        });
      }
    }
  );

  /**
   * POST /api/admin/users - Criar usuário (TODO: implementar)
   */
  fastify.post(
    '/api/admin/users',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageUsers,
        auditAdminAction('CREATE_USER'),
      ],
    },
    async (request, reply) => {
      try {
        // TODO: Implementar criação de usuários com AuthService
        request.log.info(
          'Criação de usuário solicitada com dados:',
          request.body
        );

        reply.send({
          message: 'Criar usuário - implementar depois',
          data: request.body,
          requestedBy: {
            id: (request as any).user?.id,
            email: (request as any).user?.email,
          },
          timestamp: new Date().toISOString(),
          status: 'pending_implementation',
        });
      } catch (error: any) {
        request.log.error('Erro ao criar usuário:', error);
        reply.status(500).send({
          error: 'Erro interno ao criar usuário.',
        });
      }
    }
  );

  /**
   * PUT /api/admin/users/:id - Atualizar usuário (TODO: implementar)
   */
  fastify.put(
    '/api/admin/users/:id',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageUsers,
        auditAdminAction('UPDATE_USER'),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        request.log.info(
          `Atualização de usuário ID ${id} solicitada com dados:`,
          request.body
        );

        reply.send({
          message: `Atualizar usuário ${id} - implementar depois`,
          userId: id,
          data: request.body,
          requestedBy: {
            id: (request as any).user?.id,
            email: (request as any).user?.email,
          },
          timestamp: new Date().toISOString(),
          status: 'pending_implementation',
        });
      } catch (error: any) {
        request.log.error('Erro ao atualizar usuário:', error);
        reply.status(500).send({
          error: 'Erro interno ao atualizar usuário.',
        });
      }
    }
  );

  /**
   * DELETE /api/admin/users/:id - Deletar usuário (TODO: implementar)
   */
  fastify.delete(
    '/api/admin/users/:id',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageUsers,
        auditAdminAction('DELETE_USER'),
      ],
    },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };

        request.log.info(`Remoção de usuário ID ${id} solicitada`);

        reply.send({
          message: `Deletar usuário ${id} - implementar depois`,
          userId: id,
          requestedBy: {
            id: (request as any).user?.id,
            email: (request as any).user?.email,
          },
          timestamp: new Date().toISOString(),
          status: 'pending_implementation',
          warning:
            'Esta é uma operação crítica que deve ser implementada com cuidado',
        });
      } catch (error: any) {
        request.log.error('Erro ao deletar usuário:', error);
        reply.status(500).send({
          error: 'Erro interno ao deletar usuário.',
        });
      }
    }
  );

  /**
   * GET /api/admin/system/status - Status do sistema
   */
  fastify.get(
    '/api/admin/system/status',
    {
      preHandler: [(fastify as any).authenticate, manageUsers],
    },
    async (request, reply) => {
      try {
        const authHealth = await fastify.services.auth.healthCheck();

        reply.send({
          status: 'operational',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          version: process.env.npm_package_version || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          services: {
            auth: authHealth,
            database: 'connected',
            ranking: 'operational',
            parameters: 'operational',
            expurgos: 'operational',
          },
          requestedBy: {
            id: (request as any).user?.id,
            email: (request as any).user?.email,
          },
        });
      } catch (error: any) {
        request.log.error('Erro ao obter status do sistema:', error);
        reply.status(500).send({
          error: 'Erro interno ao obter status do sistema.',
        });
      }
    }
  );

  fastify.log.info('✅ Rotas Administrativas registradas');
};

export default fp(adminRoutes, {
  name: 'admin-routes',
});
