// apps/api/src/entity/parameter-value.entity.ts (COM RELAÇÕES)
import {
  Column,
  CreateDateColumn,
  Entity, // << IMPORTANTE
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

  // --- RELAÇÃO COM CRITERION ---
  @Column({ type: 'int', nullable: true }) // Tornando nullable: true para consistência, já que a relação é opcional
  criterionId?: number | null; // Permitir null aqui se a relação for opcional

  @ManyToOne(() => CriterionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'criterionId' })
  criterio?: CriterionEntity;
  // -----------------------------

  // --- RELAÇÃO COM SECTOR ---
  @Column({ type: 'int', nullable: true })
  sectorId?: number | null; // Já estava nullable e permitindo null, PERFEITO

  @ManyToOne(() => SectorEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sectorId' })
  setor?: SectorEntity;

  @Column({ type: 'int', nullable: true })
  previousVersionId?: number | null;
  // --------------------------

  // --- RELAÇÃO COM USER (createdBy) ---
  @Column({ type: 'int', nullable: true }) // Tornando nullable: true por consistência
  createdByUserId?: number | null; // Permitir null se o usuário for deletado ou não obrigatório

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

  // --- PROPRIEDADE E RELAÇÃO FALTANDO PARA COMPETITION PERIOD ---
  // Adicione estas linhas:
  @Column({ type: 'int' }) // Não pode ser nulo, uma meta sempre pertence a um período
  competitionPeriodId!: number;

  @ManyToOne(() => CompetitionPeriodEntity, { onDelete: 'CASCADE' }) // Ou 'RESTRICT'/'SET NULL' dependendo da regra
  @JoinColumn({ name: 'competitionPeriodId' })
  competitionPeriod!: CompetitionPeriodEntity;
  // -------------------------------------------------------------
}
