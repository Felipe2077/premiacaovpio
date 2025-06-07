// apps/api/src/entity/parameter-value.entity.ts (COM VERSIONAMENTO)
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompetitionPeriodEntity } from './competition-period.entity';
import { CriterionEntity } from './criterion.entity';
import { SectorEntity } from './sector.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'parameter_values' })
export class ParameterValueEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100 })
  nomeParametro!: string;

  @Column({ type: 'text' })
  valor!: string;

  @Column({ type: 'date' })
  dataInicioEfetivo!: string;

  @Column({ type: 'date', nullable: true })
  dataFimEfetivo!: string | null;

  // ⭐ NOVO: Campo de versionamento
  @Column({ type: 'int', default: 1 })
  versao!: number;

  // --- RELAÇÃO COM CRITERION ---
  @Column({ type: 'int', nullable: true })
  criterionId?: number | null;

  @ManyToOne(() => CriterionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'criterionId' })
  criterio?: CriterionEntity;
  // -----------------------------

  // --- RELAÇÃO COM SECTOR ---
  @Column({ type: 'int', nullable: true })
  sectorId?: number | null;

  @ManyToOne(() => SectorEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sectorId' })
  setor?: SectorEntity;

  @Column({ type: 'int', nullable: true })
  previousVersionId?: number | null;
  // --------------------------

  // --- RELAÇÃO COM USER (createdBy) ---
  @Column({ type: 'int', nullable: true })
  createdByUserId?: number | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  criadoPor?: UserEntity;
  // ------------------------------------

  @Column({ type: 'text', nullable: true })
  justificativa?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @ManyToOne(() => ParameterValueEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'previousVersionId' })
  previousVersion?: ParameterValueEntity | null;

  // --- RELAÇÃO COM COMPETITION PERIOD ---
  @Column({ type: 'int' })
  competitionPeriodId!: number;

  @ManyToOne(() => CompetitionPeriodEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competitionPeriodId' })
  competitionPeriod!: CompetitionPeriodEntity;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;
  // -------------------------------------------------------------
}
