// test-etl-oracle-ipk-final.ts (na raiz do projeto - VERSÃO COMPLETA)
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
async function runTestOracleIpkFinal() {
  console.log('--- Iniciando Teste do ETL Service (Oracle IPK Calculado) ---');
  if (!process.env.ORACLE_USER || !process.env.POSTGRES_USER) {
    console.error(
      'ERRO: Credenciais Oracle ou Postgres não encontradas no .env!'
    );
    return;
  }

  const etlService = new OracleEtlService(); // Instancia o serviço Oracle ETL

  // Define período de teste (Ex: Abril/2025 completo, já que IPK é mensal)
  const startDateString = '2025-04-01';
  const endDateString = '2025-04-30';

  if (!startDateString || !endDateString) {
    // Verificação de tipo
    throw new Error('Falha ao gerar as strings de data para a query.');
  }

  console.log(
    `Testando extração/carga para período: ${startDateString} a ${endDateString}`
  );

  try {
    // Chama o método de extração de IPK Calculado
    const countSaved = await etlService.extractAndLoadIpkCalculado(
      startDateString,
      endDateString
    );

    console.log(
      `\n--- RESULTADO IPK Calculado: ${countSaved} registros processados/salvos na tabela raw_oracle_ipk_calculado. ---`
    );
    if (countSaved > 0) {
      console.log(
        '>>> SUCESSO! Extração e carga de IPK Calculado do Oracle funcionaram! <<<'
      );
    } else {
      console.log(
        '--- Conexão/Query OK, mas nenhum dado de IPK Calculado encontrado ou salvo para o período. ---'
      );
    }
  } catch (error) {
    console.error('--- ERRO GERAL NO TESTE DO ETL ORACLE IPK CALCULADO ---');
    console.error(error);
  } finally {
    // Garante que AMBAS as conexões (Oracle e Postgres) sejam fechadas se foram inicializadas
    if (OracleDataSource && OracleDataSource.isInitialized) {
      // Adicionado check se OracleDataSource existe
      await OracleDataSource.destroy();
      console.log('Conexão Oracle (OracleDataSource) finalizada.');
    }
    if (AppDataSource && AppDataSource.isInitialized) {
      // Adicionado check se AppDataSource existe
      await AppDataSource.destroy();
      console.log('Conexão Postgres (AppDataSource) finalizada.');
    }
  }
}

// Executa o teste
runTestOracleIpkFinal();
