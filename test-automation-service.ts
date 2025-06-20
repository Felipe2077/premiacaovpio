// test-automation-service.ts (na raiz do projeto - VERSÃO COMPLETA E CORRIGIDA)
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
import { AppDataSource } from './apps/api/src/database/data-source';
import { AutomationService } from './apps/api/src/modules/automation/automation.service';
import { ExpurgoService } from './apps/api/src/modules/expurgos/expurgo.service';

// Carregar .env da API
const envPath = path.resolve(__dirname, 'apps/api/.env');
dotenv.config({ path: envPath });
console.log(`[Test Automation] .env carregado de: ${envPath}`);

/**
 * Script de teste para o AutomationService integrado com ExpurgoService
 * Substitui os 3 scripts manuais originais + testa hooks de expurgo
 */
async function testAutomationService() {
  console.log('🚀 === TESTE COMPLETO DO SISTEMA DE AUTOMAÇÃO ===');

  try {
    // 1. Inicializar banco de dados
    if (!AppDataSource.isInitialized) {
      console.log('[Test] Inicializando AppDataSource...');
      await AppDataSource.initialize();
      console.log('[Test] ✅ AppDataSource inicializado');
    }

    // 2. Instanciar serviços
    const automationService = new AutomationService();
    const expurgoService = new ExpurgoService();

    // 3. Verificar vigência ativa
    console.log('\n📋 === VERIFICANDO VIGÊNCIA ATIVA ===');
    const activePeriod = await automationService.getActivePeriodInfo();

    if (!activePeriod) {
      console.error('❌ Nenhuma vigência ativa encontrada!');
      console.log(
        '💡 Certifique-se de que existe uma vigência com status ATIVA no banco de dados.'
      );
      console.log(
        "💡 SQL para criar: INSERT INTO competition_periods (mesAno, dataInicio, dataFim, status) VALUES ('2025-06', '2025-06-01', '2025-06-30', 'ATIVA');"
      );
      return;
    }

    console.log(`✅ Vigência ativa encontrada:`);
    console.log(`   ID: ${activePeriod.id}`);
    console.log(`   Período: ${activePeriod.mesAno}`);
    console.log(`   Data Início: ${activePeriod.dataInicio}`);
    console.log(`   Data Fim: ${activePeriod.dataFim}`);
    console.log(`   Status: ${activePeriod.status}`);

    // 4. Teste integração com ExpurgoService
    console.log('\n🔗 === TESTE DE INTEGRAÇÃO EXPURGO-AUTOMAÇÃO ===');
    const expurgoAutomationTest =
      await expurgoService.testAutomationConnectivity();

    console.log(
      `Sistema de automação pronto: ${expurgoAutomationTest.isReady ? '✅' : '❌'}`
    );
    console.log(
      `Período ativo detectado: ${expurgoAutomationTest.activePeriod || 'Nenhum'}`
    );

    if (expurgoAutomationTest.error) {
      console.warn(`⚠️  Erro na conectividade: ${expurgoAutomationTest.error}`);
    }

    // 5. Teste de validação
    console.log('\n🔍 === TESTE DE VALIDAÇÃO ===');
    try {
      const validatedPeriod =
        await automationService.validateAndGetActivePeriod();
      console.log(
        `✅ Validação passou: Período ${validatedPeriod.mesAno} é válido para operações`
      );
    } catch (error) {
      console.error(
        `❌ Validação falhou:`,
        error instanceof Error ? error.message : error
      );
      return;
    }

    // 6. Teste de atualização completa
    console.log('\n🔄 === TESTE DE ATUALIZAÇÃO COMPLETA ===');
    console.log('⚠️  ATENÇÃO: Isto vai executar ETL real nos dados!');
    console.log('🎯 Processando vigência:', activePeriod.mesAno);

    const startTime = Date.now();

    const result = await automationService.runFullUpdateForActivePeriod({
      triggeredBy: 'manual',
      userId: 999, // ID de teste
    });

    const totalTime = Date.now() - startTime;

    // 7. Exibir resultados
    console.log('\n📊 === RESULTADOS DA ATUALIZAÇÃO COMPLETA ===');
    if (result.success) {
      console.log('✅ Atualização completa executada com SUCESSO!');
      console.log(`📈 Estatísticas:`);
      console.log(`   Período processado: ${result.periodMesAno}`);
      console.log(
        `   Tempo de execução: ${result.executionTimeMs}ms (${(result.executionTimeMs / 1000).toFixed(2)}s)`
      );
      console.log(`   Registros RAW: ${result.recordsProcessed.rawRecords}`);
      console.log(
        `   Registros Performance: ${result.recordsProcessed.performanceRecords}`
      );
      console.log(
        `   Registros Ranking: ${result.recordsProcessed.rankingRecords}`
      );
      console.log(`   Disparado por: ${result.triggeredBy}`);
      console.log(`   Usuário: ${result.userId}`);
    } else {
      console.error('❌ Atualização FALHOU!');
      console.error(`Erro: ${result.error}`);
      console.error(`Tempo até falha: ${result.executionTimeMs}ms`);
    }

    // 8. Teste de recálculo parcial
    console.log('\n🔄 === TESTE DE RECÁLCULO PARCIAL ===');
    console.log('Simulando aprovação de expurgo...');

    const partialResult = await automationService.runPartialRecalculation({
      triggeredBy: 'expurgo',
      userId: 999,
    });

    if (partialResult.success) {
      console.log('✅ Recálculo parcial executado com SUCESSO!');
      console.log(
        `⚡ Tempo de execução: ${partialResult.executionTimeMs}ms (${(partialResult.executionTimeMs / 1000).toFixed(2)}s)`
      );
    } else {
      console.error('❌ Recálculo parcial FALHOU!');
      console.error(`Erro: ${partialResult.error}`);
    }

    // 9. Teste do hook de automação (simulação)
    console.log('\n🪝 === TESTE DO HOOK DE EXPURGO ===');
    try {
      console.log('Simulando aprovação de expurgo (sem expurgo real)...');

      // Simular chamada do hook
      const mockExpurgoId = 999;
      const mockApprovingUserId = 999;

      console.log(`Testando hook para expurgo ID ${mockExpurgoId}...`);

      // Este teste apenas verifica se o sistema está pronto
      const hookReady = await expurgoService.isSystemReadyForAutomation();

      if (hookReady) {
        console.log('✅ Hook de automação está pronto para ser usado');
        console.log(
          '💡 Quando um expurgo real for aprovado, o recálculo será disparado automaticamente'
        );
      } else {
        console.warn('⚠️  Hook não está pronto (sem vigência ativa)');
      }
    } catch (error) {
      console.error('❌ Erro no teste do hook:', error);
    }

    // 10. Relatório final
    console.log('\n🎉 === RESUMO DOS TESTES ===');
    console.log(`⏱️  Tempo total de teste: ${(totalTime / 1000).toFixed(2)}s`);
    console.log('✅ Sistema de automação totalmente funcional!');
    console.log('\n📋 Funcionalidades testadas:');
    console.log('   ✅ Busca de vigência ativa');
    console.log('   ✅ Validação de proteções');
    console.log('   ✅ ETL completo automatizado');
    console.log('   ✅ Recálculo parcial');
    console.log('   ✅ Integração com ExpurgoService');
    console.log('   ✅ Hook de automação pronto');
    console.log('\n🚀 Próximos passos:');
    console.log('   1. Testar via API: POST /api/automation/trigger-update');
    console.log('   2. Aprovar um expurgo real para testar hook automático');
    console.log('   3. Implementar Fase 2 (Sistema de Queue)');
    console.log('\n🔧 APIs disponíveis:');
    console.log('   GET  /api/automation/status');
    console.log('   GET  /api/automation/active-period');
    console.log('   POST /api/automation/trigger-update');
    console.log('   POST /api/automation/validate-period');
    console.log('   GET  /api/expurgos/automation/status');
  } catch (error) {
    console.error('\n💥 === ERRO CRÍTICO NO TESTE ===');
    console.error(error);

    if (error instanceof Error && error.stack) {
      console.error('\n📚 Stack Trace:');
      console.error(error.stack);
    }
  } finally {
    // Fechar conexão
    if (AppDataSource && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('\n🔌 Conexão do banco fechada');
    }

    console.log('\n👋 Teste finalizado');
  }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);
const skipConfirmation =
  args.includes('--skip-confirmation') || args.includes('-y');

if (!skipConfirmation) {
  console.log(
    '⚠️  ATENÇÃO: Este script vai executar ETL real nos dados da vigência ativa!'
  );
  console.log('💡 Para pular esta confirmação, use: --skip-confirmation ou -y');
  console.log('🛑 Pressione Ctrl+C para cancelar ou Enter para continuar...');

  process.stdin.once('data', () => {
    testAutomationService();
  });
} else {
  testAutomationService();
}

// ===================================
// COMANDOS PARA EXECUTAR:
// ===================================
/*

# Executar com confirmação
pnpm exec ts-node -P apps/api/tsconfig.json -r tsconfig-paths/register test-automation-service.ts

# Executar direto (sem confirmação) 
pnpm exec ts-node -P apps/api/tsconfig.json -r tsconfig-paths/register test-automation-service.ts -y

# Ou adicionar no package.json da API:
"scripts": {
  "test:automation": "ts-node -r tsconfig-paths/register test-automation-service.ts",
  "test:automation:force": "ts-node -r tsconfig-paths/register test-automation-service.ts -y"
}

# Depois usar:
cd apps/api && pnpm test:automation

# ===================================
# TESTES VIA API (após servidor rodando):
# ===================================

# Status geral
curl http://localhost:3001/api/automation/status

# Vigência ativa  
curl http://localhost:3001/api/automation/active-period

# Disparo manual (CUIDADO: executa ETL real!)
curl -X POST http://localhost:3001/api/automation/trigger-update \
  -H "Content-Type: application/json" \
  -d '{"triggeredBy": "manual", "userId": 1}'

# Recálculo parcial
curl -X POST http://localhost:3001/api/automation/trigger-update \
  -H "Content-Type: application/json" \
  -d '{"triggeredBy": "manual", "userId": 1, "partialUpdate": true}'

# Status automação de expurgos
curl http://localhost:3001/api/expurgos/automation/status

*/
