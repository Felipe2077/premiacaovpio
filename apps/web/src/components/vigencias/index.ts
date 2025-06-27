// apps/web/src/hooks/useVigenciasMenu.ts - HOOK ATUALIZADO E OTIMIZADO
'use client';

import { usePermissions } from '@/components/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
// apps/web/src/components/vigencias/index.ts
export { ActionButton } from './ActionButton';
export { PeriodCard } from './PeriodCard';
export { PeriodsByYearView } from './PeriodsByYearView';
export { PeriodStatusBadge } from './PeriodStatusBadge';
export { TieIndicator } from './TieIndicator';
export { VigenciasBadge } from './VigenciasBadge';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Função para buscar contagem de pendentes (versão otimizada)
const fetchPendingCount = async (): Promise<number> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/periods/pending-officialization`,
      {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      return 0;
    }

    const data = await response.json();
    return data.count || 0;
  } catch (error) {
    console.warn('Erro ao buscar contagem de vigências pendentes:', error);
    return 0;
  }
};

/**
 * Hook otimizado para uso no menu
 * Busca apenas a contagem de pendentes e verifica permissões
 */
export function useVigenciasMenu() {
  const { canViewReports, isDirector } = usePermissions();

  const canAccessVigencias = canViewReports() || isDirector();

  const {
    data: pendingCount = 0,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['vigencias-menu', 'pending-count'],
    queryFn: fetchPendingCount,
    staleTime: 2 * 60 * 1000, // 2 minutos
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: canAccessVigencias, // Só busca se usuário tem acesso
  });

  return {
    canAccess: canAccessVigencias,
    pendingCount,
    isLoading,
    error,
    showBadge: pendingCount > 0 && canAccessVigencias,
  };
}
