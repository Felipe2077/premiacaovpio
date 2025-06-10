#!/bin/bash

echo "🚀 Setup Completo da Autenticação - Sistema de Premiação"
echo "========================================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Verificar se estamos na pasta correta
if [ ! -f "pnpm-workspace.yaml" ]; then
    log_error "Execute este script na raiz do projeto (onde está o pnpm-workspace.yaml)"
    exit 1
fi

# 1. Instalar dependências
log_info "Instalando dependências de autenticação..."
cd apps/api

pnpm add @fastify/jwt @fastify/auth @fastify/rate-limit @fastify/helmet bcrypt argon2 uuid nodemailer
if [ $? -ne 0 ]; then
    log_error "Falha na instalação das dependências principais"
    exit 1
fi

pnpm add -D @types/bcrypt @types/uuid @types/nodemailer
if [ $? -ne 0 ]; then
    log_error "Falha na instalação das dependências de desenvolvimento"
    exit 1
fi

pnpm add zod fastify-type-provider-zod
if [ $? -ne 0 ]; then
    log_error "Falha na instalação das dependências de validação"
    exit 1
fi

cd ../..
log_success "Dependências instaladas"

# 2. Compilar shared-types
log_info "Compilando shared-types..."
pnpm --filter shared-types run build
if [ $? -ne 0 ]; then
    log_error "Falha na compilação do shared-types"
    exit 1
fi
log_success "Shared-types compilado"

# 3. Verificar/criar arquivo .env
log_info "Verificando configurações de ambiente..."
ENV_FILE="apps/api/.env"

if [ ! -f "$ENV_FILE" ]; then
    log_warning "Arquivo .env não encontrado, criando template..."
    cat > "$ENV_FILE" << 'EOF'
# === BANCO DE DADOS ===
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=poc_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# === JWT & SECURITY ===
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_minimum_64_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PASSWORD_SALT_ROUNDS=12

# === API ===
API_PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# === RATE LIMITING ===
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW=300000
RATE_LIMIT_API_MAX=100
RATE_LIMIT_API_WINDOW=60000

# === EMAIL (opcional por enquanto) ===
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=true
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_app_password
# SMTP_FROM=noreply@viacaopioneira.com
EOF
    log_warning "Arquivo .env criado com valores padrão. MUDE O JWT_SECRET!"
else
    log_success "Arquivo .env já existe"
fi

# 4. Inicializar banco (se necessário)
log_info "Verificando conexão com banco de dados..."
cd apps/api

# Verificar se o banco está rodando
pnpm exec ts-node -e "
import { AppDataSource } from './src/database/data-source';
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Banco conectado');
    return AppDataSource.destroy();
  })
  .catch(() => {
    console.log('❌ Banco não conectado');
    process.exit(1);
  });
"

if [ $? -ne 0 ]; then
    log_error "Não foi possível conectar ao banco de dados!"
    log_info "Certifique-se de que o PostgreSQL está rodando e as credenciais no .env estão corretas"
    log_info "Para Docker: docker run --name postgres-premiacao -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15"
    exit 1
fi

log_success "Banco de dados conectado"

# 5. Executar seed de autenticação
log_info "Executando seed de autenticação..."
pnpm exec ts-node src/database/auth-seed.ts
if [ $? -ne 0 ]; then
    log_error "Falha no seed de autenticação"
    exit 1
fi
log_success "Seed de autenticação concluído"

# 6. Executar testes básicos
log_info "Executando testes básicos..."
pnpm exec ts-node src/test-auth.ts
if [ $? -ne 0 ]; then
    log_error "Falha nos testes básicos"
    exit 1
fi
log_success "Testes básicos passaram"

cd ../..

# 7. Verificar estrutura final
log_info "Verificando estrutura final..."

REQUIRED_FILES=(
    "apps/api/src/entity/user.entity.ts"
    "apps/api/src/entity/role.entity.ts" 
    "apps/api/src/entity/session.entity.ts"
    "apps/api/src/services/auth.service.ts"
    "packages/shared-types/src/dto/auth.dto.ts"
    "packages/shared-types/src/enums/permission.enum.ts"
    "packages/shared-types/dist/index.js"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_success "✓ $file"
    else
        log_error "✗ $file (FALTANDO!)"
        exit 1
    fi
done

# 8. Instruções finais
echo ""
echo "🎉 SETUP CONCLUÍDO COM SUCESSO!"
echo "================================"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. 🔐 CREDENCIAIS DE TESTE:"
echo "   📧 Email: diretor@viacaopioneira.com"
echo "   🔒 Senha: Pioneira@2025"
echo "   👑 Papel: DIRETOR (acesso total)"
echo ""
echo "2. 🚀 EXECUTAR API:"
echo "   cd apps/api"
echo "   pnpm dev"
echo ""
echo "3. 🧪 TESTAR ENDPOINTS:"
echo "   POST http://localhost:3001/api/auth/login"
echo "   {\"email\": \"diretor@viacaopioneira.com\", \"password\": \"Pioneira@2025\"}"
echo ""
echo "4. 🔧 PRÓXIMA IMPLEMENTAÇÃO:"
echo "   - Middleware de autenticação no Fastify"
echo "   - Proteção de rotas existentes"
echo "   - Endpoints de gestão de usuários"
echo ""
echo "📚 DOCUMENTAÇÃO:"
echo "   - Entidades: apps/api/src/entity/"
echo "   - Serviços: apps/api/src/services/"
echo "   - DTOs: packages/shared-types/src/dto/"
echo ""
echo "⚠️  LEMBRETE:"
echo "   - Mude o JWT_SECRET no .env antes de produção!"
echo "   - Configure SMTP para emails funcionarem"
echo ""
echo "✅ Autenticação básica implementada e testada!"

# Verificar se a API está rodando
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo ""
    echo "🌐 API já está rodando em http://localhost:3001"
    echo "🧪 Teste o login em: http://localhost:3001/api/auth/login"
else
    echo ""
    echo "💡 Para iniciar a API:"
    echo "   cd apps/api && pnpm dev"
fi

echo ""
echo "🎯 FASE 1 CONCLUÍDA - Fundação Backend ✅"
echo "📋 Próximo: Implementar middlewares e proteção de rotas"