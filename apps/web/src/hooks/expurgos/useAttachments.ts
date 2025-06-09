// apps/web/src/hooks/expurgos/useAttachments.ts

import {
  AttachmentEntity,
  AttachmentStatistics,
  UploadAttachmentDto,
  UploadResponseDto,
} from '@sistema-premiacao/shared-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// ================================
// API FUNCTIONS
// ================================

const attachmentApiBase = 'http://localhost:3001/api/expurgos';

// Buscar anexos de um expurgo
async function fetchAttachments(
  expurgoId: number
): Promise<AttachmentEntity[]> {
  const response = await fetch(`${attachmentApiBase}/${expurgoId}/anexos`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao buscar anexos');
  }

  return response.json();
}

// Upload de anexo
async function uploadAttachment(
  data: UploadAttachmentDto
): Promise<UploadResponseDto> {
  const formData = new FormData();
  formData.append('file', data.file);

  if (data.description) {
    formData.append('description', data.description);
  }

  const response = await fetch(
    `${attachmentApiBase}/${data.expurgoId}/anexos/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro no upload do arquivo');
  }

  return response.json();
}

// Delete anexo
async function deleteAttachment(
  attachmentId: number,
  reason: string
): Promise<void> {
  const response = await fetch(`${attachmentApiBase}/anexos/${attachmentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao deletar anexo');
  }
}

// Buscar estatísticas de anexos
async function fetchAttachmentStatistics(
  expurgoId?: number
): Promise<AttachmentStatistics> {
  const url = expurgoId
    ? `${attachmentApiBase}/${expurgoId}/anexos/statistics`
    : `${attachmentApiBase}/anexos/statistics`;

  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao buscar estatísticas');
  }

  return response.json();
}

// ================================
// HOOK PRINCIPAL - useAttachments
// ================================

interface UseAttachmentsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useAttachments(
  expurgoId: number | null,
  options: UseAttachmentsOptions = {}
) {
  return useQuery({
    queryKey: ['attachments', expurgoId],
    queryFn: () => fetchAttachments(expurgoId!),
    enabled: !!expurgoId && options.enabled !== false,
    refetchInterval: options.refetchInterval,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2,
  });
}

// ================================
// HOOK PARA UPLOAD
// ================================

interface UseFileUploadOptions {
  onSuccess?: (attachment: AttachmentEntity) => void;
  onError?: (error: string) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadAttachment,
    onSuccess: (data, variables) => {
      // Invalidar cache de anexos do expurgo
      queryClient.invalidateQueries({
        queryKey: ['attachments', variables.expurgoId],
      });

      // Invalidar lista de expurgos (para atualizar contador de anexos)
      queryClient.invalidateQueries({
        queryKey: ['expurgos'],
      });

      // Callback de sucesso
      if (options.onSuccess) {
        options.onSuccess(data.attachment as AttachmentEntity);
      }

      // Toast de sucesso
      toast.success(
        `Arquivo "${data.attachment.originalFileName}" enviado com sucesso!`
      );
    },
    onError: (error: Error, variables) => {
      // Callback de erro
      if (options.onError) {
        options.onError(error.message);
      }

      // Toast de erro
      toast.error(`Erro no upload: ${error.message}`);

      console.error('Erro no upload:', error);
    },
  });
}

// ================================
// HOOK PARA AÇÕES DE ANEXO
// ================================

interface UseAttachmentActionsOptions {
  onDeleteSuccess?: (attachmentId: number) => void;
  onDeleteError?: (error: string) => void;
}

export function useAttachmentActions(
  options: UseAttachmentActionsOptions = {}
) {
  const queryClient = useQueryClient();

  // Mutation para deletar anexo
  const deleteMutation = useMutation({
    mutationFn: ({
      attachmentId,
      reason,
    }: {
      attachmentId: number;
      reason: string;
    }) => deleteAttachment(attachmentId, reason),
    onSuccess: (_, variables) => {
      // Invalidar todas as queries de anexos
      queryClient.invalidateQueries({
        queryKey: ['attachments'],
      });

      // Invalidar lista de expurgos
      queryClient.invalidateQueries({
        queryKey: ['expurgos'],
      });

      // Callback de sucesso
      if (options.onDeleteSuccess) {
        options.onDeleteSuccess(variables.attachmentId);
      }

      // Toast de sucesso
      toast.success('Anexo removido com sucesso!');
    },
    onError: (error: Error) => {
      // Callback de erro
      if (options.onDeleteError) {
        options.onDeleteError(error.message);
      }

      // Toast de erro
      toast.error(`Erro ao remover anexo: ${error.message}`);

      console.error('Erro ao deletar anexo:', error);
    },
  });

  // Função para download (não precisa de mutation, é direto)
  const handleDownload = (attachment: AttachmentEntity) => {
    try {
      // Criar link temporário para download
      const link = document.createElement('a');
      link.href = `http://localhost:3001${attachment.downloadUrl}`;
      link.download = attachment.originalFileName;
      link.target = '_blank';

      // Adicionar ao DOM, clicar e remover
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Download de "${attachment.originalFileName}" iniciado!`);
    } catch (error) {
      toast.error('Erro ao iniciar download');
      console.error('Erro no download:', error);
    }
  };

  // Função para preview (abre em nova aba)
  const handlePreview = (attachment: AttachmentEntity) => {
    try {
      if (attachment.isImage || attachment.isPdf) {
        window.open(
          `http://localhost:3001${attachment.downloadUrl}`,
          '_blank',
          'noopener,noreferrer'
        );
      } else {
        // Para outros tipos, fazer download
        handleDownload(attachment);
      }
    } catch (error) {
      toast.error('Erro ao abrir preview');
      console.error('Erro no preview:', error);
    }
  };

  return {
    // Mutation
    deleteAttachment: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,

    // Funções diretas
    handleDownload,
    handlePreview,
  };
}

// ================================
// HOOK PARA ESTATÍSTICAS
// ================================

export function useAttachmentStatistics(expurgoId?: number) {
  return useQuery({
    queryKey: ['attachment-statistics', expurgoId],
    queryFn: () => fetchAttachmentStatistics(expurgoId),
    staleTime: 1000 * 60 * 10, // 10 minutos
    retry: 1,
  });
}

// ================================
// HOOK COMBINADO PARA MODAL
// ================================

interface UseAttachmentModalOptions {
  expurgoId: number;
  autoRefresh?: boolean;
  onUploadSuccess?: (attachment: AttachmentEntity) => void;
  onDeleteSuccess?: (attachmentId: number) => void;
}

export function useAttachmentModal(options: UseAttachmentModalOptions) {
  const { expurgoId, autoRefresh = true } = options;

  // Buscar anexos
  const attachmentsQuery = useAttachments(expurgoId, {
    refetchInterval: autoRefresh ? 30000 : undefined, // Auto-refresh a cada 30s
  });

  // Upload
  const uploadMutation = useFileUpload({
    onSuccess: options.onUploadSuccess,
  });

  // Ações
  const attachmentActions = useAttachmentActions({
    onDeleteSuccess: options.onDeleteSuccess,
  });

  // Estatísticas
  const statisticsQuery = useAttachmentStatistics(expurgoId);

  return {
    // Dados
    attachments: attachmentsQuery.data || [],
    isLoading: attachmentsQuery.isLoading,
    error: attachmentsQuery.error,
    statistics: statisticsQuery.data,

    // Ações de upload
    uploadFile: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    uploadError: uploadMutation.error,

    // Ações de anexo
    deleteAttachment: attachmentActions.deleteAttachment,
    isDeleting: attachmentActions.isDeleting,
    downloadAttachment: attachmentActions.handleDownload,
    previewAttachment: attachmentActions.handlePreview,

    // Controle
    refetch: attachmentsQuery.refetch,
  };
}
