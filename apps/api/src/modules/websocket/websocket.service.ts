// apps/api/src/modules/websocket/websocket.service.ts
import { FastifyInstance } from 'fastify';
import { JobProgress, JobType, QueueService } from '../queue/queue.service';

/**
 * Tipos de mensagens WebSocket
 */
export enum WSMessageType {
  JOB_PROGRESS = 'job-progress',
  JOB_STARTED = 'job-started',
  JOB_COMPLETED = 'job-completed',
  JOB_FAILED = 'job-failed',
  JOB_CANCELLED = 'job-cancelled',
  SYSTEM_STATUS = 'system-status',
  ERROR = 'error',
}

/**
 * Estrutura de mensagem WebSocket
 */
export interface WSMessage {
  type: WSMessageType;
  data: any;
  timestamp: string;
  jobId?: string;
}

/**
 * Cliente WebSocket conectado
 */
interface WSClient {
  id: string;
  socket: any; // Tipo genérico para WebSocket do Fastify
  userId?: number;
  subscribedJobs: Set<string>;
  lastPing: Date;
}

/**
 * Status do sistema de automação
 */
interface SystemStatus {
  activeJobs: number;
  queueSize: number;
  lastUpdate: Date;
  redisConnected: boolean;
}

/**
 * Serviço WebSocket para comunicação em tempo real
 * Fornece updates de progresso dos jobs de automação
 */
export class WebSocketService {
  private clients = new Map<string, WSClient>();
  private queueService: QueueService;
  private pingInterval: NodeJS.Timeout;

  constructor(queueService: QueueService) {
    this.queueService = queueService;
    console.log('[WebSocketService] Inicializado');

    // Ping periódico para manter conexões vivas
    this.pingInterval = setInterval(() => {
      this.pingClients();
    }, 30000); // 30 segundos
  }

  /**
   * Registra rotas WebSocket no Fastify
   */
  async register(fastify: FastifyInstance): Promise<void> {
    // Registrar plugin WebSocket
    await fastify.register(require('@fastify/websocket'));

    // Capturar referência para o contexto
    const self = this;

    // Rota principal do WebSocket
    fastify.register(async function (fastify) {
      (fastify as any).get(
        '/ws/automation',
        { websocket: true },
        (connection: any, req: any) => {
          const clientId = self.generateClientId();
          const client: WSClient = {
            id: clientId,
            socket: connection.socket,
            subscribedJobs: new Set(),
            lastPing: new Date(),
          };

          self.clients.set(clientId, client);
          console.log(`[WebSocketService] Cliente ${clientId} conectado`);

          // Configurar event listeners
          connection.socket.on('message', (message: Buffer) => {
            self.handleMessage(client, message);
          });

          connection.socket.on('close', () => {
            self.clients.delete(clientId);
            console.log(`[WebSocketService] Cliente ${clientId} desconectado`);
          });

          connection.socket.on('error', (error: any) => {
            console.error(
              `[WebSocketService] Erro no cliente ${clientId}:`,
              error
            );
            self.clients.delete(clientId);
          });

          // Enviar status inicial
          self.sendSystemStatus(client);
        }
      );
    });

    console.log('[WebSocketService] Rotas WebSocket registradas');
  }

  /**
   * Processa mensagens recebidas dos clientes
   */
  private handleMessage(client: WSClient, rawMessage: Buffer): void {
    try {
      const message = JSON.parse(rawMessage.toString());

      switch (message.type) {
        case 'subscribe-job':
          this.subscribeToJob(client, message.jobId);
          break;

        case 'unsubscribe-job':
          this.unsubscribeFromJob(client, message.jobId);
          break;

        case 'get-job-progress':
          this.sendJobProgress(client, message.jobId);
          break;

        case 'get-system-status':
          this.sendSystemStatus(client);
          break;

        case 'ping':
          client.lastPing = new Date();
          this.sendMessage(client, {
            type: WSMessageType.SYSTEM_STATUS,
            data: 'pong',
            timestamp: new Date().toISOString(),
          });
          break;

        default:
          console.warn(
            `[WebSocketService] Tipo de mensagem desconhecido: ${message.type}`
          );
      }
    } catch (error) {
      console.error('[WebSocketService] Erro ao processar mensagem:', error);
      this.sendError(client, 'Formato de mensagem inválido');
    }
  }

  /**
   * Inscreve cliente para receber updates de um job específico
   */
  private subscribeToJob(client: WSClient, jobId: string): void {
    client.subscribedJobs.add(jobId);
    console.log(
      `[WebSocketService] Cliente ${client.id} inscrito no job ${jobId}`
    );

    // Enviar progresso atual do job
    this.sendJobProgress(client, jobId);
  }

  /**
   * Remove inscrição do cliente de um job
   */
  private unsubscribeFromJob(client: WSClient, jobId: string): void {
    client.subscribedJobs.delete(jobId);
    console.log(
      `[WebSocketService] Cliente ${client.id} desinscrito do job ${jobId}`
    );
  }

  /**
   * Envia progresso de um job específico para um cliente
   */
  private async sendJobProgress(
    client: WSClient,
    jobId: string
  ): Promise<void> {
    try {
      const progress = await this.queueService.getJobProgress(jobId);
      if (progress) {
        this.sendMessage(client, {
          type: WSMessageType.JOB_PROGRESS,
          data: progress,
          timestamp: new Date().toISOString(),
          jobId,
        });
      }
    } catch (error) {
      console.error(
        `[WebSocketService] Erro ao buscar progresso do job ${jobId}:`,
        error
      );
      this.sendError(client, `Erro ao buscar progresso do job ${jobId}`);
    }
  }

  /**
   * Envia status do sistema para um cliente
   */
  private async sendSystemStatus(client: WSClient): Promise<void> {
    try {
      const activeJobs = await this.queueService.getActiveJobs();
      const systemStatus: SystemStatus = {
        activeJobs: activeJobs.length,
        queueSize: activeJobs.filter((job) => job.status === 'waiting').length,
        lastUpdate: new Date(),
        redisConnected: true, // TODO: Verificar conexão Redis real
      };

      this.sendMessage(client, {
        type: WSMessageType.SYSTEM_STATUS,
        data: systemStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        '[WebSocketService] Erro ao buscar status do sistema:',
        error
      );
      this.sendError(client, 'Erro ao buscar status do sistema');
    }
  }

  /**
   * Envia mensagem para um cliente específico
   */
  private sendMessage(client: WSClient, message: WSMessage): void {
    try {
      if (client.socket && client.socket.readyState === 1) {
        // 1 = OPEN
        client.socket.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error('[WebSocketService] Erro ao enviar mensagem:', error);
    }
  }

  /**
   * Envia erro para um cliente
   */
  private sendError(client: WSClient, errorMessage: string): void {
    this.sendMessage(client, {
      type: WSMessageType.ERROR,
      data: { error: errorMessage },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Transmite atualização de job para todos os clientes inscritos
   */
  async broadcastJobUpdate(
    jobId: string,
    progress: JobProgress
  ): Promise<void> {
    const message: WSMessage = {
      type: WSMessageType.JOB_PROGRESS,
      data: progress,
      timestamp: new Date().toISOString(),
      jobId,
    };

    // Enviar para todos os clientes inscritos neste job
    for (const client of this.clients.values()) {
      if (client.subscribedJobs.has(jobId)) {
        this.sendMessage(client, message);
      }
    }

    console.log(
      `[WebSocketService] Progresso do job ${jobId} transmitido para ${this.getSubscribedClientCount(jobId)} clientes`
    );
  }

  /**
   * Notifica quando um job inicia
   */
  async broadcastJobStarted(jobId: string, jobType: JobType): Promise<void> {
    const message: WSMessage = {
      type: WSMessageType.JOB_STARTED,
      data: { jobId, jobType },
      timestamp: new Date().toISOString(),
      jobId,
    };

    this.broadcastToAllClients(message);
  }

  /**
   * Notifica quando um job é concluído
   */
  async broadcastJobCompleted(jobId: string, result: any): Promise<void> {
    const message: WSMessage = {
      type: WSMessageType.JOB_COMPLETED,
      data: { jobId, result },
      timestamp: new Date().toISOString(),
      jobId,
    };

    this.broadcastToSubscribedClients(jobId, message);
  }

  /**
   * Notifica quando um job falha
   */
  async broadcastJobFailed(jobId: string, error: string): Promise<void> {
    const message: WSMessage = {
      type: WSMessageType.JOB_FAILED,
      data: { jobId, error },
      timestamp: new Date().toISOString(),
      jobId,
    };

    this.broadcastToSubscribedClients(jobId, message);
  }

  /**
   * Notifica quando um job é cancelado
   */
  async broadcastJobCancelled(jobId: string): Promise<void> {
    const message: WSMessage = {
      type: WSMessageType.JOB_CANCELLED,
      data: { jobId },
      timestamp: new Date().toISOString(),
      jobId,
    };

    this.broadcastToSubscribedClients(jobId, message);
  }

  /**
   * Transmite mensagem para todos os clientes conectados
   */
  private broadcastToAllClients(message: WSMessage): void {
    for (const client of this.clients.values()) {
      this.sendMessage(client, message);
    }
  }

  /**
   * Transmite mensagem para clientes inscritos em um job específico
   */
  private broadcastToSubscribedClients(
    jobId: string,
    message: WSMessage
  ): void {
    for (const client of this.clients.values()) {
      if (client.subscribedJobs.has(jobId)) {
        this.sendMessage(client, message);
      }
    }
  }

  /**
   * Conta quantos clientes estão inscritos em um job
   */
  private getSubscribedClientCount(jobId: string): number {
    let count = 0;
    for (const client of this.clients.values()) {
      if (client.subscribedJobs.has(jobId)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Envia ping para todos os clientes para manter conexões vivas
   */
  private pingClients(): void {
    const now = new Date();
    const clientsToRemove: string[] = [];

    for (const [clientId, client] of this.clients.entries()) {
      const timeSinceLastPing = now.getTime() - client.lastPing.getTime();

      // Se cliente não respondeu por 2 minutos, remover
      if (timeSinceLastPing > 120000) {
        clientsToRemove.push(clientId);
        continue;
      }

      // Enviar ping
      try {
        if (client.socket && client.socket.readyState === 1) {
          // 1 = OPEN
          this.sendMessage(client, {
            type: WSMessageType.SYSTEM_STATUS,
            data: 'ping',
            timestamp: now.toISOString(),
          });
        } else {
          clientsToRemove.push(clientId);
        }
      } catch (error) {
        clientsToRemove.push(clientId);
      }
    }

    // Remover clientes desconectados
    for (const clientId of clientsToRemove) {
      this.clients.delete(clientId);
      console.log(
        `[WebSocketService] Cliente ${clientId} removido (timeout ou desconectado)`
      );
    }

    if (this.clients.size > 0) {
      console.log(
        `[WebSocketService] Ping enviado para ${this.clients.size} clientes`
      );
    }
  }

  /**
   * Gera ID único para cliente
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtém estatísticas dos clientes conectados
   */
  getClientStats(): { totalClients: number; activeSubscriptions: number } {
    let activeSubscriptions = 0;
    for (const client of this.clients.values()) {
      activeSubscriptions += client.subscribedJobs.size;
    }

    return {
      totalClients: this.clients.size,
      activeSubscriptions,
    };
  }

  /**
   * Limpa recursos quando o serviço é encerrado
   */
  cleanup(): void {
    console.log('[WebSocketService] Limpando recursos...');

    // Limpar interval de ping
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    // Fechar todas as conexões
    for (const client of this.clients.values()) {
      try {
        if (client.socket && client.socket.readyState === 1) {
          // 1 = OPEN
          client.socket.close(1000, 'Servidor encerrando');
        }
      } catch (error) {
        // Ignorar erros ao fechar conexões já fechadas
      }
    }

    this.clients.clear();
    console.log('[WebSocketService] Recursos limpos');
  }
}
