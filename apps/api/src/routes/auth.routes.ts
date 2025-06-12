// apps/api/src/routes/auth.routes.ts (CORRIGIDO - BASEADO NO SEU ORIGINAL)

import {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
} from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin de rotas de autenticação (COM COOKIES PARA MIDDLEWARE)
 */
export const authRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // CORREÇÃO: Usar o AuthService do sistema de injeção de dependência
  const authService = fastify.services.auth;

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

        // 🎯 CORREÇÃO: Adicionar cookies para o middleware
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax' as const,
          path: '/',
          maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
        };

        reply.setCookie('session_token', result.accessToken, cookieOptions);
        reply.setCookie(
          'session_id',
          `session_${result.user.id}`,
          cookieOptions
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
      preHandler: [(fastify as any).authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const sessionId = (request as any).sessionId;
        const userId = (request as any).user?.id;

        if (sessionId) {
          await authService.logout(sessionId, userId);
        }

        // 🎯 CORREÇÃO: Limpar cookies
        reply.clearCookie('session_token', { path: '/' });
        reply.clearCookie('session_id', { path: '/' });

        fastify.log.info(`Logout realizado para usuário ${userId}`);
        reply.send({
          success: true,
          message: 'Logout realizado com sucesso',
        });
      } catch (error: any) {
        fastify.log.error('Erro no logout:', error);

        // Mesmo com erro, limpar cookies
        reply.clearCookie('session_token', { path: '/' });
        reply.clearCookie('session_id', { path: '/' });

        reply.send({
          success: true,
          message: 'Logout realizado',
        });
      }
    }
  );

  /**
   * GET /api/auth/me - Obter dados do usuário autenticado (COM DEBUG)
   */
  fastify.get(
    '/api/auth/me',
    {
      preHandler: [(fastify as any).authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // === LOGS DE DEBUG ===
        console.log('=== DEBUG /api/auth/me ===');
        console.log('request.user completo:', (request as any).user);

        const userId = (request as any).user?.id;
        console.log('userId extraído:', userId, typeof userId);

        if (!userId) {
          console.log('❌ userId é falsy, retornando 401');
          return reply.status(401).send({
            error: 'Usuário não identificado',
          });
        }

        console.log('✅ userId válido, buscando no authService...');
        console.log('authService existe?', !!authService);
        console.log(
          'authService.getUserById existe?',
          !!authService.getUserById
        );

        const user = await authService.getUserById(userId);
        console.log('Usuário encontrado?', !!user);

        if (!user) {
          console.log('❌ Usuário não encontrado no banco');
          return reply.status(401).send({
            error: 'Usuário não encontrado',
          });
        }

        console.log('✅ Usuário encontrado:', user.email);

        // Montar resposta estruturada
        const response = {
          id: user.id,
          email: user.email,
          nome: user.nome,
          roles: [user.role], // Compatibilidade: role único -> array
          permissions: user.getPermissions ? user.getPermissions() : [],
          sectorId: user.sectorId,
          // 🎯 CORREÇÃO: Remover sectorName que não existe na entidade
          ativo: user.ativo,
        };

        console.log('📦 Resposta final:', response);
        reply.send(response);
      } catch (error: any) {
        console.error('❌ Erro em /api/auth/me:', error);
        fastify.log.error('Erro ao obter dados do usuário:', error);
        reply.status(401).send({
          error: 'Erro ao verificar autenticação',
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
        const { email } = request.body as {
          email: string;
        };

        await authService.forgotPassword({ email });

        fastify.log.info(`Reset de senha solicitado para ${email}`);
        reply.send({
          success: true,
          message:
            'Se o email existir em nosso sistema, você receberá instruções para redefinir sua senha.',
        });
      } catch (error: any) {
        fastify.log.error('Erro no forgot password:', error);
        reply.status(400).send({
          error: error.message || 'Erro ao solicitar reset de senha',
          code: error.code || 'FORGOT_PASSWORD_ERROR',
        });
      }
    }
  );

  /**
   * POST /api/auth/reset-password - Resetar senha com token
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

        fastify.log.info(`Senha resetada com sucesso para token ${token}`);
        reply.send({
          success: true,
          message: 'Senha alterada com sucesso. Faça login com sua nova senha.',
        });
      } catch (error: any) {
        fastify.log.error('Erro no reset password:', error);

        let statusCode = 400;
        if (error.code === 'TOKEN_EXPIRED') {
          statusCode = 400;
        } else if (error.code === 'TOKEN_INVALID') {
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
   * PUT /api/auth/change-password - Alterar senha do usuário logado
   */
  fastify.put(
    '/api/auth/change-password',
    {
      preHandler: [(fastify as any).authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 6 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user?.id;
        const { currentPassword, newPassword } = request.body as {
          currentPassword: string;
          newPassword: string;
        };

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

        let statusCode = 400;
        if (error.code === 'CURRENT_PASSWORD_INVALID') {
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
