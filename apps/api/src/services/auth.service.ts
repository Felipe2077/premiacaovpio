// apps/api/src/services/auth.service.ts - VERSÃO HÍBRIDA CORRIGIDA

import {
  AuthAuditEvent,
  AuthErrorCode,
  AuthUser,
  ChangePasswordDto,
  ForgotPasswordDto,
  formatSessionDevice,
  LoginDto,
  LoginResponse,
  ResetPasswordDto,
} from '@sistema-premiacao/shared-types';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AppDataSource } from '../database/data-source';
import { AuditLogEntity } from '../entity/audit-log.entity';
import { SessionEntity } from '../entity/session.entity';
import { UserEntity } from '../entity/user.entity';

// Classe de erro customizada para autenticação
export class AuthError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class AuthService {
  private userRepo: Repository<UserEntity>;
  private sessionRepo: Repository<SessionEntity>;
  private auditRepo: Repository<AuditLogEntity>;

  // Configurações de segurança
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutos
  private readonly ACCESS_TOKEN_EXPIRES = 15 * 60; // 15 minutos
  private readonly REFRESH_TOKEN_EXPIRES = 7 * 24 * 60 * 60; // 7 dias
  private readonly RESET_TOKEN_EXPIRES = 60 * 60 * 1000; // 1 hora

  constructor() {
    this.initializeRepositories();
  }

  private async initializeRepositories(): Promise<void> {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      this.userRepo = AppDataSource.getRepository(UserEntity);
      this.sessionRepo = AppDataSource.getRepository(SessionEntity);
      this.auditRepo = AppDataSource.getRepository(AuditLogEntity);
    } catch (error: any) {
      console.error('Erro ao inicializar repositórios do AuthService:', error);
    }
  }

  /**
   * Realiza login do usuário
   */
  async login(
    loginDto: LoginDto,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResponse> {
    const { email, password, rememberMe = false } = loginDto;

    try {
      await this.initializeRepositories();

      // 1. Buscar usuário
      const user = await this.userRepo.findOne({
        where: { email },
        relations: ['roles'],
        select: [
          'id',
          'nome',
          'email',
          'passwordHash',
          'ativo',
          'failedLoginAttempts',
          'lockedUntil',
          'lastLoginAt',
          'sectorId',
        ],
      });

      if (!user) {
        await this.logFailedLogin(email, ipAddress, 'User not found');
        throw this.createAuthError(
          AuthErrorCode.INVALID_CREDENTIALS,
          'Credenciais inválidas'
        );
      }

      // 2. Verificar se conta está ativa
      if (!user.ativo) {
        await this.logFailedLogin(email, ipAddress, 'Account inactive');
        throw this.createAuthError(
          AuthErrorCode.ACCOUNT_INACTIVE,
          'Conta inativa'
        );
      }

      // 3. Verificar se conta está bloqueada
      if (user.isLocked()) {
        await this.logFailedLogin(email, ipAddress, 'Account locked');
        const unlockTime = Math.ceil(
          (user.lockedUntil!.getTime() - Date.now()) / 1000
        );
        throw this.createAuthError(
          AuthErrorCode.ACCOUNT_LOCKED,
          'Conta temporariamente bloqueada',
          { retryAfter: unlockTime }
        );
      }

      // 4. Verificar senha
      const isPasswordValid = await argon2.verify(user.passwordHash, password);

      if (!isPasswordValid) {
        await this.handleFailedLogin(user, ipAddress);
        throw this.createAuthError(
          AuthErrorCode.INVALID_CREDENTIALS,
          'Credenciais inválidas'
        );
      }

      // 5. Resetar tentativas falhadas - CORRIGIDO
      if (user.failedLoginAttempts > 0) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = undefined; // ✅ undefined em vez de null
        await this.userRepo.save(user);
      }

      // 6. Atualizar último login e metadata
      user.lastLoginAt = new Date();
      user.addSessionMetadata(ipAddress, userAgent);
      await this.userRepo.save(user);

      // 7. Criar sessão
      const sessionId = await this.createSession(
        user,
        ipAddress,
        userAgent,
        rememberMe
      );

      // 8. Gerar tokens
      const { accessToken, refreshToken } = await this.generateTokens(
        user,
        sessionId
      );

      // 9. Log de sucesso
      await this.logSuccessfulLogin(user, ipAddress, userAgent, sessionId);

      // 10. Preparar resposta
      const authUser = await this.buildAuthUser(user);

      return {
        user: authUser,
        accessToken,
        refreshToken,
        expiresIn: this.ACCESS_TOKEN_EXPIRES,
        sessionId,
      };
    } catch (error: any) {
      if (error instanceof AuthError) {
        throw error;
      }

      console.error('[AuthService] Erro inesperado no login:', error);
      throw this.createAuthError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Erro interno do servidor'
      );
    }
  }

  /**
   * Realiza logout do usuário
   */
  async logout(sessionId: string, userId?: number): Promise<void> {
    try {
      await this.initializeRepositories();

      const session = await this.sessionRepo.findOne({
        where: { id: sessionId },
        relations: ['user'],
      });

      if (session) {
        // Invalidar sessão
        session.invalidate('manual');
        await this.sessionRepo.save(session);

        // Log de logout
        await this.logAuditEvent(session.userId, AuthAuditEvent.LOGOUT, {
          sessionId,
          manual: true,
        });
      }
    } catch (error: any) {
      console.error('[AuthService] Erro no logout:', error);
      // Não lançar erro no logout para não impactar UX
    }
  }

  /**
   * Valida e decodifica token JWT - ESSENCIAL PARA AUTENTICAÇÃO
   */
  async validateToken(token: string): Promise<AuthUser | null> {
    try {
      await this.initializeRepositories();

      // Este método será usado pelo middleware de autenticação
      // Por enquanto, vamos decodificar o token simulado
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());

      // Verificar se não expirou
      if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
        return null;
      }

      // Buscar usuário atualizado no banco
      const user = await this.getUserById(decoded.sub);
      return user;
    } catch (error: any) {
      return null;
    }
  }

  /**
   * Verifica se usuário tem permissão específica - ESSENCIAL PARA RBAC
   */
  async userHasPermission(
    userId: number,
    permission: string
  ): Promise<boolean> {
    try {
      await this.initializeRepositories();

      const user = await this.userRepo.findOne({
        where: { id: userId, ativo: true },
        relations: ['roles'],
      });

      if (!user) return false;

      return user.roles.some((role) =>
        role.permissions.includes(permission as any)
      );
    } catch (error: any) {
      console.error('[AuthService] Erro ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * Refresh do access token
   */
  async refreshAccessToken(
    refreshToken: string,
    sessionId: string
  ): Promise<LoginResponse> {
    try {
      await this.initializeRepositories();

      // 1. Validar sessão
      const session = await this.sessionRepo.findOne({
        where: { id: sessionId, isActive: true },
        relations: ['user', 'user.roles'],
      });

      if (!session || !session.isValid()) {
        throw this.createAuthError(
          AuthErrorCode.SESSION_EXPIRED,
          'Sessão expirada'
        );
      }

      // 2. Validar refresh token
      const isRefreshTokenValid = await argon2.verify(
        session.refreshTokenHash,
        refreshToken
      );
      if (!isRefreshTokenValid) {
        session.invalidate('security');
        await this.sessionRepo.save(session);
        throw this.createAuthError(
          AuthErrorCode.TOKEN_INVALID,
          'Token inválido'
        );
      }

      // 3. Verificar se usuário ainda está ativo
      if (!session.user.ativo) {
        session.invalidate('account_inactive');
        await this.sessionRepo.save(session);
        throw this.createAuthError(
          AuthErrorCode.ACCOUNT_INACTIVE,
          'Conta inativa'
        );
      }

      // 4. Atualizar última utilização da sessão
      session.updateLastUsed();
      await this.sessionRepo.save(session);

      // 5. Gerar novo access token
      const { accessToken, refreshToken: newRefreshToken } =
        await this.generateTokens(session.user, sessionId);

      // 6. Preparar resposta
      const authUser = await this.buildAuthUser(session.user);

      return {
        user: authUser,
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.ACCESS_TOKEN_EXPIRES,
        sessionId,
      };
    } catch (error: any) {
      if (error.code && Object.values(AuthErrorCode).includes(error.code)) {
        throw error;
      }

      console.error('[AuthService] Erro no refresh token:', error);
      throw this.createAuthError(
        AuthErrorCode.TOKEN_INVALID,
        'Erro ao renovar token'
      );
    }
  }

  /**
   * Altera senha do usuário
   */
  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    try {
      await this.initializeRepositories();

      // 1. Buscar usuário
      const user = await this.userRepo.findOne({
        where: { id: userId },
        select: ['id', 'email', 'passwordHash'],
      });

      if (!user) {
        throw this.createAuthError(
          AuthErrorCode.INVALID_CREDENTIALS,
          'Usuário não encontrado'
        );
      }

      // 2. Verificar senha atual
      const isCurrentPasswordValid = await argon2.verify(
        user.passwordHash,
        currentPassword
      );
      if (!isCurrentPasswordValid) {
        throw this.createAuthError(
          AuthErrorCode.INVALID_CREDENTIALS,
          'Senha atual incorreta'
        );
      }

      // 3. Hash da nova senha
      const newPasswordHash = await argon2.hash(newPassword);

      // 4. Atualizar senha
      user.passwordHash = newPasswordHash;
      await this.userRepo.save(user);

      // 5. Invalidar todas as sessões (forçar novo login)
      await this.invalidateAllUserSessions(userId);

      // 6. Log de auditoria
      await this.logAuditEvent(userId, AuthAuditEvent.PASSWORD_CHANGED, {
        initiatedByUser: true,
      });
    } catch (error: any) {
      if (error.code && Object.values(AuthErrorCode).includes(error.code)) {
        throw error;
      }

      console.error('[AuthService] Erro ao alterar senha:', error);
      throw this.createAuthError(
        AuthErrorCode.INVALID_CREDENTIALS,
        'Erro ao alterar senha'
      );
    }
  }

  /**
   * Solicita reset de senha
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    try {
      await this.initializeRepositories();

      const user = await this.userRepo.findOne({ where: { email } });

      // Por segurança, sempre retornamos sucesso (não revelar se email existe)
      if (user && user.ativo) {
        // Gerar token de reset
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto
          .createHash('sha256')
          .update(resetToken)
          .digest('hex');

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(
          Date.now() + this.RESET_TOKEN_EXPIRES
        );
        await this.userRepo.save(user);

        // TODO: Enviar email (implementar EmailService)
        console.log(`[AuthService] Reset token para ${email}: ${resetToken}`);

        // Log de auditoria
        await this.logAuditEvent(
          user.id,
          AuthAuditEvent.PASSWORD_RESET_REQUESTED,
          { email }
        );
      }

      // Sempre log genérico (não revelar se email existe)
      await this.logAuditEvent(null, AuthAuditEvent.PASSWORD_RESET_REQUESTED, {
        email,
        found: !!user,
      });
    } catch (error: any) {
      console.error(
        '[AuthService] Erro no forgot password:',
        error?.message || error
      );
      // Não lançar erro para não revelar informações
    }
  }

  /**
   * Reset de senha com token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    try {
      await this.initializeRepositories();

      // 1. Hash do token
      const hashedToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

      // 2. Buscar usuário com token válido
      const user = await this.userRepo.findOne({
        where: {
          resetPasswordToken: hashedToken,
        },
      });

      if (
        !user ||
        !user.resetPasswordExpires ||
        user.resetPasswordExpires < new Date()
      ) {
        throw this.createAuthError(
          AuthErrorCode.RESET_TOKEN_INVALID,
          'Token inválido ou expirado'
        );
      }

      // 3. Hash da nova senha
      const newPasswordHash = await argon2.hash(newPassword);

      // 4. Atualizar usuário - CORRIGIDO
      user.passwordHash = newPasswordHash;
      user.resetPasswordToken = undefined; // ✅ undefined em vez de null
      user.resetPasswordExpires = undefined; // ✅ undefined em vez de null
      user.failedLoginAttempts = 0; // Reset tentativas
      user.lockedUntil = undefined; // ✅ undefined em vez de null
      await this.userRepo.save(user);

      // 5. Invalidar todas as sessões
      await this.invalidateAllUserSessions(user.id);

      // 6. Log de auditoria
      await this.logAuditEvent(
        user.id,
        AuthAuditEvent.PASSWORD_RESET_COMPLETED,
        { email: user.email }
      );
    } catch (error: any) {
      if (error.code && Object.values(AuthErrorCode).includes(error.code)) {
        throw error;
      }

      console.error('[AuthService] Erro no reset password:', error);
      throw this.createAuthError(
        AuthErrorCode.RESET_TOKEN_INVALID,
        'Erro ao resetar senha'
      );
    }
  }

  /**
   * Obtém informações do usuário por ID
   */
  async getUserById(userId: number): Promise<AuthUser | null> {
    try {
      await this.initializeRepositories();

      const user = await this.userRepo.findOne({
        where: { id: userId, ativo: true },
        relations: ['roles'],
      });

      if (!user) return null;

      return this.buildAuthUser(user);
    } catch (error: any) {
      console.error('[AuthService] Erro ao buscar usuário:', error);
      return null;
    }
  }

  /**
   * Lista sessões ativas do usuário
   */
  async getUserSessions(userId: number): Promise<SessionEntity[]> {
    try {
      await this.initializeRepositories();

      return await this.sessionRepo.find({
        where: { userId, isActive: true },
        order: { lastUsedAt: 'DESC' },
      });
    } catch (error: any) {
      console.error('[AuthService] Erro ao buscar sessões:', error);
      return [];
    }
  }

  /**
   * Invalida sessão específica
   */
  async invalidateSession(sessionId: string): Promise<void> {
    try {
      await this.initializeRepositories();

      const session = await this.sessionRepo.findOne({
        where: { id: sessionId },
      });

      if (session) {
        session.invalidate('manual');
        await this.sessionRepo.save(session);

        await this.logAuditEvent(
          session.userId,
          AuthAuditEvent.SESSION_INVALIDATED,
          { sessionId, reason: 'Manual invalidation' }
        );
      }
    } catch (error: any) {
      console.error('[AuthService] Erro ao invalidar sessão:', error);
    }
  }

  /**
   * Desbloqueia conta de usuário (admin)
   */
  async unlockUserAccount(userId: number, adminUserId: number): Promise<void> {
    try {
      await this.initializeRepositories();

      const user = await this.userRepo.findOne({
        where: { id: userId },
      });

      if (user && user.isLocked()) {
        user.lockedUntil = undefined; // ✅ undefined em vez de null
        user.failedLoginAttempts = 0;
        await this.userRepo.save(user);

        await this.logAuditEvent(userId, AuthAuditEvent.ACCOUNT_UNLOCKED, {
          unlockedBy: adminUserId,
          reason: 'Admin action',
        });
      }
    } catch (error: any) {
      console.error('[AuthService] Erro ao desbloquear conta:', error);
      throw error;
    }
  }

  /**
   * Health check do serviço de autenticação
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    details: Record<string, any>;
  }> {
    try {
      await this.initializeRepositories();

      // Testar conexão com banco
      await this.userRepo.query('SELECT 1');

      // Estatísticas básicas
      const [totalUsers, activeSessions, lockedAccounts] = await Promise.all([
        this.userRepo.count({ where: { ativo: true } }),
        this.sessionRepo.count({ where: { isActive: true } }),
        this.userRepo.count({ where: { lockedUntil: new Date() } }),
      ]);

      return {
        healthy: true,
        details: {
          totalUsers,
          activeSessions,
          lockedAccounts,
          timestamp: new Date(),
        },
      };
    } catch (error: any) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          timestamp: new Date(),
        },
      };
    }
  }

  // === MÉTODOS PRIVADOS ===

  private async createSession(
    user: UserEntity,
    ipAddress: string,
    userAgent: string,
    rememberMe: boolean
  ): Promise<string> {
    // Limite de sessões ativas por usuário
    const activeSessions = await this.sessionRepo.count({
      where: { userId: user.id, isActive: true },
    });

    if (activeSessions >= 5) {
      // Remove sessão mais antiga
      const oldestSession = await this.sessionRepo.findOne({
        where: { userId: user.id, isActive: true },
        order: { lastUsedAt: 'ASC' },
      });

      if (oldestSession) {
        oldestSession.invalidate('max_sessions');
        await this.sessionRepo.save(oldestSession);
      }
    }

    // Criar nova sessão
    const sessionId = uuidv4();
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = await argon2.hash(refreshToken);

    const expiresAt = new Date(
      Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
    );

    const session = this.sessionRepo.create({
      id: sessionId,
      userId: user.id,
      refreshTokenHash,
      ipAddress,
      userAgent,
      deviceInfo: formatSessionDevice(userAgent),
      expiresAt,
      lastUsedAt: new Date(),
      isActive: true,
      metadata: {
        rememberMe,
        loginMethod: 'password',
      },
    });

    await this.sessionRepo.save(session);
    return sessionId;
  }

  private async generateTokens(
    user: UserEntity,
    sessionId: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Por enquanto, vamos simular os tokens até termos o Fastify disponível aqui
    // O JWT real será gerado nas rotas usando fastify.generateToken()

    const payload = {
      sub: user.id,
      email: user.email,
      nome: user.nome,
      sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + this.ACCESS_TOKEN_EXPIRES,
    };

    // Simular tokens (serão substituídos pelos reais nas rotas)
    const accessToken = Buffer.from(JSON.stringify(payload)).toString('base64');
    const refreshToken = crypto.randomBytes(64).toString('hex');

    return { accessToken, refreshToken };
  }

  private async buildAuthUser(user: UserEntity): Promise<AuthUser> {
    // Buscar permissões dos roles
    const userWithRoles = await this.userRepo.findOne({
      where: { id: user.id },
      relations: ['roles'],
    });

    const roles = userWithRoles?.roles.map((role) => role.nome as any) || [];
    const permissions =
      userWithRoles?.roles.flatMap((role) => role.permissions) || [];

    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      roles,
      permissions,
      sectorId: user.sectorId,
      lastLoginAt: user.lastLoginAt,
      sessionMetadata: user.sessionMetadata,
    };
  }

  private async handleFailedLogin(
    user: UserEntity,
    ipAddress: string
  ): Promise<void> {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= this.MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + this.LOCKOUT_DURATION);

      await this.logAuditEvent(user.id, AuthAuditEvent.ACCOUNT_LOCKED, {
        reason: 'Too many failed login attempts',
        ipAddress,
        attempts: user.failedLoginAttempts,
      });
    }

    await this.userRepo.save(user);
    await this.logFailedLogin(user.email, ipAddress, 'Invalid password');
  }

  private async invalidateAllUserSessions(userId: number): Promise<void> {
    await this.sessionRepo.update(
      { userId, isActive: true },
      { isActive: false }
    );

    await this.logAuditEvent(userId, AuthAuditEvent.SESSION_INVALIDATED, {
      reason: 'All sessions invalidated',
      count: 'all',
    });
  }

  private async logSuccessfulLogin(
    user: UserEntity,
    ipAddress: string,
    userAgent: string,
    sessionId: string
  ): Promise<void> {
    await this.logAuditEvent(
      user.id,
      AuthAuditEvent.LOGIN_SUCCESS,
      {
        email: user.email,
        ipAddress,
        userAgent,
        sessionId,
        deviceInfo: formatSessionDevice(userAgent),
      },
      ipAddress
    );
  }

  private async logFailedLogin(
    email: string,
    ipAddress: string,
    reason: string
  ): Promise<void> {
    await this.logAuditEvent(
      null,
      AuthAuditEvent.LOGIN_FAILED,
      {
        email,
        reason,
        ipAddress,
      },
      ipAddress
    );
  }

  private async logAuditEvent(
    userId: number | null,
    event: AuthAuditEvent,
    details: Record<string, any>,
    ipAddress?: string
  ): Promise<void> {
    try {
      const auditLog = this.auditRepo.create({
        userId: userId || undefined, // ✅ Corrigido: converte null para undefined
        userName: details.email || undefined,
        actionType: event,
        entityType: 'AUTH',
        details,
        ipAddress,
      });

      await this.auditRepo.save(auditLog);
    } catch (error: any) {
      console.error('[AuthService] Erro ao criar log de auditoria:', error);
      // Não lançar erro para não impactar o fluxo principal
    }
  }

  private createAuthError(
    code: AuthErrorCode,
    message: string,
    details?: Record<string, any>
  ): AuthError {
    return new AuthError(message, code, details);
  }
}
