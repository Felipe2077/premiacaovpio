// apps/web/src/app/admin/users/components/UserTable.tsx
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useResetUserPassword,
  useToggleUserStatus,
  useUnlockUser,
} from '@/hooks/useUsersData';
import { Role, UserSummary } from '@sistema-premiacao/shared-types';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit,
  Eye,
  Key,
  MoreHorizontal,
  RefreshCw,
  Shield,
  Unlock,
  UserCheck,
  UserX,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface UserTableProps {
  data: UserSummary[];
  total: number;
  page: number;
  limit: number;
  isLoading: boolean;
  error?: Error | null;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

export function UserTable({
  data,
  total,
  page,
  limit,
  isLoading,
  error,
  onPageChange,
  onRefresh,
}: UserTableProps) {
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const toggleUserMutation = useToggleUserStatus();
  const unlockUserMutation = useUnlockUser();
  const resetPasswordMutation = useResetUserPassword();

  const totalPages = Math.ceil(total / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const handleToggleStatus = async (user: UserSummary) => {
    if (actionLoadingId) return;

    setActionLoadingId(user.id);
    try {
      await toggleUserMutation.mutateAsync({
        id: user.id,
        data: {
          ativo: !user.ativo,
          justification: `${user.ativo ? 'Desativação' : 'Ativação'} via interface administrativa`,
        },
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnlockUser = async (user: UserSummary) => {
    if (actionLoadingId) return;

    setActionLoadingId(user.id);
    try {
      await unlockUserMutation.mutateAsync({
        id: user.id,
        data: {
          justification: 'Desbloqueio manual via interface administrativa',
          resetLoginAttempts: true,
        },
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetPassword = async (user: UserSummary) => {
    if (actionLoadingId) return;

    const confirmReset = window.confirm(
      `Tem certeza que deseja resetar a senha de ${user.nome}?\n\nUma nova senha será gerada automaticamente.`
    );

    if (!confirmReset) return;

    setActionLoadingId(user.id);
    try {
      await resetPasswordMutation.mutateAsync({
        id: user.id,
        data: {
          justification: 'Reset de senha via interface administrativa',
          forceChangeOnLogin: true,
          notifyUser: false,
        },
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getRoleBadge = (role: Role) => {
    const roleConfig = {
      [Role.DIRETOR]: {
        label: 'Diretor',
        variant: 'default' as const,
        color: 'bg-purple-100 text-purple-800',
      },
      [Role.GERENTE]: {
        label: 'Gerente',
        variant: 'secondary' as const,
        color: 'bg-blue-100 text-blue-800',
      },
      [Role.VISUALIZADOR]: {
        label: 'Visualizador',
        variant: 'outline' as const,
        color: 'bg-gray-100 text-gray-800',
      },
    };

    const config = roleConfig[role];
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    );
  };

  const getStatusBadge = (user: UserSummary) => {
    if (user.isLocked) {
      return (
        <Badge variant='destructive' className='flex items-center gap-1'>
          <Shield className='h-3 w-3' />
          Bloqueado
        </Badge>
      );
    }

    if (!user.ativo) {
      return (
        <Badge
          variant='secondary'
          className='bg-gray-100 text-gray-800 flex items-center gap-1'
        >
          <UserX className='h-3 w-3' />
          Inativo
        </Badge>
      );
    }

    if (user.loginAttempts >= 3) {
      return (
        <Badge
          variant='outline'
          className='border-orange-200 text-orange-800 flex items-center gap-1'
        >
          <Shield className='h-3 w-3' />
          {user.loginAttempts}/5 tentativas
        </Badge>
      );
    }

    return (
      <Badge
        variant='outline'
        className='border-green-200 text-green-800 flex items-center gap-1'
      >
        <UserCheck className='h-3 w-3' />
        Ativo
      </Badge>
    );
  };

  const formatLastLogin = (lastLoginAt: string | null) => {
    if (!lastLoginAt) return 'Nunca';

    try {
      const loginDate = new Date(lastLoginAt);
      const now = new Date();
      const diffInMinutes = Math.floor(
        (now.getTime() - loginDate.getTime()) / (1000 * 60)
      );

      if (diffInMinutes < 1) return 'Agora mesmo';
      if (diffInMinutes < 60) return `${diffInMinutes}min atrás`;

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return `${diffInHours}h atrás`;

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 30) return `${diffInDays}d atrás`;

      const diffInMonths = Math.floor(diffInDays / 30);
      if (diffInMonths < 12) return `${diffInMonths}m atrás`;

      const diffInYears = Math.floor(diffInMonths / 12);
      return `${diffInYears}a atrás`;
    } catch {
      return 'Data inválida';
    }
  };

  if (error) {
    return (
      <div className='text-center py-8'>
        <div className='text-red-600 mb-4'>
          Erro ao carregar usuários: {error.message}
        </div>
        <Button onClick={onRefresh} variant='outline'>
          <RefreshCw className='h-4 w-4 mr-2' />
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Tabela */}
      <div className='border rounded-lg overflow-hidden'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Último Login</TableHead>
              <TableHead className='w-12'>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Skeleton loading
              Array.from({ length: limit }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className='space-y-2'>
                      <Skeleton className='h-4 w-40' />
                      <Skeleton className='h-3 w-48' />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-6 w-20' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-4 w-24' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-6 w-16' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-4 w-20' />
                  </TableCell>
                  <TableCell>
                    <Skeleton className='h-8 w-8' />
                  </TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='text-center py-8 text-gray-500'
                >
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className='space-y-1'>
                      <div className='font-medium'>{user.nome}</div>
                      <div className='text-sm text-gray-600'>{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadge(user.role)}</TableCell>
                  <TableCell>
                    {user.sector?.nome || (
                      <span className='text-gray-400 italic'>Sem setor</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(user)}</TableCell>
                  <TableCell>
                    <div className='flex items-center gap-1 text-sm text-gray-600'>
                      <Clock className='h-3 w-3' />
                      {formatLastLogin(user.lastLoginAt)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-8 w-8 p-0'
                        >
                          <MoreHorizontal className='h-4 w-4' />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem asChild>
                          <Link href={`/admin/users/${user.id}`}>
                            <Eye className='h-4 w-4 mr-2' />
                            Ver Detalhes
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link href={`/admin/users/${user.id}/edit`}>
                            <Edit className='h-4 w-4 mr-2' />
                            Editar
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {user.isLocked && (
                          <DropdownMenuItem
                            onClick={() => handleUnlockUser(user)}
                            disabled={actionLoadingId === user.id}
                          >
                            <Unlock className='h-4 w-4 mr-2' />
                            Desbloquear
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuItem
                          onClick={() => handleResetPassword(user)}
                          disabled={actionLoadingId === user.id}
                        >
                          <Key className='h-4 w-4 mr-2' />
                          Resetar Senha
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => handleToggleStatus(user)}
                          disabled={actionLoadingId === user.id}
                          className={
                            user.ativo ? 'text-red-600' : 'text-green-600'
                          }
                        >
                          {user.ativo ? (
                            <>
                              <UserX className='h-4 w-4 mr-2' />
                              Desativar
                            </>
                          ) : (
                            <>
                              <UserCheck className='h-4 w-4 mr-2' />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className='flex items-center justify-between'>
        <div className='text-sm text-gray-600'>
          Mostrando {data.length > 0 ? startItem : 0} a {endItem} de {total}{' '}
          usuário(s)
        </div>

        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className='h-4 w-4' />
            Anterior
          </Button>

          <div className='flex items-center gap-1'>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => onPageChange(pageNum)}
                  disabled={isLoading}
                  className='w-8 h-8 p-0'
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Próxima
            <ChevronRight className='h-4 w-4' />
          </Button>
        </div>
      </div>
    </div>
  );
}
