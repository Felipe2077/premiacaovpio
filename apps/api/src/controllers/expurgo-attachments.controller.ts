// apps/api/src/controllers/expurgo-attachments.controller.ts

import { AppDataSource } from '@/database/data-source';
import { ExpurgoService } from '@/modules/expurgos/expurgo.service';
import { AuthService } from '@/services/auth.service';
import { FastifyReply, FastifyRequest } from 'fastify';
import * as fs from 'fs';

interface Services {
  expurgo: ExpurgoService;
  auth: AuthService;
}

// Interface para dados do arquivo (compatível com @fastify/multipart)
interface FileData {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/**
 * Controller para anexos de expurgos
 */
export class ExpurgoAttachmentsController {
  constructor(private services: Services) {}

  /**
   * POST /api/expurgos/:id/anexos/upload - Upload de anexo
   */
  async uploadAttachment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      const expurgoId = parseInt(params.id, 10);

      request.log.info(`[API] POST /api/expurgos/${expurgoId}/anexos/upload`);

      if (isNaN(expurgoId) || expurgoId <= 0) {
        return reply.status(400).send({
          error: 'ID do expurgo deve ser um número positivo',
        });
      }

      // Verificar se é multipart usando o método correto
      if (!request.isMultipart()) {
        return reply.status(400).send({
          error:
            'Requisição deve ser multipart/form-data para upload de arquivo',
        });
      }

      await AppDataSource.initialize();

      // Usar o método file() do plugin @fastify/multipart
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({
          error: 'Nenhum arquivo foi enviado',
        });
      }

      // Converter o arquivo para buffer
      const buffer = await data.toBuffer();

      // Preparar dados do arquivo no formato esperado pelo service
      const fileData: FileData = {
        originalname: data.filename,
        buffer: buffer,
        mimetype: data.mimetype,
        size: buffer.length,
      };

      // Extrair descrição dos fields se presente
      const fields = data.fields;
      let description: string | undefined;

      if (fields && typeof fields === 'object') {
        const descField = (fields as any).description;
        if (descField && typeof descField === 'object' && descField.value) {
          description = descField.value;
        }
      }

      // Usar usuário autenticado real

      const uploadingUser = await this.services.auth.getUserById(
        request.user.id // Use 'request' diretamente
      );

      if (!uploadingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      const result = await this.services.expurgo.uploadAttachment(
        expurgoId,
        fileData,
        uploadingUser as any,
        description
      );

      request.log.info(
        `[API] Anexo enviado com sucesso para expurgo ${expurgoId} - ID: ${result.attachment.id} por ${uploadingUser.email}`
      );

      reply.status(201).send({
        success: true,
        attachment: {
          id: result.attachment.id,
          originalFileName: result.attachment.originalFileName,
          fileSize: result.attachment.fileSize,
          mimeType: result.attachment.mimeType,
          uploadedAt: result.attachment.uploadedAt,
          description: result.attachment.description,
          downloadUrl: `/api/expurgos/anexos/${result.attachment.id}/download`,
        },
      });
    } catch (error: any) {
      request.log.error(`[API] Erro em uploadAttachment:`, error);

      let statusCode = 500;
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (
        error.message.includes('muito grande') ||
        error.message.includes('não permitido') ||
        error.message.includes('não é possível enviar')
      ) {
        statusCode = 400;
      }

      reply.status(statusCode).send({
        error: error.message || 'Erro interno ao fazer upload do anexo.',
      });
    }
  }

  /**
   * GET /api/expurgos/:id/anexos - Listar anexos do expurgo
   */
  async getAttachments(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { id: string };
      const expurgoId = parseInt(params.id, 10);

      request.log.info(`[API] GET /api/expurgos/${expurgoId}/anexos`);

      if (isNaN(expurgoId) || expurgoId <= 0) {
        return reply.status(400).send({
          error: 'ID do expurgo deve ser um número positivo',
        });
      }

      await AppDataSource.initialize();

      const anexos =
        await this.services.expurgo.getExpurgoAttachments(expurgoId);

      const anexosFormatados = anexos.map((anexo) => ({
        id: anexo.id,
        originalFileName: anexo.originalFileName,
        fileSize: anexo.fileSize,
        mimeType: anexo.mimeType,
        uploadedAt: anexo.uploadedAt,
        uploadedBy: anexo.uploadedBy
          ? {
              id: anexo.uploadedBy.id,
              nome: anexo.uploadedBy.nome,
            }
          : undefined,
        description: anexo.description,
        downloadUrl: `/api/expurgos/anexos/${anexo.id}/download`,
        isImage: anexo.isImage(),
        isPdf: anexo.isPdf(),
        formattedSize: anexo.getFormattedFileSize(),
      }));

      request.log.info(
        `[API] Encontrados ${anexosFormatados.length} anexos para expurgo ${expurgoId}`
      );
      reply.send(anexosFormatados);
    } catch (error: any) {
      request.log.error(`[API] Erro em getAttachments:`, error);
      reply.status(500).send({
        error: error.message || 'Erro interno ao buscar anexos.',
      });
    }
  }

  /**
   * GET /api/expurgos/anexos/:attachmentId/download - Download de anexo
   */
  async downloadAttachment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { attachmentId: string };
      const attachmentId = parseInt(params.attachmentId, 10);

      request.log.info(
        `[API] GET /api/expurgos/anexos/${attachmentId}/download`
      );

      if (isNaN(attachmentId) || attachmentId <= 0) {
        return reply.status(400).send({
          error: 'ID do anexo deve ser um número positivo',
        });
      }

      await AppDataSource.initialize();

      // Buscar informações do anexo
      const attachmentService = new (
        await import('@/modules/expurgos/expurgo-attachment.service.js')
      ).ExpurgoAttachmentService();

      const attachment =
        await attachmentService.findAttachmentById(attachmentId);

      if (!attachment) {
        return reply.status(404).send({
          error: `Anexo com ID ${attachmentId} não encontrado.`,
        });
      }

      // Obter caminho do arquivo
      const filePath =
        await this.services.expurgo.getAttachmentDownloadPath(attachmentId);

      // Verificar se arquivo existe
      try {
        await fs.promises.access(filePath);
      } catch {
        return reply.status(404).send({
          error: 'Arquivo físico não encontrado.',
        });
      }

      // Configurar headers para download
      reply.header(
        'Content-Disposition',
        `attachment; filename="${attachment.originalFileName}"`
      );
      reply.header('Content-Type', attachment.mimeType);
      reply.header('Content-Length', attachment.fileSize.toString());

      // Enviar arquivo
      const fileStream = fs.createReadStream(filePath);
      reply.send(fileStream);

      request.log.info(
        `[API] Download iniciado para anexo ${attachmentId}: ${attachment.originalFileName}`
      );
    } catch (error: any) {
      request.log.error(`[API] Erro em downloadAttachment:`, error);

      let statusCode = 500;
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      }

      reply.status(statusCode).send({
        error: error.message || 'Erro interno ao fazer download do anexo.',
      });
    }
  }

  /**
   * DELETE /api/expurgos/anexos/:attachmentId - Deletar anexo
   */
  async deleteAttachment(request: FastifyRequest, reply: FastifyReply) {
    try {
      const params = request.params as { attachmentId: string };
      const attachmentId = parseInt(params.attachmentId, 10);

      request.log.info(`[API] DELETE /api/expurgos/anexos/${attachmentId}`);

      if (isNaN(attachmentId) || attachmentId <= 0) {
        return reply.status(400).send({
          error: 'ID do anexo deve ser um número positivo',
        });
      }

      if (!request.body || typeof request.body !== 'object') {
        return reply.status(400).send({
          error: 'Body da requisição é obrigatório',
        });
      }

      const dto = request.body as any;

      if (
        !dto.reason ||
        typeof dto.reason !== 'string' ||
        dto.reason.trim().length < 10
      ) {
        return reply.status(400).send({
          error: 'reason é obrigatório e deve ter pelo menos 10 caracteres',
        });
      }

      // Usar usuário autenticado real
      const deletingUser = await this.services.auth.getUserById(
        request.user.id // Use 'request' diretamente
      );

      if (!deletingUser) {
        return reply.status(401).send({ error: 'Usuário não encontrado' });
      }

      await AppDataSource.initialize();

      await this.services.expurgo.deleteAttachment(
        attachmentId,
        deletingUser as any,
        dto.reason.trim()
      );

      request.log.info(
        `[API] Anexo ${attachmentId} removido com sucesso por ${deletingUser.email}`
      );
      reply.send({ success: true, message: 'Anexo removido com sucesso' });
    } catch (error: any) {
      request.log.error(`[API] Erro em deleteAttachment:`, error);

      let statusCode = 500;
      if (error.message.includes('não encontrado')) {
        statusCode = 404;
      } else if (
        error.message.includes('não pode remover') ||
        error.message.includes('Apenas o usuário')
      ) {
        statusCode = 403;
      } else if (error.message.includes('obrigatório')) {
        statusCode = 400;
      }

      reply.status(statusCode).send({
        error: error.message || 'Erro interno ao remover anexo.',
      });
    }
  }
}
