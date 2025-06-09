// apps/web/src/components/expurgos/attachments/AttachmentUpload.tsx

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useAdvancedFileUpload } from '@/hooks/expurgos/useFileUpload';
import { cn } from '@/lib/utils';
import {
  ATTACHMENT_CONSTRAINTS,
  AttachmentEntity,
  formatFileSize,
  validateFile,
} from '@sistema-premiacao/shared-types';
import {
  AlertCircle,
  CheckCircle,
  FileText,
  Image,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

// ================================
// TIPOS E INTERFACES
// ================================

interface AttachmentUploadProps {
  expurgoId: number;
  onUploadSuccess?: (attachment: AttachmentEntity) => void;
  onUploadError?: (error: string) => void;
  disabled?: boolean;
  multiple?: boolean;
  accept?: string;
  maxSize?: number;
  className?: string;
  variant?: 'default' | 'compact' | 'inline';
}

interface FileWithPreview extends File {
  id: string;
  preview?: string;
  validation?: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

// ================================
// UTILITÁRIOS
// ================================

function createFilePreview(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    } else {
      resolve(null);
    }
  });
}

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) {
    return <Image className='h-8 w-8 text-green-600' />;
  }
  return <FileText className='h-8 w-8 text-blue-600' />;
}

// ================================
// COMPONENTE PRINCIPAL
// ================================

export default function AttachmentUpload({
  expurgoId,
  onUploadSuccess,
  onUploadError,
  disabled = false,
  multiple = true,
  accept,
  maxSize = ATTACHMENT_CONSTRAINTS.maxFileSize,
  className,
  variant = 'default',
}: AttachmentUploadProps) {
  // ================================
  // ESTADOS
  // ================================

  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [description, setDescription] = useState('');
  const [showDescription, setShowDescription] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ================================
  // HOOKS
  // ================================

  const uploadHook = useAdvancedFileUpload({
    onSuccess: (attachment, fileId) => {
      onUploadSuccess?.(attachment);
      // Remove arquivo da lista após sucesso
      setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
    },
    onError: (error, fileId) => {
      onUploadError?.(error);
    },
    maxConcurrentUploads: 2,
    autoRetry: true,
    retryAttempts: 2,
  });

  // ================================
  // HANDLERS DE ARQUIVO
  // ================================

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const processedFiles: FileWithPreview[] = [];

    for (const file of fileArray) {
      const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
      const validation = validateFile(file);

      let preview: string | null = null;
      if (file.type.startsWith('image/')) {
        preview = await createFilePreview(file);
      }

      const fileWithPreview: FileWithPreview = Object.assign(file, {
        id: fileId,
        preview,
        validation,
      });

      processedFiles.push(fileWithPreview);
    }

    setSelectedFiles((prev) => [...prev, ...processedFiles]);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFiles(files);
      }
      // Reset input para permitir selecionar o mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFiles(files);
      }
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // ================================
  // HANDLERS DE CONTROLE
  // ================================

  const removeFile = useCallback((fileId: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const handleUpload = useCallback(async () => {
    const validFiles = selectedFiles.filter((f) => f.validation?.isValid);

    if (validFiles.length === 0) {
      toast.error('Nenhum arquivo válido para upload');
      return;
    }

    try {
      await uploadHook.uploadFiles(
        validFiles,
        expurgoId,
        description.trim() || undefined
      );

      // Reset após upload bem-sucedido
      setDescription('');
      setShowDescription(false);
    } catch (error) {
      console.error('Erro no upload:', error);
    }
  }, [selectedFiles, expurgoId, description, uploadHook]);

  const clearAll = useCallback(() => {
    setSelectedFiles([]);
    setDescription('');
    setShowDescription(false);
  }, []);

  // ================================
  // VARIAÇÕES DE LAYOUT
  // ================================

  if (variant === 'compact') {
    return (
      <div className={cn('space-y-2', className)}>
        <div className='flex items-center space-x-2'>
          <Input
            ref={fileInputRef}
            type='file'
            multiple={multiple}
            accept={accept}
            onChange={handleFileSelect}
            disabled={disabled || uploadHook.isUploading}
            className='hidden'
            id={`file-upload-${expurgoId}`}
          />

          <Button
            variant='outline'
            size='sm'
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploadHook.isUploading}
            className='flex-shrink-0'
          >
            <Upload className='mr-2 h-4 w-4' />
            Adicionar Anexo
          </Button>

          {selectedFiles.length > 0 && (
            <span className='text-sm text-gray-500'>
              {selectedFiles.length} arquivo(s) selecionado(s)
            </span>
          )}
        </div>

        {selectedFiles.length > 0 && (
          <div className='space-y-2'>
            {selectedFiles.map((file) => (
              <div
                key={file.id}
                className='flex items-center justify-between p-2 bg-gray-50 rounded text-sm'
              >
                <span className='truncate flex-1'>{file.name}</span>
                <div className='flex items-center space-x-2'>
                  {!file.validation?.isValid && (
                    <AlertCircle className='h-4 w-4 text-red-500' />
                  )}
                  {uploadHook.getFileProgress(file.id) && (
                    <div className='w-16'>
                      <Progress
                        value={
                          uploadHook.getFileProgress(file.id)?.percentage || 0
                        }
                        className='h-2'
                      />
                    </div>
                  )}
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => removeFile(file.id)}
                    className='h-6 w-6 p-0'
                  >
                    <X className='h-3 w-3' />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              onClick={handleUpload}
              disabled={
                uploadHook.isUploading ||
                selectedFiles.every((f) => !f.validation?.isValid)
              }
              size='sm'
              className='w-full'
            >
              {uploadHook.isUploading ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  Enviando...
                </>
              ) : (
                'Enviar Arquivos'
              )}
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center space-x-2', className)}>
        <Input
          ref={fileInputRef}
          type='file'
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || uploadHook.isUploading}
          className='flex-1'
        />

        {selectedFiles.length > 0 && (
          <Button
            onClick={handleUpload}
            disabled={
              uploadHook.isUploading ||
              selectedFiles.every((f) => !f.validation?.isValid)
            }
            size='sm'
          >
            {uploadHook.isUploading ? (
              <Loader2 className='h-4 w-4 animate-spin' />
            ) : (
              <Upload className='h-4 w-4' />
            )}
          </Button>
        )}
      </div>
    );
  }

  // Variant 'default' - Drag & Drop completo
  return (
    <div className={cn('space-y-4', className)}>
      {/* Zona de Drop */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <Input
          ref={fileInputRef}
          type='file'
          multiple={multiple}
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled || uploadHook.isUploading}
          className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
          aria-label='Upload de anexos'
        />

        <div className='space-y-4'>
          <div className='mx-auto w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center'>
            <Upload className='h-6 w-6 text-gray-600' />
          </div>

          <div>
            <p className='text-sm font-medium'>
              {isDragOver
                ? 'Solte os arquivos aqui'
                : 'Arraste e solte arquivos aqui'}
            </p>
            <p className='text-xs text-gray-500 mt-1'>
              ou
              <button
                type='button'
                onClick={() => fileInputRef.current?.click()}
                className='text-primary hover:underline font-medium'
                disabled={disabled || uploadHook.isUploading}
              >
                clique para selecionar
              </button>
            </p>
          </div>

          <div className='text-xs text-gray-500 space-y-1'>
            <p>Tipos aceitos: PDF, imagens, documentos</p>
            <p>Tamanho máximo: {formatFileSize(maxSize)}</p>
            {multiple && <p>Múltiplos arquivos permitidos</p>}
          </div>
        </div>
      </div>

      {/* Lista de Arquivos Selecionados */}
      {selectedFiles.length > 0 && (
        <div className='space-y-3'>
          <div className='flex items-center justify-between'>
            <Label className='text-sm font-medium'>
              Arquivos Selecionados ({selectedFiles.length})
            </Label>
            <Button
              variant='ghost'
              size='sm'
              onClick={clearAll}
              className='text-xs'
            >
              Limpar Todos
            </Button>
          </div>

          {/* Lista de arquivos */}
          <div className='space-y-2 max-h-64 overflow-y-auto'>
            {selectedFiles.map((file) => {
              const progress = uploadHook.getFileProgress(file.id);
              const error = uploadHook.getFileError(file.id);
              const isUploading = uploadHook.isFileUploading(file.id);

              return (
                <div
                  key={file.id}
                  className={cn(
                    'flex items-center space-x-3 p-3 rounded-lg border',
                    file.validation?.isValid
                      ? 'border-gray-200 bg-gray-50 dark:bg-gray-800'
                      : 'border-red-200 bg-red-50 dark:bg-red-900/20'
                  )}
                >
                  {/* Preview/Icon */}
                  <div className='flex-shrink-0'>
                    {file.preview ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className='h-10 w-10 rounded object-cover'
                      />
                    ) : (
                      getFileIcon(file)
                    )}
                  </div>

                  {/* Informações do arquivo */}
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between'>
                      <p className='text-sm font-medium truncate'>
                        {file.name}
                      </p>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => removeFile(file.id)}
                        disabled={isUploading}
                        className='h-6 w-6 p-0 flex-shrink-0'
                      >
                        <X className='h-3 w-3' />
                      </Button>
                    </div>

                    <div className='flex items-center justify-between mt-1'>
                      <span className='text-xs text-gray-500'>
                        {formatFileSize(file.size)}
                      </span>

                      {/* Status */}
                      {file.validation?.isValid ? (
                        progress ? (
                          progress.status === 'success' ? (
                            <div className='flex items-center text-green-600'>
                              <CheckCircle className='h-4 w-4 mr-1' />
                              <span className='text-xs'>Enviado</span>
                            </div>
                          ) : progress.status === 'error' ? (
                            <div className='flex items-center text-red-600'>
                              <AlertCircle className='h-4 w-4 mr-1' />
                              <span className='text-xs'>Erro</span>
                            </div>
                          ) : (
                            <div className='flex items-center text-blue-600'>
                              <Loader2 className='h-4 w-4 mr-1 animate-spin' />
                              <span className='text-xs'>
                                {progress.percentage}%
                              </span>
                            </div>
                          )
                        ) : (
                          <div className='flex items-center text-gray-500'>
                            <CheckCircle className='h-4 w-4 mr-1' />
                            <span className='text-xs'>Pronto</span>
                          </div>
                        )
                      ) : (
                        <div className='flex items-center text-red-600'>
                          <AlertCircle className='h-4 w-4 mr-1' />
                          <span className='text-xs'>Inválido</span>
                        </div>
                      )}
                    </div>

                    {/* Progress bar */}
                    {progress && progress.status === 'uploading' && (
                      <div className='mt-2'>
                        <Progress value={progress.percentage} className='h-1' />
                      </div>
                    )}

                    {/* Erros de validação */}
                    {file.validation && !file.validation.isValid && (
                      <div className='mt-2'>
                        {file.validation.errors.map((error, index) => (
                          <p key={index} className='text-xs text-red-600'>
                            {error}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Avisos */}
                    {file.validation && file.validation.warnings.length > 0 && (
                      <div className='mt-1'>
                        {file.validation.warnings.map((warning, index) => (
                          <p key={index} className='text-xs text-yellow-600'>
                            ⚠️ {warning}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Erro de upload */}
                    {error && (
                      <p className='text-xs text-red-600 mt-1'>Erro: {error}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Descrição opcional */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='attachment-description' className='text-sm'>
                Descrição (opcional)
              </Label>
              {!showDescription && (
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => setShowDescription(true)}
                  className='text-xs'
                >
                  Adicionar descrição
                </Button>
              )}
            </div>

            {showDescription && (
              <Textarea
                id='attachment-description'
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder='Descreva os anexos ou adicione observações...'
                className='min-h-[60px] text-sm'
                maxLength={500}
              />
            )}
          </div>

          {/* Progress geral */}
          {uploadHook.isUploading && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between text-sm'>
                <span>Progresso geral</span>
                <span>{Math.round(uploadHook.overallProgress)}%</span>
              </div>
              <Progress value={uploadHook.overallProgress} />
            </div>
          )}

          {/* Ações */}
          <div className='flex items-center justify-between pt-2'>
            <div className='text-xs text-gray-500'>
              {selectedFiles.filter((f) => f.validation?.isValid).length} de
              {selectedFiles.length} arquivos válidos
            </div>

            <div className='flex items-center space-x-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={clearAll}
                disabled={uploadHook.isUploading}
              >
                Cancelar
              </Button>

              <Button
                onClick={handleUpload}
                disabled={
                  uploadHook.isUploading ||
                  selectedFiles.length === 0 ||
                  selectedFiles.every((f) => !f.validation?.isValid)
                }
                size='sm'
              >
                {uploadHook.isUploading ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Enviando ({uploadHook.activeUploads.size}/
                    {selectedFiles.length})
                  </>
                ) : (
                  <>
                    <Upload className='mr-2 h-4 w-4' />
                    Enviar Arquivos (
                    {selectedFiles.filter((f) => f.validation?.isValid).length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
