// apps/web/src/components/auth/ProtectedRoute.tsx
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Permission, Role } from '@sistema-premiacao/shared-types';
import { AlertTriangle, Loader2, Shield } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  permissions?: Permission[];
  roles?: Role[];
  requireAll?: boolean; // Se true, precisa de TODAS as permissões/roles. Se false, basta uma.
  fallback?: ReactNode;
  redirectTo?: string;
  showLoadingSpinner?: boolean;
}

export function ProtectedRoute({
  children,
  permissions = [],
  roles = [],
  requireAll = false,
  fallback,
  redirectTo = '/login',
  showLoadingSpinner = true,
}: ProtectedRouteProps) {
  const router = useRouter();
  const {
    isAuthenticated,
    isLoading,
    user,
    hasPermission,
    hasAnyPermission,
    hasRole,
  } = useAuth();

  // Redirecionar para login se não estiver autenticado
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  // Estado de loading
  if (isLoading) {
    if (!showLoadingSpinner) return null;

    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='flex flex-col items-center space-y-4'>
          <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
          <p className='text-sm text-gray-600'>Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Não autenticado
  if (!isAuthenticated) {
    return null; // Vai redirecionar via useEffect
  }

  // Verificar permissões se especificadas
  if (permissions.length > 0) {
    let hasRequiredPermissions: boolean;

    if (requireAll) {
      // Precisa de TODAS as permissões
      hasRequiredPermissions = permissions.every((permission) =>
        hasPermission(permission)
      );
    } else {
      // Precisa de PELO MENOS UMA permissão
      hasRequiredPermissions = hasAnyPermission(permissions);
    }

    if (!hasRequiredPermissions) {
      return (
        fallback || (
          <AccessDeniedFallback
            type='permission'
            required={permissions}
            user={user}
            requireAll={requireAll}
          />
        )
      );
    }
  }

  // Verificar roles se especificados
  if (roles.length > 0) {
    let hasRequiredRoles: boolean;

    if (requireAll) {
      // Precisa de TODOS os roles
      hasRequiredRoles = roles.every((role) => hasRole(role));
    } else {
      // Precisa de PELO MENOS UM role
      hasRequiredRoles = roles.some((role) => hasRole(role));
    }

    if (!hasRequiredRoles) {
      return (
        fallback || (
          <AccessDeniedFallback
            type='role'
            required={roles}
            user={user}
            requireAll={requireAll}
          />
        )
      );
    }
  }

  // Todas as verificações passaram
  return <>{children}</>;
}

// Componente de fallback para acesso negado
interface AccessDeniedFallbackProps {
  type: 'permission' | 'role';
  required: (Permission | Role)[];
  user: any;
  requireAll: boolean;
}

function AccessDeniedFallback({
  type,
  required,
  user,
  requireAll,
}: AccessDeniedFallbackProps) {
  const router = useRouter();

  const getTypeLabel = () => {
    return type === 'permission' ? 'permissões' : 'papéis';
  };

  const getRequiredText = () => {
    const typeLabel = getTypeLabel();
    const joinWord = requireAll ? ' e ' : ' ou ';
    return `${required.join(joinWord)} ${requireAll ? '(todas)' : '(pelo menos uma)'}`;
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 p-4'>
      <Card className='w-full max-w-md'>
        <CardHeader className='text-center'>
          <div className='flex justify-center mb-4'>
            <div className='bg-red-100 p-3 rounded-full'>
              <Shield className='h-6 w-6 text-red-600' />
            </div>
          </div>
          <CardTitle className='text-xl font-semibold text-gray-900'>
            Acesso Negado
          </CardTitle>
          <CardDescription className='text-gray-600'>
            Você não possui as {getTypeLabel()} necessárias para acessar esta
            área.
          </CardDescription>
        </CardHeader>

        <CardContent className='space-y-4'>
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
            <div className='flex items-start space-x-3'>
              <AlertTriangle className='h-5 w-5 text-yellow-600 mt-0.5' />
              <div className='flex-1'>
                <h4 className='text-sm font-medium text-yellow-800'>
                  {getTypeLabel().charAt(0).toUpperCase() +
                    getTypeLabel().slice(1)}{' '}
                  necessárias:
                </h4>
                <p className='text-sm text-yellow-700 mt-1'>
                  {getRequiredText()}
                </p>
              </div>
            </div>
          </div>

          <div className='bg-gray-50 border border-gray-200 rounded-lg p-4'>
            <h4 className='text-sm font-medium text-gray-800 mb-2'>
              Suas {getTypeLabel()} atuais:
            </h4>
            <div className='text-sm text-gray-600'>
              {type === 'permission' ? (
                <p>
                  {user?.permissions?.length > 0
                    ? user.permissions.join(', ')
                    : 'Nenhuma permissão'}
                </p>
              ) : (
                <p>
                  {user?.roles?.length > 0
                    ? user.roles.join(', ')
                    : 'Nenhum papel'}
                </p>
              )}
            </div>
          </div>

          <div className='flex flex-col space-y-2'>
            <Button
              onClick={() => router.back()}
              variant='outline'
              className='w-full'
            >
              Voltar
            </Button>
            <Button onClick={() => router.push('/')} className='w-full'>
              Ir para Início
            </Button>
          </div>

          <div className='text-center'>
            <p className='text-xs text-gray-500'>
              Se você acredita que deveria ter acesso a esta área, entre em
              contato com o administrador do sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook personalizado para verificar acesso a componentes específicos
export function useComponentAccess() {
  const { hasPermission, hasAnyPermission, hasRole } = useAuth();

  return {
    // Verificações de acesso rápidas
    canManageUsers: () => hasPermission(Permission.MANAGE_USERS),
    canManageParameters: () => hasPermission(Permission.MANAGE_PARAMETERS),
    canApproveExpurgos: () => hasPermission(Permission.APPROVE_EXPURGOS),
    canViewReports: () => hasPermission(Permission.VIEW_REPORTS),
    canClosePeriods: () => hasPermission(Permission.CLOSE_PERIODS),
    canViewParameters: () =>
      hasPermission(Permission.VIEW_PARAMETERS) ||
      hasPermission(Permission.MANAGE_PARAMETERS),

    // Verificações de role
    isDirector: () => hasRole(Role.DIRETOR),
    isManager: () => hasRole(Role.GERENTE),
    isViewer: () => hasRole(Role.VISUALIZADOR),

    // Verificações compostas
    isAdminUser: () => hasRole(Role.DIRETOR),
    canAccessAdminArea: () =>
      hasAnyPermission([
        Permission.MANAGE_USERS,
        Permission.MANAGE_PARAMETERS,
        Permission.APPROVE_EXPURGOS,
        Permission.VIEW_REPORTS,
        Permission.VIEW_PARAMETERS,
      ]),
  };
}
