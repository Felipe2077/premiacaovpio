// seed-users.ts - Executar na raiz do projeto

import * as dotenv from 'dotenv';
import path from 'path';
import 'reflect-metadata';
import { AppDataSource } from './apps/api/src/database/data-source';
import { SectorEntity } from './apps/api/src/entity/sector.entity';
import { UserEntity } from './apps/api/src/entity/user.entity';
import { Role } from './packages/shared-types/dist/enums/permission.enum';

// Carregar .env da API
const envPath = path.resolve(__dirname, 'apps/api/.env');
dotenv.config({ path: envPath });

async function seedUsers() {
  console.log('🌱 Iniciando seed de usuários...');

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Banco conectado');
    }

    const userRepository = AppDataSource.getRepository(UserEntity);
    const sectorRepository = AppDataSource.getRepository(SectorEntity);

    // Buscar alguns setores para associar aos gerentes
    const setores = await sectorRepository.find({ take: 3 });

    // Usuários a serem criados
    const usersToCreate = [
      {
        nome: 'Administrador Sistema',
        email: 'admin@sistema.com',
        senha: '123456',
        role: Role.DIRETOR,
        ativo: true,
        sectorId: null, // Admin não tem setor específico
      },
      {
        nome: 'Diretor Geral',
        email: 'diretor@viacao.com',
        senha: 'diretor123',
        role: Role.DIRETOR,
        ativo: true,
        sectorId: null,
      },
      {
        nome: 'Gerente Gama',
        email: 'gerente.gama@viacao.com',
        senha: 'gerente123',
        role: Role.GERENTE,
        ativo: true,
        sectorId: setores.find((s) => s.nome === 'GAMA')?.id || null,
      },
      {
        nome: 'Gerente Paranoá',
        email: 'gerente.paranoa@viacao.com',
        senha: 'gerente123',
        role: Role.GERENTE,
        ativo: true,
        sectorId: setores.find((s) => s.nome === 'PARANOÁ')?.id || null,
      },
      {
        nome: 'Gerente Norte',
        email: 'gerente.norte@viacao.com',
        senha: 'gerente123',
        role: Role.GERENTE,
        ativo: true,
        sectorId: setores.find((s) => s.nome === 'NORTE')?.id || null,
      },
    ];

    console.log('\n📋 Criando usuários...\n');

    for (const userData of usersToCreate) {
      // Verificar se usuário já existe
      const existingUser = await userRepository.findOne({
        where: { email: userData.email },
      });

      if (existingUser) {
        console.log(`⚠️  Usuário ${userData.email} já existe - pulando`);
        continue;
      }

      // Criar novo usuário (senha será hasheada automaticamente pelo BeforeInsert)
      const newUser = userRepository.create(userData);
      await userRepository.save(newUser);

      console.log(`✅ Usuário criado: ${userData.email}`);
      console.log(`   Nome: ${userData.nome}`);
      console.log(`   Role: ${userData.role}`);
      console.log(
        `   Setor: ${userData.sectorId ? `ID ${userData.sectorId}` : 'Nenhum'}`
      );
      console.log('');
    }

    console.log('🎉 Seed de usuários concluído!');
    console.log('');
    console.log('📝 Credenciais para teste:');
    console.log('');

    usersToCreate.forEach((user) => {
      console.log(`👤 ${user.nome}:`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Senha: ${user.senha}`);
      console.log(`   Role: ${user.role}`);
      console.log('');
    });

    console.log('🧪 Teste no Postman com qualquer uma das credenciais acima!');
  } catch (error) {
    console.error('❌ Erro no seed de usuários:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('🔐 Conexão fechada');
    }
  }
}

seedUsers();
