// apps/api/src/config/cors.ts
import cors from '@fastify/cors';
import { FastifyInstance } from 'fastify';

/**
 * Configuração de CORS para o servidor
 */
export class CorsConfig {
  /**
   * Registrar plugin CORS com configurações baseadas no ambiente
   */
  static async register(fastify: FastifyInstance): Promise<void> {
    const corsOptions = this.getCorsOptions();

    await fastify.register(cors, corsOptions);
    fastify.log.info('✅ Plugin CORS registrado.');
  }

  /**
   * Obter opções de CORS baseadas no ambiente
   */
  private static getCorsOptions() {
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      return {
        origin: [
          'http://localhost:3000',
          'http://127.0.0.1:3000',
          /http:\/\/192\.168\.\d+\.\d+:3000/,
        ],
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        credentials: true,
      };
    }

    // Produção
    return {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || false,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      credentials: true,
    };
  }
}
