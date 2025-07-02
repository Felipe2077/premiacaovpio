// apps/web/src/app/admin/users/page.tsx
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { UserFilters } from '@/components/users/UserFilters';
import { UserStatisticsCards } from '@/components/users/UserStatisticsCards';
import { UserTable } from '@/components/users/UserTable';
import { useUsersData, useUserStatistics } from '@/hooks/useUsersData';
import { Permission } from '@sistema-premiacao/shared-types';
import { Activity, AlertTriangle, Plus, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export default function UsersPage() {
  const [filters, setFilters] = useState<{
    page?: number;
    limit?: number;
    active?: boolean;
    role?: string;
    sectorId?: number;
    search?: string;
  }>({
    page: 1,
    limit: 20,
  });

  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
    refetch: refetchUsers,
  } = useUsersData(filters);

  const {
    data: statistics,
    isLoading: isLoadingStats,
    error: statsError,
  } = useUserStatistics();

  const handleFiltersChange = (newFilters: any) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset para primeira página quando filtros mudam
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

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
            Você não tem permissão para gerenciar usuários. Esta área é restrita
            para diretores.
          </p>
        </div>
      }
    >
      <div className='space-y-6'>
        {/* Header da página */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 flex items-center gap-2'>
              <Users className='h-6 w-6' />
              Gerenciamento de Usuários
            </h1>
            <p className='text-gray-600 mt-1'>
              Gerencie usuários, permissões e acessos do sistema
            </p>
          </div>

          <Link href='/admin/users/new'>
            <Button size='lg' className='w-full sm:w-auto'>
              <Plus className='h-4 w-4 mr-2' />
              Novo Usuário
            </Button>
          </Link>
        </div>

        {/* Cards de estatísticas */}
        <UserStatisticsCards
          statistics={statistics}
          isLoading={isLoadingStats}
          error={statsError}
        />

        {/* Alertas importantes */}
        {statistics && statistics.lockedUsers > 0 && (
          <Card className='border-orange-200 bg-orange-50'>
            <CardHeader className='pb-3'>
              <div className='flex items-center gap-2'>
                <AlertTriangle className='h-5 w-5 text-orange-600' />
                <CardTitle className='text-orange-900'>
                  Atenção: Usuários Bloqueados
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className='text-orange-800'>
                Existem {statistics.lockedUsers} usuário(s) bloqueado(s) no
                sistema. Verifique a lista abaixo para desbloquear se
                necessário.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Filtros e tabela principal */}
        <Card>
          <CardHeader>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
              <div>
                <CardTitle>Lista de Usuários</CardTitle>
                <CardDescription>
                  {usersData?.total
                    ? `${usersData.total} usuário(s) encontrado(s)`
                    : 'Carregando...'}
                </CardDescription>
              </div>

              <div className='flex items-center gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => refetchUsers()}
                  disabled={isLoadingUsers}
                >
                  <Activity className='h-4 w-4 mr-2' />
                  Atualizar
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className='space-y-4'>
            {/* Filtros */}
            <UserFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              isLoading={isLoadingUsers}
            />

            {/* Tabela de usuários */}
            <UserTable
              data={usersData?.data || []}
              total={usersData?.total || 0}
              page={filters.page || 1}
              limit={filters.limit || 20}
              isLoading={isLoadingUsers}
              error={usersError}
              onPageChange={handlePageChange}
              onRefresh={refetchUsers}
            />
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
