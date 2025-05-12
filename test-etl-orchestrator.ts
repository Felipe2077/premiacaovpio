// test-etl-orchestrator.ts (CORRIGIDO - Inicializa DataSources ANTES)
import * as dotenv from 'dotenv';
import oracledb from 'oracledb';
import path from 'path';
import 'reflect-metadata';
import {
  AppDataSource,
  MySqlDataSource,
  OracleDataSource,
} from './apps/api/src/database/data-source';
import { EtlService } from './apps/api/src/modules/etl/etl.service';

// --- Carregar .env da API ---
const envPath = path.resolve(__dirname, 'apps/api/.env');
dotenv.config({ path: envPath });
console.log(`[Test Orchestrator] .env carregado de: ${envPath}`);

async function runEtlOrchestratorTest() {
  console.log('--- Iniciando Teste do EtlService ORQUESTRADOR ---');

  try {
    // --- INICIALIZAR DATASOURCES PRIMEIRO ---
    console.log('[Test Orchestrator] Inicializando DataSources...');
    if (!AppDataSource.isInitialized) {
      console.log(
        '[Test Orchestrator] Inicializando AppDataSource (Postgres)...'
      );
      await AppDataSource.initialize();
      console.log('[Test Orchestrator] AppDataSource (Postgres) INICIALIZADO.');
    } else {
      console.log(
        '[Test Orchestrator] AppDataSource (Postgres) já estava inicializado.'
      );
    }

    // Inicializar OracleDataSource e MySqlDataSource condicionalmente, se forem usados pelos sub-serviços
    // O construtor do EtlService instancia os sub-serviços que podem inicializar suas próprias conexões
    // Mas é bom garantir que o Oracle Client seja inicializado se o OracleEtlService for ser usado.
    if (process.env.ORACLE_USER) {
      try {
        if (
          process.env.ORACLE_HOME &&
          (process.platform === 'darwin' || process.platform === 'linux')
        ) {
          oracledb.initOracleClient({ libDir: process.env.ORACLE_HOME });
          console.log(`[Test Orchestrator] Oracle Thick Client inicializado.`);
        } else {
          console.warn(
            '[Test Orchestrator] ORACLE_HOME não definido, confiando no PATH para Oracle Client.'
          );
        }
        // A inicialização do OracleDataSource é feita dentro do ensureOracleConnection no OracleEtlService
      } catch (err: any) {
        console.error(
          '[Test Orchestrator] ERRO ao inicializar Oracle Client:',
          err
        );
      }
    }
    // A inicialização do MySqlDataSource é feita dentro do ensureMySqlConnection no MySqlEtlService

    console.log(
      '[Test Orchestrator] DataSources (Postgres) pronto. Outros serão inicializados pelos serviços ETL se necessário.'
    );
    // -----------------------------------------

    const etlService = new EtlService(); // AGORA instancia o EtlService
    const targetPeriodMesAno = '2025-04'; // Mês que populamos nas tabelas RAW

    console.log(
      `[Test Orchestrator] Processando dados para o período: ${targetPeriodMesAno}`
    );
    await etlService.processAndLoadPerformanceDataForPeriod(targetPeriodMesAno);

    console.log(
      `\n--- Teste do Orquestrador para ${targetPeriodMesAno} concluído. ---`
    );
    console.log(
      "Verifique os logs para o objeto 'PerformanceDataEntity a ser salvo'."
    );
    console.log(
      "Se descomentado no EtlService, verifique a tabela 'performance_data' no Postgres."
    );
  } catch (error: unknown) {
    let errorMessage = `--- ERRO GERAL NO TESTE DO ORQUESTRADOR ETL para ---`;
    if (error instanceof Error) {
      errorMessage = `--- ERRO GERAL NO TESTE DO ORQUESTRADOR ETL para  (${error.name}): ${error.message} ---`;
    }
    console.error(errorMessage, error);
  } finally {
    // Fechar todas as conexões que podem ter sido abertas
    if (AppDataSource && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Conexão Postgres (AppDataSource) finalizada.');
    }
    if (MySqlDataSource && MySqlDataSource.isInitialized) {
      await MySqlDataSource.destroy();
      console.log('Conexão MySQL (MySqlDataSource) finalizada.');
    }
    if (OracleDataSource && OracleDataSource.isInitialized) {
      await OracleDataSource.destroy();
      console.log('Conexão Oracle (OracleDataSource) finalizada.');
    }
    console.log('Processo de teste do orquestrador finalizado.');
  }
}

runEtlOrchestratorTest();
