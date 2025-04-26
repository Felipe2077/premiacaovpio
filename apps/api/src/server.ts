// src/server.ts
import { RankingService } from '@/modules/ranking/ranking.service'; // Importa o serviço
import cors from '@fastify/cors';
import Fastify from 'fastify';
import { AppDataSource } from './database/data-source'; // Importa nossa config do Postgres

const fastify = Fastify({
  logger: true, // Habilita logs do Fastify
});

const rankingService = new RankingService();

// --- Rotas da API (DEPOIS do registro do CORS) ---
fastify.get('/api/poc-data', async (request, reply) => {
  try {
    fastify.log.info(
      'Endpoint /api/poc-data chamado, buscando dados via RankingService...'
    );
    const data = await rankingService.getCurrentRanking();
    reply.send(data);
  } catch (error) {
    fastify.log.error('Erro ao buscar dados via RankingService:', error);
    reply.status(500).send({ error: 'Erro interno ao buscar dados.' });
  }
});

// Função para iniciar o servidor
const start = async () => {
  try {
    // --- 2. Registrar e Configurar o Plugin CORS ---
    // Permite requisições do seu frontend Next.js em desenvolvimento
    // ATENÇÃO: Em produção, reavalie e seja mais restritivo nas origens!
    await fastify.register(cors, {
      origin: [
        'http://localhost:3000', // Acesso via localhost
        'http://127.0.0.1:3000', // Acesso via loopback IPV4
        'http://192.168.2.104:3000/',
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Métodos HTTP permitidos
      // allowedHeaders: ['Content-Type', 'Authorization'], // Headers permitidos (descomente se precisar)
      // credentials: true, // Se precisar enviar/receber cookies entre origens
    });
    // -------------------------------------------------
    // Tenta inicializar o DataSource do Postgres aqui se não fez antes
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      fastify.log.info('Data Source Postgres inicializado pelo servidor.');
    }

    const port = Number(process.env.API_PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port: port, host: host });
    fastify.log.info(
      `API Server rodando em http://<span class="math-inline">\{host\}\:</span>{port}`
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
