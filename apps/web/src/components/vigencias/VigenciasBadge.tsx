// apps/web/src/components/vigencias/VigenciasBadge.tsx - COMPONENTE COMPLETO
'use client';

import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Função para buscar contagem de pendentes (versão otimizada para o menu)
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
      // Se não conseguir buscar, retorna 0 (silencioso para o menu)
      return 0;
    }

    const data = await response.json();
    return data.count || 0;
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
 * Badge que mostra a contagem de períodos pendentes no menu
 * Otimizado para performance e experiência do usuário
 */
export function VigenciasBadge() {
  const {
    data: pendingCount = 0,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['vigencias-badge', 'pending-count'],
    queryFn: fetchPendingCount,
    staleTime: 3 * 60 * 1000, // 3 minutos - mais tempo para menu
    retry: 1, // Apenas 1 retry para não sobrecarregar
    refetchOnWindowFocus: false, // Não refetch ao focar janela
    refetchOnMount: false, // Não refetch ao montar (otimização)
    refetchInterval: 5 * 60 * 1000, // Refetch a cada 5 minutos
  });

  // Não mostrar badge se estiver carregando, houver erro, ou count for 0
  if (isLoading || error || pendingCount === 0) {
    return null;
  }

  return (
    <Badge
      variant='destructive'
      className='ml-auto h-5 w-5 flex items-center justify-center text-xs font-bold bg-red-500 hover:bg-red-600 border-red-500'
    >
      {pendingCount > 99 ? '99+' : pendingCount}
    </Badge>
  );
}
