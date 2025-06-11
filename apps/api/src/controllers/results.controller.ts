// apps/api/src/controllers/results.controller.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { RankingService } from '@/modules/ranking/ranking.service';
import { FastifyReply, FastifyRequest } from 'fastify';

interface Services {
  ranking: RankingService;
}

/**
 * Controller para rotas de resultados e rankings
 */
export class ResultsController {
  constructor(private services: Services) {}

  /**
   * GET /api/ranking - Ranking atual
   */
  async getCurrentRanking(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = await this.services.ranking.getCurrentRanking();
      reply.send(data);
    } catch (error: any) {
      request.log.error(`Erro em getCurrentRanking: ${error.message}`);
      reply.status(500).send({
        error: error.message || 'Erro interno ao buscar ranking atual.',
      });
    }
  }

  /**
   * GET /api/results/by-date - Resultados por data
   */
  async getResultsByDate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as {
        period?: string;
        targetDate?: string;
      };
      const { period, targetDate } = query;

      request.log.info(
        `GET /api/results/by-date - Período: ${period || 'não especificado'}, Data alvo: ${targetDate || 'não especificada'}`
      );

      const data = await this.services.ranking.getDetailedResultsByDate(
        period,
        targetDate
      );

      request.log.info(
        `GET /api/results/by-date - Resultados encontrados: ${data.length}`
      );
      reply.send(data);
    } catch (error: any) {
      request.log.error(`Erro em getResultsByDate: ${error.message}`, error);
      reply.status(500).send({
        error: error.message || 'Erro interno ao buscar resultados por data.',
      });
    }
  }

  /**
   * GET /api/results - Resultados gerais
   */
  async getResults(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as { period?: string };
      const period = query.period;

      request.log.info(
        `GET /api/results - Período solicitado: ${period || 'não especificado'}`
      );

      const data = await this.services.ranking.getDetailedResults(period);

      request.log.info(
        `GET /api/results - Resultados encontrados: ${data.length}`
      );
      reply.send(data);
    } catch (error: any) {
      request.log.error(`Erro em getResults: ${error.message}`, error);
      reply.status(500).send({
        error: error.message || 'Erro interno ao buscar resultados.',
      });
    }
  }

  /**
   * GET /api/results/current - Resultados do período ativo
   */
  async getCurrentResults(request: FastifyRequest, reply: FastifyReply) {
    try {
      const periodRepository = AppDataSource.getRepository(
        CompetitionPeriodEntity
      );
      const activePeriod = await periodRepository.findOne({
        where: { status: 'ATIVA' },
      });

      if (!activePeriod) {
        reply.status(404).send({ error: 'Nenhuma vigência ATIVA encontrada' });
        return;
      }

      request.log.info(
        `Buscando resultados para vigência ATIVA: ${activePeriod.mesAno}`
      );

      const data = await this.services.ranking.getDetailedResults(
        activePeriod.mesAno
      );
      reply.send(data);
    } catch (error: any) {
      request.log.error(`Erro em getCurrentResults: ${error.message}`);
      reply.status(500).send({
        error: error.message || 'Erro interno ao buscar resultados atuais.',
      });
    }
  }

  /**
   * GET /api/results/by-period - Resultados por período
   */
  async getResultsByPeriod(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = request.query as { period?: string };
      const { period } = query;

      if (!period || !period.match(/^\d{4}-\d{2}$/)) {
        return reply
          .status(400)
          .send({ error: 'Formato de período inválido. Use YYYY-MM' });
      }

      request.log.info(`GET /api/results/by-period - Período: ${period}`);

      const parts = period.split('-');
      if (parts.length !== 2) {
        return reply
          .status(400)
          .send({ error: 'Formato de período inválido. Use YYYY-MM' });
      }

      const yearStr = parts[0];
      const monthStr = parts[1];

      if (!yearStr || !monthStr) {
        return reply
          .status(400)
          .send({ error: 'Formato de período inválido. Use YYYY-MM' });
      }

      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return reply
          .status(400)
          .send({ error: 'Valores de ano ou mês inválidos' });
      }

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      request.log.info(`Intervalo de datas: ${startDateStr} a ${endDateStr}`);

      if (!startDateStr || !endDateStr) {
        return reply.status(500).send({ error: 'Erro ao formatar datas' });
      }

      const data = await this.services.ranking.getDetailedResultsByDateRange(
        period,
        startDateStr,
        endDateStr
      );

      request.log.info(
        `GET /api/results/by-period - Resultados encontrados: ${data.length}`
      );
      reply.send(data);
    } catch (error: any) {
      request.log.error(`Erro em getResultsByPeriod: ${error.message}`, error);
      reply.status(500).send({
        error:
          error.message || 'Erro interno ao buscar resultados por período.',
      });
    }
  }

  /**
   * GET /api/results/period/:id - Resultados por ID do período
   */
  async getResultsByPeriodId(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const periodRepository = AppDataSource.getRepository(
        CompetitionPeriodEntity
      );

      const period = await periodRepository.findOne({
        where: { id: parseInt(id) },
      });

      if (!period) {
        reply
          .status(404)
          .send({ error: `Vigência com ID ${id} não encontrada` });
        return;
      }

      request.log.info(
        `Buscando resultados para vigência ID ${id}: ${period.mesAno} (${period.status})`
      );

      const data = await this.services.ranking.getDetailedResults(
        period.mesAno
      );
      reply.send(data);
    } catch (error: any) {
      request.log.error(`Erro em getResultsByPeriodId: ${error.message}`);
      reply.status(500).send({
        error:
          error.message ||
          'Erro interno ao buscar resultados por ID do período.',
      });
    }
  }
}
