// apps/web/src/app/layout.tsx
import Providers from '@/components/Providers'; // Usando o alias '@/'
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Caminho relativo padrão do create-next-app

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
      <body className={inter.className}>
        <Providers>{children}</Providers> {/* <-- Provider aqui! */}
      </body>
    </html>
  );
}
