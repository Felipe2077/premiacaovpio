// apps/api/src/plugins/auth.plugin.ts
import { AuthUser } from '@sistema-premiacao/shared-types';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

// Declare tipos para o Fastify
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    generateToken: (payload: any) => string;
    verifyToken: (token: string) => any;
  }

  interface FastifyRequest {
    user?: AuthUser;
    sessionId?: string;
  }
}

async function authPlugin(fastify: FastifyInstance) {
  console.log('🔐 Registrando plugin de autenticação...');

  // 1. Registrar JWT
  await fastify.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    },
    verify: {
      maxAge: process.env.JWT_EXPIRES_IN || '15m',
    },
  });

  // 2. Registrar Rate Limiting
  await fastify.register(require('@fastify/rate-limit'), {
    global: false, // Aplicaremos manualmente onde necessário
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: function (request, context) {
      return {
        code: 429,
        error: 'Rate Limit Exceeded',
        message: `Muitas requisições. Tente novamente em ${Math.round(context.ttl / 1000)} segundos.`,
        expiresIn: Math.round(context.ttl / 1000),
      };
    },
  });

  // 3. Registrar Helmet para headers de segurança
  await fastify.register(require('@fastify/helmet'), {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  });

  // 4. Utilitários JWT
  fastify.decorate('generateToken', function (payload: any): string {
    return fastify.jwt.sign(payload);
  });

  fastify.decorate('verifyToken', function (token: string): any {
    return fastify.jwt.verify(token);
  });

  // 5. Middleware de autenticação
  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply: FastifyReply) {
      try {
        // 1. Extrair token do header
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return reply.status(401).send({
            error: 'Token de acesso requerido',
            code: 'NO_TOKEN',
          });
        }

        const token = authHeader.substring(7); // Remove "Bearer "

        // 2. Verificar e decodificar token
        let decoded: any;
        try {
          decoded = fastify.jwt.verify(token);
        } catch (jwtError: any) {
          if (jwtError.code === 'FAST_JWT_EXPIRED') {
            return reply.status(401).send({
              error: 'Token expirado',
              code: 'TOKEN_EXPIRED',
            });
          }

          return reply.status(401).send({
            error: 'Token inválido',
            code: 'INVALID_TOKEN',
          });
        }

        // 3. TODO: Validar sessão no banco (implementar depois)
        // Por enquanto, vamos confiar no token JWT

        // 4. Montar objeto user simplificado
        request.user = {
          id: decoded.sub,
          email: decoded.email,
          nome: decoded.nome || 'Usuário',
          roles: decoded.roles || [],
          permissions: decoded.permissions || [],
          sectorId: decoded.sectorId,
        };

        request.sessionId = decoded.sessionId;

        fastify.log.info(
          `Usuário autenticado: ${request.user.email} (ID: ${request.user.id})`
        );
      } catch (error: any) {
        fastify.log.error('Erro na autenticação:', error);
        return reply.status(500).send({
          error: 'Erro interno de autenticação',
          code: 'AUTH_ERROR',
        });
      }
    }
  );

  console.log('✅ Plugin de autenticação registrado');
}

// Exportar como plugin do Fastify
export default fp(authPlugin, {
  name: 'auth-plugin',
  dependencies: [],
});
