// src/database/data-source.ts
import { RawMySqlOcorrenciaHorariaEntity } from '@/entity/raw-data/raw-mysql-ocorrencia-horaria.entity';
import { RawOracleIpkCalculadoEntity } from '@/entity/raw-data/raw-oracle-ipk-calculado.entity';
import * as dotenv from 'dotenv';
import path from 'path'; // Importar path
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { AuditLogEntity } from '../entity/audit-log.entity';
import { CriterionScoreEntity } from '../entity/calculation/criterion-score.entity';
import { FinalRankingEntity } from '../entity/calculation/final-ranking.entity';
import { CompetitionPeriodEntity } from '../entity/competition-period.entity';
import { CriterionCalculationSettingsEntity } from '../entity/criterion-calculation-settings.entity';
import { CriterionEntity } from '../entity/criterion.entity';
import { ExpurgoAttachmentEntity } from '../entity/expurgo-attachment.entity';
import { ExpurgoEventEntity } from '../entity/expurgo-event.entity';
import { ParameterValueEntity } from '../entity/parameter-value.entity';
import { PerformanceDataEntity } from '../entity/performance-data.entity';
import { RawMySqlQuebraDefeitoEntity } from '../entity/raw-data/raw-mysql-quebra-defeito.entity';
import { RawOracleAusenciaEntity } from '../entity/raw-data/raw-oracle-ausencia.entity';
import { RawOracleColisaoEntity } from '../entity/raw-data/raw-oracle-colisao.entity';
import { RawOracleEstoqueCustoEntity } from '../entity/raw-data/raw-oracle-estoque-custo.entity';
import { RawOracleFleetPerformanceEntity } from '../entity/raw-data/raw-oracle-fleet-performance.entity';
import { RawOracleKmOciosaComponentsEntity } from '../entity/raw-data/raw-oracle-km-ociosa.entity';
import { RoleEntity } from '../entity/role.entity';
import { SectorEntity } from '../entity/sector.entity';
import { UserEntity } from '../entity/user.entity';

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
  synchronize: true, // !! APENAS PARA DEV !! Cria/altera tabelas automaticamente. DESABILITAR em produção!
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
    CompetitionPeriodEntity,
    RawMySqlQuebraDefeitoEntity,
    RawMySqlOcorrenciaHorariaEntity,
    RawOracleAusenciaEntity,
    RawOracleColisaoEntity,
    RawOracleEstoqueCustoEntity,
    RawOracleFleetPerformanceEntity,
    RawOracleKmOciosaComponentsEntity,
    RawOracleIpkCalculadoEntity,
    CriterionScoreEntity,
    FinalRankingEntity,
    CriterionCalculationSettingsEntity,
    ExpurgoAttachmentEntity,
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
  logging: ['query', 'schema', 'error'], // Ou apenas true para todos os logs
  entities: [], // Sem entidades por enquanto
});
export const OracleDataSource = new DataSource({
  name: 'oracle_erp', // Nome para esta conexão específica
  type: 'oracle',
  // Usa as novas variáveis do .env
  host: process.env.ORACLE_HOST,
  port: Number(process.env.ORACLE_PORT) || 1521,
  // Use serviceName OU sid, dependendo do que sua string de conexão usa
  serviceName: process.env.ORACLE_SERVICE_NAME,
  // sid: process.env.ORACLE_SID,
  username: process.env.ORACLE_USER, // Usuário glbconsult
  password: process.env.ORACLE_PASSWORD, // Senha do glbconsult
  synchronize: false, // NUNCA sincronizar schema Oracle
  logging: ['query', 'error'], // Logar queries e erros
  entities: [
    // Não precisamos de entidades aqui para query bruta
  ],
  // Pode precisar passar o libDir aqui se initOracleClient não funcionar globalmente
  // driverOptions: { libDir: process.env.ORACLE_HOME }
});
