// apps/web/src/hooks/useVigenciasMenu.ts - HOOK PARA MENU COM BADGE
'use client';

import { usePermissions } from '@/components/providers/AuthProvider';
import { useVigencias } from './useVigencias';

/**
 * Hook para integração de vigências no menu admin
 * Fornece contagem de pendentes para badge
 */
export function useVigenciasMenu() {
  const { pendingCount, isLoadingPending } = useVigencias();
  const { canViewReports, isDirector } = usePermissions();

  const canAccessVigencias = canViewReports() || isDirector();

  return {
    canAccess: canAccessVigencias,
    pendingCount,
    isLoading: isLoadingPending,
    showBadge: pendingCount > 0 && canAccessVigencias,
  };
}
