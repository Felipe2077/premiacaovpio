// src/database/data-source.ts
import * as dotenv from 'dotenv';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

dotenv.config();

// --- DEBUG POSTGRES CREDS ---
console.log('--- DEBUG POSTGRES CREDS ---');
console.log('POSTGRES_HOST:', process.env.POSTGRES_HOST);
console.log('POSTGRES_PORT:', process.env.POSTGRES_PORT);
console.log('POSTGRES_USER:', process.env.POSTGRES_USER);
// Verifica especificamente se a senha está definida
console.log(
  'POSTGRES_PASSWORD:',
  process.env.POSTGRES_PASSWORD ? '****** (definida)' : '!!! NÃO DEFINIDA !!!'
);
console.log('POSTGRES_DB:', process.env.POSTGRES_DB);
console.log('--- FIM DEBUG ---');
// -----------------------------
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5433,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: true, // !! APENAS PARA DEV/POC !! Cria/altera tabelas automaticamente. DESABILITAR em produção!
  logging: false, // Mude para true para ver os SQLs gerados
  entities: [
    // __dirname + '/../entity/*.entity.{js,ts}' // Exemplo se tivéssemos entidades
    // Por enquanto vamos usar query bruta, não precisa de entidade aqui
  ],
  migrations: [],
  subscribers: [],
});

// Inicializa a conexão ao carregar este arquivo (opcional, pode inicializar no server.ts)
// AppDataSource.initialize()
//     .then(() => {
//         console.log("Data Source do Postgres inicializado!");
//     })
//     .catch((err) => {
//         console.error("Erro durante inicialização do Data Source Postgres:", err);
//     });
