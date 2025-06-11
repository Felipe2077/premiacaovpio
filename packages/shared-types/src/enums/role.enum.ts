// packages/shared-types/src/enums/role.enum.ts

export enum Role {
  DIRETOR = 'DIRETOR',
  GERENTE = 'GERENTE',
  VISUALIZADOR = 'VISUALIZADOR',
}

// Para compatibilidade com sistemas que usam Permission como enum separado
export enum Permission {
  // Permissões de usuários
  MANAGE_USERS = 'MANAGE_USERS',

  // Permissões de parâmetros/metas
  MANAGE_PARAMETERS = 'MANAGE_PARAMETERS',
  VIEW_PARAMETERS = 'VIEW_PARAMETERS',

  // Permissões de expurgos
  REQUEST_EXPURGOS = 'REQUEST_EXPURGOS',
  APPROVE_EXPURGOS = 'APPROVE_EXPURGOS',
  REJECT_EXPURGOS = 'REJECT_EXPURGOS',

  // Permissões de visualização
  VIEW_REPORTS = 'VIEW_REPORTS',
  VIEW_RANKINGS = 'VIEW_RANKINGS',
  VIEW_PUBLIC_REPORTS = 'VIEW_PUBLIC_REPORTS',

  // Permissões de períodos
  START_PERIODS = 'START_PERIODS',
  CLOSE_PERIODS = 'CLOSE_PERIODS',

  // Permissões de auditoria
  VIEW_ALL_AUDIT_LOGS = 'VIEW_ALL_AUDIT_LOGS',
}

// Mapeamento de roles para permissões
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.DIRETOR]: [
    Permission.MANAGE_USERS,
    Permission.MANAGE_PARAMETERS,
    Permission.VIEW_PARAMETERS,
    Permission.APPROVE_EXPURGOS,
    Permission.REJECT_EXPURGOS,
    Permission.REQUEST_EXPURGOS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_RANKINGS,
    Permission.VIEW_PUBLIC_REPORTS,
    Permission.CLOSE_PERIODS,
    Permission.START_PERIODS,
    Permission.VIEW_ALL_AUDIT_LOGS,
  ],
  [Role.GERENTE]: [
    Permission.REQUEST_EXPURGOS,
    Permission.VIEW_REPORTS,
    Permission.VIEW_RANKINGS,
    Permission.VIEW_PUBLIC_REPORTS,
    Permission.VIEW_PARAMETERS,
  ],
  [Role.VISUALIZADOR]: [
    Permission.VIEW_REPORTS,
    Permission.VIEW_RANKINGS,
    Permission.VIEW_PUBLIC_REPORTS,
  ],
};
