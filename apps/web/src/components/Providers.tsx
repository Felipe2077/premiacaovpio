// apps/web/src/components/Providers.tsx (SIMPLIFICADO)
'use client';

import { Toaster } from '@/components/ui/sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { AuthProvider } from './providers/AuthProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  // Criar QueryClient instance
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // 5 minutos
            gcTime: 1000 * 60 * 10, // 10 minutos (anteriormente cacheTime)
            retry: (failureCount, error: any) => {
              // Não tentar novamente em casos de erro 4xx (exceto 408 Timeout)
              if (
                error?.status >= 400 &&
                error?.status < 500 &&
                error?.status !== 408
              ) {
                return false;
              }
              return failureCount < 3;
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute='class'
        defaultTheme='light'
        enableSystem={false}
        disableTransitionOnChange
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}

          {/* Toast notifications */}
          <Toaster
            position='top-center'
            richColors
            closeButton
            duration={4000}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
