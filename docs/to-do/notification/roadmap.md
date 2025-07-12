# Roadmap: Implementação do Sistema de Notificações

## 1. Visão Geral e Arquitetura

O objetivo é implementar um sistema de notificações em tempo real, robusto e escalável. A arquitetura escolhida é **orientada a eventos**, utilizando o stack tecnológico existente no projeto.

- **Backend**: Fastify, TypeORM, BullMQ (Fila com Redis)
- **Frontend**: Next.js, React, TanStack Query, Zustand
- **Comunicação Real-time**: WebSockets
- **Banco de Dados**: Postgres

### Fluxo de Dados da Notificação

1.  **Gatilho**: Uma ação na lógica de negócio (ex: `ExpurgoService.approveExpurgo`) dispara um evento.
2.  **Enfileiramento**: Em vez de processar a notificação diretamente, um "job" é adicionado a uma fila no **BullMQ**.
3.  **Worker**: Um processo "worker" independente, escutando a fila, pega o job.
4.  **Persistência**: O worker usa um `NotificationService` para salvar a notificação no banco de dados (Postgres).
5.  **Despacho**: O `NotificationService` instrui o `WebSocketService` a enviar a notificação para o canal do usuário específico.
6.  **Recepção**: O cliente (frontend) recebe a notificação via WebSocket, exibe um "toast" (`sonner`) e atualiza a UI.

---

## 2. Implementação Passo a Passo

### Fase 1: Backend - A Fundação (Banco de Dados e Lógica Core)

#### Passo 1.1: Criar a Entidade `Notification`

Criar o arquivo `apps/api/src/entity/notification.entity.ts` para mapear a tabela de notificações.

```typescript
// File: apps/api/src/entity/notification.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum NotificationType {
  // Expurgos
  EXPURGO_SOLICITADO = 'EXPURGO_SOLICITADO',
  EXPURGO_APROVADO = 'EXPURGO_APROVADO',
  EXPURGO_REJEITADO = 'EXPURGO_REJEITADO',
  
  // ETL & Sistema
  ETL_CONCLUIDO = 'ETL_CONCLUIDO',
  ETL_FALHOU = 'ETL_FALHOU',

  // Genérico
  INFO = 'INFO',
  AVISO = 'AVISO',
  ERRO = 'ERRO',
}

@Entity({ name: 'notifications' })
@Index('idx_notification_user_read', ['userId', 'isRead'])
export class NotificationEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  userId!: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user?: UserEntity;

  @Column({
    type: 'enum',
    enum: NotificationType,
    default: NotificationType.INFO,
  })
  type!: NotificationType;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  link?: string;

  @Column({ type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;
}
```

#### Passo 1.2: Criar DTOs no Pacote `shared-types`

Adicionar os tipos de dados para notificações em `packages/shared-types/src/dto/notification.dto.ts`.

```typescript
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
export interface NotificationJobData extends CreateNotificationDto {
  // Pode ser um ID de usuário ou um papel (role)
  recipient: { userId?: number; userRole?: 'DIRETOR' | 'GERENTE' };
}
```

#### Passo 1.3: Criar o `NotificationService`

Criar o serviço `apps/api/src/modules/notifications/notification.service.ts`.

```typescript
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
    const notification = this.notificationRepo.create(data);
    await this.notificationRepo.save(notification);

    // TODO: Chamar o WebSocketService para enviar em tempo real
    // this.webSocketService.sendToUser(data.userId, notification);
    console.log(`Notificação criada e despachada para o usuário ${data.userId}`);
  }

  async findByUser(userId: number): Promise<NotificationEntity[]> {
    return this.notificationRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50, // Paginação
    });
  }
  
  // ... outros métodos (markAsRead, getUnreadCount, etc.)
}
```

---

### Fase 2: Backend - Fila e Worker

#### Passo 2.1: Adicionar Job de Notificação na `QueueService`

Editar `apps/api/src/modules/queue/queue.service.ts` para adicionar um método para enfileirar notificações.

```typescript
// Em apps/api/src/modules/queue/queue.service.ts

import { Queue, Worker } from 'bullmq';
import { NotificationJobData } from '@sistema-premiacao/shared-types'; // Importar

export class QueueService {
  public notificationQueue: Queue;
  // ... outras filas

  constructor() {
    // ...
    this.notificationQueue = new Queue('notifications', { connection: redisConnection });
  }

  async addNotificationJob(data: NotificationJobData): Promise<void> {
    await this.notificationQueue.add('new-notification', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
  
  // ... resto do serviço
}
```

#### Passo 2.2: Criar o Worker de Notificações

Criar o arquivo `apps/api/src/workers/notification.worker.ts`. Este é um processo separado que deve ser executado.

```typescript
// File: apps/api/src/workers/notification.worker.ts

import { Worker } from 'bullmq';
import { NotificationService } from '../modules/notifications/notification.service.ts';
import { NotificationJobData } from '@sistema-premiacao/shared-types';
import { UserEntity } from '../entity/user.entity';
import { AppDataSource } from '../database/data-source';

const redisConnection = { host: 'localhost', port: 6379 };

const notificationWorker = new Worker('notifications', async job => {
  const notificationService = new NotificationService();
  const userRepo = AppDataSource.getRepository(UserEntity);
  
  const data = job.data as NotificationJobData;

  console.log(`Processando job de notificação: ${job.id}`, data);

  const findUsers = async (): Promise<UserEntity[]> => {
    if (data.recipient.userId) {
      const user = await userRepo.findOneBy({ id: data.recipient.userId });
      return user ? [user] : [];
    }
    if (data.recipient.userRole) {
      return userRepo.find({ where: { role: data.recipient.userRole } });
    }
    return [];
  };

  const users = await findUsers();

  for (const user of users) {
    await notificationService.createAndDispatch({
      userId: user.id,
      type: data.type,
      message: data.message,
      link: data.link,
    });
  }

}, { connection: redisConnection });

console.log("Notification worker started.");
```

#### Passo 2.3: Integrar Emissão de Eventos no `ExpurgoService`

Modificar `apps/api/src/modules/expurgos/expurgo.service.ts` para despachar jobs para a fila.

```typescript
// Em apps/api/src/modules/expurgos/expurgo.service.ts

// No construtor, injetar o QueueService
// private readonly queueService: QueueService;
// this.queueService = new QueueService();

// Exemplo em `requestExpurgo`
// Após `await this.auditLogService.createLog(...)`
await this.queueService.addNotificationJob({
  recipient: { userRole: 'DIRETOR' },
  type: NotificationType.EXPURGO_SOLICITADO,
  message: `O gerente ${requestingUser.nome} solicitou um novo expurgo para o setor ${sector.nome}.`,
  link: `/admin/expurgos/${savedExpurgo.id}`
});

// Exemplo em `approveExpurgoWithValue`
// Após `await this.auditLogService.createLog(...)`
await this.queueService.addNotificationJob({
  recipient: { userId: expurgo.registradoPorUserId },
  type: NotificationType.EXPURGO_APROVADO,
  message: `Seu expurgo para o critério "${expurgo.criterion?.nome}" foi aprovado.`,
  link: `/expurgos/${updatedExpurgo.id}`
});
```

---

### Fase 3: Backend - API Endpoints

#### Passo 3.1: Criar Rotas para Notificações

Criar o arquivo `apps/api/src/routes/notifications.routes.ts`.

```typescript
// File: apps/api/src/routes/notifications.routes.ts

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { NotificationService } from '../modules/notifications/notification.service';

const notificationRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const notificationService = new NotificationService();

  // Proteger todas as rotas
  fastify.addHook('preHandler', (fastify as any).authenticate);

  fastify.get('/api/notifications', async (request, reply) => {
    const userId = (request as any).user.id;
    const notifications = await notificationService.findByUser(userId);
    reply.send(notifications);
  });

  // ... Implementar as outras rotas:
  // GET /api/notifications/unread-count
  // POST /api/notifications/:id/read
  // POST /api/notifications/mark-all-read
};

export default fp(notificationRoutes);
```
Não esquecer de registrar estas rotas no `server.ts`.

---

### Fase 4: Frontend - UI e Lógica

#### Passo 4.1: Criar Store com Zustand

Criar `apps/web/src/store/notification.store.ts`.

```typescript
// File: apps/web/src/store/notification.store.ts
import { create } from 'zustand';
import { NotificationDto } from '@sistema-premiacao/shared-types';

interface NotificationStore {
  notifications: NotificationDto[];
  unreadCount: number;
  setNotifications: (notifications: NotificationDto[]) => void;
  addNotification: (notification: NotificationDto) => void;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({ 
    notifications,
    unreadCount: notifications.filter(n => !n.isRead).length 
  }),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1,
  })),
  // ... lógica para markAsRead e markAllAsRead
}));
```

#### Passo 4.2: Criar Componentes da UI

1.  **`NotificationBell.tsx`**: Ícone de sino no cabeçalho que mostra `unreadCount` do store.
2.  **`NotificationPanel.tsx`**: Dropdown que abre ao clicar no sino, lista as `notifications` do store e permite marcar como lidas.

#### Passo 4.3: Integrar com WebSocket e API

1.  **Hook `useNotifications.ts`**:
    *   Usar `@tanstack/react-query` para chamar os endpoints `/api/notifications` e `/api/notifications/unread-count` no carregamento da página.
    *   Os dados buscados devem popular o `useNotificationStore`.
    *   Prover mutações para marcar notificações como lidas.

2.  **Lógica do WebSocket**:
    *   Em um componente de layout principal (ex: `_app.tsx` ou um provider), inicializar a conexão WebSocket.
    *   Adicionar um listener para o evento `onmessage`.
    *   Quando uma nova notificação chegar:
        *   Chamar `sonner.info()` para exibir um toast.
        *   Chamar a ação `addNotification` do `useNotificationStore` para atualizar a lista e a contagem em tempo real.

---

### 5. Como Executar

1.  **API Principal**:
    ```bash
    pnpm run dev:api
    ```
2.  **Worker de Notificação (Novo!)**:
    *   Adicionar um novo script no `package.json` da API:
      `"work:notifications": "ts-node -r tsconfig-paths/register src/workers/notification.worker.ts"`
    *   Executar em um terminal separado:
    ```bash
    pnpm --filter @sistema-premiacao/api run work:notifications
    ```
3.  **Frontend**:
    ```bash
    pnpm run dev:web
    ```
