// run-full-raw-etl-april-2025.ts (na raiz do projeto)
import * as dotenv from 'dotenv';
import oracledb from 'oracledb';
import path from 'path';
import 'reflect-metadata';
import {
  AppDataSource,
  MySqlDataSource,
  OracleDataSource,
} from './apps/api/src/database/data-source';
import { MySqlEtlService } from './apps/api/src/modules/etl/mysql-etl.service';
import { OracleEtlService } from './apps/api/src/modules/etl/oracle-etl.service';

// --- Carregar .env da API ---
const envPath = path.resolve(__dirname, 'apps/api/.env');
dotenv.config({ path: envPath });
console.log(`[ETL Script] .env carregado de: ${envPath}`);

// --- Datas para o período de Abril/2025 ---
const START_DATE_APRIL = '2025-05-01';
const END_DATE_APRIL = '2025-05-31';

async function runFullRawEtl() {
  console.log(
    `--- INICIANDO ETL COMPLETO PARA TABELAS RAW - PERÍODO: ${START_DATE_APRIL} a ${END_DATE_APRIL} ---`
  );

  // Inicializar Oracle Client
  try {
    if (
      process.env.ORACLE_HOME &&
      (process.platform === 'darwin' || process.platform === 'linux')
    ) {
      oracledb.initOracleClient({ libDir: process.env.ORACLE_HOME });
      console.log(`[ETL Script] Oracle Thick Client inicializado.`);
    } else {
      console.warn(
        '[ETL Script] ORACLE_HOME não definido, confiando no PATH para Oracle Client.'
      );
    }
  } catch (err: any) {
    console.error('[ETL Script] ERRO GRAVE ao inicializar Oracle Client:', err);
    process.exit(1);
  }

  // Instanciar serviços ETL
  const mySqlEtlService = new MySqlEtlService();
  const oracleEtlService = new OracleEtlService();

  let totalRecordsSaved = 0;

  try {
    // --- MySQL Extractions ---
    console.log('\n--- Processando Fontes MySQL ---');
    totalRecordsSaved += await mySqlEtlService.extractAndLoadQuebraDefeito(
      START_DATE_APRIL,
      END_DATE_APRIL
    );
    totalRecordsSaved += await mySqlEtlService.extractAndLoadAtraso(
      START_DATE_APRIL,
      END_DATE_APRIL
    );
    totalRecordsSaved += await mySqlEtlService.extractAndLoadFuroPorAtraso(
      START_DATE_APRIL,
      END_DATE_APRIL
    );
    totalRecordsSaved += await mySqlEtlService.extractAndLoadFuroDeViagem(
      START_DATE_APRIL,
      END_DATE_APRIL
    );
    // TODO: Adicionar chamada para Falta Frota quando o método estiver pronto

    // --- Oracle Extractions ---
    console.log('\n--- Processando Fontes Oracle ---');
    totalRecordsSaved += await oracleEtlService.extractAndLoadAusencia(
      START_DATE_APRIL,
      END_DATE_APRIL
    );
    totalRecordsSaved += await oracleEtlService.extractAndLoadColisao(
      START_DATE_APRIL,
      END_DATE_APRIL
    );
    totalRecordsSaved += await oracleEtlService.extractAndLoadPecas(
      START_DATE_APRIL,
      END_DATE_APRIL
    );
    totalRecordsSaved += await oracleEtlService.extractAndLoadPneus(
      START_DATE_APRIL,
      END_DATE_APRIL
    );
    totalRecordsSaved += await oracleEtlService.extractAndLoadFleetPerformance(
      START_DATE_APRIL,
      END_DATE_APRIL
    );
    totalRecordsSaved += await oracleEtlService.extractAndLoadKmOciosa(
      START_DATE_APRIL,
      END_DATE_APRIL
    ); // Componentes
    totalRecordsSaved += await oracleEtlService.extractAndLoadIpkCalculado(
      START_DATE_APRIL,
      END_DATE_APRIL
    ); // IPK já calculado

    console.log(`\n\n--- ETL PARA TABELAS RAW CONCLUÍDO ---`);
    console.log(
      `Total de ${totalRecordsSaved} grupos de registros processados e salvos nas tabelas raw.`
    );
    console.log('Verifique as tabelas raw_... no banco de dados Postgres.');
  } catch (error) {
    console.error('--- ERRO GERAL DURANTE A EXECUÇÃO DO ETL RAW ---');
    console.error(error);
  } finally {
    // Garante que TODAS as conexões sejam fechadas
    if (MySqlDataSource && MySqlDataSource.isInitialized) {
      await MySqlDataSource.destroy();
      console.log('Conexão MySQL finalizada.');
    }
    if (OracleDataSource && OracleDataSource.isInitialized) {
      await OracleDataSource.destroy();
      console.log('Conexão Oracle finalizada.');
    }
    if (AppDataSource && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Conexão Postgres (AppDataSource) finalizada.');
    }
    console.log('Processo ETL finalizado.');
  }
}

runFullRawEtl();
