#!/bin/bash

echo "🔧 Aplicando correções rápidas..."

# 1. Atualizar Zod para versão compatível
echo "📦 Atualizando Zod..."
cd apps/api
pnpm add zod@latest
cd ../..

# 2. Substituir data-source.ts
echo "🔄 Corrigindo data-source.ts..."
cat > apps/api/src/database/data-source.ts << 'EOF'
// apps/api/src/database/data-source.ts
import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
import { DataSource } from 'typeorm';

// === IMPORTAR APENAS ENTIDADES QUE EXISTEM ===
import { AuditLogEntity } from '../entity/audit-log.entity';
import { CompetitionPeriodEntity } from '../entity/competition-period.entity';
import { CriterionEntity } from '../entity/criterion.entity';
import { ExpurgoEventEntity } from '../entity/expurgo-event.entity';
import { ParameterValueEntity } from '../entity/parameter-value.entity';
import { SectorEntity } from '../entity/sector.entity';

// === NOVAS ENTIDADES DE AUTENTICAÇÃO ===
import { UserEntity } from '../entity/user.entity';
import { RoleEntity } from '../entity/role.entity';
import { SessionEntity } from '../entity/session.entity';

dotenv.config();

// === DEBUG dotenv ===
console.log('[data-source.ts] Script iniciado.');
const envPath = path.resolve(__dirname, '../../.env');
console.log(`[data-source.ts] Tentando carregar .env de: ${envPath}`);

const configResult = dotenv.config({ path: envPath });
if (configResult.error) {
  console.error(`[data-source.ts] ERRO ao carregar .env:`, configResult.error);
} else {
  console.log('[data-source.ts] .env carregado com sucesso.');
}

// === CONFIGURAÇÕES ===
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'poc_db',
};

console.log('[data-source.ts] Config PostgreSQL:', { ...dbConfig, password: '***' });

// === ENTIDADES BÁSICAS (QUE EXISTEM) ===
const entities = [
  // Auth
  UserEntity,
  RoleEntity, 
  SessionEntity,
  
  // Core existentes
  SectorEntity,
  CriterionEntity,
  CompetitionPeriodEntity,
  ParameterValueEntity,
  ExpurgoEventEntity,
  AuditLogEntity,
];

console.log(`[data-source.ts] Total de entidades: ${entities.length}`);

// === DATA SOURCE PRINCIPAL ===
export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbConfig.host,
  port: dbConfig.port,
  username: dbConfig.username,
  password: dbConfig.password,
  database: dbConfig.database,
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development' ? ['error'] : false,
  entities,
  migrations: [],
  subscribers: [],
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// === DATA SOURCES LEGADOS (DUMMY) ===
export const OracleDataSource = {
  isInitialized: false,
  initialize: async () => { console.log('Oracle não configurado'); },
  query: async () => { throw new Error('Oracle não configurado'); },
  destroy: async () => {},
} as any;

export const MySqlDataSource = {
  isInitialized: false,
  initialize: async () => { console.log('MySQL não configurado'); },
  query: async () => { throw new Error('MySQL não configurado'); },
  destroy: async () => {},
} as any;

// === FUNÇÕES HELPER ===
export async function initializeDataSources() {
  console.log('[data-source.ts] Inicializando conexões...');
  
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ PostgreSQL conectado com sucesso');
      
      if (process.env.NODE_ENV === 'development') {
        try {
          const tables = await AppDataSource.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
          `);
          console.log('📋 Tabelas no banco:', tables.map((t: any) => t.table_name));
        } catch (queryError: unknown) {
          console.log('⚠️ Não foi possível listar tabelas (normal se banco estiver vazio)');
        }
      }
    }
    
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro ao inicializar conexões:', errorMessage);
    throw error;
  }
}

export async function checkDatabaseHealth() {
  const health = {
    postgres: false,
    oracle: false, 
    mysql: false,
    timestamp: new Date()
  };

  try {
    await AppDataSource.query('SELECT 1');
    health.postgres = true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ PostgreSQL health check failed:', errorMessage);
  }

  return health;
}
EOF

# 3. Verificar se .env existe
echo "🔧 Verificando .env..."
if [ ! -f "apps/api/.env" ]; then
    echo "📝 Criando .env..."
    cat > apps/api/.env << 'EOF'
# === BANCO DE DADOS ===
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=poc_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# === JWT & SECURITY ===
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_minimum_64_chars_long
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
PASSWORD_SALT_ROUNDS=12

# === API ===
API_PORT=3001
HOST=0.0.0.0
NODE_ENV=development
EOF
fi

# 4. Compilar shared-types
echo "📦 Compilando shared-types..."
pnpm --filter shared-types run build

# 5. Testar conexão
echo "🧪 Testando conexão..."
cd apps/api

pnpm exec ts-node -e "
import { AppDataSource } from './src/database/data-source';
async function test() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Conexão OK');
    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.log('❌ Erro:', error.message);
    process.exit(1);
  }
}
test();
"

if [ $? -eq 0 ]; then
    echo "✅ Banco conectado com sucesso!"
    echo ""
    echo "🚀 PRÓXIMOS PASSOS:"
    echo "1. Execute: cd apps/api && pnpm dev"
    echo "2. Acesse: http://localhost:3001"
    echo ""
    echo "📋 Depois que a API estiver rodando:"
    echo "1. Execute o seed: npx ts-node src/database/auth-seed.ts"
    echo "2. Execute os testes: npx ts-node src/test-auth.ts"
else
    echo "❌ Ainda há problemas de conexão."
    echo "🐳 Certifique-se de que o PostgreSQL está rodando:"
    echo "   Docker: docker run --name postgres-premiacao -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15"
    echo "   Local: brew services start postgresql (macOS)"
fi

cd ../..