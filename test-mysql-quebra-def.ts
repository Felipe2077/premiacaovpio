// test-mysql-etl.ts (AJUSTADO PARA TESTAR CARGA)
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
import { MySqlEtlService } from './apps/api/src/modules/etl/mysql-etl.service';
// Importa AMBOS os DataSources para fechar no final
import {
  AppDataSource,
  MySqlDataSource,
} from './apps/api/src/database/data-source';

dotenv.config({ path: path.resolve(__dirname, 'apps/api/.env') });

async function runTestMySqlEtlLoad() {
  console.log(
    '--- Iniciando Teste do MySqlEtlService (Carga Quebra/Defeito) ---'
  );
  if (!process.env.MYSQL_USER || !process.env.POSTGRES_USER) {
    /* Checa credenciais */ return;
  }

  const etlService = new MySqlEtlService();
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6);
  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];

  console.log(
    `Testando carga para período: ${startDateString} a ${endDateString}`
  );
  if (!startDateString || !endDateString) {
    console.error('Falha ao gerar as strings de data para a query MySQL.');
    throw new Error('Falha ao gerar as strings de data para a query MySQL.');
  }

  try {
    // Chama o método que extrai E SALVA
    const countSaved = await etlService.extractAndLoadQuebraDefeito(
      startDateString,
      endDateString
    );

    console.log(
      `\n--- RESULTADO DO TESTE: ${countSaved} registros processados/salvos na tabela raw_mysql_quebras_defeitos. ---`
    );
    if (countSaved > 0) {
      console.log(
        '>>> SUCESSO! Extração e carga inicial do MySQL parecem ter funcionado! <<<'
      );
    } else {
      console.log(
        '--- Conexão/Query OK, mas nenhum dado de Quebra/Defeito encontrado ou salvo para o período. ---'
      );
    }
  } catch (error) {
    console.error('--- ERRO GERAL NO TESTE DO ETL MYSQL CARGA ---');
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
runTestMySqlEtlLoad();
