// apps/web/src/components/notifications/NotificationSetupGuide.tsx
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Bell,
  CheckCircle,
  Code,
  ExternalLink,
  Info,
  Play,
  Server,
  Terminal,
  Zap,
} from 'lucide-react';

export function NotificationSetupGuide() {
  const steps = [
    {
      id: 1,
      title: 'Iniciar a API',
      description: 'A API deve estar rodando para receber notificações',
      command: 'pnpm run dev:api',
      status: 'required',
      icon: Server,
    },
    {
      id: 2,
      title: 'Iniciar o Worker de Notificações',
      description: 'Worker processa a fila de notificações',
      command: 'pnpm --filter @sistema-premiacao/api run work:notifications',
      status: 'required',
      icon: Zap,
    },
    {
      id: 3,
      title: 'Redis em Execução',
      description: 'Necessário para a fila BullMQ',
      command: 'redis-server',
      status: 'required',
      icon: Terminal,
    },
    {
      id: 4,
      title: 'Fazer Login na Aplicação',
      description: 'Notificações só funcionam para usuários autenticados',
      command: null,
      status: 'required',
      icon: CheckCircle,
    },
  ];

  const testActions = [
    {
      action: 'Solicitar um expurgo',
      result: 'Diretor recebe notificação',
      endpoint: 'POST /api/expurgos',
    },
    {
      action: 'Aprovar um expurgo',
      result: 'Solicitante recebe notificação',
      endpoint: 'POST /api/expurgos/:id/approve',
    },
    {
      action: 'Usar o NotificationDebug',
      result: 'Adicionar notificações mock',
      endpoint: 'Componente de teste',
    },
  ];

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='text-center'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center justify-center gap-2'>
          <Bell className='h-6 w-6' />
          Sistema de Notificações
        </h2>
        <p className='text-gray-600 dark:text-gray-400 mt-2'>
          Guia para configurar e testar notificações em tempo real
        </p>
      </div>

      {/* Status Atual */}
      <Alert>
        <Info className='h-4 w-4' />
        <AlertTitle>Status da Implementação</AlertTitle>
        <AlertDescription>
          <div className='flex items-center gap-2 mt-2'>
            <Badge variant='default' className='bg-green-500'>
              Frontend ✅
            </Badge>
            <Badge variant='default' className='bg-green-500'>
              Backend ✅
            </Badge>
            <Badge variant='default' className='bg-green-500'>
              WebSocket ✅
            </Badge>
            <Badge variant='secondary'>Pronto para teste</Badge>
          </div>
        </AlertDescription>
      </Alert>

      {/* Passos de Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Play className='h-5 w-5' />
            Passos para Ativar
          </CardTitle>
          <CardDescription>
            Siga os passos abaixo para ativar o sistema de notificações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {steps.map((step, index) => (
              <div key={step.id} className='flex items-start gap-3'>
                <div className='flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-950 rounded-full flex items-center justify-center'>
                  <step.icon className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                </div>
                <div className='flex-1'>
                  <h4 className='font-medium text-gray-900 dark:text-gray-100'>
                    {step.title}
                  </h4>
                  <p className='text-sm text-gray-600 dark:text-gray-400 mb-2'>
                    {step.description}
                  </p>
                  {step.command && (
                    <code className='inline-block bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono'>
                      {step.command}
                    </code>
                  )}
                </div>
                <Badge
                  variant={
                    step.status === 'required' ? 'destructive' : 'default'
                  }
                >
                  {step.status === 'required' ? 'Obrigatório' : 'Opcional'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Como Testar */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Code className='h-5 w-5' />
            Como Testar
          </CardTitle>
          <CardDescription>
            Maneiras de gerar notificações para teste
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {testActions.map((test, index) => (
              <div
                key={index}
                className='flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg'
              >
                <div>
                  <p className='font-medium text-gray-900 dark:text-gray-100'>
                    {test.action}
                  </p>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>
                    {test.result}
                  </p>
                </div>
                <Badge variant='outline' className='font-mono text-xs'>
                  {test.endpoint}
                </Badge>
              </div>
            ))}
          </div>

          <Separator className='my-4' />

          <div className='text-center'>
            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              Para testes rápidos, use o componente de debug:
            </p>
            <Button asChild variant='outline'>
              <a
                href='/admin/debug/notifications'
                className='inline-flex items-center gap-2'
              >
                <ExternalLink className='h-4 w-4' />
                Abrir NotificationDebug
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Arquivos Implementados */}
      <Card>
        <CardHeader>
          <CardTitle>Arquivos Implementados</CardTitle>
          <CardDescription>
            Componentes e hooks criados para o sistema de notificações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3 text-sm'>
            <div className='space-y-1'>
              <p className='font-medium text-gray-900 dark:text-gray-100'>
                🏪 Store & Hooks:
              </p>
              <code className='block text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded'>
                store/notification.store.ts
              </code>
              <code className='block text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded'>
                hooks/useNotifications.ts
              </code>
              <code className='block text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded'>
                hooks/useWebSocket.ts
              </code>
            </div>

            <div className='space-y-1'>
              <p className='font-medium text-gray-900 dark:text-gray-100'>
                🎨 Componentes UI:
              </p>
              <code className='block text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded'>
                notifications/NotificationBell.tsx
              </code>
              <code className='block text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded'>
                notifications/NotificationPanel.tsx
              </code>
              <code className='block text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded'>
                notifications/NotificationItem.tsx
              </code>
            </div>

            <div className='space-y-1'>
              <p className='font-medium text-gray-900 dark:text-gray-100'>
                ⚙️ Providers:
              </p>
              <code className='block text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded'>
                providers/NotificationProvider.tsx
              </code>
            </div>

            <div className='space-y-1'>
              <p className='font-medium text-gray-900 dark:text-gray-100'>
                🧪 Debug & Layout:
              </p>
              <code className='block text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded'>
                notifications/NotificationDebug.tsx
              </code>
              <code className='block text-xs bg-gray-100 dark:bg-gray-800 p-1 rounded'>
                admin/AdminHeader.tsx (updated)
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Implementadas */}
      <Card>
        <CardHeader>
          <CardTitle>✨ Features Implementadas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
            <div className='space-y-2'>
              <h4 className='font-medium text-gray-900 dark:text-gray-100'>
                🎯 Core:
              </h4>
              <ul className='space-y-1 text-gray-600 dark:text-gray-400'>
                <li>• Lista de notificações</li>
                <li>• Contagem de não lidas</li>
                <li>• Marcar como lida</li>
                <li>• WebSocket tempo real</li>
                <li>• Toast notifications</li>
              </ul>
            </div>

            <div className='space-y-2'>
              <h4 className='font-medium text-gray-900 dark:text-gray-100'>
                🚀 UX:
              </h4>
              <ul className='space-y-1 text-gray-600 dark:text-gray-400'>
                <li>• Optimistic updates</li>
                <li>• Cache inteligente</li>
                <li>• Retry automático</li>
                <li>• Loading states</li>
                <li>• Design responsivo</li>
              </ul>
            </div>

            <div className='space-y-2'>
              <h4 className='font-medium text-gray-900 dark:text-gray-100'>
                🎨 UI:
              </h4>
              <ul className='space-y-1 text-gray-600 dark:text-gray-400'>
                <li>• Dark mode suport</li>
                <li>• Animações suaves</li>
                <li>• Acessibilidade</li>
                <li>• Mobile-first</li>
                <li>• Indicadores visuais</li>
              </ul>
            </div>

            <div className='space-y-2'>
              <h4 className='font-medium text-gray-900 dark:text-gray-100'>
                🔒 Segurança:
              </h4>
              <ul className='space-y-1 text-gray-600 dark:text-gray-400'>
                <li>• Autenticação integrada</li>
                <li>• Sanitização de dados</li>
                <li>• TypeScript types</li>
                <li>• Error boundaries</li>
                <li>• Validação robusta</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
