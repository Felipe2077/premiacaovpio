// apps/api/src/server.ts (VERSÃO COM AUTOMAÇÃO INTEGRADA + SWAGGER - TIPOS CORRIGIDOS)
import * as dotenv from 'dotenv';
import { FastifyReply, FastifyRequest } from 'fastify';
import { ServerConfig } from './config/server';
import authPlugin from './plugins/auth.plugin';
import multipartPlugin from './plugins/multipart.plugin';
import servicesPlugin from './plugins/services';

// Importe todos os seus plugins de rotas
import adminRoutes from './routes/admin.routes';
import auditRoutes from './routes/audit.routes';
import { authRoutes } from './routes/auth.routes';
// ===== ADICIONAR ESTA IMPORTAÇÃO =====
import automationRoutes from './routes/automation.routes';
import expurgosRoutes from './routes/expurgos.routes';
import healthRoutes from './routes/health.routes';
import historicalResultsRoutes from './routes/historical-results.routes'; // 👈 1. IMPORT CORRIGIDO
import metadataRoutes from './routes/metadata.routes';
import parametersRoutes from './routes/parameters.routes';
import periodsRoutes from './routes/periods.routes';
import resultsRoutes from './routes/results.routes';
import testRoutes from './routes/test.routes';

dotenv.config();

const start = async () => {
  try {
    console.log('🚀 Iniciando servidor...');
    const serverConfig = new ServerConfig();
    const fastify = await serverConfig.configure();

    // 📚 Configurar Swagger
    await fastify.register(require('@fastify/swagger'), {
      openapi: {
        openapi: '3.0.0',
        info: {
          title: 'Sistema Premiação API',
          description:
            'API do Sistema de Premiação com automação ETL integrada',
          version: '0.1.0',
          contact: {
            name: 'Lipe',
            email: 'contato@sistema-premiacao.com',
          },
        },
        servers: [
          {
            url: 'http://localhost:3001',
            description: 'Development server',
          },
        ],
        tags: [
          { name: 'auth', description: 'Autenticação e autorização' },
          { name: 'health', description: 'Status e saúde do sistema' },
          { name: 'results', description: 'Resultados e premiações' },
          { name: 'metadata', description: 'Metadados do sistema' },
          { name: 'parameters', description: 'Parâmetros de configuração' },
          { name: 'periods', description: 'Períodos e ciclos' },
          { name: 'expurgos', description: 'Limpeza e expurgo de dados' },
          { name: 'audit', description: 'Auditoria e logs' },
          { name: 'admin', description: 'Administração do sistema' },
          { name: 'automation', description: 'Automação ETL e processamento' },
          { name: 'historical', description: 'Dados históricos' },
          { name: 'test', description: 'Endpoints de teste' },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
      },
    });

    // 📖 Configurar Swagger UI
    await fastify.register(require('@fastify/swagger-ui'), {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: false,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
      },
      uiHooks: {
        onRequest: function (
          request: FastifyRequest,
          reply: FastifyReply,
          next: () => void
        ) {
          next();
        },
        preHandler: function (
          request: FastifyRequest,
          reply: FastifyReply,
          next: () => void
        ) {
          next();
        },
      },
      staticCSP: true,
      transformStaticCSP: (header: string) => header,
      transformSpecification: (
        swaggerObject: any,
        request: FastifyRequest,
        reply: FastifyReply
      ) => {
        return swaggerObject;
      },
      transformSpecificationClone: true,
    });

    console.log(
      '📚 Swagger configurado - disponível em http://localhost:3001/docs'
    );

    // 1. Registra plugins de utilidade
    await fastify.register(servicesPlugin);
    await fastify.register(authPlugin); // A ÚNICA fonte de autenticação
    await fastify.register(multipartPlugin);
    console.log('✅ Plugins de utilidade registrados.');

    // 2. Registra todas as rotas
    await fastify.register(authRoutes);
    await fastify.register(healthRoutes);
    await fastify.register(testRoutes);
    await fastify.register(resultsRoutes);
    await fastify.register(metadataRoutes);
    await fastify.register(parametersRoutes);
    await fastify.register(periodsRoutes);
    await fastify.register(expurgosRoutes);
    await fastify.register(auditRoutes);
    await fastify.register(adminRoutes);
    await fastify.register(historicalResultsRoutes);

    // ===== ADICIONAR ESTA LINHA =====
    await fastify.register(automationRoutes); // 🚀 ROTAS DE AUTOMAÇÃO

    console.log('✅ Todas as rotas foram registradas (incluindo automação).');

    // 3. Inicia o servidor
    await serverConfig.start();
    console.log('🎉 Servidor iniciado com sucesso!');
    console.log('🔧 Sistema de automação ETL disponível em /api/automation/*');
    console.log(
      '📚 Documentação Swagger disponível em http://localhost:3001/docs'
    );
    console.log(
      '📄 OpenAPI JSON disponível em http://localhost:3001/docs/json'
    );
  } catch (err) {
    console.error('❌ Erro fatal ao iniciar servidor:', err);
    process.exit(1);
  }
};

start();
