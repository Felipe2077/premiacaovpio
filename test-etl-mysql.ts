// test-etl-mysql.ts (na raiz do projeto)
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
import {
  AppDataSource,
  MySqlDataSource,
} from './apps/api/src/database/data-source'; // Importa para fechar conexão
import { EtlService } from './apps/api/src/modules/etl/etl.service'; // Importa o serviço

// Carrega .env da API
dotenv.config({ path: path.resolve(__dirname, 'apps/api/.env') });

async function runTest() {
  console.log('--- Iniciando Teste do ETL Service (MySQL) ---');

  const etlService = new EtlService(); // Instancia o serviço

  // Define um período de teste (ex: Últimos 15 dias)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 14); // Pega 15 dias atrás

  const startDateString = startDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  const endDateString = endDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD

  try {
    // --- VERIFICAÇÃO ADICIONADA ---
    if (!startDateString || !endDateString) {
      throw new Error('Falha ao gerar as strings de data para a query.');
    }
    // Chama o método de extração
    const mysqlData = await etlService.extractQuebraDefeitoFromMySQL(
      startDateString,
      endDateString
    );

    if (mysqlData.length > 0) {
      console.log('--- SUCESSO! Dados extraídos do MySQL: ---');
      console.log(
        `(Mostrando os primeiros ${Math.min(10, mysqlData.length)} de ${mysqlData.length} registros)`
      );
      console.log(mysqlData.slice(0, 10)); // Mostra os 10 primeiros
    } else {
      console.log(
        '--- Conexão OK, mas nenhum dado de Quebra/Defeito encontrado para o período no MySQL ---'
      );
    }
  } catch (error) {
    console.error('--- ERRO GERAL NO TESTE DO ETL ---');
    console.error(error);
  } finally {
    // Garante que as conexões abertas sejam fechadas ao final do teste
    if (MySqlDataSource.isInitialized) await MySqlDataSource.destroy();
    if (AppDataSource.isInitialized) await AppDataSource.destroy(); // Fecha Postgres também se foi aberto
    console.log('Conexões finalizadas.');
  }
}

runTest();
