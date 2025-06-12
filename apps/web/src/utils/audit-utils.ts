// apps/web/src/lib/audit-utils.ts - Utilitários para Sistema de Auditoria

import type { AuditLogEntity } from '@/entity/audit-log.entity';

// Tipos para filtros
export interface AuditFilters {
  searchTerm: string;
  actionType: string;
  user: string;
  timeRange: string;
  dateFrom?: Date;
  dateTo?: Date;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

// Tipos para estatísticas
export interface AuditStatistics {
  total: number;
  todayCount: number;
  thisWeekCount: number;
  thisMonthCount: number;
  uniqueUsers: number;
  topAction: { type: string; count: number } | null;
  criticalActions: number;
  actionTypeCounts: Record<string, number>;
  userActivityCounts: Record<string, number>;
  hourlyDistribution: Record<number, number>;
  dailyTrend: Array<{ date: string; count: number }>;
}

// Prioridades das ações
export const ACTION_PRIORITIES: Record<
  string,
  'low' | 'medium' | 'high' | 'critical'
> = {
  // Críticas
  EXPURGO_REJEITADO: 'critical',
  USUARIO_DESATIVADO: 'critical',
  PARAMETRO_ALTERADO: 'critical',

  // Altas
  EXPURGO_APROVADO_INTEGRAL: 'high',
  EXPURGO_APROVADO_PARCIAL: 'high',
  USUARIO_CRIADO: 'high',
  PERIODO_INICIADO: 'high',
  PERIODO_FECHADO: 'high',

  // Médias
  EXPURGO_SOLICITADO: 'medium',
  META_CRIADA_VIA_CALCULO: 'medium',
  META_ATUALIZADA_VIA_CALCULO: 'medium',
  META_CRIADA_MANUALMENTE: 'medium',
  USUARIO_ATUALIZADO: 'medium',
  CALCULO_EXECUTADO: 'medium',
  RANKING_ATUALIZADO: 'medium',

  // Baixas
  EXPURGO_ANEXO_ENVIADO: 'low',
  SEED_EXECUTADO: 'low',
  SISTEMA_INICIADO: 'low',
  LOGIN_REALIZADO: 'low',
  LOGOUT_REALIZADO: 'low',
};

// Categorias de ações
export const ACTION_CATEGORIES = {
  EXPURGO: [
    'EXPURGO_SOLICITADO',
    'EXPURGO_APROVADO_INTEGRAL',
    'EXPURGO_APROVADO_PARCIAL',
    'EXPURGO_REJEITADO',
    'EXPURGO_ANEXO_ENVIADO',
  ],
  META: [
    'META_CRIADA_VIA_CALCULO',
    'META_ATUALIZADA_VIA_CALCULO',
    'META_CRIADA_MANUALMENTE',
    'PARAMETRO_ALTERADO',
    'META_VERSIONADA_TIMESTAMP',
  ],
  USUARIO: [
    'USUARIO_CRIADO',
    'USUARIO_ATUALIZADO',
    'USUARIO_DESATIVADO',
    'LOGIN_REALIZADO',
    'LOGOUT_REALIZADO',
  ],
  SISTEMA: [
    'SEED_EXECUTADO',
    'SISTEMA_INICIADO',
    'CALCULO_EXECUTADO',
    'RANKING_ATUALIZADO',
  ],
  PERIODO: ['PERIODO_CRIADO', 'PERIODO_INICIADO', 'PERIODO_FECHADO'],
};

// Obter prioridade de uma ação
export const getActionPriority = (
  actionType: string
): 'low' | 'medium' | 'high' | 'critical' => {
  return ACTION_PRIORITIES[actionType] || 'low';
};

// Obter categoria de uma ação
export const getActionCategory = (actionType: string): string => {
  for (const [category, actions] of Object.entries(ACTION_CATEGORIES)) {
    if (actions.includes(actionType)) {
      return category;
    }
  }
  return 'OUTROS';
};

// Filtrar logs baseado nos critérios
export const filterAuditLogs = (
  logs: AuditLogEntity[],
  filters: AuditFilters
): AuditLogEntity[] => {
  return logs.filter((log) => {
    // Filtro de busca por texto
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      const matches =
        log.actionType.toLowerCase().includes(searchLower) ||
        (log.user?.nome || log.userName || 'Sistema')
          .toLowerCase()
          .includes(searchLower) ||
        (log.justification || '').toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details || {})
          .toLowerCase()
          .includes(searchLower);

      if (!matches) return false;
    }

    // Filtro por tipo de ação
    if (filters.actionType !== 'all') {
      if (filters.actionType.startsWith('CATEGORY_')) {
        const category = filters.actionType.replace('CATEGORY_', '');
        if (getActionCategory(log.actionType) !== category) return false;
      } else {
        if (log.actionType !== filters.actionType) return false;
      }
    }

    // Filtro por usuário
    if (filters.user !== 'all') {
      const userName = log.user?.nome || log.userName || 'Sistema';
      if (userName !== filters.user) return false;
    }

    // Filtro por prioridade
    if (filters.priority) {
      if (getActionPriority(log.actionType) !== filters.priority) return false;
    }

    // Filtro por período
    const logDate = new Date(log.timestamp);
    if (filters.timeRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();

      switch (filters.timeRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          cutoffDate.setDate(cutoffDate.getDate() - 1);
          cutoffDate.setHours(0, 0, 0, 0);
          const endOfYesterday = new Date(cutoffDate);
          endOfYesterday.setHours(23, 59, 59, 999);
          if (logDate < cutoffDate || logDate > endOfYesterday) return false;
          break;
        case 'week':
          cutoffDate.setDate(cutoffDate.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(cutoffDate.getMonth() - 1);
          break;
        case 'custom':
          if (filters.dateFrom && logDate < filters.dateFrom) return false;
          if (filters.dateTo && logDate > filters.dateTo) return false;
          return true;
      }

      if (filters.timeRange !== 'yesterday' && filters.timeRange !== 'custom') {
        if (logDate < cutoffDate) return false;
      }
    }

    return true;
  });
};

// Calcular estatísticas dos logs
export const calculateAuditStatistics = (
  logs: AuditLogEntity[]
): AuditStatistics => {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const thisWeek = new Date(now);
  thisWeek.setDate(thisWeek.getDate() - 7);

  const thisMonth = new Date(now);
  thisMonth.setMonth(thisMonth.getMonth() - 1);

  // Contadores básicos
  const total = logs.length;
  const todayCount = logs.filter(
    (log) => new Date(log.timestamp) >= today
  ).length;
  const thisWeekCount = logs.filter(
    (log) => new Date(log.timestamp) >= thisWeek
  ).length;
  const thisMonthCount = logs.filter(
    (log) => new Date(log.timestamp) >= thisMonth
  ).length;

  // Usuários únicos
  const uniqueUsers = new Set(
    logs.map((log) => log.user?.nome || log.userName || 'Sistema')
  ).size;

  // Contagem por tipo de ação
  const actionTypeCounts = logs.reduce(
    (acc, log) => {
      acc[log.actionType] = (acc[log.actionType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Ação mais frequente
  const topAction = Object.entries(actionTypeCounts).sort(
    ([, a], [, b]) => b - a
  )[0];

  // Ações críticas
  const criticalActions = logs.filter(
    (log) => getActionPriority(log.actionType) === 'critical'
  ).length;

  // Atividade por usuário
  const userActivityCounts = logs.reduce(
    (acc, log) => {
      const user = log.user?.nome || log.userName || 'Sistema';
      acc[user] = (acc[user] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Distribuição por hora do dia
  const hourlyDistribution = logs.reduce(
    (acc, log) => {
      const hour = new Date(log.timestamp).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    },
    {} as Record<number, number>
  );

  // Tendência diária (últimos 7 dias)
  const dailyTrend: Array<{ date: string; count: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const count = logs.filter((log) => {
      const logDate = new Date(log.timestamp);
      return logDate >= date && logDate < nextDay;
    }).length;

    dailyTrend.push({
      date: date.toISOString().split('T')[0],
      count,
    });
  }

  return {
    total,
    todayCount,
    thisWeekCount,
    thisMonthCount,
    uniqueUsers,
    topAction: topAction ? { type: topAction[0], count: topAction[1] } : null,
    criticalActions,
    actionTypeCounts,
    userActivityCounts,
    hourlyDistribution,
    dailyTrend,
  };
};

// Exportar logs para CSV
export const exportLogsToCSV = (logs: AuditLogEntity[]): string => {
  const headers = [
    'ID',
    'Timestamp',
    'Usuário',
    'Ação',
    'Prioridade',
    'Categoria',
    'Justificativa',
    'IP',
    'Período',
    'Detalhes',
  ];

  const rows = logs.map((log) => [
    log.id,
    new Date(log.timestamp).toLocaleString('pt-BR'),
    log.user?.nome || log.userName || 'Sistema',
    log.actionType,
    getActionPriority(log.actionType),
    getActionCategory(log.actionType),
    log.justification || '',
    log.ipAddress || '',
    log.competitionPeriod?.mesAno || '',
    JSON.stringify(log.details || {}),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');

  return csvContent;
};

// Baixar CSV
export const downloadCSV = (
  csvContent: string,
  filename: string = 'audit_logs.csv'
) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Obter cor baseada na prioridade
export const getPriorityColor = (priority: string) => {
  const colors = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    high: 'text-orange-600 bg-orange-50 border-orange-200',
    medium: 'text-blue-600 bg-blue-50 border-blue-200',
    low: 'text-gray-600 bg-gray-50 border-gray-200',
  };
  return colors[priority as keyof typeof colors] || colors.low;
};

// Obter ícone baseado na categoria
export const getCategoryIcon = (category: string) => {
  const icons = {
    EXPURGO: '🗂️',
    META: '🎯',
    USUARIO: '👤',
    SISTEMA: '⚙️',
    PERIODO: '📅',
    OUTROS: '📋',
  };
  return icons[category as keyof typeof icons] || icons.OUTROS;
};
