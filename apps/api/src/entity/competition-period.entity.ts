// apps/api/src/entity/competition-period.entity.ts (ATUALIZADO)
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
import { SectorEntity } from './sector.entity'; // NOVA IMPORTAÇÃO
import { UserEntity } from './user.entity';

// Define os status possíveis usando um tipo exportado - ATUALIZADO
export type CompetitionStatus =
  | 'PLANEJAMENTO'
  | 'ATIVA'
  | 'PRE_FECHADA'
  | 'FECHADA';

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
    enum: ['PLANEJAMENTO', 'ATIVA', 'PRE_FECHADA', 'FECHADA'], // ATUALIZADO
    default: 'PLANEJAMENTO',
  })
  status!: CompetitionStatus;

  // ===== CAMPOS EXISTENTES PARA FECHAMENTO MANUAL =====
  @Column({
    type: 'int',
    nullable: true,
    comment: 'ID do usuário que fechou o período manualmente',
  })
  fechadaPorUserId?: number | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp do fechamento manual',
  })
  fechadaEm?: Date | null;

  // ===== NOVOS CAMPOS PARA OFICIALIZAÇÃO =====
  @Column({
    type: 'int',
    nullable: true,
    comment: 'ID do setor vencedor oficial do período',
  })
  setorVencedorId?: number | null;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'ID do diretor que oficializou os resultados',
  })
  oficializadaPorUserId?: number | null;

  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp da oficialização dos resultados pelo diretor',
  })
  oficializadaEm?: Date | null;

  @Column({
    type: 'int',
    nullable: true,
    comment: 'ID do diretor que resolveu empate (se aplicável)',
  })
  vencedorEmpateDefinidoPor?: number | null;

  // ===== RELACIONAMENTOS EXISTENTES =====
  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'fechadaPorUserId' })
  fechadaPor?: UserEntity;

  // ===== NOVOS RELACIONAMENTOS =====
  @ManyToOne(() => SectorEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'setorVencedorId' })
  setorVencedor?: SectorEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'oficializadaPorUserId' })
  oficializadaPor?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vencedorEmpateDefinidoPor' })
  vencedorEmpateDefinidoPorUsuario?: UserEntity;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // ===== MÉTODOS HELPER =====

  /**
   * Verifica se o período está em status que permite oficialização
   */
  canBeOfficialized(): boolean {
    return this.status === 'PRE_FECHADA';
  }

  /**
   * Verifica se o período pode ser ativado (todas as validações)
   */
  canBeActivated(): boolean {
    return this.status === 'PLANEJAMENTO';
  }

  /**
   * Verifica se o período pode ser pré-fechado automaticamente
   */
  canBePreClosed(): boolean {
    return this.status === 'ATIVA';
  }

  /**
   * Verifica se é um período oficialmente finalizado
   */
  isOfficiallyFinalized(): boolean {
    return this.status === 'FECHADA' && this.oficializadaPorUserId !== null;
  }
}
