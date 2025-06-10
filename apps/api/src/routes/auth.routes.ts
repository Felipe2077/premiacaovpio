// apps/api/src/routes/auth.routes.ts
import {
  AuthErrorCode,
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  ResetPasswordDto,
} from '@sistema-premiacao/shared-types';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from '../services/auth.service';

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();

  // === LOGIN ===
  fastify.post(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
            rememberMe: { type: 'boolean' },
          },
        },
      },
      preHandler: [
        // Rate limiting específico para login
        fastify.rateLimit({
          max: 5,
          timeWindow: '1 minute',
          keyGenerator: (request) =>
            `login_${request.ip}_${(request.body as any)?.email}`,
          errorResponseBuilder: (request, context) => ({
            error: 'Muitas tentativas de login',
            code: 'RATE_LIMITED',
            retryAfter: Math.round(context.ttl / 1000),
          }),
        }),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const loginData = request.body as LoginDto;
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'] || 'unknown';

      try {
        fastify.log.info(
          `Tentativa de login: ${loginData.email} de ${ipAddress}`
        );

        const result = await authService.login(loginData, ipAddress, userAgent);

        // Gerar JWT real
        const accessToken = fastify.generateToken({
          sub: result.user.id,
          email: result.user.email,
          nome: result.user.nome,
          roles: result.user.roles,
          permissions: result.user.permissions,
          sectorId: result.user.sectorId,
          sessionId: result.sessionId,
          iat: Math.floor(Date.now() / 1000),
        });

        fastify.log.info(`Login bem-sucedido: ${loginData.email}`);

        return reply.send({
          user: result.user,
          accessToken,
          refreshToken: result.refreshToken,
          expiresIn: 15 * 60, // 15 minutos
          sessionId: result.sessionId,
        });
      } catch (error: any) {
        fastify.log.error(`Erro no login para ${loginData.email}:`, error);

        // Mapear erros do AuthService para códigos HTTP
        if (error.code) {
          switch (error.code) {
            case AuthErrorCode.INVALID_CREDENTIALS:
              return reply.status(401).send({
                error: 'Email ou senha incorretos',
                code: error.code,
              });

            case AuthErrorCode.ACCOUNT_LOCKED:
              return reply.status(423).send({
                error: 'Conta temporariamente bloqueada',
                code: error.code,
                retryAfter: error.details?.retryAfter,
              });

            case AuthErrorCode.ACCOUNT_INACTIVE:
              return reply.status(403).send({
                error: 'Conta inativa',
                code: error.code,
              });

            case AuthErrorCode.TOO_MANY_ATTEMPTS:
              return reply.status(429).send({
                error: 'Muitas tentativas de login',
                code: error.code,
              });
          }
        }

        return reply.status(500).send({
          error: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // === LOGOUT ===
  fastify.post(
    '/api/auth/logout',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (request.sessionId) {
          await authService.logout(request.sessionId, request.user?.id);
        }

        fastify.log.info(`Logout realizado: ${request.user?.email}`);

        return reply.send({
          message: 'Logout realizado com sucesso',
        });
      } catch (error: any) {
        fastify.log.error('Erro no logout:', error);
        // Não falhar o logout por erro - sempre retornar sucesso
        return reply.send({
          message: 'Logout realizado',
        });
      }
    }
  );

  // === REFRESH TOKEN ===
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
      const { refreshToken, sessionId } = request.body as {
        refreshToken: string;
        sessionId: string;
      };

      try {
        const result = await authService.refreshAccessToken(
          refreshToken,
          sessionId
        );

        // Gerar novo JWT
        const accessToken = fastify.generateToken({
          sub: result.user.id,
          email: result.user.email,
          nome: result.user.nome,
          roles: result.user.roles,
          permissions: result.user.permissions,
          sectorId: result.user.sectorId,
          sessionId: result.sessionId,
          iat: Math.floor(Date.now() / 1000),
        });

        return reply.send({
          user: result.user,
          accessToken,
          refreshToken: result.refreshToken,
          expiresIn: 15 * 60,
          sessionId: result.sessionId,
        });
      } catch (error: any) {
        fastify.log.error('Erro no refresh token:', error);

        if (
          error.code === AuthErrorCode.SESSION_EXPIRED ||
          error.code === AuthErrorCode.TOKEN_INVALID
        ) {
          return reply.status(401).send({
            error: 'Sessão expirada - faça login novamente',
            code: error.code,
          });
        }

        return reply.status(500).send({
          error: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // === PERFIL DO USUÁRIO ===
  fastify.get(
    '/api/auth/me',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Buscar dados atualizados do usuário
        const user = await authService.getUserById(request.user!.id);

        if (!user) {
          return reply.status(404).send({
            error: 'Usuário não encontrado',
            code: 'USER_NOT_FOUND',
          });
        }

        return reply.send(user);
      } catch (error: any) {
        fastify.log.error('Erro ao buscar perfil:', error);
        return reply.status(500).send({
          error: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // === ALTERAR SENHA ===
  fastify.put(
    '/api/auth/change-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: { type: 'string', minLength: 1 },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
      },
      preHandler: [
        fastify.authenticate,
        // Rate limiting para alteração de senha
        fastify.rateLimit({
          max: 3,
          timeWindow: '5 minutes',
          keyGenerator: (request) => `change_password_${request.user?.id}`,
        }),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const changePasswordData = request.body as ChangePasswordDto;

      try {
        await authService.changePassword(request.user!.id, changePasswordData);

        fastify.log.info(`Senha alterada com sucesso: ${request.user?.email}`);

        return reply.send({
          message: 'Senha alterada com sucesso',
        });
      } catch (error: any) {
        fastify.log.error('Erro ao alterar senha:', error);

        if (error.code === AuthErrorCode.INVALID_CREDENTIALS) {
          return reply.status(400).send({
            error: 'Senha atual incorreta',
            code: error.code,
          });
        }

        return reply.status(500).send({
          error: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // === ESQUECI MINHA SENHA ===
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
      preHandler: [
        // Rate limiting para forgot password
        fastify.rateLimit({
          max: 3,
          timeWindow: '5 minutes',
          keyGenerator: (request) =>
            `forgot_password_${request.ip}_${(request.body as any)?.email}`,
        }),
      ],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const forgotPasswordData = request.body as ForgotPasswordDto;

      try {
        await authService.forgotPassword(forgotPasswordData);

        // Sempre retornar sucesso para não revelar se o email existe
        return reply.send({
          message:
            'Se o email existir, você receberá instruções para redefinir sua senha',
        });
      } catch (error: any) {
        fastify.log.error('Erro no forgot password:', error);

        // Sempre retornar sucesso para não revelar informações
        return reply.send({
          message:
            'Se o email existir, você receberá instruções para redefinir sua senha',
        });
      }
    }
  );

  // === REDEFINIR SENHA ===
  fastify.post(
    '/api/auth/reset-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: { type: 'string' },
            newPassword: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const resetPasswordData = request.body as ResetPasswordDto;

      try {
        await authService.resetPassword(resetPasswordData);

        fastify.log.info('Senha redefinida com sucesso via token');

        return reply.send({
          message: 'Senha redefinida com sucesso',
        });
      } catch (error: any) {
        fastify.log.error('Erro no reset password:', error);

        if (error.code === AuthErrorCode.RESET_TOKEN_INVALID) {
          return reply.status(400).send({
            error: 'Token inválido ou expirado',
            code: error.code,
          });
        }

        return reply.status(500).send({
          error: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // === SESSÕES ATIVAS ===
  fastify.get(
    '/api/auth/sessions',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const sessions = await authService.getUserSessions(request.user!.id);

        return reply.send({
          sessions: sessions.map((session) => session.getPublicInfo()),
          total: sessions.length,
        });
      } catch (error: any) {
        fastify.log.error('Erro ao buscar sessões:', error);
        return reply.status(500).send({
          error: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // === INVALIDAR SESSÃO ===
  fastify.delete(
    '/api/auth/sessions/:sessionId',
    {
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { sessionId } = request.params as { sessionId: string };

      try {
        await authService.invalidateSession(sessionId);

        return reply.send({
          message: 'Sessão invalidada com sucesso',
        });
      } catch (error: any) {
        fastify.log.error('Erro ao invalidar sessão:', error);
        return reply.status(500).send({
          error: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  fastify.log.info('✅ Rotas de autenticação registradas');
}
