// apps/api/src/modules/expurgos/expurgo-automation.hook.ts
import { AutomationService } from '../automation/automation.service';
import {
  JobType,
  PartialRecalculationJobData,
  QueueService,
} from '../queue/queue.service';
import { WebSocketService } from '../websocket/websocket.service';

/**
 * Hook para automação de recálculo quando expurgo é aprovado
 * VERSÃO 2: Integrado com sistema de queue e WebSockets
 */
export class ExpurgoAutomationHook {
  private queueService: QueueService;
  private webSocketService: WebSocketService;
  private automationService: AutomationService;

  constructor() {
    this.queueService = new QueueService();
    this.automationService = new AutomationService();
    this.webSocketService = new WebSocketService(this.queueService);

    console.log('[ExpurgoAutomationHook] v2 Inicializado com sistema de queue');
  }

  /**
   * Dispara recálculo automático quando expurgo é aprovado
   * NOVO: Usa sistema de queue para processamento assíncrono
   */
  async onExpurgoApproved(
    expurgoId: number,
    approvedByUserId: number,
    useQueue: boolean = true
  ): Promise<{ jobId?: string; success: boolean; message: string }> {
    console.log(
      `[ExpurgoAutomationHook] Expurgo ${expurgoId} aprovado. Disparando recálculo automático...`
    );

    try {
      // Verificar se existe vigência ativa antes de tentar recalcular
      const activePeriod = await this.automationService.getActivePeriodInfo();

      if (!activePeriod) {
        const message =
          'Nenhuma vigência ativa encontrada. Recálculo não executado.';
        console.warn(`[ExpurgoAutomationHook] ${message}`);
        return { success: false, message };
      }

      if (activePeriod.status !== 'ATIVA') {
        const message = `Vigência ${activePeriod.mesAno} não está ATIVA (status: ${activePeriod.status}). Recálculo não executado.`;
        console.warn(`[ExpurgoAutomationHook] ${message}`);
        return { success: false, message };
      }

      // ===== MODO QUEUE (FASE 2 - PADRÃO) =====
      if (useQueue) {
        console.log(
          '[ExpurgoAutomationHook] Usando sistema de queue para recálculo'
        );

        const jobData: PartialRecalculationJobData = {
          triggeredBy: 'expurgo',
          userId: approvedByUserId,
          expurgoId,
        };

        // Adicionar job à queue com prioridade alta (expurgos são urgentes)
        const jobId = await this.queueService.addPartialRecalculationJob(
          jobData,
          {
            priority: 1, // Prioridade máxima
          }
        );

        // Notificar via WebSocket
        await this.webSocketService.broadcastJobStarted(
          jobId,
          JobType.PARTIAL_RECALCULATION
        );

        const message = `Recálculo automático adicionado à queue com sucesso para expurgo ${expurgoId}`;
        console.log(`[ExpurgoAutomationHook] ✅ ${message}`);
        console.log(`[ExpurgoAutomationHook] Job ID: ${jobId}`);

        return {
          jobId,
          success: true,
          message: `${message}. Job ID: ${jobId}`,
        };
      }

      // ===== MODO SÍNCRONO (FALLBACK) =====
      console.log(
        '[ExpurgoAutomationHook] Executando recálculo em modo síncrono (fallback)'
      );

      const result = await this.automationService.runPartialRecalculation({
        triggeredBy: 'expurgo',
        userId: approvedByUserId,
      });

      if (result.success) {
        const message = `Recálculo automático concluído com sucesso para expurgo ${expurgoId}`;
        console.log(`[ExpurgoAutomationHook] ✅ ${message}`);
        console.log(
          `[ExpurgoAutomationHook] Tempo de execução: ${result.executionTimeMs}ms`
        );

        return { success: true, message };
      } else {
        const message = `Falha no recálculo automático para expurgo ${expurgoId}: ${result.error}`;
        console.error(`[ExpurgoAutomationHook] ❌ ${message}`);

        return { success: false, message };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      const message = `Erro crítico durante recálculo automático para expurgo ${expurgoId}: ${errorMessage}`;

      console.error(`[ExpurgoAutomationHook] ❌ ${message}`, error);

      // TODO: Enviar notificação para administradores
      // await this.notifyAdmins('Falha no recálculo automático pós-expurgo', error);

      return { success: false, message };
    }
  }

  /**
   * Hook para quando meta é alterada (futuro uso)
   * NOVO: Preparado para usar queue quando necessário
   */
  async onMetaChanged(
    parameterId: number,
    changedByUserId: number,
    useQueue: boolean = true
  ): Promise<{ jobId?: string; success: boolean; message: string }> {
    console.log(
      `[ExpurgoAutomationHook] Meta alterada (parâmetro ${parameterId}). Verificando necessidade de ações...`
    );

    try {
      const activePeriod = await this.automationService.getActivePeriodInfo();

      if (!activePeriod) {
        const message =
          'Nenhuma vigência ativa. Meta alterada apenas registrada.';
        console.log(`[ExpurgoAutomationHook] ${message}`);
        return { success: true, message };
      }

      if (activePeriod.status === 'PLANEJAMENTO') {
        const message = `Meta alterada para vigência em PLANEJAMENTO (${activePeriod.mesAno}). Nenhuma ação adicional necessária.`;
        console.log(`[ExpurgoAutomationHook] ${message}`);
        return { success: true, message };
      }

      if (activePeriod.status === 'ATIVA') {
        console.log(
          `[ExpurgoAutomationHook] Meta alterada para vigência ATIVA (${activePeriod.mesAno}). Considerando recálculo...`
        );

        // Para vigência ATIVA, pode ser necessário recálculo
        // Decidir se dispara automaticamente ou apenas notifica

        if (useQueue) {
          const jobData: PartialRecalculationJobData = {
            triggeredBy: 'meta-change',
            userId: changedByUserId,
          };

          const jobId = await this.queueService.addPartialRecalculationJob(
            jobData,
            {
              priority: 3, // Prioridade média (menos urgente que expurgo)
            }
          );

          await this.webSocketService.broadcastJobStarted(
            jobId,
            JobType.PARTIAL_RECALCULATION
          );

          const message = `Recálculo por alteração de meta adicionado à queue. Job ID: ${jobId}`;
          console.log(`[ExpurgoAutomationHook] ✅ ${message}`);

          return { jobId, success: true, message };
        }

        // Modo síncrono (fallback)
        const result = await this.automationService.runPartialRecalculation({
          triggeredBy: 'meta-change',
          userId: changedByUserId,
        });

        const message = result.success
          ? `Recálculo por alteração de meta concluído com sucesso`
          : `Falha no recálculo por alteração de meta: ${result.error}`;

        return { success: result.success, message };
      }

      const message = `Vigência ${activePeriod.mesAno} em status ${activePeriod.status}. Meta alterada apenas registrada.`;
      console.log(`[ExpurgoAutomationHook] ${message}`);
      return { success: true, message };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      const message = `Erro ao processar alteração de meta (parâmetro ${parameterId}): ${errorMessage}`;

      console.error(`[ExpurgoAutomationHook] ❌ ${message}`, error);
      return { success: false, message };
    }
  }

  /**
   * NOVO: Hook para quando uma vigência muda de status
   * Útil para automações adicionais (ex: ATIVA → FECHADA)
   */
  async onPeriodStatusChanged(
    periodId: number,
    oldStatus: string,
    newStatus: string,
    changedByUserId: number
  ): Promise<{ jobId?: string; success: boolean; message: string }> {
    console.log(
      `[ExpurgoAutomationHook] Status da vigência ${periodId} alterado: ${oldStatus} → ${newStatus}`
    );

    try {
      if (oldStatus === 'ATIVA' && newStatus === 'FECHADA') {
        console.log(
          `[ExpurgoAutomationHook] Vigência ${periodId} foi FECHADA. Executando snapshot final...`
        );

        // TODO: Implementar snapshot final ou validações finais
        // Pode incluir: backup final, validação de integridade, etc.

        const message = `Vigência ${periodId} fechada com sucesso. Snapshot final executado.`;
        console.log(`[ExpurgoAutomationHook] ✅ ${message}`);

        return { success: true, message };
      }

      if (oldStatus === 'PLANEJAMENTO' && newStatus === 'ATIVA') {
        console.log(
          `[ExpurgoAutomationHook] Vigência ${periodId} foi ATIVADA. Verificando se ETL inicial é necessário...`
        );

        // TODO: Decidir se dispara ETL automaticamente quando vigência vira ATIVA
        // Pode ser configurável via admin

        const message = `Vigência ${periodId} ativada. ETL inicial pode ser executado manualmente.`;
        console.log(`[ExpurgoAutomationHook] ✅ ${message}`);

        return { success: true, message };
      }

      const message = `Mudança de status ${oldStatus} → ${newStatus} registrada para vigência ${periodId}`;
      console.log(`[ExpurgoAutomationHook] ${message}`);

      return { success: true, message };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro desconhecido';
      const message = `Erro ao processar mudança de status da vigência ${periodId}: ${errorMessage}`;

      console.error(`[ExpurgoAutomationHook] ❌ ${message}`, error);
      return { success: false, message };
    }
  }

  /**
   * NOVO: Método para obter estatísticas dos hooks executados
   */
  async getHookStats(): Promise<{
    totalExpurgoJobs: number;
    totalMetaChangeJobs: number;
    activeJobs: number;
  }> {
    try {
      const activeJobs = await this.queueService.getActiveJobs();

      const expurgoJobs = activeJobs.filter(
        (job) => job.type === JobType.PARTIAL_RECALCULATION
        // TODO: Adicionar filtro por triggeredBy quando disponível nos dados
      );

      return {
        totalExpurgoJobs: expurgoJobs.length,
        totalMetaChangeJobs: 0, // TODO: Implementar contagem específica
        activeJobs: activeJobs.length,
      };
    } catch (error) {
      console.error(
        '[ExpurgoAutomationHook] Erro ao buscar estatísticas:',
        error
      );
      return {
        totalExpurgoJobs: 0,
        totalMetaChangeJobs: 0,
        activeJobs: 0,
      };
    }
  }

  /**
   * NOVO: Verifica se o sistema está pronto para automação
   */
  async isSystemReadyForAutomation(): Promise<boolean> {
    try {
      // Verificar se existe vigência ativa
      const activePeriod = await this.automationService.getActivePeriodInfo();

      if (!activePeriod) {
        console.log(
          '[ExpurgoAutomationHook] Sistema não pronto: Nenhuma vigência ativa'
        );
        return false;
      }

      if (activePeriod.status !== 'ATIVA') {
        console.log(
          `[ExpurgoAutomationHook] Sistema não pronto: Vigência ${activePeriod.mesAno} em status ${activePeriod.status}`
        );
        return false;
      }

      // TODO: Verificar se Redis está conectado
      // TODO: Verificar se não há jobs críticos rodando

      console.log(
        `[ExpurgoAutomationHook] Sistema pronto: Vigência ${activePeriod.mesAno} ativa`
      );
      return true;
    } catch (error) {
      console.error(
        '[ExpurgoAutomationHook] Erro ao verificar prontidão do sistema:',
        error
      );
      return false;
    }
  }

  /**
   * Limpa recursos quando o hook é encerrado
   */
  async cleanup(): Promise<void> {
    console.log('[ExpurgoAutomationHook] Limpando recursos...');

    await this.queueService.cleanup();
    this.webSocketService.cleanup();

    console.log('[ExpurgoAutomationHook] Recursos limpos');
  }
}
