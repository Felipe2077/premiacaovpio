// apps/api/src/seed.ts
import 'reflect-metadata';
import { AppDataSource } from './database/data-source'; // Ajuste o caminho se necessário
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

const criteriaMock: Partial<CriterionEntity>[] = [
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
  }, // Mudei para 15 (ou outro número único)

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
];

// Exemplo de usuário e perfil
const rolesMock = [
  { id: 1, nome: 'Admin' },
  { id: 2, nome: 'Viewer' },
];
const usersMock = [
  {
    id: 1,
    nome: 'Admin Sistema',
    email: 'admin@sistema.com',
    ativo: true,
    roles: [rolesMock[0]],
  },
]; // Senha não necessária para seed

// Exemplo de parâmetros (METAS para Abril/2025) - VALORES CHUTADOS! Ajuste conforme necessário
const parametersMock = [
  // Meta IPK (Critério 9) - Geral
  {
    nomeParametro: 'META_IPK',
    valor: '3.00',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 9,
    justificativa: 'Meta inicial IPK',
  },
  // Meta Atraso (Critério 1) - Específico GAMA
  {
    nomeParametro: 'META_ATRASO',
    valor: '350',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 1,
    sectorId: 1,
    justificativa: 'Meta inicial Atraso GAMA',
  },
  // Meta Atraso (Critério 1) - Geral (para os outros setores)
  {
    nomeParametro: 'META_ATRASO',
    valor: '320',
    dataInicioEfetivo: '2025-04-01',
    dataFimEfetivo: null,
    criterionId: 1,
    justificativa: 'Meta inicial Atraso Geral',
  },
  // Adicionar mais metas para outros critérios...
  // Exemplo de Fator de Ajuste (se decidir parametrizar)
  // { nomeParametro: 'AJUSTE_DEFEITO_PARANOA_ABR25', valor: '-1', dataInicioEfetivo: '2025-04-01', dataFimEfetivo: '2025-04-30', criterionId: 4, sectorId: 2, justificativa: 'Ajuste pontual parametrizado' },
];

// Exemplo de Dados de Desempenho (Abril/2025) - VALORES CHUTADOS! Ajuste para gerar um ranking legal
const performanceMock = [
  // GAMA (sectorId: 1)
  { sectorId: 1, criterionId: 1, metricDate: '2025-04-30', valor: 303 }, // Atraso
  { sectorId: 1, criterionId: 9, metricDate: '2025-04-30', valor: 3.01 }, // IPK
  // PARANOÁ (sectorId: 2)
  { sectorId: 2, criterionId: 1, metricDate: '2025-04-30', valor: 317 }, // Atraso
  { sectorId: 2, criterionId: 9, metricDate: '2025-04-30', valor: 2.88 }, // IPK
  // SANTA MARIA (sectorId: 3)
  { sectorId: 3, criterionId: 1, metricDate: '2025-04-30', valor: 309 }, // Atraso
  { sectorId: 3, criterionId: 9, metricDate: '2025-04-30', valor: 2.81 }, // IPK
  // SÃO SEBASTIÃO (sectorId: 4)
  { sectorId: 4, criterionId: 1, metricDate: '2025-04-30', valor: 706 }, // Atraso - Valor alto para teste
  { sectorId: 4, criterionId: 9, metricDate: '2025-04-30', valor: 1.78 }, // IPK - Valor baixo para teste
  // Adicionar dados para OUTROS CRITÉRIOS e talvez outros meses (ex: 2025-03-31)
];

// Exemplo de Logs
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

    // Pegar Repositórios
    const queryRunner = AppDataSource.createQueryRunner(); // Usar QueryRunner para DELETE em cascata se necessário ou ordem
    const sectorRepo = AppDataSource.getRepository(SectorEntity);
    const criterionRepo = AppDataSource.getRepository(CriterionEntity);
    const roleRepo = AppDataSource.getRepository(RoleEntity);
    const userRepo = AppDataSource.getRepository(UserEntity);
    const parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    const performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    const auditLogRepo = AppDataSource.getRepository(AuditLogEntity);

    // Limpar tabelas na ordem inversa de dependência (cuidado com foreign keys se ativas)
    // Para o MVP com synchronize: true, pode ser mais fácil limpar tudo,
    // mas em prod usaríamos delete({}) ou truncate com cuidado.
    console.log('Limpando dados antigos (se existirem)...');
    await queryRunner.query('DELETE FROM user_roles'); // Limpa a tabela de junção Muitos-para-Muitos
    await auditLogRepo.delete({}); // Deleta todos os logs (referenciam users)
    await performanceRepo.delete({}); // Deleta dados de performance (referenciam sectors, criteria)
    await parameterRepo.delete({}); // Deleta parâmetros (referenciam users, sectors, criteria)

    // 2. Agora limpar as tabelas que eram referenciadas
    await userRepo.delete({}); // Deleta usuários (NÃO use clear/truncate por causa de user_roles)
    await roleRepo.delete({}); // Deleta perfis
    await criterionRepo.delete({}); // Deleta critérios
    await sectorRepo.delete({}); // Deleta setores

    console.log('Tabelas limpas.');

    // Inserir Dados Mock (usando .save() que é mais flexível)
    console.log('Inserindo Setores...');
    await sectorRepo.save(sectorsMock);

    console.log('Inserindo Critérios...');
    await criterionRepo.save(criteriaMock);

    console.log('Inserindo Perfis...');
    await roleRepo.save(rolesMock);

    console.log('Inserindo Usuários...');
    // Para salvar relações ManyToMany, precisamos carregar as entidades relacionadas primeiro
    const adminRole = await roleRepo.findOneByOrFail({ nome: 'Admin' });
    const viewerRole = await roleRepo.findOneByOrFail({ nome: 'Viewer' });
    await userRepo.save([
      {
        id: 1,
        nome: 'Admin Sistema',
        email: 'admin@sistema.com',
        ativo: true,
        roles: [adminRole],
      },
      {
        id: 2,
        nome: 'Usuario Comum',
        email: 'user@sistema.com',
        ativo: true,
        roles: [viewerRole],
      },
    ]);

    console.log('Inserindo Parâmetros...');
    // Adicionar createdByUserId se quiser ligar ao usuário mock
    await parameterRepo.save(
      parametersMock.map((p) => ({ ...p, createdByUserId: 1 }))
    );

    console.log('Inserindo Dados de Desempenho...');
    await performanceRepo.save(performanceMock);

    console.log('Inserindo Logs de Auditoria...');
    await auditLogRepo.save(
      auditLogsMock.map((l) => ({ ...l, userId: 1, userName: 'Admin Sistema' }))
    ); // Atribui ao usuário admin mock

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
