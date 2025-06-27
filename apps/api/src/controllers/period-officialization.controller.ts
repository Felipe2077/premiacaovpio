// apps/api/src/controllers/period-officialization.controller.ts
import { CompetitionPeriodService } from '@/modules/periods/period.service';
import { RankingService } from '@/modules/ranking/ranking.service';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * 🏛️ CONTROLLER PARA OFICIALIZAÇÃO DE PERÍODOS
 *
 * Responsabilidades:
 * 1. Listar períodos aguardando oficialização
 * 2. Mostrar ranking com análise de empates
 * 3. Oficializar períodos (com resolução de empates)
 * 4. Validar elegibilidade de setores para empates
 */
export class PeriodOfficializationController {
  constructor(
    private periodService: CompetitionPeriodService,
    private rankingService: RankingService
  ) {}

  /**
   * GET /api/periods/pending-officialization
   * Lista períodos que estão aguardando oficialização (status PRE_FECHADA)
   */
  async getPendingPeriods(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    try {
      console.log(
        '[PeriodOfficializationController] Buscando períodos pendentes...'
      );

      const pendingPeriods =
        await this.periodService.findPeriodsAwaitingOfficialization();

      reply.code(200).send({
        success: true,
        message: `${pendingPeriods.length} período(s) aguardando oficialização`,
        data: {
          periods: pendingPeriods.map((period) => ({
            id: period.id,
            mesAno: period.mesAno,
            dataInicio: period.dataInicio,
            dataFim: period.dataFim,
            status: period.status,
            createdAt: period.createdAt,
            // Não incluir dados sensíveis como usuário que fechou
          })),
          count: pendingPeriods.length,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        '[PeriodOfficializationController] Erro ao buscar períodos pendentes:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      reply.code(500).send({
        success: false,
        message: 'Erro ao buscar períodos pendentes',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/periods/:id/ranking-analysis
   * Retorna ranking completo com análise de empates para um período específico
   */
  async getRankingAnalysis(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const periodId = parseInt(request.params.id, 10);

      if (isNaN(periodId)) {
        reply.code(400).send({
          success: false,
          message: 'ID do período deve ser um número válido',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(
        `[PeriodOfficializationController] Analisando ranking para período ID: ${periodId}`
      );

      // Buscar período
      const period = await this.periodService.findPeriodById(periodId);
      if (!period) {
        reply.code(404).send({
          success: false,
          message: `Período com ID ${periodId} não encontrado`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Obter ranking com análise de empates
      const analysis = await this.rankingService.getRankingWithTieAnalysis(
        period.mesAno
      );

      reply.code(200).send({
        success: true,
        message: 'Análise de ranking obtida com sucesso',
        data: {
          period: {
            id: period.id,
            mesAno: period.mesAno,
            status: period.status,
            dataInicio: period.dataInicio,
            dataFim: period.dataFim,
          },
          ranking: analysis.ranking,
          tieAnalysis: analysis.tieAnalysis,
          metadata: analysis.metadata,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        '[PeriodOfficializationController] Erro na análise de ranking:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      reply.code(500).send({
        success: false,
        message: 'Erro ao analisar ranking',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * POST /api/periods/:id/officialize
   * Oficializa um período, definindo o vencedor oficial
   */
  async officializePeriod(
    request: FastifyRequest<{
      Params: { id: string };
      Body: {
        winnerSectorId: number;
        tieResolvedBy?: number;
        justification?: string;
      };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const periodId = parseInt(request.params.id, 10);
      const { winnerSectorId, tieResolvedBy, justification } = request.body;

      if (isNaN(periodId)) {
        reply.code(400).send({
          success: false,
          message: 'ID do período deve ser um número válido',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!winnerSectorId || isNaN(winnerSectorId)) {
        reply.code(400).send({
          success: false,
          message:
            'ID do setor vencedor é obrigatório e deve ser um número válido',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(
        `[PeriodOfficializationController] Oficializando período ID: ${periodId}, Vencedor: ${winnerSectorId}`
      );

      // Obter usuário atual da sessão (RBAC implementado)
      const currentUser = (request as any).user;
      if (!currentUser) {
        reply.code(401).send({
          success: false,
          message: 'Usuário não autenticado',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // O middleware já validou que é DIRETOR com permissões adequadas
      const directorUser = {
        id: currentUser.id,
        nome: currentUser.name || currentUser.email,
        email: currentUser.email,
      };

      // Executar oficialização
      const officializedPeriod = await this.periodService.officializePeriod(
        periodId,
        winnerSectorId,
        directorUser as any,
        tieResolvedBy
      );

      reply.code(200).send({
        success: true,
        message: `Período ${officializedPeriod.mesAno} oficializado com sucesso`,
        data: {
          period: {
            id: officializedPeriod.id,
            mesAno: officializedPeriod.mesAno,
            status: officializedPeriod.status,
            setorVencedorId: officializedPeriod.setorVencedorId,
            oficializadaPorUserId: officializedPeriod.oficializadaPorUserId,
            oficializadaEm: officializedPeriod.oficializadaEm,
            vencedorEmpateDefinidoPor:
              officializedPeriod.vencedorEmpateDefinidoPor,
          },
          justification,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        '[PeriodOfficializationController] Erro na oficialização:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      reply.code(500).send({
        success: false,
        message: 'Erro ao oficializar período',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET /api/periods/:id/tie-validation/:sectorName
   * Valida se um setor específico pode ser escolhido para resolver empate
   */
  async validateSectorForTie(
    request: FastifyRequest<{
      Params: { id: string; sectorName: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const periodId = parseInt(request.params.id, 10);
      const { sectorName } = request.params;

      if (isNaN(periodId)) {
        reply.code(400).send({
          success: false,
          message: 'ID do período deve ser um número válido',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (!sectorName || sectorName.trim() === '') {
        reply.code(400).send({
          success: false,
          message: 'Nome do setor é obrigatório',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      console.log(
        `[PeriodOfficializationController] Validando setor ${sectorName} para período ID: ${periodId}`
      );

      // Buscar período para obter mesAno
      const period = await this.periodService.findPeriodById(periodId);
      if (!period) {
        reply.code(404).send({
          success: false,
          message: `Período com ID ${periodId} não encontrado`,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Validar elegibilidade
      const validation =
        await this.rankingService.validateSectorForTieResolution(
          sectorName.toUpperCase().trim(),
          period.mesAno
        );

      reply.code(200).send({
        success: true,
        message: 'Validação de elegibilidade concluída',
        data: {
          period: {
            id: period.id,
            mesAno: period.mesAno,
            status: period.status,
          },
          sectorName: sectorName.toUpperCase().trim(),
          validation,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        '[PeriodOfficializationController] Erro na validação de setor:',
        error
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Erro interno do servidor';

      reply.code(500).send({
        success: false,
        message: 'Erro ao validar setor para resolução de empate',
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
