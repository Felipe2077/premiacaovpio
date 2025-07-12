// File: packages/shared-types/src/dto/notification.dto.ts

export interface NotificationDto {
  id: number;
  type: string; // Usar string para simplicidade no DTO
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string; // ISO string
}

// Dados para criar uma notificação (usado internamente no backend)
export interface CreateNotificationDto {
  userId: number;
  type: string;
  message: string;
  link?: string;
}

// Dados para o job na fila
export interface NotificationJobData {
  // Pode ser um ID de usuário ou um papel (role)
  recipient: { userId?: number; userRole?: 'DIRETOR' | 'GERENTE' };
  type: string;
  message: string;
  link?: string;
}
