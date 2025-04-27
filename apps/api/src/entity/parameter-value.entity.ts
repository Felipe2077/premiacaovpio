// apps/api/src/entity/parameter-value.entity.ts (COM RELAÇÕES)
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
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

  @Column({ type: 'int', nullable: true })
  criterionId?: number;

  @Column({ type: 'int', nullable: true })
  sectorId?: number;

  @Column({ type: 'int', nullable: true })
  createdByUserId?: number;

  @Column({ type: 'text', nullable: true })
  justificativa?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  // --- Relações HABILITADAS ---
  @ManyToOne(() => CriterionEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'criterionId' })
  criterio?: CriterionEntity;

  @ManyToOne(() => SectorEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sectorId' })
  setor?: SectorEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' }) // FK nesta tabela
  criadoPor?: UserEntity; // Propriedade para acessar usuário
  // ---------------------------
}
