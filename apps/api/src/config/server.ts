// apps/api/src/config/server.ts (CORRIGIDO - COM COOKIES)
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import Fastify, { FastifyInstance } from 'fastify';
import corsPlugin from './cors';
import { DatabaseConfig } from './database';

/**
 * Configuração principal do servidor Fastify
 */
export class ServerConfig {
  private fastify: FastifyInstance;

  constructor() {
    this.fastify = Fastify({
      logger: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'HH:MM:ss Z',
                  ignore: 'pid,hostname',
                },
              }
            : undefined,
      },
    });
  }

  /**
   * Configurar todos os plugins e middlewares
   */
  async configure(): Promise<FastifyInstance> {
    // 1. CORS
    await this.fastify.register(corsPlugin);

    // 2. Helmet (Segurança)
    await this.fastify.register(helmet, { global: true });

    // 🎯 3. COOKIES - ADICIONAR ESTE PLUGIN
    await this.fastify.register(cookie, {
      secret:
        process.env.COOKIE_SECRET ||
        process.env.JWT_SECRET ||
        'cookie-secret-change-in-production',
      parseOptions: {},
    });
    this.fastify.log.info('✅ Plugin Cookie registrado.');

    // 4. Multipart
    await this.registerMultipart();

    // 5. Rate Limiting
    await this.registerRateLimit();

    // 6. Database
    await DatabaseConfig.initialize(this.fastify);

    // 7. Error Handler Global
    this.registerErrorHandler();

    return this.fastify;
  }

  /**
   * Registrar plugin multipart para upload de arquivos
   */
  private async registerMultipart(): Promise<void> {
    await this.fastify.register(require('@fastify/multipart'), {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    });
    this.fastify.log.info('✅ Plugin Multipart registrado.');
  }

  /**
   * Registrar rate limiting
   */
  private async registerRateLimit(): Promise<void> {
    await this.fastify.register(require('@fastify/rate-limit'), {
      max: 100,
      timeWindow: '1 minute',
    });
    this.fastify.log.info('✅ Plugin Rate Limit registrado.');
  }

  /**
   * Registrar error handler global
   */
  private registerErrorHandler(): void {
    this.fastify.setErrorHandler(function (error, request, reply) {
      this.log.error(
        {
          error: error.message,
          stack: error.stack,
          url: request.url,
          method: request.method,
          user: (request as any).user?.email,
        },
        'Erro não tratado'
      );

      if (process.env.NODE_ENV === 'production') {
        reply.status(500).send({
          error: 'Erro interno do servidor',
          code: 'INTERNAL_ERROR',
        });
      } else {
        reply.status(500).send({
          error: error.message,
          stack: error.stack,
        });
      }
    });
    this.fastify.log.info('✅ Error Handler Global registrado.');
  }

  /**
   * Iniciar o servidor
   */
  async start(): Promise<void> {
    try {
      const port = parseInt(process.env.PORT || '3001', 10);
      const host = process.env.HOST || '0.0.0.0';

      await this.fastify.listen({ port, host });
      this.fastify.log.info(`🚀 Servidor rodando em http://${host}:${port}`);
    } catch (err) {
      this.fastify.log.error('❌ Erro ao iniciar servidor:', err);
      process.exit(1);
    }
  }

  /**
   * Parar o servidor graciosamente
   */
  async stop(): Promise<void> {
    try {
      await this.fastify.close();
      this.fastify.log.info('🛑 Servidor parado graciosamente.');
    } catch (err) {
      this.fastify.log.error('❌ Erro ao parar servidor:', err);
      process.exit(1);
    }
  }
}
