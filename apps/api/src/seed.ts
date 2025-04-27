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

// Removido IDs hardcoded
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
];

const performanceMock: DeepPartial<PerformanceDataEntity>[] = [
  { sectorId: 1, criterionId: 1, metricDate: '2025-04-30', valor: 303 },
  { sectorId: 1, criterionId: 9, metricDate: '2025-04-30', valor: 3.01 },
  { sectorId: 1, criterionId: 15, metricDate: '2025-04-30', valor: 3 },
  { sectorId: 2, criterionId: 1, metricDate: '2025-04-30', valor: 317 },
  { sectorId: 2, criterionId: 9, metricDate: '2025-04-30', valor: 2.88 },
  { sectorId: 2, criterionId: 15, metricDate: '2025-04-30', valor: 6 },
  { sectorId: 3, criterionId: 1, metricDate: '2025-04-30', valor: 309 },
  { sectorId: 3, criterionId: 9, metricDate: '2025-04-30', valor: 2.81 },
  { sectorId: 3, criterionId: 15, metricDate: '2025-04-30', valor: 4 },
  { sectorId: 4, criterionId: 1, metricDate: '2025-04-30', valor: 706 },
  { sectorId: 4, criterionId: 9, metricDate: '2025-04-30', valor: 1.78 },
  { sectorId: 4, criterionId: 15, metricDate: '2025-04-30', valor: 7 },
  // Adicionar mais dados de performance para outros critérios (IDs 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14) para todas as 4 filiais para ter dados completos
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
