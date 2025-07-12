// apps/web/src/components/notifications/NotificationItem.tsx
'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { NotificationDto } from '@sistema-premiacao/shared-types';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  ExternalLink,
  FileX,
  Info,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';

interface NotificationItemProps {
  notification: NotificationDto;
  onClick?: (link?: string) => void;
  onMarkAsRead?: () => void;
  compact?: boolean;
  showActions?: boolean;
}

// Configuração de tipos de notificação
const notificationConfig = {
  // Expurgos
  EXPURGO_SOLICITADO: {
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    label: 'Expurgo Solicitado',
  },
  EXPURGO_APROVADO: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    label: 'Expurgo Aprovado',
  },
  EXPURGO_REJEITADO: {
    icon: FileX,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'Expurgo Rejeitado',
  },

  // ETL & Sistema
  ETL_CONCLUIDO: {
    icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    label: 'ETL Concluído',
  },
  ETL_FALHOU: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'ETL Falhou',
  },

  // Genéricos
  INFO: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    label: 'Informação',
  },
  AVISO: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    label: 'Aviso',
  },
  ERRO: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    label: 'Erro',
  },
} as const;

export function NotificationItem({
  notification,
  onClick,
  onMarkAsRead,
  compact = false,
  showActions = true,
}: NotificationItemProps) {
  // Configuração baseada no tipo
  const config =
    notificationConfig[notification.type as keyof typeof notificationConfig] ||
    notificationConfig.INFO;
  const IconComponent = config.icon;

  // Formatação de data
  const timeAgo = useMemo(() => {
    const now = new Date();
    const notificationDate = new Date(notification.createdAt);
    const diffInMs = now.getTime() - notificationDate.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Agora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;

    return notificationDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  }, [notification.createdAt]);

  // Handler de clique
  const handleClick = () => {
    onClick?.(notification.link);
  };

  // Handler para marcar como lida
  const handleMarkAsRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkAsRead?.();
  };

  // Conteúdo do item
  const content = (
    <div
      className={cn(
        'group relative p-3 transition-all duration-200 cursor-pointer',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        !notification.isRead && [
          'bg-gradient-to-r from-transparent via-blue-50/30 to-transparent',
          'dark:from-transparent dark:via-blue-950/20 dark:to-transparent',
          'border-l-2 border-blue-400 dark:border-blue-500',
        ],
        compact ? 'py-2' : 'py-3'
      )}
      onClick={handleClick}
    >
      <div className='flex items-start gap-3'>
        {/* Ícone */}
        <div
          className={cn(
            'flex-shrink-0 rounded-full p-1.5',
            config.bgColor,
            compact ? 'p-1' : 'p-1.5'
          )}
        >
          <IconComponent
            className={cn(config.color, compact ? 'h-3 w-3' : 'h-4 w-4')}
          />
        </div>

        {/* Conteúdo */}
        <div className='flex-1 min-w-0'>
          {/* Header com tipo e tempo */}
          <div className='flex items-center justify-between mb-1'>
            <span
              className={cn(
                'text-xs font-medium uppercase tracking-wide',
                config.color,
                compact && 'text-xs'
              )}
            >
              {config.label}
            </span>

            <div className='flex items-center gap-2'>
              <span
                className={cn(
                  'text-xs text-gray-500 dark:text-gray-400',
                  compact && 'text-xs'
                )}
              >
                {timeAgo}
              </span>

              {/* Indicador de não lida */}
              {!notification.isRead && (
                <div className='w-2 h-2 bg-blue-500 rounded-full animate-pulse' />
              )}
            </div>
          </div>

          {/* Mensagem */}
          <p
            className={cn(
              'text-sm text-gray-700 dark:text-gray-300 leading-relaxed',
              compact ? 'text-xs line-clamp-2' : 'line-clamp-3'
            )}
          >
            {notification.message}
          </p>

          {/* Link indicator */}
          {notification.link && (
            <div className='flex items-center gap-1 mt-2 text-xs text-blue-600 dark:text-blue-400'>
              <ExternalLink className='h-3 w-3' />
              <span>Clique para ver detalhes</span>
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && !notification.isRead && (
          <div className='flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity'>
            <Button
              variant='ghost'
              size='icon'
              onClick={handleMarkAsRead}
              className='h-6 w-6 text-gray-400 hover:text-green-600'
              title='Marcar como lida'
            >
              <Check className='h-3 w-3' />
            </Button>
          </div>
        )}
      </div>

      {/* Hover effect */}
      <div className='absolute inset-0 bg-gradient-to-r from-transparent via-gray-100/0 to-transparent group-hover:via-gray-100/50 dark:group-hover:via-gray-800/50 transition-all duration-200 pointer-events-none' />
    </div>
  );

  // Se tem link, envolver com Link do Next.js
  if (notification.link) {
    return (
      <Link href={notification.link} className='block'>
        {content}
      </Link>
    );
  }

  return content;
}

// Variação compacta
export function NotificationItemCompact(
  props: Omit<NotificationItemProps, 'compact'>
) {
  return <NotificationItem {...props} compact />;
}

// Variação sem ações
export function NotificationItemReadOnly(
  props: Omit<NotificationItemProps, 'showActions'>
) {
  return <NotificationItem {...props} showActions={false} />;
}
