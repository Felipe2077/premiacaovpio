// apps/web/src/app/admin/layout.tsx
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
import { Permission } from '@sistema-premiacao/shared-types';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  FileText,
  Settings,
  Shield,
  TrendingUp,
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
              <div className='mx-auto px-4 sm:px-6 lg:px-8'>{children}</div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

// Sidebar administrativa
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
      title: 'Relatórios',
      href: '/admin/reports',
      icon: TrendingUp,
      show: canViewReports(),
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
      title: 'Períodos',
      href: '/admin/periods',
      icon: Calendar,
      show: isDirector(), // Apenas diretores podem gerenciar períodos
    },
    {
      title: 'Usuários',
      href: '/admin/users',
      icon: Users,
      show: canManageUsers(),
    },
    {
      title: 'Auditoria',
      href: '/admin/audit',
      icon: Shield,
      show: isDirector(),
    },
    {
      title: 'Configurações',
      href: '/admin/settings',
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
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Footer da sidebar */}
        <div className='flex-shrink-0 px-4 py-4 border-t border-gray-200'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center text-sm text-gray-500'>
              <Clock className='h-4 w-4 mr-2' />
              <span>Última atualização</span>
            </div>
          </div>
          <p className='text-xs text-gray-400 mt-1'>
            {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
}

// Componente para quando o usuário não tem acesso à área administrativa
function AdminAccessDenied() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 p-4'>
      <Card className='w-full max-w-lg'>
        <CardHeader className='text-center'>
          <div className='flex justify-center mb-4'>
            <div className='bg-red-100 p-3 rounded-full'>
              <Shield className='h-8 w-8 text-red-600' />
            </div>
          </div>
          <CardTitle className='text-2xl font-bold text-gray-900'>
            Acesso à Área Administrativa Negado
          </CardTitle>
          <CardDescription className='text-gray-600'>
            Você não possui as permissões necessárias para acessar o painel
            administrativo.
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-6'>
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
            <div className='flex items-start space-x-3'>
              <AlertTriangle className='h-5 w-5 text-yellow-600 mt-0.5' />
              <div className='flex-1'>
                <h4 className='text-sm font-medium text-yellow-800'>
                  Permissões Necessárias
                </h4>
                <div className='text-sm text-yellow-700 mt-2 space-y-1'>
                  <p>• Visualizar Relatórios</p>
                  <p>• Gerenciar Usuários</p>
                  <p>• Gerenciar Parâmetros</p>
                  <p>• Aprovar Expurgos</p>
                </div>
                <p className='text-xs text-yellow-600 mt-2'>
                  * Você precisa de pelo menos uma dessas permissões
                </p>
              </div>
            </div>
          </div>

          <div className='flex flex-col space-y-3'>
            <Button asChild>
              <Link href='/'>Voltar para o Ranking</Link>
            </Button>

            <Button variant='outline' asChild>
              <Link href='/profile'>Ver Meu Perfil</Link>
            </Button>
          </div>

          <div className='text-center text-sm text-gray-500'>
            Se você acredita que deveria ter acesso a esta área, entre em
            contato com o administrador do sistema.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
