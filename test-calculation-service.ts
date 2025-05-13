// test-calculation-service.ts (na raiz do projeto - VERSÃO COMPLETA)
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
// Importar o CalculationService
import { CalculationService } from './apps/api/src/modules/calculation/calculation.service';
// Importar o AppDataSource para inicializar e fechar a conexão
import { AppDataSource } from './apps/api/src/database/data-source';

// --- Carregar .env da API ---
const envPath = path.resolve(__dirname, 'apps/api/.env');
dotenv.config({ path: envPath });
console.log(`[Test Calculation Script] .env carregado de: ${envPath}`);

// --- Função de Teste ---
async function runCalculationServiceTest() {
  console.log('--- Iniciando Teste do CalculationService ---');

  // Verifica credenciais Postgres básicas
  if (
    !process.env.POSTGRES_USER ||
    !process.env.POSTGRES_PASSWORD ||
    !process.env.POSTGRES_DB
  ) {
    console.error('ERRO: Credenciais Postgres não encontradas no .env!');
    return;
  }

  try {
    // 1. Garantir que o AppDataSource (Postgres) está inicializado
    // Isso é crucial para que o CalculationService possa pegar os repositórios
    if (!AppDataSource.isInitialized) {
      console.log(
        '[Test Calculation Script] Inicializando AppDataSource (Postgres)...'
      );
      await AppDataSource.initialize();
      console.log(
        '[Test Calculation Script] AppDataSource (Postgres) INICIALIZADO.'
      );
    } else {
      console.log(
        '[Test Calculation Script] AppDataSource (Postgres) já estava inicializado.'
      );
    }

    // 2. Instanciar o CalculationService
    const calculationService = new CalculationService();

    // 3. Definir o período para o qual queremos calcular o ranking
    // Garanta que o EtlService já populou a performance_data para este período!
    const targetPeriodMesAno = '2025-04';
    console.log(
      `[Test Calculation Script] Solicitando cálculo do ranking para o período: ${targetPeriodMesAno}`
    );

    // 4. Chamar o método principal do serviço
    await calculationService.calculateAndSavePeriodRanking(targetPeriodMesAno);

    console.log(
      `\n--- Teste do CalculationService para ${targetPeriodMesAno} concluído. ---`
    );
    console.log(
      'Verifique os logs do CalculationService para detalhes do processamento.'
    );
    console.log(
      "Verifique as tabelas 'criterion_scores' e 'final_rankings' no banco de dados Postgres."
    );
  } catch (error: unknown) {
    let errorMessage = `--- ERRO GERAL NO TESTE DO CALCULATION SERVICE para---`;
    if (error instanceof Error) {
      errorMessage = `--- ERRO GERAL NO TESTE DO CALCULATION SERVICE para <span class="math-inline">\{targetPeriodMesAno\} \(</span>{error.name}): ${error.message} ---`;
    }
    console.error(errorMessage, error);
    if (error instanceof Error && error.stack) {
      console.error('Stack Trace:', error.stack);
    }
  } finally {
    // Garante que a conexão Postgres seja fechada
    if (AppDataSource && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Conexão Postgres (AppDataSource) finalizada.');
    }
    console.log('Processo de teste do CalculationService finalizado.');
  }
}

// Executa o teste
runCalculationServiceTest();
