// apps/web/src/components/auth/AuthInitializer.tsx
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { Loader2 } from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';

interface AuthInitializerProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthInitializer({ children, fallback }: AuthInitializerProps) {
  const { checkAuth, isLoading } = useAuth();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Erro ao inicializar auth:', error);
      } finally {
        setHasInitialized(true);
      }
    };

    if (!hasInitialized) {
      initialize();
    }
  }, [checkAuth, hasInitialized]);

  // Mostrar loading enquanto verifica a autenticação
  if (isLoading || !hasInitialized) {
    return (
      fallback || (
        <div className='min-h-screen flex items-center justify-center bg-gray-50'>
          <div className='flex flex-col items-center space-y-4'>
            <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
            <p className='text-sm text-gray-600'>Inicializando sistema...</p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}
