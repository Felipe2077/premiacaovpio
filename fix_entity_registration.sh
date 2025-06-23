#!/bin/bash

echo "🔧 CORRIGINDO REGISTRO DA SCHEDULECONFIGENITY"
echo "============================================="

# Verificar se está no diretório correto
if [ ! -f "apps/api/src/database/data-source.ts" ]; then
  echo "❌ Arquivo data-source.ts não encontrado"
  exit 1
fi

echo "📋 1. Verificando estado atual do data-source.ts..."

# Verificar se ScheduleConfigEntity já está importada
if grep -q "ScheduleConfigEntity" apps/api/src/database/data-source.ts; then
  echo "✅ Import da ScheduleConfigEntity encontrado"
else
  echo "❌ Import da ScheduleConfigEntity NÃO encontrado"
fi

# Verificar se está no array entities
if grep -A 20 "const entities" apps/api/src/database/data-source.ts | grep -q "ScheduleConfigEntity"; then
  echo "✅ ScheduleConfigEntity está no array entities"
else
  echo "❌ ScheduleConfigEntity NÃO está no array entities"
fi

echo ""
echo "📄 2. Conteúdo atual relevante do data-source.ts:"
echo "================================================"

echo ""
echo "Imports relacionados:"
grep -n "import.*Entity" apps/api/src/database/data-source.ts | head -10

echo ""
echo "Array entities:"
grep -A 20 "const entities" apps/api/src/database/data-source.ts

echo ""
echo "🔧 3. Aplicando correção..."

# Backup
cp apps/api/src/database/data-source.ts apps/api/src/database/data-source.ts.backup
echo "💾 Backup criado: data-source.ts.backup"

# Verificar se o import existe, se não, adicionar
if ! grep -q "ScheduleConfigEntity" apps/api/src/database/data-source.ts; then
  echo "➕ Adicionando import da ScheduleConfigEntity..."
  
  # Encontrar uma linha de import existente para adicionar depois
  if grep -q "import.*UserEntity" apps/api/src/database/data-source.ts; then
    sed -i.tmp '/import.*UserEntity/a\
import { ScheduleConfigEntity } from '"'"'../entity/schedule-config.entity'"'"';' apps/api/src/database/data-source.ts
  else
    # Se não encontrar UserEntity, adicionar após qualquer import de entity
    sed -i.tmp '/import.*Entity.*from/a\
import { ScheduleConfigEntity } from '"'"'../entity/schedule-config.entity'"'"';' apps/api/src/database/data-source.ts
  fi
  
  echo "✅ Import adicionado"
else
  echo "✅ Import já existe"
fi

# Verificar se está no array entities
if ! grep -A 20 "const entities" apps/api/src/database/data-source.ts | grep -q "ScheduleConfigEntity"; then
  echo "➕ Adicionando ScheduleConfigEntity ao array entities..."
  
  # Encontrar onde adicionar no array
  if grep -A 20 "const entities" apps/api/src/database/data-source.ts | grep -q "UserEntity,"; then
    sed -i.tmp '/UserEntity,/a\
  ScheduleConfigEntity,' apps/api/src/database/data-source.ts
  else
    # Se não encontrar UserEntity, adicionar no final do array antes do ]
    sed -i.tmp '/const entities = \[/,/\];/ {
      /\];/i\
  ScheduleConfigEntity,
    }' apps/api/src/database/data-source.ts
  fi
  
  echo "✅ Entidade adicionada ao array"
else
  echo "✅ Entidade já está no array"
fi

# Limpar arquivos temporários
rm -f apps/api/src/database/data-source.ts.tmp

echo ""
echo "📄 4. Verificando resultado..."

echo ""
echo "Imports após correção:"
grep -n "ScheduleConfigEntity" apps/api/src/database/data-source.ts

echo ""
echo "Array entities após correção:"
grep -A 30 "const entities" apps/api/src/database/data-source.ts

echo ""
echo "🧪 5. Testando compilação..."

cd apps/api

if npx tsc --noEmit > /dev/null 2>&1; then
  echo "✅ Código compila sem erros"
else
  echo "❌ Ainda há erros de compilação:"
  npx tsc --noEmit
fi

cd ../..

echo ""
echo "🔄 6. PRÓXIMOS PASSOS:"
echo "===================="
echo ""
echo "1. Reinicie o servidor:"
echo "   cd apps/api"
echo "   # Pressione Ctrl+C para parar"
echo "   pnpm dev"
echo ""
echo "2. Teste novamente no Postman:"
echo "   GET {{baseUrl}}/api/scheduling/system/status"
echo ""
echo "3. Se ainda der erro, execute:"
echo "   # No terminal do servidor, verifique se aparece:"
echo "   # 'ScheduleConfigEntity' nos logs de inicialização"

echo ""
echo "🔍 7. VERIFICAÇÃO ADICIONAL:"
echo "=========================="

echo ""
echo "Para verificar se a entidade está sendo carregada corretamente,"
echo "adicione este log temporário no data-source.ts:"
echo ""
echo "console.log('Entidades carregadas:', entities.map(e => e.name));"
echo ""
echo "Deve aparecer 'ScheduleConfigEntity' na lista."

echo ""
echo "✅ CORREÇÃO CONCLUÍDA!"