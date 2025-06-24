// packages/shared-types/src/dto/user.dto.ts
import { Permission, Role } from '../enums/permission.enum';

// ============================================
// 🏗️ DTOs PRINCIPAIS DE GESTÃO DE USUÁRIOS
// ============================================

export interface CreateUserDto {
  nome: string;
  email: string;
  password?: string;
  role: Role;
  sectorId?: number;
  ativo?: boolean;
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserDto {
  nome?: string;
  email?: string;
  role?: Role;
  sectorId?: number;
  ativo?: boolean;
}

export interface UserFilters {
  active?: boolean;
  role?: Role;
  sectorId?: number;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
}

export interface PaginatedUsersResponse {
  data: UserSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UserSummary {
  id: number;
  nome: string;
  email: string;
  role: Role; // Note: É 'role' singular, não 'roles' plural
  ativo: boolean;
  lastLoginAt?: Date | string | null;
  sectorId?: number;
  sector?: {
    id: number;
    nome: string;
  };
  createdAt: Date | string;
  updatedAt: Date | string;
  loginAttempts: number;
  isLocked: boolean;
}

export interface UserDetail {
  id: number;
  nome: string;
  email: string;
  role: Role;
  permissions: Permission[];
  ativo: boolean;
  sectorId?: number;
  sector?: {
    id: number;
    nome: string;
  };
  lastLoginAt?: Date | string | null;
  loginAttempts: number;
  lockedUntil?: Date | string | null;
  isLocked: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  activeSessions?: number;
  recentActivity?: UserActivity[];
}

export interface UserActivity {
  action: string;
  timestamp: Date | string;
  ipAddress?: string;
  details?: Record<string, any>;
}

export interface AdminResetPasswordDto {
  newPassword?: string;
  forceChangeOnLogin?: boolean;
  notifyUser?: boolean;
  justification: string;
}

export interface UnlockUserDto {
  justification: string;
  resetLoginAttempts?: boolean;
}

export interface ToggleUserStatusDto {
  ativo: boolean;
  justification: string;
}

export interface CreateUserResponse {
  user: UserSummary;
  temporaryPassword?: string;
  actions: {
    emailSent: boolean;
    passwordGenerated: boolean;
  };
}

export interface ResetPasswordResponse {
  success: boolean;
  newPassword?: string;
  actions: {
    emailSent: boolean;
    passwordGenerated: boolean;
  };
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  lockedUsers: number;
  byRole: Record<Role, number>;
  bySector: Record<string, number>;
  recentLogins: number;
  recentRegistrations: number;
}

// ============================================
// 🛡️ FUNÇÕES DE VALIDAÇÃO
// ============================================

export function validateCreateUser(data: unknown): CreateUserDto {
  if (!data || typeof data !== 'object') {
    throw new Error('Dados de entrada devem ser um objeto');
  }

  const dto = data as Record<string, unknown>;

  if (!dto.nome || typeof dto.nome !== 'string' || dto.nome.trim().length < 2) {
    throw new Error('Nome é obrigatório e deve ter pelo menos 2 caracteres');
  }

  if (!dto.email || typeof dto.email !== 'string') {
    throw new Error('Email é obrigatório');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(dto.email)) {
    throw new Error('Email deve ter formato válido');
  }

  if (!dto.role || !Object.values(Role).includes(dto.role as Role)) {
    throw new Error(`Role deve ser um de: ${Object.values(Role).join(', ')}`);
  }

  if (dto.password && typeof dto.password === 'string') {
    if (dto.password.length < 8) {
      throw new Error('Senha deve ter pelo menos 8 caracteres');
    }
  }

  if (dto.sectorId !== undefined) {
    if (!Number.isInteger(dto.sectorId) || (dto.sectorId as number) <= 0) {
      throw new Error('sectorId deve ser um número inteiro positivo');
    }
  }

  return {
    nome: dto.nome.trim(),
    email: dto.email.toLowerCase().trim(),
    password: dto.password as string | undefined,
    role: dto.role as Role,
    sectorId: dto.sectorId as number | undefined,
    ativo: dto.ativo !== false,
    sendWelcomeEmail: dto.sendWelcomeEmail !== false,
  };
}

export function validateUpdateUser(data: unknown): UpdateUserDto {
  if (!data || typeof data !== 'object') {
    throw new Error('Dados de entrada devem ser um objeto');
  }

  const dto = data as Record<string, unknown>;
  const result: UpdateUserDto = {};

  if (dto.nome !== undefined) {
    if (typeof dto.nome !== 'string' || dto.nome.trim().length < 2) {
      throw new Error('Nome deve ter pelo menos 2 caracteres');
    }
    result.nome = dto.nome.trim();
  }

  if (dto.email !== undefined) {
    if (typeof dto.email !== 'string') {
      throw new Error('Email deve ser uma string');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      throw new Error('Email deve ter formato válido');
    }
    result.email = dto.email.toLowerCase().trim();
  }

  if (dto.role !== undefined) {
    if (!Object.values(Role).includes(dto.role as Role)) {
      throw new Error(`Role deve ser um de: ${Object.values(Role).join(', ')}`);
    }
    result.role = dto.role as Role;
  }

  if (dto.sectorId !== undefined) {
    if (
      dto.sectorId !== null &&
      (!Number.isInteger(dto.sectorId) || (dto.sectorId as number) <= 0)
    ) {
      throw new Error('sectorId deve ser um número inteiro positivo ou null');
    }
    result.sectorId = dto.sectorId as number | undefined;
  }

  if (dto.ativo !== undefined) {
    if (typeof dto.ativo !== 'boolean') {
      throw new Error('ativo deve ser um boolean');
    }
    result.ativo = dto.ativo;
  }

  return result;
}

export function validateUserFilters(data: unknown): UserFilters {
  if (!data) return {};

  if (typeof data !== 'object') {
    throw new Error('Filtros devem ser um objeto');
  }

  const dto = data as Record<string, unknown>;
  const result: UserFilters = {};

  if (dto.active !== undefined) {
    if (typeof dto.active !== 'boolean') {
      throw new Error('active deve ser um boolean');
    }
    result.active = dto.active;
  }

  if (dto.role !== undefined) {
    if (!Object.values(Role).includes(dto.role as Role)) {
      throw new Error(`role deve ser um de: ${Object.values(Role).join(', ')}`);
    }
    result.role = dto.role as Role;
  }

  if (dto.sectorId !== undefined) {
    if (!Number.isInteger(dto.sectorId) || (dto.sectorId as number) <= 0) {
      throw new Error('sectorId deve ser um número inteiro positivo');
    }
    result.sectorId = dto.sectorId as number;
  }

  if (dto.search !== undefined) {
    if (typeof dto.search !== 'string') {
      throw new Error('search deve ser uma string');
    }
    result.search = dto.search.trim();
  }

  if (dto.page !== undefined) {
    if (!Number.isInteger(dto.page) || (dto.page as number) < 1) {
      throw new Error('page deve ser um número inteiro positivo');
    }
    result.page = dto.page as number;
  }

  if (dto.limit !== undefined) {
    if (
      !Number.isInteger(dto.limit) ||
      (dto.limit as number) < 1 ||
      (dto.limit as number) > 100
    ) {
      throw new Error('limit deve ser um número entre 1 e 100');
    }
    result.limit = dto.limit as number;
  }

  if (dto.sortBy !== undefined) {
    if (typeof dto.sortBy !== 'string') {
      throw new Error('sortBy deve ser uma string');
    }
    const validSortFields = [
      'nome',
      'email',
      'role',
      'createdAt',
      'lastLoginAt',
    ];
    const validSortDirections = ['asc', 'desc'];

    const [field, direction] = dto.sortBy.split(':');
    if (
      !validSortFields.includes(field) ||
      !validSortDirections.includes(direction)
    ) {
      throw new Error(
        `sortBy deve estar no formato campo:direção. Campos válidos: ${validSortFields.join(', ')}. Direções: ${validSortDirections.join(', ')}`
      );
    }
    result.sortBy = dto.sortBy;
  }

  return result;
}

export function validateAdminAction(
  data: unknown,
  actionType: string
): { justification: string } {
  if (!data || typeof data !== 'object') {
    throw new Error('Dados de entrada devem ser um objeto');
  }

  const dto = data as Record<string, unknown>;

  if (!dto.justification || typeof dto.justification !== 'string') {
    throw new Error('Justificativa é obrigatória para ações administrativas');
  }

  const justification = dto.justification.trim();
  if (justification.length < 10) {
    throw new Error('Justificativa deve ter pelo menos 10 caracteres');
  }

  if (justification.length > 500) {
    throw new Error('Justificativa não pode exceder 500 caracteres');
  }

  return { justification };
}
