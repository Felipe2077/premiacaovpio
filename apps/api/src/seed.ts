// apps/api/src/seed.ts (COM "FURO POR ATRASO" ADICIONADO)
import 'reflect-metadata';
import { AppDataSource } from './database/data-source';
import { AuditLogEntity } from './entity/audit-log.entity';
import { CriterionEntity } from './entity/criterion.entity';
import { ExpurgoEventEntity } from './entity/expurgo-event.entity';
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
// --- Mock de Eventos de Expurgo (Exemplos) ---
// Lembre-se: QUEBRA=3, DEFEITO=4, KM OCIOSA=11 (IDs do criteriaMock)
const expurgosMock: Partial<ExpurgoEventEntity>[] = [
  {
    criterionId: 4, // DEFEITO
    sectorId: 2, // PARANOÁ
    dataEvento: '2025-04-15', // Data do evento expurgado
    descricaoEvento:
      'Defeito no sensor X do veículo Y - Causa externa identificada.',
    justificativa: 'Autorizado por Diretoria em RE-XYZ - Impacto chuva.',
    status: 'APLICADO_MVP',
    registradoPorUserId: 1, // Usuário Admin Sistema
  },
  {
    criterionId: 11, // KM OCIOSA
    sectorId: 4,
    dataEvento: '2025-04-20',
    descricaoEvento: 'Veículo Z ficou parado em bloqueio na via por 2h.',
    justificativa: 'Autorizado por Gerente W - Evento externo comprovado.',
    status: 'APLICADO_MVP',
    registradoPorUserId: 1,
  },
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
  // Log do Seed anterior mantido
  {
    actionType: 'SEED_EXECUTADO',
    details: { message: 'Banco de dados populado com dados mock.' },
  },
  // Exemplo de alteração de parâmetro
  {
    actionType: 'PARAMETRO_ALTERADO',
    entityType: 'ParameterValueEntity', // Tabela/Entidade afetada
    entityId: '1', // ID do registro de parâmetro afetado (exemplo)
    details: {
      // JSON com detalhes
      nomeParametro: 'META_IPK',
      valorAntigo: '2.90',
      valorNovo: '3.00',
      dataInicioEfetivo: '2025-04-01',
    },
    justificativa: 'Ajuste de meta para o Q2 conforme planejamento.',
    // userId e userName serão preenchidos ao salvar
  },
  // Exemplo de Registro de Expurgo
  {
    actionType: 'EXPURGO_REGISTRADO',
    entityType: 'ExpurgoEventEntity',
    entityId: '1', // ID do registro de expurgo criado (exemplo)
    details: {
      criterioNome: 'DEFEITO', // Nome do critério para clareza no log
      setorNome: 'PARANOÁ', // Nome do setor
      dataEvento: '2025-04-15',
    },
    justificativa: 'Autorizado por Diretoria em RE-XYZ - Impacto chuva.',
  },
  // Exemplo de Login (poderia ser adicionado pela lógica de auth real)
  // { actionType: 'LOGIN_SUCESSO', userId: 2, userName: 'Usuario Comum', ipAddress: '192.168.1.100' }
];

// --- Função para Executar o Seed ---
async function runSeed() {
  console.log('Iniciando script de seed...');
  try {
    console.log('Inicializando DataSource...');
    await AppDataSource.initialize();
    console.log('DataSource inicializado com sucesso!');

    // Pegar Repositórios
    const queryRunner = AppDataSource.createQueryRunner();
    const sectorRepo = AppDataSource.getRepository(SectorEntity);
    const criterionRepo = AppDataSource.getRepository(CriterionEntity);
    const roleRepo = AppDataSource.getRepository(RoleEntity);
    const userRepo = AppDataSource.getRepository(UserEntity);
    const parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    const performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    const auditLogRepo = AppDataSource.getRepository(AuditLogEntity);
    const expurgoEventRepo = AppDataSource.getRepository(ExpurgoEventEntity); // <-- Novo Repo

    // Limpar tabelas na ordem inversa de dependência
    console.log('Limpando dados antigos (na ordem correta)...');
    // Limpar tabelas que podem referenciar outras primeiro
    await queryRunner.query('DELETE FROM expurgo_events'); // <-- Limpar Expurgos
    await queryRunner.query('DELETE FROM audit_logs');
    await queryRunner.query('DELETE FROM performance_data');
    await queryRunner.query('DELETE FROM parameter_values');
    await queryRunner.query('DELETE FROM user_roles');
    // Limpar tabelas referenciadas
    await queryRunner.query('DELETE FROM users');
    await queryRunner.query('DELETE FROM roles');
    await queryRunner.query('DELETE FROM criteria');
    await queryRunner.query('DELETE FROM sectors');
    console.log('Tabelas limpas (usando DELETE).');

    // Inserir Dados Mock
    console.log('Inserindo Setores...');
    await sectorRepo.save(sectorsMock);

    console.log('Inserindo Critérios...');
    await criterionRepo.save(criteriaMockCorrigido); // Usa a lista com 'FURO POR ATRASO'

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
    const adminUserId = adminUser?.id || 1; // Garante um ID para FKs
    const adminUserName = adminUser?.nome || 'Admin Sistema';

    console.log('Inserindo Parâmetros...');
    await parameterRepo.save(
      parametersMock.map((p) => ({ ...p, createdByUserId: adminUserId }))
    );

    console.log('Inserindo Dados de Desempenho...');
    await performanceRepo.save(performanceMock);

    // --- INSERIR EXPURGOS ---
    console.log('Inserindo Eventos de Expurgo Mock...');
    await expurgoEventRepo.save(
      expurgosMock.map((e) => ({ ...e, registradoPorUserId: adminUserId }))
    );
    // -------------------------

    console.log('Inserindo Logs de Auditoria...');
    // Atribui userId/userName aos logs mock que não os têm
    await auditLogRepo.save(
      auditLogsMock.map((l) => ({
        ...l, // 1. Espalha as propriedades que JÁ EXISTEM em 'l' (actionType, details, etc.)
        // 2. Define userId: usa l.userId SE EXISTIR, senão usa adminUserId
        userId: (l as any).userId ?? adminUserId, // Usar 'as any' aqui ou definir um tipo para o mock
        // 3. Define userName: usa l.userName SE EXISTIR, senão usa adminUserName
        userName: (l as any).userName ?? adminUserName,
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
