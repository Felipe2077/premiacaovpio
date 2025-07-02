// apps/web/src/app/admin/users/new/page.tsx
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { UserForm } from '@/components/users/UserForm';
import { useCreateUser } from '@/hooks/useUsersData';
import { Permission } from '@sistema-premiacao/shared-types';
import { ArrowLeft, Shield, UserPlus } from 'lucide-react';
import Link from 'next/link';

export default function NewUserPage() {
  const createUserMutation = useCreateUser();

  const handleCreateUser = async (userData: any) => {
    await createUserMutation.mutateAsync(userData);
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
            Você não tem permissão para criar usuários. Esta área é restrita
            para diretores.
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

        <div className='flex items-center gap-3'>
          <div className='bg-blue-100 p-2 rounded-lg'>
            <UserPlus className='h-6 w-6 text-blue-600' />
          </div>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>
              Criar Novo Usuário
            </h1>
            <p className='text-gray-600 mt-1'>
              Adicione um novo usuário ao sistema com as permissões adequadas
            </p>
          </div>
        </div>

        {/* Formulário */}
        <UserForm
          onSubmit={handleCreateUser}
          isLoading={createUserMutation.isPending}
        />
      </div>
    </ProtectedRoute>
  );
}
