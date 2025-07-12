// apps/web/src/hooks/useNotifications.ts
import { useNotificationActions } from '@/store/notification.store';
import type { NotificationDto } from '@sistema-premiacao/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';

// Tipos para as APIs
interface MarkAsReadResponse {
  success: boolean;
  message: string;
}

interface UnreadCountResponse {
  count: number;
}

// Keys para o React Query
const QUERY_KEYS = {
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
} as const;

// Funções da API
const api = {
  // Buscar todas as notificações
  async fetchNotifications(): Promise<NotificationDto[]> {
    const response = await fetch('/api/notifications', {
      credentials: 'include', // Para cookies de sessão
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao buscar notificações: ${error}`);
    }

    return response.json();
  },

  // Buscar contagem de não lidas
  async fetchUnreadCount(): Promise<number> {
    const response = await fetch('/api/notifications/unread-count', {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao buscar contagem: ${error}`);
    }

    const data: UnreadCountResponse = await response.json();
    return data.count;
  },

  // Marcar notificação como lida
  async markAsRead(notificationId: number): Promise<MarkAsReadResponse> {
    const response = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Body vazio mas válido
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao marcar como lida: ${error}`);
    }

    return response.json();
  },

  // Marcar todas como lidas
  async markAllAsRead(): Promise<MarkAsReadResponse> {
    const response = await fetch('/api/notifications/mark-all-read', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}), // Body vazio mas válido
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro ao marcar todas como lidas: ${error}`);
    }

    return response.json();
  },
};

/**
 * Hook principal para gerenciar notificações
 * Integra React Query com Zustand Store
 */
export function useNotifications() {
  const queryClient = useQueryClient();
  const actions = useNotificationActions();
  const { setLoading, setError } = actions;

  // Query para buscar notificações
  const notificationsQuery = useQuery({
    queryKey: QUERY_KEYS.notifications,
    queryFn: api.fetchNotifications,
    staleTime: 30 * 1000, // 30 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Query para contagem de não lidas
  const unreadCountQuery = useQuery({
    queryKey: QUERY_KEYS.unreadCount,
    queryFn: api.fetchUnreadCount,
    staleTime: 10 * 1000, // 10 segundos
    gcTime: 5 * 60 * 1000, // 5 minutos
    retry: 3,
  });

  // Sincronizar dados com o store
  useEffect(() => {
    if (notificationsQuery.data) {
      actions.setNotifications(notificationsQuery.data);
    }
  }, [notificationsQuery.data, actions]);

  useEffect(() => {
    setLoading(notificationsQuery.isLoading || unreadCountQuery.isLoading);
  }, [notificationsQuery.isLoading, unreadCountQuery.isLoading, setLoading]);

  useEffect(() => {
    const error = notificationsQuery.error || unreadCountQuery.error;
    setError(error ? (error as Error).message : null);
  }, [notificationsQuery.error, unreadCountQuery.error, setError]);

  // Mutation para marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: api.markAsRead,
    onMutate: async (notificationId) => {
      // Atualização otimista
      actions.markAsRead(notificationId);

      // Cancelar queries em andamento
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.notifications });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.unreadCount });

      return { notificationId };
    },
    onSuccess: (data, notificationId) => {
      // Invalidar queries para sincronizar
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });

      toast.success('Notificação marcada como lida');
    },
    onError: (error, notificationId, context) => {
      // Reverter mudança otimista em caso de erro
      const notification = actions.getNotificationById(notificationId);
      if (notification) {
        actions.updateNotification(notificationId, { isRead: false });
      }

      toast.error('Erro ao marcar notificação como lida');
      console.error('Erro ao marcar como lida:', error);
    },
  });

  // Mutation para marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: api.markAllAsRead,
    onMutate: async () => {
      // Atualização otimista
      actions.markAllAsRead();

      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.notifications });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.unreadCount });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
      toast.success(
        data.message || 'Todas as notificações foram marcadas como lidas'
      );
    },
    onError: (error) => {
      // Recarregar dados em caso de erro
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
      toast.error('Erro ao marcar todas as notificações como lidas');
      console.error('Erro ao marcar todas como lidas:', error);
    },
  });

  // Função para adicionar nova notificação (usada pelo WebSocket)
  const addNotification = useCallback(
    (notification: NotificationDto) => {
      actions.addNotification(notification);

      // Invalidar contagem para sincronizar
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount });
    },
    [actions, queryClient]
  );

  // Função para refresh manual
  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.unreadCount }),
    ]);
  }, [queryClient]);

  // Função para marcar como lida com feedback
  const markAsRead = useCallback(
    (notificationId: number) => {
      markAsReadMutation.mutate(notificationId);
    },
    [markAsReadMutation]
  );

  // Função para marcar todas como lidas
  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate();
  }, [markAllAsReadMutation]);

  return {
    // Dados
    notifications: notificationsQuery.data || [],
    unreadCount: unreadCountQuery.data || 0,

    // Estados
    isLoading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
    error: (notificationsQuery.error || unreadCountQuery.error) as Error | null,

    // Ações
    markAsRead,
    markAllAsRead,
    addNotification, // Para WebSocket
    refresh,

    // Estados das mutations
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,

    // Queries para uso avançado
    notificationsQuery,
    unreadCountQuery,
  };
}

/**
 * Hook simples para apenas a contagem de não lidas
 * Útil para componentes que só precisam do número
 */
export function useUnreadCount() {
  const query = useQuery({
    queryKey: QUERY_KEYS.unreadCount,
    queryFn: api.fetchUnreadCount,
    staleTime: 10 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 2,
  });

  return {
    count: query.data || 0,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
