// apps/api/src/entity/expurgo-event.entity.ts (CORRIGIDA)

import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompetitionPeriodEntity } from './competition-period.entity';
import { CriterionEntity } from './criterion.entity';
import { SectorEntity } from './sector.entity';
import { UserEntity } from './user.entity';

export enum ExpurgoStatus {
  PENDENTE = 'PENDENTE',
  APROVADO = 'APROVADO',
  REJEITADO = 'REJEITADO',
}

@Entity({ name: 'expurgo_events' })
@Index('idx_expurgo_period_sector_criterion', [
  'competitionPeriodId',
  'sectorId',
  'criterionId',
])
@Index('idx_expurgo_status_data', ['status', 'dataEvento'])
@Index('idx_expurgo_registrado_por', ['registradoPorUserId'])
@Check(
  'CHK_valor_ajuste_numerico_valido',
  '"valorAjusteNumerico" IS NOT NULL AND "valorAjusteNumerico" != 0'
)
export class ExpurgoEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // === RELACIONAMENTOS ===
  @Column({
    type: 'int',
    comment: 'ID do período de competição ao qual o expurgo se refere',
  })
  competitionPeriodId!: number;

  @ManyToOne(() => CompetitionPeriodEntity, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'competitionPeriodId' })
  competitionPeriod?: CompetitionPeriodEntity;

  @Column({
    type: 'int',
    comment: 'ID do critério ao qual o expurgo se aplica',
  })
  criterionId!: number;

  @ManyToOne(() => CriterionEntity, {
    onDelete: 'RESTRICT',
    eager: false,
  })
  @JoinColumn({ name: 'criterionId' })
  criterion?: CriterionEntity;

  @Column({
    type: 'int',
    comment: 'ID do setor ao qual o expurgo se aplica',
  })
  sectorId!: number;

  @ManyToOne(() => SectorEntity, {
    onDelete: 'RESTRICT',
    eager: false,
  })
  @JoinColumn({ name: 'sectorId' })
  sector?: SectorEntity;

  // === DADOS DO EVENTO ===
  @Column({
    type: 'date',
    comment:
      'Data em que ocorreu o evento que justifica o expurgo (YYYY-MM-DD)',
  })
  dataEvento!: string;

  @Column({
    type: 'text',
    comment: 'Descrição detalhada do evento que justifica o expurgo',
  })
  descricaoEvento!: string;

  @Column({
    type: 'text',
    comment: 'Justificativa fornecida pelo solicitante para o expurgo',
  })
  justificativaSolicitacao!: string;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    comment: 'Valor numérico do ajuste a ser aplicado (positivo ou negativo)',
  })
  valorAjusteNumerico!: number;

  // === STATUS E WORKFLOW ===
  @Column({
    type: 'enum',
    enum: ExpurgoStatus,
    default: ExpurgoStatus.PENDENTE,
    comment: 'Status atual do expurgo no workflow de aprovação',
  })
  status!: ExpurgoStatus;

  // === AUDITORIA DE SOLICITAÇÃO ===
  @Column({
    type: 'int',
    comment: 'ID do usuário que registrou/solicitou o expurgo',
  })
  registradoPorUserId!: number;

  @ManyToOne(() => UserEntity, {
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'registradoPorUserId' })
  registradoPor?: UserEntity;

  // === AUDITORIA DE APROVAÇÃO/REJEIÇÃO ===
  @Column({
    type: 'int',
    nullable: true,
    comment: 'ID do usuário que aprovou ou rejeitou o expurgo',
  })
  aprovadoPorUserId?: number | null;

  @ManyToOne(() => UserEntity, {
    nullable: true,
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'aprovadoPorUserId' })
  aprovadoPor?: UserEntity | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp da aprovação ou rejeição',
  })
  aprovadoEm?: Date | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Justificativa fornecida pelo aprovador/rejeitador',
  })
  justificativaAprovacao?: string | null;

  // === TIMESTAMPS AUTOMÁTICOS ===
  @CreateDateColumn({
    type: 'timestamp with time zone',
    comment: 'Timestamp de criação do registro',
  })
  createdAt!: Date;

  @UpdateDateColumn({
    type: 'timestamp with time zone',
    comment: 'Timestamp da última atualização do registro',
  })
  updatedAt!: Date;

  // === MÉTODOS AUXILIARES ===

  /**
   * Verifica se o expurgo está pendente de aprovação
   */
  isPendente(): boolean {
    return this.status === ExpurgoStatus.PENDENTE;
  }

  /**
   * Verifica se o expurgo foi aprovado
   */
  isAprovado(): boolean {
    return this.status === ExpurgoStatus.APROVADO;
  }

  /**
   * Verifica se o expurgo foi rejeitado
   */
  isRejeitado(): boolean {
    return this.status === ExpurgoStatus.REJEITADO;
  }

  /**
   * Verifica se o expurgo pode ser editado (apenas quando pendente)
   */
  canBeEdited(): boolean {
    return this.isPendente();
  }

  /**
   * Verifica se o expurgo pode ser aprovado/rejeitado
   */
  canBeReviewed(): boolean {
    return this.isPendente();
  }

  /**
   * Retorna descrição amigável do status
   */
  getStatusDescription(): string {
    switch (this.status) {
      case ExpurgoStatus.PENDENTE:
        return 'Aguardando aprovação';
      case ExpurgoStatus.APROVADO:
        return 'Aprovado';
      case ExpurgoStatus.REJEITADO:
        return 'Rejeitado';
      default:
        return 'Status desconhecido';
    }
  }
}
