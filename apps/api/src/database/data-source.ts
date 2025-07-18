// apps/api/src/database/data-source.ts
import { RawMySqlOcorrenciaHorariaEntity } from '@/entity/raw-data/raw-mysql-ocorrencia-horaria.entity';
import { RawOracleIpkCalculadoEntity } from '@/entity/raw-data/raw-oracle-ipk-calculado.entity';
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

// === ENTIDADES EXISTENTES ===
import { AuditLogEntity } from '../entity/audit-log.entity';
import { CriterionScoreEntity } from '../entity/calculation/criterion-score.entity';
import { FinalRankingEntity } from '../entity/calculation/final-ranking.entity';
import { CompetitionPeriodEntity } from '../entity/competition-period.entity';
import { CriterionCalculationSettingsEntity } from '../entity/criterion-calculation-settings.entity';
import { CriterionEntity } from '../entity/criterion.entity';
import { ExpurgoAttachmentEntity } from '../entity/expurgo-attachment.entity';
import { ExpurgoEventEntity } from '../entity/expurgo-event.entity';
import { NotificationEntity } from '../entity/notification.entity';
import { ParameterValueEntity } from '../entity/parameter-value.entity';
import { PerformanceDataEntity } from '../entity/performance-data.entity';
import { RawMySqlQuebraDefeitoEntity } from '../entity/raw-data/raw-mysql-quebra-defeito.entity';
import { RawOracleAusenciaEntity } from '../entity/raw-data/raw-oracle-ausencia.entity';
import { RawOracleColisaoEntity } from '../entity/raw-data/raw-oracle-colisao.entity';
import { RawOracleEstoqueCustoEntity } from '../entity/raw-data/raw-oracle-estoque-custo.entity';
import { RawOracleFleetPerformanceEntity } from '../entity/raw-data/raw-oracle-fleet-performance.entity';
import { RawOracleKmOciosaComponentsEntity } from '../entity/raw-data/raw-oracle-km-ociosa.entity';
import { ScheduleConfigEntity } from '../entity/schedule-config.entity';
import { SectorEntity } from '../entity/sector.entity';

// === NOVAS ENTIDADES DE AUTENTICAÇÃO ===
import { RoleEntity } from '../entity/role.entity';
import { SessionEntity } from '../entity/session.entity';
import { UserEntity } from '../entity/user.entity';
// === ENTIDADES DE METAS OPERACIONAIS ===
import { HolidayClassificationEntity } from '../entity/holiday-classification.entity';
import { OperationalGoalsCalculationEntity } from '../entity/operational-goals-calculation.entity';
import { OperationalGoalsParametersEntity } from '../entity/operational-goals-parameters.entity';

dotenv.config();

// === DEBUG dotenv ===
console.log('[data-source.ts] Script iniciado.');
console.log('[data-source.ts] Diretório atual (cwd):', process.cwd());
console.log('[data-source.ts] Diretório do arquivo (__dirname):', __dirname);

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
  console.log('[data-source.ts] .env carregado (ou não deu erro).');
}

// === CONFIGURAÇÃO POSTGRESQL ===
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'poc_db',
};

console.log('[data-source.ts] Configuração do PostgreSQL:', {
  ...dbConfig,
  password: '***', // Não mostrar senha nos logs
});

// === CONFIGURAÇÃO ORACLE ===
const oracleConfig = {
  host: process.env.ORACLE_HOST || 'localhost',
  port: parseInt(process.env.ORACLE_PORT || '1521', 10),
  username: process.env.ORACLE_USER || 'system',
  password: process.env.ORACLE_PASSWORD || 'oracle',
  serviceName: process.env.ORACLE_SERVICE_NAME,
};

console.log('[data-source.ts] Configuração do Oracle:', {
  ...oracleConfig,
  password: '***',
});

// === CONFIGURAÇÃO MYSQL ===
const mysqlConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306', 10),
  username: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || 'mysql',
  database: process.env.MYSQL_DB || 'negocioperfeito',
};

console.log('[data-source.ts] Configuração do MySQL:', {
  ...mysqlConfig,
  password: '***',
});

// === TODAS AS ENTIDADES ===
const entities = [
  // === CORE ENTITIES ===
  UserEntity,
  ScheduleConfigEntity,
  RoleEntity,
  SessionEntity, // NOVA
  SectorEntity,
  CriterionEntity,
  CompetitionPeriodEntity,

  // === BUSINESS LOGIC ===
  ParameterValueEntity,
  ExpurgoEventEntity,
  ExpurgoAttachmentEntity,
  PerformanceDataEntity,
  CriterionCalculationSettingsEntity,

  // === CALCULATION RESULTS ===
  CriterionScoreEntity,
  FinalRankingEntity,

  // === AUDIT & LOGS ===
  AuditLogEntity,
  NotificationEntity,

  // === RAW DATA (ETL) ===
  RawOracleAusenciaEntity,
  RawOracleColisaoEntity,
  RawOracleEstoqueCustoEntity,
  RawOracleFleetPerformanceEntity,
  RawOracleKmOciosaComponentsEntity,
  RawOracleIpkCalculadoEntity,
  RawMySqlQuebraDefeitoEntity,
  RawMySqlOcorrenciaHorariaEntity,

  // === OPERATIONAL GOALS ENTITIES ===
  HolidayClassificationEntity,
  OperationalGoalsParametersEntity,
  OperationalGoalsCalculationEntity,

  // === ScheduleConfigEntity ===
  ScheduleConfigEntity,
];

console.log(
  `[data-source.ts] Total de entidades registradas: ${entities.length}`
);

// === DATA SOURCES ===

// PostgreSQL (Principal)
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  synchronize: process.env.NODE_ENV === 'development', // APENAS EM DEV!
  logging: true,
  // logging:
  //   process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  entities,
  migrations: ['src/database/migrations/*.ts'],
  subscribers: ['src/database/subscribers/*.ts'],
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

// Oracle (Legado)
export const OracleDataSource = new DataSource({
  type: 'oracle',
  host: oracleConfig.host,
  port: oracleConfig.port,
  username: oracleConfig.username,
  password: oracleConfig.password,
  serviceName: oracleConfig.serviceName,
  synchronize: false, // NUNCA sincronizar bancos legados
  logging: process.env.NODE_ENV === 'development' ? ['error'] : false,
  entities: [], // Não usamos entidades para Oracle (apenas queries raw)
});

// MySQL (Legado)
export const MySqlDataSource = new DataSource({
  type: 'mysql',
  host: mysqlConfig.host,
  port: mysqlConfig.port,
  username: mysqlConfig.username,
  password: mysqlConfig.password,
  database: mysqlConfig.database,
  synchronize: false, // NUNCA sincronizar bancos legados
  logging: process.env.NODE_ENV === 'development' ? ['error'] : false,
  entities: [], // Não usamos entidades para MySQL (apenas queries raw)
});

// === INICIALIZAÇÃO HELPER ===
export async function initializeDataSources() {
  console.log('[data-source.ts] Inicializando conexões...');

  try {
    // PostgreSQL (obrigatório)
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ PostgreSQL conectado com sucesso');

      // Se estivermos em desenvolvimento, mostrar tabelas
      if (process.env.NODE_ENV === 'development') {
        const tables = await AppDataSource.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
          ORDER BY table_name
        `);
        console.log(
          '📋 Tabelas no banco:',
          tables.map((t: any) => t.table_name)
        );
      }
    }

    // Oracle (opcional)
    try {
      if (!OracleDataSource.isInitialized) {
        await OracleDataSource.initialize();
        console.log('✅ Oracle conectado com sucesso');
      }
    } catch (error: any) {
      console.warn(
        '⚠️ Oracle não conectado (continuando sem ETL Oracle):',
        error?.message || 'Erro desconhecido'
      );
    }

    // MySQL (opcional)
    try {
      if (!MySqlDataSource.isInitialized) {
        await MySqlDataSource.initialize();
        console.log('✅ MySQL conectado com sucesso');
      }
    } catch (error: any) {
      console.warn(
        '⚠️ MySQL não conectado (continuando sem ETL MySQL):',
        error?.message || 'Erro desconhecido'
      );
    }

    return true;
  } catch (error: any) {
    console.error('❌ Erro ao inicializar conexões:', error?.message || error);
    throw error;
  }
}

// === HEALTH CHECK ===
export async function checkDatabaseHealth() {
  const health = {
    postgres: false,
    oracle: false,
    mysql: false,
    timestamp: new Date(),
  };

  try {
    await AppDataSource.query('SELECT 1');
    health.postgres = true;
  } catch (error: any) {
    console.error(
      '❌ PostgreSQL health check failed:',
      error?.message || 'Erro desconhecido'
    );
  }

  try {
    await OracleDataSource.query('SELECT 1 FROM DUAL');
    health.oracle = true;
  } catch (error: any) {
    console.log('⚠️ Oracle health check failed (expected if not configured)');
  }

  try {
    await MySqlDataSource.query('SELECT 1');
    health.mysql = true;
  } catch (error: any) {
    console.log('⚠️ MySQL health check failed (expected if not configured)');
  }

  return health;
}
