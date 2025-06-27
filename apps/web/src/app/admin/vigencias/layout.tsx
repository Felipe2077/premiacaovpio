// apps/web/src/app/admin/vigencias/layout.tsx - LAYOUT PARA SEÇÃO DE VIGÊNCIAS
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Permission } from '@sistema-premiacao/shared-types';
import { ReactNode } from 'react';

interface VigenciasLayoutProps {
  children: ReactNode;
}

export default function VigenciasLayout({ children }: VigenciasLayoutProps) {
  return (
    <ProtectedRoute
      permissions={[Permission.VIEW_REPORTS, Permission.CLOSE_PERIODS]}
      requireAll={false} // Basta ter UMA das permissões
      fallback={
        <div className='text-center py-8'>
          <p className='text-muted-foreground'>
            Acesso negado. Você precisa de permissões para visualizar
            relatórios.
          </p>
        </div>
      }
    >
      <div className='space-y-6'>{children}</div>
    </ProtectedRoute>
  );
}
