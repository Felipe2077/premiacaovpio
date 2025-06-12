// apps/api/src/plugins/auth.plugin.ts (CORRIGIDO - LÊ COOKIES E HEADERS)
import fastifyAuth from '@fastify/auth';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

const authenticateUser = async (req: FastifyRequest, reply: FastifyReply) => {
  req.log.info(
    `[AUTH_CHECK] Verificando autenticação para a rota: ${req.raw.url}`
  );

  try {
    let token: string | undefined;

    // 🎯 CORREÇÃO: Verificar COOKIES primeiro, depois header Authorization

    // 1. Tentar ler do cookie (prioridade para middleware)
    if (req.cookies && req.cookies.session_token) {
      token = req.cookies.session_token;
      req.log.info('[AUTH_TOKEN] Token encontrado em cookies');
    }
    // 2. Fallback para header Authorization (compatibilidade)
    else if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/);
      if (tokenMatch) {
        token = tokenMatch[1];
        req.log.info('[AUTH_TOKEN] Token encontrado em Authorization header');
      }
    }

    if (!token) {
      req.log.warn(
        '[AUTH_FAILED] Nenhum token encontrado (cookies ou headers)'
      );
      return reply.code(401).send({
        error: 'Token de acesso necessário',
        code: 'MISSING_TOKEN',
      });
    }

    // 🎯 CORREÇÃO: Verificar token manualmente usando fastify.jwt.verify
    let payload: any;
    try {
      payload = req.server.jwt.verify(token);
      req.log.info(`[AUTH_JWT] Token JWT válido decodificado`);
    } catch (jwtError: any) {
      req.log.warn(`[AUTH_FAILED] Token JWT inválido: ${jwtError.message}`);
      return reply.code(401).send({
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN',
      });
    }

    // CORREÇÃO: Mapear corretamente o payload para request.user
    // O payload usa "sub" mas o código espera "id"
    (req as any).user = {
      id: payload.sub, // sub -> id
      email: payload.email,
      nome: payload.nome,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      sectorId: payload.sectorId || null,
      roleNames: payload.roleNames || payload.roles || [],
      sessionId: payload.sessionId,
    };

    // 🎯 CORREÇÃO: Adicionar sessionId para logout
    (req as any).sessionId = payload.sessionId;

    req.log.info(
      `[AUTH_SUCCESS] Token válido para usuário: ${payload.email} (ID: ${payload.sub})`
    );
  } catch (err) {
    if (err instanceof Error) {
      req.log.warn(`[AUTH_FAILED] Erro na autenticação: ${err.message}`);
    } else {
      req.log.warn(`[AUTH_FAILED] Erro na autenticação: ${String(err)}`);
    }

    // Retornar erro 401 padronizado
    return reply.code(401).send({
      error: 'Falha na autenticação',
      code: 'AUTH_FAILED',
    });
  }
};

async function authPlugin(fastify: FastifyInstance) {
  // Registrar plugin JWT
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'uma-chave-super-secreta-para-dev',
  });

  // Registrar plugin de auth
  await fastify.register(fastifyAuth);

  // 🎯 CORREÇÃO: Decorator customizado que lê cookies E headers
  fastify.decorate('authenticate', authenticateUser);

  fastify.log.info(
    '✅ Plugin de autenticação registrado (suporte a cookies + headers)'
  );
}

export default fp(authPlugin, {
  name: 'auth-plugin',
});
