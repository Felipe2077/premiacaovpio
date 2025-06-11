// apps/api/src/config/server.ts (VERSÃO FINAL E CORRIGIDA)
import helmet from '@fastify/helmet'; // Importando o helmet que faltava
import Fastify, { FastifyInstance } from 'fastify';
import corsPlugin from './cors'; // 👈 1. IMPORT CORRIGIDO
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
    await this.fastify.register(corsPlugin); // 👈 2. REGISTRO CORRIGIDO

    // 2. Helmet (Segurança)
    await this.fastify.register(helmet, { global: true });

    // 3. Multipart
    await this.registerMultipart();

    // 4. Rate Limiting
    await this.registerRateLimit();

    // 5. Database
    await DatabaseConfig.initialize(this.fastify);

    // 6. Error Handler Global
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
   * Iniciar servidor
   */
  async start(): Promise<void> {
    const port = Number(process.env.API_PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    await this.fastify.listen({ port, host });
    this.logServerInfo(host, port);
  }

  /**
   * Log das informações do servidor
   */
  private logServerInfo(host: string, port: number): void {
    // Seus logs de inicialização...
    console.log('✅ Servidor iniciado com sucesso!');
    console.log(`🌐 API: http://${host}:${port}`);
  }

  /**
   * Getter para a instância do Fastify
   */
  getInstance(): FastifyInstance {
    return this.fastify;
  }
}
