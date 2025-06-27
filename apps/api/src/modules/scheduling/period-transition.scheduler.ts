// apps/api/src/modules/scheduler/period-transition.scheduler.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { UserEntity } from '@/entity/user.entity';
import { AuditLogService } from '@/modules/audit/audit.service';
import { CompetitionPeriodService } from '@/modules/periods/period.service';
import * as cron from 'node-cron';
import { Repository } from 'typeorm';

/**
 * 🤖 SCHEDULER AUTOMÁTICO PARA TRANSIÇÕES DE VIGÊNCIA
 *
 * Responsabilidades:
 * 1. Monitora períodos ATIVA que chegaram ao fim
 * 2. Pré-fecha automaticamente (ATIVA → PRE_FECHADA)
 * 3. Cria próxima vigência em PLANEJAMENTO
 * 4. Registra todas as ações em logs de auditoria
 */
export class PeriodTransitionScheduler {
  private periodService: CompetitionPeriodService;
  private auditLogService: AuditLogService;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private userRepo: Repository<UserEntity>;
  private isRunning: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;

  // Configurações do scheduler
  private readonly CRON_PATTERN = '0 1 * * *'; // Todo dia às 01:00
  private readonly TIMEZONE = 'America/Sao_Paulo';
  private readonly MAX_RETRY_ATTEMPTS = 3;

  constructor() {
    this.periodService = new CompetitionPeriodService();
    this.auditLogService = new AuditLogService();
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.userRepo = AppDataSource.getRepository(UserEntity);

    console.log(
      '[PeriodTransitionScheduler] Instanciado - Pronto para agendar tarefas.'
    );
  }

  /**
   * 🚀 INICIA o scheduler automático
   * Agenda execução diária para verificar transições necessárias
   */
  start(): void {
    if (this.cronJob) {
      console.log('[PeriodTransitionScheduler] ⚠️ Scheduler já está rodando.');
      return;
    }

    console.log(
      `[PeriodTransitionScheduler] 🎯 Iniciando scheduler: ${this.CRON_PATTERN} (${this.TIMEZONE})`
    );

    this.cronJob = cron.schedule(
      this.CRON_PATTERN,
      () => {
        this.executeScheduledTransition();
      },
      {
        timezone: this.TIMEZONE,
      }
    );

    console.log(
      '[PeriodTransitionScheduler] ✅ Scheduler iniciado com sucesso.'
    );

    // Log da próxima execução
    if (this.cronJob) {
      console.log(
        `[PeriodTransitionScheduler] 📅 Próxima execução: ${this.getNextExecutionTime()}`
      );
    }
  }

  /**
   * 🛑 PARA o scheduler automático
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
      console.log('[PeriodTransitionScheduler] 🛑 Scheduler parado.');
    } else {
      console.log(
        '[PeriodTransitionScheduler] ⚠️ Scheduler não estava rodando.'
      );
    }
  }

  /**
   * 📊 STATUS do scheduler
   */
  getStatus(): {
    isActive: boolean;
    isRunning: boolean;
    nextExecution: string | null;
    cronPattern: string;
    timezone: string;
  } {
    return {
      isActive: !!this.cronJob,
      isRunning: this.isRunning,
      nextExecution: this.getNextExecutionTime(),
      cronPattern: this.CRON_PATTERN,
      timezone: this.TIMEZONE,
    };
  }

  /**
   * 🔄 EXECUÇÃO MANUAL (para testes)
   * Permite executar a lógica de transição manualmente sem esperar o cron
   */
  async executeManually(): Promise<{
    success: boolean;
    summary: {
      preClosedPeriods: number;
      newPeriodsCreated: number;
      errors: string[];
    };
    executionTimeMs: number;
  }> {
    console.log('[PeriodTransitionScheduler] 🧪 Execução manual iniciada...');

    const startTime = Date.now();

    try {
      const summary = await this.executeTransitionLogic();
      const executionTimeMs = Date.now() - startTime;

      console.log(
        `[PeriodTransitionScheduler] ✅ Execução manual concluída em ${executionTimeMs}ms`
      );

      return {
        success: true,
        summary,
        executionTimeMs,
      };
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      console.error(
        `[PeriodTransitionScheduler] ❌ Erro na execução manual:`,
        error
      );

      return {
        success: false,
        summary: {
          preClosedPeriods: 0,
          newPeriodsCreated: 0,
          errors: [errorMessage],
        },
        executionTimeMs,
      };
    }
  }

  /**
   * 🤖 EXECUÇÃO AGENDADA (chamada pelo cron)
   * Wrapper para execução automática com proteção contra sobreposição
   */
  private async executeScheduledTransition(): Promise<void> {
    if (this.isRunning) {
      console.log(
        '[PeriodTransitionScheduler] ⚠️ Execução anterior ainda em andamento. Pulando...'
      );
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log(
        '[PeriodTransitionScheduler] 🤖 Iniciando execução agendada...'
      );

      const summary = await this.executeTransitionLogic();
      const executionTimeMs = Date.now() - startTime;

      console.log(
        `[PeriodTransitionScheduler] ✅ Execução agendada concluída em ${executionTimeMs}ms:`,
        summary
      );

      // Registrar execução bem-sucedida
      await this.logSchedulerExecution({
        success: true,
        executionTimeMs,
        summary,
        triggeredBy: 'automatic',
      });
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';

      console.error(
        `[PeriodTransitionScheduler] ❌ Erro na execução agendada:`,
        error
      );

      // Registrar execução com erro
      await this.logSchedulerExecution({
        success: false,
        executionTimeMs,
        summary: {
          preClosedPeriods: 0,
          newPeriodsCreated: 0,
          errors: [errorMessage],
        },
        triggeredBy: 'automatic',
        error: errorMessage,
      });
    } finally {
      this.isRunning = false;
      console.log(
        `[PeriodTransitionScheduler] 📅 Próxima execução: ${this.getNextExecutionTime()}`
      );
    }
  }

  /**
   * ⚙️ LÓGICA PRINCIPAL DE TRANSIÇÃO
   * Executa o processo de verificação e transição de períodos
   */
  private async executeTransitionLogic(): Promise<{
    preClosedPeriods: number;
    newPeriodsCreated: number;
    errors: string[];
  }> {
    console.log(
      '[PeriodTransitionScheduler] 🔍 Verificando períodos elegíveis para transição...'
    );

    let attempts = 0;
    let lastError: Error | null = null;

    // Retry logic
    while (attempts < this.MAX_RETRY_ATTEMPTS) {
      try {
        const result =
          await this.periodService.executeAutomaticPeriodTransition();

        if (result.errors.length === 0) {
          console.log(
            '[PeriodTransitionScheduler] ✅ Transição executada sem erros.'
          );
          return result;
        } else {
          console.warn(
            `[PeriodTransitionScheduler] ⚠️ Transição executada com ${result.errors.length} erros:`,
            result.errors
          );
          return result; // Retorna mesmo com erros não críticos
        }
      } catch (error) {
        attempts++;
        lastError =
          error instanceof Error ? error : new Error('Erro desconhecido');

        console.error(
          `[PeriodTransitionScheduler] ❌ Tentativa ${attempts}/${this.MAX_RETRY_ATTEMPTS} falhou:`,
          error
        );

        if (attempts < this.MAX_RETRY_ATTEMPTS) {
          const delayMs = attempts * 5000; // 5s, 10s, 15s
          console.log(
            `[PeriodTransitionScheduler] ⏳ Aguardando ${delayMs}ms antes da próxima tentativa...`
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw new Error(
      `Falha na transição após ${this.MAX_RETRY_ATTEMPTS} tentativas. Último erro: ${lastError?.message}`
    );
  }

  /**
   * 📝 REGISTRA execução do scheduler nos logs de auditoria
   */
  private async logSchedulerExecution(data: {
    success: boolean;
    executionTimeMs: number;
    summary: {
      preClosedPeriods: number;
      newPeriodsCreated: number;
      errors: string[];
    };
    triggeredBy: 'automatic' | 'manual';
    error?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.createLog({
        userId: null, // Sistema automático
        userName: 'SCHEDULER_SYSTEM',
        actionType: 'SCHEDULER_PERIOD_TRANSITION',
        entityType: 'CompetitionPeriodEntity',
        entityId: 'multiple',
        details: {
          executionTimeMs: data.executionTimeMs,
          preClosedPeriods: data.summary.preClosedPeriods,
          newPeriodsCreated: data.summary.newPeriodsCreated,
          errorsCount: data.summary.errors.length,
          errors: data.summary.errors,
          triggeredBy: data.triggeredBy,
          success: data.success,
          schedulerPattern: this.CRON_PATTERN,
          timezone: this.TIMEZONE,
          ...(data.error && { error: data.error }),
        },
        justification: `Execução ${data.triggeredBy} do scheduler de transição de vigências`,
      });

      console.log(
        '[PeriodTransitionScheduler] 📝 Execução registrada nos logs de auditoria.'
      );
    } catch (error) {
      console.error(
        '[PeriodTransitionScheduler] ❌ Erro ao registrar execução nos logs:',
        error
      );
      // Não propagar o erro de log para não afetar a execução principal
    }
  }

  /**
   * 🔮 PRÓXIMA EXECUÇÃO
   */
  private getNextExecutionTime(): string | null {
    if (!this.cronJob) return null;

    try {
      // Calcular próxima execução baseada no cron pattern
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(1, 0, 0, 0); // 01:00 do próximo dia

      return tomorrow.toLocaleString('pt-BR', {
        timeZone: this.TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      console.error(
        '[PeriodTransitionScheduler] Erro ao calcular próxima execução:',
        error
      );
      return 'Erro no cálculo';
    }
  }

  /**
   * 🔧 CONFIGURAR novo padrão cron (para testes)
   */
  updateCronPattern(newPattern: string): void {
    console.log(
      `[PeriodTransitionScheduler] 🔧 Atualizando padrão cron: ${newPattern}`
    );

    this.stop();
    (this as any).CRON_PATTERN = newPattern;
    this.start();
  }
}
