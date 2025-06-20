// apps/api/src/server.ts (VERSÃO COM AUTOMAÇÃO INTEGRADA)
import * as dotenv from 'dotenv';
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
  } catch (err) {
    console.error('❌ Erro fatal ao iniciar servidor:', err);
    process.exit(1);
  }
};

start();
