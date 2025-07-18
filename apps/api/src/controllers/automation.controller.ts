// apps/api/src/controllers/automation.controller.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import { AuditLogService } from '../modules/audit/audit.service';
import { AutomationService } from '../modules/automation/automation.service';
import {
  FullETLJobData,
  JobType,
  PartialRecalculationJobData,
  QueueService,
} from '../modules/queue/queue.service';
import { WebSocketService } from '../modules/websocket/websocket.service';

/**
 * Interfaces para as requisições da API
 */
interface TriggerUpdateRequest {
  Body: {
    triggeredBy?: 'manual' | 'automatic' | 'expurgo' | 'meta-change';
    userId?: number;
    partialUpdate?: boolean; // Se true, executa apenas recálculo
    useQueue?: boolean; // Se true, usa sistema de queue (padrão: true)
    priority?: number; // Prioridade do job (1-10)
  };
}

interface GetJobRequest {
  Params: {
    jobId: string;
  };
}

interface CancelJobRequest {
  Params: {
    jobId: string;
  };
}

/**
 * Controller para gerenciar as operações de automação do ETL
 * VERSÃO 2: Integrado com sistema de queue e WebSockets
 */
export class AutomationController {
  private automationService: AutomationService;
  private queueService: QueueService;
  private webSocketService: WebSocketService;

  constructor() {
    this.automationService = new AutomationService();
    this.queueService = new QueueService();
    this.webSocketService = new WebSocketService(this.queueService);

    console.log('[AutomationController] v2 Inicializado com sistema de queue');
  }

  /**
   * Registra rotas WebSocket
   */
  async registerWebSocketRoutes(fastify: any): Promise<void> {
    await this.webSocketService.register(fastify);
  }

  /**
   * POST /api/automation/trigger-update
   * Dispara uma atualização completa ou parcial via queue
   */
  async triggerUpdate(
    request: FastifyRequest<TriggerUpdateRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const {
        triggeredBy = 'manual',
        userId,
        partialUpdate = false,
        useQueue = true, // Por padrão usa queue (FASE 2)
        priority = 5,
      } = request.body;

      console.log(
        `[AutomationController] Solicitação de atualização recebida:`,
        {
          triggeredBy,
          userId,
          partialUpdate,
          useQueue,
          priority,
        }
      );

      // ===== MODO QUEUE (FASE 2) =====
      if (useQueue) {
        let jobId: string;

        if (partialUpdate) {
          // Job de recálculo parcial
          const jobData: PartialRecalculationJobData = {
            triggeredBy: triggeredBy as any,
            userId,
          };

          jobId = await this.queueService.addPartialRecalculationJob(jobData);

          // Notificar via WebSocket
          await this.webSocketService.broadcastJobStarted(
            jobId,
            JobType.PARTIAL_RECALCULATION
          );
        } else {
          // Job de ETL completo
          const jobData: FullETLJobData = {
            triggeredBy: triggeredBy as any,
            userId,
            priority,
          };

          jobId = await this.queueService.addFullETLJob(jobData);

          // Notificar via WebSocket
          await this.webSocketService.broadcastJobStarted(
            jobId,
            JobType.FULL_ETL_UPDATE
          );
        }

        reply.code(202).send({
          success: true,
          message: partialUpdate
            ? 'Recálculo adicionado à queue com sucesso'
            : 'Atualização completa adicionada à queue com sucesso',
          data: {
            jobId,
            status: 'queued',
            mode: 'async',
            websocketEndpoint: '/ws/automation',
          },
        });
        return;
      }

      // ===== MODO SÍNCRONO (FASE 1 - FALLBACK) =====
      console.log(
        '[AutomationController] Executando em modo síncrono (fallback)'
      );

      const options = { triggeredBy, userId };
      const result = partialUpdate
        ? await this.automationService.runPartialRecalculation(options)
        : await this.automationService.runFullUpdateForActivePeriod(options);

      if (result.success) {
        reply.code(200).send({
          success: true,
          message: partialUpdate
            ? 'Recálculo executado com sucesso'
            : 'Atualização completa executada com sucesso',
          data: { ...result, mode: 'sync' },
        });
      } else {
        reply.code(500).send({
          success: false,
          message: 'Erro durante a execução',
          error: result.error,
          data: { ...result, mode: 'sync' },
        });
      }
    } catch (error) {
      console.error(
        '[AutomationController] Erro ao processar triggerUpdate:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      reply.code(500).send({
        success: false,
        message: 'Erro ao iniciar atualização',
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/automation/jobs/:jobId
   * Retorna o progresso de um job específico
   */
  async getJobProgress(
    request: FastifyRequest<GetJobRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { jobId } = request.params;

      const progress = await this.queueService.getJobProgress(jobId);

      if (!progress) {
        reply.code(404).send({
          success: false,
          message: 'Job não encontrado',
          data: null,
        });
        return;
      }

      reply.code(200).send({
        success: true,
        message: 'Progresso do job recuperado',
        data: progress,
      });
    } catch (error) {
      console.error(
        '[AutomationController] Erro ao buscar progresso do job:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      reply.code(500).send({
        success: false,
        message: 'Erro ao buscar progresso do job',
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/automation/jobs
   * Lista todos os jobs ativos
   */
  async getActiveJobs(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const activeJobs = await this.queueService.getActiveJobs();
      const clientStats = this.webSocketService.getClientStats();

      reply.code(200).send({
        success: true,
        message: 'Jobs ativos recuperados',
        data: {
          jobs: activeJobs,
          totalJobs: activeJobs.length,
          websocketClients: clientStats.totalClients,
          activeSubscriptions: clientStats.activeSubscriptions,
        },
      });
    } catch (error) {
      console.error(
        '[AutomationController] Erro ao buscar jobs ativos:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      reply.code(500).send({
        success: false,
        message: 'Erro ao buscar jobs ativos',
        error: errorMessage,
      });
    }
  }

  /**
   * DELETE /api/automation/jobs/:jobId
   * Cancela um job específico
   */
  async cancelJob(
    request: FastifyRequest<CancelJobRequest>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { jobId } = request.params;

      const cancelled = await this.queueService.cancelJob(jobId);

      if (!cancelled) {
        reply.code(404).send({
          success: false,
          message: 'Job não encontrado ou não pode ser cancelado',
          data: null,
        });
        return;
      }

      // Notificar via WebSocket
      await this.webSocketService.broadcastJobCancelled(jobId);

      reply.code(200).send({
        success: true,
        message: 'Job cancelado com sucesso',
        data: { jobId, status: 'cancelled' },
      });
    } catch (error) {
      console.error('[AutomationController] Erro ao cancelar job:', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      reply.code(500).send({
        success: false,
        message: 'Erro ao cancelar job',
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/automation/active-period
   * Retorna informações da vigência ativa (mantido da FASE 1)
   */
  async getActivePeriod(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const activePeriod = await this.automationService.getActivePeriodInfo();

      if (!activePeriod) {
        reply.code(404).send({
          success: false,
          message: 'Nenhuma vigência ativa encontrada',
          data: null,
        });
        return;
      }

      reply.code(200).send({
        success: true,
        message: 'Vigência ativa encontrada',
        data: {
          id: activePeriod.id,
          mesAno: activePeriod.mesAno,
          dataInicio: activePeriod.dataInicio,
          dataFim: activePeriod.dataFim,
          status: activePeriod.status,
          createdAt: activePeriod.createdAt,
          updatedAt: activePeriod.updatedAt,
        },
      });
    } catch (error) {
      console.error(
        '[AutomationController] Erro ao buscar vigência ativa:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      reply.code(500).send({
        success: false,
        message: 'Erro ao buscar vigência ativa',
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/automation/trigger-expurgo-recalculation
   * Específico para recálculo após aprovação de expurgo (via queue)
   */
  async triggerExpurgoRecalculation(
    request: FastifyRequest<{ Body: { userId?: number; expurgoId?: number } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userId, expurgoId } = request.body;

      console.log(`[AutomationController] Recálculo pós-expurgo solicitado:`, {
        userId,
        expurgoId,
      });

      // Usar queue para recálculo pós-expurgo
      const jobData: PartialRecalculationJobData = {
        triggeredBy: 'expurgo',
        userId,
        expurgoId,
      };

      const jobId = await this.queueService.addPartialRecalculationJob(jobData);

      // Notificar via WebSocket
      await this.webSocketService.broadcastJobStarted(
        jobId,
        JobType.PARTIAL_RECALCULATION
      );

      reply.code(202).send({
        success: true,
        message: 'Recálculo pós-expurgo adicionado à queue com sucesso',
        data: {
          jobId,
          expurgoId,
          status: 'queued',
          websocketEndpoint: '/ws/automation',
        },
      });
    } catch (error) {
      console.error(
        '[AutomationController] Erro ao processar recálculo pós-expurgo:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      reply.code(500).send({
        success: false,
        message: 'Erro ao executar recálculo pós-expurgo',
        error: errorMessage,
      });
    }
  }

  /**
   * GET /api/automation/status
   * Retorna status geral do sistema de automação (expandido na FASE 2)
   */
  async getSystemStatus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const activePeriod = await this.automationService.getActivePeriodInfo();
      const activeJobs = await this.queueService.getActiveJobs();
      const clientStats = this.webSocketService.getClientStats();

      reply.code(200).send({
        success: true,
        data: {
          hasActivePeriod: !!activePeriod,
          activePeriod: activePeriod
            ? {
                id: activePeriod.id,
                mesAno: activePeriod.mesAno,
                status: activePeriod.status,
              }
            : null,
          systemReady: !!activePeriod,
          queueStatus: {
            activeJobs: activeJobs.length,
            processingJobs: activeJobs.filter((job) => job.status === 'active')
              .length,
            waitingJobs: activeJobs.filter((job) => job.status === 'waiting')
              .length,
          },
          websocketStatus: {
            connectedClients: clientStats.totalClients,
            activeSubscriptions: clientStats.activeSubscriptions,
          },
          lastUpdate: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(
        '[AutomationController] Erro ao buscar status do sistema:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      reply.code(500).send({
        success: false,
        message: 'Erro ao buscar status do sistema',
        error: errorMessage,
      });
    }
  }

  /**
   * POST /api/automation/validate-period
   * Valida se é possível executar operações na vigência ativa (mantido da FASE 1)
   */
  async validateActivePeriod(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const activePeriod =
        await this.automationService.validateAndGetActivePeriod();

      reply.code(200).send({
        success: true,
        message: 'Vigência ativa válida para operações',
        data: {
          id: activePeriod.id,
          mesAno: activePeriod.mesAno,
          status: activePeriod.status,
          canUpdate: true,
        },
      });
    } catch (error) {
      console.error(
        '[AutomationController] Erro na validação de vigência:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      reply.code(400).send({
        success: false,
        message: 'Vigência não válida para operações',
        error: errorMessage,
        data: {
          canUpdate: false,
        },
      });
    }
  }

  /**
   * GET /api/automation/last-execution
   * Retorna dados da última execução ETL bem-sucedida
   * ROTA PÚBLICA - Não requer autenticação
   */
  /**
   * GET /api/automation/last-execution
   * Retorna dados da última execução ETL bem-sucedida
   * ROTA PÚBLICA - Não requer autenticação
   */
  async getLastExecution(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      console.log(
        '[AutomationController] Solicitação de última execução ETL recebida'
      );

      // Instanciar AuditLogService
      const auditLogService = new AuditLogService();

      // Buscar última execução via AuditLogService
      const lastExecution =
        await auditLogService.getLastSuccessfulETLExecution();

      if (!lastExecution) {
        reply.code(200).send({
          success: true,
          message: 'Nenhuma execução ETL encontrada',
          data: {
            lastExecution: null,
            hasExecutions: false,
          },
        });
        return;
      }

      // Formatar resposta para o frontend
      const response = {
        success: true,
        message: 'Última execução ETL encontrada',
        data: {
          lastExecution: {
            executedAt: lastExecution.executedAt,
            status: lastExecution.status,
            durationMs: lastExecution.durationMs,
            durationFormatted: lastExecution.durationMs
              ? this.formatDuration(lastExecution.durationMs)
              : null,
            recordsProcessed: lastExecution.recordsProcessed,
            triggeredBy: lastExecution.triggeredBy,
            periodProcessed: lastExecution.periodProcessed,
            executedAtFormatted: this.formatDateTime(lastExecution.executedAt),
            relativeTime: this.getRelativeTime(lastExecution.executedAt),
          },
          hasExecutions: true,
          timestamp: new Date().toISOString(),
        },
      };

      console.log('[AutomationController] Última execução ETL retornada:', {
        executedAt: lastExecution.executedAt,
        status: lastExecution.status,
        triggeredBy: lastExecution.triggeredBy,
      });

      reply.code(200).send(response);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno';

      console.error(
        '[AutomationController] Erro ao buscar última execução ETL:',
        error
      );

      reply.code(500).send({
        success: false,
        message: 'Erro ao consultar última execução ETL',
        error: errorMessage,
        data: {
          lastExecution: null,
          hasExecutions: false,
        },
      });
    }
  }

  /**
   * GET /api/automation/execution-history
   * Retorna histórico de execuções ETL
   * ROTA PÚBLICA - Não requer autenticação
   */
  async getExecutionHistory(
    request: FastifyRequest<{
      Querystring: {
        limit?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const limit = parseInt(request.query.limit || '10', 10);
      const maxLimit = 50;
      const actualLimit = Math.min(Math.max(limit, 1), maxLimit);

      console.log(
        `[AutomationController] Solicitação de histórico ETL com limite: ${actualLimit}`
      );

      // Instanciar AuditLogService
      const auditLogService = new AuditLogService();
      const history = await auditLogService.getETLExecutionHistory(actualLimit);

      const formattedHistory = history.map((execution) => ({
        executedAt: execution.executedAt,
        status: execution.status,
        durationMs: execution.durationMs,
        durationFormatted: execution.durationMs
          ? this.formatDuration(execution.durationMs)
          : null,
        recordsProcessed: execution.recordsProcessed,
        triggeredBy: execution.triggeredBy,
        periodProcessed: execution.periodProcessed,
        executedAtFormatted: this.formatDateTime(execution.executedAt),
        relativeTime: this.getRelativeTime(execution.executedAt),
      }));

      reply.code(200).send({
        success: true,
        message: `Histórico de ${formattedHistory.length} execuções ETL`,
        data: {
          executions: formattedHistory,
          total: formattedHistory.length,
          limit: actualLimit,
          hasMore: formattedHistory.length === actualLimit,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno';

      console.error(
        '[AutomationController] Erro ao buscar histórico ETL:',
        error
      );

      reply.code(500).send({
        success: false,
        message: 'Erro ao consultar histórico de execuções ETL',
        error: errorMessage,
        data: {
          executions: [],
          total: 0,
          limit: 10,
          hasMore: false,
        },
      });
    }
  }

  // Métodos utilitários privados para formatação
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`;
    return `${(ms / 3600000).toFixed(1)}h`;
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(date));
  }

  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return 'há menos de 1 minuto';
    if (minutes < 60) return `há ${minutes} minuto${minutes > 1 ? 's' : ''}`;
    if (hours < 24) return `há ${hours} hora${hours > 1 ? 's' : ''}`;
    if (days < 30) return `há ${days} dia${days > 1 ? 's' : ''}`;

    return this.formatDateTime(date);
  }

  /**
   * Limpa recursos quando o controller é encerrado
   */
  async cleanup(): Promise<void> {
    console.log('[AutomationController] Limpando recursos...');

    await this.queueService.cleanup();
    this.webSocketService.cleanup();

    console.log('[AutomationController] Recursos limpos');
  }
}
