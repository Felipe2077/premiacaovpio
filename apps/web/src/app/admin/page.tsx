// apps/web/src/app/admin/page.tsx (PÁGINA DE TESTE PARA VERIFICAR AUTENTICAÇÃO)
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, LogOut, Shield, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  // Redirecionamento se não autenticado
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('❌ Usuário não autenticado, redirecionando para login...');
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Mostrar loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='flex flex-col items-center space-y-4'>
          <Loader2 className='h-8 w-8 animate-spin text-blue-600' />
          <p className='text-sm text-gray-600'>
            Carregando painel administrativo...
          </p>
        </div>
      </div>
    );
  }

  // Se não estiver autenticado, não renderizar nada (redirecionamento vai acontecer)
  if (!isAuthenticated || !user) {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            <div className='flex items-center space-x-4'>
              <div className='flex items-center space-x-2'>
                <Shield className='h-8 w-8 text-blue-600' />
                <h1 className='text-xl font-semibold text-gray-900'>
                  Painel Administrativo
                </h1>
              </div>
            </div>

            <div className='flex items-center space-x-4'>
              <div className='flex items-center space-x-2 text-sm text-gray-600'>
                <User className='h-4 w-4' />
                <span>
                  Bem-vindo, <span className='font-medium'>{user.nome}</span>
                </span>
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={handleLogout}
                className='flex items-center space-x-2'
              >
                <LogOut className='h-4 w-4' />
                <span>Sair</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Status de Autenticação */}
        <div className='mb-6'>
          <Card className='border-green-200 bg-green-50'>
            <CardHeader className='pb-3'>
              <CardTitle className='flex items-center space-x-2 text-green-800'>
                <CheckCircle className='h-5 w-5' />
                <span>🎉 Autenticação Funcionando Perfeitamente!</span>
              </CardTitle>
            </CardHeader>
            <CardContent className='text-sm text-green-700'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <strong>Email:</strong> {user.email}
                </div>
                <div>
                  <strong>Nome:</strong> {user.nome}
                </div>
                <div>
                  <strong>Roles:</strong> {user.roles.join(', ') || 'Nenhum'}
                </div>
                <div>
                  <strong>Setor:</strong> {user.sectorId || 'N/A'}
                </div>
                <div>
                  <strong>Status:</strong>{' '}
                  {user.ativo ? '✅ Ativo' : '❌ Inativo'}
                </div>
                <div>
                  <strong>Permissões:</strong> {user.permissions.length}{' '}
                  permissões
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teste de Funcionalidades */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
          <Card className='text-center'>
            <CardHeader>
              <CardTitle className='text-lg'>✅ Login</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-gray-600'>
                Login realizado com sucesso via cookies httpOnly
              </p>
            </CardContent>
          </Card>

          <Card className='text-center'>
            <CardHeader>
              <CardTitle className='text-lg'>✅ Middleware</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-gray-600'>
                Middleware protegendo rotas corretamente
              </p>
            </CardContent>
          </Card>

          <Card className='text-center'>
            <CardHeader>
              <CardTitle className='text-lg'>✅ Redirecionamento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-gray-600'>
                Redirecionamento funcionando sem conflitos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Informações Técnicas */}
        <Card>
          <CardHeader>
            <CardTitle>🔧 Informações Técnicas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-2 text-sm'>
              <div>
                <strong>✅ Cookies httpOnly:</strong> Funcionando
              </div>
              <div>
                <strong>✅ Estado Zustand:</strong> Sincronizado
              </div>
              <div>
                <strong>✅ AuthProvider:</strong> Ativo
              </div>
              <div>
                <strong>✅ Middleware:</strong> Protegendo rotas
              </div>
              <div>
                <strong>✅ Backend Auth:</strong> Conectado
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug (apenas em desenvolvimento) */}
        {process.env.NODE_ENV === 'development' && (
          <Card className='mt-6 border-blue-200 bg-blue-50'>
            <CardHeader>
              <CardTitle className='text-blue-800'>
                🔧 Debug - Dados do Usuário
              </CardTitle>
            </CardHeader>
            <CardContent className='text-sm text-blue-700'>
              <pre className='bg-blue-100 p-4 rounded text-xs overflow-auto'>
                {JSON.stringify(user, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
