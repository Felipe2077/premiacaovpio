// apps/api/src/server.ts (ATUALIZADO COM NOVO SERVIÇO E ROTA)
import { AppDataSource } from '@/database/data-source';
import cors from '@fastify/cors';
import * as dotenv from 'dotenv';
import Fastify from 'fastify';
// Importa todos os serviços
import { CriterionEntity } from '@/entity/criterion.entity';
import { AuditLogService } from '@/modules/audit/audit.service';
import { ExpurgoService } from '@/modules/expurgos/expurgo.service';
import { ParameterService } from '@/modules/parameters/parameter.service';
import { CompetitionPeriodService } from '@/modules/periods/period.service';
import { RankingService } from '@/modules/ranking/ranking.service';
import {
  ApproveRejectExpurgoDto,
  CreateExpurgoDto,
  CreateParameterDto,
  ExpurgoStatus,
  FindExpurgosDto,
  UpdateParameterDto,
} from '@sistema-premiacao/shared-types';
import { SectorEntity } from './entity/sector.entity';
import { UserEntity } from './entity/user.entity';

dotenv.config();

const fastify = Fastify({ logger: true });

// --- Instanciar TODOS os Serviços ---
const rankingService = new RankingService();
const parameterService = new ParameterService();
const auditLogService = new AuditLogService();
const expurgoService = new ExpurgoService();
const competitionPeriodService = new CompetitionPeriodService();

// Função start async
const start = async () => {
  try {
    // Registrar CORS
    await fastify.register(cors, {
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        /http:\/\/192\.168\.\d+\.\d+:3000/,
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });
    fastify.log.info('Plugin CORS registrado.');

    // Inicializar DB
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      fastify.log.info('Data Source Postgres inicializado pelo servidor.');
      console.log(
        '<== AppDataSource.initialize() CONCLUÍDO (sem erro lançado).'
      );
      try {
        console.log('==> Verificando tabelas existentes via TypeORM...');
        const queryRunner = AppDataSource.createQueryRunner();
        // Tenta pegar info sobre tabelas que DEVERIAM existir
        const tableNames = [
          'sectors',
          'criteria',
          'roles',
          'users',
          'user_roles_role', // <- Tabela de junção M-N
          'parameter_values',
          'performance_data',
          'audit_logs',
          'expurgo_events',
          'competition_periods',
        ];
        const tables = await queryRunner.getTables(tableNames);
        await queryRunner.release();
        if (tables.length > 0) {
          console.log(
            `<== TypeORM encontrou ${tables.length} tabelas:`,
            tables.map((t) => t.name)
          );
        } else {
          console.warn(
            "<== TypeORM NÃO encontrou NENHUMA das tabelas esperadas no schema 'public'. Sincronização não ocorreu?"
          );
        }
      } catch (getTableError) {
        console.error(
          '<== ERRO ao tentar verificar tabelas via TypeORM:',
          getTableError
        );
      }
      // -----------------------------------------

      // --- NOVO: Tentar Sincronização Explícita ---
      try {
        console.log(
          '==> Tentando sincronização explícita do schema (AppDataSource.synchronize())...'
        );
        // O primeiro argumento 'false' seria para não dropar o schema,
        // mas como synchronize:true já está na config, talvez não precise.
        // Vamos chamar sem argumentos.
        await AppDataSource.synchronize();
        console.log(
          '<== Sincronização explícita CONCLUÍDA (ou não lançou erro).'
        );
        // Se a sincronização explícita funcionar, você verá os CREATE TABLE aqui!
      } catch (syncErr) {
        console.error('<== ERRO durante sincronização EXPLÍCITA:', syncErr);
      }
    } else {
      console.log('AppDataSource já estava inicializado.');
      // Mesmo que já estivesse inicializado, vamos tentar a sync explícita
      try {
        console.log(
          '==> Tentando sincronização explícita do schema (AppDataSource já init)...'
        );
        await AppDataSource.synchronize();
        console.log(
          '<== Sincronização explícita concluída (ou não lançou erro).'
        );
      } catch (syncErr) {
        console.error(
          '<== ERRO durante sincronização EXPLÍCITA (DS já init):',
          syncErr
        );
      }
    }

    // --- Registrar Rotas ---
    fastify.get('/api/ranking', async (request, reply) => {
      try {
        const data = await rankingService.getCurrentRanking();
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/ranking: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro.' });
      }
    });

    fastify.get('/api/results', async (request, reply) => {
      try {
        const data = await rankingService.getDetailedResults();
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/results: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro.' });
      }
    });

    // Handler agora usa o serviço atualizado (retorna dados com nomes)
    fastify.get('/api/parameters', async (request, reply) => {
      fastify.log.info('GET /api/parameters - Query Params:', request.query);
      // Define uma interface para os query parameters esperados
      interface GetParametersQuery {
        period?: string; // YYYY-MM
        sectorId?: string;
        criterionId?: string;
      }
      const queryParams = request.query as GetParametersQuery;

      // O periodMesAno é obrigatório para o serviço
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

      if (queryParams.sectorId && isNaN(sectorIdNum!)) {
        // O ! é para o TS saber que se queryParams.sectorId existe, sectorIdNum foi tentado
        return reply
          .status(400)
          .send({ message: "Query parameter 'sectorId' deve ser um número." });
      }
      if (queryParams.criterionId && isNaN(criterionIdNum!)) {
        return reply.status(400).send({
          message: "Query parameter 'criterionId' deve ser um número.",
        });
      }

      try {
        // Garante inicialização do AppDataSource
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();

        const data = await parameterService.findParametersForPeriod(
          queryParams.period, // Passa o periodMesAno
          sectorIdNum, // Passa o sectorId (ou undefined)
          criterionIdNum // Passa o criterionId (ou undefined)
        );
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em GET /api/parameters: ${error.message}`);
        reply.status(500).send({
          error: error.message || 'Erro interno ao buscar parâmetros.',
        });
      }
    });

    // Handler agora usa o serviço atualizado (retorna dados com user)
    fastify.get('/api/audit-logs', async (request, reply) => {
      try {
        const data = await auditLogService.getAuditLogs(50);
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/audit-logs: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro.' });
      }
    });

    // --- NOVA ROTA PARA CRITÉRIOS ATIVOS ---
    fastify.get('/api/criteria/active', async (request, reply) => {
      fastify.log.info('Recebida requisição GET /api/criteria/active');
      try {
        // Pega o repositório DENTRO do handler
        const criterionRepo = AppDataSource.getRepository(CriterionEntity);

        const activeCriteria = await criterionRepo.find({
          where: { ativo: true },
          // Seleciona apenas os campos que o frontend precisa (otimização)
          select: ['id', 'nome', 'index'],
          order: { id: 'ASC' }, // Ordena para consistência
        });

        if (!activeCriteria || activeCriteria.length === 0) {
          fastify.log.warn('Nenhum critério ativo encontrado no banco.');
          return reply.send([]); // Retorna array vazio
        }

        fastify.log.info(
          `Retornando ${activeCriteria.length} critérios ativos.`
        );
        return reply.send(activeCriteria); // Envia a lista como JSON
      } catch (error: any) {
        fastify.log.error('Erro ao buscar critérios ativos:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Erro desconhecido no servidor';
        return reply.status(500).send({
          message: 'Erro interno ao buscar critérios ativos',
          error: errorMessage,
        });
      }
    });

    // --- NOVA ROTA PARA SETORES ATIVOS ---
    fastify.get('/api/sectors/active', async (request, reply) => {
      fastify.log.info('Recebida requisição GET /api/sectors/active');
      try {
        // Pega o repositório DENTRO do handler
        const sectorRepo = AppDataSource.getRepository(SectorEntity);

        const activeSectors = await sectorRepo.find({
          where: { ativo: true },
          select: ['id', 'nome'], // Apenas ID e Nome, como esperado pelo fetcher do frontend
          order: { nome: 'ASC' }, // Ordena por nome A-Z
        });

        if (!activeSectors) {
          fastify.log.warn(
            'Nenhum setor ativo encontrado no banco (find retornou null/undefined?).'
          );
          return reply.send([]);
        }

        fastify.log.info(`Retornando ${activeSectors.length} setores ativos.`);
        return reply.send(activeSectors); // Envia a lista como JSON
      } catch (error: any) {
        fastify.log.error('Erro ao buscar setores ativos:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido';
        return reply.status(500).send({
          message: 'Erro interno ao buscar setores ativos',
          error: errorMessage,
        });
      }
    });

    // --- ROTAS PARA PERIODOS DE COMPETIÇÃO ---
    fastify.get('/api/periods/active', async (request, reply) => {
      fastify.log.info('GET /api/periods/active');
      try {
        const data = await competitionPeriodService.findCurrentActivePeriod();
        if (!data)
          return reply
            .status(404)
            .send({ message: 'Nenhum período ativo encontrado.' });
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/periods/active: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro interno.' });
      }
    });

    fastify.get('/api/periods/latest-closed', async (request, reply) => {
      fastify.log.info('GET /api/periods/latest-closed');
      try {
        const data = await competitionPeriodService.findLatestClosedPeriod();
        if (!data)
          return reply
            .status(404)
            .send({ message: 'Nenhum período fechado encontrado.' });
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(
          `Erro em /api/periods/latest-closed: ${error.message}`
        );
        reply.status(500).send({ error: error.message || 'Erro interno.' });
      }
    });

    fastify.get('/api/periods/planning', async (request, reply) => {
      fastify.log.info('GET /api/periods/planning');
      try {
        const data =
          await competitionPeriodService.findOrCreatePlanningPeriod();
        // findOrCreatePlanningPeriod já deve lançar erro se não conseguir criar/achar
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/periods/planning: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro interno.' });
      }
    });

    fastify.get('/api/periods', async (request, reply) => {
      fastify.log.info('GET /api/periods');
      try {
        // Adicionar query param para limit, opcional
        // const limit = (request.query as { limit?: string }).limit;
        // const data = await competitionPeriodService.findAllPeriods(limit ? parseInt(limit) : 12);
        const data = await competitionPeriodService.findAllPeriods(); // Pega padrão de 12
        reply.send(data);
      } catch (error: any) {
        fastify.log.error(`Erro em /api/periods: ${error.message}`);
        reply.status(500).send({ error: error.message || 'Erro interno.' });
      }
    });

    // Endpoint para INICIAR um período de competição
    fastify.post('/api/periods/:id/start', async (request, reply) => {
      const params = request.params as { id: string };
      const periodId = parseInt(params.id, 10);
      // TODO: Obter o ID do usuário logado (actingUser) quando tivermos autenticação
      // Por enquanto, vamos simular um usuário admin
      const mockActingUser = {
        id: 1,
        nome: 'Admin Sistema (Mock)',
      } as UserEntity; // Cuidado com o tipo UserEntity aqui

      fastify.log.info(`POST /api/periods/${periodId}/start solicitado`);
      if (isNaN(periodId)) {
        return reply.status(400).send({ message: 'ID do período inválido.' });
      }

      try {
        // Garante que o AppDataSource está inicializado ANTES de chamar o serviço
        // (O serviço também faz isso, mas é uma segurança extra no handler da rota)
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();

        const updatedPeriod = await competitionPeriodService.startPeriod(
          periodId,
          mockActingUser
        );
        reply.send(updatedPeriod);
      } catch (error: any) {
        fastify.log.error(
          `Erro em POST /api/periods/${periodId}/start: ${error.message}`
        );
        // Enviar um status code mais apropriado dependendo do erro do serviço
        if (
          error.message.includes('não encontrado') ||
          error.message.includes('inválido')
        ) {
          reply.status(404).send({ error: error.message });
        } else if (error.message.includes('não está em status')) {
          reply.status(409).send({ error: error.message }); // Conflict
        } else {
          reply.status(500).send({
            error: error.message || 'Erro interno ao iniciar período.',
          });
        }
      }
    });

    // Endpoint para FECHAR um período de competição
    fastify.post('/api/periods/:id/close', async (request, reply) => {
      const params = request.params as { id: string };
      const periodId = parseInt(params.id, 10);
      const mockActingUser = {
        id: 1,
        nome: 'Admin Sistema (Mock)',
      } as UserEntity; // Simulação

      fastify.log.info(`POST /api/periods/${periodId}/close solicitado`);
      if (isNaN(periodId)) {
        return reply.status(400).send({ message: 'ID do período inválido.' });
      }

      try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();

        const updatedPeriod = await competitionPeriodService.closePeriod(
          periodId,
          mockActingUser
        );
        // O método closePeriod já chama o calculationService
        reply.send(updatedPeriod);
      } catch (error: any) {
        fastify.log.error(
          `Erro em POST /api/periods/${periodId}/close: ${error.message}`
        );
        if (
          error.message.includes('não encontrado') ||
          error.message.includes('inválido')
        ) {
          reply.status(404).send({ error: error.message });
        } else if (
          error.message.includes('não está em status') ||
          error.message.includes('só pode ser fechado após')
        ) {
          reply.status(409).send({ error: error.message }); // Conflict
        } else {
          reply.status(500).send({
            error: error.message || 'Erro interno ao fechar período.',
          });
        }
      }
    });
    // Rota GET para buscar um parâmetro/meta específico por ID
    fastify.get('/api/parameters/:id', async (request, reply) => {
      const params = request.params as { id: string };
      const parameterId = parseInt(params.id, 10);
      fastify.log.info(`GET /api/parameters/${parameterId}`);

      if (isNaN(parameterId)) {
        return reply.status(400).send({ message: 'ID do parâmetro inválido.' });
      }
      try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const parameter = await parameterService.findParameterById(parameterId);
        if (!parameter) {
          return reply.status(404).send({
            message: `Parâmetro com ID ${parameterId} não encontrado.`,
          });
        }
        reply.send(parameter);
      } catch (error: any) {
        fastify.log.error(
          `Erro em GET /api/parameters/${parameterId}: ${error.message}`
        );
        reply.status(500).send({
          error: error.message || 'Erro interno ao buscar parâmetro.',
        });
      }
    });

    // Rota PUT para ATUALIZAR um parâmetro/meta (com versionamento)
    fastify.put('/api/parameters/:id', async (request, reply) => {
      const params = request.params as { id: string };
      const parameterId = parseInt(params.id, 10);
      // TODO: Validar o corpo da requisição com Zod usando UpdateParameterDto
      const updateData = request.body as UpdateParameterDto;
      // TODO: Obter o ID do usuário logado (actingUser)
      const mockActingUser = {
        id: 1,
        nome: 'Admin Sistema (Mock)',
      } as UserEntity;

      fastify.log.info(
        `PUT /api/parameters/${parameterId} com dados:`,
        updateData
      );
      if (isNaN(parameterId)) {
        return reply.status(400).send({ message: 'ID do parâmetro inválido.' });
      }
      if (!updateData.justificativa) {
        // Justificativa é crucial para update
        return reply.status(400).send({
          message: 'Justificativa é obrigatória para atualizar o parâmetro.',
        });
      }

      try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const updatedParameter = await parameterService.updateParameter(
          parameterId,
          updateData,
          mockActingUser
        );
        reply.send(updatedParameter);
      } catch (error: any) {
        fastify.log.error(
          `Erro em PUT /api/parameters/${parameterId}: ${error.message}`
        );
        if (error.message.includes('não encontrado')) {
          reply.status(404).send({ error: error.message });
        } else if (
          error.message.includes('expirado') ||
          error.message.includes('não podem ser alteradas') ||
          error.message.includes('anterior à sua data de início') ||
          error.message.includes('posterior à data de fim')
        ) {
          reply.status(409).send({ error: error.message }); // Conflict or Bad Request
        } else {
          reply.status(500).send({
            error: error.message || 'Erro interno ao atualizar parâmetro.',
          });
        }
      }
    });
    // Em apps/api/src/server.ts, dentro da função start(), na seção de rotas de parâmetros

    // --- ADICIONAR ESTA ROTA POST ---
    fastify.post('/api/parameters', async (request, reply) => {
      // TODO: Validar o corpo da requisição com Zod usando CreateParameterDto
      const createData = request.body as CreateParameterDto;
      // TODO: Obter o ID do usuário logado (actingUser)
      const mockActingUser = {
        id: 1,
        nome: 'Admin Sistema (Mock)',
      } as UserEntity; // Simulação

      fastify.log.info('POST /api/parameters com dados:', createData);

      try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const newParameter = await parameterService.createParameter(
          createData,
          mockActingUser
        );
        reply.status(201).send(newParameter); // 201 Created
      } catch (error: any) {
        fastify.log.error(`Erro em POST /api/parameters: ${error.message}`);
        if (
          error.message.includes('obrigatórios') ||
          error.message.includes('não encontrado') ||
          error.message.includes('inválido')
        ) {
          reply.status(400).send({ error: error.message }); // Bad Request
        } else if (error.message.includes('Já existe uma meta ativa')) {
          reply.status(409).send({ error: error.message }); // Conflict
        } else {
          reply.status(500).send({
            error: error.message || 'Erro interno ao criar parâmetro.',
          });
        }
      }
    });
    // --- FIM DA ROTA POST ---

    // Rota DELETE para "DELETAR" logicamente um parâmetro/meta
    fastify.delete('/api/parameters/:id', async (request, reply) => {
      const params = request.params as { id: string };
      const parameterId = parseInt(params.id, 10);
      // O corpo da requisição DELETE deve conter a justificativa
      const body = request.body as { justificativa?: string };
      const mockActingUser = {
        id: 1,
        nome: 'Admin Sistema (Mock)',
      } as UserEntity;

      fastify.log.info(`DELETE /api/parameters/${parameterId}`);
      if (isNaN(parameterId)) {
        return reply.status(400).send({ message: 'ID do parâmetro inválido.' });
      }
      if (!body || !body.justificativa) {
        return reply.status(400).send({
          message: 'Justificativa é obrigatória para deletar o parâmetro.',
        });
      }

      try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const deletedParameter = await parameterService.deleteParameter(
          parameterId,
          mockActingUser,
          body.justificativa
        );
        reply.send(deletedParameter); // Retorna o parâmetro com dataFimEfetivo atualizada
      } catch (error: any) {
        fastify.log.error(
          `Erro em DELETE /api/parameters/${parameterId}: ${error.message}`
        );
        if (error.message.includes('não encontrado')) {
          reply.status(404).send({ error: error.message });
        } else if (
          error.message.includes('expirado') ||
          error.message.includes('não pode ser deletado') ||
          error.message.includes('não iniciou sua vigência')
        ) {
          reply.status(409).send({ error: error.message }); // Conflict or Bad Request
        } else {
          reply.status(500).send({
            error: error.message || 'Erro interno ao deletar parâmetro.',
          });
        }
      }
    });
    // --- ROTAS PARA GESTÃO DE EXPURGOS ---
    // Listar Expurgos (com filtros)
    fastify.get('/api/expurgos', async (request, reply) => {
      // Tipar query params para segurança e clareza
      const queryParams = request.query as {
        competitionPeriodId?: string;
        sectorId?: string;
        criterionId?: string;
        status?: ExpurgoStatus;
      };

      const filters: FindExpurgosDto = {};
      if (queryParams.competitionPeriodId)
        filters.competitionPeriodId = parseInt(
          queryParams.competitionPeriodId,
          10
        );
      if (queryParams.sectorId)
        filters.sectorId = parseInt(queryParams.sectorId, 10);
      if (queryParams.criterionId)
        filters.criterionId = parseInt(queryParams.criterionId, 10);
      if (queryParams.status) filters.status = queryParams.status;

      fastify.log.info('GET /api/expurgos com filtros:', filters);
      try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const expurgos = await expurgoService.findExpurgos(filters);
        reply.send(expurgos);
      } catch (error: any) {
        fastify.log.error(`Erro em GET /api/expurgos: ${error.message}`);
        reply
          .status(500)
          .send({ error: error.message || 'Erro interno ao buscar expurgos.' });
      }
    });

    // Buscar um Expurgo específico por ID
    fastify.get('/api/expurgos/:id', async (request, reply) => {
      const params = request.params as { id: string };
      const expurgoId = parseInt(params.id, 10);
      fastify.log.info(`GET /api/expurgos/${expurgoId}`);

      if (isNaN(expurgoId)) {
        return reply.status(400).send({ message: 'ID do expurgo inválido.' });
      }
      try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const expurgo = await expurgoService.findExpurgoById(expurgoId);
        if (!expurgo) {
          return reply
            .status(404)
            .send({ message: `Expurgo com ID ${expurgoId} não encontrado.` });
        }
        reply.send(expurgo);
      } catch (error: any) {
        fastify.log.error(
          `Erro em GET /api/expurgos/${expurgoId}: ${error.message}`
        );
        reply
          .status(500)
          .send({ error: error.message || 'Erro interno ao buscar expurgo.' });
      }
    });

    // Solicitar um novo Expurgo
    fastify.post('/api/expurgos/request', async (request, reply) => {
      // TODO: Validar o corpo da requisição com Zod usando CreateExpurgoDto
      const data = request.body as CreateExpurgoDto;
      // TODO: Obter o ID do usuário logado (requestingUser) da autenticação
      const mockRequestingUser = {
        id: 2,
        nome: 'Usuário Solicitante (Mock)',
      } as UserEntity; // Simulação

      fastify.log.info('POST /api/expurgos/request com dados:', data);
      try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const newExpurgo = await expurgoService.requestExpurgo(
          data,
          mockRequestingUser
        );
        reply.status(201).send(newExpurgo); // 201 Created
      } catch (error: any) {
        fastify.log.error(
          `Erro em POST /api/expurgos/request: ${error.message}`
        );
        if (
          error.message.includes('obrigatórios') ||
          error.message.includes('não encontrado') ||
          error.message.includes('não é elegível')
        ) {
          reply.status(400).send({ error: error.message }); // Bad Request
        } else {
          reply.status(500).send({
            error: error.message || 'Erro interno ao solicitar expurgo.',
          });
        }
      }
    });

    // Aprovar um Expurgo
    fastify.post('/api/expurgos/:id/approve', async (request, reply) => {
      const params = request.params as { id: string };
      const expurgoId = parseInt(params.id, 10);
      // TODO: Validar corpo com Zod usando ApproveRejectExpurgoDto
      const dto = request.body as ApproveRejectExpurgoDto;
      const mockApprovingUser = {
        id: 1,
        nome: 'Admin Aprovador (Mock)',
      } as UserEntity; // Simulação

      fastify.log.info(`POST /api/expurgos/${expurgoId}/approve`);
      if (isNaN(expurgoId)) {
        return reply.status(400).send({ message: 'ID do expurgo inválido.' });
      }
      if (!dto || !dto.justificativaAprovacaoOuRejeicao) {
        return reply
          .status(400)
          .send({ message: 'Justificativa é obrigatória.' });
      }
      try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const approvedExpurgo = await expurgoService.approveExpurgo(
          expurgoId,
          dto,
          mockApprovingUser
        );
        reply.send(approvedExpurgo);
      } catch (error: any) {
        fastify.log.error(
          `Erro em POST /api/expurgos/${expurgoId}/approve: ${error.message}`
        );
        if (
          error.message.includes('não encontrada') ||
          error.message.includes('inválido')
        ) {
          reply.status(404).send({ error: error.message });
        } else if (error.message.includes('não está com status PENDENTE')) {
          reply.status(409).send({ error: error.message }); // Conflict
        } else {
          reply.status(500).send({
            error: error.message || 'Erro interno ao aprovar expurgo.',
          });
        }
      }
    });

    // Rejeitar um Expurgo
    fastify.post('/api/expurgos/:id/reject', async (request, reply) => {
      const params = request.params as { id: string };
      const expurgoId = parseInt(params.id, 10);
      const dto = request.body as ApproveRejectExpurgoDto;
      const mockRejectingUser = {
        id: 1,
        nome: 'Admin Revisor (Mock)',
      } as UserEntity; // Simulação

      fastify.log.info(`POST /api/expurgos/${expurgoId}/reject`);
      if (isNaN(expurgoId)) {
        return reply.status(400).send({ message: 'ID do expurgo inválido.' });
      }
      if (!dto || !dto.justificativaAprovacaoOuRejeicao) {
        return reply
          .status(400)
          .send({ message: 'Justificativa é obrigatória.' });
      }
      try {
        if (!AppDataSource.isInitialized) await AppDataSource.initialize();
        const rejectedExpurgo = await expurgoService.rejectExpurgo(
          expurgoId,
          dto,
          mockRejectingUser
        );
        reply.send(rejectedExpurgo);
      } catch (error: any) {
        fastify.log.error(
          `Erro em POST /api/expurgos/${expurgoId}/reject: ${error.message}`
        );
        if (
          error.message.includes('não encontrada') ||
          error.message.includes('inválido')
        ) {
          reply.status(404).send({ error: error.message });
        } else if (error.message.includes('não está com status PENDENTE')) {
          reply.status(409).send({ error: error.message }); // Conflict
        } else {
          reply.status(500).send({
            error: error.message || 'Erro interno ao rejeitar expurgo.',
          });
        }
      }
    });
    // --- FIM ROTAS EXPURGOS ---
    // --- Fim das Rotas ---

    // --- Listen ---
    const port = Number(process.env.API_PORT) || 3001;
    const host = process.env.HOST || '0.0.0.0';
    await fastify.listen({ port: port, host: host });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
