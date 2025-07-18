// apps/api/src/entity/holiday-classification.entity.ts
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

export type HolidayClassificationType = 'UTIL' | 'SABADO' | 'DOMINGO_FERIADO';

@Entity({ name: 'holiday_classifications' })
@Index(['competitionPeriodId', 'holidayDate'], { unique: true }) // Não pode duplicar feriado no mesmo período
@Index(['competitionPeriodId', 'classification']) // Otimizar consultas por classificação
export class HolidayClassificationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: 'int',
    comment: 'ID do período de competição ao qual o feriado se refere',
  })
  competitionPeriodId!: number;

  @Column({
    type: 'date',
    comment: 'Data do feriado no formato YYYY-MM-DD',
  })
  holidayDate!: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Nome oficial do feriado (ex: Dia da Independência)',
  })
  holidayName!: string;

  @Column({
    type: 'varchar',
    length: 20,
    enum: ['UTIL', 'SABADO', 'DOMINGO_FERIADO'],
    nullable: true,
    comment: 'Classificação operacional do feriado',
  })
  classification!: HolidayClassificationType | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'NACIONAL',
    comment: 'Tipo do feriado: NACIONAL, ESTADUAL, MUNICIPAL',
  })
  holidayType!: string;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'ID do usuário que classificou o feriado',
  })
  classifiedByUserId?: number | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Data/hora da classificação',
  })
  classifiedAt?: Date | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Justificativa da classificação (opcional)',
  })
  justification?: string | null;

  // === RELACIONAMENTOS ===
  @ManyToOne(() => CompetitionPeriodEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competitionPeriodId' })
  competitionPeriod!: CompetitionPeriodEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'classifiedByUserId' })
  classifiedBy?: UserEntity | null;

  // === AUDITORIA ===
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // === MÉTODOS HELPER ===

  /**
   * Verifica se o feriado já foi classificado
   */
  isClassified(): boolean {
    return this.classification !== null;
  }

  /**
   * Verifica se o feriado é operacional (trabalhado)
   */
  isOperational(): boolean {
    return this.classification === 'UTIL';
  }

  /**
   * Retorna descrição amigável da classificação
   */
  getClassificationLabel(): string {
    switch (this.classification) {
      case 'UTIL':
        return 'Dia Útil (trabalha normalmente)';
      case 'SABADO':
        return 'Operação de Sábado (reduzida)';
      case 'DOMINGO_FERIADO':
        return 'Sem Operação (como domingo)';
      default:
        return 'Não classificado';
    }
  }
}
