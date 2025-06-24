// apps/api/src/plugins/services.ts - CORRIGIDO COM USERSERVICE
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
import { UserService } from '@/services/user.service'; // 🆕 IMPORT ADICIONADO

// Tipos para os serviços - ATUALIZADO
interface Services {
  ranking: RankingService;
  parameter: ParameterService;
  auditLog: AuditLogService;
  expurgo: ExpurgoService;
  competitionPeriod: CompetitionPeriodService;
  history: HistoryService;
  auth: AuthService;
  user: UserService; // 🆕 TIPO ADICIONADO
}

// Declarar módulo do Fastify para adicionar os serviços
declare module 'fastify' {
  interface FastifyInstance {
    services: Services;
  }
}

/**
 * Plugin para injeção de dependência dos serviços
 * CORRIGIDO: Agora inclui UserService
 */
const servicesPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Instanciar todos os serviços - ATUALIZADO
  const services: Services = {
    ranking: new RankingService(),
    parameter: new ParameterService(),
    auditLog: new AuditLogService(),
    expurgo: new ExpurgoService(),
    competitionPeriod: new CompetitionPeriodService(),
    history: new HistoryService(),
    auth: new AuthService(),
    user: new UserService(), // 🆕 INSTÂNCIA ADICIONADA
  };

  // Decorar a instância do Fastify com os serviços
  fastify.decorate('services', services);

  // Log de confirmação expandido
  fastify.log.info('✅ Serviços registrados via dependency injection:');
  fastify.log.info('   - RankingService');
  fastify.log.info('   - ParameterService');
  fastify.log.info('   - AuditLogService');
  fastify.log.info('   - ExpurgoService');
  fastify.log.info('   - CompetitionPeriodService');
  fastify.log.info('   - HistoryService');
  fastify.log.info('   - AuthService');
  fastify.log.info('   - UserService (🆕 CRUD de Usuários)');

  // Health check básico dos serviços
  fastify.addHook('onReady', async () => {
    try {
      // Testar conectividade dos serviços principais
      const authHealth = await services.auth.healthCheck();
      const userHealth = await services.user.healthCheck();

      if (authHealth.healthy && userHealth.healthy) {
        fastify.log.info('🎉 Todos os serviços principais estão funcionando');
        fastify.log.info(
          `   - AuthService: ${authHealth.details.usersCount} usuários`
        );
        fastify.log.info(
          `   - UserService: ${userHealth.details.usersCount} usuários`
        );
      } else {
        fastify.log.warn('⚠️ Alguns serviços podem ter problemas:');
        if (!authHealth.healthy) {
          fastify.log.warn(`   - AuthService: ${authHealth.details.error}`);
        }
        if (!userHealth.healthy) {
          fastify.log.warn(`   - UserService: ${userHealth.details.error}`);
        }
      }
    } catch (error) {
      fastify.log.warn('⚠️ Erro no health check dos serviços:', error);
    }
  });
};

export default fp(servicesPlugin, {
  name: 'services-plugin',
});
