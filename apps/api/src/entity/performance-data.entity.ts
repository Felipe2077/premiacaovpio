// apps/api/src/entity/performance-data.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompetitionPeriodEntity } from './competition-period.entity'; // << IMPORTAR
import { CriterionEntity } from './criterion.entity'; // Se for usar
import { SectorEntity } from './sector.entity'; // Se for usar

@Entity({ name: 'performance_data' })
export class PerformanceDataEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'int', comment: 'ID do período de competição' }) // Coluna para a FK
  competitionPeriodId!: number;

  @ManyToOne(() => CompetitionPeriodEntity, { onDelete: 'CASCADE' }) // Define a relação
  @JoinColumn({ name: 'competitionPeriodId' }) // Mapeia a coluna da FK
  competitionPeriod!: CompetitionPeriodEntity; // Propriedade para acessar o objeto

  @Column({ type: 'int' })
  sectorId!: number;

  @Column({ type: 'int' })
  criterionId!: number;

  @Column({ type: 'date' })
  metricDate!: string;

  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  valor!: number | null;

  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  targetValue?: number | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  loadTimestamp!: Date;

  // Relações opcionais para setor e critério (para facilitar queries)
  @ManyToOne(() => SectorEntity, { eager: false, onDelete: 'CASCADE' }) // eager: false é o padrão
  @JoinColumn({ name: 'sectorId' })
  setor?: SectorEntity;

  @ManyToOne(() => CriterionEntity, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'criterionId' })
  criterio?: CriterionEntity;
}
