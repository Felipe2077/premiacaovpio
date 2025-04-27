// apps/api/src/server.ts (ATUALIZADO COM NOVO SERVIÇO E ROTA)
import { AppDataSource } from '@/database/data-source';
import cors from '@fastify/cors';
import * as dotenv from 'dotenv';
import Fastify from 'fastify';
// Importa todos os serviços
import { CriterionEntity } from '@/entity/criterion.entity';
import { AuditLogService } from '@/modules/audit/audit.service';
import { ExpurgoService } from '@/modules/expurgos/expurgo.service';
import { ParameterService } from '@/modules/parameters/parameter.service';
import { RankingService } from '@/modules/ranking/ranking.service';

dotenv.config();

const fastify = Fastify({ logger: true });

// --- Instanciar TODOS os Serviços ---
const rankingService = new RankingService();
const parameterService = new ParameterService();
const auditLogService = new AuditLogService();
const expurgoService = new ExpurgoService(); // Instanciado

// Função start async
const start = async () => {
  try {
    // Registrar CORS
    await fastify.register(cors, {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        /http:\/\/192\.168\.\d+\.\d+:3000/,
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
      try {
        const data = await rankingService.getCurrentRanking();
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/ranking: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro.' });
      }
    });

    fastify.get('/api/results', async (request, reply) => {
      try {
        const data = await rankingService.getDetailedResults();
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/results: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro.' });
      }
    });

    // Handler agora usa o serviço atualizado (retorna dados com nomes)
    fastify.get('/api/parameters/current', async (request, reply) => {
      try {
        const data = await parameterService.getCurrentParameters();
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/parameters/current: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro.' });
      }
    });

    // Handler agora usa o serviço atualizado (retorna dados com user)
    fastify.get('/api/audit-logs', async (request, reply) => {
      try {
        const data = await auditLogService.getAuditLogs(50);
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/audit-logs: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro.' });
      }
    });

    // --- NOVA ROTA EXPURGOS ---
    fastify.get('/api/expurgos', async (request, reply) => {
      try {
        const data = await expurgoService.getExpurgos(50);
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/expurgos: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro.' });
      }
    });
    // --- NOVA ROTA PARA CRITÉRIOS ATIVOS ---
    fastify.get('/api/criteria/active', async (request, reply) => {
      fastify.log.info('Recebida requisição GET /api/criteria/active');
      try {
        // Pega o repositório DENTRO do handler
        const criterionRepo = AppDataSource.getRepository(CriterionEntity);

        const activeCriteria = await criterionRepo.find({
          where: { ativo: true },
          // Seleciona apenas os campos que o frontend precisa (otimização)
          select: ['id', 'nome', 'index'],
          order: { id: 'ASC' }, // Ordena para consistência
        });

        if (!activeCriteria || activeCriteria.length === 0) {
          fastify.log.warn('Nenhum critério ativo encontrado no banco.');
          return reply.send([]); // Retorna array vazio
        }

        fastify.log.info(
          `Retornando ${activeCriteria.length} critérios ativos.`
        );
        return reply.send(activeCriteria); // Envia a lista como JSON
      } catch (error: any) {
        fastify.log.error('Erro ao buscar critérios ativos:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Erro desconhecido no servidor';
        return reply
          .status(500)
          .send({
            message: 'Erro interno ao buscar critérios ativos',
            error: errorMessage,
          });
      }
    });
    // --- Fim das Rotas ---

    // --- Listen ---
    const port = Number(process.env.API_PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port: port, host: host });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
