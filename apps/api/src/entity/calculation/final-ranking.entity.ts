// apps/api/src/entity/calculation/final-ranking.entity.ts
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
import { SectorEntity } from '../sector.entity';

@Entity({ name: 'final_rankings' })
@Index(['competitionPeriodId', 'sectorId'], { unique: true }) // Garante uma entrada por período/setor
export class FinalRankingEntity {
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

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    comment: 'Pontuação total da filial no período',
  })
  totalScore!: number;

  @Column({ type: 'int', comment: 'Posição no ranking geral (1 a 4)' })
  rankPosition!: number;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    comment: 'Quando este cálculo foi feito/salvo',
  })
  calculatedAt!: Date;
}
