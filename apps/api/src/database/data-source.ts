// src/database/data-source.ts
import * as dotenv from 'dotenv';
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

// Inicializa a conexão ao carregar este arquivo (opcional, pode inicializar no server.ts)
// AppDataSource.initialize()
//     .then(() => {
//         console.log("Data Source do Postgres inicializado!");
//     })
//     .catch((err) => {
//         console.error("Erro durante inicialização do Data Source Postgres:", err);
//     });
