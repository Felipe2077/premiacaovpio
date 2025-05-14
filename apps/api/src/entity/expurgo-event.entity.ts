// apps/api/src/entity/expurgo-event.entity.ts (AJUSTADO PARA PADRÃO)
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn, // ADICIONADO
} from 'typeorm';
import { CompetitionPeriodEntity } from './competition-period.entity';
import { CriterionEntity } from './criterion.entity';
import { SectorEntity } from './sector.entity';
import { UserEntity } from './user.entity';

export type ExpurgoStatus =
  | 'PENDENTE' // PENDENTE deve ser o inicial
  | 'APROVADO'
  | 'REJEITADO'
  | 'REGISTRADO' // Mantendo se você usa para algo
  | 'APLICADO_MVP'; // Este status parece específico, talvez possa ser simplificado para APROVADO?

@Entity({ name: 'expurgo_events' })
@Index(['criterionId', 'sectorId', 'dataEvento', 'competitionPeriodId']) // Adicionado competitionPeriodId ao Index
export class ExpurgoEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  competitionPeriodId!: number; // FK

  @ManyToOne(() => CompetitionPeriodEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'competitionPeriodId' })
  competitionPeriod!: CompetitionPeriodEntity;

  @Column({ type: 'int' })
  criterionId!: number; // FK

  @ManyToOne(() => CriterionEntity, { onDelete: 'RESTRICT' }) // onDelete: 'RESTRICT' é mais seguro que 'SET NULL' se criterionId não for nullable
  @JoinColumn({ name: 'criterionId' })
  criterion!: CriterionEntity; // Nome da propriedade de relação para 'criterio'

  @Column({ type: 'int' })
  sectorId!: number; // FK

  @ManyToOne(() => SectorEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'sectorId' })
  sector!: SectorEntity; // Nome da propriedade de relação para 'setor'

  @Column({ type: 'date' })
  dataEvento!: string;

  @Column({ type: 'text', nullable: true })
  descricaoEvento?: string;

  @Column({ type: 'text' }) // Justificativa da SOLICITAÇÃO
  justificativa!: string; // No DTO e serviço usamos 'justificativaSolicitacao' para clareza

  @Column({
    type: 'varchar',
    length: 20,
    enum: ['PENDENTE', 'APROVADO', 'REJEITADO'], // Simplificado para o fluxo
    default: 'PENDENTE',
  })
  status!: ExpurgoStatus;

  @Column({ type: 'int' }) // Quem registrou/solicitou
  registradoPorUserId!: number; // FK

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' }) // Se usuário for deletado, o expurgo não some
  @JoinColumn({ name: 'registradoPorUserId' })
  registradoPor!: UserEntity; // Propriedade da relação

  @Column({ type: 'int', nullable: true }) // Quem aprovou/rejeitou
  aprovadoPorUserId?: number | null; // FK

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'aprovadoPorUserId' })
  aprovadoPor?: UserEntity | null; // Propriedade da relação

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    name: 'aprovado_em',
  }) // Mantendo seu nome de coluna
  aprovadoEm?: Date | null; // Timestamp da aprovação/rejeição

  @Column({ type: 'text', nullable: true })
  justificativaAprovacao?: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  valorAjusteNumerico?: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' }) // PADRONIZADO
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' }) // PADRONIZADO
  updatedAt!: Date;
}
