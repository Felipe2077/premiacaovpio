// apps/api/src/controllers/parameters.controller.ts
import { CriterionCalculationSettingsService } from '@/modules/parameters/criterion-calculation-settings.service';
import { ParameterService } from '@/modules/parameters/parameter.service';
import { AuthService } from '@/services/auth.service';
import {
  CalculateParameterDto,
  CreateParameterDto,
  UpdateParameterDto,
} from '@sistema-premiacao/shared-types';
import { FastifyReply, FastifyRequest } from 'fastify';

interface Services {
  parameter: ParameterService;
  auth: AuthService;
}

interface GetParametersQuery {
  period?: string;
  sectorId?: string;
  criterionId?: string;
  onlyActive?: string;
}

/**
 * Controller para rotas de parâmetros/metas
 */
export class ParametersController {
  constructor(private services: Services) {}

  /**
   * GET /api/parameters - Listar parâmetros
   */
  async getParameters(request: FastifyRequest, reply: FastifyReply) {
    try {
      request.log.info('GET /api/parameters - Query Params:', request.query);

      const queryParams = request.query as GetParametersQuery;

      if (!queryParams.period) {
        return reply.status(400).send({
          message: "Query parameter 'period' (formato YYYY-MM) é obrigatório.",
        });
      }

      const sectorIdNum = queryParams.sectorId
        ? parseInt(queryParams.sectorId, 10)
        : undefined;
      const criterionIdNum = queryParams.criterionId
        ? parseInt(queryParams.criterionId, 10)
        : undefined;
      const onlyActive = queryParams.onlyActive !== 'false';

      if (queryParams.sectorId && isNaN(sectorIdNum!)) {
        return reply.status(400).send({
          message: "Query parameter 'sectorId' deve ser um número.",
        });
      }
      if (queryParams.criterionId && isNaN(criterionIdNum!)) {
        return reply.status(400).send({
          message: "Query parameter 'criterionId' deve ser um número.",
        });
      }

      const data = await this.services.parameter.findParametersForPeriod(
        queryParams.period,
        sectorIdNum,
        criterionIdNum,
        onlyActive
      );

      request.log.info(
        `GET /api/parameters - Retornando ${data.length} parâmetros`
      );
      reply.send(data);
    } catch (error: any) {
      request.log.error(`Erro em getParameters: ${error.message}`);
      reply.status(500).send({
        error: error.message || 'Erro interno ao buscar parâmetros.',
      });
    }
  }

  /**
   * GET /api/parameters/:id - Buscar parâmetro por ID
   */
  async getParameterById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      const parameterId = parseInt(params.id, 10);

      request.log.info(`GET /api/parameters/${parameterId}`);

      if (isNaN(parameterId)) {
        return reply.status(400).send({ message: 'ID do parâmetro inválido.' });
      }

      const parameter =
        await this.services.parameter.findParameterById(parameterId);
      if (!parameter) {
        return reply.status(404).send({
          message: `Parâmetro com ID ${parameterId} não encontrado.`,
        });
      }
      reply.send(parameter);
    } catch (error: any) {
      request.log.error(`Erro em getParameterById: ${error.message}`);
      reply.status(500).send({
        error: error.message || 'Erro interno ao buscar parâmetro.',
      });
    }
  }

  /**
   * POST /api/parameters - Criar parâmetro
   */
  async createParameter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const createData = request.body as CreateParameterDto;

      // Usar usuário autenticado real
      const actingUser = await this.services.auth.getUserById(request.user!.id);
      if (!actingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      request.log.info('POST /api/parameters com dados:', createData);

      const newParameter = await this.services.parameter.createParameter(
        createData,
        actingUser as any
      );
      reply.status(201).send(newParameter);
    } catch (error: any) {
      request.log.error(`Erro em createParameter: ${error.message}`);
      if (
        error.message.includes('obrigatórios') ||
        error.message.includes('não encontrado') ||
        error.message.includes('inválido')
      ) {
        reply.status(400).send({ error: error.message });
      } else if (error.message.includes('Já existe uma meta ativa')) {
        reply.status(409).send({ error: error.message });
      } else {
        reply.status(500).send({
          error: error.message || 'Erro interno ao criar parâmetro.',
        });
      }
    }
  }

  /**
   * PUT /api/parameters/:id - Atualizar parâmetro
   */
  async updateParameter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as UpdateParameterDto;

      request.log.info(`PUT /api/parameters/${id} - Dados recebidos:`, data);

      const idNum = parseInt(id, 10);
      if (isNaN(idNum)) {
        return reply.status(400).send({ message: 'ID inválido.' });
      }

      // Usar usuário autenticado real
      const actingUser = await this.services.auth.getUserById(request.user!.id);
      if (!actingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      const updatedParameter = await this.services.parameter.updateParameter(
        idNum,
        data,
        actingUser as any
      );

      request.log.info(
        `Parâmetro ID ${id} atualizado com sucesso por ${actingUser.email}.`
      );
      reply.send(updatedParameter);
    } catch (error: any) {
      request.log.error(
        `Erro em updateParameter ID ${request.params}:`,
        error.message
      );

      let statusCode = 500;
      let errorMessage =
        error.message || 'Erro interno ao atualizar parâmetro.';

      if (errorMessage.includes('não encontrado')) {
        statusCode = 404;
      } else if (
        errorMessage.includes('não podem ser alteradas') ||
        errorMessage.includes('Justificativa é obrigatória') ||
        errorMessage.includes('deve estar dentro do período') ||
        errorMessage.includes('não pode ser anterior') ||
        errorMessage.includes('já está expirado')
      ) {
        statusCode = 409;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  /**
   * DELETE /api/parameters/:id - Deletar parâmetro
   */
  async deleteParameter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      const parameterId = parseInt(params.id, 10);
      const body = request.body as { justificativa?: string };

      // Usar usuário autenticado real
      const actingUser = await this.services.auth.getUserById(request.user!.id);
      if (!actingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      request.log.info(
        `DELETE /api/parameters/${parameterId} por ${actingUser.email}`
      );

      if (isNaN(parameterId)) {
        return reply.status(400).send({ message: 'ID do parâmetro inválido.' });
      }
      if (!body || !body.justificativa) {
        return reply.status(400).send({
          message: 'Justificativa é obrigatória para deletar o parâmetro.',
        });
      }

      const deletedParameter = await this.services.parameter.deleteParameter(
        parameterId,
        actingUser as any,
        body.justificativa
      );
      reply.send(deletedParameter);
    } catch (error: any) {
      request.log.error(`Erro em deleteParameter: ${error.message}`);
      if (error.message.includes('não encontrado')) {
        reply.status(404).send({ error: error.message });
      } else if (
        error.message.includes('expirado') ||
        error.message.includes('não pode ser deletado') ||
        error.message.includes('não iniciou sua vigência')
      ) {
        reply.status(409).send({ error: error.message });
      } else {
        reply.status(500).send({
          error: error.message || 'Erro interno ao deletar parâmetro.',
        });
      }
    }
  }

  /**
   * POST /api/parameters/calculate - Calcular parâmetro automaticamente
   */
  async calculateParameter(request: FastifyRequest, reply: FastifyReply) {
    try {
      const calculateData = request.body as CalculateParameterDto;

      // Usar usuário autenticado real
      const actingUser = await this.services.auth.getUserById(request.user!.id);
      if (!actingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      request.log.info(
        'POST /api/parameters/calculate com dados:',
        calculateData
      );

      const result = await this.services.parameter.calculateParameter(
        calculateData,
        actingUser as any
      );
      reply.send(result);
    } catch (error: any) {
      request.log.error(`Erro em calculateParameter: ${error.message}`);

      let statusCode = 500;
      let errorMessage = error.message || 'Erro interno ao calcular parâmetro.';

      if (errorMessage.includes('não encontrado')) {
        statusCode = 404;
      } else if (
        errorMessage.includes('obrigatórios') ||
        errorMessage.includes('Não há dados históricos')
      ) {
        statusCode = 400;
      }

      reply.status(statusCode).send({ error: errorMessage });
    }
  }

  /**
   * GET /api/criteria/:criterionId/calculation-settings - Configurações de cálculo
   */
  async getCalculationSettings(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { criterionId } = request.params as { criterionId: string };
      const criterionIdNum = parseInt(criterionId, 10);

      if (isNaN(criterionIdNum)) {
        return reply.status(400).send({ error: 'ID do critério inválido.' });
      }

      const criterionCalculationSettingsService =
        new CriterionCalculationSettingsService();
      const settings =
        await criterionCalculationSettingsService.getSettingsForCriterion(
          criterionIdNum
        );

      if (!settings) {
        return reply.status(404).send({
          message: `Nenhuma configuração de cálculo encontrada para o critério ID: ${criterionIdNum}`,
          defaultSettings: {
            criterionId: criterionIdNum,
            calculationMethod: 'media3',
            adjustmentPercentage: 0,
            requiresRounding: true,
            roundingMethod: 'nearest',
            roundingDecimalPlaces: 0,
          },
        });
      }

      reply.send(settings);
    } catch (error: any) {
      request.log.error(`Erro em getCalculationSettings: ${error.message}`);
      reply.status(500).send({
        error:
          error.message || 'Erro interno ao buscar configurações de cálculo.',
      });
    }
  }

  /**
   * GET /api/parameters/projection - Projeta o valor de um critério
   */
  async getProjection(request: FastifyRequest, reply: FastifyReply) {
    try {
      const {
        criterionId,
        startDate,
        endDate,
        targetMonth,
      } = request.query as {
        criterionId: string;
        startDate: string;
        endDate: string;
        targetMonth: string;
      };

      request.log.info(
        `GET /api/parameters/projection - Query: ${JSON.stringify(request.query)}`
      );

      if (!criterionId || !startDate || !endDate || !targetMonth) {
        return reply.status(400).send({
          message:
            'Query params criterionId, startDate, endDate, e targetMonth são obrigatórios.',
        });
      }

      const data = await this.services.parameter.getProjectionData({
        criterionId: parseInt(criterionId, 10),
        startDate,
        endDate,
        targetMonth,
      });

      reply.send(data);
    } catch (error: any) {
      request.log.error(`Erro em getProjection: ${error.message}`);
      reply.status(500).send({
        error: error.message || 'Erro interno ao calcular projeção.',
      });
    }
  }
}
