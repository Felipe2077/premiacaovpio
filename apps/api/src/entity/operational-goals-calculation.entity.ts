// apps/api/src/entity/operational-goals-calculation.entity.ts
import {
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
import { UserEntity } from './user.entity';

export type CalculationStatus =
  | 'PENDING' // Aguardando início
  | 'CALCULATING' // Em execução
  | 'COMPLETED' // Concluído com sucesso
  | 'COMPLETED_WITH_WARNINGS' // Concluído mas com avisos
  | 'ERROR' // Erro durante execução
  | 'CANCELLED' // Cancelado pelo usuário
  | 'APPROVED' // Aprovado e salvo no sistema
  | 'SUPERSEDED'; // Substituído por cálculo mais recente

@Entity({ name: 'operational_goals_calculations' })
@Index(['competitionPeriodId', 'status']) // Otimizar consultas por período e status
@Index(['calculatedByUserId', 'createdAt']) // Otimizar histórico por usuário
@Index(['status', 'createdAt']) // Otimizar listas de cálculos
export class OperationalGoalsCalculationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'int',
    comment: 'ID do período para o qual as metas foram calculadas',
  })
  competitionPeriodId!: number;

  @Column({
    type: 'varchar',
    length: 30,
    enum: [
      'PENDING',
      'CALCULATING',
      'COMPLETED',
      'COMPLETED_WITH_WARNINGS',
      'ERROR',
      'CANCELLED',
      'APPROVED',
      'SUPERSEDED',
    ],
    default: 'PENDING',
    comment: 'Status atual do cálculo',
  })
  status!: CalculationStatus;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Resultados completos do cálculo por setor e critério',
  })
  calculationData?: any | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Parâmetros utilizados no momento do cálculo (snapshot)',
  })
  parametersSnapshot?: any | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Dados de entrada utilizados (Oracle, histórico, etc)',
  })
  inputDataSnapshot?: any | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Classificações de feriados utilizadas',
  })
  holidayClassifications?: any | null;

  @Column({
    type: 'int',
    comment: 'ID do usuário que executou o cálculo',
  })
  calculatedByUserId!: number;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp de início do cálculo',
  })
  startedAt?: Date | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp de conclusão do cálculo',
  })
  completedAt?: Date | null;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Tempo de execução em milissegundos',
  })
  executionTimeMs?: number | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Mensagem de erro se status = ERROR',
  })
  errorMessage?: string | null;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Avisos ou anomalias detectadas durante o cálculo',
  })
  warnings?: any | null;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'ID do usuário que aprovou o cálculo',
  })
  approvedByUserId?: number | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp da aprovação',
  })
  approvedAt?: Date | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Observações da aprovação',
  })
  approvalNotes?: string | null;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 3,
    nullable: true,
    comment: 'Preço do combustível usado para projeções financeiras',
  })
  fuelPriceUsed?: number | null;

  // === RELACIONAMENTOS ===
  @ManyToOne(() => CompetitionPeriodEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competitionPeriodId' })
  competitionPeriod!: CompetitionPeriodEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'calculatedByUserId' })
  calculatedBy!: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approvedByUserId' })
  approvedBy?: UserEntity | null;

  // === AUDITORIA ===
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // === MÉTODOS HELPER ===

  /**
   * Verifica se o cálculo está em andamento
   */
  isInProgress(): boolean {
    return ['PENDING', 'CALCULATING'].includes(this.status);
  }

  /**
   * Verifica se o cálculo foi concluído com sucesso
   */
  isCompleted(): boolean {
    return ['COMPLETED', 'COMPLETED_WITH_WARNINGS'].includes(this.status);
  }

  /**
   * Verifica se o cálculo foi aprovado e está ativo
   */
  isApproved(): boolean {
    return this.status === 'APPROVED';
  }

  /**
   * Verifica se o cálculo teve erro
   */
  hasError(): boolean {
    return this.status === 'ERROR';
  }

  /**
   * Retorna duração da execução formatada
   */
  getFormattedDuration(): string {
    if (!this.executionTimeMs) return 'N/A';

    const seconds = Math.floor(this.executionTimeMs / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Retorna resumo do cálculo
   */
  getSummary(): any {
    if (!this.calculationData) return null;

    const sectorCount = Object.keys(this.calculationData).length;
    const criteriaCount = 3; // COMBUSTÍVEL, PNEUS, PEÇAS

    return {
      sectorsProcessed: sectorCount,
      criteriaCalculated: criteriaCount,
      totalGoals: sectorCount * criteriaCount,
      hasWarnings: this.warnings && Object.keys(this.warnings).length > 0,
      executionTime: this.getFormattedDuration(),
    };
  }

  /**
   * Marca cálculo como superseded quando um novo é aprovado
   */
  markAsSuperseded(): void {
    this.status = 'SUPERSEDED';
  }
}
