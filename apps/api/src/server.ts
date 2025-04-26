// apps/api/src/server.ts
import { AppDataSource } from '@/database/data-source';
import { AuditLogService } from '@/modules/audit/audit.service'; // Importado
import { ParameterService } from '@/modules/parameters/parameter.service'; // Importado
import { RankingService } from '@/modules/ranking/ranking.service';
import cors from '@fastify/cors';
import * as dotenv from 'dotenv';
import Fastify from 'fastify';

dotenv.config(); // Chamada simples agora funciona

const fastify = Fastify({ logger: true });

// --- Instanciar Serviços ---
const rankingService = new RankingService();
const parameterService = new ParameterService(); // Instanciado
const auditLogService = new AuditLogService(); // Instanciado

// Função async para registrar plugins e rotas e iniciar o servidor
const start = async () => {
  try {
    // Registrar CORS
    await fastify.register(cors, {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        /http:\/\/192\.168\.\d+\.\d+:3000/, // Permite IPs locais
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });
    fastify.log.info('Plugin CORS registrado.');

    // Inicializar DB
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      fastify.log.info('Data Source Postgres inicializado pelo servidor.');
    }

    // --- Registrar Rotas ---
    fastify.get('/api/ranking', async (request, reply) => {
      // Rota para ranking final
      try {
        // TODO: Pegar período do request.query?
        const data = await rankingService.getCurrentRanking();
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/ranking: ${error.message}`);
        reply
          .status(500)
          .send({
            error: error.message || 'Erro interno ao calcular ranking.',
          });
      }
    });

    fastify.get('/api/results', async (request, reply) => {
      // Rota para resultados detalhados
      try {
        // TODO: Pegar período do request.query?
        const data = await rankingService.getDetailedResults();
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/results: ${error.message}`);
        reply
          .status(500)
          .send({
            error:
              error.message || 'Erro interno ao buscar resultados detalhados.',
          });
      }
    });

    fastify.get('/api/parameters/current', async (request, reply) => {
      // Rota para parâmetros
      try {
        const data = await parameterService.getCurrentParameters();
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/parameters/current: ${error.message}`);
        reply
          .status(500)
          .send({
            error: error.message || 'Erro interno ao buscar parâmetros.',
          });
      }
    });

    fastify.get('/api/audit-logs', async (request, reply) => {
      // Rota para logs
      try {
        // TODO: Pegar limit do request.query?
        const data = await auditLogService.getAuditLogs(50); // Pega últimos 50
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/audit-logs: ${error.message}`);
        reply
          .status(500)
          .send({ error: error.message || 'Erro interno ao buscar logs.' });
      }
    });
    // --- Fim das Rotas ---

    // --- Listen ---
    const port = Number(process.env.API_PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port: port, host: host });
    // Fastify já loga que está escutando
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
