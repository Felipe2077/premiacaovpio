// apps/api/src/entity/expurgo-event.entity.ts (COM RELAÇÕES)
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CriterionEntity } from './criterion.entity';
import { SectorEntity } from './sector.entity';
import { UserEntity } from './user.entity';

export type ExpurgoStatus =
  | 'REGISTRADO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'APLICADO_MVP';

@Entity({ name: 'expurgo_events' })
@Index(['criterionId', 'sectorId', 'dataEvento'])
export class ExpurgoEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  criterionId!: number;

  @Column({ type: 'int' })
  sectorId!: number;

  @Column({ type: 'date' })
  dataEvento!: string;

  @Column({ type: 'text', nullable: true })
  descricaoEvento?: string;

  @Column({ type: 'text' })
  justificativa!: string;

  @Column({ type: 'varchar', length: 20, default: 'APLICADO_MVP' })
  status!: ExpurgoStatus;

  @Column({ type: 'int' })
  registradoPorUserId!: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  registradoEm!: Date;

  @Column({ type: 'int', nullable: true })
  aprovadoPorUserId?: number | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  aprovadoEm?: Date | null;

  // --- Relações HABILITADAS ---
  @ManyToOne(() => CriterionEntity, { onDelete: 'RESTRICT' }) // Não deixa apagar critério se tiver expurgo
  @JoinColumn({ name: 'criterionId' })
  criterio!: CriterionEntity; // Assume que critério é obrigatório

  @ManyToOne(() => SectorEntity, { onDelete: 'RESTRICT' }) // Não deixa apagar setor se tiver expurgo
  @JoinColumn({ name: 'sectorId' })
  setor!: SectorEntity; // Assume que setor é obrigatório

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' }) // Se apagar user, log mantém registro com user null
  @JoinColumn({ name: 'registradoPorUserId' })
  registradoPor!: UserEntity; // Assume que registrador é obrigatório

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'aprovadoPorUserId' })
  aprovadoPor?: UserEntity;
  // ---------------------------
}
