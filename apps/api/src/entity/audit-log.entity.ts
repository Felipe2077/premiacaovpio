// apps/api/src/entity/audit-log.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'audit_logs' })
@Index(['userId', 'actionType', 'timestamp']) // Índices comuns para busca
@Index(['entityType', 'entityId'])
export class AuditLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string; // TypeORM recomenda string para bigint

  @CreateDateColumn({ type: 'timestamp with time zone' })
  timestamp!: Date;

  @Column({ type: 'int', nullable: true }) // Pode ser ação do sistema
  userId?: number;

  // Podemos duplicar o nome para facilitar consulta ou buscar via relação
  @Column({ type: 'varchar', length: 255, nullable: true })
  userName?: string;

  @Column({ type: 'varchar', length: 100 })
  actionType!: string; // Ex: 'PARAMETRO_ALTERADO', 'LOGIN_FALHOU'

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityType?: string; // Ex: 'ParameterValueEntity', 'UserEntity'

  @Column({ type: 'varchar', nullable: true }) // Usar varchar para IDs mistos
  entityId?: string;

  @Column({ type: 'jsonb', nullable: true }) // JSONB é mais eficiente no Postgres
  details?: Record<string, any>; // Guarda { oldValue: ..., newValue: ... } ou outros detalhes

  @Column({ type: 'text', nullable: true })
  justification?: string; // Justificativa para a ação

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress?: string;

  // --- Relação (Opcional agora) ---
  // @ManyToOne(() => UserEntity, { nullable: true })
  // @JoinColumn({ name: 'userId' })
  // user?: UserEntity;
  // ------------------------------
}
