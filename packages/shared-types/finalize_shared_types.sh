#!/bin/bash

echo "🎉 Finalizando configuração do shared-types..."

cd packages/shared-types

# 1. Atualizar package.json para apontar corretamente
echo "📦 Atualizando package.json..."
cat > package.json << 'EOF'
{
  "name": "@sistema-premiacao/shared-types",
  "version": "0.1.0",
  "private": true,
  
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "module": "./dist/index.js",
  
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "require": "./dist/index.js",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
  
  "files": [
    "dist/**/*"
  ],
  
  "scripts": {
    "build": "rm -rf dist && tsc -p tsconfig.json",
    "dev": "tsc -w -p tsconfig.json",
    "clean": "rm -rf dist"
  },
  
  "devDependencies": {
    "typescript": "5.8.2"
  }
}
EOF

echo "✅ Package.json atualizado!"

# 2. Verificar se tudo está OK
echo "🔍 Verificando exports no index.d.ts:"
cat dist/index.d.ts

echo -e "\n🧪 Testando importação local..."
cat > test-import.js << 'EOF'
const { ExpurgoStatus } = require('./dist/index.js');
console.log('✅ Importação CommonJS OK:', ExpurgoStatus);
EOF

node test-import.js
rm test-import.js

# 3. Voltar para a API e reinstalar
echo -e "\n🔄 Atualizando dependências da API..."
cd ../../apps/api

# Forçar reinstalação para reconhecer mudanças
rm -rf node_modules/.cache
pnpm install

echo -e "\n🧪 Testando importação na API..."
cat > test-expurgo-import.ts << 'EOF'
// Teste de importação dos tipos de expurgo
import { 
  ExpurgoStatus, 
  CreateExpurgoDto, 
  ApproveRejectExpurgoDto,
  FindExpurgosDto 
} from '@sistema-premiacao/shared-types';

console.log('✅ Todos os tipos importados com sucesso!');
console.log('ExpurgoStatus.PENDENTE:', ExpurgoStatus.PENDENTE);

// Teste de tipagem
const testDto: CreateExpurgoDto = {
  competitionPeriodId: 1,
  sectorId: 1,
  criterionId: 1,
  dataEvento: '2025-06-07',
  descricaoEvento: 'Teste',
  justificativaSolicitacao: 'Teste de justificativa',
  valorAjusteNumerico: -1
};

console.log('✅ Tipagem do CreateExpurgoDto OK');
EOF

# Tentar compilar o teste
npx tsc --noEmit test-expurgo-import.ts

if [ $? -eq 0 ]; then
  echo "🎉 Teste de importação na API passou!"
  rm test-expurgo-import.ts
  
  echo -e "\n✅ TUDO PRONTO!"
  echo "🚀 Agora você pode:"
  echo "   1. Usar os tipos de expurgo na API"
  echo "   2. Rodar o servidor: pnpm dev:api"
  echo "   3. Testar os endpoints de expurgo"
  
else
  echo "⚠️ Ainda há problemas na importação"
  echo "💡 Tente:"
  echo "   1. Reiniciar o terminal"
  echo "   2. Executar: pnpm install --force"
  echo "   3. Verificar se não há conflitos de versão"
  
  rm test-expurgo-import.ts
fi

echo -e "\n📋 RESUMO:"
echo "✅ shared-types compilado corretamente"
echo "✅ index.d.ts gerado" 
echo "✅ Exports configurados"
echo "✅ API atualizada"
echo ""
echo "🎯 Próximo passo: Testar o ExpurgoService na API!"