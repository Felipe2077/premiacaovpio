// apps/api/src/middleware/rbac.middleware.ts - CORREÇÃO
import { Permission, Role } from '@sistema-premiacao/shared-types';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Cria middleware que exige permissões específicas
 */
export function requirePermissions(...permissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Acesso negado - usuário não autenticado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const userPermissions = request.user.permissions || [];
    const hasPermission = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      console.warn(
        `[RBAC] Acesso negado para usuário ${request.user.email} (ID: ${request.user.id})`
      );
      console.warn(`[RBAC] Rota: ${request.method} ${request.url}`);
      console.warn(`[RBAC] Permissões necessárias: ${permissions.join(', ')}`);
      console.warn(
        `[RBAC] Permissões do usuário: ${userPermissions.join(', ')}`
      );

      return reply.status(403).send({
        error: 'Acesso negado - permissões insuficientes',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: permissions,
        userPermissions: userPermissions,
      });
    }

    request.log.info(
      `[RBAC] Acesso autorizado para ${request.user.email} - ${request.method} ${request.url}`
    );
  };
}

/**
 * Cria middleware que exige roles específicos
 */
export function requireRoles(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Acesso negado - usuário não autenticado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const userRoles = request.user.roles || [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      console.warn(
        `[RBAC] Acesso negado por role para usuário ${request.user.email}`
      );
      console.warn(`[RBAC] Roles necessários: ${roles.join(', ')}`);
      console.warn(`[RBAC] Roles do usuário: ${userRoles.join(', ')}`);

      return reply.status(403).send({
        error: 'Acesso negado - papel insuficiente',
        code: 'INSUFFICIENT_ROLE',
        required: roles,
        userRoles: userRoles,
      });
    }
  };
}

/**
 * Middleware que permite acesso apenas ao próprio usuário ou admins - CORRIGIDO
 */
export function requireOwnershipOrAdmin(userIdParam: string = 'userId') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Acesso negado - usuário não autenticado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Extrair ID do usuário alvo dos parâmetros da rota - CORRIGIDO
    const params = request.params as Record<string, string>;
    const userIdString = params[userIdParam];

    // Verificar se o parâmetro existe
    if (!userIdString) {
      return reply.status(400).send({
        error: `Parâmetro ${userIdParam} é obrigatório`,
        code: 'MISSING_PARAMETER',
      });
    }

    const targetUserId = parseInt(userIdString, 10);

    // Verificar se é um número válido
    if (isNaN(targetUserId)) {
      return reply.status(400).send({
        error: `Parâmetro ${userIdParam} deve ser um número válido`,
        code: 'INVALID_PARAMETER',
      });
    }

    // Verificar se é o próprio usuário
    const isOwner = request.user.id === targetUserId;

    // Verificar se é admin/diretor
    const isAdmin =
      request.user.roles?.includes(Role.DIRETOR) ||
      request.user.permissions?.includes(Permission.MANAGE_USERS);

    if (!isOwner && !isAdmin) {
      console.warn(`[RBAC] Tentativa de acesso a recurso de outro usuário`);
      console.warn(
        `[RBAC] Usuário: ${request.user.email} (ID: ${request.user.id})`
      );
      console.warn(`[RBAC] Tentando acessar: ${targetUserId}`);

      return reply.status(403).send({
        error: 'Acesso negado - você só pode acessar seus próprios recursos',
        code: 'OWNERSHIP_REQUIRED',
      });
    }
  };
}

/**
 * Middleware que limita acesso ao setor do usuário (para gerentes) - CORRIGIDO
 */
export function requireSectorAccess() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'Acesso negado - usuário não autenticado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Diretores têm acesso a todos os setores
    if (request.user.roles?.includes(Role.DIRETOR)) {
      return; // Permitir acesso
    }

    // Extrair sectorId da query ou params - CORRIGIDO
    const query = request.query as Record<string, any>;
    const params = request.params as Record<string, any>;

    const sectorIdString = query.sectorId || params.sectorId;

    // Se não especificou setor, permitir (listará apenas do próprio setor)
    if (!sectorIdString) {
      return;
    }

    const targetSectorId = parseInt(sectorIdString, 10);

    // Verificar se é um número válido
    if (isNaN(targetSectorId)) {
      return reply.status(400).send({
        error: 'sectorId deve ser um número válido',
        code: 'INVALID_SECTOR_ID',
      });
    }

    // Verificar se está tentando acessar o próprio setor
    if (request.user.sectorId && request.user.sectorId !== targetSectorId) {
      console.warn(`[RBAC] Tentativa de acesso a setor não autorizado`);
      console.warn(
        `[RBAC] Usuário: ${request.user.email} (Setor: ${request.user.sectorId})`
      );
      console.warn(`[RBAC] Tentando acessar setor: ${targetSectorId}`);

      return reply.status(403).send({
        error: 'Acesso negado - você só pode acessar dados do seu setor',
        code: 'SECTOR_ACCESS_DENIED',
        userSector: request.user.sectorId,
        requestedSector: targetSectorId,
      });
    }
  };
}

/**
 * Rate limiting específico para operações sensíveis
 */
export function sensitiveOperationLimit() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Implementar rate limiting mais restritivo para operações como:
    // - Criação de usuários
    // - Alteração de senhas
    // - Aprovação de expurgos
    // - Fechamento de períodos
    // Por enquanto, vamos usar o rate limiting global do Fastify
    // Isso pode ser expandido com Redis para rate limiting distribuído
  };
}

/**
 * Middleware de auditoria para ações administrativas
 */
export function auditAdminAction(actionType: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Log detalhado da ação
    request.log.info(
      {
        action: actionType,
        user: {
          id: request.user?.id,
          email: request.user?.email,
          roles: request.user?.roles,
        },
        route: `${request.method} ${request.url}`,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
        timestamp: new Date().toISOString(),
      },
      `Admin action: ${actionType}`
    );

    // TODO: Salvar no banco de dados (AuditLogEntity)
    // Isso será implementado quando integrarmos com o AuthService
  };
}

/**
 * Utilitário para combinar múltiplos middlewares
 */
export function combineMiddlewares(
  ...middlewares: Array<
    (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  >
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    for (const middleware of middlewares) {
      await middleware(request, reply);
      // Se a resposta já foi enviada (erro), parar
      if (reply.sent) {
        return;
      }
    }
  };
}

// === MIDDLEWARES PRÉ-CONFIGURADOS ===

export const adminOnly = requireRoles(Role.DIRETOR);

export const adminOrManager = requireRoles(Role.DIRETOR, Role.GERENTE);

export const authenticated = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  if (!request.user) {
    return reply.status(401).send({
      error: 'Acesso negado - login necessário',
      code: 'LOGIN_REQUIRED',
    });
  }
};

export const manageUsers = requirePermissions(Permission.MANAGE_USERS);

export const manageParameters = requirePermissions(
  Permission.MANAGE_PARAMETERS
);

export const approveExpurgos = requirePermissions(Permission.APPROVE_EXPURGOS);

export const viewReports = requirePermissions(
  Permission.VIEW_REPORTS,
  Permission.VIEW_RANKINGS,
  Permission.VIEW_PUBLIC_REPORTS
);

export const closePeriods = requirePermissions(Permission.CLOSE_PERIODS);

export const startPeriods = requirePermissions(Permission.START_PERIODS);
