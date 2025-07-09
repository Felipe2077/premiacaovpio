// apps/api/src/services/user.service.ts
import { AppDataSource } from '@/database/data-source';
import { SectorEntity } from '@/entity/sector.entity';
import { UserEntity } from '@/entity/user.entity';
import { AuditLogService } from '@/modules/audit/audit.service';
import {
  AdminResetPasswordDto,
  CreateUserResponse,
  PaginatedUsersResponse,
  Permission,
  ResetPasswordResponse,
  Role,
  ToggleUserStatusDto,
  UnlockUserDto,
  UserDetail,
  UserStatistics,
  UserSummary,
  validateAdminAction, // 🆕 ADICIONADO
  validateCreateUser,
  validateUpdateUser,
  validateUserFilters,
} from '@sistema-premiacao/shared-types';
import { Repository } from 'typeorm';

/**
 * Serviço para gestão completa de usuários
 */
export class UserService {
  private readonly userRepository: Repository<UserEntity>;
  private readonly sectorRepository: Repository<SectorEntity>;
  private readonly auditService: AuditLogService;

  constructor() {
    this.userRepository = AppDataSource.getRepository(UserEntity);
    this.sectorRepository = AppDataSource.getRepository(SectorEntity);
    this.auditService = new AuditLogService();
  }

  // ============================================
  // 🏗️ MÉTODOS PRINCIPAIS DE CRUD
  // ============================================

  /**
   * Criar novo usuário
   */
  async createUser(
    createUserDto: unknown,
    actingUser: UserEntity
  ): Promise<CreateUserResponse> {
    const validatedData = validateCreateUser(createUserDto);

    // Verificar se email já existe
    const existingUser = await this.userRepository.findOne({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      throw new Error('Email já está em uso por outro usuário');
    }

    // Verificar se setor existe (se fornecido)
    if (validatedData.sectorId) {
      const sector = await this.sectorRepository.findOne({
        where: { id: validatedData.sectorId },
      });
      if (!sector) {
        throw new Error('Setor não encontrado');
      }
    }

    // Gerar senha temporária se não fornecida
    let temporaryPassword: string | undefined;
    let finalPassword = validatedData.password;

    if (!finalPassword) {
      temporaryPassword = this.generateTemporaryPassword();
      finalPassword = temporaryPassword;
    }

    // Criar usuário
    const newUser = this.userRepository.create({
      nome: validatedData.nome,
      email: validatedData.email,
      senha: finalPassword, // Será hasheada automaticamente pelo BeforeInsert
      role: validatedData.role,
      sectorId: validatedData.sectorId,
      ativo: validatedData.ativo ?? true,
    });

    const savedUser = await this.userRepository.save(newUser);

    // Log de auditoria
    await this.auditService.createLog({
      userId: actingUser.id,
      userName: actingUser.nome,
      actionType: 'CREATE_USER',
      entityType: 'UserEntity',
      entityId: savedUser.id.toString(),
      details: {
        userCreated: {
          id: savedUser.id,
          nome: savedUser.nome,
          email: savedUser.email,
          role: savedUser.role,
          sectorId: savedUser.sectorId,
        },
        passwordGenerated: !!temporaryPassword,
        sendWelcomeEmail: validatedData.sendWelcomeEmail,
      },
      justification: `Usuário criado via painel administrativo`,
    });

    // Buscar usuário completo para resposta
    const userSummary = await this.findUserById(savedUser.id);

    return {
      user: userSummary,
      temporaryPassword,
      actions: {
        emailSent: false, // TODO: Implementar envio de email
        passwordGenerated: !!temporaryPassword,
      },
    };
  }

  /**
   * Atualizar usuário existente
   */
  async updateUser(
    userId: number,
    updateUserDto: unknown,
    actingUser: UserEntity
  ): Promise<UserSummary> {
    const validatedData = validateUpdateUser(updateUserDto);

    // Buscar usuário
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se novo email já existe (se alterado)
    if (validatedData.email && validatedData.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: validatedData.email },
      });
      if (existingUser) {
        throw new Error('Email já está em uso por outro usuário');
      }
    }

    // Verificar se setor existe (se alterado)
    if (validatedData.sectorId) {
      const sector = await this.sectorRepository.findOne({
        where: { id: validatedData.sectorId },
      });
      if (!sector) {
        throw new Error('Setor não encontrado');
      }
    }

    // Armazenar dados originais para auditoria
    const originalData = {
      nome: user.nome,
      email: user.email,
      role: user.role,
      sectorId: user.sectorId,
      ativo: user.ativo,
    };

    // Aplicar alterações
    if (validatedData.nome !== undefined) user.nome = validatedData.nome;
    if (validatedData.email !== undefined) user.email = validatedData.email;
    if (validatedData.role !== undefined) user.role = validatedData.role;
    if (validatedData.sectorId !== undefined)
      user.sectorId = validatedData.sectorId;
    if (validatedData.ativo !== undefined) user.ativo = validatedData.ativo;

    const updatedUser = await this.userRepository.save(user);

    // Log de auditoria
    await this.auditService.createLog({
      userId: actingUser.id,
      userName: actingUser.nome,
      actionType: 'UPDATE_USER',
      entityType: 'UserEntity',
      entityId: updatedUser.id.toString(),
      details: {
        originalData,
        newData: validatedData,
        changes: this.getChangedFields(originalData, validatedData),
      },
      justification: `Usuário atualizado via painel administrativo`,
    });

    return this.findUserById(updatedUser.id);
  }

  /**
   * "Deletar" usuário (soft delete - desativar)
   */
  async deleteUser(
    userId: number,
    justification: string,
    actingUser: UserEntity
  ): Promise<void> {
    const { justification: validJustification } = validateAdminAction(
      { justification },
      'DELETE_USER'
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (!user.ativo) {
      throw new Error('Usuário já está desativado');
    }

    // Verificar se não é o próprio usuário
    if (user.id === actingUser.id) {
      throw new Error('Não é possível desativar sua própria conta');
    }

    // Desativar usuário
    user.ativo = false;
    await this.userRepository.save(user);

    // Log de auditoria
    await this.auditService.createLog({
      userId: actingUser.id,
      userName: actingUser.nome,
      actionType: 'DELETE_USER',
      entityType: 'UserEntity',
      entityId: user.id.toString(),
      details: {
        userDeactivated: {
          id: user.id,
          nome: user.nome,
          email: user.email,
        },
      },
      justification: validJustification,
    });
  }

  // ============================================
  // 🔍 MÉTODOS DE BUSCA E LISTAGEM
  // ============================================

  /**
   * Listar usuários com filtros e paginação
   */
  async findUsers(filters: unknown = {}): Promise<PaginatedUsersResponse> {
    const validatedFilters = validateUserFilters(filters);

    // Defaults
    const page = validatedFilters.page || 1;
    const limit = Math.min(validatedFilters.limit || 20, 100);
    const skip = (page - 1) * limit;

    // Construir query SEM LEFT JOIN (removendo relação sector)
    let query = this.userRepository.createQueryBuilder('user');

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.sector', 'sector') // ✅ ADICIONADO: LEFT JOIN com tabela sectors
      .skip(skip)
      .take(limit);

    // Aplicar filtros
    if (validatedFilters.active !== undefined) {
      query = query.andWhere('user.ativo = :active', {
        active: validatedFilters.active,
      });
    }

    if (validatedFilters.role) {
      query = query.andWhere('user.role = :role', {
        role: validatedFilters.role,
      });
    }

    if (validatedFilters.sectorId) {
      query = query.andWhere('user.sectorId = :sectorId', {
        sectorId: validatedFilters.sectorId,
      });
    }

    if (validatedFilters.search) {
      query = query.andWhere(
        '(LOWER(user.nome) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${validatedFilters.search}%` }
      );
    }

    // Aplicar ordenação (corrigindo undefined)
    const [sortField, sortDirection] = (
      validatedFilters.sortBy || 'nome:asc'
    ).split(':');
    const direction = (sortDirection || 'asc').toUpperCase() as 'ASC' | 'DESC';

    switch (sortField) {
      case 'nome':
        query = query.orderBy('user.nome', direction);
        break;
      case 'email':
        query = query.orderBy('user.email', direction);
        break;
      case 'role':
        query = query.orderBy('user.role', direction);
        break;
      case 'createdAt':
        query = query.orderBy('user.createdAt', direction);
        break;
      case 'lastLoginAt':
        query = query.orderBy('user.lastLoginAt', direction);
        break;
      default:
        query = query.orderBy('user.nome', 'ASC');
    }

    // Contar total antes da paginação
    const [users, total] = await queryBuilder.getManyAndCount();

    const data = users.map(
      (user): UserSummary => ({
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
        ativo: user.ativo,
        lastLoginAt: user.lastLoginAt,
        sectorId: user.sectorId,
        sector: user.sectorId
          ? {
              id: user.sector!.id,
              nome: user.sector!.nome,
            }
          : undefined,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        loginAttempts: user.loginAttempts,
        isLocked: user.isLocked(),
      })
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };
  }

  /**
   * Buscar usuário por ID (corrigido para usar leftJoin simples)
   */
  async findUserById(userId: number): Promise<UserSummary> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.sector', 'sector')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      ativo: user.ativo,
      lastLoginAt: user.lastLoginAt,
      sectorId: user.sectorId,
      sector: user.sector
        ? {
            // ✅ CORRIGIDO: Mapear dados do setor
            id: user.sector.id,
            nome: user.sector.nome,
          }
        : undefined,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      loginAttempts: user.loginAttempts,
      isLocked: user.isLocked(),
    };
  }

  /**
   * Buscar detalhes completos do usuário (corrigido)
   */
  async findUserDetailById(userId: number): Promise<UserDetail> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.sector', 'sector') // ✅ ADICIONADO: LEFT JOIN
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role,
      permissions: user.getPermissions() as Permission[],
      ativo: user.ativo,
      sectorId: user.sectorId,
      sector: user.sector
        ? {
            // ✅ CORRIGIDO: Mapear dados do setor
            id: user.sector.id,
            nome: user.sector.nome,
          }
        : undefined,
      lastLoginAt: user.lastLoginAt,
      loginAttempts: user.loginAttempts,
      lockedUntil: user.lockedUntil,
      isLocked: user.isLocked(),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      activeSessions: 0,
      recentActivity: [],
    };
  }

  // ============================================
  // 🔐 MÉTODOS ADMINISTRATIVOS
  // ============================================

  /**
   * Reset de senha por administrador
   */
  async resetUserPassword(
    userId: number,
    resetDto: AdminResetPasswordDto,
    actingUser: UserEntity
  ): Promise<ResetPasswordResponse> {
    const { justification: validJustification } = validateAdminAction(
      { justification: resetDto.justification },
      'RESET_PASSWORD'
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Gerar nova senha se não fornecida
    let newPassword = resetDto.newPassword;
    let passwordGenerated = false;

    if (!newPassword) {
      newPassword = this.generateTemporaryPassword();
      passwordGenerated = true;
    }

    // Atualizar senha (será hasheada automaticamente)
    user.senha = newPassword;

    // Reset de tentativas de login se solicitado
    if (resetDto.forceChangeOnLogin !== false) {
      user.resetLoginAttempts();
    }

    await this.userRepository.save(user);

    // Log de auditoria
    await this.auditService.createLog({
      userId: actingUser.id,
      userName: actingUser.nome,
      actionType: 'RESET_USER_PASSWORD',
      entityType: 'UserEntity',
      entityId: user.id.toString(),
      details: {
        targetUser: {
          id: user.id,
          nome: user.nome,
          email: user.email,
        },
        passwordGenerated,
        forceChangeOnLogin: resetDto.forceChangeOnLogin !== false,
      },
      justification: validJustification,
    });

    return {
      success: true,
      newPassword: passwordGenerated ? newPassword : undefined,
      actions: {
        emailSent: false, // TODO: Implementar envio de email
        passwordGenerated,
      },
    };
  }

  /**
   * Desbloquear conta de usuário
   */
  async unlockUser(
    userId: number,
    unlockDto: UnlockUserDto,
    actingUser: UserEntity
  ): Promise<void> {
    const { justification: validJustification } = validateAdminAction(
      { justification: unlockDto.justification },
      'UNLOCK_USER'
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    if (!user.isLocked()) {
      throw new Error('Usuário não está bloqueado');
    }

    // Desbloquear conta
    if (unlockDto.resetLoginAttempts !== false) {
      user.resetLoginAttempts();
    } else {
      user.lockedUntil = undefined;
    }

    await this.userRepository.save(user);

    // Log de auditoria
    await this.auditService.createLog({
      userId: actingUser.id,
      userName: actingUser.nome,
      actionType: 'UNLOCK_USER',
      entityType: 'UserEntity',
      entityId: user.id.toString(),
      details: {
        targetUser: {
          id: user.id,
          nome: user.nome,
          email: user.email,
        },
        resetLoginAttempts: unlockDto.resetLoginAttempts !== false,
      },
      justification: validJustification,
    });
  }

  /**
   * Ativar/Desativar usuário
   */
  async toggleUserStatus(
    userId: number,
    toggleDto: ToggleUserStatusDto,
    actingUser: UserEntity
  ): Promise<UserSummary> {
    const { justification: validJustification } = validateAdminAction(
      { justification: toggleDto.justification },
      'TOGGLE_USER_STATUS'
    );

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Verificar se não é o próprio usuário sendo desativado
    if (user.id === actingUser.id && !toggleDto.ativo) {
      throw new Error('Não é possível desativar sua própria conta');
    }

    if (user.ativo === toggleDto.ativo) {
      throw new Error(
        `Usuário já está ${toggleDto.ativo ? 'ativo' : 'inativo'}`
      );
    }

    const previousStatus = user.ativo;
    user.ativo = toggleDto.ativo;
    await this.userRepository.save(user);

    // Log de auditoria
    await this.auditService.createLog({
      userId: actingUser.id,
      userName: actingUser.nome,
      actionType: toggleDto.ativo ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
      entityType: 'UserEntity',
      entityId: user.id.toString(),
      details: {
        targetUser: {
          id: user.id,
          nome: user.nome,
          email: user.email,
        },
        previousStatus,
        newStatus: toggleDto.ativo,
      },
      justification: validJustification,
    });

    return this.findUserById(user.id);
  }

  // ============================================
  // 📊 MÉTODOS DE ESTATÍSTICAS
  // ============================================

  /**
   * Obter estatísticas gerais de usuários
   */
  async getUserStatistics(): Promise<UserStatistics> {
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({
      where: { ativo: true },
    });
    const inactiveUsers = totalUsers - activeUsers;

    // Usuários bloqueados
    const lockedUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.lockedUntil > :now', { now: new Date() })
      .getCount();

    // Por role
    const byRole: Record<Role, number> = {} as Record<Role, number>;
    for (const role of Object.values(Role)) {
      byRole[role] = await this.userRepository.count({ where: { role } });
    }

    // Por setor (query manual na tabela sectors)
    const sectorStats = await AppDataSource.query(`
      SELECT s.nome as "sectorName", COUNT(u.id)::integer as "userCount"
      FROM sectors s
      LEFT JOIN users u ON u."sectorId" = s.id
      WHERE s.ativo = true
      GROUP BY s.nome
      HAVING COUNT(u.id) > 0
    `);

    const bySector: Record<string, number> = {};
    sectorStats.forEach((stat: any) => {
      bySector[stat.sectorName] = stat.userCount;
    });

    // Logins recentes (corrigindo query TypeORM)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const recentLogins = await this.userRepository
      .createQueryBuilder('user')
      .where('user.lastLoginAt >= :yesterday', { yesterday })
      .getCount();

    // Registros recentes (corrigindo query TypeORM)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const recentRegistrations = await this.userRepository
      .createQueryBuilder('user')
      .where('user.createdAt >= :lastWeek', { lastWeek })
      .getCount();

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      lockedUsers,
      byRole,
      bySector,
      recentLogins,
      recentRegistrations,
    };
  }

  // ============================================
  // 🛠️ MÉTODOS AUXILIARES PRIVADOS
  // ============================================

  /**
   * Gerar senha temporária segura
   */
  private generateTemporaryPassword(): string {
    const length = 12;
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%&*';
    const allChars = lowercase + uppercase + numbers + symbols;

    // Garantir pelo menos um caractere de cada tipo
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Preencher o restante aleatoriamente
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Embaralhar a senha
    return password
      .split('')
      .sort(() => Math.random() - 0.5)
      .join('');
  }

  /**
   * Identificar campos alterados para auditoria
   */
  private getChangedFields(original: any, updated: any): string[] {
    const changes: string[] = [];

    Object.keys(updated).forEach((key) => {
      if (updated[key] !== undefined && original[key] !== updated[key]) {
        changes.push(key);
      }
    });

    return changes;
  }

  /**
   * Health check do serviço
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const userCount = await this.userRepository.count();
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
}
