// apps/api/src/entity/user.entity.ts - VERSÃO FINAL COMPATÍVEL

import { Role } from '@sistema-premiacao/shared-types';
import * as bcrypt from 'bcrypt';
import {
  BeforeInsert,
  BeforeUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Permission } from './role.entity';
import { SectorEntity } from './sector.entity';

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

  @Column({ type: 'int', nullable: true, name: 'sectorId' })
  sectorId?: number;
  @ManyToOne(() => SectorEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sectorId' })
  sector?: SectorEntity;

  // Campos que já existem no banco (nomes exatos)
  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;

  // Campos novos adicionados
  @Column({ type: 'timestamp', nullable: true, name: 'lastLoginAt' })
  lastLoginAt?: Date;

  @Column({ type: 'int', default: 0, name: 'loginAttempts' })
  loginAttempts: number;

  @Column({ type: 'timestamp', nullable: true, name: 'lockedUntil' })
  lockedUntil?: Date;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'resetPasswordToken',
  })
  resetPasswordToken?: string;

  @Column({ type: 'timestamp', nullable: true, name: 'resetPasswordExpires' })
  resetPasswordExpires?: Date;

  // Métodos para hash da senha
  @BeforeInsert()
  @BeforeUpdate()
  async hashPassword() {
    if (
      this.senha &&
      !this.senha.startsWith('$2b$') &&
      !this.senha.startsWith('$2a$')
    ) {
      // Só fazer hash se não estiver já hasheada
      this.senha = await bcrypt.hash(this.senha, 12);
    }
  }

  // Método para validar senha
  async validatePassword(plainPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, this.senha);
    } catch (error) {
      console.error('Erro ao validar senha:', error);
      return false;
    }
  }

  // Método para verificar se conta está bloqueada
  isLocked(): boolean {
    return !!(this.lockedUntil && this.lockedUntil > new Date());
  }

  // Método para incrementar tentativas de login
  incrementLoginAttempts(): void {
    this.loginAttempts += 1;

    // Bloquear após 5 tentativas por 15 minutos
    if (this.loginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos
    }
  }

  // Método para resetar tentativas
  resetLoginAttempts(): void {
    this.loginAttempts = 0;
    this.lockedUntil = undefined;
    this.lastLoginAt = new Date();
  }

  // Método para obter permissões baseadas no role
  getPermissions(): string[] {
    const permissions: Record<Role, Permission[]> = {
      [Role.DIRETOR]: [
        // Todas as permissões para diretor
        Permission.MANAGE_USERS,
        Permission.MANAGE_ROLES,
        Permission.MANAGE_PARAMETERS,
        Permission.CLOSE_PERIODS,
        Permission.START_PERIODS,
        Permission.APPROVE_EXPURGOS,
        Permission.REJECT_EXPURGOS,
        Permission.DELETE_EXPURGOS,
        Permission.MANAGE_SYSTEM_SETTINGS,
        Permission.VIEW_ALL_AUDIT_LOGS,
        Permission.RESOLVE_TIES,
        Permission.REQUEST_EXPURGOS,
        Permission.EDIT_OWN_EXPURGOS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_DETAILED_PERFORMANCE,
        Permission.VIEW_SECTOR_LOGS,
        Permission.VIEW_PARAMETERS,
        Permission.VIEW_RANKINGS,
        Permission.VIEW_PUBLIC_REPORTS,
        Permission.VIEW_OWN_PROFILE,
      ],
      [Role.GERENTE]: [
        Permission.REQUEST_EXPURGOS,
        Permission.EDIT_OWN_EXPURGOS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_DETAILED_PERFORMANCE,
        Permission.VIEW_SECTOR_LOGS,
        Permission.VIEW_PARAMETERS,
        Permission.VIEW_RANKINGS,
        Permission.VIEW_PUBLIC_REPORTS,
        Permission.VIEW_OWN_PROFILE,
      ],
      [Role.VISUALIZADOR]: [
        Permission.VIEW_RANKINGS,
        Permission.VIEW_PUBLIC_REPORTS,
        Permission.VIEW_OWN_PROFILE,
      ],
    };

    // Retorna os valores do enum (snake_case)
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

  // Método estático para encontrar usuário com senha (para login)
  static async findByEmailWithPassword(
    email: string,
    userRepository: any
  ): Promise<UserEntity | null> {
    return await userRepository
      .createQueryBuilder('user')
      .addSelect('user.senha')
      .where('user.email = :email', { email })
      .andWhere('user.ativo = :ativo', { ativo: true })
      .getOne();
  }
}
