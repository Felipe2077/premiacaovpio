// test-etl-oracle-ipk.ts (na raiz do projeto)
import * as dotenv from 'dotenv';
import oracledb from 'oracledb';
import path from 'path';
import 'reflect-metadata';
import { OracleDataSource } from './apps/api/src/database/data-source'; // Importa DataSource Oracle
import { OracleEtlService } from './apps/api/src/modules/etl/oracle-etl.service';

dotenv.config({ path: path.resolve(__dirname, 'apps/api/.env') });

// --- Inicializar Oracle Client --- (igual ao script anterior)
try {
  if (
    process.env.ORACLE_HOME &&
    (process.platform === 'darwin' || process.platform === 'linux')
  ) {
    oracledb.initOracleClient({ libDir: process.env.ORACLE_HOME });
    console.log(
      `[Test Script] Oracle Thick Client inicializado via ORACLE_HOME.`
    );
  } // ... (resto da lógica de init) ...
  console.log('[Test Script] Versão node-oracledb:', oracledb.versionString);
  console.log(
    '[Test Script] Modo Thick Client habilitado:',
    oracledb.thin ? 'NÃO' : 'SIM'
  );
} catch (err: any) {
  console.error('[Test Script] ERRO GRAVE init Oracle Client:', err);
  process.exit(1);
}

// --- Função de Teste ---
async function runTestOracleIpk() {
  console.log('--- Iniciando Teste do ETL Service (Oracle IPK) ---');
  if (
    !process.env.ORACLE_USER ||
    !process.env.ORACLE_PASSWORD ||
    !process.env.ORACLE_CONNECT_STRING
  ) {
    console.error('ERRO: Credenciais Oracle não encontradas!');
    return;
  }

  const etlService = new OracleEtlService();

  // Define período de teste (Ex: Mês de Abril/2025)
  const startDateString = '2025-04-01';
  const endDateString = '2025-04-03';

  try {
    // Chama o método de extração de IPK
    const oracleData = await etlService.extractIpkFromOracle(
      startDateString,
      endDateString
    );

    if (oracleData && oracleData.length > 0) {
      console.log('--- SUCESSO! Dados de IPK extraídos do Oracle: ---');
      console.log(oracleData); // Mostra todos os resultados
    } else if (oracleData) {
      console.log(
        '--- Conexão/Query OK, mas nenhum dado de IPK encontrado para o período no Oracle ---'
      );
    } else {
      console.warn(
        '--- A função de extração retornou um valor inesperado (não array). ---'
      );
    }
  } catch (error) {
    console.error('--- ERRO GERAL NO TESTE DO ETL ORACLE IPK ---');
    console.error(error);
  } finally {
    if (OracleDataSource.isInitialized) {
      await OracleDataSource.destroy();
      console.log('Conexão Oracle (OracleDataSource) finalizada.');
    }
  }
}

// Executa o teste
runTestOracleIpk();
