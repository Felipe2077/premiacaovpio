// apps/web/src/hooks/expurgos/useFileUpload.ts

import {
  AttachmentEntity,
  UploadProgressDto,
  UploadResponseDto,
  validateFile,
} from '@sistema-premiacao/shared-types';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

// ================================
// TIPOS ESPECÍFICOS DO HOOK
// ================================

interface UploadFileData {
  file: File;
  description?: string;
  expurgoId: number;
}

interface UploadState {
  progress: Record<string, UploadProgressDto>; // key = file.name
  activeUploads: Set<string>;
  errors: Record<string, string>;
}

interface UseAdvancedFileUploadOptions {
  onSuccess?: (attachment: AttachmentEntity, fileId: string) => void;
  onError?: (error: string, fileId: string) => void;
  onProgress?: (progress: UploadProgressDto, fileId: string) => void;
  maxConcurrentUploads?: number;
  autoRetry?: boolean;
  retryAttempts?: number;
}

// ================================
// HOOK PRINCIPAL
// ================================

export function useAdvancedFileUpload(
  options: UseAdvancedFileUploadOptions = {}
) {
  const {
    onSuccess,
    onError,
    onProgress,
    maxConcurrentUploads = 3,
    autoRetry = true,
    retryAttempts = 2,
  } = options;

  const queryClient = useQueryClient();

  const [uploadState, setUploadState] = useState<UploadState>({
    progress: {},
    activeUploads: new Set(),
    errors: {},
  });

  // ================================
  // FUNÇÃO DE UPLOAD INDIVIDUAL
  // ================================

  const uploadSingleFile = useCallback(
    async (
      data: UploadFileData,
      fileId: string,
      attempt: number = 1
    ): Promise<UploadResponseDto> => {
      const { file, description, expurgoId } = data;

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();

        formData.append('file', file);
        if (description) {
          formData.append('description', description);
        }

        // Configurar progress
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress: UploadProgressDto = {
              loaded: e.loaded,
              total: e.total,
              percentage: Math.round((e.loaded / e.total) * 100),
              status: 'uploading',
            };

            setUploadState((prev) => ({
              ...prev,
              progress: { ...prev.progress, [fileId]: progress },
            }));

            onProgress?.(progress, fileId);
          }
        });

        // Configurar completion
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response: UploadResponseDto = JSON.parse(xhr.responseText);

              setUploadState((prev) => ({
                ...prev,
                progress: {
                  ...prev.progress,
                  [fileId]: { ...prev.progress[fileId], status: 'success' },
                },
                activeUploads: new Set(
                  [...prev.activeUploads].filter((id) => id !== fileId)
                ),
                errors: { ...prev.errors, [fileId]: undefined },
              }));

              resolve(response);
            } catch (error) {
              reject(new Error('Resposta inválida do servidor'));
            }
          } else {
            // Erro HTTP
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error || `Erro HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`Erro HTTP ${xhr.status}`));
            }
          }
        });

        // Configurar erro de rede
        xhr.addEventListener('error', () => {
          reject(new Error('Erro de conexão durante upload'));
        });

        // Configurar timeout
        xhr.addEventListener('timeout', () => {
          reject(new Error('Timeout durante upload'));
        });

        // Configurar requisição
        xhr.timeout = 60000; // 60 segundos
        xhr.open(
          'POST',
          `http://localhost:3001/api/expurgos/${expurgoId}/anexos/upload`
        );

        // Iniciar upload
        xhr.send(formData);
      });
    },
    [onProgress]
  );

  // ================================
  // FUNÇÃO PRINCIPAL DE UPLOAD
  // ================================

  const uploadFiles = useCallback(
    async (files: File[], expurgoId: number, description?: string) => {
      const results: {
        success: UploadResponseDto[];
        errors: { file: File; error: string }[];
      } = {
        success: [],
        errors: [],
      };

      // Validar arquivos antes de começar
      const validFiles: { file: File; fileId: string }[] = [];

      for (const file of files) {
        const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
        const validation = validateFile(file);

        if (!validation.isValid) {
          const errorMessage = validation.errors.join(', ');
          results.errors.push({ file, error: errorMessage });

          setUploadState((prev) => ({
            ...prev,
            errors: { ...prev.errors, [fileId]: errorMessage },
          }));

          onError?.(errorMessage, fileId);
          toast.error(`${file.name}: ${errorMessage}`);
          continue;
        }

        if (validation.warnings.length > 0) {
          validation.warnings.forEach((warning) =>
            toast.warning(`${file.name}: ${warning}`)
          );
        }

        validFiles.push({ file, fileId });
      }

      if (validFiles.length === 0) {
        toast.error('Nenhum arquivo válido para upload');
        return results;
      }

      // Inicializar estados de upload
      const initialProgress: Record<string, UploadProgressDto> = {};
      const initialActiveUploads = new Set<string>();

      validFiles.forEach(({ fileId }) => {
        initialProgress[fileId] = {
          loaded: 0,
          total: 0,
          percentage: 0,
          status: 'idle',
        };
        initialActiveUploads.add(fileId);
      });

      setUploadState((prev) => ({
        ...prev,
        progress: { ...prev.progress, ...initialProgress },
        activeUploads: new Set([
          ...prev.activeUploads,
          ...initialActiveUploads,
        ]),
      }));

      // Processamento com controle de concorrência
      const chunks = [];
      for (let i = 0; i < validFiles.length; i += maxConcurrentUploads) {
        chunks.push(validFiles.slice(i, i + maxConcurrentUploads));
      }

      for (const chunk of chunks) {
        const promises = chunk.map(async ({ file, fileId }) => {
          let lastError: Error | null = null;

          for (let attempt = 1; attempt <= retryAttempts + 1; attempt++) {
            try {
              setUploadState((prev) => ({
                ...prev,
                progress: {
                  ...prev.progress,
                  [fileId]: { ...prev.progress[fileId], status: 'uploading' },
                },
              }));

              const response = await uploadSingleFile(
                { file, description, expurgoId },
                fileId,
                attempt
              );

              results.success.push(response);

              // Invalidar caches
              queryClient.invalidateQueries({
                queryKey: ['attachments', expurgoId],
              });
              queryClient.invalidateQueries({ queryKey: ['expurgos'] });

              onSuccess?.(response.attachment as AttachmentEntity, fileId);
              toast.success(`Upload concluído: ${file.name}`);

              return; // Sucesso, sair do loop de tentativas
            } catch (error) {
              lastError = error as Error;

              if (attempt <= retryAttempts && autoRetry) {
                toast.warning(
                  `Tentativa ${attempt} falhou para ${file.name}. Tentando novamente...`
                );
                await new Promise((resolve) =>
                  setTimeout(resolve, 1000 * attempt)
                ); // Backoff
              } else {
                // Última tentativa falhou
                const errorMessage = lastError.message;
                results.errors.push({ file, error: errorMessage });

                setUploadState((prev) => ({
                  ...prev,
                  progress: {
                    ...prev.progress,
                    [fileId]: {
                      ...prev.progress[fileId],
                      status: 'error',
                      error: errorMessage,
                    },
                  },
                  activeUploads: new Set(
                    [...prev.activeUploads].filter((id) => id !== fileId)
                  ),
                  errors: { ...prev.errors, [fileId]: errorMessage },
                }));

                onError?.(errorMessage, fileId);
                toast.error(`Falha no upload: ${file.name} - ${errorMessage}`);
              }
            }
          }
        });

        await Promise.allSettled(promises);
      }

      return results;
    },
    [
      uploadSingleFile,
      queryClient,
      onSuccess,
      onError,
      maxConcurrentUploads,
      autoRetry,
      retryAttempts,
    ]
  );

  // ================================
  // FUNÇÕES DE CONTROLE
  // ================================

  const cancelUpload = useCallback((fileId: string) => {
    setUploadState((prev) => ({
      ...prev,
      activeUploads: new Set(
        [...prev.activeUploads].filter((id) => id !== fileId)
      ),
      progress: {
        ...prev.progress,
        [fileId]: {
          ...prev.progress[fileId],
          status: 'error',
          error: 'Cancelado pelo usuário',
        },
      },
    }));

    toast.info('Upload cancelado');
  }, []);

  const clearProgress = useCallback(() => {
    setUploadState({
      progress: {},
      activeUploads: new Set(),
      errors: {},
    });
  }, []);

  const retryUpload = useCallback(
    (fileId: string, file: File, expurgoId: number, description?: string) => {
      // Remove erro anterior
      setUploadState((prev) => ({
        ...prev,
        errors: { ...prev.errors, [fileId]: undefined },
      }));

      // Reinicia upload
      uploadFiles([file], expurgoId, description);
    },
    [uploadFiles]
  );

  // ================================
  // ESTADOS COMPUTADOS
  // ================================

  const isUploading = uploadState.activeUploads.size > 0;
  const totalProgress = Object.values(uploadState.progress);
  const overallProgress =
    totalProgress.length > 0
      ? totalProgress.reduce((sum, p) => sum + p.percentage, 0) /
        totalProgress.length
      : 0;

  return {
    // Função principal
    uploadFiles,

    // Estados
    progress: uploadState.progress,
    activeUploads: uploadState.activeUploads,
    errors: uploadState.errors,
    isUploading,
    overallProgress,

    // Controles
    cancelUpload,
    clearProgress,
    retryUpload,

    // Utilitários
    getFileProgress: (fileId: string) => uploadState.progress[fileId],
    getFileError: (fileId: string) => uploadState.errors[fileId],
    isFileUploading: (fileId: string) => uploadState.activeUploads.has(fileId),
  };
}
