// src/server.ts
import { RankingService } from '@/modules/ranking/ranking.service';
import cors from '@fastify/cors';
import * as dotenv from 'dotenv';
import Fastify from 'fastify';
import { AppDataSource } from './database/data-source';

// --- Carregar .env do diretório atual (apps/api) ---
const configResult = dotenv.config(); // Sem argumentos, procura .env no cwd()
console.log(`Dotenv: Tentando carregar .env de ${process.cwd()}`);
if (configResult.error) {
  console.warn(
    `AVISO: dotenv não carregou .env. Usando vars do ambiente. Erro: ${configResult.error.message}`
  );
} else {
  console.log('.env carregado com sucesso.');
}
// Adicionar um check *depois* para ver se as vars estão lá
if (!process.env.POSTGRES_USER || !process.env.POSTGRES_PASSWORD) {
  console.error(
    'ERRO FATAL: Credenciais do Postgres não encontradas no ambiente ou .env!'
  );
  // process.exit(1); // Poderia até parar aqui se elas forem essenciais
}
// ---------------------------------------------------

const fastify = Fastify({
  logger: true,
});

// ... (Restante do seu código: instancia RankingService, define rota /api/poc-data) ...
const rankingService = new RankingService();

fastify.get('/api/poc-data', async (_request, reply) => {
  console.log('!!! ROTA /api/poc-data ACIONADA !!!'); // Log inicial do handler
  try {
    fastify.log.info(
      'Endpoint /api/poc-data chamado, buscando dados via RankingService...'
    );

    console.log('>>> PRESTES A CHAMAR rankingService.getCurrentRanking...'); // Log antes da chamada
    const data = await rankingService.getCurrentRanking(); // Chama o método do serviço
    console.log('<<< rankingService.getCurrentRanking RETORNOU:', data); // Log do retorno

    reply.send(data); // <-- ENVIA OS DADOS RECEBIDOS DO SERVIÇO!
  } catch (error) {
    console.error('!!! ERRO NO HANDLER da ROTA /api/poc-data:', error);
    fastify.log.error('Erro ao buscar dados via RankingService:', error); // Log do erro Fastify
    reply.status(500).send({ error: 'Erro interno ao buscar dados.' });
  }
});

// Função para iniciar o servidor (seu código aqui está ótimo!)
const start = async () => {
  try {
    // --- Registro CORS ---
    await fastify.register(cors, {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        // A linha abaixo funciona, mas a regex é mais flexível se seu IP mudar
        // /http:\/\/192\.168\.\d+\.\d+:3000/,
        'http://192.168.2.104:3000', // Adicionei a barra final removida só por padrão
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });
    fastify.log.info('Plugin CORS registrado.');
    // --------------------

    // --- Inicialização DataSource ---
    // Está no lugar certo!
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      fastify.log.info('Data Source Postgres inicializado pelo servidor.');
    }
    // -----------------------------

    // --- Listen ---
    const port = Number(process.env.API_PORT) || 3001; // <-- Agora vai ler do .env!
    const host = process.env.HOST || '0.0.0.0'; // <-- Agora vai ler do .env!

    await fastify.listen({ port: port, host: host });
    // O Fastify já loga as mensagens de listen, a linha abaixo pode ser removida ou corrigida
    // fastify.log.info( `API Server rodando em http://${host}:${port}` ); // Correção da interpolação
    // --------------------
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
