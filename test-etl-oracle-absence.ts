// test-etl-oracle-absence.ts (na raiz do projeto)
import * as dotenv from 'dotenv';
import oracledb from 'oracledb'; // Importar oracledb para init
import path from 'path';
import 'reflect-metadata';
// Importa o serviço específico do Oracle ETL
import { OracleEtlService } from './apps/api/src/modules/etl/oracle-etl.service';
// Importa o DataSource PRINCIPAL (Oracle) apenas para poder fechar a conexão no final
import { OracleDataSource } from './apps/api/src/database/data-source';

// --- Carregar .env da API ---
const envPath = path.resolve(__dirname, 'apps/api/.env');
const configResult = dotenv.config({ path: envPath });
if (configResult.error) {
  console.warn(`AVISO: dotenv não carregou ${envPath}.`, configResult.error);
} else {
  console.log(`.env carregado de ${envPath}`);
}
console.log(
  '[Test Script] ORACLE_USER:',
  process.env.ORACLE_USER ? 'Definido' : 'NÃO DEFINIDO!'
);

// --- Inicializar Oracle Client (COPIADO DO TESTE ANTERIOR) ---
// Essencial rodar ANTES de qualquer operação do oracledb/TypeORM com Oracle
try {
  // Confie que ORACLE_HOME ou DYLD_LIBRARY_PATH estão no seu .zshrc e você deu 'source'
  if (
    process.env.ORACLE_HOME &&
    (process.platform === 'darwin' || process.platform === 'linux')
  ) {
    oracledb.initOracleClient({ libDir: process.env.ORACLE_HOME });
    console.log(
      `[Test Script] Oracle Thick Client inicializado via ORACLE_HOME do .env: ${process.env.ORACLE_HOME}`
    );
  } else if (process.platform === 'darwin' && process.env.DYLD_LIBRARY_PATH) {
    console.log(
      '[Test Script] Usando DYLD_LIBRARY_PATH do ambiente para Oracle Client no macOS.'
    );
  } else if (process.platform === 'linux' && process.env.LD_LIBRARY_PATH) {
    console.log(
      '[Test Script] Usando LD_LIBRARY_PATH do ambiente para Oracle Client no Linux.'
    );
  } else {
    console.warn(
      '[Test Script] Variáveis de ambiente Oracle não parecem definidas. Tentando continuar...'
    );
  }
  console.log('[Test Script] Versão node-oracledb:', oracledb.versionString);
  console.log(
    '[Test Script] Modo Thick Client habilitado:',
    oracledb.thin ? 'NÃO' : 'SIM'
  );
} catch (err: any) {
  console.error('[Test Script] ERRO GRAVE ao inicializar Oracle Client:', err);
  process.exit(1);
}

// --- Função de Teste ---
async function runTestOracleAbsence() {
  console.log('--- Iniciando Teste do ETL Service (Oracle Ausência) ---');
  // --- LOGS DE VERIFICAÇÃO DE CREDENCIAIS ---
  console.log('[Test Script] Verificando credenciais carregadas:');
  console.log('  ORACLE_USER:', process.env.ORACLE_USER);
  console.log(
    '  ORACLE_PASSWORD:',
    process.env.ORACLE_PASSWORD ? '****** (EXISTE!)' : '!!! AUSENTE / VAZIA !!!'
  );
  console.log('  ORACLE_CONNECT_STRING:', process.env.ORACLE_CONNECT_STRING);
  // ------------------------------------------

  // A verificação que está dando erro:
  if (
    !process.env.ORACLE_USER ||
    !process.env.ORACLE_PASSWORD ||
    !process.env.ORACLE_CONNECT_STRING
  ) {
    console.error('ERRO: Credenciais Oracle não encontradas no .env!');
    // Não tenta destruir DataSource se credenciais falharam
    return;
  }

  // Verifica credenciais Oracle básicas
  if (
    !process.env.ORACLE_USER ||
    !process.env.ORACLE_PASSWORD ||
    !process.env.ORACLE_CONNECT_STRING
  ) {
    console.error('ERRO: Credenciais Oracle não encontradas no .env!');
    return;
  }

  const etlService = new OracleEtlService(); // Instancia o serviço Oracle ETL

  // Define período de teste (ex: últimos 7 dias)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 6); // Pega 7 dias atrás (incluindo hoje)
  // Formata as datas como YYYY-MM-DD
  const startDateString = startDate.toISOString().split('T')[0];
  const endDateString = endDate.toISOString().split('T')[0];

  try {
    // --- VERIFICAÇÃO ADICIONADA (Igual ao teste MySQL) ---
    if (!startDateString || !endDateString) {
      throw new Error('Falha ao gerar as strings de data para a query Oracle.');
    }
    // Chama o método de extração de ausências do serviço
    const oracleData = await etlService.extractAusenciaFromOracle(
      startDateString,
      endDateString
    );

    if (oracleData && oracleData.length > 0) {
      // Verifica se retornou um array com dados
      console.log('--- SUCESSO! Dados de Ausência extraídos do Oracle: ---');
      console.log(
        `(Mostrando os primeiros ${Math.min(10, oracleData.length)} de ${oracleData.length} registros)`
      );
      console.log(oracleData.slice(0, 10)); // Mostra os 10 primeiros
    } else if (oracleData) {
      // Verificação extra se retornou array vazio
      console.log(
        '--- Conexão/Query OK, mas nenhum dado de Ausência encontrado para o período no Oracle ---'
      );
    } else {
      console.warn(
        '--- A função de extração retornou um valor inesperado (não array). ---'
      );
    }
  } catch (error) {
    console.error('--- ERRO GERAL NO TESTE DO ETL ORACLE AUSENCIA ---');
    console.error(error);
  } finally {
    // Garante que a conexão Oracle (AppDataSource), se foi inicializada, seja fechada
    if (OracleDataSource.isInitialized) {
      await OracleDataSource.destroy();
      console.log('Conexão Oracle (OracleDataSource) finalizada.');
    }
  }
}

// Executa o teste
runTestOracleAbsence();
