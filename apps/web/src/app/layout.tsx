// apps/web/src/app/layout.tsx (CORRIGIDO - HIDRATAÇÃO)
import Providers from '@/components/Providers';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Premiação Filiais',
  description: 'Acompanhamento da Premiação',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='pt-BR' suppressHydrationWarning>
      <body
        className={`${inter.className} flex flex-col min-h-screen`}
        suppressHydrationWarning
      >
        {/* Header simples sem auth por enquanto */}
        <header className='bg-white shadow-sm border-b border-gray-200'>
          <div className='mx-auto px-4 sm:px-6 lg:px-8'>
            <div className='flex justify-between items-center h-16'>
              <h1 className='text-xl font-bold text-gray-900'>
                Sistema de Premiação
              </h1>
              <a
                href='/login'
                className='bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700'
              >
                Entrar
              </a>
            </div>
          </div>
        </header>

        {/* Providers englobam apenas o conteúdo */}
        <main className='flex-grow w-full'>
          <Providers>{children}</Providers>
        </main>

        {/* Footer simples */}
        <footer className='bg-gray-100 text-center p-2 text-sm text-gray-600'>
          Sistema de Premiação - MVP V1.7 - {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
