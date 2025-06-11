// apps/api/src/plugins/auth.plugin.ts (CORRIGIDO - SEM AUTH GLOBAL)
import fastifyAuth from '@fastify/auth';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AuthService } from '../services/auth.service';

const authenticateUser = async (req: FastifyRequest, reply: FastifyReply) => {
  req.log.info(
    `[AUTH_CHECK] Verificando autenticação para a rota: ${req.raw.url}`
  );

  try {
    await req.jwtVerify();
    req.log.info(
      `[AUTH_SUCCESS] Token válido para usuário: ${(req as any).user?.email || 'unknown'}`
    );
  } catch (err) {
    if (err instanceof Error) {
      req.log.warn(`Falha na verificação de JWT: ${err.message}`);
    } else {
      req.log.warn(`Falha na verificação de JWT: ${String(err)}`);
    }
    throw err;
  }
};

async function authPlugin(fastify: FastifyInstance) {
  // 1. Registrar JWT
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'uma-chave-super-secreta-para-dev',
  });

  // 2. Registrar Auth
  await fastify.register(fastifyAuth);

  // 3. ✅ APENAS DECORAR - NÃO APLICAR GLOBALMENTE
  fastify.decorate('authenticate', authenticateUser);

  // 4. AuthService
  const authService = new AuthService();
  fastify.decorate('authService', authService);

  // 5. ⚠️ REMOVER QUALQUER HOOK GLOBAL QUE POSSA EXISTIR
  // NÃO fazer: fastify.addHook('preHandler', authenticateUser)
  // NÃO fazer: fastify.register(fastifyAuth, { authenticate: true })

  fastify.log.info('✅ Auth plugin registrado SEM autenticação global');
}

export default fp(authPlugin);

// Tipos
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    authService: AuthService;
  }
}
