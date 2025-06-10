// packages/shared-types/src/dto/auth.dto.ts
import { Permission, Role } from '../enums/permission.enum';

// === LOGIN ===
export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // segundos
  sessionId: string;
}

// === USUÁRIO AUTENTICADO ===
export interface AuthUser {
  id: number;
  nome: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  sectorId?: number;
  lastLoginAt?: Date;
  sessionMetadata?: {
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    lastActiveAt?: Date;
  }[];
}

// === REGISTRO DE USUÁRIO ===
export interface RegisterUserDto {
  nome: string;
  email: string;
  password: string;
  roles: Role[];
  sectorId?: number;
}

export interface RegisterUserResponse {
  user: {
    id: number;
    nome: string;
    email: string;
    roles: Role[];
    ativo: boolean;
  };
  temporaryPassword?: string; // Se gerada automaticamente
}

// === ALTERAÇÃO DE SENHA ===
export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// === RECUPERAÇÃO DE SENHA ===
export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

// === REFRESH TOKEN ===
export interface RefreshTokenDto {
  refreshToken: string;
  sessionId: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
}

// === GESTÃO DE USUÁRIOS ===
export interface UpdateUserDto {
  nome?: string;
  email?: string;
  roles?: Role[];
  sectorId?: number;
  ativo?: boolean;
}

export interface UserFilters {
  active?: boolean;
  role?: Role;
  sectorId?: number;
  search?: string; // busca por nome ou email
}

export interface PaginatedUsers {
  data: UserSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserSummary {
  id: number;
  nome: string;
  email: string;
  roles: Role[];
  ativo: boolean;
  lastLoginAt?: Date;
  sectorId?: number;
  createdAt: Date;
}

// === SESSÕES ===
export interface SessionInfo {
  id: string;
  deviceInfo?: string;
  location?: string;
  ipAddress: string;
  lastUsedAt: Date;
  createdAt: Date;
  isActive: boolean;
  isCurrent: boolean;
}

export interface ActiveSessionsResponse {
  sessions: SessionInfo[];
  total: number;
}

// === PERFIL DO USUÁRIO ===
export interface UserProfile {
  id: number;
  nome: string;
  email: string;
  roles: Role[];
  permissions: Permission[];
  sectorId?: number;
  lastLoginAt?: Date;
  createdAt: Date;
  activeSessions: number;
  recentActivity: {
    action: string;
    timestamp: Date;
    ipAddress?: string;
  }[];
}

// === VALIDAÇÕES ===
export interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
  isValid: boolean;
  score: number; // 0-100
}

// === ERROS DE AUTENTICAÇÃO ===
export enum AuthErrorCode {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_INACTIVE = 'ACCOUNT_INACTIVE',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  PASSWORD_TOO_WEAK = 'PASSWORD_TOO_WEAK',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  RESET_TOKEN_INVALID = 'RESET_TOKEN_INVALID',
  TOO_MANY_ATTEMPTS = 'TOO_MANY_ATTEMPTS',
}

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, any>;
  retryAfter?: number; // segundos para tentar novamente
}

// === AUDIT EVENTS ===
export enum AuthAuditEvent {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED',
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_INVALIDATED = 'SESSION_INVALIDATED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
}

// === UTILITÁRIOS ===
export function validatePassword(password: string): PasswordValidation {
  const validation: PasswordValidation = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    isValid: false,
    score: 0,
  };

  // Calcular score
  let score = 0;
  if (validation.minLength) score += 20;
  if (validation.hasUppercase) score += 20;
  if (validation.hasLowercase) score += 20;
  if (validation.hasNumbers) score += 20;
  if (validation.hasSpecialChars) score += 20;

  validation.score = score;
  validation.isValid = score >= 80; // Precisa de pelo menos 4/5 critérios

  return validation;
}

export function formatSessionDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  let browser = 'Navegador';
  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';

  let os = 'Desktop';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('macintosh')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

  return `${browser} • ${os}`;
}
