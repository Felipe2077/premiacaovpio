// File: apps/api/src/entity/notification.entity.ts

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

export enum NotificationType {
  // Expurgos
  EXPURGO_SOLICITADO = 'EXPURGO_SOLICITADO',
  EXPURGO_APROVADO = 'EXPURGO_APROVADO',
  EXPURGO_REJEITADO = 'EXPURGO_REJEITADO',
  
  // ETL & Sistema
  ETL_CONCLUIDO = 'ETL_CONCLUIDO',
  ETL_FALHOU = 'ETL_FALHOU',

  // Genérico
  INFO = 'INFO',
  AVISO = 'AVISO',
  ERRO = 'ERRO',
}

@Entity({ name: 'notifications' })
@Index('idx_notification_user_read', ['userId', 'isRead'])
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type!: NotificationType;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  link?: string;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
