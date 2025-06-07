// apps/api/src/entity/expurgo-attachment.entity.ts

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExpurgoEventEntity } from './expurgo-event.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'expurgo_attachments' })
@Index('idx_expurgo_attachment_expurgo', ['expurgoId'])
@Index('idx_expurgo_attachment_uploaded_by', ['uploadedByUserId'])
export class ExpurgoAttachmentEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // === RELACIONAMENTO COM EXPURGO ===
  @Column({
    type: 'int',
    comment: 'ID do expurgo ao qual este anexo pertence',
  })
  expurgoId!: number;

  @ManyToOne(() => ExpurgoEventEntity, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'expurgoId' })
  expurgo?: ExpurgoEventEntity;

  // === DADOS DO ARQUIVO ===
  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Nome original do arquivo enviado pelo usuário',
  })
  originalFileName!: string;

  @Column({
    type: 'varchar',
    length: 255,
    comment: 'Nome do arquivo salvo no sistema (único)',
  })
  storedFileName!: string;

  @Column({
    type: 'varchar',
    length: 500,
    comment: 'Caminho relativo onde o arquivo está armazenado',
  })
  filePath!: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'MIME type do arquivo (ex: image/jpeg, application/pdf)',
  })
  mimeType!: string;

  @Column({
    type: 'bigint',
    comment: 'Tamanho do arquivo em bytes',
  })
  fileSize!: number;

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Hash MD5 do arquivo para verificação de integridade',
  })
  fileHash?: string;

  // === AUDITORIA ===
  @Column({
    type: 'int',
    comment: 'ID do usuário que fez o upload do arquivo',
  })
  uploadedByUserId!: number;

  @ManyToOne(() => UserEntity, {
    onDelete: 'SET NULL',
    eager: false,
  })
  @JoinColumn({ name: 'uploadedByUserId' })
  uploadedBy?: UserEntity;

  @CreateDateColumn({
    type: 'timestamp with time zone',
    comment: 'Timestamp do upload do arquivo',
  })
  uploadedAt!: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Descrição ou observação sobre o anexo',
  })
  description?: string;

  // === MÉTODOS AUXILIARES ===

  /**
   * Retorna a extensão do arquivo
   */
  getFileExtension(): string {
    const parts = this.originalFileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1]!.toLowerCase() : '';
  }

  /**
   * Verifica se o arquivo é uma imagem
   */
  isImage(): boolean {
    return this.mimeType.startsWith('image/');
  }

  /**
   * Verifica se o arquivo é um PDF
   */
  isPdf(): boolean {
    return this.mimeType === 'application/pdf';
  }

  /**
   * Retorna o tamanho do arquivo formatado
   */
  getFormattedFileSize(): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (this.fileSize === 0) return '0 Bytes';

    const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
    const size = (this.fileSize / Math.pow(1024, i)).toFixed(2);

    return `${size} ${sizes[i]}`;
  }

  /**
   * Verifica se o arquivo está dentro dos limites de tamanho aceitáveis
   */
  isWithinSizeLimit(maxSizeInMB: number = 10): boolean {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    return this.fileSize <= maxSizeInBytes;
  }
}
