// test-etl-oracle-fleet-km.ts (na raiz do projeto - VERSÃO COMPLETA)
import * as dotenv from 'dotenv';
import oracledb from 'oracledb';
import path from 'path';
import 'reflect-metadata';
// Importa o serviço específico do Oracle ETL
import { OracleEtlService } from './apps/api/src/modules/etl/oracle-etl.service';
// Importa AMBOS DataSources para fechar no final
import {
  AppDataSource,
  OracleDataSource,
} from './apps/api/src/database/data-source';

// --- Carregar .env da API ---
const envPath = path.resolve(__dirname, 'apps/api/.env');
dotenv.config({ path: envPath });
console.log(`[Test Script] .env carregado de: ${envPath}`);
console.log(
  '[Test Script] ORACLE_USER:',
  process.env.ORACLE_USER ? 'Definido' : 'NÃO DEFINIDO!'
);

// --- Inicializar Oracle Client ---
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

// --- Função de Teste ---
async function runTestOracleFleetKm() {
  console.log(
    '--- Iniciando Teste do ETL Service (Oracle Desempenho Frota e KM Ociosa) ---'
  );
  if (!process.env.ORACLE_USER || !process.env.POSTGRES_USER) {
    // Verifica se tem credenciais pros dois DBs que o serviço usa
    console.error(
      'ERRO: Credenciais Oracle ou Postgres não encontradas no .env!'
    );
    return;
  }

  const etlService = new OracleEtlService(); // Instancia o serviço

  // Define período de teste (Ex: Abril/2025 completo, já que os cálculos são mensais)
  const startDateString = '2025-04-01';
  const endDateString = '2025-04-30';

  // Garante que as datas são strings válidas (Correção TS2345)
  if (!startDateString || !endDateString) {
    throw new Error('Falha ao gerar as strings de data.');
  }

  console.log(
    `Testando extração/carga para período: ${startDateString} a ${endDateString}`
  );

  try {
    // Testar Extração de KM Ociosa
    console.log('\n--- Testando extractAndLoadKmOciosa ---');
    const countKmOciosa = await etlService.extractAndLoadKmOciosa(
      startDateString,
      endDateString
    );
    console.log(
      `Resultado KM Ociosa: ${countKmOciosa} registros processados/salvos.`
    );
    if (countKmOciosa === 0)
      console.log(
        '(Nenhum dado de KM Ociosa encontrado ou salvo para o período)'
      );
    else
      console.log('>>> SUCESSO! Extração e carga de KM Ociosa funcionou! <<<');

    console.log(
      '\n>>> Teste dos métodos Oracle restantes concluído (verificar logs e DB). <<<'
    );
  } catch (error) {
    console.error('--- ERRO GERAL NO TESTE ETL ORACLE FLEET/KM ---');
    console.error(error);
  } finally {
    // Garante que AMBAS as conexões (Oracle e Postgres) sejam fechadas se foram inicializadas
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

// Executa o teste
runTestOracleFleetKm();
