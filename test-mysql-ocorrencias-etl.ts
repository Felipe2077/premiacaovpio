// test-mysql-ocorrencias-etl.ts (CORRIGIDO COM NOMES CERTOS DOS MÉTODOS)
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
import {
  AppDataSource,
  MySqlDataSource,
} from './apps/api/src/database/data-source'; // Importa ambos
import { MySqlEtlService } from './apps/api/src/modules/etl/mysql-etl.service';

// Carregar .env
const envPath = path.resolve(__dirname, 'apps/api/.env');
dotenv.config({ path: envPath });
console.log(`[Test Script] .env carregado de: ${envPath}`);
console.log(
  '[Test Script] MYSQL_USER:',
  process.env.MYSQL_USER ? 'Definido' : 'NÃO DEFINIDO!'
);

async function runTestMySqlOcorrenciasEtl() {
  console.log(
    '--- Iniciando Teste do MySqlEtlService (Ocorrências Horárias) ---'
  );

  if (
    !process.env.MYSQL_USER ||
    !process.env.MYSQL_PASSWORD ||
    !process.env.MYSQL_DB ||
    !process.env.POSTGRES_USER
  ) {
    console.error(
      'ERRO: Credenciais MySQL ou Postgres não encontradas no .env!'
    );
    return;
  }

  const etlService = new MySqlEtlService();

  // Define período de teste
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 30);
  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];

  if (!startDateString || !endDateString) {
    // Verificação de tipo
    throw new Error('Falha ao gerar as strings de data para a query MySQL.');
  }

  console.log(
    `Testando carga para período: ${startDateString} a ${endDateString}`
  );

  try {
    // --- Testar ATRASO (usando nome CORRETO do método) ---
    console.log('\n--- Testando extractAndLoadAtraso ---');
    const countAtraso = await etlService.extractAndLoadAtraso(
      startDateString,
      endDateString
    );
    console.log(
      `Resultado Atraso: ${countAtraso} registros processados/salvos.`
    );
    if (countAtraso === 0)
      console.log('(Nenhum dado encontrado no MySQL para este período)');

    // --- Testar FURO POR ATRASO (usando nome CORRETO do método) ---
    console.log('\n--- Testando extractAndLoadFuroPorAtraso ---');
    const countFuroAtraso = await etlService.extractAndLoadFuroPorAtraso(
      startDateString,
      endDateString
    );
    console.log(
      `Resultado Furo por Atraso: ${countFuroAtraso} registros processados/salvos.`
    );
    if (countFuroAtraso === 0)
      console.log('(Nenhum dado encontrado no MySQL para este período)');

    // --- Testar FURO DE VIAGEM (usando nome CORRETO do método) ---
    console.log('\n--- Testando extractAndLoadFuroDeViagem ---');
    const countFuroViagem = await etlService.extractAndLoadFuroDeViagem(
      startDateString,
      endDateString
    );
    console.log(
      `Resultado Furo de Viagem: ${countFuroViagem} registros processados/salvos.`
    );
    if (countFuroViagem === 0)
      console.log('(Nenhum dado encontrado no MySQL para este período)');

    console.log(
      '\n>>> Teste dos métodos de Ocorrências Horárias concluído (verificar logs e DB). <<<'
    );
  } catch (error) {
    console.error('--- ERRO GERAL NO TESTE DO ETL MYSQL OCORRÊNCIAS ---');
    console.error(error);
  } finally {
    // Garante que AMBAS as conexões sejam fechadas
    if (MySqlDataSource.isInitialized) {
      await MySqlDataSource.destroy();
      console.log('Conexão MySQL finalizada.');
    }
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Conexão Postgres finalizada.');
    }
  }
}

// Executa o teste
runTestMySqlOcorrenciasEtl();
