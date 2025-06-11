// apps/api/src/config/server.ts
import Fastify, { FastifyInstance } from 'fastify';
import { CorsConfig } from './cors';
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
    await CorsConfig.register(this.fastify);

    // 2. Multipart
    await this.registerMultipart();

    // 3. Rate Limiting
    await this.registerRateLimit();

    // 4. Database
    await DatabaseConfig.initialize(this.fastify);

    // 5. Error Handler Global
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
          user: (request as any).user?.email, // ✅ Corrigido com type assertion
        },
        'Erro não tratado'
      );

      // Não vazar informações em produção
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
    console.log('✅ Servidor iniciado com sucesso!');
    console.log(`🌐 API: http://${host}:${port}`);
    console.log(`🔐 Health: http://${host}:${port}/health`);
    console.log(`📋 Auth Health: http://${host}:${port}/api/health`);
    console.log('');
    console.log('🎯 ENDPOINTS DE AUTENTICAÇÃO:');
    console.log('  POST /api/auth/login - Login');
    console.log('  POST /api/auth/logout - Logout');
    console.log('  GET  /api/auth/me - Perfil');
    console.log('  POST /api/auth/refresh - Refresh token');
    console.log('  PUT  /api/auth/change-password - Alterar senha');
    console.log('');
    console.log('🎯 ENDPOINTS DE TESTE:');
    console.log('  GET  /api/test/permissions - Teste auth');
    console.log('  GET  /api/test/admin-only - Teste admin');
    console.log('  GET  /api/test/manager-or-admin - Teste gerente/admin');
    console.log('');
    console.log('🎯 ENDPOINTS PROTEGIDOS:');
    console.log('  GET  /api/ranking - Rankings (auth)');
    console.log('  GET  /api/results - Resultados (auth)');
    console.log('  GET  /api/parameters - Parâmetros (view_parameters)');
    console.log('  POST /api/parameters - Criar parâmetro (manage_parameters)');
    console.log('  GET  /api/expurgos - Expurgos (view_reports)');
    console.log(
      '  POST /api/expurgos/request - Solicitar expurgo (request_expurgos)'
    );
    console.log(
      '  POST /api/expurgos/:id/approve - Aprovar expurgo (approve_expurgos)'
    );
    console.log(
      '  POST /api/periods/:id/close - Fechar período (close_periods)'
    );
  }

  /**
   * Getter para a instância do Fastify
   */
  getInstance(): FastifyInstance {
    return this.fastify;
  }
}
