// apps/api/src/plugins/auth.plugin.ts - SEM @fastify/jwt

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin de autenticação simples - SEM @fastify/jwt
 */
const authPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorate('authenticate', async function (request: any, reply: any) {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        error: 'Token obrigatório',
        code: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

      // Verificar expiração
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return reply.status(401).send({
          error: 'Token expirado',
          code: 'TOKEN_EXPIRED',
        });
      }

      // Definir usuário no request
      request.user = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.nome || decoded.name,
        nome: decoded.nome || decoded.name,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
        sectorId: decoded.sectorId,
        roleNames: decoded.roleNames || decoded.roles || [],
      };

      // Adicionar sessionId separadamente
      request.sessionId = decoded.sessionId;
    } catch (error) {
      return reply.status(401).send({
        error: 'Token inválido',
        code: 'INVALID_TOKEN',
      });
    }
  });

  fastify.decorate('generateToken', function (payload: any): string {
    const tokenPayload = {
      sub: payload.id || payload.sub,
      email: payload.email,
      nome: payload.nome || payload.name,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      sessionId: payload.sessionId,
      sectorId: payload.sectorId,
      roleNames: payload.roleNames || payload.roles || [],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 15 * 60, // 15 minutos
    };

    return Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
  });

  fastify.log.info('✅ Plugin de autenticação simples registrado');
};

export default fp(authPlugin, {
  name: 'auth-plugin',
});
