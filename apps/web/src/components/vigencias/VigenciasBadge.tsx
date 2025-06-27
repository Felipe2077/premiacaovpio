// apps/web/src/components/vigencias/VigenciasBadge.tsx - CORRIGIDO COM AUTENTICAÇÃO
'use client';

import { Badge } from '@/components/ui/badge';
import { useVigenciasMenu } from '@/hooks/useVigenciasMenu';

/**
 * Badge que mostra a contagem de períodos pendentes no menu
 * 🎯 INTEGRADO com sistema de autenticação existente
 * Usado no layout admin sidebar
 */
export function VigenciasBadge() {
  const { pendingCount, isLoading, error, canAccess, showBadge } =
    useVigenciasMenu();

  // Não mostrar badge se:
  // - Usuário não tem acesso
  // - Estiver carregando
  // - Houver erro
  // - Count for 0
  if (!canAccess || isLoading || error || !showBadge) {
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
