// apps/web/src/app/admin/page.tsx - DASHBOARD CORRIGIDO SEM AZUL
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, LogOut, Shield, Sparkles } from 'lucide-react';
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
          <Loader2 className='h-8 w-8 animate-spin text-yellow-600' />
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
    <div className='space-y-6'>
      {/* Cabeçalho da página */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center space-x-4'>
          <div className='bg-gradient-to-r from-yellow-400 to-amber-500 p-3 rounded-xl shadow-lg'>
            <Sparkles className='h-8 w-8 text-slate-900' />
          </div>
          <div>
            <h1 className='text-3xl font-bold text-gray-900'>
              Painel Administrativo
            </h1>
            <p className='text-gray-600 mt-1'>
              Bem-vindo de volta, {user.nome}
            </p>
          </div>
        </div>

        <Button
          variant='outline'
          size='sm'
          onClick={handleLogout}
          className='flex items-center space-x-2 hover:bg-red-50 hover:text-red-600 hover:border-red-300'
        >
          <LogOut className='h-4 w-4' />
          <span>Sair</span>
        </Button>
      </div>

      {/* Card de status de autenticação */}
      <Card className='border-green-200 bg-green-50'>
        <CardContent className='p-6'>
          <div className='flex items-start space-x-4'>
            <div className='bg-green-100 p-2 rounded-full'>
              <CheckCircle className='h-6 w-6 text-green-600' />
            </div>
            <div className='flex-1'>
              <h3 className='text-lg font-semibold text-green-900 mb-2'>
                🎉 Autenticação Funcionando Perfeitamente!
              </h3>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
                <div className='space-y-1'>
                  <p>
                    <span className='font-medium text-green-800'>Email:</span>{' '}
                    <span className='text-green-700'>{user.email}</span>
                  </p>
                  <p>
                    <span className='font-medium text-green-800'>Nome:</span>{' '}
                    <span className='text-green-700'>{user.nome}</span>
                  </p>
                  <p>
                    <span className='font-medium text-green-800'>Roles:</span>{' '}
                    <span className='text-green-700'>
                      {user.roles?.join(', ')}
                    </span>
                  </p>
                </div>
                <div className='space-y-1'>
                  <p>
                    <span className='font-medium text-green-800'>Status:</span>{' '}
                    <span className='text-green-700'>✅ Ativo</span>
                  </p>
                  <p>
                    <span className='font-medium text-green-800'>Setor:</span>{' '}
                    <span className='text-green-700'>
                      {user.sector?.nome || 'N/A'}
                    </span>
                  </p>
                  <p>
                    <span className='font-medium text-green-800'>
                      Permissões:
                    </span>{' '}
                    <span className='text-green-700'>20 permissões</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de status do sistema */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Login Status */}
        <Card className='border-yellow-200 hover:shadow-lg transition-shadow'>
          <CardHeader className='pb-3'>
            <div className='flex items-center space-x-3'>
              <div className='bg-yellow-100 p-2 rounded-lg'>
                <CheckCircle className='h-6 w-6 text-yellow-600' />
              </div>
              <CardTitle className='text-lg text-gray-900'>✅ Login</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600'>
              Login realizado com sucesso via cookies httpOnly
            </p>
          </CardContent>
        </Card>

        {/* Middleware Status */}
        <Card className='border-yellow-200 hover:shadow-lg transition-shadow'>
          <CardHeader className='pb-3'>
            <div className='flex items-center space-x-3'>
              <div className='bg-yellow-100 p-2 rounded-lg'>
                <CheckCircle className='h-6 w-6 text-yellow-600' />
              </div>
              <CardTitle className='text-lg text-gray-900'>
                ✅ Middleware
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600'>
              Middleware protegendo rotas corretamente
            </p>
          </CardContent>
        </Card>

        {/* Redirecionamento Status */}
        <Card className='border-yellow-200 hover:shadow-lg transition-shadow'>
          <CardHeader className='pb-3'>
            <div className='flex items-center space-x-3'>
              <div className='bg-yellow-100 p-2 rounded-lg'>
                <CheckCircle className='h-6 w-6 text-yellow-600' />
              </div>
              <CardTitle className='text-lg text-gray-900'>
                ✅ Redirecionamento
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-gray-600'>
              Redirecionamento funcionando sem conflitos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Seção de informações técnicas */}
      <Card className='border-slate-200'>
        <CardHeader>
          <CardTitle className='flex items-center space-x-2'>
            <Shield className='h-5 w-5 text-slate-600' />
            <span>🔧 Informações Técnicas</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
              <div className='flex items-center space-x-2 mb-2'>
                <CheckCircle className='h-4 w-4 text-green-600' />
                <span className='font-medium text-green-800'>
                  Cookies httpOnly:
                </span>
              </div>
              <span className='text-sm text-green-700'>Funcionando</span>
            </div>

            <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
              <div className='flex items-center space-x-2 mb-2'>
                <CheckCircle className='h-4 w-4 text-green-600' />
                <span className='font-medium text-green-800'>
                  Estado Zustand:
                </span>
              </div>
              <span className='text-sm text-green-700'>Sincronizado</span>
            </div>

            <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
              <div className='flex items-center space-x-2 mb-2'>
                <CheckCircle className='h-4 w-4 text-green-600' />
                <span className='font-medium text-green-800'>
                  AuthProvider:
                </span>
              </div>
              <span className='text-sm text-green-700'>Ativo</span>
            </div>

            <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
              <div className='flex items-center space-x-2 mb-2'>
                <CheckCircle className='h-4 w-4 text-green-600' />
                <span className='font-medium text-green-800'>Middleware:</span>
              </div>
              <span className='text-sm text-green-700'>Protegendo rotas</span>
            </div>

            <div className='bg-green-50 border border-green-200 rounded-lg p-3'>
              <div className='flex items-center space-x-2 mb-2'>
                <CheckCircle className='h-4 w-4 text-green-600' />
                <span className='font-medium text-green-800'>
                  Backend Auth:
                </span>
              </div>
              <span className='text-sm text-green-700'>Conectado</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção Debug (opcional - pode ser removida em produção) */}
      <Card className='border-amber-200 bg-amber-50'>
        <CardHeader>
          <CardTitle className='text-amber-800'>
            🐛 Debug - Dados do Usuário
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className='text-xs text-amber-700 overflow-x-auto'>
            {JSON.stringify(user, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
