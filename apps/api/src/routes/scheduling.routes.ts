// apps/api/src/routes/scheduling.routes.ts
import { SchedulingController } from '@/controllers/scheduling.controller';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const schedulingRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  const controller = new SchedulingController();

  // Rotas básicas para teste (esqueleto)
  fastify.get('/api/scheduling/schedules', {
    schema: {
      description: 'Lista agendamentos (versão esqueleto)',
      tags: ['Scheduling'],
    },
  }, controller.getSchedules.bind(controller));

  fastify.get('/api/scheduling/system/status', {
    schema: {
      description: 'Status do sistema (versão esqueleto)',
      tags: ['Scheduling'],
    },
  }, controller.getSystemStatus.bind(controller));

  fastify.get('/api/scheduling/templates', {
    schema: {
      description: 'Templates predefinidos (versão esqueleto)',
      tags: ['Scheduling'],
    },
  }, controller.getScheduleTemplates.bind(controller));

  // Outras rotas retornam 501 (Not Implemented)
  fastify.post('/api/scheduling/schedules', controller.createSchedule.bind(controller));
  fastify.get('/api/scheduling/schedules/:id', controller.getScheduleById.bind(controller));
  fastify.put('/api/scheduling/schedules/:id', controller.updateSchedule.bind(controller));
  fastify.delete('/api/scheduling/schedules/:id', controller.deleteSchedule.bind(controller));
  fastify.post('/api/scheduling/schedules/:id/execute', controller.executeScheduleNow.bind(controller));
  fastify.post('/api/scheduling/system/restart', controller.restartSystem.bind(controller));
  fastify.get('/api/scheduling/system/health', controller.healthCheck.bind(controller));

  fastify.log.info('✅ Rotas de Agendamento (esqueleto) registradas');
};

export default fp(schedulingRoutes, {
  name: 'scheduling-routes',
});
