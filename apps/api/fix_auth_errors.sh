#!/bin/bash

echo "🔧 Correção Rápida - 2 erros específicos"
echo "====================================="

cd apps/api

echo ""
echo "📦 1. Instalando dependência que falta..."
pnpm add @fastify/plugin

echo ""
echo "🔧 2. Fazendo backup dos arquivos..."
cp src/plugins/auth.plugin.ts src/plugins/auth.plugin.ts.backup
cp src/server.ts src/server.ts.backup

echo ""
echo "✅ Backups criados!"
echo ""
echo "📝 3. AÇÕES MANUAIS (2 correções simples):"
echo ""
echo "🔧 Correção 1 - auth.plugin.ts:"
echo "   Linha 1: Trocar 'import fp from '@fastify/auth';'"
echo "            por     'import fp from '@fastify/plugin';'"
echo ""
echo "   Últimas linhas: Trocar o export por:"
echo "   export default fp(authPlugin, {"
echo "     name: 'auth-plugin',"
echo "   });"
echo ""
echo "🔧 Correção 2 - server.ts:"
echo "   Adicionar após as importações (linha ~30):"
echo ""
echo "   declare module 'fastify' {"
echo "     interface FastifyRequest {"
echo "       user?: {"
echo "         id: number;"
echo "         email: string;"
echo "         name?: string;"
echo "         roles?: string[];"
echo "         permissions?: string[];"
echo "       };"
echo "     }"
echo "   }"
echo ""
echo "✅ Com essas 2 correções, todos os 17 erros serão resolvidos!"
echo ""
echo "🧪 4. Teste após as correções:"
echo "   pnpm run typecheck"
echo "   pnpm dev"
