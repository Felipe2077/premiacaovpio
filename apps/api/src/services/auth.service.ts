// apps/api/src/services/auth.service.ts - VERSÃO SIMPLES SEM CONFLITOS DE TIPO

import { AppDataSource } from '@/database/data-source';
import { UserEntity } from '@/entity/user.entity';
import { Role } from '@sistema-premiacao/shared-types';
import * as jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';

interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

interface ForgotPasswordDto {
  email: string;
}

interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

interface LoginResult {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
    email: string;
    nome: string;
    role: Role;
    permissions: string[];
  };
  expiresIn: number;
}

export class AuthService {
  private readonly MAX_FAILED_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos
  private readonly ACCESS_TOKEN_EXPIRY = '24h'; // 15 minutos
  private readonly REFRESH_TOKEN_EXPIRY = '30d'; // 7 dias

  // JWT Secret
  private readonly JWT_SECRET =
    process.env.JWT_SECRET || 'uma-chave-super-secreta-para-dev';

  private getUserRepository(): Repository<UserEntity> {
    if (!AppDataSource.isInitialized) {
      throw new Error('DataSource não inicializado');
    }
    return AppDataSource.getRepository(UserEntity);
  }

  /**
   * Fazer login do usuário
   */
  async login(
    loginDto: LoginDto,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResult> {
    const { email, password, rememberMe } = loginDto;

    // Buscar usuário com senha
    const userRepository = this.getUserRepository();
    const user = await UserEntity.findByEmailWithPassword(
      email,
      userRepository
    );

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    // Verificar se conta está ativa
    if (!user.ativo) {
      throw new Error('Conta desativada');
    }

    // Verificar se conta está bloqueada
    if (user.isLocked()) {
      const lockTimeRemaining = Math.ceil(
        ((user.lockedUntil?.getTime() || 0) - Date.now()) / 1000 / 60
      );
      throw new Error(
        `Conta bloqueada por ${lockTimeRemaining} minutos devido a múltiplas tentativas de login falharam`
      );
    }

    // Validar senha
    const isPasswordValid = await user.validatePassword(password);

    if (!isPasswordValid) {
      // Incrementar tentativas falhadas
      user.incrementLoginAttempts();
      await userRepository.save(user);

      if (user.loginAttempts >= this.MAX_FAILED_ATTEMPTS) {
        throw new Error(
          `Conta bloqueada por ${this.LOCKOUT_DURATION / 1000 / 60} minutos devido a múltiplas tentativas falharam`
        );
      }

      throw new Error('Credenciais inválidas');
    }

    // Login bem-sucedido - resetar tentativas
    if (user.loginAttempts > 0) {
      user.resetLoginAttempts();
      await userRepository.save(user);
    }

    // Gerar tokens
    const sessionId = this.generateSessionId();
    const accessToken = this.generateAccessToken(user, sessionId);
    const refreshToken = this.generateRefreshToken(user, sessionId);

    // Salvar session metadata (simplificado)
    user.lastLoginAt = new Date();
    await userRepository.save(user);

    return {
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nome: user.nome,
        role: user.role,
        permissions: user.getPermissions(),
      },
      expiresIn: 86400, // 24h em segundos
    };
  }

  /**
   * Logout do usuário
   */
  async logout(sessionId: string, userId?: number): Promise<void> {
    // Implementação simplificada - em produção, invalidar token em cache/DB
    console.log(`Logout realizado para sessão ${sessionId}, usuário ${userId}`);
  }

  /**
   * Obter usuário por ID
   */
  async getUserById(userId: number): Promise<UserEntity | null> {
    const userRepository = this.getUserRepository();

    // CORREÇÃO: Usar query builder para evitar problemas de relação
    return await userRepository
      .createQueryBuilder('user')
      .where('user.id = :id', { id: userId })
      .andWhere('user.ativo = :ativo', { ativo: true })
      .getOne();
  }

  /**
   * Verificar se usuário tem role específico
   */
  async userHasRole(userId: number, role: Role): Promise<boolean> {
    const user = await this.getUserById(userId);
    return user?.role === role || false;
  }

  /**
   * Alterar senha do usuário
   */
  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto
  ): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;
    const userRepository = this.getUserRepository();

    // Buscar usuário com senha atual
    const user = await userRepository
      .createQueryBuilder('user')
      .addSelect('user.senha')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await user.validatePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error('Senha atual incorreta');
    }

    // Atualizar senha (será hasheada automaticamente pelo BeforeUpdate)
    user.senha = newPassword;
    await userRepository.save(user);
  }

  /**
   * Solicitar reset de senha
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;
    const userRepository = this.getUserRepository();

    const user = await userRepository.findOne({
      where: { email, ativo: true },
    });

    if (!user) {
      // Não revelar se email existe por segurança
      return;
    }

    // Gerar token de reset
    const resetToken = this.generateResetToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await userRepository.save(user);

    // TODO: Enviar email com token
    console.log(`Token de reset para ${email}: ${resetToken}`);
  }

  /**
   * Resetar senha com token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;
    const userRepository = this.getUserRepository();

    const user = await userRepository.findOne({
      where: {
        resetPasswordToken: token,
        ativo: true,
      },
    });

    if (!user || !user.resetPasswordExpires) {
      throw new Error('Token de reset inválido ou expirado');
    }

    if (user.resetPasswordExpires < new Date()) {
      throw new Error('Token de reset expirado');
    }

    // Atualizar senha
    user.senha = newPassword; // Será hasheada automaticamente
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.loginAttempts = 0; // Reset tentativas
    await userRepository.save(user);
  }

  /**
   * Renovar access token
   */
  async refreshAccessToken(
    refreshToken: string,
    sessionId: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as any;

      if (decoded.sessionId !== sessionId) {
        throw new Error('Session ID inválido');
      }

      // Buscar usuário
      const user = await this.getUserById(decoded.sub);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Gerar novo access token
      const newAccessToken = this.generateAccessToken(user, sessionId);

      return {
        accessToken: newAccessToken,
        expiresIn: 900, // 15 minutos
      };
    } catch (error) {
      throw new Error('Erro ao renovar token');
    }
  }

  /**
   * Health check do serviço de autenticação
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const userRepository = this.getUserRepository();
      const userCount = await userRepository.count();

      return {
        healthy: true,
        details: {
          usersCount: userCount,
          databaseConnection: 'ok',
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: 'Database connection failed',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Métodos auxiliares para geração de tokens
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ✅ USANDO JSONWEBTOKEN DIRETAMENTE (sem conflitos de tipo)
  private generateAccessToken(user: UserEntity, sessionId: string): string {
    const payload = {
      sub: user.id,
      email: user.email,
      nome: user.nome,
      roles: [user.role], // Array para compatibilidade
      permissions: user.getPermissions(),
      sessionId,
      sectorId: user.sectorId,
      roleNames: [user.role],
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });
  }

  // ✅ USANDO JSONWEBTOKEN DIRETAMENTE (sem conflitos de tipo)
  private generateRefreshToken(user: UserEntity, sessionId: string): string {
    const payload = {
      sub: user.id,
      sessionId,
      type: 'refresh',
    };

    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });
  }

  private generateResetToken(): string {
    return `reset_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }
}
