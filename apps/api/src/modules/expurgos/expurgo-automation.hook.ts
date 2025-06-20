// apps/api/src/modules/expurgo/expurgo-automation.hook.ts
import { AutomationService } from '../automation/automation.service';

/**
 * Hook para automação de recálculo quando expurgo é aprovado
 * Este hook deve ser chamado sempre que um expurgo muda para status 'APROVADO'
 */
export class ExpurgoAutomationHook {
  private automationService: AutomationService;

  constructor() {
    this.automationService = new AutomationService();
  }

  /**
   * Dispara recálculo automático quando expurgo é aprovado
   * Deve ser chamado no ExpurgoService após aprovação
   */
  async onExpurgoApproved(
    expurgoId: number,
    approvedByUserId: number
  ): Promise<void> {
    console.log(
      `[ExpurgoAutomationHook] Expurgo ${expurgoId} aprovado. Disparando recálculo automático...`
    );

    try {
      // Verificar se existe vigência ativa antes de tentar recalcular
      const activePeriod = await this.automationService.getActivePeriodInfo();

      if (!activePeriod) {
        console.warn(
          `[ExpurgoAutomationHook] Nenhuma vigência ativa encontrada. Recálculo não executado.`
        );
        return;
      }

      if (activePeriod.status !== 'ATIVA') {
        console.warn(
          `[ExpurgoAutomationHook] Vigência ${activePeriod.mesAno} não está ATIVA (status: ${activePeriod.status}). Recálculo não executado.`
        );
        return;
      }

      // Executar recálculo parcial (sem ETL, apenas recálculo)
      const result = await this.automationService.runPartialRecalculation({
        triggeredBy: 'expurgo',
        userId: approvedByUserId,
      });

      if (result.success) {
        console.log(
          `[ExpurgoAutomationHook] ✅ Recálculo automático concluído com sucesso para expurgo ${expurgoId}`
        );
        console.log(
          `[ExpurgoAutomationHook] Tempo de execução: ${result.executionTimeMs}ms`
        );
      } else {
        console.error(
          `[ExpurgoAutomationHook] ❌ Falha no recálculo automático para expurgo ${expurgoId}:`,
          result.error
        );
      }
    } catch (error) {
      console.error(
        `[ExpurgoAutomationHook] ❌ Erro crítico durante recálculo automático para expurgo ${expurgoId}:`,
        error
      );

      // TODO: Aqui poderia enviar notificação para administradores
      // await this.notifyAdmins('Falha no recálculo automático pós-expurgo', error);
    }
  }

  /**
   * Hook para quando meta é alterada (futuro uso)
   * Por enquanto apenas log, pois metas só mudam em PLANEJAMENTO
   */
  async onMetaChanged(
    parameterId: number,
    changedByUserId: number
  ): Promise<void> {
    console.log(
      `[ExpurgoAutomationHook] Meta alterada (parâmetro ${parameterId}). Verificando necessidade de ações...`
    );

    try {
      const activePeriod = await this.automationService.getActivePeriodInfo();

      if (!activePeriod) {
        console.log(
          `[ExpurgoAutomationHook] Nenhuma vigência ativa. Alteração de meta registrada apenas.`
        );
        return;
      }

      if (activePeriod.status === 'PLANEJAMENTO') {
        console.log(
          `[ExpurgoAutomationHook] Vigência em PLANEJAMENTO. Meta alterada normalmente, sem necessidade de recálculo.`
        );
        return;
      }

      if (activePeriod.status === 'ATIVA') {
        console.warn(
          `[ExpurgoAutomationHook] ⚠️ Tentativa de alterar meta com vigência ATIVA. Isso não deveria acontecer!`
        );
        // TODO: Registrar alerta de segurança
        return;
      }

      if (activePeriod.status === 'FECHADA') {
        console.error(
          `[ExpurgoAutomationHook] ❌ Tentativa de alterar meta com vigência FECHADA. Violação de regra de negócio!`
        );
        // TODO: Registrar erro crítico de segurança
        return;
      }
    } catch (error) {
      console.error(
        `[ExpurgoAutomationHook] Erro ao processar alteração de meta:`,
        error
      );
    }
  }

  /**
   * Verifica se o sistema está pronto para automação
   * Útil para validações antes de hooks
   */
  async isSystemReadyForAutomation(): Promise<boolean> {
    try {
      const activePeriod = await this.automationService.getActivePeriodInfo();
      return activePeriod !== null && activePeriod.status === 'ATIVA';
    } catch (error) {
      console.error(
        '[ExpurgoAutomationHook] Erro ao verificar prontidão do sistema:',
        error
      );
      return false;
    }
  }
}
