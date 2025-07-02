// apps/web/src/hooks/useSectorsData.ts
import { useQuery } from '@tanstack/react-query';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Interface baseada no padrão existente no projeto
export interface Sector {
  id: number;
  nome: string;
}

// Função para buscar setores ativos (baseada no padrão do projeto)
const fetchActiveSectors = async (): Promise<Sector[]> => {
  const response = await fetch(`${API_BASE_URL}/api/sectors/active`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.error ||
        errorData.message ||
        `Erro ${response.status} ao buscar setores`
    );
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

/**
 * Hook para buscar setores ativos
 * Usado nos formulários de usuário para seleção de setor
 */
export function useSectorsData() {
  return useQuery({
    queryKey: ['sectorsActive'],
    queryFn: fetchActiveSectors,
    staleTime: Infinity, // Dados raramente mudam
    retry: 2,
  });
}
