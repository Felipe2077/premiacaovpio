// apps/web/src/components/providers/NotificationProvider.tsx
'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { useNotifications } from '@/hooks/useNotifications';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useNotificationActions } from '@/store/notification.store';
import type { NotificationDto } from '@sistema-premiacao/shared-types';
import { createContext, ReactNode, useContext, useEffect } from 'react';

interface NotificationContextValue {
  // Estado das notificações
  notifications: NotificationDto[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;

  // Estado da conexão
  isWebSocketConnected: boolean;
  isWebSocketConnecting: boolean;
  hasConnectionIssues: boolean;

  // Ações
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  refresh: () => Promise<void>;
  reconnectWebSocket: () => void;

  // Estados das operações
  isMarkingAsRead: boolean;
  isMarkingAllAsRead: boolean;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null
);

interface NotificationProviderProps {
  children: ReactNode;
  enableWebSocket?: boolean;
  webSocketUrl?: string;
}

export function NotificationProvider({
  children,
  enableWebSocket = true,
  webSocketUrl,
}: NotificationProviderProps) {
  const { isAuthenticated, user } = useAuth();
  const { clearAll } = useNotificationActions();

  // Hook de notificações (React Query + Store)
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    addNotification,
    refresh,
    isMarkingAsRead,
    isMarkingAllAsRead,
  } = useNotifications();

  // Hook do WebSocket
  const {
    isConnected: isWebSocketConnected,
    isConnecting: isWebSocketConnecting,
    hasConnectionIssues,
    connect: reconnectWebSocket,
  } = useWebSocket({
    url: webSocketUrl,
    enabled: enableWebSocket && isAuthenticated,
    onNotification: (notification) => {
      console.log('Nova notificação via WebSocket:', notification);
      addNotification(notification);
    },
    onConnect: () => {
      console.log('WebSocket conectado para notificações');
    },
    onDisconnect: () => {
      console.log('WebSocket desconectado');
    },
    onError: (error) => {
      console.error('Erro no WebSocket de notificações:', error);
    },
  });

  // Limpar notificações quando usuário deslogar
  useEffect(() => {
    if (!isAuthenticated) {
      clearAll();
    }
  }, [isAuthenticated, clearAll]);

  // Log de debug em desenvolvimento
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('NotificationProvider status:', {
        isAuthenticated,
        userId: user?.id,
        notificationsCount: notifications.length,
        unreadCount,
        isLoading,
        isWebSocketConnected,
        hasConnectionIssues,
      });
    }
  }, [
    isAuthenticated,
    user?.id,
    notifications.length,
    unreadCount,
    isLoading,
    isWebSocketConnected,
    hasConnectionIssues,
  ]);

  const contextValue: NotificationContextValue = {
    // Estado das notificações
    notifications,
    unreadCount,
    isLoading,
    error,

    // Estado da conexão
    isWebSocketConnected,
    isWebSocketConnecting,
    hasConnectionIssues,

    // Ações
    markAsRead,
    markAllAsRead,
    refresh,
    reconnectWebSocket,

    // Estados das operações
    isMarkingAsRead,
    isMarkingAllAsRead,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook para usar o contexto de notificações
 */
export function useNotificationContext() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      'useNotificationContext deve ser usado dentro de NotificationProvider'
    );
  }

  return context;
}

/**
 * Hook DEFENSIVO para status de notificações
 * Retorna valores padrão se o provider não estiver disponível
 */
export function useNotificationStatus() {
  const context = useContext(NotificationContext);

  // Se não há contexto, retornar valores padrão
  if (!context) {
    return {
      unreadCount: 0,
      isLoading: false,
      isWebSocketConnected: false,
      hasConnectionIssues: false,
      hasNotifications: false,
    };
  }

  const { unreadCount, isLoading, isWebSocketConnected, hasConnectionIssues } =
    context;

  return {
    unreadCount,
    isLoading,
    isWebSocketConnected,
    hasConnectionIssues,
    hasNotifications: unreadCount > 0,
  };
}

/**
 * Hook DEFENSIVO para ações de notificação do contexto
 */
export function useNotificationContextActions() {
  const context = useContext(NotificationContext);

  // Se não há contexto, retornar funções vazias
  if (!context) {
    const noop = () => {};
    const noopAsync = async () => {};

    return {
      markAsRead: noop,
      markAllAsRead: noop,
      refresh: noopAsync,
      reconnectWebSocket: noop,
      isMarkingAsRead: false,
      isMarkingAllAsRead: false,
    };
  }

  const {
    markAsRead,
    markAllAsRead,
    refresh,
    reconnectWebSocket,
    isMarkingAsRead,
    isMarkingAllAsRead,
  } = context;

  return {
    markAsRead,
    markAllAsRead,
    refresh,
    reconnectWebSocket,
    isMarkingAsRead,
    isMarkingAllAsRead,
  };
}
