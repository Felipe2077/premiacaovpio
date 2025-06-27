// apps/web/src/hooks/useVigenciasMenu.ts - CORRIGIDO COM AUTENTICAÇÃO
'use client';

import { usePermissions } from '@/components/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Função para buscar contagem de pendentes (versão otimizada para o menu)
const fetchPendingCount = async (): Promise<number> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/periods/pending-officialization`,
      {
        credentials: 'include', // Para cookies httpOnly (seguindo padrão do sistema)
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) {
      // Se não conseguir buscar, retorna 0 (silencioso para o menu)
      return 0;
    }

    const result = await response.json();

    // 🎯 CORREÇÃO: API retorna wrapper {success, data, message, timestamp}
    if (!result.success) {
      return 0; // Em caso de erro, retorna 0 para não quebrar o menu
    }

    return result.data?.count || 0;
  } catch (error) {
    // Em caso de erro, retorna 0 (silencioso para não quebrar o menu)
    console.warn(
      'Erro ao buscar contagem de vigências pendentes para menu:',
      error
    );
    return 0;
  }
};

/**
 * Hook para integração de vigências no menu admin
 * Fornece contagem de pendentes para badge
 * 🎯 INTEGRADO com sistema de autenticação existente
 */
export function useVigenciasMenu() {
  const { hasPermission, hasRole } = usePermissions();

  // Verificar se usuário pode acessar vigências (mesmo padrão das outras páginas admin)
  const canViewReports = hasPermission('VIEW_REPORTS');
  const canClosePeriods = hasPermission('CLOSE_PERIODS');
  const isDirector = hasRole('DIRETOR');
  const isManager = hasRole('GERENTE');

  const canAccessVigencias =
    canViewReports || canClosePeriods || isDirector || isManager;

  const {
    data: pendingCount = 0,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['vigencias-menu', 'pending-count'],
    queryFn: fetchPendingCount,
    staleTime: 3 * 60 * 1000, // 3 minutos - mais tempo para menu
    retry: 1, // Apenas 1 retry para não sobrecarregar
    refetchOnWindowFocus: false, // Não refetch ao focar janela
    refetchOnMount: false, // Não refetch ao montar (otimização)
    refetchInterval: 5 * 60 * 1000, // Refetch a cada 5 minutos
    enabled: canAccessVigencias, // 🎯 CORREÇÃO: Só busca se usuário tem acesso
  });

  return {
    canAccess: canAccessVigencias,
    pendingCount,
    isLoading,
    error,
    showBadge: pendingCount > 0 && canAccessVigencias,
  };
}
