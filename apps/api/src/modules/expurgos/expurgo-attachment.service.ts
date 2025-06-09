// apps/api/src/modules/expurgos/expurgo-attachment.service.ts (NOVO)

import { AppDataSource } from '@/database/data-source';
import { ExpurgoAttachmentEntity } from '@/entity/expurgo-attachment.entity';
import { ExpurgoEventEntity } from '@/entity/expurgo-event.entity';
import { UserEntity } from '@/entity/user.entity';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import 'reflect-metadata';
import { Repository } from 'typeorm';
import { AuditLogService } from '../audit/audit.service';

interface UploadFileData {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
  size: number;
}

interface UploadResult {
  attachment: ExpurgoAttachmentEntity;
  filePath: string;
}

/**
 * Serviço responsável pelo gerenciamento de anexos de expurgos
 * Implementa upload, validação, armazenamento e controle de acesso
 */
export class ExpurgoAttachmentService {
  private readonly attachmentRepo: Repository<ExpurgoAttachmentEntity>;
  private readonly expurgoRepo: Repository<ExpurgoEventEntity>;
  private readonly auditLogService: AuditLogService;

  // Configurações de upload
  private readonly UPLOAD_BASE_DIR =
    process.env.EXPURGO_UPLOAD_DIR || './uploads/expurgos';
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  constructor() {
    this.attachmentRepo = AppDataSource.getRepository(ExpurgoAttachmentEntity);
    this.expurgoRepo = AppDataSource.getRepository(ExpurgoEventEntity);
    this.auditLogService = new AuditLogService();

    console.log('[ExpurgoAttachmentService] Instanciado com configurações:', {
      uploadDir: this.UPLOAD_BASE_DIR,
      maxFileSize: this.MAX_FILE_SIZE,
      allowedTypes: this.ALLOWED_MIME_TYPES.length,
    });
  }

  // =====================================
  // MÉTODOS UTILITÁRIOS PRIVADOS
  // =====================================

  /**
   * Valida se o arquivo é permitido
   */
  private validateFile(file: UploadFileData): void {
    // Validar tamanho
    if (file.size > this.MAX_FILE_SIZE) {
      throw new Error(
        `Arquivo muito grande. Tamanho máximo permitido: ${this.formatFileSize(this.MAX_FILE_SIZE)}`
      );
    }

    // Validar tipo MIME
    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new Error(
        `Tipo de arquivo não permitido: ${file.mimetype}. ` +
          `Tipos permitidos: ${this.ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    // Validar nome do arquivo
    if (!file.originalname || file.originalname.trim().length === 0) {
      throw new Error('Nome do arquivo é obrigatório');
    }

    // Validar extensão baseada no nome do arquivo
    const allowedExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.pdf',
      '.txt',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
    ];
    const fileExtension = path.extname(file.originalname.toLowerCase());

    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error(
        `Extensão de arquivo não permitida: ${fileExtension}. ` +
          `Extensões permitidas: ${allowedExtensions.join(', ')}`
      );
    }
  }

  /**
   * Gera nome único para o arquivo
   */
  private generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const extension = path.extname(originalName);
    const baseName = path
      .basename(originalName, extension)
      .replace(/[^a-zA-Z0-9\-_]/g, '_')
      .substring(0, 50);

    return `${timestamp}_${randomString}_${baseName}${extension}`;
  }

  /**
   * Calcula hash MD5 do arquivo
   */
  private calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Formata tamanho do arquivo para exibição
   */
  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';

    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = (bytes / Math.pow(1024, i)).toFixed(2);

    return `${size} ${sizes[i]}`;
  }

  /**
   * Cria diretório se não existir
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`[ExpurgoAttachmentService] Diretório criado: ${dirPath}`);
    }
  }

  /**
   * Gera caminho do diretório baseado na data do expurgo
   */
  private generateDirectoryPath(expurgo: ExpurgoEventEntity): string {
    const year = new Date(expurgo.dataEvento).getFullYear();
    const month = String(new Date(expurgo.dataEvento).getMonth() + 1).padStart(
      2,
      '0'
    );

    return path.join(
      this.UPLOAD_BASE_DIR,
      year.toString(),
      month,
      `expurgo_${expurgo.id}`
    );
  }

  // =====================================
  // MÉTODOS PÚBLICOS
  // =====================================

  /**
   * Faz upload de um anexo para um expurgo
   */
  async uploadAttachment(
    expurgoId: number,
    file: UploadFileData,
    uploadingUser: UserEntity,
    description?: string
  ): Promise<UploadResult> {
    console.log(
      `[ExpurgoAttachmentService] Upload iniciado para expurgo ${expurgoId} por usuário ${uploadingUser.id}`
    );

    try {
      // Validar arquivo
      this.validateFile(file);

      // Buscar expurgo
      const expurgo = await this.expurgoRepo.findOne({
        where: { id: expurgoId },
        relations: ['registradoPor'],
      });

      if (!expurgo) {
        throw new Error(`Expurgo com ID ${expurgoId} não encontrado.`);
      }

      // Validar permissões de upload
      this.validateUploadPermissions(expurgo, uploadingUser);

      // Preparar diretório
      const directoryPath = this.generateDirectoryPath(expurgo);
      await this.ensureDirectoryExists(directoryPath);

      // Gerar nome único e caminho completo
      const uniqueFileName = this.generateUniqueFileName(file.originalname);
      const fullFilePath = path.join(directoryPath, uniqueFileName);
      const relativeFilePath = path.relative(
        this.UPLOAD_BASE_DIR,
        fullFilePath
      );

      // Calcular hash
      const fileHash = this.calculateFileHash(file.buffer);

      // Verificar se arquivo duplicado já existe
      const existingFile = await this.attachmentRepo.findOne({
        where: {
          expurgoId,
          fileHash,
        },
      });

      if (existingFile) {
        throw new Error(
          `Arquivo duplicado detectado. Um arquivo idêntico já foi enviado: ${existingFile.originalFileName}`
        );
      }

      // Salvar arquivo no disco
      await fs.writeFile(fullFilePath, file.buffer);
      console.log(`[ExpurgoAttachmentService] Arquivo salvo: ${fullFilePath}`);

      // Criar registro no banco
      const attachment = this.attachmentRepo.create({
        expurgoId,
        originalFileName: file.originalname,
        storedFileName: uniqueFileName,
        filePath: relativeFilePath,
        mimeType: file.mimetype,
        fileSize: file.size,
        fileHash,
        uploadedByUserId: uploadingUser.id,
        description: description?.trim() || undefined, // 🆕 null -> undefined
      });

      const savedAttachment = await this.attachmentRepo.save(attachment);

      // Registrar auditoria
      await this.auditLogService.createLog({
        userId: uploadingUser.id,
        userName: uploadingUser.nome,
        actionType: 'EXPURGO_ANEXO_ENVIADO',
        entityType: 'ExpurgoAttachmentEntity',
        entityId: savedAttachment.id.toString(),
        details: {
          expurgoId,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        },
        justification: `Upload de anexo para expurgo ID ${expurgoId}`,
        competitionPeriodId: expurgo.competitionPeriodId,
      });

      console.log(
        `[ExpurgoAttachmentService] Anexo criado com sucesso - ID: ${savedAttachment.id}`
      );

      return {
        attachment: savedAttachment,
        filePath: fullFilePath,
      };
    } catch (error: any) {
      console.error(`[ExpurgoAttachmentService] Erro no upload:`, error);
      throw error;
    }
  }

  /**
   * Valida permissões para upload
   */
  private validateUploadPermissions(
    expurgo: ExpurgoEventEntity,
    user: UserEntity
  ): void {
    // Apenas expurgos pendentes permitem upload
    if (!expurgo.canBeEdited()) {
      throw new Error(
        `Não é possível enviar anexos para expurgo com status: ${expurgo.getStatusDescription()}`
      );
    }

    // TODO: Implementar validação de roles quando o sistema estiver funcionando
    // Por enquanto, permite qualquer usuário fazer upload

    // Possível regra futura:
    // - Solicitante pode enviar anexos até a aprovação
    // - Aprovador pode enviar anexos como parte da análise
  }

  /**
   * Lista anexos de um expurgo
   */
  async findAttachmentsByExpurgo(
    expurgoId: number
  ): Promise<ExpurgoAttachmentEntity[]> {
    console.log(
      `[ExpurgoAttachmentService] Buscando anexos do expurgo ${expurgoId}`
    );

    return this.attachmentRepo.find({
      where: { expurgoId },
      relations: ['uploadedBy'],
      order: { uploadedAt: 'DESC' },
    });
  }

  /**
   * Busca anexo por ID
   */
  async findAttachmentById(
    id: number
  ): Promise<ExpurgoAttachmentEntity | null> {
    return this.attachmentRepo.findOne({
      where: { id },
      relations: ['uploadedBy', 'expurgo'],
    });
  }

  /**
   * Remove um anexo
   */
  async deleteAttachment(
    attachmentId: number,
    deletingUser: UserEntity,
    reason: string
  ): Promise<void> {
    console.log(
      `[ExpurgoAttachmentService] Deletando anexo ${attachmentId} por usuário ${deletingUser.id}`
    );

    const attachment = await this.findAttachmentById(attachmentId);

    if (!attachment) {
      throw new Error(`Anexo com ID ${attachmentId} não encontrado.`);
    }

    // Validar permissões
    this.validateDeletePermissions(attachment, deletingUser);

    // Remover arquivo do disco
    const fullFilePath = path.join(this.UPLOAD_BASE_DIR, attachment.filePath);

    try {
      await fs.unlink(fullFilePath);
      console.log(
        `[ExpurgoAttachmentService] Arquivo removido: ${fullFilePath}`
      );
    } catch (error) {
      console.warn(
        `[ExpurgoAttachmentService] Erro ao remover arquivo: ${error}`
      );
      // Continua mesmo se não conseguir remover o arquivo físico
    }

    // Remover registro do banco
    await this.attachmentRepo.remove(attachment);

    // Registrar auditoria
    await this.auditLogService.createLog({
      userId: deletingUser.id,
      userName: deletingUser.nome,
      actionType: 'EXPURGO_ANEXO_REMOVIDO',
      entityType: 'ExpurgoAttachmentEntity',
      entityId: attachmentId.toString(),
      details: {
        expurgoId: attachment.expurgoId,
        originalFileName: attachment.originalFileName,
        deletedFilePath: attachment.filePath,
      },
      justification: reason,
      competitionPeriodId: attachment.expurgo?.competitionPeriodId,
    });

    console.log(
      `[ExpurgoAttachmentService] Anexo ${attachmentId} removido com sucesso`
    );
  }

  /**
   * Valida permissões para deleção
   */
  private validateDeletePermissions(
    attachment: ExpurgoAttachmentEntity,
    user: UserEntity
  ): void {
    // Apenas o uploader ou admin pode deletar
    if (attachment.uploadedByUserId !== user.id) {
      // TODO: Verificar se é admin quando roles estiverem implementadas
      throw new Error(
        'Apenas o usuário que fez o upload pode remover o anexo.'
      );
    }

    // Apenas expurgos pendentes permitem remoção
    if (attachment.expurgo && !attachment.expurgo.canBeEdited()) {
      throw new Error(
        `Não é possível remover anexos de expurgo com status: ${attachment.expurgo.getStatusDescription()}`
      );
    }
  }

  /**
   * Obtém caminho completo do arquivo para download
   */
  async getFilePathForDownload(attachmentId: number): Promise<string> {
    const attachment = await this.findAttachmentById(attachmentId);

    if (!attachment) {
      throw new Error(`Anexo com ID ${attachmentId} não encontrado.`);
    }

    const fullFilePath = path.join(this.UPLOAD_BASE_DIR, attachment.filePath);

    // Verificar se arquivo existe
    try {
      await fs.access(fullFilePath);
    } catch {
      throw new Error(
        `Arquivo físico não encontrado: ${attachment.originalFileName}`
      );
    }

    return fullFilePath;
  }

  /**
   * Estatísticas de anexos
   */
  async getAttachmentStatistics(expurgoId?: number): Promise<{
    totalAnexos: number;
    totalTamanho: number;
    tiposMaisComuns: Array<{ mimeType: string; count: number }>;
    uploadersMaisAtivos: Array<{
      userId: number;
      userName: string;
      count: number;
    }>;
  }> {
    const queryBuilder = this.attachmentRepo
      .createQueryBuilder('attachment')
      .leftJoinAndSelect('attachment.uploadedBy', 'user');

    if (expurgoId) {
      queryBuilder.where('attachment.expurgoId = :expurgoId', { expurgoId });
    }

    const attachments = await queryBuilder.getMany();

    // Calcular estatísticas
    const totalAnexos = attachments.length;
    const totalTamanho = attachments.reduce(
      (sum, att) => sum + att.fileSize,
      0
    );

    // Tipos mais comuns
    const mimeTypeCount: Record<string, number> = {};
    attachments.forEach((att) => {
      mimeTypeCount[att.mimeType] = (mimeTypeCount[att.mimeType] || 0) + 1;
    });

    const tiposMaisComuns = Object.entries(mimeTypeCount)
      .map(([mimeType, count]) => ({ mimeType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Uploaders mais ativos
    const uploaderCount: Record<number, { userName: string; count: number }> =
      {};
    attachments.forEach((att) => {
      if (att.uploadedBy) {
        const userId = att.uploadedBy.id;
        if (!uploaderCount[userId]) {
          uploaderCount[userId] = { userName: att.uploadedBy.nome, count: 0 };
        }
        uploaderCount[userId].count++;
      }
    });

    const uploadersMaisAtivos = Object.entries(uploaderCount)
      .map(([userId, data]) => ({
        userId: parseInt(userId),
        userName: data.userName,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalAnexos,
      totalTamanho,
      tiposMaisComuns,
      uploadersMaisAtivos,
    };
  }

  /**
   * Limpeza de arquivos órfãos
   */
  async cleanupOrphanedFiles(): Promise<{
    removedFiles: string[];
    errors: string[];
  }> {
    console.log(
      '[ExpurgoAttachmentService] Iniciando limpeza de arquivos órfãos...'
    );

    const removedFiles: string[] = [];
    const errors: string[] = [];

    try {
      // Listar todos os anexos no banco
      const dbAttachments = await this.attachmentRepo.find({
        select: ['filePath'],
      });

      const dbFilePaths = new Set(dbAttachments.map((att) => att.filePath));

      // Percorrer diretório de uploads recursivamente
      const scanDirectory = async (dirPath: string): Promise<void> => {
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });

          for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);

            if (entry.isDirectory()) {
              await scanDirectory(fullPath);
            } else {
              const relativePath = path.relative(
                this.UPLOAD_BASE_DIR,
                fullPath
              );

              if (!dbFilePaths.has(relativePath)) {
                try {
                  await fs.unlink(fullPath);
                  removedFiles.push(relativePath);
                  console.log(
                    `[ExpurgoAttachmentService] Arquivo órfão removido: ${relativePath}`
                  );
                } catch (error: any) {
                  errors.push(
                    `Erro ao remover ${relativePath}: ${error.message}`
                  );
                }
              }
            }
          }
        } catch (error: any) {
          errors.push(
            `Erro ao escanear diretório ${dirPath}: ${error.message}`
          );
        }
      };

      await scanDirectory(this.UPLOAD_BASE_DIR);
    } catch (error: any) {
      errors.push(`Erro geral na limpeza: ${error.message}`);
    }

    console.log(
      `[ExpurgoAttachmentService] Limpeza concluída: ${removedFiles.length} arquivos removidos, ${errors.length} erros`
    );

    return { removedFiles, errors };
  }
}
