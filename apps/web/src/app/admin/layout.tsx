// apps/web/src/app/admin/layout.tsx - COM NOVO HEADER INTEGRADO
'use client';

import { AdminHeader } from '@/components/admin/AdminHeader';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';
import { Permission } from '@sistema-premiacao/shared-types';
import { Lock, ShieldAlert } from 'lucide-react';
import { ReactNode, useState } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <ProtectedRoute
      permissions={[
        Permission.VIEW_REPORTS,
        Permission.MANAGE_USERS,
        Permission.MANAGE_PARAMETERS,
        Permission.APPROVE_EXPURGOS,
      ]}
      requireAll={false} // Basta ter UMA das permissões
      fallback={<AdminAccessDenied />}
    >
      <div className='min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100'>
        {/* Header fixo no topo */}
        <AdminHeader
          onToggleSidebar={setSidebarCollapsed}
          sidebarCollapsed={sidebarCollapsed}
        />

        <div className='flex'>
          {/* Sidebar */}
          <AdminSidebar
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={setSidebarCollapsed}
          />

          {/* Conteúdo principal com margem responsiva baseada no estado da sidebar */}
          <main
            className={`flex-1 transition-all duration-300 ${
              sidebarCollapsed ? 'ml-16' : 'ml-72'
            } `} // pt-16 para compensar altura do header fixo
          >
            {/* Container do conteúdo */}
            <div className='p-4 sm:p-6 lg:p-8'>{children}</div>

            {/* Toaster para notificações */}
            <Toaster richColors position='top-right' />
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Componente de acesso negado melhorado
function AdminAccessDenied() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4'>
      <Card className='w-full max-w-md border-red-200 shadow-xl'>
        <CardHeader className='text-center pb-4'>
          <div className='mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4'>
            <ShieldAlert className='h-8 w-8 text-red-600' />
          </div>
          <CardTitle className='text-xl text-red-800'>
            Acesso Restrito
          </CardTitle>
          <CardDescription className='text-red-600'>
            Esta área é restrita para administradores
          </CardDescription>
        </CardHeader>

        <CardContent className='text-center space-y-4'>
          <div className='bg-red-50 border border-red-200 rounded-lg p-4'>
            <div className='flex items-center justify-center space-x-2 text-red-700'>
              <Lock className='h-4 w-4' />
              <span className='text-sm font-medium'>
                Permissões Necessárias
              </span>
            </div>
            <ul className='text-xs text-red-600 mt-2 space-y-1'>
              <li>• Visualizar Relatórios</li>
              <li>• Gerenciar Usuários</li>
              <li>• Gerenciar Parâmetros</li>
              <li>• Aprovar Expurgos</li>
            </ul>
          </div>

          <p className='text-sm text-slate-600'>
            Entre em contato com o administrador do sistema para solicitar
            acesso.
          </p>

          <div className='pt-4'>
            <a
              href='/'
              className='inline-flex items-center justify-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors'
            >
              Voltar ao Início
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
