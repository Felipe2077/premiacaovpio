// test-etl-oracle-custos.ts (COMPLETO)
import * as dotenv from 'dotenv';
import oracledb from 'oracledb';
import path from 'path';
import 'reflect-metadata';
import {
  AppDataSource,
  OracleDataSource,
} from './apps/api/src/database/data-source'; // Importa ambos
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
} catch (err: any) {
  console.error('[Test Script] ERRO GRAVE init Oracle Client:', err);
  process.exit(1);
}

async function runTestOracleCustos() {
  console.log('--- Iniciando Teste do ETL Service (Oracle Peças e Pneus) ---');
  if (!process.env.ORACLE_USER || !process.env.POSTGRES_USER) {
    console.error('ERRO: Credenciais Oracle/Postgres!');
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
    `Testando carga para período: ${startDateString} a ${endDateString}`
  );

  try {
    console.log('\n--- Testando extractAndLoadPecas ---');
    const countPecas = await etlService.extractAndLoadPecas(
      startDateString,
      endDateString
    );
    console.log(`Resultado Peças: ${countPecas} registros processados/salvos.`);
    if (countPecas === 0)
      console.log('(Nenhum dado de Peças encontrado ou salvo)');

    console.log('\n--- Testando extractAndLoadPneus ---');
    const countPneus = await etlService.extractAndLoadPneus(
      startDateString,
      endDateString
    );
    console.log(`Resultado Pneus: ${countPneus} registros processados/salvos.`);
    if (countPneus === 0)
      console.log('(Nenhum dado de Pneus encontrado ou salvo)');

    console.log(
      '\n>>> Teste dos métodos de Custos concluído (verificar logs e DB). <<<'
    );
  } catch (error) {
    console.error('--- ERRO GERAL NO TESTE ETL ORACLE CUSTOS ---');
    console.error(error);
  } finally {
    if (OracleDataSource.isInitialized) {
      await OracleDataSource.destroy();
      console.log('Conexão Oracle finalizada.');
    }
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Conexão Postgres finalizada.');
    }
  }
}
runTestOracleCustos();
