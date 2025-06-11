// apps/api/src/config/cors.ts (VERSÃO PLUGIN - NA ÍNTEGRA)
import cors from '@fastify/cors';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Função auxiliar para obter as opções de CORS, baseada na sua lógica original.
 */
const getCorsOptions = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    return {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        /http:\/\/192\.168\.\d+\.\d+:3000/,
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      credentials: true,
    };
  }

  // Lógica de produção (a sua original)
  return {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    credentials: true,
  };
};

/**
 * Plugin que registra a configuração de CORS na aplicação Fastify.
 */
const corsPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const options = getCorsOptions();
  await fastify.register(cors, options);
  fastify.log.info('✅ Plugin CORS registrado com a sua configuração.');
};

// Usamos fp (fastify-plugin) para garantir que as configurações de CORS
// sejam aplicadas globalmente a todas as rotas, sem encapsulamento.
export default fp(corsPlugin, { name: 'cors-config' });
