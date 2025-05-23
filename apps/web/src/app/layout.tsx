// apps/web/src/app/layout.tsx 
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
        {/* Conteúdo principal da página - removido container fixo */}
        <main className='flex-grow w-full'>
          <Providers>{children}</Providers>
        </main>
        {/* Footer simples */}
        <footer className='bg-gray-100 text-center p-2 text-sm text-gray-600 sticky bottom-0 z-50'>
          Sistema de Premiação - MVP V1.7 - {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
