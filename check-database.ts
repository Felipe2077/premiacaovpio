// check-database.ts - Executar na raiz do projeto

import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
import { AppDataSource } from './apps/api/src/database/data-source';

// Carregar .env da API
const envPath = path.resolve(__dirname, 'apps/api/.env');
dotenv.config({ path: envPath });

async function checkDatabaseStructure() {
  console.log('🔍 Verificando estrutura do banco de dados...');
  console.log('');

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Banco conectado');
    }

    const queryRunner = AppDataSource.createQueryRunner();

    // Verificar se tabela users existe
    console.log('📊 Verificando tabela users...');

    const usersTableExists = await queryRunner.hasTable('users');
    console.log(
      `   Tabela users existe: ${usersTableExists ? '✅ SIM' : '❌ NÃO'}`
    );

    if (usersTableExists) {
      // Verificar colunas da tabela users
      const usersTable = await queryRunner.getTable('users');
      console.log('   Colunas encontradas:');

      usersTable?.columns.forEach((column) => {
        console.log(
          `     - ${column.name}: ${column.type} ${column.isNullable ? '(nullable)' : '(not null)'}`
        );
      });

      // Verificar se há usuários cadastrados
      const userCount = await queryRunner.query(
        'SELECT COUNT(*) as count FROM users'
      );
      console.log(`   Usuários cadastrados: ${userCount[0].count}`);

      if (userCount[0].count > 0) {
        const users = await queryRunner.query(
          'SELECT id, nome, email, role, ativo FROM users LIMIT 5'
        );
        console.log('   Primeiros usuários:');
        users.forEach((user: any) => {
          console.log(
            `     ${user.id}: ${user.nome} (${user.email}) - ${user.role} - ${user.ativo ? 'Ativo' : 'Inativo'}`
          );
        });
      }
    }

    console.log('');
    console.log('📊 Verificando outras tabelas importantes...');

    // Verificar outras tabelas essenciais
    const tablesToCheck = [
      'competition_periods',
      'sectors',
      'criteria',
      'parameter_values',
      'expurgo_events',
    ];

    for (const tableName of tablesToCheck) {
      const exists = await queryRunner.hasTable(tableName);
      console.log(`   ${tableName}: ${exists ? '✅ Existe' : '❌ Não existe'}`);

      if (exists) {
        const count = await queryRunner.query(
          `SELECT COUNT(*) as count FROM ${tableName}`
        );
        console.log(`     Registros: ${count[0].count}`);
      }
    }

    await queryRunner.release();

    console.log('');
    console.log('📋 DIAGNÓSTICO:');

    if (!usersTableExists) {
      console.log('❌ Tabela users não existe - precisa criar');
      console.log('   Solução: Execute o script de migration ou sincronização');
    } else {
      console.log('✅ Tabela users existe');

      const userCount = await AppDataSource.query(
        'SELECT COUNT(*) as count FROM users'
      );
      if (userCount[0].count === 0) {
        console.log('⚠️  Nenhum usuário cadastrado - precisa popular');
        console.log('   Solução: Execute o script seed-users.ts');
      } else {
        console.log('✅ Usuários cadastrados - pronto para login!');
      }
    }
  } catch (error: any) {
    console.error('❌ Erro ao verificar banco:', error);

    if (error?.message?.includes('connect')) {
      console.log('');
      console.log('🔧 DICA: Verifique se:');
      console.log('   1. PostgreSQL está rodando');
      console.log('   2. Credenciais no .env estão corretas');
      console.log('   3. Banco de dados foi criado');
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔐 Conexão fechada');
    }
  }
}

checkDatabaseStructure();
