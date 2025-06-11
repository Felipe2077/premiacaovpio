// apps/api/src/routes/auth.routes.ts - SEM ERROS DE TIPO

import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import fp from 'fastify-plugin';
import { AuthService } from '../services/auth.service';

/**
 * Plugin de rotas de autenticação - SEM ERROS DE TIPO
 */
export const authRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Instanciar AuthService
  const authService = new AuthService();

  /**
   * POST /api/auth/login - Login do usuário
   */
  fastify.post(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 },
            rememberMe: { type: 'boolean', default: false },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email, password, rememberMe } = request.body as {
          email: string;
          password: string;
          rememberMe?: boolean;
        };

        const ipAddress = request.ip || 'unknown';
        const userAgent = request.headers['user-agent'] || 'unknown';

        const result = await authService.login(
          { email, password, rememberMe },
          ipAddress,
          userAgent
        );

        fastify.log.info(`Login bem-sucedido para ${email}`);
        reply.send(result);
      } catch (error: any) {
        fastify.log.error('Erro no login:', error);

        let statusCode = 401;
        if (error.code === 'ACCOUNT_LOCKED') {
          statusCode = 423;
        } else if (error.code === 'ACCOUNT_INACTIVE') {
          statusCode = 403;
        }

        reply.status(statusCode).send({
          error: error.message || 'Erro no login',
          code: error.code || 'LOGIN_ERROR',
        });
      }
    }
  );

  /**
   * POST /api/auth/logout - Logout do usuário
   */
  fastify.post(
    '/api/auth/logout',
    {
      preHandler: [(fastify as any).authenticate], // ✅ Type assertion
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const sessionId = (request as any).sessionId; // ✅ Type assertion
        const userId = (request as any).user?.id; // ✅ Type assertion

        if (sessionId) {
          await authService.logout(sessionId, userId);
        }

        fastify.log.info(`Logout realizado para usuário ${userId}`);
        reply.send({ success: true, message: 'Logout realizado com sucesso' });
      } catch (error: any) {
        fastify.log.error('Erro no logout:', error);
        reply.send({ success: true, message: 'Logout realizado' });
      }
    }
  );

  /**
   * GET /api/auth/me - Obter dados do usuário autenticado
   */
  fastify.get(
    '/api/auth/me',
    {
      preHandler: [(fastify as any).authenticate], // ✅ Type assertion
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id; // ✅ Type assertion

        if (!userId) {
          return reply.status(401).send({
            error: 'Usuário não identificado',
          });
        }

        const user = await authService.getUserById(userId);

        if (!user) {
          return reply.status(404).send({
            error: 'Usuário não encontrado',
          });
        }

        reply.send({ user });
      } catch (error: any) {
        fastify.log.error('Erro ao obter dados do usuário:', error);
        reply.status(500).send({
          error: 'Erro interno ao obter dados do usuário',
        });
      }
    }
  );

  /**
   * PUT /api/auth/change-password - Alterar senha
   */
  fastify.put(
    '/api/auth/change-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', minLength: 6 },
            newPassword: { type: 'string', minLength: 6 },
          },
        },
      },
      preHandler: [(fastify as any).authenticate], // ✅ Type assertion
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id; // ✅ Type assertion
        const { currentPassword, newPassword } = request.body as {
          currentPassword: string;
          newPassword: string;
        };

        if (!userId) {
          return reply.status(401).send({
            error: 'Usuário não identificado',
          });
        }

        await authService.changePassword(userId, {
          currentPassword,
          newPassword,
        });

        fastify.log.info(`Senha alterada para usuário ${userId}`);
        reply.send({
          success: true,
          message: 'Senha alterada com sucesso. Faça login novamente.',
        });
      } catch (error: any) {
        fastify.log.error('Erro ao alterar senha:', error);

        let statusCode = 500;
        if (error.code === 'INVALID_CREDENTIALS') {
          statusCode = 400;
        }

        reply.status(statusCode).send({
          error: error.message || 'Erro ao alterar senha',
          code: error.code || 'CHANGE_PASSWORD_ERROR',
        });
      }
    }
  );

  /**
   * POST /api/auth/forgot-password - Solicitar reset de senha
   */
  fastify.post(
    '/api/auth/forgot-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { email } = request.body as { email: string };

        await authService.forgotPassword({ email });

        reply.send({
          success: true,
          message:
            'Se o email existir, você receberá instruções para reset da senha',
        });
      } catch (error: any) {
        fastify.log.error('Erro no forgot password:', error);
        reply.send({
          success: true,
          message:
            'Se o email existir, você receberá instruções para reset da senha',
        });
      }
    }
  );

  /**
   * POST /api/auth/reset-password - Reset de senha com token
   */
  fastify.post(
    '/api/auth/reset-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: { type: 'string' },
            newPassword: { type: 'string', minLength: 6 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { token, newPassword } = request.body as {
          token: string;
          newPassword: string;
        };

        await authService.resetPassword({ token, newPassword });

        fastify.log.info('Reset de senha realizado com sucesso');
        reply.send({
          success: true,
          message: 'Senha resetada com sucesso. Faça login com a nova senha.',
        });
      } catch (error: any) {
        fastify.log.error('Erro no reset password:', error);

        let statusCode = 400;
        if (error.code === 'RESET_TOKEN_INVALID') {
          statusCode = 400;
        }

        reply.status(statusCode).send({
          error: error.message || 'Erro ao resetar senha',
          code: error.code || 'RESET_PASSWORD_ERROR',
        });
      }
    }
  );

  /**
   * POST /api/auth/refresh - Refresh do access token
   */
  fastify.post(
    '/api/auth/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refreshToken', 'sessionId'],
          properties: {
            refreshToken: { type: 'string' },
            sessionId: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { refreshToken, sessionId } = request.body as {
          refreshToken: string;
          sessionId: string;
        };

        const result = await authService.refreshAccessToken(
          refreshToken,
          sessionId
        );

        fastify.log.info(`Token renovado para sessão ${sessionId}`);
        reply.send(result);
      } catch (error: any) {
        fastify.log.error('Erro no refresh token:', error);

        let statusCode = 401;
        if (error.code === 'SESSION_EXPIRED') {
          statusCode = 401;
        } else if (error.code === 'TOKEN_INVALID') {
          statusCode = 401;
        }

        reply.status(statusCode).send({
          error: error.message || 'Erro ao renovar token',
          code: error.code || 'REFRESH_TOKEN_ERROR',
        });
      }
    }
  );

  /**
   * GET /api/auth/health - Health check de autenticação
   */
  fastify.get(
    '/api/auth/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const health = await authService.healthCheck();

        if (health.healthy) {
          reply.send({
            status: 'healthy',
            service: 'auth',
            ...health.details,
          });
        } else {
          reply.status(503).send({
            status: 'unhealthy',
            service: 'auth',
            ...health.details,
          });
        }
      } catch (error: any) {
        fastify.log.error('Erro no health check de auth:', error);
        reply.status(503).send({
          status: 'unhealthy',
          service: 'auth',
          error: 'Health check failed',
        });
      }
    }
  );

  fastify.log.info('✅ Rotas de autenticação registradas');
};

export default fp(authRoutes, {
  name: 'auth-routes',
});
