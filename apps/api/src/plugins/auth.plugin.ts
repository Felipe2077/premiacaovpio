// apps/api/src/plugins/auth.plugin.ts (VERSÃO FINAL COM TYPE CHECK)
import fastifyAuth from '@fastify/auth';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';

const authenticateUser = async (req: FastifyRequest, reply: FastifyReply) => {
  req.log.info(
    `[AUTH_CHECK] Verificando autenticação para a rota: ${req.raw.url}`
  );

  try {
    await req.jwtVerify();
  } catch (err) {
    // Verificamos se 'err' é uma instância de Error antes de acessar .message
    if (err instanceof Error) {
      req.log.warn(`Falha na verificação de JWT: ${err.message}`);
    } else {
      req.log.warn(`Falha na verificação de JWT: ${String(err)}`);
    }
    // O plugin @fastify/jwt já lida com o envio da resposta 401,
    // então não precisamos de um reply.send() aqui.
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
