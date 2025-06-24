// apps/api/src/routes/admin.routes.ts - ATUALIZADO COM CRUD USUÁRIOS
import { UsersController } from '@/controllers/users.controller';
import { auditAdminAction, manageUsers } from '@/middleware/rbac.middleware';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin de rotas administrativas - CRUD de Usuários Implementado
 */
const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Instanciar controller com serviços injetados
  const usersController = new UsersController({
    user: fastify.services.user,
    auth: fastify.services.auth,
  });

  // ============================================
  // 🏗️ ROTAS PRINCIPAIS DE CRUD DE USUÁRIOS
  // ============================================

  /**
   * GET /api/admin/users - Listar usuários com filtros e paginação
   */
  fastify.get(
    '/api/admin/users',
    {
      preHandler: [(fastify as any).authenticate, manageUsers],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            active: { type: 'string', enum: ['true', 'false'] },
            role: { type: 'string' },
            sectorId: { type: 'string', pattern: '^[0-9]+$' },
            search: { type: 'string', minLength: 1 },
            page: { type: 'string', pattern: '^[0-9]+$' },
            limit: { type: 'string', pattern: '^[0-9]+$' },
            sortBy: { type: 'string' },
          },
        },
      },
    },
    usersController.getUsers.bind(usersController)
  );

  /**
   * GET /api/admin/users/statistics - Estatísticas de usuários
   */
  fastify.get(
    '/api/admin/users/statistics',
    {
      preHandler: [(fastify as any).authenticate, manageUsers],
    },
    usersController.getUserStatistics.bind(usersController)
  );

  /**
   * GET /api/admin/users/health - Health check do serviço
   */
  fastify.get(
    '/api/admin/users/health',
    {
      preHandler: [(fastify as any).authenticate, manageUsers],
    },
    usersController.healthCheck.bind(usersController)
  );

  /**
   * GET /api/admin/users/search - Busca textual de usuários
   */
  fastify.get(
    '/api/admin/users/search',
    {
      preHandler: [(fastify as any).authenticate, manageUsers],
      schema: {
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string', minLength: 2 },
            limit: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
      },
    },
    usersController.searchUsers.bind(usersController)
  );

  /**
   * POST /api/admin/users/validate-email - Validar disponibilidade de email
   */
  fastify.post(
    '/api/admin/users/validate-email',
    {
      preHandler: [(fastify as any).authenticate, manageUsers],
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
            excludeUserId: { type: 'number', minimum: 1 },
          },
        },
      },
    },
    usersController.validateEmail.bind(usersController)
  );

  /**
   * GET /api/admin/users/by-sector/:sectorId - Usuários por setor
   */
  fastify.get(
    '/api/admin/users/by-sector/:sectorId',
    {
      preHandler: [(fastify as any).authenticate, manageUsers],
      schema: {
        params: {
          type: 'object',
          required: ['sectorId'],
          properties: {
            sectorId: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
      },
    },
    usersController.getUsersBySector.bind(usersController)
  );

  /**
   * GET /api/admin/users/by-role/:role - Usuários por role
   */
  fastify.get(
    '/api/admin/users/by-role/:role',
    {
      preHandler: [(fastify as any).authenticate, manageUsers],
      schema: {
        params: {
          type: 'object',
          required: ['role'],
          properties: {
            role: {
              type: 'string',
              enum: ['DIRETOR', 'GERENTE', 'VISUALIZADOR'],
            },
          },
        },
      },
    },
    usersController.getUsersByRole.bind(usersController)
  );

  /**
   * GET /api/admin/users/:id - Buscar usuário por ID
   */
  fastify.get(
    '/api/admin/users/:id',
    {
      preHandler: [(fastify as any).authenticate, manageUsers],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
      },
    },
    usersController.getUserById.bind(usersController)
  );

  /**
   * POST /api/admin/users - Criar novo usuário
   */
  fastify.post(
    '/api/admin/users',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageUsers,
        auditAdminAction('CREATE_USER'),
      ],
      schema: {
        body: {
          type: 'object',
          required: ['nome', 'email', 'role'],
          properties: {
            nome: { type: 'string', minLength: 2, maxLength: 100 },
            email: { type: 'string', format: 'email', maxLength: 150 },
            password: { type: 'string', minLength: 8, maxLength: 128 },
            role: {
              type: 'string',
              enum: ['DIRETOR', 'GERENTE', 'VISUALIZADOR'],
            },
            sectorId: { type: 'number', minimum: 1 },
            ativo: { type: 'boolean' },
            sendWelcomeEmail: { type: 'boolean' },
          },
        },
      },
    },
    usersController.createUser.bind(usersController)
  );

  /**
   * PUT /api/admin/users/:id - Atualizar usuário
   */
  fastify.put(
    '/api/admin/users/:id',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageUsers,
        auditAdminAction('UPDATE_USER'),
      ],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        body: {
          type: 'object',
          properties: {
            nome: { type: 'string', minLength: 2, maxLength: 100 },
            email: { type: 'string', format: 'email', maxLength: 150 },
            role: {
              type: 'string',
              enum: ['DIRETOR', 'GERENTE', 'VISUALIZADOR'],
            },
            sectorId: { type: ['number', 'null'], minimum: 1 },
            ativo: { type: 'boolean' },
          },
        },
      },
    },
    usersController.updateUser.bind(usersController)
  );

  /**
   * DELETE /api/admin/users/:id - Desativar usuário (soft delete)
   */
  fastify.delete(
    '/api/admin/users/:id',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageUsers,
        auditAdminAction('DELETE_USER'),
      ],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        body: {
          type: 'object',
          required: ['justification'],
          properties: {
            justification: { type: 'string', minLength: 10, maxLength: 500 },
          },
        },
      },
    },
    usersController.deleteUser.bind(usersController)
  );

  // ============================================
  // 🔐 ROTAS DE AÇÕES ADMINISTRATIVAS
  // ============================================

  /**
   * POST /api/admin/users/:id/unlock - Desbloquear conta
   */
  fastify.post(
    '/api/admin/users/:id/unlock',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageUsers,
        auditAdminAction('UNLOCK_USER'),
      ],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        body: {
          type: 'object',
          required: ['justification'],
          properties: {
            justification: { type: 'string', minLength: 10, maxLength: 500 },
            resetLoginAttempts: { type: 'boolean' },
          },
        },
      },
    },
    usersController.unlockUser.bind(usersController)
  );

  /**
   * POST /api/admin/users/:id/reset-password - Reset de senha
   */
  fastify.post(
    '/api/admin/users/:id/reset-password',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageUsers,
        auditAdminAction('RESET_USER_PASSWORD'),
      ],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        body: {
          type: 'object',
          required: ['justification'],
          properties: {
            justification: { type: 'string', minLength: 10, maxLength: 500 },
            newPassword: { type: 'string', minLength: 8, maxLength: 128 },
            forceChangeOnLogin: { type: 'boolean' },
            notifyUser: { type: 'boolean' },
          },
        },
      },
    },
    usersController.resetUserPassword.bind(usersController)
  );

  /**
   * POST /api/admin/users/:id/toggle-status - Ativar/Desativar usuário
   */
  fastify.post(
    '/api/admin/users/:id/toggle-status',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageUsers,
        auditAdminAction('TOGGLE_USER_STATUS'),
      ],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        body: {
          type: 'object',
          required: ['ativo', 'justification'],
          properties: {
            ativo: { type: 'boolean' },
            justification: { type: 'string', minLength: 10, maxLength: 500 },
          },
        },
      },
    },
    usersController.toggleUserStatus.bind(usersController)
  );

  // ============================================
  // 🔐 ROTAS DE GESTÃO DE SESSÕES
  // ============================================

  /**
   * GET /api/admin/users/:id/sessions - Listar sessões do usuário
   */
  fastify.get(
    '/api/admin/users/:id/sessions',
    {
      preHandler: [(fastify as any).authenticate, manageUsers],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
      },
    },
    usersController.getUserSessions.bind(usersController)
  );

  /**
   * POST /api/admin/users/:id/invalidate-sessions - Invalidar todas as sessões
   */
  fastify.post(
    '/api/admin/users/:id/invalidate-sessions',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageUsers,
        auditAdminAction('INVALIDATE_USER_SESSIONS'),
      ],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        body: {
          type: 'object',
          required: ['justification'],
          properties: {
            justification: { type: 'string', minLength: 10, maxLength: 500 },
          },
        },
      },
    },
    usersController.invalidateUserSessions.bind(usersController)
  );

  fastify.log.info('✅ Rotas administrativas de usuários registradas');
};

export default fp(adminRoutes, {
  name: 'admin-routes',
});
