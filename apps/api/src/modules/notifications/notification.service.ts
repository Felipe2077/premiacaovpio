// File: apps/api/src/modules/notifications/notification.service.ts

import { AppDataSource } from '@/database/data-source';
import { NotificationEntity, NotificationType } from '@/entity/notification.entity';
import { UserEntity } from '@/entity/user.entity';
import { CreateNotificationDto } from '@sistema-premiacao/shared-types';
import { In, Repository } from 'typeorm';
// import { WebSocketService } from '../websocket/websocket.service'; // Será injetado

export class NotificationService {
  private notificationRepo: Repository<NotificationEntity>;
  private userRepo: Repository<UserEntity>;
  // private webSocketService: WebSocketService;

  constructor() {
    this.notificationRepo = AppDataSource.getRepository(NotificationEntity);
    this.userRepo = AppDataSource.getRepository(UserEntity);
    // this.webSocketService = new WebSocketService(); // Exemplo
  }

  // Chamado pelo Worker
  async createAndDispatch(data: CreateNotificationDto): Promise<void> {
    const notification = this.notificationRepo.create({
        ...data,
        type: data.type as NotificationType
    });
    await this.notificationRepo.save(notification);

    // TODO: Chamar o WebSocketService para enviar em tempo real
    // this.webSocketService.sendToUser(data.userId, notification);
    console.log(`Notificação criada e despachada para o usuário ${data.userId}`);
  }

  async findByUser(userId: number, limit: number = 50): Promise<NotificationEntity[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
  
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationRepo.count({ where: { userId, isRead: false } });
  }

  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    const result = await this.notificationRepo.update(
      { id: notificationId, userId }, // Garante que um usuário só pode ler suas próprias notificações
      { isRead: true }
    );
    return result.affected === 1;
  }

  async markAllAsRead(userId: number): Promise<number> {
    const result = await this.notificationRepo.update(
      { userId, isRead: false },
      { isRead: true }
    );
    return result.affected || 0;
  }
}
