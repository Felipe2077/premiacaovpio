// apps/web/src/components/providers/QueryClientProvider.tsx
'use client';

import {
  QueryClient,
  QueryClientProvider as TanStackQueryClientProvider,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';

interface QueryClientProviderProps {
  children: ReactNode;
}

export function QueryClientProvider({ children }: QueryClientProviderProps) {
  // Criar QueryClient com configurações otimizadas
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Tempo que os dados ficam "fresh" (não refaz a query)
            staleTime: 5 * 60 * 1000, // 5 minutos
            // Tempo que os dados ficam no cache
            gcTime: 10 * 60 * 1000, // 10 minutos (era cacheTime)
            // Retry automático em caso de erro
            retry: (failureCount, error: any) => {
              // Não retry em erros 401, 403, 404
              if (
                error?.status === 401 ||
                error?.status === 403 ||
                error?.status === 404
              ) {
                return false;
              }
              // Máximo 2 retries para outros erros
              return failureCount < 2;
            },
            // Refetch quando a janela volta ao foco
            refetchOnWindowFocus: false,
            // Refetch quando reconecta à internet
            refetchOnReconnect: true,
          },
          mutations: {
            // Retry automático para mutations em caso de erro de rede
            retry: (failureCount, error: any) => {
              // Não retry em erros de validação (400, 409, 422)
              if (error?.status >= 400 && error?.status < 500) {
                return false;
              }
              // Retry apenas 1x para erros de servidor
              return failureCount < 1;
            },
          },
        },
      })
  );

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}

      {/* DevTools apenas em desenvolvimento */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position='bottom-right' />
      )}
    </TanStackQueryClientProvider>
  );
}
