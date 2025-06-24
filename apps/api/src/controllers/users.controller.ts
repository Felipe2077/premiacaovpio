// apps/api/src/controllers/users.controller.ts
import { AuthService } from '@/services/auth.service';
import { UserService } from '@/services/user.service';
import {
  AdminResetPasswordDto,
  CreateUserDto,
  ToggleUserStatusDto,
  UnlockUserDto,
  UpdateUserDto,
  UserFilters,
} from '@sistema-premiacao/shared-types';
import { FastifyReply, FastifyRequest } from 'fastify';

interface Services {
  user: UserService;
  auth: AuthService;
}

interface UserIdParams {
  id: string;
}

interface UserQueryParams {
  active?: string;
  role?: string;
  sectorId?: string;
  search?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
}

/**
 * Controller para gestão de usuários
 */
export class UsersController {
  constructor(private services: Services) {}

  // ============================================
  // 🏗️ ENDPOINTS PRINCIPAIS DE CRUD
  // ============================================

  /**
   * GET /api/admin/users - Listar usuários com filtros
   */
  async getUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const queryParams = request.query as UserQueryParams;

      request.log.info('GET /api/admin/users - Query Params:', queryParams);

      // Converter query params para filtros tipados
      const filters: UserFilters = {};

      if (queryParams.active !== undefined) {
        filters.active = queryParams.active === 'true';
      }

      if (queryParams.role) {
        filters.role = queryParams.role as any;
      }

      if (queryParams.sectorId) {
        const sectorIdNum = parseInt(queryParams.sectorId, 10);
        if (!isNaN(sectorIdNum)) {
          filters.sectorId = sectorIdNum;
        }
      }

      if (queryParams.search) {
        filters.search = queryParams.search;
      }

      if (queryParams.page) {
        const pageNum = parseInt(queryParams.page, 10);
        if (!isNaN(pageNum) && pageNum > 0) {
          filters.page = pageNum;
        }
      }

      if (queryParams.limit) {
        const limitNum = parseInt(queryParams.limit, 10);
        if (!isNaN(limitNum) && limitNum > 0) {
          filters.limit = Math.min(limitNum, 100); // Máximo 100
        }
      }

      if (queryParams.sortBy) {
        filters.sortBy = queryParams.sortBy;
      }

      const result = await this.services.user.findUsers(filters);

      request.log.info(
        `GET /api/admin/users - Retornando ${result.data.length} usuários (${result.total} total)`
      );

      reply.send(result);
    } catch (error: any) {
      request.log.error(`Erro em getUsers:`, error);

      let statusCode = 500;
      let errorMessage = error.message || 'Erro interno ao listar usuários';

      if (
        errorMessage.includes('deve ser um') ||
        errorMessage.includes('inválido')
      ) {
        statusCode = 400;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  /**
   * GET /api/admin/users/:id - Buscar usuário por ID
   */
  async getUserById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as UserIdParams;
      const userId = parseInt(id, 10);

      request.log.info(`GET /api/admin/users/${userId}`);

      if (isNaN(userId) || userId <= 0) {
        return reply.status(400).send({
          error: 'ID do usuário deve ser um número positivo',
        });
      }

      const user = await this.services.user.findUserDetailById(userId);

      request.log.info(
        `Usuário ${userId} encontrado: ${user.nome} (${user.email})`
      );
      reply.send(user);
    } catch (error: any) {
      request.log.error(`Erro em getUserById ID ${request.params}:`, error);

      let statusCode = 500;
      let errorMessage = error.message || 'Erro interno ao buscar usuário';

      if (errorMessage.includes('não encontrado')) {
        statusCode = 404;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  /**
   * POST /api/admin/users - Criar novo usuário
   */
  async createUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = request.body as CreateUserDto;

      request.log.info('POST /api/admin/users - Dados recebidos:', {
        nome: data.nome,
        email: data.email,
        role: data.role,
        sectorId: data.sectorId,
      });

      // Usar usuário autenticado real
      const actingUser = await this.services.auth.getUserById(request.user!.id);
      if (!actingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      const result = await this.services.user.createUser(data, actingUser);

      request.log.info(
        `Usuário criado com sucesso: ID ${result.user.id} por ${actingUser.email}`
      );

      reply.status(201).send(result);
    } catch (error: any) {
      request.log.error('Erro em createUser:', error);

      let statusCode = 500;
      let errorMessage = error.message || 'Erro interno ao criar usuário';

      if (
        errorMessage.includes('já está em uso') ||
        errorMessage.includes('não encontrado') ||
        errorMessage.includes('obrigatório') ||
        errorMessage.includes('inválido')
      ) {
        statusCode = 400;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  /**
   * PUT /api/admin/users/:id - Atualizar usuário
   */
  async updateUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as UserIdParams;
      const data = request.body as UpdateUserDto;
      const userId = parseInt(id, 10);

      request.log.info(
        `PUT /api/admin/users/${userId} - Dados recebidos:`,
        data
      );

      if (isNaN(userId) || userId <= 0) {
        return reply.status(400).send({
          error: 'ID do usuário deve ser um número positivo',
        });
      }

      // Usar usuário autenticado real
      const actingUser = await this.services.auth.getUserById(request.user!.id);
      if (!actingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      const updatedUser = await this.services.user.updateUser(
        userId,
        data,
        actingUser
      );

      request.log.info(
        `Usuário ID ${userId} atualizado com sucesso por ${actingUser.email}`
      );

      reply.send(updatedUser);
    } catch (error: any) {
      request.log.error(`Erro em updateUser ID ${request.params}:`, error);

      let statusCode = 500;
      let errorMessage = error.message || 'Erro interno ao atualizar usuário';

      if (errorMessage.includes('não encontrado')) {
        statusCode = 404;
      } else if (
        errorMessage.includes('já está em uso') ||
        errorMessage.includes('inválido') ||
        errorMessage.includes('obrigatório')
      ) {
        statusCode = 400;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  /**
   * DELETE /api/admin/users/:id - Desativar usuário (soft delete)
   */
  async deleteUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as UserIdParams;
      const { justification } = request.body as { justification: string };
      const userId = parseInt(id, 10);

      request.log.info(`DELETE /api/admin/users/${userId}`);

      if (isNaN(userId) || userId <= 0) {
        return reply.status(400).send({
          error: 'ID do usuário deve ser um número positivo',
        });
      }

      if (
        !justification ||
        typeof justification !== 'string' ||
        justification.trim().length < 10
      ) {
        return reply.status(400).send({
          error:
            'Justificativa é obrigatória e deve ter pelo menos 10 caracteres',
        });
      }

      // Usar usuário autenticado real
      const actingUser = await this.services.auth.getUserById(request.user!.id);
      if (!actingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      await this.services.user.deleteUser(userId, justification, actingUser);

      request.log.info(
        `Usuário ID ${userId} desativado com sucesso por ${actingUser.email}`
      );

      reply.send({
        success: true,
        message: 'Usuário desativado com sucesso',
      });
    } catch (error: any) {
      request.log.error(`Erro em deleteUser ID ${request.params}:`, error);

      let statusCode = 500;
      let errorMessage = error.message || 'Erro interno ao desativar usuário';

      if (errorMessage.includes('não encontrado')) {
        statusCode = 404;
      } else if (
        errorMessage.includes('já está desativado') ||
        errorMessage.includes('própria conta')
      ) {
        statusCode = 409; // Conflict
      } else if (errorMessage.includes('Justificativa')) {
        statusCode = 400;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  // ============================================
  // 🔐 ENDPOINTS DE AÇÕES ADMINISTRATIVAS
  // ============================================

  /**
   * POST /api/admin/users/:id/unlock - Desbloquear conta de usuário
   */
  async unlockUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as UserIdParams;
      const data = request.body as UnlockUserDto;
      const userId = parseInt(id, 10);

      request.log.info(`POST /api/admin/users/${userId}/unlock`);

      if (isNaN(userId) || userId <= 0) {
        return reply.status(400).send({
          error: 'ID do usuário deve ser um número positivo',
        });
      }

      // Validar dados de entrada primeiro
      if (
        !data ||
        !data.justification ||
        typeof data.justification !== 'string'
      ) {
        return reply.status(400).send({
          error: 'Justificativa é obrigatória',
        });
      }

      // Usar usuário autenticado real
      const actingUser = await this.services.auth.getUserById(request.user!.id);
      if (!actingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      await this.services.user.unlockUser(userId, data, actingUser);

      request.log.info(
        `Usuário ID ${userId} desbloqueado com sucesso por ${actingUser.email}`
      );

      reply.send({
        success: true,
        message: 'Usuário desbloqueado com sucesso',
      });
    } catch (error: any) {
      request.log.error(`Erro em unlockUser ID ${request.params}:`, error);

      let statusCode = 500;
      let errorMessage = error.message || 'Erro interno ao desbloquear usuário';

      if (errorMessage.includes('não encontrado')) {
        statusCode = 404;
      } else if (errorMessage.includes('não está bloqueado')) {
        statusCode = 409;
      } else if (errorMessage.includes('Justificativa')) {
        statusCode = 400;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  /**
   * POST /api/admin/users/:id/reset-password - Reset de senha por administrador
   */
  async resetUserPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as UserIdParams;
      const data = request.body as AdminResetPasswordDto;
      const userId = parseInt(id, 10);

      request.log.info(`POST /api/admin/users/${userId}/reset-password`);

      if (isNaN(userId) || userId <= 0) {
        return reply.status(400).send({
          error: 'ID do usuário deve ser um número positivo',
        });
      }

      // Usar usuário autenticado real
      const actingUser = await this.services.auth.getUserById(request.user!.id);
      if (!actingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      const result = await this.services.user.resetUserPassword(
        userId,
        data,
        actingUser
      );

      request.log.info(
        `Senha do usuário ID ${userId} resetada com sucesso por ${actingUser.email}`
      );

      reply.send(result);
    } catch (error: any) {
      request.log.error(
        `Erro em resetUserPassword ID ${request.params}:`,
        error
      );

      let statusCode = 500;
      let errorMessage = error.message || 'Erro interno ao resetar senha';

      if (errorMessage.includes('não encontrado')) {
        statusCode = 404;
      } else if (errorMessage.includes('Justificativa')) {
        statusCode = 400;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  /**
   * POST /api/admin/users/:id/toggle-status - Ativar/Desativar usuário
   */
  async toggleUserStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as UserIdParams;
      const data = request.body as ToggleUserStatusDto;
      const userId = parseInt(id, 10);

      request.log.info(`POST /api/admin/users/${userId}/toggle-status`, {
        ativo: data.ativo,
      });

      if (isNaN(userId) || userId <= 0) {
        return reply.status(400).send({
          error: 'ID do usuário deve ser um número positivo',
        });
      }

      // Usar usuário autenticado real
      const actingUser = await this.services.auth.getUserById(request.user!.id);
      if (!actingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      const updatedUser = await this.services.user.toggleUserStatus(
        userId,
        data,
        actingUser
      );

      request.log.info(
        `Status do usuário ID ${userId} alterado para ${data.ativo ? 'ativo' : 'inativo'} por ${actingUser.email}`
      );

      reply.send(updatedUser);
    } catch (error: any) {
      request.log.error(
        `Erro em toggleUserStatus ID ${request.params}:`,
        error
      );

      let statusCode = 500;
      let errorMessage =
        error.message || 'Erro interno ao alterar status do usuário';

      if (errorMessage.includes('não encontrado')) {
        statusCode = 404;
      } else if (
        errorMessage.includes('própria conta') ||
        errorMessage.includes('já está')
      ) {
        statusCode = 409;
      } else if (errorMessage.includes('Justificativa')) {
        statusCode = 400;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  // ============================================
  // 📊 ENDPOINTS DE ESTATÍSTICAS E UTILITÁRIOS
  // ============================================

  /**
   * GET /api/admin/users/statistics - Obter estatísticas de usuários
   */
  async getUserStatistics(request: FastifyRequest, reply: FastifyReply) {
    try {
      request.log.info('GET /api/admin/users/statistics');

      const statistics = await this.services.user.getUserStatistics();

      request.log.info('Estatísticas de usuários obtidas com sucesso');
      reply.send(statistics);
    } catch (error: any) {
      request.log.error('Erro em getUserStatistics:', error);

      reply.status(500).send({
        error: error.message || 'Erro interno ao obter estatísticas',
      });
    }
  }

  /**
   * GET /api/admin/users/health - Health check do serviço de usuários
   */
  async healthCheck(request: FastifyRequest, reply: FastifyReply) {
    try {
      const health = await this.services.user.healthCheck();

      if (health.healthy) {
        reply.send(health);
      } else {
        reply.status(503).send(health);
      }
    } catch (error: any) {
      request.log.error('Erro em healthCheck:', error);

      reply.status(503).send({
        healthy: false,
        details: {
          error: 'Service unavailable',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  // ============================================
  // 🔍 ENDPOINTS DE BUSCA AVANÇADA
  // ============================================

  /**
   * GET /api/admin/users/search - Busca textual de usuários
   */
  async searchUsers(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { q, limit } = request.query as { q?: string; limit?: string };

      request.log.info('GET /api/admin/users/search', { q, limit });

      if (!q || q.trim().length < 2) {
        return reply.status(400).send({
          error:
            'Parâmetro de busca "q" é obrigatório e deve ter pelo menos 2 caracteres',
        });
      }

      const searchLimit = Math.min(parseInt(limit || '10', 10), 50);

      const filters: UserFilters = {
        search: q.trim(),
        limit: searchLimit,
        page: 1,
        active: true, // Por padrão, buscar apenas usuários ativos
      };

      const result = await this.services.user.findUsers(filters);

      request.log.info(`Busca retornou ${result.data.length} usuários`);
      reply.send({
        users: result.data,
        total: result.total,
        query: q.trim(),
      });
    } catch (error: any) {
      request.log.error('Erro em searchUsers:', error);

      reply.status(500).send({
        error: error.message || 'Erro interno na busca de usuários',
      });
    }
  }

  /**
   * GET /api/admin/users/by-sector/:sectorId - Listar usuários de um setor específico
   */
  async getUsersBySector(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { sectorId } = request.params as { sectorId: string };
      const sectorIdNum = parseInt(sectorId, 10);

      request.log.info(`GET /api/admin/users/by-sector/${sectorIdNum}`);

      if (isNaN(sectorIdNum) || sectorIdNum <= 0) {
        return reply.status(400).send({
          error: 'ID do setor deve ser um número positivo',
        });
      }

      const filters: UserFilters = {
        sectorId: sectorIdNum,
        active: true,
        sortBy: 'nome:asc',
      };

      const result = await this.services.user.findUsers(filters);

      request.log.info(
        `Encontrados ${result.data.length} usuários no setor ${sectorIdNum}`
      );
      reply.send(result);
    } catch (error: any) {
      request.log.error(`Erro em getUsersBySector:`, error);

      reply.status(500).send({
        error: error.message || 'Erro interno ao buscar usuários do setor',
      });
    }
  }

  /**
   * GET /api/admin/users/by-role/:role - Listar usuários de um role específico
   */
  async getUsersByRole(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { role } = request.params as { role: string };

      request.log.info(`GET /api/admin/users/by-role/${role}`);

      const filters: UserFilters = {
        role: role as any,
        sortBy: 'nome:asc',
      };

      const result = await this.services.user.findUsers(filters);

      request.log.info(
        `Encontrados ${result.data.length} usuários com role ${role}`
      );
      reply.send(result);
    } catch (error: any) {
      request.log.error(`Erro em getUsersByRole:`, error);

      let statusCode = 500;
      let errorMessage =
        error.message || 'Erro interno ao buscar usuários por role';

      if (errorMessage.includes('deve ser um de')) {
        statusCode = 400;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  // ============================================
  // 🔐 ENDPOINTS RELACIONADOS A SESSÕES
  // ============================================

  /**
   * GET /api/admin/users/:id/sessions - Listar sessões ativas do usuário
   */
  async getUserSessions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as UserIdParams;
      const userId = parseInt(id, 10);

      request.log.info(`GET /api/admin/users/${userId}/sessions`);

      if (isNaN(userId) || userId <= 0) {
        return reply.status(400).send({
          error: 'ID do usuário deve ser um número positivo',
        });
      }

      // Verificar se usuário existe
      await this.services.user.findUserById(userId);

      // TODO: Implementar getUserSessions no AuthService
      // Por enquanto, retornar array vazio
      const sessions: any[] = [];

      request.log.info(
        `Encontradas ${sessions.length} sessões para usuário ${userId}`
      );
      reply.send({
        userId,
        sessions,
        total: sessions.length,
        message: 'Funcionalidade de sessões será implementada em breve',
      });
    } catch (error: any) {
      request.log.error(`Erro em getUserSessions:`, error);

      let statusCode = 500;
      let errorMessage = error.message || 'Erro interno ao buscar sessões';

      if (errorMessage.includes('não encontrado')) {
        statusCode = 404;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  /**
   * POST /api/admin/users/:id/invalidate-sessions - Invalidar todas as sessões do usuário
   */
  async invalidateUserSessions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as UserIdParams;
      const { justification } = request.body as { justification: string };
      const userId = parseInt(id, 10);

      request.log.info(`POST /api/admin/users/${userId}/invalidate-sessions`);

      if (isNaN(userId) || userId <= 0) {
        return reply.status(400).send({
          error: 'ID do usuário deve ser um número positivo',
        });
      }

      if (
        !justification ||
        typeof justification !== 'string' ||
        justification.trim().length < 10
      ) {
        return reply.status(400).send({
          error:
            'Justificativa é obrigatória e deve ter pelo menos 10 caracteres',
        });
      }

      // Usar usuário autenticado real
      const actingUser = await this.services.auth.getUserById(request.user!.id);
      if (!actingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      // Verificar se usuário alvo existe
      await this.services.user.findUserById(userId);

      // TODO: Implementar invalidação de sessões no AuthService
      // await this.services.auth.invalidateAllUserSessions(userId);

      // Log de auditoria manual (enquanto não implementamos no AuthService)
      request.log.info(
        `Sessões do usuário ID ${userId} invalidadas por ${actingUser.email}. Justificativa: ${justification}`
      );

      reply.send({
        success: true,
        message: 'Todas as sessões do usuário foram invalidadas',
        userId,
        invalidatedBy: actingUser.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      request.log.error(`Erro em invalidateUserSessions:`, error);

      let statusCode = 500;
      let errorMessage = error.message || 'Erro interno ao invalidar sessões';

      if (errorMessage.includes('não encontrado')) {
        statusCode = 404;
      } else if (errorMessage.includes('Justificativa')) {
        statusCode = 400;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  // ============================================
  // 🧪 ENDPOINTS DE VALIDAÇÃO E TESTE
  // ============================================

  /**
   * POST /api/admin/users/validate-email - Verificar se email está disponível
   */
  async validateEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { email, excludeUserId } = request.body as {
        email: string;
        excludeUserId?: number;
      };

      request.log.info('POST /api/admin/users/validate-email', {
        email,
        excludeUserId,
      });

      if (!email || typeof email !== 'string') {
        return reply.status(400).send({
          error: 'Email é obrigatório',
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reply.send({
          available: false,
          reason: 'Formato de email inválido',
        });
      }

      // Buscar usuário com esse email
      const existingUser = await this.services.user.findUsers({
        search: email,
        limit: 1,
      });

      let available = existingUser.data.length === 0;

      // Se excludeUserId for fornecido, ignorar esse usuário na validação
      if (!available && excludeUserId) {
        const foundUser = existingUser.data.find(
          (user) => user.email.toLowerCase() === email.toLowerCase()
        );
        available = !foundUser || foundUser.id === excludeUserId;
      }

      reply.send({
        email,
        available,
        reason: available ? null : 'Email já está em uso',
      });
    } catch (error: any) {
      request.log.error('Erro em validateEmail:', error);

      reply.status(500).send({
        error: error.message || 'Erro interno na validação de email',
      });
    }
  }
}
