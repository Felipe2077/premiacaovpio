// apps/web/src/components/notifications/NotificationStatusIndicator.tsx
'use client';

import {
  useNotificationContextActions,
  useNotificationStatus,
} from '@/components/providers/NotificationProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Clock, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface NotificationStatusIndicatorProps {
  variant?: 'default' | 'admin' | 'compact';
  className?: string;
  showReconnectButton?: boolean;
}

export function NotificationStatusIndicator({
  variant = 'default',
  className,
  showReconnectButton = true,
}: NotificationStatusIndicatorProps) {
  const { isWebSocketConnected, hasConnectionIssues, isLoading, unreadCount } =
    useNotificationStatus();

  const { reconnectWebSocket } = useNotificationContextActions();

  // Determinar status e configuração visual
  const getStatusConfig = () => {
    if (isLoading) {
      return {
        icon: Clock,
        label: 'Carregando...',
        color: 'text-blue-500',
        bgColor: 'bg-blue-50 dark:bg-blue-950/30',
        borderColor: 'border-blue-200 dark:border-blue-800',
        badgeVariant: 'secondary' as const,
      };
    }

    if (!isWebSocketConnected || hasConnectionIssues) {
      return {
        icon: WifiOff,
        label: hasConnectionIssues
          ? 'Problemas de conectividade'
          : 'Desconectado',
        color: 'text-amber-500',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
        badgeVariant: 'destructive' as const,
      };
    }

    return {
      icon: Wifi,
      label: 'Conectado',
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
      borderColor: 'border-green-200 dark:border-green-800',
      badgeVariant: 'default' as const,
    };
  };

  const config = getStatusConfig();
  const IconComponent = config.icon;

  // Variantes de exibição
  if (variant === 'compact') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('flex items-center gap-1', className)}>
              <IconComponent className={cn('h-3 w-3', config.color)} />
              {unreadCount > 0 && (
                <Badge
                  variant='destructive'
                  className='h-4 w-4 p-0 text-xs flex items-center justify-center'
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.label}</p>
            {unreadCount > 0 && (
              <p className='text-xs'>
                {unreadCount} notificação{unreadCount !== 1 ? 'ões' : ''} não
                lida{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === 'admin') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 px-2 py-1 rounded-full border transition-all duration-200',
          config.bgColor,
          config.borderColor,
          className
        )}
      >
        <IconComponent className={cn('h-3 w-3', config.color)} />
        <span
          className={cn('text-xs font-medium hidden sm:inline', config.color)}
        >
          {isWebSocketConnected ? 'Online' : 'Offline'}
        </span>

        {unreadCount > 0 && (
          <Badge
            variant='destructive'
            className='h-4 w-4 p-0 text-xs flex items-center justify-center ml-1'
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}

        {showReconnectButton &&
          (!isWebSocketConnected || hasConnectionIssues) && (
            <Button
              variant='ghost'
              size='sm'
              onClick={reconnectWebSocket}
              className='h-5 w-5 p-0 hover:bg-transparent'
              title='Tentar reconectar'
            >
              <RefreshCw className='h-3 w-3' />
            </Button>
          )}
      </div>
    );
  }

  // Variant default
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200',
              config.bgColor,
              config.borderColor,
              className
            )}
          >
            <IconComponent className={cn('h-4 w-4', config.color)} />
            <div className='flex flex-col'>
              <span className={cn('text-sm font-medium', config.color)}>
                {config.label}
              </span>
              {unreadCount > 0 && (
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {showReconnectButton &&
              (!isWebSocketConnected || hasConnectionIssues) && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={reconnectWebSocket}
                  className='h-6 w-6 p-0'
                  title='Tentar reconectar'
                >
                  <RefreshCw className='h-3 w-3' />
                </Button>
              )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className='text-center'>
            <p className='font-medium'>{config.label}</p>
            <p className='text-xs text-gray-400'>
              Status das notificações em tempo real
            </p>
            {unreadCount > 0 && (
              <p className='text-xs mt-1'>
                {unreadCount} notificação{unreadCount !== 1 ? 'ões' : ''}{' '}
                pendente{unreadCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
