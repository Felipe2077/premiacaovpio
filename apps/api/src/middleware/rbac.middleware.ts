// apps/api/src/middleware/rbac.middleware.ts - VERSÃO COMPLETA CORRIGIDA
import { Permission } from '@/entity/role.entity';
import { Role } from '@sistema-premiacao/shared-types';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Cria middleware que exige permissões específicas
 */
export function requirePermissions(...permissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(request as any).user) {
      return reply.status(401).send({
        error: 'Acesso negado - usuário não autenticado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const userPermissions = (request as any).user.permissions || [];
    const hasPermission = permissions.some((permission) =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      console.warn(
        `[RBAC] Acesso negado para usuário ${(request as any).user.email} (ID: ${(request as any).user.id})`
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
      `[RBAC] Acesso autorizado para ${(request as any).user.email} - ${request.method} ${request.url}`
    );
  };
}

/**
 * Cria middleware que exige roles específicos
 */
export function requireRoles(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(request as any).user) {
      return reply.status(401).send({
        error: 'Acesso negado - usuário não autenticado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const userRoles = (request as any).user.roles || [];
    const hasRole = roles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      console.warn(
        `[RBAC] Acesso negado por role para usuário ${(request as any).user.email}`
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
 * Middleware que permite acesso apenas ao próprio usuário ou admins
 */
export function requireOwnershipOrAdmin(userIdParam: string = 'userId') {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(request as any).user) {
      return reply.status(401).send({
        error: 'Acesso negado - usuário não autenticado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Extrair ID do usuário alvo dos parâmetros da rota
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
    const isOwner = (request as any).user.id === targetUserId;

    // Verificar se é admin/diretor
    const isAdmin =
      (request as any).user.roles?.includes(Role.DIRETOR) ||
      (request as any).user.permissions?.includes(Permission.MANAGE_USERS);

    if (!isOwner && !isAdmin) {
      console.warn(`[RBAC] Tentativa de acesso a recurso de outro usuário`);
      console.warn(
        `[RBAC] Usuário: ${(request as any).user.email} (ID: ${(request as any).user.id})`
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
 * Middleware que limita acesso ao setor do usuário (para gerentes)
 */
export function requireSectorAccess() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!(request as any).user) {
      return reply.status(401).send({
        error: 'Acesso negado - usuário não autenticado',
        code: 'NOT_AUTHENTICATED',
      });
    }

    // Diretores têm acesso a todos os setores
    if ((request as any).user.roles?.includes(Role.DIRETOR)) {
      return; // Permitir acesso
    }

    // Extrair sectorId da query ou params
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
    if (
      (request as any).user.sectorId &&
      (request as any).user.sectorId !== targetSectorId
    ) {
      console.warn(`[RBAC] Tentativa de acesso a setor não autorizado`);
      console.warn(
        `[RBAC] Usuário: ${(request as any).user.email} (Setor: ${(request as any).user.sectorId})`
      );
      console.warn(`[RBAC] Tentando acessar setor: ${targetSectorId}`);

      return reply.status(403).send({
        error: 'Acesso negado - você só pode acessar dados do seu setor',
        code: 'SECTOR_ACCESS_DENIED',
        userSector: (request as any).user.sectorId,
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
          id: (request as any).user?.id,
          email: (request as any).user?.email,
          roles: (request as any).user?.roles,
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
  if (!(request as any).user) {
    return reply.status(401).send({
      error: 'Acesso negado - login necessário',
      code: 'LOGIN_REQUIRED',
    });
  }
};

// === MIDDLEWARES DE PERMISSÕES ESPECÍFICAS ===

export const manageUsers = requirePermissions(Permission.MANAGE_USERS);

export const manageParameters = requirePermissions(
  Permission.MANAGE_PARAMETERS
);

export const approveExpurgos = requirePermissions(Permission.APPROVE_EXPURGOS);

export const rejectExpurgos = requirePermissions(Permission.REJECT_EXPURGOS);

export const requestExpurgos = requirePermissions(Permission.REQUEST_EXPURGOS);

export const viewAllAuditLogs = requirePermissions(
  Permission.VIEW_ALL_AUDIT_LOGS
);

export const viewParameters = requirePermissions(Permission.VIEW_PARAMETERS);

export const viewReports = requirePermissions(
  Permission.VIEW_REPORTS,
  Permission.VIEW_RANKINGS,
  Permission.VIEW_PUBLIC_REPORTS
);

export const closePeriods = requirePermissions(Permission.CLOSE_PERIODS);

export const startPeriods = requirePermissions(Permission.START_PERIODS);

export const deleteExpurgos = requirePermissions(Permission.DELETE_EXPURGOS);

export const editOwnExpurgos = requirePermissions(Permission.EDIT_OWN_EXPURGOS);

export const viewDetailedPerformance = requirePermissions(
  Permission.VIEW_DETAILED_PERFORMANCE
);

export const viewSectorLogs = requirePermissions(Permission.VIEW_SECTOR_LOGS);

export const manageRoles = requirePermissions(Permission.MANAGE_ROLES);

export const manageSystemSettings = requirePermissions(
  Permission.MANAGE_SYSTEM_SETTINGS
);

export const resolveTies = requirePermissions(Permission.RESOLVE_TIES);

export const viewRankings = requirePermissions(Permission.VIEW_RANKINGS);

export const viewPublicReports = requirePermissions(
  Permission.VIEW_PUBLIC_REPORTS
);

export const viewOwnProfile = requirePermissions(Permission.VIEW_OWN_PROFILE);
