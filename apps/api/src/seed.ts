// apps/api/src/seed.ts (COM "FURO POR ATRASO" ADICIONADO)
import 'reflect-metadata';
import { AppDataSource } from './database/data-source';
import { AuditLogEntity } from './entity/audit-log.entity';
import { CriterionEntity } from './entity/criterion.entity';
import { ParameterValueEntity } from './entity/parameter-value.entity';
import { PerformanceDataEntity } from './entity/performance-data.entity';
import { RoleEntity } from './entity/role.entity';
import { SectorEntity } from './entity/sector.entity';
import { UserEntity } from './entity/user.entity';

// --- Definição dos Dados Mock ---

const sectorsMock = [
  { id: 1, nome: 'GAMA', ativo: true },
  { id: 2, nome: 'PARANOÁ', ativo: true },
  { id: 3, nome: 'SANTA MARIA', ativo: true },
  { id: 4, nome: 'SÃO SEBASTIÃO', ativo: true },
];

const criteriaMockCorrigido: Partial<CriterionEntity>[] = [
  {
    id: 1,
    nome: 'ATRASO',
    index: 1,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'Qtd',
  },
  {
    id: 2,
    nome: 'FURO POR VIAGEM',
    index: 2,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: '%',
  },
  {
    id: 3,
    nome: 'QUEBRA',
    index: 3,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'Qtd',
  },
  {
    id: 4,
    nome: 'DEFEITO',
    index: 4,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'Qtd',
  },
  {
    id: 5,
    nome: 'FALTA FUNC',
    index: 5,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: '%',
  },
  {
    id: 6,
    nome: 'ATESTADO FUNC',
    index: 10,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: '%',
  },
  {
    id: 7,
    nome: 'COLISÃO',
    index: 7,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'Qtd',
  },
  {
    id: 8,
    nome: 'FALTA FROTA',
    index: 11,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: '%',
  },
  {
    id: 9,
    nome: 'IPK',
    index: 9,
    sentido_melhor: 'MAIOR',
    ativo: true,
    unidade_medida: 'Pass/KM',
  },
  {
    id: 10,
    nome: 'MEDIA KM/L',
    index: 15,
    sentido_melhor: 'MAIOR',
    ativo: true,
    unidade_medida: 'KM/L',
  }, // Index corrigido
  {
    id: 11,
    nome: 'KM OCIOSA',
    index: 16,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: '%',
  }, // Index corrigido
  {
    id: 12,
    nome: 'PEÇAS',
    index: 12,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'R$',
  },
  {
    id: 13,
    nome: 'PNEUS',
    index: 13,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'R$',
  },
  {
    id: 14,
    nome: 'COMBUSTIVEL',
    index: 14,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'R$',
  },
  // --- NOVO CRITÉRIO ---
  {
    id: 15,
    nome: 'FURO POR ATRASO',
    index: 17,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'Qtd',
  }, // Assumi Qtd e MENOR
  // --------------------
];

const rolesMock = [
  { id: 1, nome: 'Admin' },
  { id: 2, nome: 'Viewer' },
];
// Não precisamos recriar usersMock aqui, ele será populado depois

const parametersMock = [
  // Metas existentes...
  {
    nomeParametro: 'META_IPK',
    valor: '3.00',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 9,
    justificativa: 'Meta inicial IPK',
  },
  {
    nomeParametro: 'META_ATRASO',
    valor: '350',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 1,
    sectorId: 1,
    justificativa: 'Meta inicial Atraso GAMA',
  },
  {
    nomeParametro: 'META_ATRASO',
    valor: '320',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 1,
    justificativa: 'Meta inicial Atraso Geral',
  },
  // --- META PARA NOVO CRITÉRIO ---
  {
    nomeParametro: 'META_FURO_ATRASO',
    valor: '5',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 15,
    justificativa: 'Meta inicial Furo por Atraso',
  }, // Assumi meta 5
  // ------------------------------
];

const performanceMock = [
  // Dados existentes...
  { sectorId: 1, criterionId: 1, metricDate: '2025-04-30', valor: 303 }, // Atraso GAMA
  { sectorId: 1, criterionId: 9, metricDate: '2025-04-30', valor: 3.01 }, // IPK GAMA
  { sectorId: 2, criterionId: 1, metricDate: '2025-04-30', valor: 317 }, // Atraso PARANOÁ
  { sectorId: 2, criterionId: 9, metricDate: '2025-04-30', valor: 2.88 }, // IPK PARANOÁ
  { sectorId: 3, criterionId: 1, metricDate: '2025-04-30', valor: 309 }, // Atraso SANTA MARIA
  { sectorId: 3, criterionId: 9, metricDate: '2025-04-30', valor: 2.81 }, // IPK SANTA MARIA
  { sectorId: 4, criterionId: 1, metricDate: '2025-04-30', valor: 706 }, // Atraso SÃO SEBASTIÃO
  { sectorId: 4, criterionId: 9, metricDate: '2025-04-30', valor: 1.78 }, // IPK SÃO SEBASTIÃO
  // --- DADOS PARA NOVO CRITÉRIO (ID 15) ---
  { sectorId: 1, criterionId: 15, metricDate: '2025-04-30', valor: 3 }, // Furo Atraso GAMA
  { sectorId: 2, criterionId: 15, metricDate: '2025-04-30', valor: 6 }, // Furo Atraso PARANOÁ
  { sectorId: 3, criterionId: 15, metricDate: '2025-04-30', valor: 4 }, // Furo Atraso SANTA MARIA
  { sectorId: 4, criterionId: 15, metricDate: '2025-04-30', valor: 7 }, // Furo Atraso SÃO SEBASTIÃO
  // ---------------------------------------
  // Adicionar dados para OUTROS CRITÉRIOS para ter tabelas mais completas!
];

const auditLogsMock = [
  {
    timestamp: new Date().toISOString(),
    userId: 1,
    userName: 'Admin Sistema',
    actionType: 'SEED_EXECUTADO',
    details: { message: 'Banco de dados populado com dados mock iniciais.' },
  },
];

// --- Função para Executar o Seed ---
async function runSeed() {
  console.log('Iniciando script de seed...');
  try {
    console.log('Inicializando DataSource...');
    await AppDataSource.initialize();
    console.log('DataSource inicializado com sucesso!');

    const queryRunner = AppDataSource.createQueryRunner(); // Melhor usar queryRunner para limpar
    const sectorRepo = AppDataSource.getRepository(SectorEntity);
    const criterionRepo = AppDataSource.getRepository(CriterionEntity);
    const roleRepo = AppDataSource.getRepository(RoleEntity);
    const userRepo = AppDataSource.getRepository(UserEntity);
    const parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    const performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    const auditLogRepo = AppDataSource.getRepository(AuditLogEntity);

    console.log('Limpando dados antigos (na ordem correta)...');
    await queryRunner.query('DELETE FROM audit_logs');
    await queryRunner.query('DELETE FROM performance_data');
    await queryRunner.query('DELETE FROM parameter_values');
    await queryRunner.query('DELETE FROM user_roles'); // Limpar tabela de junção
    await queryRunner.query('DELETE FROM users');
    await queryRunner.query('DELETE FROM roles');
    await queryRunner.query('DELETE FROM criteria');
    await queryRunner.query('DELETE FROM sectors');
    // Usar DELETE FROM em vez de clear() ou truncate() é mais seguro com FKs
    // Se usar TRUNCATE, precisaria ser TRUNCATE ... RESTART IDENTITY CASCADE
    console.log('Tabelas limpas (usando DELETE).');

    console.log('Inserindo Setores...');
    await sectorRepo.save(sectorsMock);

    console.log('Inserindo Critérios...');
    await criterionRepo.save(criteriaMockCorrigido); // Usa a lista corrigida

    console.log('Inserindo Perfis...');
    await roleRepo.save(rolesMock);

    console.log('Inserindo Usuários...');
    const adminRole = await roleRepo.findOneByOrFail({ nome: 'Admin' });
    const viewerRole = await roleRepo.findOneByOrFail({ nome: 'Viewer' });
    const createdUsers = await userRepo.save([
      {
        nome: 'Admin Sistema',
        email: 'admin@sistema.com',
        ativo: true,
        roles: [adminRole],
      },
      {
        nome: 'Usuario Comum',
        email: 'user@sistema.com',
        ativo: true,
        roles: [viewerRole],
      },
    ]);
    const adminUser = createdUsers.find((u) => u.email === 'admin@sistema.com');

    console.log('Inserindo Parâmetros...');
    await parameterRepo.save(
      parametersMock.map((p) => ({ ...p, createdByUserId: adminUser?.id }))
    );

    console.log('Inserindo Dados de Desempenho...');
    await performanceRepo.save(performanceMock);

    console.log('Inserindo Logs de Auditoria...');
    await auditLogRepo.save(
      auditLogsMock.map((l) => ({
        ...l,
        userId: adminUser?.id,
        userName: adminUser?.nome,
      }))
    );

    console.log('Seed executado com sucesso!');
  } catch (error) {
    console.error('ERRO durante a execução do seed:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('DataSource finalizado.');
    }
  }
}
// ----------------------------------

// Executa a função
runSeed();
