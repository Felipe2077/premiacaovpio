// apps/web/src/app/admin/layout.tsx - VERSÃO COMPLETA E CORRIGIDA
'use client';

import {
  ProtectedRoute,
  useComponentAccess,
} from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Toaster } from '@/components/ui/sonner';
import { VigenciasBadge } from '@/components/vigencias/VigenciasBadge';
import { Permission } from '@sistema-premiacao/shared-types';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  FileText,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
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
      <div className='min-h-screen bg-gray-50'>
        <div className='flex'>
          {/* Sidebar */}
          <AdminSidebar />

          {/* Conteúdo principal */}
          <main className='flex-1 lg:ml-64'>
            <div className='py-6'>
              <div className='mx-auto px-4 sm:px-6 lg:px-8'>
                {children}
                <Toaster richColors position='top-right' />
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Sidebar administrativa - VERSÃO COMPLETA E CORRIGIDA
function AdminSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const {
    canManageUsers,
    canManageParameters,
    canApproveExpurgos,
    isDirector,
    canViewReports,
  } = useComponentAccess();

  const menuItems = [
    {
      title: 'Visão Geral',
      href: '/admin',
      icon: BarChart3,
      show: true,
    },
    {
      title: 'Vigências',
      href: '/admin/vigencias',
      icon: Clock,
      show: canViewReports() || isDirector(),
      hasBadge: true, // Indica que este item tem badge
    },
    {
      title: 'Gerenciar Metas',
      href: '/admin/parameters',
      icon: FileText,
      show: canManageParameters(),
    },
    {
      title: 'Expurgos',
      href: '/admin/expurgos',
      icon: AlertTriangle,
      show: canApproveExpurgos() || true, // Gerentes podem pelo menos visualizar/solicitar
    },
    {
      title: 'Usuários',
      href: '/admin/users',
      icon: Users,
      show: canManageUsers(),
    },
    {
      title: 'Auditoria',
      href: '/admin/audit-logs',
      icon: Shield,
      show: isDirector(),
    },
    {
      title: 'Agendamentos',
      href: '/admin/scheduling',
      icon: Settings,
      show: isDirector(),
    },
  ];

  const visibleItems = menuItems.filter((item) => item.show);

  return (
    <div className='hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0'>
      <div className='flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto'>
        {/* Header da sidebar */}
        <div className='flex items-center flex-shrink-0 px-4'>
          <div className='bg-blue-600 p-2 rounded-lg'>
            <Settings className='h-6 w-6 text-white' />
          </div>
          <div className='ml-3'>
            <h2 className='text-lg font-semibold text-gray-900'>
              Administração
            </h2>
            <p className='text-sm text-gray-500'>Painel de Controle</p>
          </div>
        </div>

        {/* Informações do usuário */}
        <div className='mt-6 px-4'>
          <div className='bg-blue-50 rounded-lg p-3'>
            <div className='flex items-center'>
              <div className='bg-blue-600 p-2 rounded-full'>
                <Users className='h-4 w-4 text-white' />
              </div>
              <div className='ml-3'>
                <p className='text-sm font-medium text-blue-900'>
                  {user?.nome}
                </p>
                <p className='text-xs text-blue-700'>
                  {user?.roles?.join(', ')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu de navegação */}
        <nav className='mt-8 flex-1 px-2 space-y-1'>
          {visibleItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors
                  ${
                    isActive
                      ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }
                `}
              >
                <Icon
                  className={`
                    mr-3 flex-shrink-0 h-5 w-5 transition-colors
                    ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}
                  `}
                />
                <span className='flex-1'>{item.title}</span>
                {/* Badge para vigências */}
                {item.hasBadge && <VigenciasBadge />}
              </Link>
            );
          })}
        </nav>

        {/* Footer da sidebar (opcional) */}
        <div className='flex-shrink-0 flex border-t border-gray-200 p-4'>
          <div className='flex items-center'>
            <div>
              <p className='text-xs text-gray-500'>Sistema de Premiação v1.0</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente de acesso negado
function AdminAccessDenied() {
  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
      <Card className='w-full max-w-md'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-red-600'>
            <Shield className='h-5 w-5' />
            Acesso Negado
          </CardTitle>
          <CardDescription>
            Você não possui permissões suficientes para acessar esta área.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            <p className='text-sm text-muted-foreground'>
              Para acessar o painel administrativo, você precisa de uma das
              seguintes permissões:
            </p>
            <ul className='text-xs text-muted-foreground space-y-1 ml-4'>
              <li>• Visualizar relatórios</li>
              <li>• Gerenciar usuários</li>
              <li>• Gerenciar parâmetros</li>
              <li>• Aprovar expurgos</li>
            </ul>
            <Button asChild className='w-full mt-4'>
              <Link href='/'>Voltar ao Início</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
