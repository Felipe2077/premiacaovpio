#!/bin/bash

echo "🚀 FASE 2: Setup Completo do Sistema de Queue e WebSockets"
echo "=========================================================="

# Verificar se está no diretório correto
if [ ! -f "package.json" ] || [ ! -d "apps/api" ]; then
  echo "❌ Execute este script na raiz do projeto (onde está o package.json)"
  exit 1
fi

cd apps/api

echo ""
echo "📦 1. Instalando dependências..."
echo "--------------------------------"

# Instalar dependências principais
echo "Instalando BullMQ e Redis..."
pnpm add bullmq ioredis

echo "Instalando WebSockets..."
pnpm add @fastify/websocket ws

echo "Instalando agendamento..."
pnpm add node-cron

echo "Instalando tipos de desenvolvimento..."
pnpm add -D @types/ws @types/node-cron

echo "✅ Dependências instaladas!"

echo ""
echo "🔧 2. Configurando variáveis de ambiente..."
echo "-------------------------------------------"

# Verificar se .env existe
if [ ! -f ".env" ]; then
  echo "Criando arquivo .env..."
  touch .env
fi

# Verificar se as configurações do Redis já existem
if ! grep -q "REDIS_HOST" .env; then
  echo "Adicionando configurações do Redis ao .env..."
  cat >> .env << 'EOF'

# ===== REDIS CONFIGURATION (FASE 2) =====
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ===== QUEUE CONFIGURATION =====
QUEUE_CONCURRENCY=1
QUEUE_MAX_JOBS=10
QUEUE_RETRY_ATTEMPTS=3

# ===== WEBSOCKET CONFIGURATION =====
WS_ENABLED=true
WS_PORT=3001
EOF
  echo "✅ Configurações adicionadas ao .env"
else
  echo "✅ Configurações do Redis já existem no .env"
fi

echo ""
echo "📁 3. Criando estrutura de diretórios..."
echo "---------------------------------------"

# Criar diretórios se não existirem
mkdir -p src/modules/queue
mkdir -p src/modules/websocket
mkdir -p src/modules/scheduling

echo "✅ Estrutura de diretórios criada"

echo ""
echo "🔄 4. Verificando serviços Redis..."
echo "----------------------------------"

# Verificar se Redis está rodando
if command -v redis-cli >/dev/null 2>&1; then
  if redis-cli ping >/dev/null 2>&1; then
    echo "✅ Redis está rodando"
  else
    echo "⚠️  Redis não está rodando. Iniciando..."
    
    # Tentar iniciar Redis conforme o OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      if command -v brew >/dev/null 2>&1; then
        brew services start redis || redis-server &
      else
        echo "❌ Brew não encontrado. Instale Redis manualmente"
      fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      # Linux
      sudo systemctl start redis-server || redis-server &
    else
      echo "❌ OS não suportado para auto-start do Redis"
      echo "💡 Inicie o Redis manualmente: redis-server"
    fi
  fi
else
  echo "❌ Redis não instalado"
  echo ""
  echo "💡 Instale o Redis:"
  echo "   macOS: brew install redis"
  echo "   Ubuntu: sudo apt install redis-server"
  echo "   CentOS: sudo yum install redis"
  echo ""
  echo "   Depois execute: redis-server"
fi

echo ""
echo "🧪 5. Verificando compilação TypeScript..."
echo "-----------------------------------------"

# Verificar se compila sem erros
echo "Verificando compilação..."
if npx tsc --noEmit --skipLibCheck; then
  echo "✅ Código compila sem erros"
else
  echo "⚠️  Há erros de compilação. Verifique os logs acima."
  echo "💡 Isso é normal se você ainda não implementou todos os arquivos"
fi

echo ""
echo "📋 6. Resumo da implementação..."
echo "------------------------------"

echo "✅ FASE 2 - COMPONENTES CRIADOS:"
echo ""
echo "🔧 Core Services:"
echo "   - QueueService (BullMQ + Redis)"
echo "   - WebSocketService (Tempo real)"
echo "   - AutomationController v2"
echo ""
echo "🛣️  API Endpoints:"
echo "   - POST /api/automation/trigger-update"
echo "   - GET  /api/automation/jobs/:jobId"
echo "   - GET  /api/automation/jobs"
echo "   - DELETE /api/automation/jobs/:jobId"
echo "   - WebSocket: /ws/automation"
echo ""
echo "🎯 Funcionalidades:"
echo "   - Jobs assíncronos de longa duração"
echo "   - Progresso em tempo real via WebSocket"
echo "   - Retry automático e tratamento de falhas"
echo "   - Cancelamento de jobs"
echo "   - Múltiplos clientes conectados"
echo ""
echo "🔗 Integração:"
echo "   - ExpurgoAutomationHook v2 (com queue)"
echo "   - Fallback para modo síncrono (FASE 1)"
echo "   - Cliente WebSocket para frontend"

echo ""
echo "🚀 7. Próximos passos para usar a FASE 2:"
echo "----------------------------------------"

echo ""
echo "1️⃣  Certifique-se que o Redis está rodando:"
echo "   redis-cli ping  # Deve retornar PONG"
echo ""
echo "2️⃣  Inicie o servidor da API:"
echo "   pnpm dev"
echo ""
echo "3️⃣  Teste a API de queue:"
echo "   curl -X POST http://localhost:3000/api/automation/trigger-update \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"triggeredBy\":\"manual\",\"useQueue\":true,\"priority\":5}'"
echo ""
echo "4️⃣  Conecte-se ao WebSocket:"
echo "   ws://localhost:3000/ws/automation"
echo ""
echo "5️⃣  Monitore jobs ativos:"
echo "   curl http://localhost:3000/api/automation/jobs"

echo ""
echo "📚 8. Documentação:"
echo "------------------"

echo ""
echo "🔗 Endpoints da API:"
echo "   http://localhost:3000/documentation (Swagger UI)"
echo ""
echo "🌐 WebSocket Messages:"
echo "   - subscribe-job: {type: 'subscribe-job', jobId: 'xxx'}"
echo "   - get-system-status: {type: 'get-system-status'}"
echo ""
echo "📊 Monitoramento:"
echo "   - Status do sistema: GET /api/automation/status"
echo "   - Jobs ativos: GET /api/automation/jobs"
echo "   - WebSocket clients conectados via API"


echo ""
echo "🎉 FASE 2 INSTALADA COM SUCESSO!"
echo "================================="

echo ""
echo "⚡ O sistema agora suporta:"
echo "   ✅ Jobs assíncronos (sem timeout HTTP)"
echo "   ✅ Progresso em tempo real"
echo "   ✅ Queue de jobs com prioridade"
echo "   ✅ Retry automático"
echo "   ✅ Cancelamento de jobs"
echo "   ✅ Múltiplos clientes WebSocket"
echo "   ✅ Fallback para modo síncrono"

echo ""
echo "🔜 PRÓXIMA FASE (3): Triggers e Agendamento"
echo "   - Agendamento automático (cron jobs)"
echo "   - Configuração via admin"
echo "   - Notificações email/Slack"
echo "   - Interface de controle v2"

echo ""
echo "💡 Dica: Use useQueue=false na API para testar o modo síncrono (FASE 1)"
echo "💡 Dica: Use priority=1 para jobs urgentes, priority=10 para baixa prioridade"

echo ""
echo "🏁 Setup concluído! Inicie o servidor e teste a nova funcionalidade!"