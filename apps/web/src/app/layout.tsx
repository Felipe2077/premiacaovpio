// apps/web/src/app/layout.tsx (CORRIGIDO - COM QUERY CLIENT)
import { AuthProvider } from '@/components/providers/AuthProvider';
import { QueryClientProvider } from '@/components/providers/QueryClientProvider';
import { Toaster } from '@/components/ui/sonner';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sistema de Premiação - Via Carmo',
  description: 'Sistema de gestão de premiação para colaboradores',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='pt-BR'>
      <body className={inter.className}>
        {/* QueryClientProvider deve estar fora do AuthProvider */}
        <QueryClientProvider>
          {/* AuthProvider pode usar queries dentro do QueryClientProvider */}
          <AuthProvider>
            {children}

            {/* Toaster para notificações globais */}
            <Toaster
              position='top-right'
              richColors
              expand={false}
              duration={4000}
            />
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
