// File: apps/api/src/workers/notification.worker.ts

import { Worker } from 'bullmq';
import { NotificationService } from '../modules/notifications/notification.service';
import { NotificationJobData } from '@sistema-premiacao/shared-types';
import { UserEntity } from '../entity/user.entity';
import { AppDataSource } from '../database/data-source';
import IORedis from 'ioredis';

const redisConnection = new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    maxRetriesPerRequest: null
});

console.log('Starting notification worker...');

const startWorker = async () => {
    await AppDataSource.initialize();
    console.log('Database connection initialized for worker.');

    const notificationWorker = new Worker('notifications', async job => {
        const notificationService = new NotificationService();
        const userRepo = AppDataSource.getRepository(UserEntity);
        
        const data = job.data as NotificationJobData;

        console.log(`Processing notification job: ${job.id}`, data);

        const findUsers = async (): Promise<UserEntity[]> => {
            if (data.recipient.userId) {
                const user = await userRepo.findOneBy({ id: data.recipient.userId });
                return user ? [user] : [];
            }
            if (data.recipient.userRole) {
                return userRepo.find({ where: { role: data.recipient.userRole as any } });
            }
            return [];
        };

        try {
            const users = await findUsers();

            if (users.length === 0) {
                console.warn(`No recipients found for job ${job.id}`, data.recipient);
                return;
            }

            for (const user of users) {
                await notificationService.createAndDispatch({
                    userId: user.id,
                    type: data.type,
                    message: data.message,
                    link: data.link,
                });
            }
        } catch (error) {
            console.error(`Error processing job ${job.id}:`, error);
            throw error; // Re-throw to allow BullMQ to handle retries
        }

    }, { connection: redisConnection });

    notificationWorker.on('completed', job => {
        console.log(`Notification job ${job.id} has completed`);
    });

    notificationWorker.on('failed', (job, err) => {
        console.error(`Notification job ${job?.id} has failed with ${err.message}`);
    });

    console.log('Notification worker started and listening for jobs.');
};

startWorker().catch(error => {
    console.error('Failed to start notification worker:', error);
});
