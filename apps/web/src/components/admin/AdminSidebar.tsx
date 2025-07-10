// apps/web/src/components/admin/AdminSidebar.tsx - AMARELO MAIS SUTIL
'use client';

import { useComponentAccess } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { VigenciasBadge } from '@/components/vigencias/VigenciasBadge';
import {
  AlertTriangle,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Settings,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<any>;
  show: boolean;
  hasBadge?: boolean;
  description?: string;
  isNew?: boolean;
}

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export function AdminSidebar({
  isCollapsed: externalCollapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const { user } = useAuth();
  const {
    canManageUsers,
    canManageParameters,
    canApproveExpurgos,
    isDirector,
    canViewReports,
    canViewParameters,
  } = useComponentAccess();

  // Use external state if provided, otherwise use internal state
  const isCollapsed = externalCollapsed ?? internalCollapsed;

  const handleToggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse(!isCollapsed);
    } else {
      setInternalCollapsed(!isCollapsed);
    }
  };

  const menuItems: MenuItem[] = [
    {
      title: 'Visão Geral',
      href: '/admin',
      icon: BarChart3,
      show: true,
      description: 'Dashboard principal',
    },
    {
      title: 'Vigências',
      href: '/admin/vigencias',
      icon: Clock,
      show: canViewReports() || isDirector(),
      hasBadge: true,
      description: 'Períodos ativos',
    },
    {
      title: 'Gerenciar Metas',
      href: '/admin/parameters',
      icon: FileText,
      show: canViewParameters(),
      description: 'Definir objetivos',
    },
    {
      title: 'Expurgos',
      href: '/admin/expurgos',
      icon: AlertTriangle,
      show: canApproveExpurgos() || true,
      description: 'Eventos especiais',
    },
    {
      title: 'Usuários',
      href: '/admin/users',
      icon: Users,
      show: canManageUsers(),
      description: 'Gerenciar acesso',
    },
    {
      title: 'Auditoria',
      href: '/admin/audit-logs',
      icon: Shield,
      show: isDirector(),
      description: 'Logs do sistema',
    },
    {
      title: 'Agendamentos',
      href: '/admin/scheduling',
      icon: Settings,
      show: isDirector(),
      description: 'Configurações',
      isNew: true,
    },
  ];

  const visibleItems = menuItems.filter((item) => item.show);

  return (
    <aside
      className={`
        h-screen fixed left-0 top-0 z-30 
        bg-gradient-to-b from-neutral-900 via-neutral-800 to-neutral-900
        border-r border-neutral-700/50 shadow-2xl
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-16' : 'w-72'}
      `}
    >
      {/* Header com Logo da Empresa */}
      <div className='relative pt-16'>
        {/* Background com gradiente amarelo mais sutil */}
        <div className='absolute inset-0 bg-gradient-to-r from-amber-500/5 to-yellow-500/5' />

        <div className='relative p-4'>
          <div className='flex items-center justify-between'>
            {!isCollapsed && (
              <div className='flex items-center space-x-3'>
                {/* Logo da empresa com cor amarela mais suave */}
                <div className='relative'>
                  <div className='w-8 h-8 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg flex items-center justify-center shadow-lg'>
                    <Sparkles className='h-5 w-5 text-neutral-900' />
                  </div>
                  <div className='absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full border border-neutral-900 animate-pulse' />
                </div>
                <div>
                  <h2 className='text-lg font-bold text-white'>Admin</h2>
                  <p className='text-xs text-neutral-400'>Painel de Controle</p>
                </div>
              </div>
            )}

            {/* Botão de colapsar com hover mais sutil */}
            <Button
              variant='ghost'
              size='sm'
              onClick={handleToggleCollapse}
              className=' cursor-pointer text-neutral-400 hover:text-amber-300 hover:bg-amber-500/5 p-2 rounded-lg transition-all'
            >
              {isCollapsed ? (
                <ChevronRight className='h-4 w-4' />
              ) : (
                <ChevronLeft className='h-4 w-4' />
              )}
            </Button>
          </div>
        </div>
      </div>

      <Separator className='mx-4 bg-neutral-700/50' />

      {/* Navegação */}
      <nav className='flex-1 px-3 py-4 space-y-2 overflow-y-auto'>
        {visibleItems.map((item) => {
          const isActive =
            item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group relative flex items-center rounded-xl transition-all duration-200
                ${isCollapsed ? 'px-3 py-3 justify-center' : 'px-4 py-3'}
                ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/5 text-amber-300 shadow-md border border-amber-500/20'
                    : 'text-neutral-300 hover:text-amber-200 hover:bg-amber-500/5'
                }
              `}
            >
              {/* Indicador ativo mais sutil */}
              {isActive && (
                <div className='absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-amber-300 to-yellow-400 rounded-r-full' />
              )}

              {/* Ícone */}
              <div className='relative flex-shrink-0'>
                <Icon
                  className={`
                    h-5 w-5 transition-colors
                    ${isActive ? 'text-amber-300' : 'text-neutral-400 group-hover:text-amber-200'}
                  `}
                />

                {/* Badge para itens com notificação quando collapsed */}
                {item.hasBadge && isCollapsed && (
                  <div className='absolute -top-1 -right-1'>
                    <VigenciasBadge />
                  </div>
                )}
              </div>

              {/* Texto e badge quando expandido */}
              {!isCollapsed && (
                <>
                  <div className='ml-3 flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                      <span className='text-sm font-medium truncate'>
                        {item.title}
                      </span>
                    </div>
                    {item.description && (
                      <p className='text-xs text-neutral-500 mt-0.5 truncate'>
                        {item.description}
                      </p>
                    )}
                  </div>
                </>
              )}

              {/* Tooltip para quando collapsed */}
              {isCollapsed && (
                <div className='absolute left-full ml-2 px-3 py-2 bg-neutral-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 border border-neutral-700'>
                  <div className='font-medium'>{item.title}</div>
                  {item.description && (
                    <div className='text-xs text-neutral-400 mt-1'>
                      {item.description}
                    </div>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer minimalista */}
      <div className='p-4 border-t border-neutral-700/50'>
        {!isCollapsed ? (
          <div className='bg-neutral-800/50 rounded-lg p-3 border border-neutral-700/50'>
            <div className='flex items-center space-x-2 text-xs text-neutral-400'>
              <div className='w-2 h-2 bg-emerald-400 rounded-full animate-pulse' />
              <span>Sistema Online</span>
            </div>
            <div className='text-xs text-neutral-500 mt-1'>
              Usuário: {user?.nome || 'N/A'}
            </div>
          </div>
        ) : (
          <div className='flex justify-center'>
            <div className='w-2 h-2 bg-emerald-400 rounded-full animate-pulse' />
          </div>
        )}
      </div>
    </aside>
  );
}
