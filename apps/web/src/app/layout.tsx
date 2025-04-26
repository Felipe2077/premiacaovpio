// apps/web/src/app/layout.tsx (ATUALIZADO)
import Providers from '@/components/Providers';
import { Header } from '@/components/layout/Header';
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
    <html lang='pt-BR'>
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <Header />
        {/* Conteúdo principal da página */}
        <main className='flex-grow container mx-auto p-4 lg:p-6'>
          <Providers>{children}</Providers>
        </main>
        {/* Footer simples */}
        <footer className='bg-gray-200 text-center p-2 text-sm text-gray-600 mt-auto'>
          Sistema de Premiação - MVP V1.7 - {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
