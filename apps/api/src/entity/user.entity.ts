// apps/api/src/entity/user.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RoleEntity } from './role.entity';

@Entity({ name: 'users' })
@Index(['email'])
@Index(['lastLoginAt'])
@Index(['failedLoginAttempts'])
export class UserEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255 })
  nome!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  // === CAMPOS DE AUTENTICAÇÃO ===
  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lockedUntil?: Date;

  // === RECUPERAÇÃO DE SENHA ===
  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  resetPasswordToken?: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  resetPasswordExpires?: Date;

  // === METADATA DE SESSÃO ===
  @Column({ type: 'jsonb', nullable: true })
  sessionMetadata?: {
    ipAddress?: string;
    userAgent?: string;
    lastActiveAt?: Date;
    location?: string;
  }[];

  // === CAMPOS EXISTENTES ===
  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  // === SETOR (para Gerentes) ===
  @Column({ type: 'int', nullable: true })
  sectorId?: number;

  // === RELAÇÕES ===
  @ManyToMany(() => RoleEntity)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: RoleEntity[];

  // === AUDITORIA ===
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // === MÉTODOS HELPER ===

  /**
   * Verifica se a conta está bloqueada
   */
  isLocked(): boolean {
    if (!this.lockedUntil) return false;
    return new Date() < this.lockedUntil;
  }

  /**
   * Verifica se precisa resetar tentativas de login
   */
  shouldResetLoginAttempts(): boolean {
    if (!this.lastLoginAt) return false;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.lastLoginAt < oneHourAgo;
  }

  /**
   * Adiciona metadata de sessão (mantém apenas últimas 5)
   */
  addSessionMetadata(
    ipAddress: string,
    userAgent: string,
    location?: string
  ): void {
    if (!this.sessionMetadata) {
      this.sessionMetadata = [];
    }

    this.sessionMetadata.unshift({
      ipAddress,
      userAgent,
      location,
      lastActiveAt: new Date(),
    });

    // Manter apenas últimas 5 sessões
    this.sessionMetadata = this.sessionMetadata.slice(0, 5);
  }

  /**
   * Retorna informações básicas do usuário (sem dados sensíveis)
   */
  getPublicInfo() {
    return {
      id: this.id,
      nome: this.nome,
      email: this.email,
      ativo: this.ativo,
      lastLoginAt: this.lastLoginAt,
      sectorId: this.sectorId,
      roles: this.roles?.map((role) => role.nome) || [],
      createdAt: this.createdAt,
    };
  }
}
