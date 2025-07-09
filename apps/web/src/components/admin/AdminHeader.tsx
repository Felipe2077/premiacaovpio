// apps/web/src/components/admin/AdminHeader.tsx - AMARELO MAIS SUTIL
'use client';

import { useComponentAccess } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/providers/AuthProvider';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  HelpCircle,
  LogOut,
  MessageSquare,
  Monitor,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
}

export function AdminHeader({
  onToggleSidebar,
  sidebarCollapsed,
}: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { canManageUsers, canManageParameters, isDirector, canViewReports } =
    useComponentAccess();

  const [notifications] = useState(3); // Mock - substituir por hook real

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const getUserInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (roles?: string[]) => {
    if (!roles?.length)
      return 'bg-gradient-to-r from-neutral-500 to-neutral-600';
    if (roles.includes('DIRETOR'))
      return 'bg-gradient-to-r from-amber-500 to-yellow-600'; // Amarelo mais suave para diretor
    if (roles.includes('GERENTE'))
      return 'bg-gradient-to-r from-orange-500 to-orange-600'; // Laranja para gerente
    return 'bg-gradient-to-r from-neutral-500 to-neutral-600';
  };

  const getRoleLabel = (roles?: string[]) => {
    if (!roles || roles.length === 0) return 'Usuário';
    if (roles.includes('DIRETOR')) return 'Diretor';
    if (roles.includes('GERENTE')) return 'Gerente';
    return 'Visualizador';
  };

  const getPageTitle = () => {
    const routes = {
      '/admin': 'Painel Administrativo',
      '/admin/parameters': 'Gerenciar Metas',
      '/admin/expurgos': 'Gestão de Expurgos',
      '/admin/users': 'Gerenciar Usuários',
      '/admin/vigencias': 'Vigências',
      '/admin/audit-logs': 'Logs de Auditoria',
      '/admin/scheduling': 'Agendamentos',
    };

    return routes[pathname as keyof typeof routes] || 'Administração';
  };

  const currentPeriod = new Date().toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <header className='sticky top-0 z-40 w-full bg-gradient-to-r from-neutral-800 via-neutral-700 to-neutral-800 border-b border-amber-500/20 shadow-lg shadow-amber-500/5'>
      <div className='flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8'>
        {/* Lado Esquerdo: Logo + Título da Página */}
        <div className='flex items-center space-x-4'>
          {/* Logo da Empresa */}
          <Link
            href='/'
            className='flex items-center space-x-3 hover:opacity-80 transition-opacity'
          >
            <div className='relative bg'>
              <Image
                src='/logo.png'
                alt='Logo da Empresa'
                width={120}
                height={32}
                className='h-12 w-auto' // Logo branca no header escuro
                priority
              />
              {/* Indicador de versão admin mais sutil */}
              <div className='absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full animate-pulse' />
            </div>
          </Link>

          {/* Separador mais sutil */}
          <div className='h-6 w-px bg-amber-500/30' />

          {/* Título da página atual */}
          <div>
            <h1 className='text-lg font-bold text-white'>{getPageTitle()}</h1>
            <p className='text-xs text-amber-200'>
              Vigência:{' '}
              {currentPeriod.charAt(0).toUpperCase() + currentPeriod.slice(1)}
            </p>
          </div>
        </div>

        {/* Centro: Espaço flexível */}
        <div className='flex-1' />

        {/* Lado Direito: Ações e usuário */}
        <div className='flex items-center space-x-3'>
          {/* Status do sistema mais sutil */}
          <div className='hidden sm:flex items-center space-x-2 px-3 py-1.5 bg-amber-500/10 border border-amber-400/20 rounded-full'>
            <div className='w-2 h-2 bg-amber-400 rounded-full animate-pulse' />
            <span className='text-xs font-medium text-amber-200'>Online</span>
          </div>

          {/* Notificações com hover mais sutil */}
          {/* <Button
            variant='ghost'
            size='sm'
            className='relative text-neutral-300 hover:text-amber-200 hover:bg-amber-500/5'
          >
            <Bell className='h-4 w-4' />
            {notifications > 0 && (
              <div className='absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-neutral-900 text-xs rounded-full flex items-center justify-center font-bold'>
                {notifications > 9 ? '9+' : notifications}
              </div>
            )}
          </Button> */}

          {/* Ajuda com hover mais sutil */}
          <Button
            variant='ghost'
            size='sm'
            className='text-neutral-300 hover:text-amber-200 hover:bg-amber-500/5'
          >
            <HelpCircle className='h-4 w-4' />
          </Button>

          {/* Menu do usuário com hover mais sutil */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                className='flex cursor-pointer items-center space-x-3 px-3 py-2 hover:bg-amber-500/5 hover:border hover:border-amber-500/20 text-white rounded-lg transition-all'
              >
                <Avatar className='h-8 w-8 ring-2 ring-amber-400/30'>
                  <AvatarFallback
                    className={cn(
                      'text-white font-bold text-sm',
                      getRoleColor(user?.roles)
                    )}
                  >
                    {getUserInitials(user?.nome)}
                  </AvatarFallback>
                </Avatar>

                <div className='hidden sm:block text-left'>
                  <p className='text-sm font-medium text-white truncate max-w-32'>
                    {user?.nome || 'Usuário'}
                  </p>
                  <p className='text-xs text-amber-200'>
                    {getRoleLabel(user?.roles)}
                  </p>
                </div>

                <ChevronDown className='h-4 w-4 text-amber-200' />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align='end' className='w-64'>
              {/* Header do menu */}
              <DropdownMenuLabel className='pb-2'>
                <div className='flex items-center space-x-3'>
                  <Avatar className='h-10 w-10'>
                    <AvatarFallback
                      className={cn(
                        'text-white font-bold',
                        getRoleColor(user?.roles)
                      )}
                    >
                      {getUserInitials(user?.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className='font-medium'>{user?.nome}</p>
                    <p className='text-xs text-neutral-500'>{user?.email}</p>
                    <p className='text-xs font-medium text-amber-600'>
                      {getRoleLabel(user?.roles)}
                    </p>
                  </div>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              {/* Perfil pessoal */}
              {/* <DropdownMenuItem asChild>
                <Link href='/profile' className='cursor-pointer'>
                  <User className='mr-3 h-4 w-4' />
                  Meu Perfil
                </Link>
              </DropdownMenuItem> */}

              {/* Link para página pública */}
              <DropdownMenuItem asChild>
                <Link href='/' className='cursor-pointer'>
                  <Monitor className='mr-3 h-4 w-4' />
                  Ver Ranking Público
                </Link>
              </DropdownMenuItem>

              {/* Feedback */}
              <DropdownMenuItem>
                <MessageSquare className='mr-3 h-4 w-4' />
                Enviar Feedback
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Logout */}
              <DropdownMenuItem
                onClick={handleLogout}
                className='cursor-pointer text-red-600 focus:text-red-600'
              >
                <LogOut className='mr-3 h-4 w-4' />
                Sair do Sistema
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
