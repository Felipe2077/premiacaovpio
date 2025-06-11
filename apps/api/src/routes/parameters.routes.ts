// apps/api/src/routes/parameters.routes.ts
import { ParametersController } from '@/controllers/parameters.controller';
import {
  auditAdminAction,
  manageParameters,
  requirePermissions,
} from '@/middleware/rbac.middleware';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin de rotas de parâmetros/metas
 */
const parametersRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  fastify.addHook('preHandler', fastify.auth([fastify.authenticate]));

  // Instanciar controller com serviços injetados
  const controller = new ParametersController({
    parameter: fastify.services.parameter,
    auth: fastify.services.auth,
  });

  /**
   * GET /api/parameters - Listar parâmetros
   * Query params: period (obrigatório), sectorId, criterionId, onlyActive
   */
  fastify.get(
    '/api/parameters',
    {
      preHandler: [
        (fastify as any).authenticate,
        requirePermissions('view_parameters' as any),
      ],
    },
    controller.getParameters.bind(controller)
  );

  /**
   * GET /api/parameters/:id - Buscar parâmetro por ID
   */
  fastify.get(
    '/api/parameters/:id',
    {
      preHandler: [
        (fastify as any).authenticate,
        requirePermissions('view_parameters' as any),
      ],
    },
    controller.getParameterById.bind(controller)
  );

  /**
   * POST /api/parameters - Criar novo parâmetro
   */
  fastify.post(
    '/api/parameters',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageParameters,
        auditAdminAction('CREATE_PARAMETER'),
      ],
    },
    controller.createParameter.bind(controller)
  );

  /**
   * PUT /api/parameters/:id - Atualizar parâmetro existente
   */
  fastify.put(
    '/api/parameters/:id',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageParameters,
        auditAdminAction('UPDATE_PARAMETER'),
      ],
    },
    controller.updateParameter.bind(controller)
  );

  /**
   * DELETE /api/parameters/:id - Deletar parâmetro
   */
  fastify.delete(
    '/api/parameters/:id',
    {
      preHandler: [
        (fastify as any).authenticate,
        manageParameters,
        auditAdminAction('DELETE_PARAMETER'),
      ],
    },
    controller.deleteParameter.bind(controller)
  );

  /**
   * POST /api/parameters/calculate - Calcular parâmetro automaticamente
   */
  fastify.post(
    '/api/parameters/calculate',
    {
      preHandler: [(fastify as any).authenticate, manageParameters],
    },
    controller.calculateParameter.bind(controller)
  );

  /**
   * GET /api/criteria/:criterionId/calculation-settings - Configurações de cálculo
   */
  fastify.get(
    '/api/criteria/:criterionId/calculation-settings',
    {
      preHandler: [
        (fastify as any).authenticate,
        requirePermissions('view_parameters' as any),
      ],
    },
    controller.getCalculationSettings.bind(controller)
  );

  fastify.log.info('✅ Rotas de Parâmetros registradas');
};

export default fp(parametersRoutes, {
  name: 'parameters-routes',
});
