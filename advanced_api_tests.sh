#!/bin/bash

echo "🚀 TESTES AVANÇADOS DE API - Sistema de Agendamento"
echo "=================================================="

BASE_URL="http://localhost:3001"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para fazer request e mostrar resultado
test_api() {
  local method="$1"
  local endpoint="$2"
  local data="$3"
  local description="$4"
  
  echo ""
  echo -e "${BLUE}🧪 $description${NC}"
  echo "   $method $endpoint"
  
  if [ -n "$data" ]; then
    echo "   Dados: $data"
  fi
  
  local response
  local http_code
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" "$BASE_URL$endpoint")
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE_URL$endpoint")
  elif [ "$method" = "PUT" ]; then
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X PUT \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE_URL$endpoint")
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X DELETE \
      "$BASE_URL$endpoint")
  fi
  
  http_code=$(echo "$response" | grep "HTTP_CODE:" | cut -d: -f2)
  body=$(echo "$response" | sed '/HTTP_CODE:/d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "   ${GREEN}✅ Status: $http_code${NC}"
  elif [ "$http_code" -ge 400 ] && [ "$http_code" -lt 500 ]; then
    echo -e "   ${YELLOW}⚠️  Status: $http_code${NC}"
  else
    echo -e "   ${RED}❌ Status: $http_code${NC}"
  fi
  
  # Mostrar resposta formatada (se for JSON)
  if echo "$body" | jq . > /dev/null 2>&1; then
    echo "   Resposta:"
    echo "$body" | jq . | sed 's/^/     /'
  else
    echo "   Resposta: $body"
  fi
}

# Verificar se servidor está rodando
echo "🔍 Verificando se servidor está ativo..."
if ! curl -s -f "$BASE_URL/api/health" > /dev/null 2>&1; then
  echo -e "${RED}❌ Servidor não está rodando em $BASE_URL${NC}"
  echo ""
  echo "🚀 Inicie o servidor primeiro:"
  echo "   cd apps/api"
  echo "   pnpm dev"
  exit 1
fi

echo -e "${GREEN}✅ Servidor está ativo!${NC}"

echo ""
echo "📋 INICIANDO BATERIA DE TESTES..."
echo "================================="

# ===== TESTES BÁSICOS =====

test_api "GET" "/api/scheduling/system/status" "" \
  "Status do sistema de agendamento"

test_api "GET" "/api/scheduling/schedules" "" \
  "Listar todos os agendamentos"

test_api "GET" "/api/scheduling/templates" "" \
  "Obter templates predefinidos"

test_api "GET" "/api/scheduling/system/health" "" \
  "Health check do sistema"

# ===== TESTES COM FILTROS =====

test_api "GET" "/api/scheduling/schedules?status=ACTIVE" "" \
  "Listar agendamentos ativos"

test_api "GET" "/api/scheduling/schedules?frequency=DAILY" "" \
  "Listar agendamentos diários"

test_api "GET" "/api/scheduling/schedules?limit=5&offset=0" "" \
  "Listar com paginação"

# ===== TESTE DE CRIAÇÃO =====

schedule_data='{
  "name": "Teste ETL Diário",
  "description": "Agendamento de teste criado via API",
  "frequency": "DAILY",
  "timeOfDay": "02:30",
  "jobType": "FULL_ETL",
  "advancedConfig": {
    "onlyIfActiveePeriod": true,
    "emailNotifications": false,
    "skipIfPreviousRunning": true
  }
}'

test_api "POST" "/api/scheduling/schedules" "$schedule_data" \
  "Criar novo agendamento"

# ===== TESTE DE CRIAÇÃO SEMANAL =====

weekly_schedule='{
  "name": "Teste ETL Semanal",
  "description": "Agendamento semanal de teste",
  "frequency": "WEEKLY",
  "timeOfDay": "03:00",
  "weekDays": {
    "monday": true,
    "tuesday": false,
    "wednesday": false,
    "thursday": false,
    "friday": false,
    "saturday": false,
    "sunday": false
  },
  "jobType": "PARTIAL_RECALCULATION"
}'

test_api "POST" "/api/scheduling/schedules" "$weekly_schedule" \
  "Criar agendamento semanal"

# ===== TESTE DE CRIAÇÃO MENSAL =====

monthly_schedule='{
  "name": "Teste Validação Mensal",
  "description": "Validação no primeiro dia do mês",
  "frequency": "MONTHLY",
  "timeOfDay": "04:00",
  "dayOfMonth": 1,
  "jobType": "DATA_VALIDATION"
}'

test_api "POST" "/api/scheduling/schedules" "$monthly_schedule" \
  "Criar agendamento mensal"

# ===== BUSCAR AGENDAMENTOS CRIADOS =====

echo ""
echo -e "${BLUE}🔍 Buscando agendamentos criados...${NC}"

schedules_response=$(curl -s "$BASE_URL/api/scheduling/schedules")
schedule_ids=$(echo "$schedules_response" | jq -r '.data.schedules[]?.id // empty' 2>/dev/null)

if [ -n "$schedule_ids" ]; then
  for schedule_id in $schedule_ids; do
    test_api "GET" "/api/scheduling/schedules/$schedule_id" "" \
      "Buscar agendamento ID $schedule_id"
    
    # Testar execução manual (se o agendamento existir)
    test_api "POST" "/api/scheduling/schedules/$schedule_id/execute" "" \
      "Executar agendamento $schedule_id manualmente"
    
    # Testar atualização
    update_data='{"description": "Descrição atualizada via teste"}'
    test_api "PUT" "/api/scheduling/schedules/$schedule_id" "$update_data" \
      "Atualizar agendamento $schedule_id"
    
    break # Testar apenas o primeiro para não sobrecarregar
  done
else
  echo -e "${YELLOW}⚠️  Nenhum agendamento encontrado para testes avançados${NC}"
fi

# ===== TESTES DE ERRO =====

echo ""
echo -e "${BLUE}🧪 Testando casos de erro...${NC}"

# Agendamento inválido (sem nome)
invalid_schedule='{"frequency": "DAILY", "timeOfDay": "02:00"}'
test_api "POST" "/api/scheduling/schedules" "$invalid_schedule" \
  "Criar agendamento inválido (sem nome)"

# Horário inválido
invalid_time='{"name": "Teste", "frequency": "DAILY", "timeOfDay": "25:00", "jobType": "FULL_ETL"}'
test_api "POST" "/api/scheduling/schedules" "$invalid_time" \
  "Criar agendamento com horário inválido"

# Buscar agendamento inexistente
test_api "GET" "/api/scheduling/schedules/99999" "" \
  "Buscar agendamento inexistente"

# ===== TESTES DO SISTEMA =====

test_api "POST" "/api/scheduling/system/restart" "" \
  "Reiniciar sistema de agendamento"

# ===== LIMPEZA (OPCIONAL) =====

echo ""
echo -e "${YELLOW}🧹 Limpeza de dados de teste...${NC}"

if [ -n "$schedule_ids" ]; then
  echo "Agendamentos criados durante o teste: $schedule_ids"
  echo ""
  read -p "Deseja remover os agendamentos de teste? (y/n): " cleanup
  
  if [ "$cleanup" = "y" ] || [ "$cleanup" = "Y" ]; then
    for schedule_id in $schedule_ids; do
      test_api "DELETE" "/api/scheduling/schedules/$schedule_id" "" \
        "Remover agendamento de teste $schedule_id"
    done
  fi
fi

echo ""
echo "🏁 TESTES CONCLUÍDOS!"
echo "===================="

echo ""
echo "📊 RESUMO:"
echo "   ✅ Testou APIs básicas (GET)"
echo "   ✅ Testou criação de agendamentos (POST)"
echo "   ✅ Testou busca individual (GET /:id)"
echo "   ✅ Testou atualização (PUT)"
echo "   ✅ Testou execução manual (POST /:id/execute)"
echo "   ✅ Testou remoção (DELETE)"
echo "   ✅ Testou casos de erro"
echo "   ✅ Testou filtros e paginação"

echo ""
echo "📚 Para ver documentação completa:"
echo "   http://localhost:3001/docs"

echo ""
echo "💡 Próximos passos:"
echo "   1. Verificar logs do servidor durante os testes"
echo "   2. Testar agendamento automático (aguardar execução no horário)"
echo "   3. Implementar interface frontend"
echo "   4. Configurar notificações (email/Slack)"