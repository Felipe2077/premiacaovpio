// apps/web/src/app/admin/layout.tsx (UPDATED WITH NOTIFICATIONS)
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
            <span>Área Administrativa</span>
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
      requiredPermissions={[
        Permission.VIEW_REPORTS,
        Permission.MANAGE_PARAMETERS,
        Permission.MANAGE_USERS,
        Permission.APPROVE_EXPURGOS,
        Permission.VIEW_PARAMETERS,
      ]}
      requireAny={true}
      fallback={<AdminAccessDenied />}
    >
      {/* 👇 1. O container principal agora é uma COLUNA */}
      <div className='flex flex-col h-screen bg-gray-50 dark:bg-gray-900'>
        {/* Header movido para ser o primeiro item, ocupando toda a largura */}
        <AdminHeader
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* 👇 2. Novo container em LINHA para agrupar a sidebar e o conteúdo principal */}
        <div className='flex flex-1 overflow-hidden'>
          {/* Sidebar */}
          <aside
            className={`
              ${sidebarCollapsed ? 'w-16' : 'w-64'} 
              transition-all duration-300 ease-in-out
              bg-white dark:bg-gray-800 
              border-r border-gray-200 dark:border-gray-700
              flex-shrink-0
              hidden lg:flex
            `}
          >
            <AdminSidebar
              isCollapsed={sidebarCollapsed}
              onToggleCollapse={setSidebarCollapsed}
            />
          </aside>

          {/* Page Content & Footer */}
          <main className='flex-1 overflow-auto flex flex-col'>
            <div className='container mx-auto px-4 py-6 max-w-[1480px] flex-grow'>
              {children}
            </div>
            <AdminFooter />
          </main>
        </div>

        {/* Mobile Sidebar Overlay */}
        {!sidebarCollapsed && (
          <div
            className='lg:hidden fixed inset-0 z-40 bg-black bg-opacity-50'
            onClick={() => setSidebarCollapsed(true)}
          >
            <aside className='absolute left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg'>
              <AdminSidebar
                isCollapsed={false}
                onToggleCollapse={setSidebarCollapsed}
              />
            </aside>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
