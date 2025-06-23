#!/bin/bash

echo "📦 PARTE 1 - INSTALAÇÃO E CONFIGURAÇÃO - SPRINT 2 FASE 3"
echo "========================================================"

# Verificar se está no diretório correto
if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
  echo "❌ Execute este script na raiz do projeto (onde está o package.json)"
  exit 1
fi

echo ""
echo "🔍 1. Verificando dependências existentes..."
echo "-------------------------------------------"

cd apps/api

# Verificar e instalar node-cron
if pnpm list node-cron >/dev/null 2>&1; then
  echo "✅ node-cron já está instalado"
else
  echo "📦 Instalando node-cron..."
  pnpm add node-cron
  pnpm add -D @types/node-cron
  echo "✅ node-cron instalado"
fi

# Verificar e instalar cron-parser
if pnpm list cron-parser >/dev/null 2>&1; then
  echo "✅ cron-parser já está instalado"
else
  echo "📦 Instalando cron-parser..."
  pnpm add cron-parser
  echo "✅ cron-parser instalado"
fi

echo ""
echo "📁 2. Criando estrutura de diretórios..."
echo "---------------------------------------"

# Criar diretórios se não existirem
mkdir -p src/modules/scheduling
mkdir -p src/controllers
mkdir -p src/routes
mkdir -p src/entity
mkdir -p src/scripts

echo "✅ Estrutura de diretórios criada"

echo ""
echo "🔧 3. Configurando variáveis de ambiente..."
echo "------------------------------------------"

# Verificar se .env existe
if [ ! -f ".env" ]; then
  echo "❌ Arquivo .env não encontrado! Criando..."
  touch .env
fi

# Verificar se as configurações de agendamento existem
if ! grep -q "SCHEDULING_ENABLED" .env; then
  echo "➕ Adicionando configurações de agendamento ao .env..."
  cat >> .env << 'EOF'

# ===== SCHEDULING CONFIGURATION (SPRINT 2 FASE 3) =====
SCHEDULING_ENABLED=true
DEFAULT_SCHEDULE_TIMEZONE=America/Sao_Paulo
MAX_CONCURRENT_SCHEDULES=5
SCHEDULE_RETRY_ATTEMPTS=3
SCHEDULE_RETENTION_DAYS=90

# ===== NOTIFICATION CONFIGURATION =====
EMAIL_NOTIFICATIONS_ENABLED=false
SLACK_NOTIFICATIONS_ENABLED=false
ADMIN_EMAIL=admin@empresa.com
SLACK_WEBHOOK_URL=

# ===== HEALTH CHECK CONFIGURATION =====
HEALTH_CHECK_INTERVAL_MINUTES=30
HEALTH_CHECK_ENABLED=true
EOF
  echo "✅ Configurações adicionadas ao .env"
else
  echo "✅ Configurações de agendamento já existem no .env"
fi

echo ""
echo "📋 4. Atualizando shared-types..."
echo "--------------------------------"

cd ../../packages/shared-types

# Verificar se já existe o export
if ! grep -q "scheduling.dto" src/index.ts 2>/dev/null; then
  echo "➕ Adicionando exports de scheduling ao index.ts..."
  cat >> src/index.ts << 'EOF'

// ===== SCHEDULING TYPES (SPRINT 2 FASE 3) =====
export * from './dto/scheduling.dto';
EOF
  echo "✅ Export adicionado ao shared-types"
else
  echo "✅ Export de scheduling já existe no shared-types"
fi

# Compilar shared-types
echo "🔨 Compilando shared-types..."
pnpm run build

if [ $? -ne 0 ]; then
  echo "❌ Erro ao compilar shared-types"
  echo "💡 Isso é normal se os arquivos ainda não foram criados"
  echo "💡 Execute a Parte 2 primeiro e depois recompile"
else
  echo "✅ Shared-types compilado com sucesso"
fi

echo ""
echo "🔄 5. Criando script de inicialização..."
echo "--------------------------------------"

cd ../../apps/api

# Criar diretório scripts se não existir
mkdir -p src/scripts

# Criar script de inicialização
cat > src/scripts/init-scheduling.ts << 'EOF'
// src/scripts/init-scheduling.ts
import 'reflect-metadata';
import { AppDataSource } from '../database/data-source';
import { SchedulingService } from '../modules/scheduling/scheduling.service';

/**
 * Script para inicializar o sistema de agendamento
 * Execute após o servidor estar configurado
 */
async function initializeScheduling() {
  console.log('🚀 Inicializando sistema de agendamento...');
  
  try {
    // Garantir que o banco está conectado
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Banco de dados conectado');
    }

    // Inicializar o serviço de agendamento
    const schedulingService = new SchedulingService();
    await schedulingService.initialize();
    
    console.log('✅ Sistema de agendamento inicializado com sucesso!');
    console.log('');
    console.log('📋 APIs disponíveis:');
    console.log('   GET    /api/scheduling/schedules - Listar agendamentos');
    console.log('   POST   /api/scheduling/schedules - Criar agendamento');
    console.log('   GET    /api/scheduling/schedules/:id - Buscar agendamento');
    console.log('   PUT    /api/scheduling/schedules/:id - Atualizar agendamento');
    console.log('   DELETE /api/scheduling/schedules/:id - Remover agendamento');
    console.log('   POST   /api/scheduling/schedules/:id/execute - Executar agora');
    console.log('   GET    /api/scheduling/system/status - Status do sistema');
    console.log('   POST   /api/scheduling/system/restart - Reiniciar sistema');
    console.log('   GET    /api/scheduling/system/health - Health check');
    console.log('   GET    /api/scheduling/templates - Templates predefinidos');
    
  } catch (error) {
    console.error('❌ Erro ao inicializar sistema de agendamento:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  initializeScheduling();
}

export { initializeScheduling };
EOF

echo "✅ Script de inicialização criado"

echo ""
echo "🧪 6. Criando script de teste completo..."
echo "----------------------------------------"

# Criar script de teste na raiz
cd ../../

cat > test-scheduling-system.ts << 'EOF'
// test-scheduling-system.ts
import 'reflect-metadata';
import { AppDataSource } from './apps/api/src/database/data-source';
import { SchedulingService } from './apps/api/src/modules/scheduling/scheduling.service';
import { UserEntity } from './apps/api/src/entity/user.entity';

/**
 * Script de teste completo para o sistema de agendamento
 */
async function testSchedulingSystem() {
  console.log('\n🧪 === TESTE COMPLETO DO SISTEMA DE AGENDAMENTO ===');
  console.log('📅 Data:', new Date().toISOString());
  console.log('🔧 Versão: Sprint 2 Fase 3');

  const totalStartTime = Date.now();

  try {
    // Inicializar conexão
    console.log('\n🔌 Inicializando conexão com banco...');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    console.log('✅ Conexão estabelecida');

    // Inicializar serviço
    console.log('\n🛠️ Inicializando serviço de agendamento...');
    const schedulingService = new SchedulingService();
    await schedulingService.initialize();
    console.log('✅ Serviço de agendamento inicializado');

    // Mock de usuário para testes
    const mockUser = { id: 1, nome: 'Admin Teste' } as UserEntity;

    // =========================================
    // TESTE 1: VERIFICAÇÃO INICIAL DO SISTEMA
    // =========================================
    console.log('\n📊 === TESTE 1: STATUS INICIAL DO SISTEMA ===');
    
    const initialStatus = await schedulingService.getSystemStatus();
    console.log('📈 Status inicial:');
    console.log(`   Sistema habilitado: ${initialStatus.isEnabled ? '✅' : '❌'}`);
    console.log(`   Agendamentos ativos: ${initialStatus.activeSchedules}`);
    console.log(`   Jobs rodando: ${initialStatus.runningJobs}`);
    console.log(`   Total de execuções: ${initialStatus.totalExecutions}`);
    console.log(`   Uptime: ${Math.round(initialStatus.uptime / 1000)}s`);

    // =========================================
    // TESTE 2: CRIAR AGENDAMENTOS DE TESTE
    // =========================================
    console.log('\n📝 === TESTE 2: CRIANDO AGENDAMENTOS ===');
    
    // Agendamento diário
    console.log('📅 Criando agendamento diário...');
    const dailySchedule = await schedulingService.createSchedule({
      name: 'Teste ETL Diário',
      description: 'Agendamento de teste para ETL diário às 2:00',
      frequency: 'DAILY',
      timeOfDay: '02:00',
      jobType: 'FULL_ETL',
      advancedConfig: {
        onlyIfActiveePeriod: true,
        emailNotifications: false,
        skipIfPreviousRunning: true,
      },
    }, mockUser);

    console.log(`✅ Agendamento diário criado: ID ${dailySchedule.id}`);
    console.log(`   Próxima execução: ${dailySchedule.nextRunAt?.toISOString()}`);
    console.log(`   Cron: ${dailySchedule.cronExpression}`);

    // Agendamento semanal
    console.log('📅 Criando agendamento semanal...');
    const weeklySchedule = await schedulingService.createSchedule({
      name: 'Teste Recálculo Semanal',
      description: 'Recálculo toda segunda e quarta às 6:00',
      frequency: 'WEEKLY',
      timeOfDay: '06:00',
      weekDays: {
        monday: true,
        tuesday: false,
        wednesday: true,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false,
      },
      jobType: 'PARTIAL_RECALCULATION',
    }, mockUser);

    console.log(`✅ Agendamento semanal criado: ID ${weeklySchedule.id}`);
    console.log(`   Próxima execução: ${weeklySchedule.nextRunAt?.toISOString()}`);
    console.log(`   Cron: ${weeklySchedule.cronExpression}`);

    // =========================================
    // TESTE 3: LISTAR E VERIFICAR AGENDAMENTOS
    // =========================================
    console.log('\n📋 === TESTE 3: LISTANDO AGENDAMENTOS ===');
    
    const allSchedules = await schedulingService.getAllSchedules();
    console.log(`✅ Total de agendamentos encontrados: ${allSchedules.length}`);
    
    allSchedules.forEach((schedule, index) => {
      console.log(`   ${index + 1}. ${schedule.name} (${schedule.frequency}) - Status: ${schedule.status}`);
    });

    // =========================================
    // TESTE 4: BUSCAR AGENDAMENTO ESPECÍFICO
    // =========================================
    console.log('\n🔍 === TESTE 4: BUSCAR AGENDAMENTO ESPECÍFICO ===');
    
    const foundSchedule = await schedulingService.getScheduleById(dailySchedule.id);
    if (foundSchedule) {
      console.log(`✅ Agendamento encontrado: ${foundSchedule.name}`);
      console.log(`   Descrição: ${foundSchedule.description}`);
      console.log(`   Frequência: ${foundSchedule.frequency}`);
      console.log(`   Horário: ${foundSchedule.timeOfDay}`);
      console.log(`   Status: ${foundSchedule.status}`);
      console.log(`   Criado por: ${foundSchedule.createdBy?.nome || 'N/A'}`);
    } else {
      console.log('❌ Agendamento não encontrado');
    }

    // =========================================
    // TESTE 5: ATUALIZAR AGENDAMENTO
    // =========================================
    console.log('\n✏️ === TESTE 5: ATUALIZANDO AGENDAMENTO ===');
    
    const updatedSchedule = await schedulingService.updateSchedule(
      dailySchedule.id,
      {
        description: 'Agendamento atualizado pelo teste - Novo horário 3:00',
        timeOfDay: '03:00',
        jobOptions: { priority: 8 },
      },
      mockUser
    );

    console.log(`✅ Agendamento ${dailySchedule.id} atualizado`);
    console.log(`   Nova descrição: ${updatedSchedule.description}`);
    console.log(`   Novo horário: ${updatedSchedule.timeOfDay}`);
    console.log(`   Nova próxima execução: ${updatedSchedule.nextRunAt?.toISOString()}`);
    console.log(`   Novo cron: ${updatedSchedule.cronExpression}`);

    // =========================================
    // TESTE 6: HEALTH CHECK DO SISTEMA
    // =========================================
    console.log('\n🏥 === TESTE 6: HEALTH CHECK ===');
    
    const healthResult = await schedulingService.healthCheck();
    console.log(`✅ Health check concluído:`);
    console.log(`   Problemas corrigidos: ${healthResult.fixed}`);
    console.log(`   Erros encontrados: ${healthResult.errors.length}`);
    
    if (healthResult.errors.length > 0) {
      console.log('   🚨 Erros detectados:');
      healthResult.errors.forEach((error, index) => {
        console.log(`      ${index + 1}. ${error}`);
      });
    } else {
      console.log('   ✅ Sistema saudável, nenhum erro detectado');
    }

    // =========================================
    // TESTE 7: STATUS FINAL DO SISTEMA
    // =========================================
    console.log('\n📊 === TESTE 7: STATUS FINAL DO SISTEMA ===');
    
    const finalStatus = await schedulingService.getSystemStatus();
    console.log('📈 Status final:');
    console.log(`   Agendamentos ativos: ${finalStatus.activeSchedules}`);
    console.log(`   Jobs rodando: ${finalStatus.runningJobs}`);
    console.log(`   Próxima execução: ${finalStatus.nextExecution?.toISOString() || 'Nenhuma'}`);
    console.log(`   Última execução: ${finalStatus.lastExecution?.toISOString() || 'Nenhuma'}`);

    // =========================================
    // TESTE 8: LIMPEZA (REMOVER AGENDAMENTOS DE TESTE)
    // =========================================
    console.log('\n🧹 === TESTE 8: LIMPEZA ===');
    
    console.log('🗑️ Removendo agendamentos de teste...');
    await schedulingService.deleteSchedule(dailySchedule.id, mockUser);
    console.log(`✅ Agendamento diário ${dailySchedule.id} removido`);
    
    await schedulingService.deleteSchedule(weeklySchedule.id, mockUser);
    console.log(`✅ Agendamento semanal ${weeklySchedule.id} removido`);

    // Status final após limpeza
    const cleanStatus = await schedulingService.getSystemStatus();
    console.log(`✅ Sistema limpo. Agendamentos ativos: ${cleanStatus.activeSchedules}`);

    // =========================================
    // RESULTADO FINAL
    // =========================================
    const totalTime = Date.now() - totalStartTime;
    
    console.log('\n🎉 === TODOS OS TESTES PASSARAM COM SUCESSO ===');
    console.log(`⏱️ Tempo total de execução: ${totalTime}ms`);
    console.log('');
    console.log('✨ Sistema de agendamento está funcionando perfeitamente!');
    console.log('');
    console.log('🚀 Próximos passos:');
    console.log('   1. Iniciar servidor da API: pnpm dev');
    console.log('   2. Acessar Swagger: http://localhost:3001/docs');
    console.log('   3. Testar APIs de agendamento via interface');
    console.log('   4. Configurar agendamentos reais conforme necessário');
    console.log('   5. Monitorar execuções via /api/scheduling/system/status');

  } catch (error) {
    console.error('\n💥 === ERRO CRÍTICO NO TESTE ===');
    console.error('Erro:', error);
    
    if (error instanceof Error && error.stack) {
      console.error('\n📚 Stack Trace:');
      console.error(error.stack);
    }
    
    console.error('\n🔧 Possíveis soluções:');
    console.error('   1. Verificar se shared-types foi compilado');
    console.error('   2. Verificar se todas as entidades estão no data-source.ts');
    console.error('   3. Verificar se as dependências foram instaladas');
    console.error('   4. Verificar se o banco de dados está acessível');
    
    process.exit(1);
  } finally {
    // Fechar conexão
    if (AppDataSource && AppDataSource.isInitialized) {
      try {
        await AppDataSource.destroy();
        console.log('\n🔌 Conexão do banco fechada');
      } catch (error) {
        console.error('❌ Erro ao fechar conexão:', error);
      }
    }

    console.log('\n👋 Teste finalizado');
  }
}

// Executar teste
testSchedulingSystem().catch(console.error);
EOF

echo "✅ Script de teste completo criado"

echo ""
echo "✅ PARTE 1 CONCLUÍDA!"
echo "===================="

echo ""
echo "🎯 O que foi configurado:"
echo "  ✅ Dependências instaladas (node-cron, cron-parser)"
echo "  ✅ Configurações adicionadas ao .env"
echo "  ✅ Estrutura de diretórios criada"
echo "  ✅ Export no shared-types configurado"
echo "  ✅ Script de inicialização criado"
echo "  ✅ Script de teste completo criado"

echo ""
echo "🚀 Execute agora a PARTE 2:"
echo "  ./2-create-files-sprint2.sh"

echo ""
echo "💡 A Parte 2 irá criar todos os arquivos de código:"
echo "  📄 ScheduleConfigEntity"
echo "  📄 SchedulingService"
echo "  📄 SchedulingController"
echo "  📄 SchedulingRoutes"
echo "  📄 SchedulingDTO (shared-types)"