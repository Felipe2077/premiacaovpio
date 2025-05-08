// test-etl-oracle-colisao.ts (COMPLETO)
import * as dotenv from 'dotenv';
import oracledb from 'oracledb';
import path from 'path';
import 'reflect-metadata';
import { OracleDataSource } from './apps/api/src/database/data-source';
import { OracleEtlService } from './apps/api/src/modules/etl/oracle-etl.service';

dotenv.config({ path: path.resolve(__dirname, 'apps/api/.env') });
console.log(
  '[Test Script] ORACLE_USER:',
  process.env.ORACLE_USER ? 'Definido' : 'NÃO DEFINIDO!'
);
try {
  if (
    process.env.ORACLE_HOME &&
    (process.platform === 'darwin' || process.platform === 'linux')
  ) {
    oracledb.initOracleClient({ libDir: process.env.ORACLE_HOME });
    console.log(`[Test Script] Oracle Thick Client inicializado.`);
  } else {
    console.warn('[Test Script] ORACLE_HOME não definido, confiando no PATH.');
  }
  console.log('[Test Script] Versão node-oracledb:', oracledb.versionString);
  console.log(
    '[Test Script] Modo Thick Client habilitado:',
    oracledb.thin ? 'NÃO' : 'SIM'
  );
} catch (err: any) {
  console.error('[Test Script] ERRO GRAVE init Oracle Client:', err);
  process.exit(1);
}

async function runTestOracleColisao() {
  console.log('--- Iniciando Teste do ETL Service (Oracle Colisão) ---');
  if (!process.env.ORACLE_USER) {
    console.error('ERRO: Credenciais Oracle!');
    return;
  }

  const etlService = new OracleEtlService();
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29);
  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];
  if (!startDateString || !endDateString) {
    throw new Error('Falha ao gerar datas');
  }
  console.log(
    `Testando extração para período: ${startDateString} a ${endDateString}`
  );

  try {
    const countSaved = await etlService.extractAndLoadColisao(
      startDateString,
      endDateString
    ); // Chama o método correto
    console.log(
      `\n--- RESULTADO Colisão: ${countSaved} registros processados/salvos. ---`
    );
    if (countSaved > 0) {
      console.log('>>> SUCESSO! Extração e carga de Colisão funcionaram! <<<');
    } else {
      console.log(
        '--- Nenhum dado de Colisão encontrado ou salvo para o período. ---'
      );
    }
  } catch (error) {
    console.error('--- ERRO GERAL NO TESTE ETL ORACLE COLISAO ---');
    console.error(error);
  } finally {
    if (OracleDataSource.isInitialized) {
      await OracleDataSource.destroy();
      console.log('Conexão Oracle finalizada.');
    }
  }
}
runTestOracleColisao();
