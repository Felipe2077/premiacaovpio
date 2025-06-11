// check-db.js - Executar na raiz do projeto com: node check-db.js

const { exec } = require('child_process');
const path = require('path');

// Carregar variáveis do .env
require('dotenv').config({ path: path.resolve(__dirname, 'apps/api/.env') });

console.log('🔍 Verificando estrutura do banco...');
console.log(
  '📊 Usando PostgreSQL em:',
  process.env.POSTGRES_HOST || 'localhost'
);

// Função para executar query SQL
function runQuery(query) {
  return new Promise((resolve, reject) => {
    const pgCommand = `PGPASSWORD="${process.env.POSTGRES_PASSWORD}" psql -h ${process.env.POSTGRES_HOST || 'localhost'} -p ${process.env.POSTGRES_PORT || 5432} -U ${process.env.POSTGRES_USER} -d ${process.env.POSTGRES_DB} -c "${query}"`;

    exec(pgCommand, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout);
      }
    });
  });
}

async function checkDatabase() {
  try {
    console.log('🔌 Testando conexão...');

    // Verificar conexão
    await runQuery('SELECT 1');
    console.log('✅ Conexão com banco estabelecida');

    // Verificar se tabela users existe
    console.log('📊 Verificando tabela users...');
    const tableExists = await runQuery(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (tableExists.includes('t')) {
      // PostgreSQL retorna 't' para true
      console.log('✅ Tabela users existe');

      // Contar usuários
      const countResult = await runQuery('SELECT COUNT(*) FROM users');
      const userCount = countResult.match(/\d+/)?.[0] || '0';
      console.log(`👥 Usuários cadastrados: ${userCount}`);

      if (parseInt(userCount) > 0) {
        // Mostrar usuários
        console.log('📋 Listando usuários...');
        const users = await runQuery(
          'SELECT id, nome, email, role FROM users LIMIT 5'
        );
        console.log(users);

        console.log('');
        console.log('🎉 PRONTO PARA TESTAR LOGIN!');
        console.log('🧪 Tente fazer login no Postman com:');
        console.log('   Email: admin@sistema.com');
        console.log('   Senha: 123456');
      } else {
        console.log('');
        console.log('⚠️  NENHUM USUÁRIO CADASTRADO');
        console.log('🔧 Vou criar um usuário admin agora...');

        // Criar usuário admin
        await createAdminUser();
      }
    } else {
      console.log('❌ Tabela users NÃO existe');
      console.log('🔧 Vou criar a tabela agora...');

      // Criar tabela e usuário
      await createUsersTable();
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);

    if (
      error.message.includes('connection') ||
      error.message.includes('refused')
    ) {
      console.log('');
      console.log('🔧 PROBLEMA DE CONEXÃO:');
      console.log('   1. PostgreSQL está rodando?');
      console.log('      brew services start postgresql (macOS)');
      console.log('      sudo service postgresql start (Linux)');
      console.log('');
      console.log('   2. Verifique o .env em apps/api/.env:');
      console.log('      POSTGRES_HOST=localhost');
      console.log('      POSTGRES_PORT=5432');
      console.log('      POSTGRES_USER=seu_usuario');
      console.log('      POSTGRES_PASSWORD=sua_senha');
      console.log('      POSTGRES_DB=nome_do_banco');
    } else if (
      error.message.includes('database') &&
      error.message.includes('does not exist')
    ) {
      console.log('');
      console.log('🔧 BANCO NÃO EXISTE:');
      console.log('   Crie o banco primeiro:');
      console.log(`   createdb ${process.env.POSTGRES_DB || 'poc_db'}`);
    } else if (error.message.includes('psql')) {
      console.log('');
      console.log('🔧 PSQL NÃO ENCONTRADO:');
      console.log('   Instale PostgreSQL client:');
      console.log('   brew install postgresql (macOS)');
      console.log('   apt-get install postgresql-client (Ubuntu)');
    }
  }
}

async function createUsersTable() {
  try {
    console.log('🔨 Criando tabela users...');

    // Criar enum
    await runQuery(`
      DO $$ BEGIN
        CREATE TYPE role_enum AS ENUM ('DIRETOR', 'GERENTE', 'VISUALIZADOR');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Criar tabela
    await runQuery(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        senha VARCHAR(255) NOT NULL,
        role role_enum DEFAULT 'GERENTE' NOT NULL,
        ativo BOOLEAN DEFAULT true NOT NULL,
        "sectorId" INTEGER,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        "lastLoginAt" TIMESTAMP,
        "loginAttempts" INTEGER DEFAULT 0 NOT NULL,
        "lockedUntil" TIMESTAMP,
        "resetPasswordToken" VARCHAR(255),
        "resetPasswordExpires" TIMESTAMP
      );
    `);

    // Criar índices
    await runQuery('CREATE UNIQUE INDEX IDX_users_email ON users(email);');

    console.log('✅ Tabela users criada!');

    // Criar usuário admin
    await createAdminUser();
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error.message);
  }
}

async function createAdminUser() {
  try {
    console.log('👤 Criando usuário admin...');

    // Hash da senha "123456" (bcrypt com salt 12)
    const hashedPassword =
      '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBcQwkO5f6Gxuy';

    await runQuery(`
      INSERT INTO users (nome, email, senha, role, ativo) 
      VALUES ('Administrador Sistema', 'admin@sistema.com', '${hashedPassword}', 'DIRETOR', true)
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log('✅ Usuário admin criado!');
    console.log('');
    console.log('🎉 SISTEMA PRONTO!');
    console.log('🔑 Credenciais de login:');
    console.log('   Email: admin@sistema.com');
    console.log('   Senha: 123456');
    console.log('');
    console.log('🧪 Agora teste no Postman!');
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error.message);
  }
}

// Executar verificação
checkDatabase();
