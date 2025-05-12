// apps/api/src/entity/expurgo-event.entity.ts (CORRIGIDO)
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

// --- TIPO CORRIGIDO ---
export type ExpurgoStatus =
  | 'REGISTRADO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'APLICADO_MVP'
  | 'PENDENTE'; // Adicionado PENDENTE

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

  @Column({ type: 'text' }) // Justificativa da SOLICITAÇÃO
  justificativa!: string;

  @Column({ type: 'varchar', length: 20, default: 'APLICADO_MVP' })
  status!: ExpurgoStatus; // Tipo correto

  @Column({ type: 'int' }) // Quem registrou
  registradoPorUserId!: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  registradoEm!: Date;

  @Column({ type: 'int', nullable: true }) // Quem aprovou/rejeitou
  aprovadoPorUserId?: number | null;

  @Column({ type: 'timestamp with time zone', nullable: true }) // Quando aprovou/rejeitou
  aprovadoEm?: Date | null;

  @Column({ type: 'text', nullable: true }) // Justificativa de quem aprovou/rejeitou
  justificativaAprovacao?: string | null;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    nullable: true,
    comment:
      'Valor numérico do ajuste (ex: 1 para contagem, ou valor em KM para KM Ociosa)',
  })
  valorAjusteNumerico?: number | null;

  // ----------------------------------

  // --- Relações ---
  @ManyToOne(() => CriterionEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'criterionId' })
  criterio!: CriterionEntity;

  @ManyToOne(() => SectorEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sectorId' })
  setor!: SectorEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'registradoPorUserId' })
  registradoPor!: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'aprovadoPorUserId' })
  aprovadoPor?: UserEntity;
  // -----------------
}
