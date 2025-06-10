// apps/api/src/entity/role.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

// Enum de permissões - será movido para shared-types depois
export enum Permission {
  // === DIRETOR (Controle Total) ===
  MANAGE_USERS = 'manage_users',
  MANAGE_ROLES = 'manage_roles',
  MANAGE_PARAMETERS = 'manage_parameters',
  CLOSE_PERIODS = 'close_periods',
  START_PERIODS = 'start_periods',
  APPROVE_EXPURGOS = 'approve_expurgos',
  REJECT_EXPURGOS = 'reject_expurgos',
  DELETE_EXPURGOS = 'delete_expurgos',
  MANAGE_SYSTEM_SETTINGS = 'manage_system_settings',
  VIEW_ALL_AUDIT_LOGS = 'view_all_audit_logs',
  RESOLVE_TIES = 'resolve_ties',

  // === GERENTE (Operacional) ===
  REQUEST_EXPURGOS = 'request_expurgos',
  EDIT_OWN_EXPURGOS = 'edit_own_expurgos',
  VIEW_REPORTS = 'view_reports',
  VIEW_DETAILED_PERFORMANCE = 'view_detailed_performance',
  VIEW_SECTOR_LOGS = 'view_sector_logs',
  VIEW_PARAMETERS = 'view_parameters',

  // === VISUALIZADOR (Somente Leitura) ===
  VIEW_RANKINGS = 'view_rankings',
  VIEW_PUBLIC_REPORTS = 'view_public_reports',
  VIEW_OWN_PROFILE = 'view_own_profile',
}

@Entity({ name: 'roles' })
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nome!: string; // 'DIRETOR', 'GERENTE', 'VISUALIZADOR'

  @Column({ type: 'text', nullable: true })
  description?: string;

  // === SISTEMA DE PERMISSÕES ===
  @Column({ type: 'jsonb' })
  permissions!: Permission[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  // === METADATA ===
  @Column({ type: 'int', default: 0 })
  userCount?: number; // Quantos usuários têm este role

  // === AUDITORIA ===
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;

  // === MÉTODOS HELPER ===

  /**
   * Verifica se o role tem uma permissão específica
   */
  hasPermission(permission: Permission): boolean {
    return this.permissions.includes(permission);
  }

  /**
   * Verifica se o role tem alguma das permissões especificadas
   */
  hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some((permission) =>
      this.permissions.includes(permission)
    );
  }

  /**
   * Adiciona uma permissão se não existir
   */
  addPermission(permission: Permission): void {
    if (!this.hasPermission(permission)) {
      this.permissions.push(permission);
    }
  }

  /**
   * Remove uma permissão
   */
  removePermission(permission: Permission): void {
    this.permissions = this.permissions.filter((p) => p !== permission);
  }

  /**
   * Retorna as permissões de forma legível
   */
  getPermissionLabels(): string[] {
    return this.permissions.map((permission) => {
      // Converter snake_case para Título
      return permission
        .split('_')
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(' ');
    });
  }

  /**
   * Define permissões padrão baseadas no nome do role
   */
  static getDefaultPermissions(roleName: string): Permission[] {
    switch (roleName.toUpperCase()) {
      case 'DIRETOR':
        return [
          // Todas as permissões
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
        ];

      case 'GERENTE':
        return [
          Permission.REQUEST_EXPURGOS,
          Permission.EDIT_OWN_EXPURGOS,
          Permission.VIEW_REPORTS,
          Permission.VIEW_DETAILED_PERFORMANCE,
          Permission.VIEW_SECTOR_LOGS,
          Permission.VIEW_PARAMETERS,
          Permission.VIEW_RANKINGS,
          Permission.VIEW_PUBLIC_REPORTS,
          Permission.VIEW_OWN_PROFILE,
        ];

      case 'VISUALIZADOR':
        return [
          Permission.VIEW_RANKINGS,
          Permission.VIEW_PUBLIC_REPORTS,
          Permission.VIEW_OWN_PROFILE,
        ];

      default:
        return [Permission.VIEW_OWN_PROFILE];
    }
  }
}
