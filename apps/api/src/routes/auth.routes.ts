// apps/api/src/routes/auth.routes.ts - IMPLEMENTAÇÃO REAL
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { AuthService } from '../services/auth.service';

// DTOs para autenticação
interface LoginDto {
  email: string;
  password: string;
}

interface RegisterDto {
  name: string;
  email: string;
  password: string;
}

interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

/**
 * Registrar rotas de autenticação com implementação real
 */
export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();

  // === ROTA: LOGIN (COM PROTEÇÃO) ===
  fastify.post(
    '/api/auth/login',
    {
      schema: {
        description: 'Fazer login do usuário',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              maxLength: 255,
            },
            password: {
              type: 'string',
              minLength: 1,
              maxLength: 128,
            },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              token: { type: 'string' },
              user: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
                  email: { type: 'string' },
                  roles: { type: 'array', items: { type: 'string' } },
                },
              },
              expiresIn: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              code: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: LoginDto }>,
      reply: FastifyReply
    ) => {
      try {
        const { email, password } = request.body;

        // Log de tentativa de login (sem senha)
        fastify.log.info(`Tentativa de login: ${email} (IP: ${request.ip})`);

        // Validação básica
        if (!email || !password) {
          return reply.code(400).send({
            error: 'Email e senha são obrigatórios',
            code: 'MISSING_CREDENTIALS',
          });
        }

        // Tentar fazer login
        const result = await authService.login({ email, password });

        fastify.log.info(
          `Login bem-sucedido: ${email} (ID: ${result.user.id})`
        );

        return reply.send(result);
      } catch (error: any) {
        fastify.log.error(
          `Erro no login para ${request.body.email}:`,
          error.message
        );

        // Verificar tipo de erro
        if (error.message.includes('Email ou senha incorretos')) {
          return reply.code(401).send({
            error: 'Email ou senha incorretos',
            code: 'INVALID_CREDENTIALS',
          });
        }

        return reply.code(500).send({
          error: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // === ROTA: REGISTER ===
  fastify.post(
    '/api/auth/register',
    {
      schema: {
        description: 'Registrar novo usuário',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            name: {
              type: 'string',
              minLength: 2,
              maxLength: 100,
            },
            email: {
              type: 'string',
              format: 'email',
              maxLength: 255,
            },
            password: {
              type: 'string',
              minLength: 6,
              maxLength: 128,
            },
          },
          additionalProperties: false,
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: RegisterDto }>,
      reply: FastifyReply
    ) => {
      try {
        const { name, email, password } = request.body;

        fastify.log.info(`Tentativa de registro: ${email}`);

        // Tentar registrar usuário
        const result = await authService.register({ name, email, password });

        fastify.log.info(
          `Registro bem-sucedido: ${email} (ID: ${result.user.id})`
        );

        return reply.code(201).send(result);
      } catch (error: any) {
        fastify.log.error(
          `Erro no registro para ${request.body.email}:`,
          error.message
        );

        // Verificar tipo de erro
        if (error.message.includes('Email já está em uso')) {
          return reply.code(409).send({
            error: 'Email já está em uso',
            code: 'EMAIL_ALREADY_EXISTS',
          });
        }

        if (error.message.includes('Senha deve ter pelo menos')) {
          return reply.code(400).send({
            error: error.message,
            code: 'WEAK_PASSWORD',
          });
        }

        return reply.code(500).send({
          error: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // === ROTA: DADOS DO USUÁRIO ATUAL ===
  fastify.get(
    '/api/auth/me',
    {
      schema: {
        description: 'Obter dados do usuário autenticado',
        tags: ['auth'],
      },
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({
            error: 'Usuário não autenticado',
            code: 'NOT_AUTHENTICATED',
          });
        }

        // Buscar dados atualizados do usuário
        const user = await authService.getCurrentUser(request.user.id);

        return reply.send(user);
      } catch (error: any) {
        fastify.log.error('Erro ao buscar dados do usuário:', error);

        if (error.message.includes('Usuário não encontrado')) {
          return reply.code(404).send({
            error: 'Usuário não encontrado',
            code: 'USER_NOT_FOUND',
          });
        }

        return reply.code(500).send({
          error: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // === ROTA: ALTERAR SENHA ===
  fastify.put(
    '/api/auth/change-password',
    {
      schema: {
        description: 'Alterar senha do usuário autenticado',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              minLength: 1,
              maxLength: 128,
            },
            newPassword: {
              type: 'string',
              minLength: 6,
              maxLength: 128,
            },
          },
          additionalProperties: false,
        },
      },
      preHandler: [fastify.authenticate],
    },
    async (
      request: FastifyRequest<{ Body: ChangePasswordDto }>,
      reply: FastifyReply
    ) => {
      try {
        if (!request.user) {
          return reply.code(401).send({
            error: 'Usuário não autenticado',
            code: 'NOT_AUTHENTICATED',
          });
        }

        const { currentPassword, newPassword } = request.body;

        fastify.log.info(
          `Alteração de senha solicitada: usuário ${request.user.email}`
        );

        // Alterar senha
        await authService.changePassword(
          request.user.id,
          currentPassword,
          newPassword
        );

        fastify.log.info(
          `Senha alterada com sucesso: usuário ${request.user.email}`
        );

        return reply.send({
          success: true,
          message: 'Senha alterada com sucesso',
        });
      } catch (error: any) {
        fastify.log.error(
          `Erro ao alterar senha (usuário ${request.user?.email}):`,
          error.message
        );

        // Verificar tipo de erro
        if (error.message.includes('Senha atual incorreta')) {
          return reply.code(401).send({
            error: 'Senha atual incorreta',
            code: 'INVALID_CURRENT_PASSWORD',
          });
        }

        if (error.message.includes('Nova senha deve ter pelo menos')) {
          return reply.code(400).send({
            error: error.message,
            code: 'WEAK_PASSWORD',
          });
        }

        return reply.code(500).send({
          error: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR',
        });
      }
    }
  );

  // === ROTA: LOGOUT ===
  fastify.post(
    '/api/auth/logout',
    {
      schema: {
        description: 'Fazer logout do usuário',
        tags: ['auth'],
      },
      preHandler: [fastify.authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          return reply.code(401).send({
            error: 'Usuário não autenticado',
            code: 'NOT_AUTHENTICATED',
          });
        }

        // Extrair token do header para invalidação futura
        const authHeader = request.headers.authorization;
        const token = authHeader?.replace('Bearer ', '') || '';

        fastify.log.info(`Logout realizado: usuário ${request.user.email}`);

        // Fazer logout (invalidar token/sessão)
        await authService.logout(token);

        return reply.send({
          success: true,
          message: 'Logout realizado com sucesso',
        });
      } catch (error: any) {
        fastify.log.error(
          `Erro no logout (usuário ${request.user?.email}):`,
          error
        );

        // Mesmo com erro, considerar logout bem-sucedido do lado cliente
        return reply.send({
          success: true,
          message: 'Logout realizado com sucesso',
        });
      }
    }
  );

  // === ROTA: REFRESH TOKEN ===
  fastify.post(
    '/api/auth/refresh',
    {
      schema: {
        description: 'Renovar token JWT',
        tags: ['auth'],
        body: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: { token: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { token } = request.body;

        const result = await authService.refreshToken(token);

        return reply.send(result);
      } catch (error: any) {
        fastify.log.error('Erro ao renovar token:', error);

        return reply.code(401).send({
          error: 'Token inválido ou expirado',
          code: 'INVALID_REFRESH_TOKEN',
        });
      }
    }
  );

  // === ROTA DE TESTE (DESENVOLVIMENTO) ===
  if (process.env.NODE_ENV === 'development') {
    fastify.get(
      '/api/auth/test',
      {
        schema: {
          description: 'Testar autenticação (desenvolvimento)',
          tags: ['auth', 'development'],
        },
        preHandler: [fastify.authenticate],
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        return reply.send({
          authenticated: true,
          user: request.user,
          timestamp: new Date().toISOString(),
          environment: 'development',
        });
      }
    );
  }

  fastify.log.info('🔐 Rotas de autenticação REAIS registradas com sucesso');
}
