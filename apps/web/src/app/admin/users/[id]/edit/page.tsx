// apps/web/src/app/admin/users/[id]/edit/page.tsx
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Skeleton } from '@/components/ui/skeleton';
import { UserForm } from '@/components/users/UserForm';
import { useUpdateUser, useUserById } from '@/hooks/useUsersData';
import { Permission } from '@sistema-premiacao/shared-types';
import { ArrowLeft, Edit, Shield, User } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function EditUserPage() {
  const params = useParams();
  const userId = parseInt(params.id as string);

  const { data: user, isLoading, error } = useUserById(userId);
  const updateUserMutation = useUpdateUser();

  const handleUpdateUser = async (userData: any) => {
    await updateUserMutation.mutateAsync({
      id: userId,
      data: userData,
    });
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
        <div className='max-w-2xl mx-auto'>
          <div className='border rounded-lg p-6'>
            <div className='space-y-6'>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className='space-y-2'>
                  <Skeleton className='h-4 w-24' />
                  <Skeleton className='h-10 w-full' />
                </div>
              ))}
            </div>
          </div>
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
            'O usuário solicitado não foi encontrado ou você não tem permissão para editá-lo.'}
        </p>
        <Link href='/admin/users'>
          <button className='inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50'>
            <ArrowLeft className='h-4 w-4' />
            Voltar para lista
          </button>
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
            Você não tem permissão para editar usuários. Esta área é restrita
            para diretores.
          </p>
        </div>
      }
    >
      <div className='space-y-6'>
        {/* Header da página */}
        <div className='flex items-center gap-4'>
          <Link
            href={`/admin/users/${user.id}`}
            className='inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors'
          >
            <ArrowLeft className='h-4 w-4' />
            Voltar para detalhes do usuário
          </Link>
        </div>

        <div className='flex items-center gap-3'>
          <div className='bg-blue-100 p-2 rounded-lg'>
            <Edit className='h-6 w-6 text-blue-600' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>Editar Usuário</h1>
            <p className='text-gray-600 mt-1'>
              Atualize as informações de{' '}
              <span className='font-medium'>{user.nome}</span>
            </p>
          </div>
        </div>

        {/* Formulário */}
        <UserForm
          user={user}
          isEditing={true}
          onSubmit={handleUpdateUser}
          isLoading={updateUserMutation.isPending}
        />
      </div>
    </ProtectedRoute>
  );
}
