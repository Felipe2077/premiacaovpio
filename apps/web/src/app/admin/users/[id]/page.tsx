// apps/web/src/app/admin/users/[id]/page.tsx
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useResetUserPassword,
  useToggleUserStatus,
  useUnlockUser,
  useUserById,
} from '@/hooks/useUsersData';
import { Permission, Role } from '@sistema-premiacao/shared-types';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Edit,
  Key,
  Mail,
  MapPin,
  Shield,
  Unlock,
  User,
  UserCheck,
  UserX,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';

export default function UserDetailPage() {
  const params = useParams();
  const userId = parseInt(params.id as string);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: user, isLoading, error, refetch } = useUserById(userId);
  const toggleStatusMutation = useToggleUserStatus();
  const unlockUserMutation = useUnlockUser();
  const resetPasswordMutation = useResetUserPassword();

  const handleToggleStatus = async () => {
    if (!user || actionLoading) return;

    const confirmMessage = user.ativo
      ? `Tem certeza que deseja DESATIVAR o usuário ${user.nome}?\n\nO usuário não conseguirá mais fazer login no sistema.`
      : `Tem certeza que deseja ATIVAR o usuário ${user.nome}?\n\nO usuário poderá fazer login no sistema novamente.`;

    if (!window.confirm(confirmMessage)) return;

    setActionLoading(true);
    try {
      await toggleStatusMutation.mutateAsync({
        id: user.id,
        data: {
          ativo: !user.ativo,
          justification: `${user.ativo ? 'Desativação' : 'Ativação'} via página de detalhes`,
        },
      });
      refetch();
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlockUser = async () => {
    if (!user || actionLoading) return;

    if (
      !window.confirm(
        `Tem certeza que deseja desbloquear o usuário ${user.nome}?`
      )
    )
      return;

    setActionLoading(true);
    try {
      await unlockUserMutation.mutateAsync({
        id: user.id,
        data: {
          justification: 'Desbloqueio via página de detalhes',
          resetLoginAttempts: true,
        },
      });
      refetch();
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user || actionLoading) return;

    const confirmMessage = `Tem certeza que deseja resetar a senha de ${user.nome}?\n\nUma nova senha temporária será gerada e você precisará informá-la ao usuário.`;

    if (!window.confirm(confirmMessage)) return;

    setActionLoading(true);
    try {
      await resetPasswordMutation.mutateAsync({
        id: user.id,
        data: {
          justification: 'Reset de senha via página de detalhes',
          forceChangeOnLogin: true,
          notifyUser: false,
        },
      });
    } finally {
      setActionLoading(false);
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

  const getStatusBadge = () => {
    if (!user) return null;

    if (user.isLocked) {
      return (
        <Badge variant='destructive' className='flex items-center gap-1'>
          <Shield className='h-3 w-3' />
          Conta Bloqueada
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
          Conta Inativa
        </Badge>
      );
    }

    return (
      <Badge
        variant='outline'
        className='border-green-200 text-green-800 flex items-center gap-1'
      >
        <UserCheck className='h-3 w-3' />
        Conta Ativa
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-4'>
          <Skeleton className='h-4 w-48' />
        </div>
        <div className='flex items-center gap-3'>
          <Skeleton className='h-12 w-12 rounded-lg' />
          <div className='space-y-2'>
            <Skeleton className='h-8 w-64' />
            <Skeleton className='h-4 w-96' />
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className='h-6 w-32' />
              </CardHeader>
              <CardContent>
                <Skeleton className='h-4 w-full mb-2' />
                <Skeleton className='h-4 w-3/4' />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[400px] text-center'>
        <User className='h-16 w-16 text-gray-400 mb-4' />
        <h3 className='text-lg font-semibold text-gray-900 mb-2'>
          Usuário não encontrado
        </h3>
        <p className='text-gray-600 max-w-md mb-4'>
          {error?.message ||
            'O usuário solicitado não foi encontrado ou você não tem permissão para visualizá-lo.'}
        </p>
        <Link href='/admin/users'>
          <Button variant='outline'>
            <ArrowLeft className='h-4 w-4 mr-2' />
            Voltar para lista
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ProtectedRoute
      permissions={[Permission.MANAGE_USERS]}
      fallback={
        <div className='flex flex-col items-center justify-center min-h-[400px] text-center'>
          <Shield className='h-16 w-16 text-gray-400 mb-4' />
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            Acesso Restrito
          </h3>
          <p className='text-gray-600 max-w-md'>
            Você não tem permissão para visualizar detalhes de usuários.
          </p>
        </div>
      }
    >
      <div className='space-y-6'>
        {/* Header da página */}
        <div className='flex items-center gap-4'>
          <Link
            href='/admin/users'
            className='inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors'
          >
            <ArrowLeft className='h-4 w-4' />
            Voltar para lista de usuários
          </Link>
        </div>

        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='flex items-center gap-3'>
            <div className='bg-blue-100 p-2 rounded-lg'>
              <User className='h-6 w-6 text-blue-600' />
            </div>
            <div>
              <h1 className='text-2xl font-bold text-gray-900'>{user.nome}</h1>
              <p className='text-gray-600 mt-1'>
                Detalhes e configurações do usuário
              </p>
            </div>
          </div>

          <div className='flex flex-col sm:flex-row gap-2'>
            <Link href={`/admin/users/${user.id}/edit`}>
              <Button size='sm' className='w-full sm:w-auto'>
                <Edit className='h-4 w-4 mr-2' />
                Editar
              </Button>
            </Link>
          </div>
        </div>

        {/* Cards de informações */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {/* Informações básicas */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <User className='h-5 w-5' />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div>
                <div className='text-sm font-medium text-gray-600'>Nome</div>
                <div className='text-base'>{user.nome}</div>
              </div>
              <div>
                <div className='text-sm font-medium text-gray-600'>Email</div>
                <div className='text-base flex items-center gap-2'>
                  <Mail className='h-4 w-4 text-gray-400' />
                  {user.email}
                </div>
              </div>
              <div>
                <div className='text-sm font-medium text-gray-600'>ID</div>
                <div className='text-base text-gray-500'>#{user.id}</div>
              </div>
            </CardContent>
          </Card>

          {/* Permissões e função */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Shield className='h-5 w-5' />
                Permissões e Função
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div>
                <div className='text-sm font-medium text-gray-600 mb-1'>
                  Função
                </div>
                {getRoleBadge(user.role)}
              </div>
              <div>
                <div className='text-sm font-medium text-gray-600'>Setor</div>
                <div className='text-base flex items-center gap-2'>
                  <MapPin className='h-4 w-4 text-gray-400' />
                  {user.sector?.nome || 'Nenhum setor atribuído'}
                </div>
              </div>
              <div>
                <div className='text-sm font-medium text-gray-600 mb-1'>
                  Status da Conta
                </div>
                {getStatusBadge()}
              </div>
            </CardContent>
          </Card>

          {/* Atividade e segurança */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Clock className='h-5 w-5' />
                Atividade e Segurança
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div>
                <div className='text-sm font-medium text-gray-600'>
                  Último Login
                </div>
                <div className='text-base'>
                  {user.lastLoginAt
                    ? formatDate(user.lastLoginAt)
                    : 'Nunca fez login'}
                </div>
              </div>
              <div>
                <div className='text-sm font-medium text-gray-600'>
                  Tentativas de Login
                </div>
                <div className='text-base'>
                  {user.loginAttempts}/5 tentativas
                  {user.loginAttempts >= 3 && (
                    <span className='text-orange-600 ml-2'>⚠️ Atenção</span>
                  )}
                </div>
              </div>
              {user.lockedUntil && (
                <div>
                  <div className='text-sm font-medium text-gray-600'>
                    Bloqueado até
                  </div>
                  <div className='text-base text-red-600'>
                    {formatDate(user.lockedUntil)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Datas importantes */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Calendar className='h-5 w-5' />
                Datas Importantes
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-3'>
              <div>
                <div className='text-sm font-medium text-gray-600'>
                  Criado em
                </div>
                <div className='text-base'>{formatDate(user.createdAt)}</div>
              </div>
              <div>
                <div className='text-sm font-medium text-gray-600'>
                  Última atualização
                </div>
                <div className='text-base'>{formatDate(user.updatedAt)}</div>
              </div>
              {user.activeSessions !== undefined && (
                <div>
                  <div className='text-sm font-medium text-gray-600'>
                    Sessões ativas
                  </div>
                  <div className='text-base'>
                    {user.activeSessions} sessão(ões)
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permissões detalhadas */}
          <Card className='md:col-span-2'>
            <CardHeader>
              <CardTitle>Permissões Detalhadas</CardTitle>
              <CardDescription>
                Lista completa das permissões associadas à função do usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {user.permissions.map((permission) => (
                  <Badge
                    key={permission}
                    variant='outline'
                    className='justify-start'
                  >
                    {permission
                      .replace(/_/g, ' ')
                      .toLowerCase()
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Ações rápidas */}
          <Card>
            <CardHeader>
              <CardTitle>Ações Rápidas</CardTitle>
              <CardDescription>
                Ações administrativas para este usuário
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-3'>
              {user.isLocked && (
                <Button
                  onClick={handleUnlockUser}
                  disabled={actionLoading}
                  variant='outline'
                  size='sm'
                  className='w-full justify-start'
                >
                  <Unlock className='h-4 w-4 mr-2' />
                  Desbloquear Conta
                </Button>
              )}

              <Button
                onClick={handleResetPassword}
                disabled={actionLoading}
                variant='outline'
                size='sm'
                className='w-full justify-start'
              >
                <Key className='h-4 w-4 mr-2' />
                Resetar Senha
              </Button>

              <Button
                onClick={handleToggleStatus}
                disabled={actionLoading}
                variant={user.ativo ? 'destructive' : 'default'}
                size='sm'
                className='w-full justify-start'
              >
                {user.ativo ? (
                  <>
                    <UserX className='h-4 w-4 mr-2' />
                    Desativar Conta
                  </>
                ) : (
                  <>
                    <UserCheck className='h-4 w-4 mr-2' />
                    Ativar Conta
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Atividade recente (se disponível) */}
        {user.recentActivity && user.recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>
                Últimas ações realizadas pelo usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {user.recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between py-2 border-b last:border-b-0'
                  >
                    <div>
                      <div className='font-medium'>{activity.action}</div>
                      <div className='text-sm text-gray-600'>
                        {formatDate(activity.timestamp)}
                      </div>
                    </div>
                    {activity.ipAddress && (
                      <div className='text-xs text-gray-500'>
                        IP: {activity.ipAddress}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedRoute>
  );
}
