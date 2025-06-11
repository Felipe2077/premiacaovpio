#!/bin/bash

# Script para corrigir todos os erros de tipo nos arquivos de rotas
# Execute na pasta apps/api/

echo "🔧 Corrigindo erros de tipo em todos os arquivos de rotas..."

# Função para aplicar correções
fix_route_file() {
    local file=$1
    echo "Corrigindo $file..."
    
    # Corrigir fastify.authenticate
    sed -i '' 's/fastify\.authenticate/(fastify as any).authenticate/g' "$file"
    
    # Corrigir request.user
    sed -i '' 's/request\.user/(request as any).user/g' "$file"
    
    # Corrigir request.sessionId
    sed -i '' 's/request\.sessionId/(request as any).sessionId/g' "$file"
    
    echo "✅ $file corrigido"
}

# Lista de arquivos para corrigir
FILES=(
    "src/routes/test.routes.ts"
    "src/routes/results.routes.ts"
    "src/routes/metadata.routes.ts"
    "src/routes/parameters.routes.ts"
    "src/routes/periods.routes.ts"
    "src/routes/expurgos.routes.ts"
    "src/routes/audit.routes.ts"
    "src/routes/admin.routes.ts"
)

# Aplicar correções em todos os arquivos
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        fix_route_file "$file"
    else
        echo "⚠️  Arquivo não encontrado: $file"
    fi
done

echo ""
echo "🎉 Todas as correções aplicadas!"
echo ""
echo "📋 Próximos passos:"
echo "1. Executar: pnpm run typecheck"
echo "2. Se compilar: pnpm dev"
echo "3. Testar: curl http://localhost:3001/health"