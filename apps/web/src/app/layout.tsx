// apps/web/src/app/layout.tsx
import Providers from '@/components/Providers';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css'; // Importa Tailwind/CSS Global

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
        <Providers>{children}</Providers> {/* Envolve com o Provider */}
      </body>
    </html>
  );
}
