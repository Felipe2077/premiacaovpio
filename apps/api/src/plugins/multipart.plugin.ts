// apps/api/src/plugins/multipart.plugin.ts

import fastifyMultipart from '@fastify/multipart';
import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Plugin para upload de arquivos com @fastify/multipart
 * Inclui verificação para evitar registro duplicado
 */
const multipartPlugin: FastifyPluginAsync = async (
  fastify: FastifyInstance
) => {
  // Verificar se o plugin já foi registrado
  if (fastify.hasDecorator('multipartErrors')) {
    fastify.log.warn(
      '⚠️  Plugin multipart já foi registrado, ignorando duplicação'
    );
    return;
  }

  try {
    await fastify.register(fastifyMultipart, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB máximo por arquivo
        files: 5, // máximo 5 arquivos por upload
        fieldSize: 1024 * 1024, // 1MB para campos de texto
        headerPairs: 2000, // máximo de headers
      },
      attachFieldsToBody: true,
      sharedSchemaId: 'MultipartFileType',
    });

    fastify.log.info('✅ Plugin de multipart (@fastify/multipart) registrado');
  } catch (error: any) {
    if (error.code === 'FST_ERR_DEC_ALREADY_PRESENT') {
      fastify.log.warn('⚠️  Plugin multipart já registrado, ignorando erro');
    } else {
      throw error; // Re-throw outros erros
    }
  }
};

export default fp(multipartPlugin, {
  name: 'multipart-plugin',
});
