// apps/web/src/app/admin/layout.tsx - COM FOOTER INTEGRADO
'use client';

import { AdminFooter } from '@/components/admin/AdminFooter';
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

function AdminAccessDenied() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 flex items-center justify-center p-4'>
      <Card className='w-full max-w-md border-red-200 bg-red-50'>
        <CardHeader className='text-center'>
          <div className='mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4'>
            <ShieldAlert className='h-8 w-8 text-red-600' />
          </div>
          <CardTitle className='text-red-900'>Acesso Restrito</CardTitle>
          <CardDescription className='text-red-700'>
            Você não tem permissão para acessar a área administrativa
          </CardDescription>
        </CardHeader>
        <CardContent className='text-center'>
          <p className='text-red-600 text-sm mb-4'>
            Esta área é restrita para diretores e gerentes. Entre em contato com
            o administrador do sistema se você acredita que deveria ter acesso.
          </p>
          <div className='flex items-center justify-center space-x-2 text-xs text-red-500'>
            <Lock className='h-4 w-4' />
            <span>Área protegida por autenticação</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
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
      {/* Layout principal com flex column para garantir que o footer fique no final */}
      <div className='min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-slate-100 flex flex-col'>
        {/* Header fixo no topo */}
        <AdminHeader
          onToggleSidebar={setSidebarCollapsed}
          sidebarCollapsed={sidebarCollapsed}
        />

        {/* Container principal com sidebar e conteúdo */}
        <div className='flex flex-1'>
          {/* Sidebar */}
          <AdminSidebar
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={setSidebarCollapsed}
          />

          {/* Conteúdo principal com margem responsiva baseada no estado da sidebar */}
          <main
            className={`flex-1 transition-all duration-300 flex flex-col ${
              sidebarCollapsed
                ? 'ml-16' // Sidebar colapsada
                : 'ml-72' // Sidebar expandida
            }`}
          >
            {/* Conteúdo das páginas - flex-1 para ocupar espaço disponível */}
            <div className='flex-1 p-4 sm:p-6 lg:p-8'>{children}</div>

            {/* Footer sempre no final */}
            <AdminFooter />
          </main>
        </div>

        {/* Toast notifications */}
        <Toaster
          position='top-right'
          toastOptions={{
            duration: 4000,
            style: {
              background: 'white',
              color: 'rgb(15 23 42)', // slate-900
              border: '1px solid rgb(251 191 36)', // yellow-400
            },
          }}
        />
      </div>
    </ProtectedRoute>
  );
}
