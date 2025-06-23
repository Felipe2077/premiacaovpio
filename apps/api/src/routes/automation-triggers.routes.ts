// apps/api/src/routes/automation-triggers.routes.ts
// ✅ ARQUIVO DE ROTAS CORRIGIDO (ESTRUTURA REVERTIDA PARA PADRÃO SWAGGER)

import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { AuditLogService } from '../modules/audit/audit.service';
import { ExpurgoAutomationHook } from '../modules/expurgos/expurgo-automation.hook';
import { ParameterService } from '../modules/parameters/parameter.service';
import { CompetitionPeriodService } from '../modules/periods/period.service';

// Interfaces para requests
interface TriggerTestRequest {
  triggeredBy: 'manual' | 'test' | 'emergency';
  reason: string;
}

interface MetaChangeTestRequest {
  parameterId: number;
}

interface PeriodStatusChangeTestRequest {
  periodId: number;
  oldStatus: string;
  newStatus: string;
}

interface ExpurgoTestRequest {
  expurgoId: number;
  simulate?: boolean;
  reason?: string;
}

const automationTriggersRoutes = async (fastify: FastifyInstance) => {
  // Inicializar serviços
  const automationHook = new ExpurgoAutomationHook();
  const auditService = new AuditLogService();
  const parameterService = new ParameterService();
  const periodService = new CompetitionPeriodService();

  /**
   * GET /api/automation/triggers/status
   * Status geral dos triggers de automação
   */
  fastify.get(
    '/api/automation/triggers/status',
    {
      // CORREÇÃO: Propriedades do Swagger movidas para dentro do schema.
      // Se o erro de tipo persistir, o problema está na configuração do plugin
      // @fastify/swagger no seu arquivo de servidor principal (veja nota no final).
      schema: {
        description: 'Status geral dos triggers de automação',
        tags: ['Automation Triggers'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        request.log.info('GET /api/automation/triggers/status');

        // Buscar informações do sistema
        const [systemReady, hookStats, parameterConnectivity] =
          await Promise.all([
            automationHook.isSystemReadyForAutomation(),
            automationHook.getHookStats(),
            parameterService.testAutomationConnectivity(),
          ]);

        reply.send({
          success: true,
          data: {
            systemReady,
            activeJobs: hookStats.activeJobs,
            totalExpurgoJobs: hookStats.totalExpurgoJobs,
            totalMetaChangeJobs: hookStats.totalMetaChangeJobs,
            parameterServiceConnected: parameterConnectivity.isReady,
            lastCheck: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        request.log.error(
          `Erro em GET /api/automation/triggers/status: ${error.message}`
        );
        reply.status(500).send({
          success: false,
          error:
            error.message || 'Erro interno ao verificar status dos triggers',
        });
      }
    }
  );

  /**
   * POST /api/automation/triggers/test-connectivity
   * Testa conectividade completa do sistema
   */
  fastify.post(
    '/api/automation/triggers/test-connectivity',
    {
      // preHandler: [fastify.authenticate], // Descomente se você tem autenticação
      schema: {
        description: 'Testa conectividade completa do sistema de automação',
        tags: ['Automation Triggers'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const startTime = Date.now();
        request.log.info('POST /api/automation/triggers/test-connectivity');

        // Testar todos os componentes
        const [systemReady, parameterConnectivity, periodSystemReady] =
          await Promise.all([
            automationHook.isSystemReadyForAutomation(),
            parameterService.testAutomationConnectivity(),
            periodService.isSystemReadyForAutomation(),
          ]);

        const testDuration = Date.now() - startTime;
        const allReady =
          systemReady && parameterConnectivity.isReady && periodSystemReady;

        reply.send({
          success: allReady,
          data: {
            systemReady,
            parameterService: {
              isReady: parameterConnectivity.isReady,
              message: parameterConnectivity.message,
            },
            periodService: {
              isReady: periodSystemReady,
            },
            testTimestamp: new Date().toISOString(),
            testDurationMs: testDuration,
          },
        });
      } catch (error: any) {
        request.log.error(
          `Erro em POST /api/automation/triggers/test-connectivity: ${error.message}`
        );
        reply.status(500).send({
          success: false,
          error: error.message || 'Erro interno no teste de conectividade',
        });
      }
    }
  );

  /**
   * POST /api/automation/triggers/test-meta-change
   * Testa trigger de alteração de meta
   */
  fastify.post<{ Body: MetaChangeTestRequest }>(
    '/api/automation/triggers/test-meta-change',
    {
      // preHandler: [fastify.authenticate],
      schema: {
        description: 'Testa trigger de alteração de meta',
        tags: ['Automation Triggers'],
        body: {
          type: 'object',
          required: ['parameterId'],
          properties: {
            parameterId: {
              type: 'number',
              description: 'ID do parâmetro que foi alterado',
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: MetaChangeTestRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const startTime = Date.now();
        const { parameterId } = request.body;
        const userId = 999; // ID de teste - ajuste conforme sua autenticação

        request.log.info(
          `POST /api/automation/triggers/test-meta-change - Parâmetro: ${parameterId}`
        );

        // Executar trigger de teste
        const result = await automationHook.onMetaChanged(parameterId, userId);

        const executionTime = Date.now() - startTime;

        reply.send({
          success: result.success,
          message: result.message,
          data: {
            parameterId,
            triggerExecuted: true,
            executionTimeMs: executionTime,
            jobId: result.jobId,
          },
        });
      } catch (error: any) {
        request.log.error(
          `Erro em POST /api/automation/triggers/test-meta-change: ${error.message}`
        );
        reply.status(500).send({
          success: false,
          error: error.message || 'Erro interno no teste de trigger de meta',
        });
      }
    }
  );

  /**
   * POST /api/automation/triggers/test-period-status
   * Testa trigger de mudança de status de período
   */
  fastify.post<{ Body: PeriodStatusChangeTestRequest }>(
    '/api/automation/triggers/test-period-status',
    {
      // preHandler: [fastify.authenticate],
      schema: {
        description: 'Testa trigger de mudança de status de período',
        tags: ['Automation Triggers'],
        body: {
          type: 'object',
          required: ['periodId', 'oldStatus', 'newStatus'],
          properties: {
            periodId: { type: 'number' },
            oldStatus: { type: 'string' },
            newStatus: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: PeriodStatusChangeTestRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const startTime = Date.now();
        const { periodId, oldStatus, newStatus } = request.body;
        const userId = 999; // ID de teste

        request.log.info(
          `POST /api/automation/triggers/test-period-status - Período: ${periodId}, ${oldStatus} → ${newStatus}`
        );

        // Executar trigger de teste
        const result = await automationHook.onPeriodStatusChanged(
          periodId,
          oldStatus,
          newStatus,
          userId
        );

        const executionTime = Date.now() - startTime;

        reply.send({
          success: result.success,
          message: result.message,
          data: {
            periodId,
            oldStatus,
            newStatus,
            triggerExecuted: true,
            executionTimeMs: executionTime,
            jobId: result.jobId,
          },
        });
      } catch (error: any) {
        request.log.error(
          `Erro em POST /api/automation/triggers/test-period-status: ${error.message}`
        );
        reply.status(500).send({
          success: false,
          error: error.message || 'Erro interno no teste de trigger de período',
        });
      }
    }
  );

  /**
   * POST /api/automation/triggers/test-expurgo-approved
   * Testa trigger de expurgo aprovado
   */
  fastify.post<{ Body: ExpurgoTestRequest }>(
    '/api/automation/triggers/test-expurgo-approved',
    {
      // preHandler: [fastify.authenticate],
      schema: {
        description: 'Testa trigger de expurgo aprovado',
        tags: ['Automation Triggers'],
        body: {
          type: 'object',
          required: ['expurgoId'],
          properties: {
            expurgoId: { type: 'number' },
            simulate: { type: 'boolean' },
            reason: { type: 'string' },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: ExpurgoTestRequest }>,
      reply: FastifyReply
    ) => {
      try {
        const startTime = Date.now();
        const {
          expurgoId,
          simulate = true,
          reason = 'Teste de trigger',
        } = request.body;
        const userId = 999; // ID de teste

        request.log.info(
          `POST /api/automation/triggers/test-expurgo-approved - Expurgo: ${expurgoId}, Simulação: ${simulate}`
        );

        const systemReady = await automationHook.isSystemReadyForAutomation();

        if (!systemReady && !simulate) {
          return reply.status(400).send({
            success: false,
            message: 'Sistema não está pronto para automação',
            data: {
              expurgoId,
              triggerExecuted: false,
              simulationMode: simulate,
              systemReady: false,
            },
          });
        }

        if (simulate) {
          // Apenas simular o trigger
          console.log(
            `[API Test] Simulando trigger de expurgo aprovado - ID: ${expurgoId}`
          );

          const executionTime = Date.now() - startTime;

          reply.send({
            success: true,
            message: `Trigger de expurgo simulado com sucesso`,
            data: {
              expurgoId,
              triggerExecuted: true,
              simulationMode: true,
              executionTimeMs: executionTime,
              systemReady,
            },
          });
        } else {
          // Executar trigger real
          const result = await automationHook.onExpurgoApproved(
            expurgoId,
            userId
          );

          const executionTime = Date.now() - startTime;

          reply.send({
            success: result.success,
            message: result.message,
            data: {
              expurgoId,
              triggerExecuted: true,
              simulationMode: false,
              executionTimeMs: executionTime,
              systemReady,
              jobId: result.jobId,
            },
          });
        }
      } catch (error: any) {
        request.log.error(
          `Erro em POST /api/automation/triggers/test-expurgo-approved: ${error.message}`
        );
        reply.status(500).send({
          success: false,
          error: error.message || 'Erro interno no teste de trigger de expurgo',
        });
      }
    }
  );

  /**
   * GET /api/automation/triggers/statistics
   * Estatísticas de triggers para um período
   */
  fastify.get<{ Querystring: { periodMesAno?: string } }>(
    '/api/automation/triggers/statistics',
    {
      schema: {
        description: 'Estatísticas de triggers para um período',
        tags: ['Automation Triggers'],
        querystring: {
          type: 'object',
          properties: {
            periodMesAno: {
              type: 'string',
              description: 'Período no formato YYYY-MM',
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Querystring: { periodMesAno?: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { periodMesAno } = request.query;

        if (!periodMesAno) {
          return reply.status(400).send({
            success: false,
            error: 'Parâmetro periodMesAno é obrigatório',
          });
        }

        request.log.info(
          `GET /api/automation/triggers/statistics - Período: ${periodMesAno}`
        );

        const statistics =
          await auditService.getTriggerStatistics(periodMesAno);

        reply.send({
          success: true,
          data: {
            period: periodMesAno,
            ...statistics,
            generatedAt: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        request.log.error(
          `Erro em GET /api/automation/triggers/statistics: ${error.message}`
        );
        reply.status(500).send({
          success: false,
          error: error.message || 'Erro interno ao buscar estatísticas',
        });
      }
    }
  );

  /**
   * GET /api/automation/triggers/errors
   * Buscar erros críticos de triggers
   */
  fastify.get<{ Querystring: { periodMesAno?: string; limit?: number } }>(
    '/api/automation/triggers/errors',
    {
      schema: {
        description: 'Busca erros críticos de triggers',
        tags: ['Automation Triggers'],
        querystring: {
          type: 'object',
          properties: {
            periodMesAno: { type: 'string' },
            limit: { type: 'number', default: 50 },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: { periodMesAno?: string; limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { periodMesAno, limit = 50 } = request.query;

        request.log.info(
          `GET /api/automation/triggers/errors - Período: ${periodMesAno || 'todos'}`
        );

        const criticalErrors = await auditService.findCriticalTriggerErrors(
          periodMesAno,
          limit
        );

        reply.send({
          success: true,
          data: {
            period: periodMesAno || 'all',
            errorCount: criticalErrors.length,
            errors: criticalErrors.map((error) => ({
              id: error.id,
              timestamp: error.timestamp,
              actionType: error.actionType,
              entityType: error.entityType,
              entityId: error.entityId,
              userId: error.userId,
              userName: error.userName,
              error: error.details?.error,
              triggerType: error.details?.triggerType,
            })),
            generatedAt: new Date().toISOString(),
          },
        });
      } catch (error: any) {
        request.log.error(
          `Erro em GET /api/automation/triggers/errors: ${error.message}`
        );
        reply.status(500).send({
          success: false,
          error: error.message || 'Erro interno ao buscar erros críticos',
        });
      }
    }
  );

  /**
   * GET /api/automation/triggers/health
   * Health check completo do sistema de triggers
   */
  fastify.get(
    '/api/automation/triggers/health',
    {
      schema: {
        description: 'Health check completo do sistema de triggers',
        tags: ['Automation Triggers'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const timestamp = new Date().toISOString();

        request.log.info('GET /api/automation/triggers/health');

        // Executar health checks
        const checks = {
          automationHook: await checkAutomationHook(),
          parameterService: await checkParameterService(),
          periodService: await checkPeriodService(),
          auditService: await checkAuditService(),
        };

        // Calcular status geral
        const totalChecks = Object.keys(checks).length;
        const passedChecks = Object.values(checks).filter(
          (check) => check.status === 'healthy'
        ).length;
        const failedChecks = totalChecks - passedChecks;

        let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
        if (failedChecks === 0) {
          overallStatus = 'healthy';
        } else if (failedChecks < totalChecks / 2) {
          overallStatus = 'degraded';
        } else {
          overallStatus = 'unhealthy';
        }

        const healthResponse = {
          status: overallStatus,
          timestamp,
          version: '3.1.0',
          checks,
          summary: {
            totalChecks,
            passedChecks,
            failedChecks,
          },
        };

        const httpStatus =
          overallStatus === 'healthy'
            ? 200
            : overallStatus === 'degraded'
              ? 200
              : 503;

        reply.status(httpStatus).send(healthResponse);
      } catch (error: any) {
        request.log.error(
          `Erro em GET /api/automation/triggers/health: ${error.message}`
        );
        reply.status(503).send({
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          version: '3.1.0',
          error: error.message || 'Erro crítico no health check',
        });
      }
    }
  );

  // ✅ FUNÇÕES AUXILIARES PARA HEALTH CHECKS

  async function checkAutomationHook(): Promise<{
    status: string;
    responseTimeMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const isReady = await automationHook.isSystemReadyForAutomation();
      const responseTime = Date.now() - startTime;

      return {
        status: isReady ? 'healthy' : 'degraded',
        responseTimeMs: responseTime,
        error: isReady ? undefined : 'Sistema não está pronto para automação',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        responseTimeMs: responseTime,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async function checkParameterService(): Promise<{
    status: string;
    responseTimeMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const connectivity = await parameterService.testAutomationConnectivity();
      const responseTime = Date.now() - startTime;

      return {
        status: connectivity.isReady ? 'healthy' : 'degraded',
        responseTimeMs: responseTime,
        error: connectivity.isReady ? undefined : connectivity.message,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        responseTimeMs: responseTime,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async function checkPeriodService(): Promise<{
    status: string;
    responseTimeMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const isReady = await periodService.isSystemReadyForAutomation();
      const responseTime = Date.now() - startTime;

      return {
        status: isReady ? 'healthy' : 'degraded',
        responseTimeMs: responseTime,
        error: isReady ? undefined : 'Sistema de períodos não está pronto',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        responseTimeMs: responseTime,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async function checkAuditService(): Promise<{
    status: string;
    responseTimeMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      // Teste simples do audit service
      await auditService.getAuditLogs(1);
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTimeMs: responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'unhealthy',
        responseTimeMs: responseTime,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  fastify.log.info('✅ Rotas de Triggers de Automação registradas');
};

export default fp(automationTriggersRoutes, {
  name: 'automation-triggers-routes',
});
