// apps/api/src/entity/audit-log.entity.ts (COM RELAÇÕES)
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity({ name: 'audit_logs' })
@Index(['userId', 'actionType', 'timestamp'])
@Index(['entityType', 'entityId'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp!: Date;

  @Column({ type: 'int', nullable: true })
  userId?: number;

  @Column({ type: 'varchar', length: 255, nullable: true }) // Mantém nome aqui para log rápido
  userName?: string;

  @Column({ type: 'varchar', length: 100 })
  actionType!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityType?: string;

  @Column({ type: 'varchar', nullable: true })
  entityId?: string;

  @Column({ type: 'jsonb', nullable: true })
  details?: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  justification?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress?: string;

  // --- Relação HABILITADA ---
  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' }) // Permite user nulo (ação do sistema)
  @JoinColumn({ name: 'userId' }) // FK nesta tabela
  user?: UserEntity; // Propriedade para acessar o usuário
  // -------------------------
}
