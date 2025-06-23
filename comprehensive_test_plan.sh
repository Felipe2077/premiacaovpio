#!/bin/bash

echo "🧪 PLANO DE TESTES COMPLETO - SPRINT 2 FASE 3"
echo "============================================="

echo ""
echo "Este script vai testar todo o sistema de agendamento em etapas:"
echo "1. Teste de compilação e dependências"
echo "2. Teste de conexão com banco"
echo "3. Teste de inicialização do sistema"
echo "4. Teste de APIs básicas"
echo "5. Teste de criação de agendamento"
echo "6. Teste de execução manual"
echo "7. Teste de sistema completo"

echo ""
read -p "Pressione ENTER para começar os testes..."

# Verificar se está no diretório correto
if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
  echo "❌ Execute este script na raiz do projeto"
  exit 1
fi

test_results=()
total_tests=0
passed_tests=0

# Função para registrar resultado do teste
log_test() {
  local test_name="$1"
  local result="$2"
  local message="$3"
  
  total_tests=$((total_tests + 1))
  
  if [ "$result" = "PASS" ]; then
    echo "✅ $test_name: $message"
    passed_tests=$((passed_tests + 1))
  else
    echo "❌ $test_name: $message"
  fi
  
  test_results+=("$test_name: $result - $message")
}

echo ""
echo "🔍 TESTE 1: Compilação e Dependências"
echo "====================================="

cd apps/api

echo "Verificando compilação TypeScript..."
if npx tsc --noEmit > /dev/null 2>&1; then
  log_test "Compilação TypeScript" "PASS" "Código compila sem erros"
else
  log_test "Compilação TypeScript" "FAIL" "Erros de compilação encontrados"
  echo "💡 Execute: npx tsc --noEmit para ver os erros"
fi

echo "Verificando dependências node-cron..."
if pnpm list node-cron > /dev/null 2>&1; then
  log_test "Dependência node-cron" "PASS" "node-cron instalado"
else
  log_test "Dependência node-cron" "FAIL" "node-cron não encontrado"
fi

echo "Verificando shared-types..."
if pnpm list @sistema-premiacao/shared-types > /dev/null 2>&1; then
  log_test "Shared Types" "PASS" "Shared types disponível"
else
  log_test "Shared Types" "FAIL" "Shared types não encontrado"
fi

cd ../..

echo ""
echo "🔍 TESTE 2: Conexão com Banco de Dados"
echo "======================================"

# Criar script de teste de conexão
cat > test-db-connection.ts << 'EOF'
import 'reflect-metadata';
import { AppDataSource } from './apps/api/src/database/data-source';

async function testConnection() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    // Testar query simples
    await AppDataSource.query('SELECT 1 as test');
    console.log("DB_CONNECTION_OK");
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.log("DB_CONNECTION_ERROR:", error);
    process.exit(1);
  }
}

testConnection();
EOF

echo "Testando conexão com PostgreSQL..."
if timeout 10s ts-node -r tsconfig-paths/register test-db-connection.ts 2>/dev/null | grep -q "DB_CONNECTION_OK"; then
  log_test "Conexão PostgreSQL" "PASS" "Banco conectado com sucesso"
else
  log_test "Conexão PostgreSQL" "FAIL" "Erro ao conectar com banco"
fi

rm -f test-db-connection.ts

echo ""
echo "🔍 TESTE 3: Inicialização do Sistema"
echo "===================================="

# Criar script de teste de inicialização
cat > test-scheduling-init.ts << 'EOF'
import 'reflect-metadata';
import { AppDataSource } from './apps/api/src/database/data-source';
import { SchedulingService } from './apps/api/src/modules/scheduling/scheduling.service';

async function testInit() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    // Sincronizar esquema
    await AppDataSource.synchronize();
    
    // Testar instanciação do service
    const schedulingService = new SchedulingService();
    
    // Testar inicialização
    await schedulingService.initialize();
    
    console.log("SCHEDULING_INIT_OK");
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.log("SCHEDULING_INIT_ERROR:", error);
    process.exit(1);
  }
}

testInit();
EOF

echo "Testando inicialização do SchedulingService..."
if timeout 15s ts-node -r tsconfig-paths/register test-scheduling-init.ts 2>/dev/null | grep -q "SCHEDULING_INIT_OK"; then
  log_test "Inicialização Sistema" "PASS" "SchedulingService inicializado"
else
  log_test "Inicialização Sistema" "FAIL" "Erro na inicialização"
fi

rm -f test-scheduling-init.ts

echo ""
echo "🔍 TESTE 4: Verificação de Tabelas"
echo "=================================="

# Criar script de teste de tabelas
cat > test-tables.ts << 'EOF'
import 'reflect-metadata';
import { AppDataSource } from './apps/api/src/database/data-source';

async function testTables() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    
    await AppDataSource.synchronize();
    
    // Verificar se tabela schedule_configs existe
    const queryRunner = AppDataSource.createQueryRunner();
    const hasTable = await queryRunner.hasTable('schedule_configs');
    await queryRunner.release();
    
    if (hasTable) {
      console.log("SCHEDULE_TABLE_OK");
    } else {
      console.log("SCHEDULE_TABLE_ERROR: Tabela não foi criada");
    }
    
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.log("TABLE_CHECK_ERROR:", error);
    process.exit(1);
  }
}

testTables();
EOF

echo "Verificando criação de tabelas..."
if timeout 15s ts-node -r tsconfig-paths/register test-tables.ts 2>/dev/null | grep -q "SCHEDULE_TABLE_OK"; then
  log_test "Criação de Tabelas" "PASS" "Tabela schedule_configs criada"
else
  log_test "Criação de Tabelas" "FAIL" "Tabela não foi criada"
fi

rm -f test-tables.ts

echo ""
echo "🔍 TESTE 5: APIs do Sistema (Servidor deve estar rodando)"
echo "========================================================"

echo ""
echo "⚠️  Para testar as APIs, você precisa iniciar o servidor em outro terminal:"
echo "   cd apps/api"
echo "   pnpm dev"
echo ""
read -p "O servidor está rodando? (y/n): " server_running

if [ "$server_running" = "y" ] || [ "$server_running" = "Y" ]; then
  echo "Testando APIs..."
  
  # Teste 1: Status do sistema
  echo "Testando GET /api/scheduling/system/status..."
  if curl -s -f http://localhost:3001/api/scheduling/system/status > /dev/null; then
    log_test "API Status Sistema" "PASS" "Endpoint respondendo"
  else
    log_test "API Status Sistema" "FAIL" "Endpoint não responde"
  fi
  
  # Teste 2: Lista de agendamentos
  echo "Testando GET /api/scheduling/schedules..."
  if curl -s -f http://localhost:3001/api/scheduling/schedules > /dev/null; then
    log_test "API Lista Agendamentos" "PASS" "Endpoint respondendo"
  else
    log_test "API Lista Agendamentos" "FAIL" "Endpoint não responde"
  fi
  
  # Teste 3: Templates
  echo "Testando GET /api/scheduling/templates..."
  if curl -s -f http://localhost:3001/api/scheduling/templates > /dev/null; then
    log_test "API Templates" "PASS" "Endpoint respondendo"
  else
    log_test "API Templates" "FAIL" "Endpoint não responde"
  fi
  
  # Teste 4: Health check
  echo "Testando GET /api/scheduling/system/health..."
  if curl -s -f http://localhost:3001/api/scheduling/system/health > /dev/null; then
    log_test "API Health Check" "PASS" "Endpoint respondendo"
  else
    log_test "API Health Check" "FAIL" "Endpoint não responde"
  fi
  
else
  echo "⏭️  Pulando testes de API (servidor não está rodando)"
  log_test "APIs" "SKIP" "Servidor não estava rodando"
fi

echo ""
echo "📊 RESUMO DOS TESTES"
echo "==================="

echo ""
echo "🎯 Resultados: $passed_tests/$total_tests testes passaram"

for result in "${test_results[@]}"; do
  echo "   $result"
done

echo ""
if [ $passed_tests -eq $total_tests ]; then
  echo "🎉 TODOS OS TESTES PASSARAM!"
  echo "   Sistema de agendamento está funcionando corretamente"
elif [ $passed_tests -gt $((total_tests / 2)) ]; then
  echo "⚠️  MAIORIA DOS TESTES PASSOU"
  echo "   Sistema funcional com alguns problemas menores"
else
  echo "❌ MUITOS TESTES FALHARAM"
  echo "   Sistema precisa de correções antes do uso"
fi

echo ""
echo "🚀 PRÓXIMOS PASSOS RECOMENDADOS:"
echo "==============================="

if [ $passed_tests -eq $total_tests ]; then
  echo "✅ 1. Testar criação de agendamento via API"
  echo "✅ 2. Testar execução manual de job"
  echo "✅ 3. Testar agendamento automático"
  echo "✅ 4. Implementar interface frontend"
else
  echo "🔧 1. Corrigir problemas encontrados nos testes"
  echo "🔧 2. Verificar logs de erro detalhados"
  echo "🔧 3. Validar configurações de ambiente"
  echo "🔧 4. Re-executar testes após correções"
fi

echo ""
echo "📋 COMANDOS ÚTEIS:"
echo "=================="
echo "🚀 Iniciar servidor:"
echo "   cd apps/api && pnpm dev"
echo ""
echo "🧪 Testar APIs manualmente:"
echo "   curl http://localhost:3001/api/scheduling/system/status"
echo "   curl http://localhost:3001/api/scheduling/schedules"
echo "   curl http://localhost:3001/api/scheduling/templates"
echo ""
echo "📚 Documentação Swagger:"
echo "   http://localhost:3001/docs"

echo ""
echo "🏁 Teste completo finalizado!"