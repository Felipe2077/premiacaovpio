// apps/web/src/components/notifications/NotificationPanel.tsx
'use client';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import {
  useNotifications as useNotificationsStore,
  useUnreadCount,
} from '@/store/notification.store';
import {
  Bell,
  BellOff,
  CheckCheck,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NotificationItem } from './NotificationItem';

interface NotificationPanelProps {
  onClose?: () => void;
  onNotificationClick?: (notificationId: number) => void;
  maxHeight?: string;
  showHeader?: boolean;
  showActions?: boolean;
}

export function NotificationPanel({
  onClose,
  onNotificationClick,
  maxHeight = '400px',
  showHeader = true,
  showActions = true,
}: NotificationPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hooks
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
    isMarkingAllAsRead,
  } = useNotifications();

  // Estado do store
  const storeNotifications = useNotificationsStore();
  const storeUnreadCount = useUnreadCount();

  // Usar dados do store se disponível, senão do hook
  const displayNotifications =
    storeNotifications.length > 0 ? storeNotifications : notifications;
  const displayUnreadCount =
    storeNotifications.length > 0 ? storeUnreadCount : unreadCount;

  // Handlers
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleNotificationClick = (notificationId: number, link?: string) => {
    // Marcar como lida se não estiver
    const notification = displayNotifications.find(
      (n) => n.id === notificationId
    );
    if (notification && !notification.isRead) {
      markAsRead(notificationId);
    }

    // Callback externo
    onNotificationClick?.(notificationId);

    // Navegar se tiver link (será tratado pelo Link do Next.js)
    if (link) {
      onClose?.();
    }
  };

  // Estados
  const hasNotifications = displayNotifications.length > 0;
  const hasUnread = displayUnreadCount > 0;

  return (
    <div className='flex flex-col min-h-0'>
      {/* Header */}
      {showHeader && (
        <>
          <div className='flex items-center justify-between p-4 pb-2'>
            <div className='flex items-center gap-2'>
              <Bell className='h-5 w-5 text-gray-600 dark:text-gray-400' />
              <h3 className='font-semibold text-gray-900 dark:text-gray-100'>
                Notificações
              </h3>
              {displayUnreadCount > 0 && (
                <span className='text-sm text-gray-500 dark:text-gray-400'>
                  ({displayUnreadCount} nova
                  {displayUnreadCount !== 1 ? 's' : ''})
                </span>
              )}
            </div>

            {onClose && (
              <Button
                variant='ghost'
                size='icon'
                onClick={onClose}
                className='h-6 w-6'
              >
                <X className='h-4 w-4' />
              </Button>
            )}
          </div>

          {/* Actions */}
          {showActions && (
            <div className='flex items-center gap-2 px-4 pb-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className='h-7 text-xs'
              >
                {isRefreshing ? (
                  <Loader2 className='h-3 w-3 animate-spin mr-1' />
                ) : (
                  <RefreshCw className='h-3 w-3 mr-1' />
                )}
                Atualizar
              </Button>

              {hasUnread && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleMarkAllAsRead}
                  disabled={isMarkingAllAsRead}
                  className='h-7 text-xs'
                >
                  {isMarkingAllAsRead ? (
                    <Loader2 className='h-3 w-3 animate-spin mr-1' />
                  ) : (
                    <CheckCheck className='h-3 w-3 mr-1' />
                  )}
                  Marcar todas
                </Button>
              )}
            </div>
          )}

          <Separator />
        </>
      )}

      {/* Content */}
      <div className='flex-1 min-h-0'>
        {/* Loading State */}
        {isLoading && (
          <div className='flex items-center justify-center p-8'>
            <div className='flex flex-col items-center gap-2'>
              <Loader2 className='h-6 w-6 animate-spin text-gray-400' />
              <p className='text-sm text-gray-500'>
                Carregando notificações...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className='flex flex-col items-center justify-center p-8'>
            <div className='text-center'>
              <X className='h-8 w-8 text-red-400 mx-auto mb-2' />
              <p className='text-sm text-red-600 dark:text-red-400 mb-2'>
                Erro ao carregar notificações
              </p>
              <p className='text-xs text-gray-500 mb-4'>
                {error.message || 'Tente novamente em alguns instantes'}
              </p>
              <Button size='sm' variant='outline' onClick={handleRefresh}>
                <RefreshCw className='h-4 w-4 mr-2' />
                Tentar novamente
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!hasNotifications && !isLoading && !error && (
          <div className='flex flex-col items-center justify-center p-8'>
            <BellOff className='h-8 w-8 text-gray-300 dark:text-gray-600 mb-3' />
            <p className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-1'>
              Nenhuma notificação
            </p>
            <p className='text-xs text-gray-400 dark:text-gray-500 text-center'>
              Você não tem notificações no momento
            </p>
          </div>
        )}

        {/* Notifications List */}
        {hasNotifications && !isLoading && !error && (
          <ScrollArea className='h-full' style={{ maxHeight }}>
            <div className='divide-y divide-gray-100 dark:divide-gray-800'>
              {displayNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={(link) =>
                    handleNotificationClick(notification.id, link)
                  }
                  onMarkAsRead={() => markAsRead(notification.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      {hasNotifications && showActions && (
        <>
          <Separator />
          <div className='p-3 bg-gray-50 dark:bg-gray-900/50'>
            <Button
              variant='ghost'
              size='sm'
              className='w-full h-8 text-xs'
              onClick={() => {
                onClose?.();
                // TODO: Navegar para página de todas as notificações
              }}
            >
              <ExternalLink className='h-3 w-3 mr-2' />
              Ver todas as notificações
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
