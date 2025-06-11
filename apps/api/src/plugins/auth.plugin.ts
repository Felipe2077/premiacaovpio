// apps/api/src/plugins/auth.plugin.ts (CORREÇÃO FINAL)
import fastifyAuth from '@fastify/auth';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

const authenticateUser = async (req: FastifyRequest, reply: FastifyReply) => {
  req.log.info(
    `[AUTH_CHECK] Verificando autenticação para a rota: ${req.raw.url}`
  );

  try {
    // Verificar e decodificar o JWT
    await req.jwtVerify();

    // CORREÇÃO: Fazer cast correto do payload JWT
    const payload = req.user as any;

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

    req.log.info(
      `[AUTH_SUCCESS] Token válido para usuário: ${payload.email} (ID: ${payload.sub})`
    );
  } catch (err) {
    if (err instanceof Error) {
      req.log.warn(`[AUTH_FAILED] Falha na verificação de JWT: ${err.message}`);
    } else {
      req.log.warn(`[AUTH_FAILED] Falha na verificação de JWT: ${String(err)}`);
    }
    // O plugin @fastify/jwt já lida com o envio da resposta 401
    throw err;
  }
};

async function authPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyJwt, {
    secret: process.env.JWT_SECRET || 'uma-chave-super-secreta-para-dev',
  });

  await fastify.register(fastifyAuth);

  fastify.decorate('authenticate', authenticateUser);

  fastify.log.info(
    '✅ Plugins @fastify/jwt e @fastify/auth registrados com sucesso.'
  );
}

export default fp(authPlugin);
