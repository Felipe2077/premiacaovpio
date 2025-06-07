#!/bin/bash

echo "🔧 Aplicando correções finais no shared-types..."

# Ir para a raiz do projeto
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Verificar se estamos no diretório correto
if [ ! -d "packages/shared-types" ]; then
  echo "❌ Diretório packages/shared-types não encontrado. Execute no root do projeto."
  exit 1
fi

cd packages/shared-types

echo "📝 Atualizando tsconfig.json..."
cat > tsconfig.json << 'EOF'
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "composite": true,
    
    "module": "CommonJS",
    "target": "ES2020",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    
    "isolatedModules": true,
    "noEmitOnError": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
EOF

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
    },
    "./package.json": "./package.json"
  },
  
  "files": [
    "dist/**/*",
    "package.json"
  ],
  
  "scripts": {
    "build": "rm -rf dist && tsc -p tsconfig.json",
    "dev": "tsc -w -p tsconfig.json",
    "clean": "rm -rf dist",
    "prepack": "npm run build"
  },
  
  "devDependencies": {
    "typescript": "5.8.2"
  },
  
  "publishConfig": {
    "access": "restricted"
  }
}
EOF

echo "🧹 Limpando build anterior..."
rm -rf dist node_modules/.cache

echo "📦 Reinstalando dependências..."
pnpm install

echo "🔨 Compilando shared-types..."
pnpm run build

if [ $? -eq 0 ]; then
  echo "✅ Compilação bem-sucedida!"
  echo "📁 Arquivos gerados:"
  ls -la dist/
  
  echo "🔍 Verificando exports..."
  if [ -f "dist/index.js" ] && [ -f "dist/index.d.ts" ]; then
    echo "✅ Arquivos principais encontrados"
    
    # Mostrar preview do que foi exportado
    echo "📄 Preview do index.d.ts:"
    head -20 dist/index.d.ts
  else
    echo "❌ Arquivos principais não encontrados"
    exit 1
  fi
else
  echo "❌ Erro na compilação"
  exit 1
fi

# Voltar para API e reinstalar para reconhecer mudanças
echo "🔄 Atualizando dependências da API..."
cd ../../apps/api
pnpm install

echo "🧪 Testando importação..."
cat > test-import.ts << 'EOF'
// Teste rápido de importação
import { ExpurgoStatus, CreateExpurgoDto } from '@sistema-premiacao/shared-types';

console.log('✅ Importação bem-sucedida!');
console.log('ExpurgoStatus:', ExpurgoStatus);
console.log('CreateExpurgoDto type available');
EOF

# Tentar compilar o teste
npx tsc --noEmit test-import.ts

if [ $? -eq 0 ]; then
  echo "🎉 Teste de importação passou!"
  rm test-import.ts
else
  echo "⚠️ Ainda há problemas na importação"
  rm test-import.ts
fi

echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "1. Reinicie o servidor da API: pnpm dev:api"
echo "2. Verifique se os imports funcionam"
echo "3. Se ainda der erro, execute: pnpm install --force"
echo ""
echo "✅ Correções aplicadas!"