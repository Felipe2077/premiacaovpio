// apps/api/src/seed.ts (VERSÃO INTEGRAL FINAL - SEM CÓDIGO COMENTADO)
import 'reflect-metadata';
import { DeepPartial } from 'typeorm';
import { AppDataSource } from './database/data-source';
import { AuditLogEntity } from './entity/audit-log.entity';
import { CriterionEntity } from './entity/criterion.entity';
import { ExpurgoEventEntity } from './entity/expurgo-event.entity'; // Importar tipo ExpurgoStatus
import { ParameterValueEntity } from './entity/parameter-value.entity';
import { PerformanceDataEntity } from './entity/performance-data.entity';
import { RoleEntity } from './entity/role.entity';
import { SectorEntity } from './entity/sector.entity';
import { UserEntity } from './entity/user.entity';

// --- Definição dos Dados Mock ---

const sectorsMock: DeepPartial<SectorEntity>[] = [
  { nome: 'GAMA', ativo: true },
  { nome: 'PARANOÁ', ativo: true },
  { nome: 'SANTA MARIA', ativo: true },
  { nome: 'SÃO SEBASTIÃO', ativo: true },
];

const criteriaMockCorrigido: DeepPartial<CriterionEntity>[] = [
  // Garantindo que todos os IDs e Indexes estão aqui e são únicos
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
  },
  {
    id: 11,
    nome: 'KM OCIOSA',
    index: 16,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: '%',
  },
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
  {
    id: 15,
    nome: 'FURO POR ATRASO',
    index: 17,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'Qtd',
  },
];

const rolesMock: DeepPartial<RoleEntity>[] = [
  { nome: 'Admin' },
  { nome: 'Viewer' },
];

// Tipo auxiliar para mock de log
interface AuditLogMockInput {
  actionType: string;
  details?: Record<string, any>;
  entityType?: string;
  entityId?: string | number;
  justificativa?: string;
  userId?: number;
  userName?: string;
}
const auditLogsMock: AuditLogMockInput[] = [
  {
    actionType: 'SEED_EXECUTADO',
    details: { message: 'Banco de dados populado com dados mock.' },
  },
  {
    actionType: 'PARAMETRO_ALTERADO',
    entityType: 'ParameterValueEntity',
    entityId: '1', // Assume ID 1 existe
    details: {
      nomeParametro: 'META_IPK',
      valorAntigo: '2.90',
      valorNovo: '3.00',
      dataInicioEfetivo: '2025-04-01',
    },
    justificativa: 'Ajuste de meta para o Q2 conforme planejamento.',
  },
  {
    actionType: 'EXPURGO_REGISTRADO',
    entityType: 'ExpurgoEventEntity',
    entityId: '1', // Assume ID 1 existe
    details: {
      criterioNome: 'DEFEITO',
      setorNome: 'PARANOÁ',
      dataEvento: '2025-04-15',
    },
    justificativa: 'Autorizado por Diretoria em RE-XYZ - Impacto chuva.',
  },
];

const parametersMock: DeepPartial<ParameterValueEntity>[] = [
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
  {
    nomeParametro: 'META_FURO_ATRASO',
    valor: '5',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 15,
    justificativa: 'Meta inicial Furo por Atraso',
  },
  {
    nomeParametro: 'META_FURO_VIAGEM',
    valor: '1.5',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 2,
    justificativa: 'Meta Furo Viagem (%)',
  },
  {
    nomeParametro: 'META_QUEBRA',
    valor: '2',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 3,
    justificativa: 'Meta Quebras (Qtd)',
  },
  {
    nomeParametro: 'META_DEFEITO',
    valor: '15',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 4,
    justificativa: 'Meta Defeitos (Qtd)',
  },
  {
    nomeParametro: 'META_FALTA_FUNC',
    valor: '3.0',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 5,
    justificativa: 'Meta Falta Func (%)',
  },
  {
    nomeParametro: 'META_ATESTADO_FUNC',
    valor: '5.0',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 6,
    justificativa: 'Meta Atestado Func (%)',
  },
  {
    nomeParametro: 'META_COLISAO',
    valor: '0',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 7,
    justificativa: 'Meta Colisões (Qtd)',
  },
  {
    nomeParametro: 'META_FALTA_FROTA',
    valor: '1.0',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 8,
    justificativa: 'Meta Falta Frota (%)',
  },
  {
    nomeParametro: 'META_MEDIA_KM_L',
    valor: '2.5',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 10,
    justificativa: 'Meta Média KM/L',
  },
  {
    nomeParametro: 'META_KM_OCIOSA',
    valor: '10.0',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 11,
    justificativa: 'Meta KM Ociosa (%)',
  },
  {
    nomeParametro: 'META_PECAS',
    valor: '20000',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 12,
    justificativa: 'Meta Peças (R$)',
  },
  {
    nomeParametro: 'META_PNEUS',
    valor: '10000',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 13,
    justificativa: 'Meta Pneus (R$)',
  },
  {
    nomeParametro: 'META_COMBUSTIVEL',
    valor: '90000',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 14,
    justificativa: 'Meta Combustível (R$)',
  },
];

const performanceMock: DeepPartial<PerformanceDataEntity>[] = [
  // --- GAMA (sectorId: 1) ---
  { sectorId: 1, criterionId: 1, metricDate: '2025-04-30', valor: 303 }, // Atraso (Meta 350, MENOR) -> BOM
  { sectorId: 1, criterionId: 2, metricDate: '2025-04-30', valor: 1.2 }, // Furo Viagem (Meta 1.5, MENOR) -> BOM
  { sectorId: 1, criterionId: 3, metricDate: '2025-04-30', valor: 1 }, // Quebra (Meta 2, MENOR) -> BOM
  { sectorId: 1, criterionId: 4, metricDate: '2025-04-30', valor: 10 }, // Defeito (Meta 15, MENOR) -> BOM
  { sectorId: 1, criterionId: 5, metricDate: '2025-04-30', valor: 2.5 }, // Falta Func (Meta 3.0, MENOR) -> BOM
  { sectorId: 1, criterionId: 6, metricDate: '2025-04-30', valor: 4.0 }, // Atestado (Meta 5.0, MENOR) -> BOM
  { sectorId: 1, criterionId: 7, metricDate: '2025-04-30', valor: 0 }, // Colisao (Meta 0, MENOR) -> BOM
  { sectorId: 1, criterionId: 8, metricDate: '2025-04-30', valor: 0.5 }, // Falta Frota (Meta 1.0, MENOR) -> BOM
  { sectorId: 1, criterionId: 9, metricDate: '2025-04-30', valor: 3.01 }, // IPK (Meta 3.00, MAIOR) -> BOM
  { sectorId: 1, criterionId: 10, metricDate: '2025-04-30', valor: 2.6 }, // Media KM/L (Meta 2.5, MAIOR) -> BOM
  { sectorId: 1, criterionId: 11, metricDate: '2025-04-30', valor: 9.0 }, // KM Ociosa (Meta 10.0, MENOR) -> BOM
  { sectorId: 1, criterionId: 12, metricDate: '2025-04-30', valor: 18500 }, // Peças (Meta 20k, MENOR) -> BOM
  { sectorId: 1, criterionId: 13, metricDate: '2025-04-30', valor: 9800 }, // Pneus (Meta 10k, MENOR) -> BOM
  { sectorId: 1, criterionId: 14, metricDate: '2025-04-30', valor: 88000 }, // Combustivel (Meta 90k, MENOR) -> BOM
  { sectorId: 1, criterionId: 15, metricDate: '2025-04-30', valor: 3 }, // Furo Atraso (Meta 5, MENOR) -> BOM

  // --- PARANOÁ (sectorId: 2) ---
  { sectorId: 2, criterionId: 1, metricDate: '2025-04-30', valor: 317 }, // Atraso (Meta 320, MENOR) -> OK
  { sectorId: 2, criterionId: 2, metricDate: '2025-04-30', valor: 1.6 }, // Furo Viagem (Meta 1.5, MENOR) -> RUIM
  { sectorId: 2, criterionId: 3, metricDate: '2025-04-30', valor: 2 }, // Quebra (Meta 2, MENOR) -> OK
  { sectorId: 2, criterionId: 4, metricDate: '2025-04-30', valor: 12 }, // Defeito (Meta 15, MENOR) -> BOM
  { sectorId: 2, criterionId: 5, metricDate: '2025-04-30', valor: 3.1 }, // Falta Func (Meta 3.0, MENOR) -> RUIM
  { sectorId: 2, criterionId: 6, metricDate: '2025-04-30', valor: 5.5 }, // Atestado (Meta 5.0, MENOR) -> RUIM
  { sectorId: 2, criterionId: 7, metricDate: '2025-04-30', valor: 0 }, // Colisao (Meta 0, MENOR) -> BOM
  { sectorId: 2, criterionId: 8, metricDate: '2025-04-30', valor: 1.1 }, // Falta Frota (Meta 1.0, MENOR) -> RUIM
  { sectorId: 2, criterionId: 9, metricDate: '2025-04-30', valor: 2.88 }, // IPK (Meta 3.00, MAIOR) -> RUIM
  { sectorId: 2, criterionId: 10, metricDate: '2025-04-30', valor: 2.4 }, // Media KM/L (Meta 2.5, MAIOR) -> RUIM
  { sectorId: 2, criterionId: 11, metricDate: '2025-04-30', valor: 10.5 }, // KM Ociosa (Meta 10.0, MENOR) -> RUIM
  { sectorId: 2, criterionId: 12, metricDate: '2025-04-30', valor: 21000 }, // Peças (Meta 20k, MENOR) -> RUIM
  { sectorId: 2, criterionId: 13, metricDate: '2025-04-30', valor: 11000 }, // Pneus (Meta 10k, MENOR) -> RUIM
  { sectorId: 2, criterionId: 14, metricDate: '2025-04-30', valor: 92500 }, // Combustivel (Meta 90k, MENOR) -> RUIM
  { sectorId: 2, criterionId: 15, metricDate: '2025-04-30', valor: 6 }, // Furo Atraso (Meta 5, MENOR) -> RUIM

  // --- SANTA MARIA (sectorId: 3) --- (Valores intermediários)
  { sectorId: 3, criterionId: 1, metricDate: '2025-04-30', valor: 309 }, // Atraso (Meta 320) -> BOM
  { sectorId: 3, criterionId: 2, metricDate: '2025-04-30', valor: 1.4 }, // Furo % (Meta 1.5) -> BOM
  { sectorId: 3, criterionId: 3, metricDate: '2025-04-30', valor: 3 }, // Quebra (Meta 2) -> RUIM
  { sectorId: 3, criterionId: 4, metricDate: '2025-04-30', valor: 18 }, // Defeito (Meta 15) -> RUIM
  { sectorId: 3, criterionId: 5, metricDate: '2025-04-30', valor: 2.8 }, // Falta % (Meta 3.0) -> BOM
  { sectorId: 3, criterionId: 6, metricDate: '2025-04-30', valor: 4.8 }, // Atestado % (Meta 5.0) -> BOM
  { sectorId: 3, criterionId: 7, metricDate: '2025-04-30', valor: 1 }, // Colisao (Meta 0) -> RUIM
  { sectorId: 3, criterionId: 8, metricDate: '2025-04-30', valor: 0.8 }, // Falta % (Meta 1.0) -> BOM
  { sectorId: 3, criterionId: 9, metricDate: '2025-04-30', valor: 2.81 }, // IPK (Meta 3.00) -> RUIM
  { sectorId: 3, criterionId: 10, metricDate: '2025-04-30', valor: 2.55 }, // Media KM/L (Meta 2.5) -> BOM
  { sectorId: 3, criterionId: 11, metricDate: '2025-04-30', valor: 11.0 }, // KM Ociosa (Meta 10.0) -> RUIM
  { sectorId: 3, criterionId: 12, metricDate: '2025-04-30', valor: 19500 }, // Peças (Meta 20k) -> BOM
  { sectorId: 3, criterionId: 13, metricDate: '2025-04-30', valor: 12000 }, // Pneus (Meta 10k) -> RUIM
  { sectorId: 3, criterionId: 14, metricDate: '2025-04-30', valor: 89000 }, // Combustivel (Meta 90k) -> BOM
  { sectorId: 3, criterionId: 15, metricDate: '2025-04-30', valor: 4 }, // Furo Atraso (Meta 5) -> BOM

  // --- SÃO SEBASTIÃO (sectorId: 4) --- (Valores geralmente 'ruins' para teste)
  { sectorId: 4, criterionId: 1, metricDate: '2025-04-30', valor: 706 }, // Atraso (Meta 320) -> RUIM
  { sectorId: 4, criterionId: 2, metricDate: '2025-04-30', valor: 2.0 }, // Furo % (Meta 1.5) -> RUIM
  { sectorId: 4, criterionId: 3, metricDate: '2025-04-30', valor: 4 }, // Quebra (Meta 2) -> RUIM
  { sectorId: 4, criterionId: 4, metricDate: '2025-04-30', valor: 20 }, // Defeito (Meta 15) -> RUIM
  { sectorId: 4, criterionId: 5, metricDate: '2025-04-30', valor: 4.0 }, // Falta % (Meta 3.0) -> RUIM
  { sectorId: 4, criterionId: 6, metricDate: '2025-04-30', valor: 6.0 }, // Atestado % (Meta 5.0) -> RUIM
  { sectorId: 4, criterionId: 7, metricDate: '2025-04-30', valor: 1 }, // Colisao (Meta 0) -> RUIM
  { sectorId: 4, criterionId: 8, metricDate: '2025-04-30', valor: 1.5 }, // Falta % (Meta 1.0) -> RUIM
  { sectorId: 4, criterionId: 9, metricDate: '2025-04-30', valor: 1.78 }, // IPK (Meta 3.00) -> RUIM
  { sectorId: 4, criterionId: 10, metricDate: '2025-04-30', valor: 2.3 }, // Media KM/L (Meta 2.5) -> RUIM
  { sectorId: 4, criterionId: 11, metricDate: '2025-04-30', valor: 12.5 }, // KM Ociosa (Meta 10.0) -> RUIM
  { sectorId: 4, criterionId: 12, metricDate: '2025-04-30', valor: 25000 }, // Peças (Meta 20k) -> RUIM
  { sectorId: 4, criterionId: 13, metricDate: '2025-04-30', valor: 15000 }, // Pneus (Meta 10k) -> RUIM
  { sectorId: 4, criterionId: 14, metricDate: '2025-04-30', valor: 99000 }, // Combustivel (Meta 90k) -> RUIM
  { sectorId: 4, criterionId: 15, metricDate: '2025-04-30', valor: 7 }, // Furo Atraso (Meta 5) -> RUIM
];

// Tipagem explícita aqui também
const expurgosMock: DeepPartial<ExpurgoEventEntity>[] = [
  {
    criterionId: 4,
    sectorId: 2,
    dataEvento: '2025-04-15',
    descricaoEvento: 'Defeito sensor X - Causa externa.',
    justificativa: 'Autorizado por Diretoria em RE-XYZ - Impacto chuva.',
    status: 'APROVADO', // Usa um tipo válido de ExpurgoStatus
    // aprovadoPorUserId e justificativaAprovacao poderiam ser preenchidos aqui
  },
  {
    criterionId: 11,
    sectorId: 3,
    dataEvento: '2025-04-20',
    descricaoEvento: 'Veículo Z parado em bloqueio na via.',
    justificativa: 'Autorizado por Gerente W - Evento externo comprovado.',
    status: 'PENDENTE', // Usa um tipo válido
  },
  {
    criterionId: 3,
    sectorId: 1,
    dataEvento: '2025-04-10',
    descricaoEvento: 'Quebra por vandalismo.',
    justificativa: 'Solicitado - Vandalismo BO anexo.',
    status: 'REJEITADO', // Usa um tipo válido
    justificativaAprovacao:
      'Vandalismo não coberto pela política de expurgo atual.',
    // aprovadoPorUserId poderia ser preenchido
  },
];

// --- Função para Executar o Seed ---
async function runSeed() {
  console.log('Iniciando script de seed...');
  let connectionInitialized = false; // Flag para controle
  try {
    console.log('Inicializando DataSource...');
    // Garante que só inicializa uma vez
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      connectionInitialized = true;
    } else {
      console.log('DataSource já estava inicializado.');
    }
    console.log('DataSource pronto para uso!');

    // Pegar Repositórios
    const queryRunner = AppDataSource.createQueryRunner();
    const sectorRepo = AppDataSource.getRepository(SectorEntity);
    const criterionRepo = AppDataSource.getRepository(CriterionEntity);
    const roleRepo = AppDataSource.getRepository(RoleEntity);
    const userRepo = AppDataSource.getRepository(UserEntity);
    const parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    const performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    const auditLogRepo = AppDataSource.getRepository(AuditLogEntity);
    const expurgoEventRepo = AppDataSource.getRepository(ExpurgoEventEntity);

    // Limpar tabelas na ordem inversa de dependência
    console.log('Limpando dados antigos (na ordem correta)...');
    await queryRunner.query('DELETE FROM expurgo_events');
    await queryRunner.query('DELETE FROM audit_logs');
    await queryRunner.query('DELETE FROM performance_data');
    await queryRunner.query('DELETE FROM parameter_values');
    await queryRunner.query('DELETE FROM user_roles');
    await queryRunner.query('DELETE FROM users');
    await queryRunner.query('DELETE FROM roles');
    await queryRunner.query('DELETE FROM criteria');
    await queryRunner.query('DELETE FROM sectors');
    console.log('Tabelas limpas (usando DELETE).');

    // Inserir Dados Mock e LOGAR resultados
    console.log('Inserindo Setores...');
    const savedSectors = await sectorRepo.save(sectorsMock);
    console.log(` -> ${savedSectors.length} setores salvos.`);

    console.log('Inserindo Critérios...');
    const savedCriteria = await criterionRepo.save(criteriaMockCorrigido);
    console.log(
      ` -> ${savedCriteria.length} critérios salvos. ID 9 salvo? ${savedCriteria.some((c) => c.id === 9)}`
    ); // Verifica se ID 9 está nos salvos

    console.log('Inserindo Perfis...');
    const savedRoles = await roleRepo.save(rolesMock); // Salva sem ID hardcoded
    console.log(` -> ${savedRoles.length} perfis salvos.`);
    const adminRole = savedRoles.find((r) => r.nome === 'Admin');
    const viewerRole = savedRoles.find((r) => r.nome === 'Viewer');
    if (!adminRole || !viewerRole)
      throw new Error('Roles Admin/Viewer não encontrados após save!');

    console.log('Inserindo Usuários...');
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
    console.log(` -> ${createdUsers.length} usuários salvos.`);
    const adminUser = createdUsers.find((u) => u.email === 'admin@sistema.com');
    const adminUserId = adminUser?.id;
    const adminUserName = adminUser?.nome;
    if (!adminUserId || !adminUserName)
      throw new Error('Admin user não encontrado após save!');

    console.log('Inserindo Parâmetros...');
    // Garantir que createdByUserId é number, não undefined
    const paramsToSave = parametersMock.map((p) => ({
      ...p,
      createdByUserId: adminUserId,
    }));
    const savedParams = await parameterRepo.save(paramsToSave);
    console.log(` -> ${savedParams.length} parâmetros salvos.`);

    console.log('Inserindo Dados de Desempenho...');
    const savedPerf = await performanceRepo.save(performanceMock);
    console.log(` -> ${savedPerf.length} registros de desempenho salvos.`);

    console.log('Inserindo Eventos de Expurgo Mock...');
    // Garantir que registradoPorUserId é number
    const expurgosToSave = expurgosMock.map((e) => ({
      ...e,
      registradoPorUserId: adminUserId,
    }));
    const savedExpurgos = await expurgoEventRepo.save(expurgosToSave);
    console.log(` -> ${savedExpurgos.length} expurgos salvos.`);

    console.log('Inserindo Logs de Auditoria...');
    // Mapeamento mais seguro para logs
    const logsToSave = auditLogsMock.map((l) => {
      const logEntry: DeepPartial<AuditLogEntity> = {
        ...l, // Espalha as props compatíveis primeiro
        // Converte entityId para string explicitamente se existir, senão undefined
        entityId:
          l.entityId !== undefined && l.entityId !== null
            ? String(l.entityId)
            : undefined,
        // Define defaults para userId e userName
        userId: l.userId ?? adminUserId,
        userName: l.userName ?? adminUserName,
      };
      return logEntry;
    });
    const savedLogs = await auditLogRepo.save(logsToSave);
    console.log(` -> ${savedLogs.length} logs salvos.`);

    console.log('Seed executado com sucesso!');
  } catch (error) {
    console.error('ERRO durante a execução do seed:', error);
  } finally {
    // Só destrói se este script inicializou a conexão
    if (connectionInitialized && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('DataSource finalizado.');
    } else if (AppDataSource.isInitialized) {
      // Se foi inicializado externamente, não destruir aqui? Ou sempre destruir?
      // Vamos manter o destroy por enquanto para garantir limpeza.
      await AppDataSource.destroy();
      console.log('DataSource (pré-existente?) finalizado.');
    }
  }
}
// ----------------------------------

// Executa a função
runSeed();
