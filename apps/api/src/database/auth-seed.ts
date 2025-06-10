// apps/api/src/database/auth-seed.ts
import * as argon2 from 'argon2';
import 'reflect-metadata';
import { DeepPartial } from 'typeorm';
import { Permission, RoleEntity } from '../entity/role.entity';
import { SectorEntity } from '../entity/sector.entity';
import { UserEntity } from '../entity/user.entity';
import { AppDataSource } from './data-source';

/**
 * Script para criar usuários e roles iniciais do sistema
 * Execute: npx ts-node src/database/auth-seed.ts
 */

const DEFAULT_PASSWORD = 'Pioneira@2025';

// === ROLES PADRÃO ===
const rolesMock: Omit<DeepPartial<RoleEntity>, 'id'>[] = [
  {
    nome: 'DIRETOR',
    description: 'Controle total do sistema - pode fazer tudo',
    permissions: [
      // Todas as permissões
      Permission.MANAGE_USERS,
      Permission.MANAGE_ROLES,
      Permission.MANAGE_PARAMETERS,
      Permission.CLOSE_PERIODS,
      Permission.START_PERIODS,
      Permission.APPROVE_EXPURGOS,
      Permission.REJECT_EXPURGOS,
      Permission.DELETE_EXPURGOS,
      Permission.MANAGE_SYSTEM_SETTINGS,
      Permission.VIEW_ALL_AUDIT_LOGS,
      Permission.RESOLVE_TIES,
      Permission.REQUEST_EXPURGOS,
      Permission.EDIT_OWN_EXPURGOS,
      Permission.VIEW_REPORTS,
      Permission.VIEW_DETAILED_PERFORMANCE,
      Permission.VIEW_SECTOR_LOGS,
      Permission.VIEW_PARAMETERS,
      Permission.VIEW_RANKINGS,
      Permission.VIEW_PUBLIC_REPORTS,
      Permission.VIEW_OWN_PROFILE,
    ],
    isActive: true,
  },
  {
    nome: 'GERENTE',
    description:
      'Gerente operacional - pode solicitar expurgos e ver relatórios',
    permissions: [
      Permission.REQUEST_EXPURGOS,
      Permission.EDIT_OWN_EXPURGOS,
      Permission.VIEW_REPORTS,
      Permission.VIEW_DETAILED_PERFORMANCE,
      Permission.VIEW_SECTOR_LOGS,
      Permission.VIEW_PARAMETERS,
      Permission.VIEW_RANKINGS,
      Permission.VIEW_PUBLIC_REPORTS,
      Permission.VIEW_OWN_PROFILE,
    ],
    isActive: true,
  },
  {
    nome: 'VISUALIZADOR',
    description: 'Apenas visualização - acesso aos rankings públicos',
    permissions: [
      Permission.VIEW_RANKINGS,
      Permission.VIEW_PUBLIC_REPORTS,
      Permission.VIEW_OWN_PROFILE,
    ],
    isActive: true,
  },
];

// === USUÁRIOS PADRÃO ===
const usersMock = [
  {
    nome: 'Diretor do Sistema',
    email: 'diretor@viacaopioneira.com',
    password: DEFAULT_PASSWORD,
    roles: ['DIRETOR'],
    ativo: true,
    sectorId: null, // Diretor não está limitado a um setor
  },
  {
    nome: 'Gerente Gama',
    email: 'gerente.gama@viacaopioneira.com',
    password: DEFAULT_PASSWORD,
    roles: ['GERENTE'],
    ativo: true,
    sectorId: 1, // GAMA
  },
  {
    nome: 'Gerente Paranoá',
    email: 'gerente.paranoa@viacaopioneira.com',
    password: DEFAULT_PASSWORD,
    roles: ['GERENTE'],
    ativo: true,
    sectorId: 2, // PARANOÁ
  },
  {
    nome: 'Gerente Santa Maria',
    email: 'gerente.santamaria@viacaopioneira.com',
    password: DEFAULT_PASSWORD,
    roles: ['GERENTE'],
    ativo: true,
    sectorId: 3, // SANTA MARIA
  },
  {
    nome: 'Gerente São Sebastião',
    email: 'gerente.saosebastiao@viacaopioneira.com',
    password: DEFAULT_PASSWORD,
    roles: ['GERENTE'],
    ativo: true,
    sectorId: 4, // SÃO SEBASTIÃO
  },
  {
    nome: 'Visualizador Teste',
    email: 'visualizador@viacaopioneira.com',
    password: DEFAULT_PASSWORD,
    roles: ['VISUALIZADOR'],
    ativo: true,
    sectorId: null,
  },
];

async function seedAuth() {
  console.log('🔐 Iniciando seed de autenticação...');

  try {
    // Verificar se já foi inicializado
    if (!AppDataSource.isInitialized) {
      console.log('📦 Inicializando conexão com banco...');
      await AppDataSource.initialize();
    }

    // === 1. CRIAR ROLES ===
    console.log('👥 Criando roles...');
    const roleRepo = AppDataSource.getRepository(RoleEntity);

    const createdRoles = new Map<string, RoleEntity>();

    for (const roleData of rolesMock) {
      // Verificar se role já existe
      let role = await roleRepo.findOne({ where: { nome: roleData.nome } });

      if (!role) {
        role = roleRepo.create(roleData);
        await roleRepo.save(role);
        console.log(
          `  ✅ Role criada: ${role.nome} (${role.permissions.length} permissões)`
        );
      } else {
        // Atualizar permissões se necessário
        role.permissions = roleData.permissions!;
        role.description = roleData.description;
        await roleRepo.save(role);
        console.log(`  🔄 Role atualizada: ${role.nome}`);
      }

      createdRoles.set(role.nome, role);
    }

    // === 2. VERIFICAR SETORES ===
    console.log('🏢 Verificando setores...');
    const sectorRepo = AppDataSource.getRepository(SectorEntity);
    const sectors = await sectorRepo.find();

    if (sectors.length === 0) {
      console.log(
        '  ⚠️ Nenhum setor encontrado! Execute o seed principal primeiro.'
      );
      return;
    }

    console.log(`  ✅ ${sectors.length} setores encontrados`);

    // === 3. CRIAR USUÁRIOS ===
    console.log('👤 Criando usuários...');
    const userRepo = AppDataSource.getRepository(UserEntity);

    for (const userData of usersMock) {
      // Verificar se usuário já existe
      let user = await userRepo.findOne({
        where: { email: userData.email },
        relations: ['roles'],
      });

      if (!user) {
        // Hash da senha
        const passwordHash = await argon2.hash(userData.password);

        // Buscar roles
        const userRoles = userData.roles.map((roleName) => {
          const role = createdRoles.get(roleName);
          if (!role) {
            throw new Error(`Role não encontrada: ${roleName}`);
          }
          return role;
        });

        // Criar usuário
        user = userRepo.create({
          nome: userData.nome,
          email: userData.email,
          passwordHash,
          ativo: userData.ativo,
          sectorId: userData.sectorId,
          roles: userRoles,
        });

        await userRepo.save(user);
        console.log(
          `  ✅ Usuário criado: ${user.email} (${userData.roles.join(', ')})`
        );
      } else {
        console.log(`  🔄 Usuário já existe: ${user.email}`);

        // Atualizar roles se necessário
        const userRoles = userData.roles.map(
          (roleName) => createdRoles.get(roleName)!
        );
        user.roles = userRoles;
        await userRepo.save(user);
      }
    }

    // === 4. ESTATÍSTICAS ===
    console.log('\n📊 Estatísticas finais:');

    const stats = await Promise.all([
      roleRepo.count(),
      userRepo.count(),
      userRepo.count({ where: { ativo: true } }),
      sectorRepo.count(),
    ]);

    console.log(`  👥 Roles: ${stats[0]}`);
    console.log(`  👤 Usuários: ${stats[1]} (${stats[2]} ativos)`);
    console.log(`  🏢 Setores: ${stats[3]}`);

    // === 5. INFORMAÇÕES DE LOGIN ===
    console.log('\n🔑 Credenciais de acesso:');
    console.log('─'.repeat(60));
    console.log(`📧 Email: diretor@viacaopioneira.com`);
    console.log(`🔒 Senha: ${DEFAULT_PASSWORD}`);
    console.log(`👑 Papel: DIRETOR (acesso total)`);
    console.log('─'.repeat(60));
    console.log(`📧 Email: gerente.gama@viacaopioneira.com`);
    console.log(`🔒 Senha: ${DEFAULT_PASSWORD}`);
    console.log(`👨‍💼 Papel: GERENTE (setor GAMA)`);
    console.log('─'.repeat(60));
    console.log(`📧 Email: visualizador@viacaopioneira.com`);
    console.log(`🔒 Senha: ${DEFAULT_PASSWORD}`);
    console.log(`👁️ Papel: VISUALIZADOR (somente leitura)`);
    console.log('─'.repeat(60));

    console.log('\n✅ Seed de autenticação concluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante seed de autenticação:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  seedAuth()
    .then(() => {
      console.log('🎉 Processo finalizado!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha no seed:', error);
      process.exit(1);
    });
}

export { seedAuth };
