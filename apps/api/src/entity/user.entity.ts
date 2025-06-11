// apps/api/src/entity/user.entity.ts - VERSÃO COMPLETA PARA AUTENTICAÇÃO

import { Role } from '@sistema-premiacao/shared-types';
import * as bcrypt from 'bcrypt';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nome: string;

  @Column({ length: 150, unique: true })
  email: string;

  @Column({ length: 255, select: false }) // select: false para segurança
  senha: string;

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.GERENTE,
  })
  role: Role;

  @Column({ type: 'boolean', default: true })
  ativo: boolean;

  @Column({ type: 'int', nullable: true })
  sectorId?: number;

  // Campos de auditoria
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'int', default: 0 })
  loginAttempts: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resetPasswordToken?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires?: Date;

  // Métodos para hash da senha
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (this.senha && !this.senha.startsWith('$2b$')) {
      // Só fazer hash se não estiver já hasheada
      this.senha = await bcrypt.hash(this.senha, 12);
    }
  }

  // Método para validar senha
  async validatePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.senha);
  }

  // Método para verificar se conta está bloqueada
  isLocked(): boolean {
    return !!(this.lockedUntil && this.lockedUntil > new Date());
  }

  // Método para incrementar tentativas de login
  async incrementLoginAttempts(): Promise<void> {
    this.loginAttempts += 1;

    // Bloquear após 5 tentativas por 15 minutos
    if (this.loginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    }
  }

  // Método para resetar tentativas
  async resetLoginAttempts(): Promise<void> {
    this.loginAttempts = 0;
    this.lockedUntil = undefined; // undefined em vez de null
    this.lastLoginAt = new Date();
  }

  // Método para obter permissões baseadas no role
  getPermissions(): string[] {
    const permissions: Record<Role, string[]> = {
      [Role.DIRETOR]: [
        'MANAGE_USERS',
        'MANAGE_PARAMETERS',
        'APPROVE_EXPURGOS',
        'REJECT_EXPURGOS',
        'VIEW_REPORTS',
        'VIEW_RANKINGS',
        'CLOSE_PERIODS',
        'START_PERIODS',
        'VIEW_ALL_AUDIT_LOGS',
      ],
      [Role.GERENTE]: [
        'REQUEST_EXPURGOS',
        'VIEW_REPORTS',
        'VIEW_RANKINGS',
        'VIEW_PARAMETERS',
      ],
      [Role.VISUALIZADOR]: [
        'VIEW_REPORTS',
        'VIEW_RANKINGS',
        'VIEW_PUBLIC_REPORTS',
      ],
    };

    return permissions[this.role] || [];
  }

  // Método para serialização segura (sem senha)
  toSafeObject() {
    const { senha, resetPasswordToken, ...safeUser } = this;
    return {
      ...safeUser,
      permissions: this.getPermissions(),
    };
  }
}
