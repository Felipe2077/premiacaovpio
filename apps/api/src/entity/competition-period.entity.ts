// apps/api/src/entity/competition-period.entity.ts (COMPLETO)
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
import { UserEntity } from './user.entity';

// Define os status possíveis usando um tipo exportado
export type CompetitionStatus = 'PLANEJAMENTO' | 'ATIVA' | 'FECHADA';

@Entity({ name: 'competition_periods' }) // Nome da tabela no banco
@Index(['mesAno'], { unique: true }) // Garantir que só exista um registro por mês/ano
export class CompetitionPeriodEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 7, comment: 'Período no formato YYYY-MM' })
  mesAno!: string;

  @Column({
    type: 'date',
    comment: 'Data de início do período (ex: 2025-05-01)',
  })
  dataInicio!: string; // Usar string YYYY-MM-DD

  @Column({ type: 'date', comment: 'Data de fim do período (ex: 2025-05-31)' })
  dataFim!: string; // Usar string YYYY-MM-DD

  @Column({
    type: 'varchar',
    length: 20,
    enum: ['PLANEJAMENTO', 'ATIVA', 'FECHADA'],
    default: 'PLANEJAMENTO',
  })
  status!: CompetitionStatus;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'ID do usuário que fechou o período',
  })
  fechadaPorUserId?: number | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp do fechamento',
  }) // Usar @UpdateDateColumn aqui? Não, é específico do fechamento
  fechadaEm?: Date | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fechadaPorUserId' })
  fechadaPor?: UserEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
