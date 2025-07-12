// apps/web/src/components/notifications/NotificationBell.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotifications } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';
import { useUnreadCount } from '@/store/notification.store';
import { Bell, BellRing } from 'lucide-react';
import { useState } from 'react';
import { NotificationPanel } from './NotificationPanel';

interface NotificationBellProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'outline' | 'default';
  showBadge?: boolean;
  maxBadgeCount?: number;
}

export function NotificationBell({
  className,
  size = 'md',
  variant = 'ghost',
  showBadge = true,
  maxBadgeCount = 99,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);

  // CORREÇÃO: Chamar useNotifications para carregar dados da API automaticamente
  const { unreadCount: apiUnreadCount } = useNotifications();

  // Usar contagem da API se disponível, senão do store
  const storeUnreadCount = useUnreadCount();
  const unreadCount = apiUnreadCount || storeUnreadCount;

  // Configuração de tamanhos
  const sizeConfig = {
    sm: {
      button: 'h-8 w-8',
      icon: 'h-4 w-4',
      badge: 'h-4 w-4 text-xs min-w-4',
      badgeOffset: '-top-1 -right-1',
    },
    md: {
      button: 'h-9 w-9',
      icon: 'h-5 w-5',
      badge: 'h-5 w-5 text-xs min-w-5',
      badgeOffset: '-top-1.5 -right-1.5',
    },
    lg: {
      button: 'h-10 w-10',
      icon: 'h-6 w-6',
      badge: 'h-6 w-6 text-sm min-w-6',
      badgeOffset: '-top-2 -right-2',
    },
  };

  const config = sizeConfig[size];
  const displayCount =
    unreadCount > maxBadgeCount ? `${maxBadgeCount}+` : unreadCount;
  const hasUnread = unreadCount > 0;

  // Ícone com animação
  const IconComponent = hasUnread ? BellRing : Bell;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size='icon'
          className={cn(
            'relative transition-all duration-200 cursor-pointer',
            config.button,
            // Removido: hasUnread && 'animate-pulse',
            className
          )}
          aria-label={`Notificações${hasUnread ? ` (${unreadCount} não lidas)` : ''}`}
        >
          <IconComponent
            className={cn(
              config.icon,
              'transition-all duration-200',
              hasUnread
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-gray-600 dark:text-gray-400'
            )}
          />

          {/* Badge de contagem */}
          {showBadge && hasUnread && (
            <Badge
              variant='destructive'
              className={cn(
                'absolute flex items-center justify-center font-bold',
                config.badge,
                config.badgeOffset,
                'bg-red-500 hover:bg-red-500 border-white dark:border-gray-900 border-2',
                'animate-in zoom-in-50 duration-200'
                // Removido: 'animate-pulse'
              )}
            >
              {displayCount}
            </Badge>
          )}

          {/* Indicador visual adicional para acessibilidade */}
          {hasUnread && (
            <span className='sr-only'>
              {unreadCount} notificação{unreadCount !== 1 ? 'ões' : ''} não lida
              {unreadCount !== 1 ? 's' : ''}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align='end'
        className='w-96 p-0'
        sideOffset={8}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <NotificationPanel
          onClose={() => setIsOpen(false)}
          onNotificationClick={() => setIsOpen(false)}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Versão compacta para mobile
export function NotificationBellCompact(
  props: Omit<NotificationBellProps, 'size'>
) {
  return <NotificationBell {...props} size='sm' />;
}

// Versão para header admin (defensiva)
export function NotificationBellAdmin(props: NotificationBellProps) {
  // CORREÇÃO: Usar o mesmo padrão do NotificationBell principal
  const { unreadCount: apiUnreadCount } = useNotifications();
  const storeUnreadCount = useUnreadCount();
  const unreadCount = apiUnreadCount || storeUnreadCount;

  return (
    <NotificationBell
      {...props}
      className={cn(
        'text-neutral-300 hover:text-amber-200 hover:bg-amber-500/10',
        'transition-all duration-200',
        // Efeito especial quando há notificações
        unreadCount > 0 && [
          'text-amber-300',
          'shadow-lg shadow-amber-500/20',
          'ring-1 ring-amber-400/30',
        ],
        props.className
      )}
      variant='ghost'
    />
  );
}
