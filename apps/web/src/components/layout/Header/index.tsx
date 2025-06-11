// apps/web/src/components/layout/Header.tsx (ATUALIZADO)
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
import {
  BarChart3,
  Calendar,
  ChevronDown,
  FileText,
  LogOut,
  Settings,
  Shield,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export function Header() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const {
    canAccessAdminArea,
    canManageUsers,
    canManageParameters,
    isDirector,
  } = useComponentAccess();

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

  const getRoleLabel = (roles?: string[]) => {
    if (!roles || roles.length === 0) return 'Usuário';
    if (roles.includes('DIRETOR')) return 'Diretor';
    if (roles.includes('GERENTE')) return 'Gerente';
    return 'Visualizador';
  };

  return (
    <header className='bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50'>
      <div className='mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          {/* Logo e Título */}
          <div className='flex items-center space-x-4'>
            <Link
              href='/'
              className='flex items-center space-x-3 hover:opacity-80 transition-opacity'
            >
              <div className='bg-blue-600 p-2 rounded-lg'>
                <BarChart3 className='h-6 w-6 text-white' />
              </div>
              <div className='hidden sm:block'>
                <h1 className='text-xl font-bold text-gray-900'>
                  Sistema de Premiação
                </h1>
                <p className='text-xs text-gray-500'>
                  Gestão de Performance de Filiais
                </p>
              </div>
            </Link>
          </div>

          {/* Navegação Central */}
          <nav className='hidden md:flex items-center space-x-8'>
            <Link
              href='/'
              className='text-gray-700 hover:text-blue-600 transition-colors font-medium'
            >
              Ranking
            </Link>

            {/* Link para área administrativa (apenas se tiver acesso) */}
            {isAuthenticated && canAccessAdminArea() && (
              <Link
                href='/admin'
                className='text-gray-700 hover:text-blue-600 transition-colors font-medium'
              >
                Administração
              </Link>
            )}
          </nav>

          {/* Área do Usuário */}
          <div className='flex items-center space-x-4'>
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    className='flex items-center space-x-2 hover:bg-gray-100'
                  >
                    <Avatar className='h-8 w-8'>
                      <AvatarFallback className='bg-blue-600 text-white text-sm'>
                        {getUserInitials(user.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className='hidden sm:block text-left'>
                      <p className='text-sm font-medium text-gray-900'>
                        {user.nome}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {getRoleLabel(user.roles)}
                      </p>
                    </div>
                    <ChevronDown className='h-4 w-4 text-gray-400' />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align='end' className='w-56'>
                  <DropdownMenuLabel>
                    <div className='flex flex-col space-y-1'>
                      <p className='text-sm font-medium'>{user.nome}</p>
                      <p className='text-xs text-gray-500'>{user.email}</p>
                      <p className='text-xs text-blue-600 font-medium'>
                        {getRoleLabel(user.roles)}
                      </p>
                    </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  {/* Itens do menu baseados em permissões */}
                  {canAccessAdminArea() && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href='/admin' className='cursor-pointer'>
                          <Settings className='mr-2 h-4 w-4' />
                          Painel Administrativo
                        </Link>
                      </DropdownMenuItem>

                      {canManageUsers() && (
                        <DropdownMenuItem asChild>
                          <Link href='/admin/users' className='cursor-pointer'>
                            <Users className='mr-2 h-4 w-4' />
                            Gerenciar Usuários
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {canManageParameters() && (
                        <DropdownMenuItem asChild>
                          <Link
                            href='/admin/parameters'
                            className='cursor-pointer'
                          >
                            <FileText className='mr-2 h-4 w-4' />
                            Gerenciar Metas
                          </Link>
                        </DropdownMenuItem>
                      )}

                      {isDirector() && (
                        <DropdownMenuItem asChild>
                          <Link
                            href='/admin/periods'
                            className='cursor-pointer'
                          >
                            <Calendar className='mr-2 h-4 w-4' />
                            Gerenciar Períodos
                          </Link>
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />
                    </>
                  )}

                  {/* Perfil do usuário */}
                  <DropdownMenuItem asChild>
                    <Link href='/profile' className='cursor-pointer'>
                      <User className='mr-2 h-4 w-4' />
                      Meu Perfil
                    </Link>
                  </DropdownMenuItem>

                  {/* Logs de auditoria (apenas para diretores) */}
                  {isDirector() && (
                    <DropdownMenuItem asChild>
                      <Link href='/admin/audit' className='cursor-pointer'>
                        <Shield className='mr-2 h-4 w-4' />
                        Logs de Auditoria
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator />

                  {/* Logout */}
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className='cursor-pointer text-red-600 focus:text-red-600'
                  >
                    <LogOut className='mr-2 h-4 w-4' />
                    Sair do Sistema
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              // Botão de login para usuários não autenticados
              <div className='flex items-center space-x-2'>
                <Button asChild variant='outline' size='sm'>
                  <Link href='/login'>
                    <User className='mr-2 h-4 w-4' />
                    Entrar
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
