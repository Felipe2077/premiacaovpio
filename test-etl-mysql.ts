// test-mysql-etl.ts (ou o nome que você escolheu, na raiz do projeto)
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
// Importa o serviço específico do MySQL ETL
import { MySqlEtlService } from './apps/api/src/modules/etl/mysql-etl.service';
// Importa o DataSource do MySQL apenas para poder fechar a conexão no final
import { MySqlDataSource } from './apps/api/src/database/data-source';

// --- Carregar .env da API ---
const envPath = path.resolve(__dirname, 'apps/api/.env');
const configResult = dotenv.config({ path: envPath });
if (configResult.error) {
  console.warn(
    `AVISO: dotenv não carregou ${envPath}. Usando vars do ambiente.`,
    configResult.error
  );
} else {
  console.log(`.env carregado de ${envPath}`);
}
console.log(
  '[Test Script] MYSQL_USER:',
  process.env.MYSQL_USER ? 'Definido' : 'NÃO DEFINIDO!'
);

// --- Função de Teste ---
async function runTestMySqlEtl() {
  console.log('--- Iniciando Teste do MySqlEtlService (Quebra/Defeito) ---');

  // Verifica credenciais MySQL básicas
  if (
    !process.env.MYSQL_USER ||
    !process.env.MYSQL_PASSWORD ||
    !process.env.MYSQL_DB
  ) {
    console.error('ERRO: Credenciais MySQL não encontradas no .env!');
    return; // Não tenta fechar DataSource se nem tem credencial
  }

  const etlService = new MySqlEtlService(); // Instancia o serviço MySQL ETL

  // Define período de teste (ex: últimos 7 dias)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6); // Pega 7 dias atrás (incluindo hoje)
  // Formata as datas como YYYY-MM-DD
  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];

  try {
    if (!startDateString || !endDateString) {
      console.error('Falha ao gerar as strings de data para a query MySQL.');
      throw new Error('Falha ao gerar as strings de data para a query MySQL.');
    }
    // Chama o método de extração de Quebra/Defeito do serviço
    const mysqlData = await etlService.extractQuebraDefeitoFromMySQL(
      startDateString,
      endDateString
    );

    if (mysqlData && mysqlData.length > 0) {
      // Verifica se retornou um array com dados
      console.log(
        '--- SUCESSO! Dados de Quebra/Defeito extraídos do MySQL via Service: ---'
      );
      console.log(
        `(Mostrando os primeiros ${Math.min(10, mysqlData.length)} de ${mysqlData.length} registros)`
      );
      console.log(mysqlData.slice(0, 10)); // Mostra os 10 primeiros
    } else if (mysqlData) {
      // Verificação extra se retornou array vazio
      console.log(
        '--- Conexão/Query OK, mas nenhum dado de Quebra/Defeito encontrado para o período no MySQL ---'
      );
    } else {
      console.warn(
        '--- A função de extração retornou um valor inesperado (não array). ---'
      );
    }
  } catch (error) {
    console.error('--- ERRO GERAL NO TESTE DO ETL MYSQL ---');
    console.error(error);
  } finally {
    // Garante que a conexão MySQL (MySqlDataSource), se foi inicializada pelo serviço, seja fechada
    if (MySqlDataSource.isInitialized) {
      await MySqlDataSource.destroy();
      console.log('Conexão MySQL (MySqlDataSource) finalizada.');
    }
  }
}

// Executa o teste
runTestMySqlEtl();
