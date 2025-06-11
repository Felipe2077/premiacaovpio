// apps/api/src/plugins/services.ts
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// Importar todos os serviços
import { AuditLogService } from '@/modules/audit/audit.service';
import { ExpurgoService } from '@/modules/expurgos/expurgo.service';
import { HistoryService } from '@/modules/historical/history.service';
import { ParameterService } from '@/modules/parameters/parameter.service';
import { CompetitionPeriodService } from '@/modules/periods/period.service';
import { RankingService } from '@/modules/ranking/ranking.service';
import { AuthService } from '@/services/auth.service';

// Tipos para os serviços
interface Services {
  ranking: RankingService;
  parameter: ParameterService;
  auditLog: AuditLogService;
  expurgo: ExpurgoService;
  competitionPeriod: CompetitionPeriodService;
  history: HistoryService;
  auth: AuthService;
}

// Declarar módulo do Fastify para adicionar os serviços
declare module 'fastify' {
  interface FastifyInstance {
    services: Services;
  }
}

/**
 * Plugin para injeção de dependência dos serviços
 */
const servicesPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Instanciar todos os serviços
  const services: Services = {
    ranking: new RankingService(),
    parameter: new ParameterService(),
    auditLog: new AuditLogService(),
    expurgo: new ExpurgoService(),
    competitionPeriod: new CompetitionPeriodService(),
    history: new HistoryService(),
    auth: new AuthService(),
  };

  // Decorar a instância do Fastify com os serviços
  fastify.decorate('services', services);

  fastify.log.info('✅ Serviços registrados via dependency injection.');
};

export default fp(servicesPlugin, {
  name: 'services-plugin',
});
