// src/database/data-source.ts
import * as dotenv from 'dotenv';
import path from 'path'; // Importar path
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuditLogEntity } from '../entity/audit-log.entity'; // Criar este arquivo
import { CriterionEntity } from '../entity/criterion.entity';
import { ExpurgoEventEntity } from '../entity/expurgo-event.entity'; // <-- Importar nova entidade
import { ParameterValueEntity } from '../entity/parameter-value.entity'; // Criar este arquivo
import { PerformanceDataEntity } from '../entity/performance-data.entity'; // Criar este arquivo
import { RoleEntity } from '../entity/role.entity'; // Criar este arquivo
import { SectorEntity } from '../entity/sector.entity';
import { UserEntity } from '../entity/user.entity'; // Criar este arquivo

// --- DEBUG dotenv DENTRO DE data-source.ts ---
console.log('[data-source.ts] Script iniciado.');
console.log('[data-source.ts] Diretório atual (cwd):', process.cwd());
console.log('[data-source.ts] Diretório do arquivo (__dirname):', __dirname);

// Tenta carregar .env da pasta apps/api (um nível acima de src/database)

dotenv.config();
// --- DEBUG dotenv DENTRO DE data-source.ts ---
console.log('[data-source.ts] Script iniciado.');
console.log('[data-source.ts] Diretório atual (cwd):', process.cwd());
console.log('[data-source.ts] Diretório do arquivo (__dirname):', __dirname);

// Tenta carregar .env da pasta apps/api (um nível acima de src/database)
const envPath = path.resolve(__dirname, '../../.env');
console.log(
  `[data-source.ts] Tentando carregar .env explicitamente de: ${envPath}`
);
const configResult = dotenv.config({ path: envPath });

if (configResult.error) {
  console.error(
    `[data-source.ts] ERRO ao carregar ${envPath}:`,
    configResult.error
  );
} else {
  console.log(
    '[data-source.ts] .env carregado (ou não deu erro). Chaves:',
    Object.keys(configResult.parsed || {})
  );
}
// LOG CRÍTICO: Verifica o valor ANTES da definição do DataSource
console.log(
  `[data-source.ts] Valor de process.env.MYSQL_HOST ANTES de new DataSource: ${process.env.MYSQL_HOST}`
);
// ------------------------------------------

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5433,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: true, // !! APENAS PARA DEV/POC !! Cria/altera tabelas automaticamente. DESABILITAR em produção!
  logging: false,
  entities: [
    SectorEntity,
    CriterionEntity,
    ParameterValueEntity,
    PerformanceDataEntity,
    AuditLogEntity,
    UserEntity,
    RoleEntity,
    ExpurgoEventEntity,
  ],
  migrations: [],
  subscribers: [],
});

// --- Configuração MySQL ---
export const MySqlDataSource = new DataSource({
  name: 'mysql_legacy', // Nome diferente
  type: 'mysql',
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT) || 3306,
  username: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DB,
  synchronize: false, // NUNCA sincronizar schema legado!
  logging: ['query', 'error'],
  entities: [], // Sem entidades por enquanto
});
// --------------------------

// Inicializa a conexão ao carregar este arquivo (opcional, pode inicializar no server.ts)
// AppDataSource.initialize()
//     .then(() => {
//         console.log("Data Source do Postgres inicializado!");
//     })
//     .catch((err) => {
//         console.error("Erro durante inicialização do Data Source Postgres:", err);
//     });
