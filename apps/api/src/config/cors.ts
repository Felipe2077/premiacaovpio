// apps/api/src/config/cors.ts (SOLUÇÃO DEFINITIVA)
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';

const corsPlugin = async (fastify: FastifyInstance) => {
  await fastify.register(cors, {
    // 🎯 CONFIGURAÇÃO CRUCIAL PARA RESOLVER O ERRO
    origin: (origin, callback) => {
      // Lista de origens permitidas
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001', // Para testes diretos no browser
        'http://127.0.0.1:3001',
      ];

      // Em produção, adicione seu domínio
      if (process.env.NODE_ENV === 'production') {
        allowedOrigins.push(
          process.env.FRONTEND_URL || 'https://seu-dominio.com'
        );
      }

      // Permitir requisições sem origin (ex: Postman, curl)
      if (!origin) return callback(null, true);

      // Verificar se a origin está na lista permitida
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Rejeitar origin não permitida
      return callback(new Error('Não permitido pelo CORS'), false);
    },

    // 🚨 ESTA É A CONFIGURAÇÃO QUE ESTAVA FALTANDO:
    credentials: true, // Permite cookies e headers de autenticação

    // Métodos HTTP permitidos
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],

    // Headers permitidos
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'X-CSRF-Token',
    ],

    // Headers expostos para o frontend
    exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'Set-Cookie'],

    // Preflight cache (em segundos)
    maxAge: 86400, // 24 horas
  });

  fastify.log.info('✅ CORS Plugin registrado com configuração completa');
};

export default fp(corsPlugin, {
  name: 'cors-plugin',
});
