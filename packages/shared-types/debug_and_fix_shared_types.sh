#!/bin/bash

echo "🔍 Diagnosticando problema no shared-types..."

# Verificar estrutura atual
echo "📁 Estrutura atual do dist:"
ls -la dist/

echo -e "\n📄 Conteúdo do index.js:"
cat dist/index.js

echo -e "\n📄 Verificando se existe index.d.ts:"
if [ -f "dist/index.d.ts" ]; then
  echo "✅ index.d.ts encontrado"
  cat dist/index.d.ts
else
  echo "❌ index.d.ts NÃO encontrado"
fi

echo -e "\n📂 Verificando estrutura de src:"
find src -name "*.ts" -type f

echo -e "\n📄 Conteúdo do src/index.ts:"
cat src/index.ts

echo -e "\n🔧 Vamos corrigir o problema..."

# Limpar completamente
rm -rf dist

# Verificar se tsconfig está correto
echo "📝 Verificando tsconfig.json atual:"
cat tsconfig.json

# Recriar tsconfig mais simples e direto
echo -e "\n🔨 Criando tsconfig.json mais simples..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true
  },
  "include": [
    "src/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
EOF

# Verificar estrutura do src novamente
echo -e "\n📂 Verificando se todos os arquivos necessários existem:"

# Criar enum se não existir
if [ ! -f "src/enums/expurgo-status.enum.ts" ]; then
  echo "🆕 Criando expurgo-status.enum.ts..."
  mkdir -p src/enums
  cat > src/enums/expurgo-status.enum.ts << 'EOF'
export enum ExpurgoStatus {
  PENDENTE = 'PENDENTE',
  APROVADO = 'APROVADO',
  REJEITADO = 'REJEITADO',
}

export function isValidExpurgoStatus(status: string): status is ExpurgoStatus {
  return Object.values(ExpurgoStatus).includes(status as ExpurgoStatus);
}

export function getExpurgoStatusDescription(status: ExpurgoStatus): string {
  switch (status) {
    case ExpurgoStatus.PENDENTE:
      return 'Aguardando aprovação';
    case ExpurgoStatus.APROVADO:
      return 'Aprovado';
    case ExpurgoStatus.REJEITADO:
      return 'Rejeitado';
    default:
      return 'Status desconhecido';
  }
}
EOF
fi

# Recriar index.ts mais simples
echo "📝 Recriando src/index.ts..."
cat > src/index.ts << 'EOF'
// Enums
export * from './enums/expurgo-status.enum';

// DTOs  
export * from './dto/expurgo.dto';

// Re-export outros DTOs existentes se houver
export * from './dto/parameter.dto';

// Export individual para debug
export { ExpurgoStatus } from './enums/expurgo-status.enum';
EOF

echo -e "\n🔨 Tentando compilar novamente..."
npx tsc --project tsconfig.json

if [ $? -eq 0 ]; then
  echo "✅ Compilação bem-sucedida!"
  
  echo -e "\n📁 Nova estrutura do dist:"
  find dist -type f | sort
  
  echo -e "\n🔍 Verificando arquivos principais:"
  if [ -f "dist/index.js" ]; then
    echo "✅ index.js existe"
  fi
  
  if [ -f "dist/index.d.ts" ]; then
    echo "✅ index.d.ts existe"
    echo -e "\n📄 Conteúdo do index.d.ts:"
    cat dist/index.d.ts
  else
    echo "❌ index.d.ts ainda não existe"
    echo "🔍 Vamos procurar arquivos .d.ts:"
    find dist -name "*.d.ts" | head -5
  fi
  
else
  echo "❌ Erro na compilação"
  echo "Vamos tentar com configuração ainda mais básica..."
  
  # Configuração ultra-básica
  cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "dist",
    "declaration": true,
    "esModuleInterop": true
  },
  "include": ["src/**/*"]
}
EOF
  
  echo "🔨 Tentando com configuração básica..."
  npx tsc
fi

echo -e "\n🎯 Diagnóstico completo!"