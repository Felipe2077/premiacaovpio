// apps/api/src/modules/queue/queue.service.ts
import { Job, JobsOptions, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import {
  AutomationService,
  UpdateOptions,
  UpdateResult,
} from '../automation/automation.service';

/**
 * Tipos de jobs disponíveis no sistema
 */
export enum JobType {
  FULL_ETL_UPDATE = 'full-etl-update',
  PARTIAL_RECALCULATION = 'partial-recalculation',
  SCHEDULED_UPDATE = 'scheduled-update',
  DATA_VALIDATION = 'data-validation',
}

/**
 * Status detalhado de um job
 */
export enum JobStatus {
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DELAYED = 'delayed',
  PAUSED = 'paused',
}

/**
 * Dados do job para ETL completo
 */
export interface FullETLJobData {
  triggeredBy: 'manual' | 'automatic' | 'expurgo' | 'meta-change';
  userId?: number;
  periodId?: number;
  priority?: number;
}

/**
 * Dados do job para recálculo parcial
 */
export interface PartialRecalculationJobData {
  triggeredBy: 'expurgo' | 'meta-change' | 'manual' | 'automatic';
  userId?: number;
  periodId?: number;
  expurgoId?: number;
}

/**
 * Dados do job agendado
 */
export interface ScheduledUpdateJobData {
  cronPattern: string;
  triggeredBy: 'automatic';
  enabled: boolean;
  nextRun?: Date;
}

/**
 * Progresso de um job
 */
export interface JobProgress {
  jobId: string;
  type: JobType;
  status: JobStatus;
  progress: number; // 0-100
  currentStep?: string;
  startedAt?: Date;
  estimatedTimeRemaining?: number; // segundos
  error?: string;
  result?: UpdateResult;
}

/**
 * Configurações do Redis (compatível com BullMQ)
 */
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  maxRetriesPerRequest: null; // ✅ OBRIGATÓRIO para BullMQ
}

/**
 * Serviço central para gerenciar queue de jobs de automação
 * Usa BullMQ para processamento assíncrono de longa duração
 */
export class QueueService {
  private redisConnection: IORedis;
  private automationQueue: Queue;
  private automationWorker: Worker;
  private automationService: AutomationService;

  // Cache de progresso dos jobs ativos
  private jobProgressCache = new Map<string, JobProgress>();

  constructor() {
    console.log('[QueueService] Inicializando sistema de queue...');

    // Configuração do Redis (CORRIGIDA para BullMQ)
    const redisConfig: RedisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      maxRetriesPerRequest: null, // ✅ OBRIGATÓRIO para BullMQ
    };

    // Conexão Redis compartilhada
    this.redisConnection = new IORedis(redisConfig);

    // Instanciar AutomationService (reutiliza o da FASE 1)
    this.automationService = new AutomationService();

    // Configurar Queue e Worker
    this.setupQueue();
    this.setupWorker();

    console.log('[QueueService] Sistema de queue inicializado com sucesso!');
  }

  /**
   * Configura a queue de automação
   */
  private setupQueue(): void {
    this.automationQueue = new Queue('automation-queue', {
      connection: this.redisConnection,
      defaultJobOptions: {
        removeOnComplete: 50, // Manter 50 jobs concluídos
        removeOnFail: 100, // Manter 100 jobs falhados
        attempts: parseInt(process.env.QUEUE_RETRY_ATTEMPTS || '3'),
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    });

    console.log('[QueueService] Queue configurada');
  }

  /**
   * Configura o worker para processar jobs
   */
  private setupWorker(): void {
    const concurrency = parseInt(process.env.QUEUE_CONCURRENCY || '1');

    this.automationWorker = new Worker(
      'automation-queue',
      async (job: Job) => {
        console.log(`[QueueService] Processando job ${job.id} (${job.name})`);

        // Atualizar cache de progresso
        this.updateJobProgress(job.id!, {
          jobId: job.id!,
          type: job.name as JobType,
          status: JobStatus.ACTIVE,
          progress: 0,
          startedAt: new Date(),
          currentStep: 'Iniciando...',
        });

        try {
          let result: UpdateResult;

          switch (job.name) {
            case JobType.FULL_ETL_UPDATE:
              result = await this.processFullETLJob(job);
              break;

            case JobType.PARTIAL_RECALCULATION:
              result = await this.processPartialRecalculationJob(job);
              break;

            case JobType.SCHEDULED_UPDATE:
              result = await this.processScheduledUpdateJob(job);
              break;

            case JobType.DATA_VALIDATION:
              result = await this.processDataValidationJob(job);
              break;

            default:
              throw new Error(`Tipo de job desconhecido: ${job.name}`);
          }

          // Atualizar progresso final
          this.updateJobProgress(job.id!, {
            jobId: job.id!,
            type: job.name as JobType,
            status: JobStatus.COMPLETED,
            progress: 100,
            currentStep: 'Concluído',
            result,
          });

          console.log(`[QueueService] ✅ Job ${job.id} concluído com sucesso`);
          return result;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Erro desconhecido';

          // Atualizar progresso com erro
          this.updateJobProgress(job.id!, {
            jobId: job.id!,
            type: job.name as JobType,
            status: JobStatus.FAILED,
            progress: 0,
            error: errorMessage,
          });

          console.error(`[QueueService] ❌ Job ${job.id} falhou:`, error);
          throw error;
        }
      },
      {
        connection: this.redisConnection,
        concurrency,
      }
    );

    // Event listeners do worker
    this.automationWorker.on('completed', (job, result) => {
      console.log(`[QueueService] 🎉 Job ${job.id} concluído:`, result);
    });

    this.automationWorker.on('failed', (job, err) => {
      console.error(`[QueueService] ❌ Job ${job?.id} falhou:`, err.message);
    });

    this.automationWorker.on('progress', (job, progress) => {
      this.updateJobProgress(job.id!, {
        jobId: job.id!,
        type: job.name as JobType,
        status: JobStatus.ACTIVE,
        progress: typeof progress === 'number' ? progress : 50,
      });
    });

    console.log(
      `[QueueService] Worker configurado com concorrência: ${concurrency}`
    );
  }

  /**
   * Adiciona um job de ETL completo à queue
   */
  async addFullETLJob(
    data: FullETLJobData,
    options?: JobsOptions
  ): Promise<string> {
    console.log(`[QueueService] Adicionando job de ETL completo...`);

    const job = await this.automationQueue.add(JobType.FULL_ETL_UPDATE, data, {
      priority: data.priority || 10,
      delay: options?.delay || 0,
      ...options,
    });

    console.log(
      `[QueueService] Job de ETL completo adicionado com ID: ${job.id}`
    );
    return job.id!;
  }

  /**
   * Adiciona um job de recálculo parcial à queue
   */
  async addPartialRecalculationJob(
    data: PartialRecalculationJobData,
    options?: JobsOptions
  ): Promise<string> {
    console.log(`[QueueService] Adicionando job de recálculo parcial...`);

    const job = await this.automationQueue.add(
      JobType.PARTIAL_RECALCULATION,
      data,
      {
        priority: 5, // Prioridade alta para recálculos
        ...options,
      }
    );

    console.log(
      `[QueueService] Job de recálculo parcial adicionado com ID: ${job.id}`
    );
    return job.id!;
  }

  /**
   * Adiciona um job agendado à queue
   */
  async addScheduledUpdateJob(
    data: ScheduledUpdateJobData,
    options?: JobsOptions
  ): Promise<string> {
    console.log(`[QueueService] Adicionando job agendado...`);

    const job = await this.automationQueue.add(JobType.SCHEDULED_UPDATE, data, {
      repeat: { pattern: data.cronPattern },
      ...options,
    });

    console.log(`[QueueService] Job agendado adicionado com ID: ${job.id}`);
    return job.id!;
  }

  /**
   * Processa job de ETL completo
   */
  private async processFullETLJob(
    job: Job<FullETLJobData>
  ): Promise<UpdateResult> {
    const { triggeredBy, userId } = job.data;

    // Atualizar progresso: Validando
    await job.updateProgress(10);
    this.updateJobProgress(job.id!, {
      currentStep: 'Validando vigência ativa...',
    });

    const options: UpdateOptions = { triggeredBy, userId };

    // Chamar o AutomationService da FASE 1
    const result =
      await this.automationService.runFullUpdateForActivePeriod(options);

    await job.updateProgress(100);
    return result;
  }

  /**
   * Processa job de recálculo parcial
   */
  private async processPartialRecalculationJob(
    job: Job<PartialRecalculationJobData>
  ): Promise<UpdateResult> {
    const { triggeredBy, userId } = job.data;

    await job.updateProgress(20);
    this.updateJobProgress(job.id!, { currentStep: 'Recalculando dados...' });

    const options: UpdateOptions = { triggeredBy, userId };
    const result =
      await this.automationService.runPartialRecalculation(options);

    await job.updateProgress(100);
    return result;
  }

  /**
   * Processa job agendado
   */
  private async processScheduledUpdateJob(
    job: Job<ScheduledUpdateJobData>
  ): Promise<UpdateResult> {
    await job.updateProgress(5);
    this.updateJobProgress(job.id!, {
      currentStep: 'Executando atualização agendada...',
    });

    const options: UpdateOptions = { triggeredBy: 'automatic' };
    const result =
      await this.automationService.runFullUpdateForActivePeriod(options);

    await job.updateProgress(100);
    return result;
  }

  /**
   * Processa job de validação de dados
   */
  private async processDataValidationJob(job: Job): Promise<UpdateResult> {
    await job.updateProgress(50);
    this.updateJobProgress(job.id!, { currentStep: 'Validando dados...' });

    // TODO: Implementar validação de dados
    console.log('[QueueService] Validação de dados - TODO');

    await job.updateProgress(100);
    return {
      success: true,
      periodId: 0,
      periodMesAno: '',
      executionTimeMs: 1000,
      recordsProcessed: {
        rawRecords: 0,
        performanceRecords: 0,
        rankingRecords: 0,
      },
      triggeredBy: 'manual',
    };
  }

  /**
   * Atualiza o cache de progresso de um job
   */
  private updateJobProgress(
    jobId: string,
    partialProgress: Partial<JobProgress>
  ): void {
    const existingProgress = this.jobProgressCache.get(jobId) || {
      jobId,
      type: JobType.FULL_ETL_UPDATE,
      status: JobStatus.WAITING,
      progress: 0,
    };

    const updatedProgress = { ...existingProgress, ...partialProgress };
    this.jobProgressCache.set(jobId, updatedProgress);
  }

  /**
   * Obtém o progresso de um job específico
   */
  async getJobProgress(jobId: string): Promise<JobProgress | null> {
    // Primeiro verifica o cache
    const cachedProgress = this.jobProgressCache.get(jobId);
    if (cachedProgress) {
      return cachedProgress;
    }

    // Se não estiver no cache, busca da queue
    const job = await this.automationQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const progress: JobProgress = {
      jobId: job.id!,
      type: job.name as JobType,
      status: this.mapBullMQStateToJobStatus(await job.getState()),
      progress: (job.progress as number) || 0,
      startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
    };

    return progress;
  }

  /**
   * Lista todos os jobs ativos
   */
  async getActiveJobs(): Promise<JobProgress[]> {
    const activeJobs = await this.automationQueue.getActive();
    const waitingJobs = await this.automationQueue.getWaiting();

    const allJobs = [...activeJobs, ...waitingJobs];

    return allJobs.map((job) => ({
      jobId: job.id!,
      type: job.name as JobType,
      status: this.mapBullMQStateToJobStatus(
        job.opts.delay ? JobStatus.DELAYED : JobStatus.ACTIVE
      ),
      progress: (job.progress as number) || 0,
      startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
    }));
  }

  /**
   * Cancela um job específico
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.automationQueue.getJob(jobId);
      if (!job) {
        return false;
      }

      await job.remove();
      this.jobProgressCache.delete(jobId);

      console.log(`[QueueService] Job ${jobId} cancelado`);
      return true;
    } catch (error) {
      console.error(`[QueueService] Erro ao cancelar job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Mapeia estados do BullMQ para nossos status
   */
  private mapBullMQStateToJobStatus(state: string): JobStatus {
    switch (state) {
      case 'waiting':
        return JobStatus.WAITING;
      case 'active':
        return JobStatus.ACTIVE;
      case 'completed':
        return JobStatus.COMPLETED;
      case 'failed':
        return JobStatus.FAILED;
      case 'delayed':
        return JobStatus.DELAYED;
      case 'paused':
        return JobStatus.PAUSED;
      default:
        return JobStatus.WAITING;
    }
  }

  /**
   * Limpa recursos quando o serviço é encerrado
   */
  async cleanup(): Promise<void> {
    console.log('[QueueService] Limpando recursos...');

    await this.automationWorker.close();
    await this.automationQueue.close();
    this.redisConnection.disconnect();

    console.log('[QueueService] Recursos limpos');
  }
}
