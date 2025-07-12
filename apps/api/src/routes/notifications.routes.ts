// File: apps/api/src/routes/notifications.routes.ts

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { NotificationService } from '../modules/notifications/notification.service';

const notificationRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const notificationService = new NotificationService();

  fastify.get(
    '/api/notifications',
    {
      preHandler: [(fastify as any).authenticate],
    },
    async (request, reply) => {
    const userId = (request as any).user.id;
    const notifications = await notificationService.findByUser(userId);
    reply.send(notifications);
  });

  fastify.get(
    '/api/notifications/unread-count',
    {
      preHandler: [(fastify as any).authenticate],
    },
    async (request, reply) => {
    const userId = (request as any).user.id;
    const count = await notificationService.getUnreadCount(userId);
    reply.send({ count });
  });

  fastify.post(
    '/api/notifications/:id/read',
    {
      preHandler: [(fastify as any).authenticate],
    },
    async (request, reply) => {
    const userId = (request as any).user.id;
    const notificationId = parseInt((request.params as any).id, 10);
    const success = await notificationService.markAsRead(notificationId, userId);
    if (success) {
      reply.send({ success: true, message: 'Notificação marcada como lida.' });
    } else {
      reply.status(404).send({ success: false, message: 'Notificação não encontrada ou não pertence ao usuário.' });
    }
  });

  fastify.post(
    '/api/notifications/mark-all-read',
    {
      preHandler: [(fastify as any).authenticate],
    },
    async (request, reply) => {
    const userId = (request as any).user.id;
    const affectedCount = await notificationService.markAllAsRead(userId);
    reply.send({ success: true, message: `${affectedCount} notificações marcadas como lidas.` });
  });
};

export default fp(notificationRoutes);
