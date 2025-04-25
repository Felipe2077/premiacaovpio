// src/server.ts
import Fastify from 'fastify';
import { AppDataSource } from './database/data-source'; // Importa nossa config do Postgres

const fastify = Fastify({
  logger: true, // Habilita logs do Fastify
});

// Rota para buscar os dados da PoC do Postgres
fastify.get('/api/poc-data', async (request, reply) => {
  try {
    // Garante que a conexão está ativa (se não inicializou no data-source.ts)
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }

    // Executa a query bruta para buscar os dados JSON da tabela da PoC
    // ATENÇÃO: A tabela e coluna 'data' foram criadas no script poc.ts anterior!
    const query = 'SELECT data FROM poc_oracle_data';
    fastify.log.info(`Executando query no Postgres: ${query}`);
    const results = await AppDataSource.query(query);

    // Os resultados vêm como { data: { ... json ... } }[]
    // Vamos extrair apenas o conteúdo JSON
    const responseData = results.map((row: { data: any }) => row.data);

    reply.send(responseData);
  } catch (error) {
    fastify.log.error('Erro ao buscar dados da PoC no Postgres:', error);
    reply.status(500).send({ error: 'Erro interno ao buscar dados.' });
  }
  // Não destrua a conexão aqui se quiser reutilizá-la em outras requests
});

// Função para iniciar o servidor
const start = async () => {
  try {
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
