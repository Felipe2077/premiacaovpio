// apps/api/src/entity/calculation/criterion-score.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompetitionPeriodEntity } from '../competition-period.entity';
import { CriterionEntity } from '../criterion.entity';
import { SectorEntity } from '../sector.entity';

@Entity({ name: 'criterion_scores' })
@Index(['competitionPeriodId', 'sectorId', 'criterionId'], { unique: true }) // Garante uma entrada por período/setor/critério
export class CriterionScoreEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'int' })
  competitionPeriodId!: number;

  @ManyToOne(() => CompetitionPeriodEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competitionPeriodId' })
  competitionPeriod!: CompetitionPeriodEntity;

  @Column({ type: 'int' })
  sectorId!: number;

  @ManyToOne(() => SectorEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sectorId' })
  sector!: SectorEntity;

  @Column({ type: 'int' })
  criterionId!: number;

  @ManyToOne(() => CriterionEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'criterionId' })
  criterion!: CriterionEntity;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
    comment: 'Valor realizado final, pós-expurgo',
  })
  realizedValue!: number | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
    comment: 'Meta que foi aplicada no período',
  })
  targetValue!: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 4,
    nullable: true,
    comment: 'Percentual ou Razão vs Meta (Realizado/Meta)',
  })
  percentVsTarget!: number | null;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'Posição no ranking do critério (1 a 4)',
  })
  rankInCriterion?: number | null;

  @Column({
    type: 'decimal',
    precision: 3,
    scale: 2,
    comment: 'Pontuação obtida no critério (ex: 1.0, 1.5)',
  })
  scoreInCriterion!: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    comment: 'Quando este cálculo foi feito/salvo',
  })
  calculatedAt!: Date;
}
