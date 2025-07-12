// apps/web/src/store/notification.store.ts
import type { NotificationDto } from '@sistema-premiacao/shared-types';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface NotificationStore {
  // Estado
  notifications: NotificationDto[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetch: number | null;
  isWebSocketConnected: boolean;

  // Ações básicas
  setNotifications: (notifications: NotificationDto[]) => void;
  addNotification: (notification: NotificationDto) => void;
  updateNotification: (id: number, updates: Partial<NotificationDto>) => void;
  removeNotification: (id: number) => void;

  // Ações de leitura
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;

  // Estados de carregamento e erro
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // WebSocket
  setWebSocketConnected: (connected: boolean) => void;

  // Utilitários
  getUnreadNotifications: () => NotificationDto[];
  getNotificationById: (id: number) => NotificationDto | undefined;
  refreshUnreadCount: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>()(
  subscribeWithSelector((set, get) => ({
    // Estado inicial
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    lastFetch: null,
    isWebSocketConnected: false,

    // Ações básicas
    setNotifications: (notifications) => {
      const unreadCount = notifications.filter((n) => !n.isRead).length;
      set({
        notifications,
        unreadCount,
        lastFetch: Date.now(),
        error: null,
      });
    },

    addNotification: (notification) => {
      const state = get();
      const existingIndex = state.notifications.findIndex(
        (n) => n.id === notification.id
      );

      if (existingIndex >= 0) {
        // Atualizar notificação existente
        const updatedNotifications = [...state.notifications];
        updatedNotifications[existingIndex] = notification;

        set({
          notifications: updatedNotifications,
          unreadCount: updatedNotifications.filter((n) => !n.isRead).length,
        });
      } else {
        // Adicionar nova notificação no topo
        const newNotifications = [notification, ...state.notifications];

        set({
          notifications: newNotifications,
          unreadCount: newNotifications.filter((n) => !n.isRead).length,
        });
      }
    },

    updateNotification: (id, updates) => {
      const state = get();
      const updatedNotifications = state.notifications.map((notification) =>
        notification.id === id ? { ...notification, ...updates } : notification
      );

      set({
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter((n) => !n.isRead).length,
      });
    },

    removeNotification: (id) => {
      const state = get();
      const filteredNotifications = state.notifications.filter(
        (n) => n.id !== id
      );

      set({
        notifications: filteredNotifications,
        unreadCount: filteredNotifications.filter((n) => !n.isRead).length,
      });
    },

    // Ações de leitura
    markAsRead: (notificationId) => {
      const state = get();
      const updatedNotifications = state.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, isRead: true }
          : notification
      );

      set({
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter((n) => !n.isRead).length,
      });
    },

    markAllAsRead: () => {
      const state = get();
      const updatedNotifications = state.notifications.map((notification) => ({
        ...notification,
        isRead: true,
      }));

      set({
        notifications: updatedNotifications,
        unreadCount: 0,
      });
    },

    // Estados de carregamento e erro
    setLoading: (isLoading) => set({ isLoading }),

    setError: (error) => set({ error }),

    // WebSocket
    setWebSocketConnected: (isWebSocketConnected) =>
      set({ isWebSocketConnected }),

    // Utilitários
    getUnreadNotifications: () => {
      const state = get();
      return state.notifications.filter((n) => !n.isRead);
    },

    getNotificationById: (id) => {
      const state = get();
      return state.notifications.find((n) => n.id === id);
    },

    refreshUnreadCount: () => {
      const state = get();
      const unreadCount = state.notifications.filter((n) => !n.isRead).length;
      set({ unreadCount });
    },

    clearAll: () =>
      set({
        notifications: [],
        unreadCount: 0,
        isLoading: false,
        error: null,
        lastFetch: null,
        isWebSocketConnected: false,
      }),
  }))
);

// Seletores para performance otimizada
export const useNotifications = () =>
  useNotificationStore((state) => state.notifications);
export const useUnreadCount = () =>
  useNotificationStore((state) => state.unreadCount);
export const useNotificationLoading = () =>
  useNotificationStore((state) => state.isLoading);
export const useNotificationError = () =>
  useNotificationStore((state) => state.error);
export const useWebSocketStatus = () =>
  useNotificationStore((state) => state.isWebSocketConnected);

// Seletor para notificações não lidas (memoizado)
export const useUnreadNotifications = () =>
  useNotificationStore((state) => state.notifications.filter((n) => !n.isRead));

// Hook para ações do store (CORRIGIDO - sem infinite loop)
export const useNotificationActions = () => {
  const setNotifications = useNotificationStore(
    (state) => state.setNotifications
  );
  const addNotification = useNotificationStore(
    (state) => state.addNotification
  );
  const updateNotification = useNotificationStore(
    (state) => state.updateNotification
  );
  const removeNotification = useNotificationStore(
    (state) => state.removeNotification
  );
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const setLoading = useNotificationStore((state) => state.setLoading);
  const setError = useNotificationStore((state) => state.setError);
  const setWebSocketConnected = useNotificationStore(
    (state) => state.setWebSocketConnected
  );
  const getUnreadNotifications = useNotificationStore(
    (state) => state.getUnreadNotifications
  );
  const getNotificationById = useNotificationStore(
    (state) => state.getNotificationById
  );
  const refreshUnreadCount = useNotificationStore(
    (state) => state.refreshUnreadCount
  );
  const clearAll = useNotificationStore((state) => state.clearAll);

  return {
    setNotifications,
    addNotification,
    updateNotification,
    removeNotification,
    markAsRead,
    markAllAsRead,
    setLoading,
    setError,
    setWebSocketConnected,
    getUnreadNotifications,
    getNotificationById,
    refreshUnreadCount,
    clearAll,
  };
};
