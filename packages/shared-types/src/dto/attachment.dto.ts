// packages/shared-types/src/dto/attachment.dto.ts

// ================================
// TIPOS BASE PARA ANEXOS
// ================================

export interface AttachmentEntity {
  id: number;
  expurgoId: number;
  originalFileName: string;
  storedFileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  fileHash?: string;
  uploadedByUserId: number;
  uploadedAt: Date | string;
  description?: string;

  // Dados relacionados (vem da API)
  uploadedBy?: {
    id: number;
    nome: string;
    email?: string;
  };

  // Campos calculados (vem da API)
  downloadUrl: string;
  isImage: boolean;
  isPdf: boolean;
  formattedSize: string;
}

// ================================
// DTOs PARA UPLOAD
// ================================

export interface UploadAttachmentDto {
  file: File;
  description?: string;
  expurgoId: number;
}

export interface UploadProgressDto {
  loaded: number;
  total: number;
  percentage: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface UploadResponseDto {
  success: boolean;
  attachment: {
    id: number;
    originalFileName: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: string;
    description?: string;
    downloadUrl: string;
  };
}

// ================================
// DTOs PARA VALIDAÇÃO
// ================================

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AttachmentConstraints {
  maxFileSize: number; // bytes
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFilesPerExpurgo: number;
}

// ================================
// TIPOS PARA COMPONENTES
// ================================

export interface AttachmentItemProps {
  attachment: AttachmentEntity;
  onDownload: (attachment: AttachmentEntity) => void;
  onDelete: (attachment: AttachmentEntity) => void;
  onPreview?: (attachment: AttachmentEntity) => void;
  showActions?: boolean;
  compact?: boolean;
}

export interface AttachmentListProps {
  expurgoId: number;
  attachments: AttachmentEntity[];
  loading?: boolean;
  error?: Error | null;
  onUpload?: (files: File[]) => void;
  onDelete?: (attachmentId: number) => void;
  onDownload?: (attachment: AttachmentEntity) => void;
  showUpload?: boolean;
  showActions?: boolean;
  maxHeight?: string;
}

export interface AttachmentUploadProps {
  expurgoId: number;
  onUploadSuccess?: (attachment: AttachmentEntity) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  description?: string;
}

// ================================
// TIPOS PARA PREVIEW
// ================================

export interface AttachmentPreviewProps {
  attachment: AttachmentEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface PreviewData {
  type: 'image' | 'pdf' | 'document' | 'unknown';
  canPreview: boolean;
  previewUrl?: string;
  downloadUrl: string;
  iconName: string;
}

// ================================
// TIPOS PARA ESTATÍSTICAS
// ================================

export interface AttachmentStatistics {
  totalAnexos: number;
  totalTamanho: number;
  tiposMaisComuns: Array<{
    mimeType: string;
    count: number;
  }>;
  uploadersMaisAtivos: Array<{
    userId: number;
    userName: string;
    count: number;
  }>;
}

// ================================
// ENUMS E CONSTANTES
// ================================

export enum FileType {
  IMAGE = 'image',
  PDF = 'pdf',
  DOCUMENT = 'document',
  SPREADSHEET = 'spreadsheet',
  UNKNOWN = 'unknown',
}

export const ATTACHMENT_CONSTRAINTS: AttachmentConstraints = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    // Imagens
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',

    // PDFs
    'application/pdf',

    // Documentos
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',

    // Texto
    'text/plain',
    'text/csv',
  ],
  allowedExtensions: [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.txt',
    '.csv',
  ],
  maxFilesPerExpurgo: 10,
};

// ================================
// UTILITÁRIOS DE TIPO
// ================================

export function getFileTypeFromMimeType(mimeType: string): FileType {
  if (mimeType.startsWith('image/')) return FileType.IMAGE;
  if (mimeType === 'application/pdf') return FileType.PDF;
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType === 'text/plain'
  )
    return FileType.DOCUMENT;
  if (
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType === 'text/csv'
  )
    return FileType.SPREADSHEET;

  return FileType.UNKNOWN;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function validateFile(file: File): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validar tamanho
  if (file.size > ATTACHMENT_CONSTRAINTS.maxFileSize) {
    errors.push(
      `Arquivo muito grande. Máximo permitido: ${formatFileSize(ATTACHMENT_CONSTRAINTS.maxFileSize)}`
    );
  }

  // Validar tipo MIME
  if (!ATTACHMENT_CONSTRAINTS.allowedMimeTypes.includes(file.type)) {
    errors.push(`Tipo de arquivo não permitido: ${file.type}`);
  }

  // Validar extensão
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ATTACHMENT_CONSTRAINTS.allowedExtensions.includes(extension)) {
    errors.push(`Extensão de arquivo não permitida: ${extension}`);
  }

  // Avisos
  if (file.size > 5 * 1024 * 1024) {
    // 5MB
    warnings.push('Arquivo grande pode demorar para fazer upload');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
