// test-mysql-connect.ts
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
// Importa SÓ o DataSource do MySQL
import { MySqlDataSource } from './apps/api/src/database/data-source';

// Garante que carrega o .env correto
dotenv.config({ path: path.resolve(__dirname, 'apps/api/.env') });
// --- LOGS DE VERIFICAÇÃO DO .ENV ---
console.log('ENV Check (MySQL):');
console.log('  MYSQL_HOST:', process.env.MYSQL_HOST);
console.log('  MYSQL_PORT:', process.env.MYSQL_PORT);
console.log('  MYSQL_USER:', process.env.MYSQL_USER);
console.log(
  '  MYSQL_PASSWORD:',
  process.env.MYSQL_PASSWORD ? '****** (Definida)' : '!!! NÃO DEFINIDA !!!'
);
console.log('  MYSQL_DB:', process.env.MYSQL_DB);
// ------------------------------------
async function testMysql() {
  console.log('Tentando inicializar e conectar ao MySQL Legado...');
  if (!process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD) {
    // Verifica se as vars existem
    console.error('ERRO: Credenciais MySQL não encontradas no .env!');
    return;
  }

  let connectionInitialized = false;
  try {
    // Inicializa APENAS a conexão MySQL
    if (!MySqlDataSource.isInitialized) {
      await MySqlDataSource.initialize();
      connectionInitialized = true;
    }
    console.log('Conexão MySQL estabelecida!');

    // Tenta rodar a query de Quebra/Defeito (simplificada)
    const query = `
            SELECT S.SETOR, A.OCORRENCIA, COUNT(A.OCORRENCIA) AS TOTAL, DATE(A.DATA) as DIA
            FROM negocioperfeito.quebrasedefeitos A
            INNER JOIN negocioperfeito.setores AS S ON S.CODSETOR = A.SETORLINHA
            WHERE A.EXCLUIR = 'NÃO' AND A.CODOCORRENCIA IN (1, 2) AND A.DATA >= CURDATE() - INTERVAL 7 DAY /* Últimos 7 dias para teste */
            GROUP BY S.SETOR, A.OCORRENCIA, DATE(A.DATA)
            ORDER BY S.SETOR, DIA DESC, A.OCORRENCIA
            LIMIT 10;
        `;
    console.log('Executando query no MySQL...');
    const results = await MySqlDataSource.query(query);
    console.log('Resultado da Query MySQL (10 primeiras linhas):', results);

    if (results.length > 0) {
      console.log('>>> SUCESSO! Conexão e query no MySQL funcionaram! <<<');
    } else {
      console.log(
        '>>> Conexão e query OK, mas não retornou dados recentes (últimos 7 dias). <<<'
      );
    }
  } catch (error) {
    console.error('!!!!! ERRO ao conectar ou executar query no MySQL !!!!!');
    console.error(error); // Mostra detalhes do erro (ex: acesso negado, tabela não encontrada)
  } finally {
    if (connectionInitialized && MySqlDataSource.isInitialized) {
      await MySqlDataSource.destroy();
      console.log('Conexão MySQL finalizada.');
    }
  }
}
testMysql();
