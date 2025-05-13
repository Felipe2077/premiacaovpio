// apps/api/src/seed.ts (VERSÃO REALMENTE INTEGRAL - CHECADA E SEM NADA COMENTADO)
import 'reflect-metadata';
import { DeepPartial } from 'typeorm';
import { AppDataSource } from './database/data-source';
import { AuditLogEntity } from './entity/audit-log.entity';
import {
  CompetitionPeriodEntity,
  CompetitionStatus,
} from './entity/competition-period.entity'; // Ajuste o path se necessário
import { CriterionEntity } from './entity/criterion.entity';
import {
  ExpurgoEventEntity,
  ExpurgoStatus,
} from './entity/expurgo-event.entity';
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

// CRITÉRIOS SEM IDs - O BANCO VAI GERAR
const criteriaMock: Omit<DeepPartial<CriterionEntity>, 'id'>[] = [
  {
    nome: 'ATRASO',
    index: 1,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'Qtd',
  },
  {
    nome: 'FURO POR VIAGEM',
    index: 2,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: '%',
  },
  {
    nome: 'QUEBRA',
    index: 3,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'Qtd',
  },
  {
    nome: 'DEFEITO',
    index: 4,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'Qtd',
  },
  {
    nome: 'FALTA FUNC',
    index: 5,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: '%',
  },
  {
    nome: 'ATESTADO FUNC',
    index: 10,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: '%',
  },
  {
    nome: 'COLISÃO',
    index: 7,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'Qtd',
  },
  {
    nome: 'FALTA FROTA',
    index: 11,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: '%',
  },
  {
    nome: 'IPK',
    index: 9,
    sentido_melhor: 'MAIOR',
    ativo: true,
    unidade_medida: 'Pass/KM',
  },
  {
    nome: 'MEDIA KM/L',
    index: 15,
    sentido_melhor: 'MAIOR',
    ativo: true,
    unidade_medida: 'KM/L',
  },
  {
    nome: 'KM OCIOSA',
    index: 16,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: '%',
  },
  {
    nome: 'PEÇAS',
    index: 12,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'R$',
  },
  {
    nome: 'PNEUS',
    index: 13,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'R$',
  },
  {
    nome: 'COMBUSTIVEL',
    index: 14,
    sentido_melhor: 'MENOR',
    ativo: true,
    unidade_medida: 'Litros',
  },
  {
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

interface AuditLogMockInput {
  userId?: number;
  userName?: string;
  actionType: string;
  details?: Record<string, any>;
  entityType?: string;
  entityId?: string | number;
  justification?: string;
} // MUDADO justification
const auditLogsMock: AuditLogMockInput[] = [
  {
    actionType: 'SEED_EXECUTADO',
    details: { message: 'Banco de dados populado com dados mock iniciais.' },
  },
  {
    actionType: 'PARAMETRO_ALTERADO',
    entityType: 'ParameterValueEntity',
    entityId: '1',
    details: {
      nomeParametro: 'META_IPK',
      valorAntigo: '2.90',
      valorNovo: '3.00',
      dataInicioEfetivo: '2025-04-01',
    },
    justification: 'Ajuste de meta para o Q2 conforme planejamento.', // MUDADO
  },
  {
    actionType: 'EXPURGO_REGISTRADO',
    entityType: 'ExpurgoEventEntity',
    entityId: '1',
    details: {
      criterioNome: 'DEFEITO',
      setorNome: 'PARANOÁ',
      dataEvento: '2025-04-15',
    },
    justification: 'Autorizado por Diretoria em RE-XYZ - Impacto chuva.', // MUDADO
  },
];

// Mocks de Parâmetros referenciam NOMES dos critérios
interface ParameterMockInput
  extends Omit<
    DeepPartial<ParameterValueEntity>,
    'criterionId' | 'sectorId' | 'createdByUserId'
  > {
  criterionNome: string;
  sectorNome?: string;
}
const parametersMockInput: ParameterMockInput[] = [
  // --- GAMA ---
  {
    nomeParametro: 'META_ATRASO_GAMA',
    valor: '303',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'ATRASO',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_FURO_ATRASO_GAMA',
    valor: '486',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'FURO POR ATRASO',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25',
  },
  // Furo de Viagem GAMA: Meta 0 (tratado como não ter meta específica, para usar a regra de Meta=0 no cálculo)
  {
    nomeParametro: 'META_QUEBRA_GAMA',
    valor: '43',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'QUEBRA',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_DEFEITO_GAMA',
    valor: '117',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'DEFEITO',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_FALTA_FUNC_GAMA',
    valor: '10',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'FALTA FUNC',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25 (%?)',
  },
  {
    nomeParametro: 'META_ATESTADO_FUNC_GAMA',
    valor: '53',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'ATESTADO FUNC',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25 (%?)',
  },
  {
    nomeParametro: 'META_COLISAO_GAMA',
    valor: '12',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'COLISÃO',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25',
  },
  // Falta Frota GAMA: Meta 0
  {
    nomeParametro: 'META_IPK_GAMA',
    valor: '1.42',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'IPK',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_MEDIA_KM_L_GAMA',
    valor: '3.00',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'MEDIA KM/L',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_KM_OCIOSA_GAMA',
    valor: '7.55',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'KM OCIOSA',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25 (%)',
  },
  {
    nomeParametro: 'META_PECAS_GAMA',
    valor: '197777',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'PEÇAS',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25 (R$)',
  },
  {
    nomeParametro: 'META_PNEUS_GAMA',
    valor: '93931',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'PNEUS',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25 (R$)',
  },
  {
    nomeParametro: 'META_COMBUSTIVEL_GAMA',
    valor: '364104',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'COMBUSTIVEL',
    sectorNome: 'GAMA',
    justificativa: 'Meta ABR/25 (Litros)',
  },

  // --- PARANOÁ ---
  {
    nomeParametro: 'META_ATRASO_PARANOA',
    valor: '317',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'ATRASO',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_FURO_ATRASO_PARANOA',
    valor: '429',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'FURO POR ATRASO',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25',
  },
  // Furo de Viagem PARANOÁ: Meta 0
  {
    nomeParametro: 'META_QUEBRA_PARANOA',
    valor: '46',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'QUEBRA',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_DEFEITO_PARANOA',
    valor: '45',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'DEFEITO',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_FALTA_FUNC_PARANOA',
    valor: '10',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'FALTA FUNC',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25 (%?)',
  },
  {
    nomeParametro: 'META_ATESTADO_FUNC_PARANOA',
    valor: '65',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'ATESTADO FUNC',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25 (%?)',
  },
  {
    nomeParametro: 'META_COLISAO_PARANOA',
    valor: '18',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'COLISÃO',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25',
  },
  // Falta Frota PARANOÁ: Meta 0
  {
    nomeParametro: 'META_IPK_PARANOA',
    valor: '1.45',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'IPK',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_MEDIA_KM_L_PARANOA',
    valor: '3.01',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'MEDIA KM/L',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_KM_OCIOSA_PARANOA',
    valor: '7.11',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'KM OCIOSA',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25 (%)',
  },
  {
    nomeParametro: 'META_PECAS_PARANOA',
    valor: '180680',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'PEÇAS',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25 (R$)',
  },
  {
    nomeParametro: 'META_PNEUS_PARANOA',
    valor: '104376',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'PNEUS',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25 (R$)',
  },
  {
    nomeParametro: 'META_COMBUSTIVEL_PARANOA',
    valor: '374799',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'COMBUSTIVEL',
    sectorNome: 'PARANOÁ',
    justificativa: 'Meta ABR/25 (Litros)',
  },

  // --- SANTA MARIA ---
  {
    nomeParametro: 'META_ATRASO_STA_MARIA',
    valor: '309',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'ATRASO',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_FURO_ATRASO_STA_MARIA',
    valor: '346',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'FURO POR ATRASO',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25',
  },
  // Furo de Viagem SANTA MARIA: Meta 0
  {
    nomeParametro: 'META_QUEBRA_STA_MARIA',
    valor: '57',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'QUEBRA',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_DEFEITO_STA_MARIA',
    valor: '113',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'DEFEITO',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_FALTA_FUNC_STA_MARIA',
    valor: '10',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'FALTA FUNC',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25 (%?)',
  },
  {
    nomeParametro: 'META_ATESTADO_FUNC_STA_MARIA',
    valor: '98',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'ATESTADO FUNC',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25 (%?)',
  },
  {
    nomeParametro: 'META_COLISAO_STA_MARIA',
    valor: '18',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'COLISÃO',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25',
  },
  // Falta Frota SANTA MARIA: Meta 0
  {
    nomeParametro: 'META_IPK_STA_MARIA',
    valor: '1.78',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'IPK',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_MEDIA_KM_L_STA_MARIA',
    valor: '2.81',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'MEDIA KM/L',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_KM_OCIOSA_STA_MARIA',
    valor: '8.58',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'KM OCIOSA',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25 (%)',
  },
  {
    nomeParametro: 'META_PECAS_STA_MARIA',
    valor: '304583',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'PEÇAS',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25 (R$)',
  },
  {
    nomeParametro: 'META_PNEUS_STA_MARIA',
    valor: '127594',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'PNEUS',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25 (R$)',
  },
  {
    nomeParametro: 'META_COMBUSTIVEL_STA_MARIA',
    valor: '683712',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'COMBUSTIVEL',
    sectorNome: 'SANTA MARIA',
    justificativa: 'Meta ABR/25 (Litros)',
  },

  // --- SÃO SEBASTIÃO ---
  {
    nomeParametro: 'META_ATRASO_SAO_SEB',
    valor: '706',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'ATRASO',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_FURO_ATRASO_SAO_SEB',
    valor: '1317',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'FURO POR ATRASO',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25',
  },
  // Furo de Viagem SÃO SEBASTIÃO: Meta 0
  {
    nomeParametro: 'META_QUEBRA_SAO_SEB',
    valor: '43',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'QUEBRA',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_DEFEITO_SAO_SEB',
    valor: '108',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'DEFEITO',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_FALTA_FUNC_SAO_SEB',
    valor: '10',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'FALTA FUNC',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25 (%?)',
  },
  {
    nomeParametro: 'META_ATESTADO_FUNC_SAO_SEB',
    valor: '57',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'ATESTADO FUNC',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25 (%?)',
  },
  {
    nomeParametro: 'META_COLISAO_SAO_SEB',
    valor: '15',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'COLISÃO',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25',
  },
  // Falta Frota SÃO SEBASTIÃO: Meta 0
  {
    nomeParametro: 'META_IPK_SAO_SEB',
    valor: '1.52',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'IPK',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_MEDIA_KM_L_SAO_SEB',
    valor: '3.05',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'MEDIA KM/L',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25',
  },
  {
    nomeParametro: 'META_KM_OCIOSA_SAO_SEB',
    valor: '6.63',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'KM OCIOSA',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25 (%)',
  },
  {
    nomeParametro: 'META_PECAS_SAO_SEB',
    valor: '213331',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'PEÇAS',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25 (R$)',
  },
  {
    nomeParametro: 'META_PNEUS_SAO_SEB',
    valor: '101737',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'PNEUS',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25 (R$)',
  },
  {
    nomeParametro: 'META_COMBUSTIVEL_SAO_SEB',
    valor: '431620',
    dataInicioEfetivo: '2025-04-01',
    criterionNome: 'COMBUSTIVEL',
    sectorNome: 'SÃO SEBASTIÃO',
    justificativa: 'Meta ABR/25 (Litros)',
  },

  // Metas "GERAIS" (sem sectorNome) se existirem e não tiverem sido cobertas acima
  // Se a meta para um critério é a mesma para todas as filiais, podemos ter uma entrada sem sectorNome.
  // Exemplo (se IPK fosse sempre 1.50 para todas, e não houvesse as específicas acima):
  // { nomeParametro: 'META_IPK_GERAL', valor: '1.50', dataInicioEfetivo: '2025-04-01', criterionNome: 'IPK', justificativa: 'Meta Geral ABR/25' },
  // Mas com base na sua tabela, todas parecem ter valores específicos por setor, mesmo que repetidos.
];

// Mocks de Performance referenciam NOMES
interface PerformanceMockInput
  extends Omit<DeepPartial<PerformanceDataEntity>, 'criterionId' | 'sectorId'> {
  criterionNome: string;
  sectorNome: string;
}
const performanceMockInput: PerformanceMockInput[] = [
  {
    sectorNome: 'GAMA',
    criterionNome: 'ATRASO',
    metricDate: '2025-04-30',
    valor: 303,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'IPK',
    metricDate: '2025-04-30',
    valor: 3.01,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'FURO POR ATRASO',
    metricDate: '2025-04-30',
    valor: 3,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'FURO POR VIAGEM',
    metricDate: '2025-04-30',
    valor: 1.2,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'QUEBRA',
    metricDate: '2025-04-30',
    valor: 1,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'DEFEITO',
    metricDate: '2025-04-30',
    valor: 10,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'FALTA FUNC',
    metricDate: '2025-04-30',
    valor: 2.5,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'ATESTADO FUNC',
    metricDate: '2025-04-30',
    valor: 4.0,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'COLISÃO',
    metricDate: '2025-04-30',
    valor: 0,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'FALTA FROTA',
    metricDate: '2025-04-30',
    valor: 0.5,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'MEDIA KM/L',
    metricDate: '2025-04-30',
    valor: 2.6,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'KM OCIOSA',
    metricDate: '2025-04-30',
    valor: 9.0,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'PEÇAS',
    metricDate: '2025-04-30',
    valor: 18500,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'PNEUS',
    metricDate: '2025-04-30',
    valor: 9800,
  },
  {
    sectorNome: 'GAMA',
    criterionNome: 'COMBUSTIVEL',
    metricDate: '2025-04-30',
    valor: 33000,
  },

  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'ATRASO',
    metricDate: '2025-04-30',
    valor: 317,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'IPK',
    metricDate: '2025-04-30',
    valor: 2.88,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'FURO POR ATRASO',
    metricDate: '2025-04-30',
    valor: 6,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'FURO POR VIAGEM',
    metricDate: '2025-04-30',
    valor: 1.6,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'QUEBRA',
    metricDate: '2025-04-30',
    valor: 2,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'DEFEITO',
    metricDate: '2025-04-30',
    valor: 12,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'FALTA FUNC',
    metricDate: '2025-04-30',
    valor: 3.1,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'ATESTADO FUNC',
    metricDate: '2025-04-30',
    valor: 5.5,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'COLISÃO',
    metricDate: '2025-04-30',
    valor: 0,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'FALTA FROTA',
    metricDate: '2025-04-30',
    valor: 1.1,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'MEDIA KM/L',
    metricDate: '2025-04-30',
    valor: 2.4,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'KM OCIOSA',
    metricDate: '2025-04-30',
    valor: 10.5,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'PEÇAS',
    metricDate: '2025-04-30',
    valor: 21000,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'PNEUS',
    metricDate: '2025-04-30',
    valor: 11000,
  },
  {
    sectorNome: 'PARANOÁ',
    criterionNome: 'COMBUSTIVEL',
    metricDate: '2025-04-30',
    valor: 36000,
  },

  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'ATRASO',
    metricDate: '2025-04-30',
    valor: 309,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'IPK',
    metricDate: '2025-04-30',
    valor: 2.81,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'FURO POR ATRASO',
    metricDate: '2025-04-30',
    valor: 4,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'FURO POR VIAGEM',
    metricDate: '2025-04-30',
    valor: 1.4,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'QUEBRA',
    metricDate: '2025-04-30',
    valor: 3,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'DEFEITO',
    metricDate: '2025-04-30',
    valor: 18,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'FALTA FUNC',
    metricDate: '2025-04-30',
    valor: 2.8,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'ATESTADO FUNC',
    metricDate: '2025-04-30',
    valor: 4.8,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'COLISÃO',
    metricDate: '2025-04-30',
    valor: 1,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'FALTA FROTA',
    metricDate: '2025-04-30',
    valor: 0.8,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'MEDIA KM/L',
    metricDate: '2025-04-30',
    valor: 2.55,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'KM OCIOSA',
    metricDate: '2025-04-30',
    valor: 11.0,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'PEÇAS',
    metricDate: '2025-04-30',
    valor: 19500,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'PNEUS',
    metricDate: '2025-04-30',
    valor: 12000,
  },
  {
    sectorNome: 'SANTA MARIA',
    criterionNome: 'COMBUSTIVEL',
    metricDate: '2025-04-30',
    valor: 34000,
  },

  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'ATRASO',
    metricDate: '2025-04-30',
    valor: 706,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'IPK',
    metricDate: '2025-04-30',
    valor: 1.78,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'FURO POR ATRASO',
    metricDate: '2025-04-30',
    valor: 7,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'FURO POR VIAGEM',
    metricDate: '2025-04-30',
    valor: 2.0,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'QUEBRA',
    metricDate: '2025-04-30',
    valor: 4,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'DEFEITO',
    metricDate: '2025-04-30',
    valor: 20,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'FALTA FUNC',
    metricDate: '2025-04-30',
    valor: 4.0,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'ATESTADO FUNC',
    metricDate: '2025-04-30',
    valor: 6.0,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'COLISÃO',
    metricDate: '2025-04-30',
    valor: 1,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'FALTA FROTA',
    metricDate: '2025-04-30',
    valor: 1.5,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'MEDIA KM/L',
    metricDate: '2025-04-30',
    valor: 2.3,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'KM OCIOSA',
    metricDate: '2025-04-30',
    valor: 12.5,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'PEÇAS',
    metricDate: '2025-04-30',
    valor: 25000,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'PNEUS',
    metricDate: '2025-04-30',
    valor: 15000,
  },
  {
    sectorNome: 'SÃO SEBASTIÃO',
    criterionNome: 'COMBUSTIVEL',
    metricDate: '2025-04-30',
    valor: 38000,
  },
];

// Tipagem para expurgos mock, referenciando NOMES para critério/setor
interface ExpurgoMockInput
  extends Omit<
    DeepPartial<ExpurgoEventEntity>,
    'criterionId' | 'sectorId' | 'registradoPorUserId'
  > {
  criterionNome: string;
  sectorNome: string;
  valorAjusteNumerico: number;
}
const expurgosMockInput: ExpurgoMockInput[] = [
  {
    criterionNome: 'DEFEITO',
    sectorNome: 'PARANOÁ',
    dataEvento: '2025-04-15',
    descricaoEvento: 'Defeito sensor X.',
    justificativa: 'Autorizado Diretoria.',
    status: 'APROVADO' as ExpurgoStatus,
    valorAjusteNumerico: 10,
  },
  {
    criterionNome: 'KM OCIOSA', // Ou o nome exato do critério no seu mock
    sectorNome: 'GAMA', // Ou outro setor
    dataEvento: '2025-04-15',
    descricaoEvento:
      'KM parado por evento X não contabilizado automaticamente.',
    justificativa: 'Ajuste manual aprovado.',
    status: 'APROVADO' as ExpurgoStatus,
    valorAjusteNumerico: 1000, // Exemplo: 100 KM a serem subtraídos do Hodômetro
  },
  {
    criterionNome: 'KM OCIOSA',
    sectorNome: 'SANTA MARIA',
    dataEvento: '2025-04-20',
    descricaoEvento: 'Bloqueio via.',
    justificativa: 'Autorizado Gerente.',
    status: 'PENDENTE' as ExpurgoStatus,
    valorAjusteNumerico: 0,
  },
  {
    criterionNome: 'QUEBRA',
    sectorNome: 'GAMA',
    dataEvento: '2025-04-10',
    descricaoEvento: 'Vandalismo.',
    justificativa: 'Solicitado BO.',
    status: 'REJEITADO' as ExpurgoStatus,
    justificativaAprovacao: 'Não coberto.',
    valorAjusteNumerico: 1,
  },
];
// --- Mock de Períodos de Competição ---
const competitionPeriodsMock: DeepPartial<CompetitionPeriodEntity>[] = [
  {
    mesAno: '2025-03', // Março de 2025
    dataInicio: '2025-03-01',
    dataFim: '2025-03-31',
    status: 'FECHADA' as CompetitionStatus,
    // fechadaPorUserId: 1, // Admin mockado
    // fechadaEm: new Date('2025-04-02T10:00:00Z') // Data exemplo de fechamento
  },
  {
    mesAno: '2025-04', // Abril de 2025 (nosso mês de dados de performance e params)
    dataInicio: '2025-04-01',
    dataFim: '2025-04-30',
    status: 'ATIVA' as CompetitionStatus, // Mês atual da premiação
  },
  {
    mesAno: '2025-05', // Maio de 2025
    dataInicio: '2025-05-01',
    dataFim: '2025-05-31',
    status: 'PLANEJAMENTO' as CompetitionStatus, // Próximo mês para definir metas
  },
];
// ---------------

// --- Função para Executar o Seed ---
async function runSeed() {
  const competitionPeriodRepo = AppDataSource.getRepository(
    CompetitionPeriodEntity
  );

  console.log('Iniciando script de seed...');
  let connectionInitialized = false;
  try {
    console.log('Inicializando DataSource...');
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      connectionInitialized = true;
    } else {
      console.log('DataSource já estava inicializado.');
    }
    console.log('DataSource pronto para uso!');

    const queryRunner = AppDataSource.createQueryRunner();
    const sectorRepo = AppDataSource.getRepository(SectorEntity);
    const criterionRepo = AppDataSource.getRepository(CriterionEntity);
    const roleRepo = AppDataSource.getRepository(RoleEntity);
    const userRepo = AppDataSource.getRepository(UserEntity);
    const parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    const performanceRepo = AppDataSource.getRepository(PerformanceDataEntity);
    const auditLogRepo = AppDataSource.getRepository(AuditLogEntity);
    const expurgoEventRepo = AppDataSource.getRepository(ExpurgoEventEntity);

    console.log('Limpando dados antigos (na ordem correta)...');
    await queryRunner.query('DELETE FROM competition_periods'); // Adicionado

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

    console.log('Inserindo Setores...');
    const savedSectors = await sectorRepo.save(sectorsMock);
    console.log(` -> ${savedSectors.length} setores salvos.`);
    const sectorMap = new Map(savedSectors.map((s) => [s.nome, s.id]));

    console.log('Inserindo Critérios...');
    const savedCriteria = await criterionRepo.save(criteriaMock); // Salva critérios SEM ID hardcoded
    console.log(` -> ${savedCriteria.length} critérios salvos.`);
    const criteriaMap = new Map(savedCriteria.map((c) => [c.nome, c.id]));

    console.log('Inserindo Perfis...');
    const savedRoles = await roleRepo.save(rolesMock);
    console.log(` -> ${savedRoles.length} perfis salvos.`);
    const adminRole = savedRoles.find((r) => r.nome === 'Admin');
    const viewerRole = savedRoles.find((r) => r.nome === 'Viewer');
    if (!adminRole || !viewerRole)
      throw new Error('Roles Admin/Viewer não encontrados!');
    console.log('Inserindo Períodos de Competição Mock...');
    // Não precisamos mapear nada extra para estes mocks por enquanto
    const savedCompetitionPeriods = await competitionPeriodRepo.save(
      competitionPeriodsMock
    );
    console.log(
      ` -> ${savedCompetitionPeriods.length} períodos de competição salvos.`
    );

    console.log('Inserindo Usuários...');
    const usersToSave = [
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
    ];
    const createdUsers = await userRepo.save(usersToSave);
    console.log(` -> ${createdUsers.length} usuários salvos.`);
    const adminUser = createdUsers.find((u) => u.email === 'admin@sistema.com');
    const adminUserId = adminUser?.id;
    if (!adminUserId) throw new Error('Admin user ID não encontrado!');
    const adminUserName = adminUser.nome;

    console.log('Inserindo Parâmetros...');
    const paramsToSavePromises = parametersMockInput.map(async (p_input) => {
      const criterionId = criteriaMap.get(p_input.criterionNome);
      const sectorId = p_input.sectorNome
        ? sectorMap.get(p_input.sectorNome)
        : undefined;
      if (!criterionId)
        throw new Error(
          `Critério '${p_input.criterionNome}' não encontrado no mapa para parâmetro '${p_input.nomeParametro}'`
        );
      if (p_input.sectorNome && !sectorId)
        throw new Error(
          `Setor '${p_input.sectorNome}' não encontrado no mapa para parâmetro '${p_input.nomeParametro}'`
        );
      const { criterionNome, sectorNome, ...paramEntityData } = p_input;
      return {
        ...paramEntityData,
        criterionId,
        sectorId,
        createdByUserId: adminUserId,
      };
    });
    const paramsToSave = await Promise.all(paramsToSavePromises);
    const savedParams = await parameterRepo.save(
      paramsToSave as DeepPartial<ParameterValueEntity>[]
    );
    console.log(` -> ${savedParams.length} parâmetros salvos.`);

    // --- BUSCAR O PERÍODO DE COMPETIÇÃO PARA O QUAL OS DADOS DE PERFORMANCE SE REFEREM ---
    // Vamos assumir que todos os dados de performance do mock são para '2025-04'
    const targetMesAnoForPerformance = '2025-04';
    const activeCompetitionPeriod = await AppDataSource.getRepository(
      CompetitionPeriodEntity
    ).findOneBy({
      mesAno: targetMesAnoForPerformance,
      // status: 'ATIVA' // O status pode ser ATIVA ou o que fizer sentido para o mock
    });

    if (!activeCompetitionPeriod) {
      throw new Error(
        `Período de competição ${targetMesAnoForPerformance} não encontrado no seed para popular performance_data.`
      );
    }
    const currentCompetitionPeriodId = activeCompetitionPeriod.id;
    console.log(
      `[Seed] Usando competitionPeriodId: ${currentCompetitionPeriodId} para performance_data.`
    );
    // ------------------------------------------------------------------------------------

    console.log('Inserindo Dados de Desempenho...');
    const perfToSavePromises = performanceMockInput.map(async (p_input) => {
      const criterionId = criteriaMap.get(p_input.criterionNome);
      const sectorId = sectorMap.get(p_input.sectorNome);
      if (!criterionId)
        throw new Error(
          `Critério '${p_input.criterionNome}' não encontrado no mapa para performance`
        );
      if (!sectorId)
        throw new Error(
          `Setor '${p_input.sectorNome}' não encontrado no mapa para performance`
        );
      const { criterionNome, sectorNome, ...perfEntityData } = p_input;
      return {
        ...perfEntityData,
        criterionId,
        sectorId,
        competitionPeriodId: currentCompetitionPeriodId,
      };
    });
    const perfToSave = await Promise.all(perfToSavePromises);
    const savedPerf = await performanceRepo.save(
      perfToSave as DeepPartial<PerformanceDataEntity>[]
    );
    console.log(` -> ${savedPerf.length} registros de desempenho salvos.`);

    console.log('Inserindo Eventos de Expurgo Mock...');
    const expurgosToSavePromises = expurgosMockInput.map(async (e_input) => {
      const criterionId = criteriaMap.get(e_input.criterionNome);
      const sectorId = sectorMap.get(e_input.sectorNome);
      if (!criterionId)
        throw new Error(
          `Critério nome '${e_input.criterionNome}' do expurgo não encontrado no mapa.`
        );
      if (!sectorId)
        throw new Error(
          `Setor nome '${e_input.sectorNome}' do expurgo não encontrado no mapa.`
        );
      const { criterionNome, sectorNome, ...expurgoEntityData } = e_input;
      return {
        ...expurgoEntityData,
        criterionId,
        sectorId,
        registradoPorUserId: adminUserId,
      };
    });
    const expurgosToSave = await Promise.all(expurgosToSavePromises);
    const savedExpurgos = await expurgoEventRepo.save(
      expurgosToSave as DeepPartial<ExpurgoEventEntity>[]
    );
    console.log(` -> ${savedExpurgos.length} expurgos salvos.`);

    console.log('Inserindo Logs de Auditoria...');
    const logsToSave = auditLogsMock.map((l) => {
      const logEntry: DeepPartial<AuditLogEntity> = {
        actionType: l.actionType,
        details: l.details,
        entityType: l.entityType,
        entityId:
          l.entityId !== undefined && l.entityId !== null
            ? String(l.entityId)
            : undefined,
        justification: l.justification,
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
    if (connectionInitialized && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('DataSource finalizado (pelo seed).');
    } else if (AppDataSource.isInitialized && !connectionInitialized) {
      await AppDataSource.destroy();
      console.log('DataSource (pré-existente) finalizado (pelo seed).');
    }
  }
}
// ----------------------------------
runSeed();
