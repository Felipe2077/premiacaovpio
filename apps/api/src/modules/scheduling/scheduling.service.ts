// apps/api/src/modules/scheduling/scheduling.service.ts
import { AppDataSource } from '@/database/data-source';
import {
  AdvancedScheduleConfig,
  ScheduleConfigEntity,
  ScheduleFrequency,
  ScheduleJobType,
  ScheduleStatus,
  WeekDaysConfig,
} from '@/entity/schedule-config.entity';
import { UserEntity } from '@/entity/user.entity';
import * as cron from 'node-cron';
import { Repository } from 'typeorm';
import { AuditLogService } from '../audit/audit.service';
import { AutomationService } from '../automation/automation.service';
import { QueueService } from '../queue/queue.service';

/**
 * DTO para criação de agendamento
 */
export interface CreateScheduleDto {
  name: string;
  description?: string;
  frequency: ScheduleFrequency;
  timeOfDay: string; // HH:MM
  weekDays?: WeekDaysConfig;
  dayOfMonth?: number;
  jobType: ScheduleJobType;
  jobOptions?: Record<string, any>;
  advancedConfig?: Partial<AdvancedScheduleConfig>;
}

/**
 * DTO para atualização de agendamento
 */
export interface UpdateScheduleDto {
  name?: string;
  description?: string;
  frequency?: ScheduleFrequency;
  timeOfDay?: string;
  weekDays?: WeekDaysConfig;
  dayOfMonth?: number;
  jobType?: ScheduleJobType;
  jobOptions?: Record<string, any>;
  advancedConfig?: Partial<AdvancedScheduleConfig>;
  isActive?: boolean;
  status?: ScheduleStatus;
}

/**
 * Status do sistema de agendamento
 */
export interface SchedulingSystemStatus {
  isEnabled: boolean;
  activeSchedules: number;
  runningJobs: number;
  nextExecution?: Date;
  lastExecution?: Date;
  totalExecutions: number;
  failedExecutions: number;
  uptime: number;
}

/**
 * Serviço central para gerenciamento de agendamentos automáticos
 * Integra node-cron com o sistema de queue e automação existente
 */
export class SchedulingService {
  private readonly scheduleRepo: Repository<ScheduleConfigEntity>;
  private readonly userRepo: Repository<UserEntity>;
  private readonly auditLogService: AuditLogService;
  private readonly automationService: AutomationService;
  private readonly queueService: QueueService;

  // Mapa de jobs cron ativos
  private activeCronJobs = new Map<number, any>();

  // Controle do sistema
  private isEnabled: boolean;
  private startTime: Date;

  constructor() {
    this.scheduleRepo = AppDataSource.getRepository(ScheduleConfigEntity);
    this.userRepo = AppDataSource.getRepository(UserEntity);
    this.auditLogService = new AuditLogService();
    this.automationService = new AutomationService();
    this.queueService = new QueueService();

    this.isEnabled = process.env.SCHEDULING_ENABLED === 'true';
    this.startTime = new Date();

    console.log(
      '[SchedulingService] Serviço inicializado. Enabled:',
      this.isEnabled
    );
  }

  // =====================================
  // INICIALIZAÇÃO E CONTROLE
  // =====================================

  /**
   * Inicia o sistema de agendamento
   * Carrega todos os agendamentos ativos do banco
   */
  async initialize(): Promise<void> {
    if (!this.isEnabled) {
      console.log('[SchedulingService] Sistema desabilitado por configuração');
      return;
    }

    console.log('[SchedulingService] Inicializando sistema de agendamento...');

    try {
      // Carregar agendamentos ativos
      const activeSchedules = await this.scheduleRepo.find({
        where: { isActive: true, status: 'ACTIVE' },
        relations: ['createdBy', 'updatedBy'],
      });

      console.log(
        `[SchedulingService] Encontrados ${activeSchedules.length} agendamentos ativos`
      );

      // Registrar cada agendamento no cron
      for (const schedule of activeSchedules) {
        await this.registerCronJob(schedule);
      }

      // Audit log da inicialização
      await this.auditLogService.createLog({
        userId: null, // Sistema
        userName: 'Sistema',
        actionType: 'SCHEDULING_SYSTEM_STARTED',
        entityType: 'SchedulingService',
        entityId: 'system',
        details: {
          activeSchedules: activeSchedules.length,
          timestamp: new Date().toISOString(),
        },
        justification: 'Inicialização automática do sistema de agendamento',
      });

      console.log('[SchedulingService] Sistema inicializado com sucesso');
    } catch (error) {
      console.error('[SchedulingService] Erro ao inicializar:', error);
      throw error;
    }
  }

  /**
   * Para o sistema de agendamento
   * Cancela todos os jobs cron ativos
   */
  async shutdown(): Promise<void> {
    console.log('[SchedulingService] Parando sistema de agendamento...');

    try {
      // Parar todos os jobs cron
      for (const [scheduleId, task] of this.activeCronJobs) {
        task.stop();
        console.log(`[SchedulingService] Job ${scheduleId} parado`);
      }

      this.activeCronJobs.clear();

      // Audit log da parada
      await this.auditLogService.createLog({
        userId: null, // Sistema
        userName: 'Sistema',
        actionType: 'SCHEDULING_SYSTEM_STOPPED',
        entityType: 'SchedulingService',
        entityId: 'system',
        details: {
          stoppedJobs: this.activeCronJobs.size,
          timestamp: new Date().toISOString(),
        },
        justification: 'Parada do sistema de agendamento',
      });

      console.log('[SchedulingService] Sistema parado com sucesso');
    } catch (error) {
      console.error('[SchedulingService] Erro ao parar sistema:', error);
    }
  }

  // =====================================
  // CRUD DE AGENDAMENTOS
  // =====================================

  /**
   * Cria um novo agendamento
   */
  async createSchedule(
    data: CreateScheduleDto,
    createdBy: UserEntity
  ): Promise<ScheduleConfigEntity> {
    console.log(`[SchedulingService] Criando agendamento: ${data.name}`);

    try {
      // Validar dados
      this.validateScheduleData(data);

      // Configuração avançada padrão
      const defaultAdvancedConfig: AdvancedScheduleConfig = {
        timezone: process.env.DEFAULT_SCHEDULE_TIMEZONE || 'America/Sao_Paulo',
        retryAttempts: parseInt(process.env.SCHEDULE_RETRY_ATTEMPTS || '3'),
        retryDelay: 5, // 5 minutos
        timeoutMinutes: 120, // 2 horas
        onlyIfActiveePeriod: true,
        emailNotifications: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
        slackNotifications: process.env.SLACK_NOTIFICATIONS_ENABLED === 'true',
        skipIfPreviousRunning: true,
      };

      // Criar entidade
      const schedule = this.scheduleRepo.create({
        name: data.name,
        description: data.description,
        frequency: data.frequency,
        timeOfDay: data.timeOfDay,
        weekDays: data.weekDays,
        dayOfMonth: data.dayOfMonth,
        jobType: data.jobType,
        jobOptions: data.jobOptions || {},
        advancedConfig: { ...defaultAdvancedConfig, ...data.advancedConfig },
        isActive: true,
        status: 'ACTIVE',
        createdByUserId: createdBy.id,
        executionCount: 0,
        consecutiveFailures: 0,
      });

      // Gerar expressão cron
      schedule.cronExpression = schedule.generateCronExpression();

      // Calcular próxima execução
      schedule.nextRunAt = schedule.calculateNextRun();

      // Salvar no banco
      const savedSchedule = await this.scheduleRepo.save(schedule);

      // Registrar no cron se ativo
      if (savedSchedule.isActive && this.isEnabled) {
        await this.registerCronJob(savedSchedule);
      }

      // Audit log
      await this.auditLogService.createLog({
        userId: createdBy.id,
        userName: createdBy.nome,
        actionType: 'SCHEDULE_CREATED',
        entityType: 'ScheduleConfigEntity',
        entityId: savedSchedule.id.toString(),
        details: {
          scheduleName: savedSchedule.name,
          frequency: savedSchedule.frequency,
          timeOfDay: savedSchedule.timeOfDay,
          jobType: savedSchedule.jobType,
          cronExpression: savedSchedule.cronExpression,
          nextRunAt: savedSchedule.nextRunAt,
        },
        justification: 'Criação de novo agendamento',
      });

      console.log(
        `[SchedulingService] Agendamento criado: ID ${savedSchedule.id}`
      );
      return savedSchedule;
    } catch (error) {
      console.error('[SchedulingService] Erro ao criar agendamento:', error);
      throw error;
    }
  }

  /**
   * Atualiza um agendamento existente
   */
  async updateSchedule(
    id: number,
    data: UpdateScheduleDto,
    updatedBy: UserEntity
  ): Promise<ScheduleConfigEntity> {
    console.log(`[SchedulingService] Atualizando agendamento ID: ${id}`);

    try {
      const schedule = await this.scheduleRepo.findOne({
        where: { id },
        relations: ['createdBy'],
      });

      if (!schedule) {
        throw new Error(`Agendamento ID ${id} não encontrado`);
      }

      const oldConfig = { ...schedule };

      // Atualizar campos
      Object.assign(schedule, data);
      schedule.updatedByUserId = updatedBy.id;

      // Se mudou configuração, recalcular cron e próxima execução
      if (
        data.frequency ||
        data.timeOfDay ||
        data.weekDays ||
        data.dayOfMonth
      ) {
        schedule.cronExpression = schedule.generateCronExpression();
        schedule.nextRunAt = schedule.calculateNextRun();
      }

      // Salvar no banco
      const updatedSchedule = await this.scheduleRepo.save(schedule);

      // Reregistrar no cron se necessário
      if (this.isEnabled) {
        await this.unregisterCronJob(id);
        if (updatedSchedule.isActive && updatedSchedule.status === 'ACTIVE') {
          await this.registerCronJob(updatedSchedule);
        }
      }

      // Audit log
      await this.auditLogService.createLog({
        userId: updatedBy.id,
        userName: updatedBy.nome,
        actionType: 'SCHEDULE_UPDATED',
        entityType: 'ScheduleConfigEntity',
        entityId: id.toString(),
        details: {
          oldConfig: {
            frequency: oldConfig.frequency,
            timeOfDay: oldConfig.timeOfDay,
            isActive: oldConfig.isActive,
            status: oldConfig.status,
          },
          newConfig: {
            frequency: updatedSchedule.frequency,
            timeOfDay: updatedSchedule.timeOfDay,
            isActive: updatedSchedule.isActive,
            status: updatedSchedule.status,
          },
          cronExpression: updatedSchedule.cronExpression,
          nextRunAt: updatedSchedule.nextRunAt,
        },
        justification: 'Atualização de configuração de agendamento',
      });

      console.log(`[SchedulingService] Agendamento ${id} atualizado`);
      return updatedSchedule;
    } catch (error) {
      console.error(
        '[SchedulingService] Erro ao atualizar agendamento:',
        error
      );
      throw error;
    }
  }

  /**
   * Deleta um agendamento
   */
  async deleteSchedule(id: number, deletedBy: UserEntity): Promise<void> {
    console.log(`[SchedulingService] Deletando agendamento ID: ${id}`);

    try {
      const schedule = await this.scheduleRepo.findOneBy({ id });

      if (!schedule) {
        throw new Error(`Agendamento ID ${id} não encontrado`);
      }

      // Parar job cron se ativo
      await this.unregisterCronJob(id);

      // Deletar do banco
      await this.scheduleRepo.remove(schedule);

      // Audit log
      await this.auditLogService.createLog({
        userId: deletedBy.id,
        userName: deletedBy.nome,
        actionType: 'SCHEDULE_DELETED',
        entityType: 'ScheduleConfigEntity',
        entityId: id.toString(),
        details: {
          scheduleName: schedule.name,
          frequency: schedule.frequency,
          jobType: schedule.jobType,
        },
        justification: 'Remoção de agendamento',
      });

      console.log(`[SchedulingService] Agendamento ${id} deletado`);
    } catch (error) {
      console.error('[SchedulingService] Erro ao deletar agendamento:', error);
      throw error;
    }
  }

  // =====================================
  // CONSULTA E STATUS
  // =====================================

  /**
   * Lista todos os agendamentos
   */
  async getAllSchedules(): Promise<ScheduleConfigEntity[]> {
    return this.scheduleRepo.find({
      relations: ['createdBy', 'updatedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Busca agendamento por ID
   */
  async getScheduleById(id: number): Promise<ScheduleConfigEntity | null> {
    return this.scheduleRepo.findOne({
      where: { id },
      relations: ['createdBy', 'updatedBy'],
    });
  }

  /**
   * Retorna status do sistema de agendamento
   */
  async getSystemStatus(): Promise<SchedulingSystemStatus> {
    const schedules = await this.scheduleRepo.find();
    const activeSchedules = schedules.filter(
      (s) => s.isActive && s.status === 'ACTIVE'
    );

    const nextExecution = activeSchedules
      .filter((s) => s.nextRunAt)
      .map((s) => s.nextRunAt!)
      .sort((a, b) => a.getTime() - b.getTime())[0];

    const lastExecution = schedules
      .filter((s) => s.lastRunAt)
      .map((s) => s.lastRunAt!)
      .sort((a, b) => b.getTime() - a.getTime())[0];

    const totalExecutions = schedules.reduce(
      (sum, s) => sum + s.executionCount,
      0
    );
    const failedExecutions = schedules.reduce(
      (sum, s) => sum + s.consecutiveFailures,
      0
    );

    return {
      isEnabled: this.isEnabled,
      activeSchedules: activeSchedules.length,
      runningJobs: this.activeCronJobs.size,
      nextExecution,
      lastExecution,
      totalExecutions,
      failedExecutions,
      uptime: Date.now() - this.startTime.getTime(),
    };
  }

  // =====================================
  // GERENCIAMENTO DE JOBS CRON
  // =====================================

  /**
   * Registra um job no sistema cron
   */
  private async registerCronJob(schedule: ScheduleConfigEntity): Promise<void> {
    try {
      console.log(
        `[SchedulingService] Registrando job cron para agendamento ${schedule.id}`
      );

      // Verificar se expressão cron é válida
      if (!cron.validate(schedule.cronExpression)) {
        throw new Error(`Expressão cron inválida: ${schedule.cronExpression}`);
      }

      // Criar task cron
      const task = cron.schedule(
        schedule.cronExpression,
        async () => {
          await this.executeScheduledJob(schedule.id);
        },
        {
          timezone: schedule.advancedConfig.timezone,
        }
      );

      // Iniciar o job
      task.start();

      // Armazenar referência
      this.activeCronJobs.set(schedule.id, task);

      console.log(
        `[SchedulingService] Job ${schedule.id} registrado com sucesso. ` +
          `Próxima execução: ${schedule.nextRunAt?.toISOString()}`
      );
    } catch (error) {
      console.error(
        `[SchedulingService] Erro ao registrar job ${schedule.id}:`,
        error
      );

      // Marcar agendamento como erro
      await this.scheduleRepo.update(schedule.id, {
        status: 'ERROR',
        lastRunMessage: `Erro ao registrar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      });
    }
  }

  /**
   * Remove um job do sistema cron
   */
  private async unregisterCronJob(scheduleId: number): Promise<void> {
    const task = this.activeCronJobs.get(scheduleId);

    if (task) {
      task.stop();
      this.activeCronJobs.delete(scheduleId);
      console.log(`[SchedulingService] Job ${scheduleId} removido do cron`);
    }
  }

  /**
   * Executa um job agendado
   */
  private async executeScheduledJob(scheduleId: number): Promise<void> {
    console.log(`[SchedulingService] Executando job agendado ${scheduleId}`);

    try {
      // Buscar configuração atualizada
      const schedule = await this.scheduleRepo.findOneBy({ id: scheduleId });

      if (!schedule) {
        console.error(
          `[SchedulingService] Agendamento ${scheduleId} não encontrado`
        );
        return;
      }

      // Verificar se deve executar
      if (!schedule.shouldRun()) {
        console.log(
          `[SchedulingService] Job ${scheduleId} não deve ser executado agora`
        );
        return;
      }

      // Verificar se há vigência ativa (se configurado)
      if (schedule.advancedConfig.onlyIfActiveePeriod) {
        const activePeriod = await this.automationService.getActivePeriodInfo();
        if (!activePeriod || activePeriod.status !== 'ATIVA') {
          console.log(
            `[SchedulingService] Job ${scheduleId} cancelado: nenhuma vigência ativa encontrada`
          );

          await this.scheduleRepo.update(scheduleId, {
            lastRunAt: new Date(),
            lastRunStatus: 'CANCELLED',
            lastRunMessage: 'Cancelado: nenhuma vigência ativa',
            nextRunAt: schedule.calculateNextRun(),
          });

          return;
        }
      }

      // Verificar se job anterior ainda está rodando
      if (schedule.advancedConfig.skipIfPreviousRunning) {
        const activeJobs = await this.queueService.getActiveJobs();
        const hasRunningJob = activeJobs.some(
          (job) =>
            (job as any).data?.triggeredBy === 'automatic' &&
            job.status === 'active'
        );

        if (hasRunningJob) {
          console.log(
            `[SchedulingService] Job ${scheduleId} pulado: job anterior ainda rodando`
          );

          await this.scheduleRepo.update(scheduleId, {
            lastRunAt: new Date(),
            lastRunStatus: 'CANCELLED',
            lastRunMessage: 'Pulado: job anterior ainda em execução',
            nextRunAt: schedule.calculateNextRun(),
          });

          return;
        }
      }

      // Marcar execução como iniciada
      schedule.markExecutionStarted();
      await this.scheduleRepo.save(schedule);

      // Executar o job apropriado
      let jobResult;

      switch (schedule.jobType) {
        case 'FULL_ETL':
          jobResult = await this.queueService.addFullETLJob({
            triggeredBy: 'automatic',
            userId: schedule.createdByUserId,
            priority: schedule.jobOptions?.priority || 5,
          });
          break;

        case 'PARTIAL_RECALCULATION':
          jobResult = await this.queueService.addPartialRecalculationJob({
            triggeredBy: 'automatic',
            userId: schedule.createdByUserId,
          });
          break;

        case 'DATA_VALIDATION':
          // TODO: Implementar job de validação
          console.log(
            `[SchedulingService] Validação de dados ainda não implementada`
          );
          jobResult = 'validation-placeholder';
          break;

        default:
          throw new Error(`Tipo de job não suportado: ${schedule.jobType}`);
      }

      // Marcar como concluído com sucesso
      schedule.markExecutionCompleted(
        true,
        `Job ${jobResult} iniciado com sucesso`
      );
      await this.scheduleRepo.save(schedule);

      console.log(
        `[SchedulingService] Job ${scheduleId} executado com sucesso. JobID: ${jobResult}`
      );

      // Audit log da execução
      await this.auditLogService.createLog({
        userId: null, // Sistema
        userName: 'Sistema Agendado',
        actionType: 'SCHEDULED_JOB_EXECUTED',
        entityType: 'ScheduleConfigEntity',
        entityId: scheduleId.toString(),
        details: {
          scheduleName: schedule.name,
          jobType: schedule.jobType,
          jobId: jobResult,
          executionCount: schedule.executionCount,
          nextRunAt: schedule.nextRunAt,
        },
        justification: 'Execução automática de job agendado',
      });
    } catch (error) {
      console.error(
        `[SchedulingService] Erro ao executar job ${scheduleId}:`,
        error
      );

      // Marcar como falha
      const schedule = await this.scheduleRepo.findOneBy({ id: scheduleId });
      if (schedule) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido';
        schedule.markExecutionCompleted(false, `Erro: ${errorMessage}`);
        await this.scheduleRepo.save(schedule);

        // Se muitas falhas, enviar notificação
        if (
          schedule.consecutiveFailures >= schedule.advancedConfig.retryAttempts
        ) {
          await this.sendFailureNotification(schedule, errorMessage);
        }
      }
    }
  }

  // =====================================
  // NOTIFICAÇÕES
  // =====================================

  /**
   * Envia notificação de falha
   */
  private async sendFailureNotification(
    schedule: ScheduleConfigEntity,
    errorMessage: string
  ): Promise<void> {
    try {
      const subject = `🚨 Agendamento "${schedule.name}" falhando consecutivamente`;
      const message =
        `O agendamento "${schedule.name}" (ID: ${schedule.id}) falhou ${schedule.consecutiveFailures} vezes consecutivas.\n\n` +
        `Último erro: ${errorMessage}\n\n` +
        `O agendamento foi automaticamente desativado para evitar mais falhas.\n\n` +
        `Verifique a configuração e reative quando o problema for resolvido.`;

      // TODO: Implementar envio real de email/Slack
      console.log(`[SchedulingService] NOTIFICAÇÃO DE FALHA:`);
      console.log(`Assunto: ${subject}`);
      console.log(`Mensagem: ${message}`);

      // Audit log da notificação
      await this.auditLogService.createLog({
        userId: null,
        userName: 'Sistema',
        actionType: 'SCHEDULE_FAILURE_NOTIFICATION',
        entityType: 'ScheduleConfigEntity',
        entityId: schedule.id.toString(),
        details: {
          scheduleName: schedule.name,
          consecutiveFailures: schedule.consecutiveFailures,
          errorMessage,
        },
        justification: 'Notificação automática de falha de agendamento',
      });
    } catch (error) {
      console.error(
        '[SchedulingService] Erro ao enviar notificação de falha:',
        error
      );
    }
  }

  // =====================================
  // VALIDAÇÕES
  // =====================================

  /**
   * Valida dados de agendamento
   */
  private validateScheduleData(
    data: CreateScheduleDto | UpdateScheduleDto
  ): void {
    // Validar nome
    if ('name' in data && (!data.name || data.name.trim().length === 0)) {
      throw new Error('Nome do agendamento é obrigatório');
    }

    // Validar horário
    if ('timeOfDay' in data && data.timeOfDay) {
      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(data.timeOfDay)) {
        throw new Error('Horário deve estar no formato HH:MM (24h)');
      }
    }

    // Validar frequência semanal
    if (
      'frequency' in data &&
      data.frequency === 'WEEKLY' &&
      'weekDays' in data &&
      data.weekDays
    ) {
      const hasAnyDay = Object.values(data.weekDays).some(
        (day) => day === true
      );
      if (!hasAnyDay) {
        throw new Error(
          'Para frequência semanal, ao menos um dia deve ser selecionado'
        );
      }
    }

    // Validar frequência mensal
    if (
      'frequency' in data &&
      data.frequency === 'MONTHLY' &&
      'dayOfMonth' in data &&
      data.dayOfMonth
    ) {
      if (data.dayOfMonth < 1 || data.dayOfMonth > 31) {
        throw new Error('Dia do mês deve estar entre 1 e 31');
      }
    }
  }

  // =====================================
  // MÉTODOS UTILITÁRIOS
  // =====================================

  /**
   * Força execução imediata de um agendamento
   */
  async executeNow(
    scheduleId: number,
    executedBy: UserEntity
  ): Promise<string> {
    console.log(
      `[SchedulingService] Execução manual do agendamento ${scheduleId}`
    );

    const schedule = await this.scheduleRepo.findOneBy({ id: scheduleId });

    if (!schedule) {
      throw new Error(`Agendamento ${scheduleId} não encontrado`);
    }

    // Executar imediatamente
    await this.executeScheduledJob(scheduleId);

    // Audit log da execução manual
    await this.auditLogService.createLog({
      userId: executedBy.id,
      userName: executedBy.nome,
      actionType: 'SCHEDULE_EXECUTED_MANUALLY',
      entityType: 'ScheduleConfigEntity',
      entityId: scheduleId.toString(),
      details: {
        scheduleName: schedule.name,
        jobType: schedule.jobType,
      },
      justification: 'Execução manual de agendamento',
    });

    return `Agendamento ${schedule.name} executado manualmente`;
  }

  /**
   * Reinicia todos os jobs cron
   */
  async restartAllJobs(): Promise<void> {
    console.log('[SchedulingService] Reiniciando todos os jobs...');

    // Parar todos os jobs
    for (const [scheduleId, task] of this.activeCronJobs) {
      task.stop();
    }
    this.activeCronJobs.clear();

    // Recarregar e registrar novamente
    await this.initialize();
  }

  /**
   * Verifica e corrige agendamentos órfãos
   */
  async healthCheck(): Promise<{ fixed: number; errors: string[] }> {
    const errors: string[] = [];
    let fixed = 0;

    try {
      const schedules = await this.scheduleRepo.find({
        where: { isActive: true, status: 'ACTIVE' },
      });

      for (const schedule of schedules) {
        const hasCronJob = this.activeCronJobs.has(schedule.id);

        if (!hasCronJob && this.isEnabled) {
          console.log(
            `[SchedulingService] Corrigindo agendamento órfão: ${schedule.id}`
          );
          await this.registerCronJob(schedule);
          fixed++;
        }

        // Verificar se próxima execução está correta
        const expectedNext = schedule.calculateNextRun();
        if (
          expectedNext &&
          schedule.nextRunAt?.getTime() !== expectedNext.getTime()
        ) {
          schedule.nextRunAt = expectedNext;
          await this.scheduleRepo.save(schedule);
          fixed++;
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      errors.push(`Erro no health check: ${errorMessage}`);
    }

    return { fixed, errors };
  }
}
