// apps/api/src/controllers/automation.controller.ts
import { FastifyReply, FastifyRequest } from 'fastify';
import {
  AutomationService,
  UpdateOptions,
} from '../modules/automation/automation.service';

/**
 * Interfaces para as requisições da API
 */
interface TriggerUpdateRequest {
  Body: {
    triggeredBy?: 'manual' | 'automatic' | 'expurgo' | 'meta-change';
    userId?: number;
    partialUpdate?: boolean; // Se true, executa apenas recálculo
  };
}

/**
 * Controller para gerenciar as operações de automação do ETL
 * Expõe APIs para disparar atualizações e monitorar status
 */
export class AutomationController {
  private automationService: AutomationService;

  constructor() {
    this.automationService = new AutomationService();
  }

  /**
   * POST /api/automation/trigger-update
   * Dispara uma atualização completa ou parcial
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
      } = request.body;

      console.log(
        `[AutomationController] Solicitação de atualização recebida:`,
        {
          triggeredBy,
          userId,
          partialUpdate,
        }
      );

      const options: UpdateOptions = {
        triggeredBy,
        userId,
      };

      // Decidir entre atualização completa ou parcial
      const result = partialUpdate
        ? await this.automationService.runPartialRecalculation(options)
        : await this.automationService.runFullUpdateForActivePeriod(options);

      if (result.success) {
        reply.code(200).send({
          success: true,
          message: partialUpdate
            ? 'Recálculo executado com sucesso'
            : 'Atualização completa executada com sucesso',
          data: result,
        });
      } else {
        reply.code(500).send({
          success: false,
          message: 'Erro durante a execução',
          error: result.error,
          data: result,
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
   * GET /api/automation/active-period
   * Retorna informações da vigência ativa
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
   * Específico para recálculo após aprovação de expurgo
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

      const options: UpdateOptions = {
        triggeredBy: 'expurgo',
        userId,
      };

      const result =
        await this.automationService.runPartialRecalculation(options);

      if (result.success) {
        reply.code(200).send({
          success: true,
          message: 'Recálculo pós-expurgo executado com sucesso',
          data: {
            ...result,
            expurgoId,
          },
        });
      } else {
        reply.code(500).send({
          success: false,
          message: 'Erro durante recálculo pós-expurgo',
          error: result.error,
          data: result,
        });
      }
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
   * Retorna status geral do sistema de automação
   */
  async getSystemStatus(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const activePeriod = await this.automationService.getActivePeriodInfo();

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
   * Valida se é possível executar operações na vigência ativa
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
}
