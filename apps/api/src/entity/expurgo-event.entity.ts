// apps/api/src/entity/expurgo-event.entity.ts (REFATORADA PARA REGRAS DE NEGÓCIO)

import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompetitionPeriodEntity } from './competition-period.entity';
import { CriterionEntity } from './criterion.entity';
import { ExpurgoAttachmentEntity } from './expurgo-attachment.entity';
import { SectorEntity } from './sector.entity';
import { UserEntity } from './user.entity';

export enum ExpurgoStatus {
  PENDENTE = 'PENDENTE',
  APROVADO = 'APROVADO',
  REJEITADO = 'REJEITADO',
  APROVADO_PARCIAL = 'APROVADO_PARCIAL', // NOVO STATUS
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
  'CHK_valor_solicitado_valido',
  '"valorSolicitado" IS NOT NULL AND "valorSolicitado" != 0'
)
@Check(
  'CHK_valor_aprovado_quando_aprovado',
  'CASE WHEN "status" IN (\'APROVADO\', \'APROVADO_PARCIAL\') THEN "valorAprovado" IS NOT NULL ELSE TRUE END'
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

  // === 🆕 VALORES SEPARADOS: SOLICITADO vs APROVADO ===
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    comment: 'Valor solicitado pelo gerente (ex: 10 quebras)',
  })
  valorSolicitado!: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
    comment:
      'Valor efetivamente aprovado pelo diretor (ex: 5 quebras). NULL se não aprovado.',
  })
  valorAprovado?: number | null;

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

  // === 🆕 RELACIONAMENTO COM ANEXOS ===
  @OneToMany(
    () => ExpurgoAttachmentEntity,
    (attachment) => attachment.expurgo,
    {
      cascade: true,
      eager: false,
    }
  )
  anexos?: ExpurgoAttachmentEntity[];

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

  // === MÉTODOS AUXILIARES ATUALIZADOS ===

  /**
   * Verifica se o expurgo está pendente de aprovação
   */
  isPendente(): boolean {
    return this.status === ExpurgoStatus.PENDENTE;
  }

  /**
   * Verifica se o expurgo foi aprovado (total ou parcial)
   */
  isAprovado(): boolean {
    return (
      this.status === ExpurgoStatus.APROVADO ||
      this.status === ExpurgoStatus.APROVADO_PARCIAL
    );
  }

  /**
   * Verifica se foi aprovação parcial
   */
  isAprovadoParcial(): boolean {
    return this.status === ExpurgoStatus.APROVADO_PARCIAL;
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
   * Retorna o valor efetivo para aplicar no cálculo
   */
  getValorEfetivo(): number {
    if (
      this.isAprovado() &&
      this.valorAprovado !== null &&
      this.valorAprovado !== undefined
    ) {
      return this.valorAprovado;
    }
    return 0; // Se não aprovado, não aplica expurgo
  }

  /**
   * Retorna descrição amigável do status
   */
  getStatusDescription(): string {
    switch (this.status) {
      case ExpurgoStatus.PENDENTE:
        return 'Aguardando aprovação';
      case ExpurgoStatus.APROVADO:
        return 'Aprovado integralmente';
      case ExpurgoStatus.APROVADO_PARCIAL:
        return 'Aprovado parcialmente';
      case ExpurgoStatus.REJEITADO:
        return 'Rejeitado';
      default:
        return 'Status desconhecido';
    }
  }

  /**
   * Verifica se houve redução no valor aprovado
   */
  houveReducaoValor(): boolean {
    if (
      !this.isAprovado() ||
      this.valorAprovado === null ||
      this.valorAprovado === undefined
    ) {
      return false;
    }
    return Math.abs(this.valorAprovado) < Math.abs(this.valorSolicitado);
  }

  /**
   * Calcula percentual de aprovação
   */
  getPercentualAprovacao(): number | null {
    if (
      !this.isAprovado() ||
      this.valorAprovado === null ||
      this.valorAprovado === undefined
    ) {
      return null;
    }
    if (this.valorSolicitado === 0) return 100;
    return (
      (Math.abs(this.valorAprovado) / Math.abs(this.valorSolicitado)) * 100
    );
  }

  /**
   * Conta anexos associados
   */
  getQuantidadeAnexos(): number {
    return this.anexos?.length || 0;
  }

  /**
   * Verifica se tem anexos
   */
  hasAnexos(): boolean {
    return this.getQuantidadeAnexos() > 0;
  }
}
