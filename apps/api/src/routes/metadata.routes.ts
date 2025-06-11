// apps/api/src/routes/metadata.routes.ts (VERSÃO FINAL E COMPLETA)
import { AppDataSource } from '@/database/data-source';
import { CriterionEntity } from '@/entity/criterion.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const metadataRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * GET /api/criteria/active - Rota com correção de CORS
   */
  fastify.get(
    '/api/criteria/active',
    {
      // Hook onSend para forçar os cabeçalhos de CORS
      onSend: async (request, reply, payload) => {
        reply.header('Access-Control-Allow-Origin', 'http://localhost:3000');
        reply.header('Access-Control-Allow-Credentials', 'true');
      },
    },
    async (request, reply) => {
      request.log.info('Recebida requisição GET /api/criteria/active');
      try {
        const criterionRepo = AppDataSource.getRepository(CriterionEntity);
        const activeCriteria = await criterionRepo.find({
          where: { ativo: true },
          select: [
            'id',
            'nome',
            'index',
            'descricao',
            'unidade_medida',
            'sentido_melhor',
            'ativo',
            'casasDecimaisPadrao',
          ],
          order: { index: 'ASC', id: 'ASC' },
        });

        if (!activeCriteria || activeCriteria.length === 0) {
          request.log.warn('Nenhum critério ativo encontrado no banco.');
          return reply.send([]);
        }

        request.log.info(
          `Retornando ${activeCriteria.length} critérios ativos.`
        );
        return reply.send(activeCriteria);
      } catch (error: any) {
        request.log.error('Erro ao buscar critérios ativos:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Erro desconhecido no servidor';
        return reply.status(500).send({
          message: 'Erro interno ao buscar critérios ativos',
          error: errorMessage,
        });
      }
    }
  );

  /**
   * GET /api/sectors/active - Rota com correção de CORS
   */
  fastify.get(
    '/api/sectors/active',
    {
      // Hook onSend para forçar os cabeçalhos de CORS
      onSend: async (request, reply, payload) => {
        reply.header('Access-Control-Allow-Origin', 'http://localhost:3000');
        reply.header('Access-Control-Allow-Credentials', 'true');
      },
    },
    async (request, reply) => {
      request.log.info('Recebida requisição GET /api/sectors/active');
      try {
        const sectorRepo = AppDataSource.getRepository(SectorEntity);
        const activeSectors = await sectorRepo.find({
          where: { ativo: true },
          select: ['id', 'nome'],
          order: { nome: 'ASC' },
        });

        if (!activeSectors) {
          request.log.warn('Nenhum setor ativo encontrado no banco.');
          return reply.send([]);
        }

        request.log.info(`Retornando ${activeSectors.length} setores ativos.`);
        return reply.send(activeSectors);
      } catch (error: any) {
        request.log.error('Erro ao buscar setores ativos:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Erro desconhecido';
        return reply.status(500).send({
          message: 'Erro interno ao buscar setores ativos',
          error: errorMessage,
        });
      }
    }
  );

  fastify.log.info('✅ Rotas de Metadados registradas');
};

export default fp(metadataRoutes, {
  name: 'metadata-routes',
});
