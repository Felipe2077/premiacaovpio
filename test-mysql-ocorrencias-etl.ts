// test-mysql-ocorrencias-etl.ts (ou nome similar, na raiz do projeto)
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
import { MySqlDataSource } from './apps/api/src/database/data-source';
import { MySqlEtlService } from './apps/api/src/modules/etl/mysql-etl.service';

// Carregar .env da API
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
    !process.env.MYSQL_DB
  ) {
    console.error('ERRO: Credenciais MySQL não encontradas no .env!');
    return;
  }

  const etlService = new MySqlEtlService();

  // Define período de teste (ex: últimos 7 dias para ter dados)
  const endDate = new Date(); // Hoje
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6); // Últimos 7 dias
  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];

  console.log(`Período de teste: ${startDateString} a ${endDateString}`);

  try {
    if (!startDateString || !endDateString) {
      console.error('Falha ao gerar as strings de data para a query MySQL.');
      throw new Error('Falha ao gerar as strings de data para a query MySQL.');
    }
    // Testar Extração de ATRASO (CODOCORRENCIA = 2)
    const atrasoData = await etlService.extractAtrasoFromMySql(
      startDateString,
      endDateString
    );
    if (atrasoData && atrasoData.length > 0) {
      console.log(
        '\n--- SUCESSO! Dados de ATRASO extraídos do MySQL via Service: ---'
      );
      console.log(
        `(Mostrando os primeiros ${Math.min(5, atrasoData.length)} de ${atrasoData.length} registros)`
      );
      console.log(atrasoData.slice(0, 5));
    } else if (atrasoData) {
      console.log(
        '\n--- Nenhum dado de ATRASO encontrado para o período no MySQL ---'
      );
    }

    // Testar Extração de FURO POR ATRASO (CODOCORRENCIA = 3)
    const furoAtrasoData = await etlService.extractFuroPorAtrasoFromMySql(
      startDateString,
      endDateString
    );
    if (furoAtrasoData && furoAtrasoData.length > 0) {
      console.log(
        '\n--- SUCESSO! Dados de FURO POR ATRASO extraídos do MySQL via Service: ---'
      );
      console.log(
        `(Mostrando os primeiros ${Math.min(5, furoAtrasoData.length)} de ${furoAtrasoData.length} registros)`
      );
      console.log(furoAtrasoData.slice(0, 5));
    } else if (furoAtrasoData) {
      console.log(
        '\n--- Nenhum dado de FURO POR ATRASO encontrado para o período no MySQL ---'
      );
    }

    // Testar Extração de FURO DE VIAGEM (CODOCORRENCIA = 4)
    const furoViagemData = await etlService.extractFuroDeViagemFromMySql(
      startDateString,
      endDateString
    );
    if (furoViagemData && furoViagemData.length > 0) {
      console.log(
        '\n--- SUCESSO! Dados de FURO DE VIAGEM extraídos do MySQL via Service: ---'
      );
      console.log(
        `(Mostrando os primeiros ${Math.min(5, furoViagemData.length)} de ${furoViagemData.length} registros)`
      );
      console.log(furoViagemData.slice(0, 5));
    } else if (furoViagemData) {
      console.log(
        '\n--- Nenhum dado de FURO DE VIAGEM encontrado para o período no MySQL ---'
      );
    }
  } catch (error) {
    console.error('--- ERRO GERAL NO TESTE DO ETL MYSQL OCORRÊNCIAS ---');
    console.error(error);
  } finally {
    if (MySqlDataSource.isInitialized) {
      await MySqlDataSource.destroy();
      console.log('\nConexão MySQL (MySqlDataSource) finalizada.');
    }
  }
}

runTestMySqlOcorrenciasEtl();
