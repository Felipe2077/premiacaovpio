// packages/shared-types/src/enums/permission.enum.ts
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

export enum Role {
  DIRETOR = 'DIRETOR',
  GERENTE = 'GERENTE',
  VISUALIZADOR = 'VISUALIZADOR',
}

export function getPermissionLabel(permission: Permission): string {
  const labels: Record<Permission, string> = {
    [Permission.MANAGE_USERS]: 'Gerenciar Usuários',
    [Permission.MANAGE_ROLES]: 'Gerenciar Perfis',
    [Permission.MANAGE_PARAMETERS]: 'Gerenciar Metas',
    [Permission.CLOSE_PERIODS]: 'Fechar Períodos',
    [Permission.START_PERIODS]: 'Iniciar Períodos',
    [Permission.APPROVE_EXPURGOS]: 'Aprovar Expurgos',
    [Permission.REJECT_EXPURGOS]: 'Rejeitar Expurgos',
    [Permission.DELETE_EXPURGOS]: 'Excluir Expurgos',
    [Permission.MANAGE_SYSTEM_SETTINGS]: 'Configurações do Sistema',
    [Permission.VIEW_ALL_AUDIT_LOGS]: 'Ver Todos os Logs',
    [Permission.RESOLVE_TIES]: 'Resolver Empates',
    [Permission.REQUEST_EXPURGOS]: 'Solicitar Expurgos',
    [Permission.EDIT_OWN_EXPURGOS]: 'Editar Próprios Expurgos',
    [Permission.VIEW_REPORTS]: 'Ver Relatórios',
    [Permission.VIEW_DETAILED_PERFORMANCE]: 'Ver Desempenho Detalhado',
    [Permission.VIEW_SECTOR_LOGS]: 'Ver Logs do Setor',
    [Permission.VIEW_PARAMETERS]: 'Ver Metas',
    [Permission.VIEW_RANKINGS]: 'Ver Rankings',
    [Permission.VIEW_PUBLIC_REPORTS]: 'Ver Relatórios Públicos',
    [Permission.VIEW_OWN_PROFILE]: 'Ver Próprio Perfil',
  };

  return labels[permission] || permission.replace(/_/g, ' ');
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    [Role.DIRETOR]: 'Diretor',
    [Role.GERENTE]: 'Gerente',
    [Role.VISUALIZADOR]: 'Visualizador',
  };

  return labels[role] || role;
}

export function getRolePermissions(role: Role): Permission[] {
  switch (role) {
    case Role.DIRETOR:
      return Object.values(Permission); // Todas as permissões

    case Role.GERENTE:
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

    case Role.VISUALIZADOR:
      return [
        Permission.VIEW_RANKINGS,
        Permission.VIEW_PUBLIC_REPORTS,
        Permission.VIEW_OWN_PROFILE,
      ];

    default:
      return [Permission.VIEW_OWN_PROFILE];
  }
}
