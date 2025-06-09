// apps/web/src/components/expurgos/attachments/AttachmentsModal.tsx

'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAttachmentModal } from '@/hooks/expurgos/useAttachments';
import { cn, formatDate } from '@/lib/utils';
import {
  AttachmentEntity,
  formatFileSize,
} from '@sistema-premiacao/shared-types';
import {
  Download,
  FileText,
  Paperclip,
  RefreshCw,
  TrendingUp,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import AttachmentList from './AttachmentList';

// ================================
// TIPOS E INTERFACES
// ================================

interface AttachmentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expurgo: {
    id: number;
    dataEvento: string;
    descricaoEvento: string;
    valorSolicitado: number;
    status: string;
    criterion?: {
      nome: string;
    };
    sector?: {
      nome: string;
    };
    registradoPor?: {
      nome: string;
    };
    quantidadeAnexos?: number;
  } | null;
  readOnly?: boolean;
}

// ================================
// COMPONENTE DE ESTATÍSTICAS
// ================================

function AttachmentStatistics({
  attachments,
  statistics,
}: {
  attachments: AttachmentEntity[];
  statistics: any;
}) {
  const totalSize = attachments.reduce((sum, att) => sum + att.fileSize, 0);
  const imageCount = attachments.filter((att) => att.isImage).length;
  const pdfCount = attachments.filter((att) => att.isPdf).length;
  const otherCount = attachments.length - imageCount - pdfCount;

  const uploaders = attachments.reduce(
    (acc, att) => {
      if (att.uploadedBy) {
        acc[att.uploadedBy.id] = att.uploadedBy.nome;
      }
      return acc;
    },
    {} as Record<number, string>
  );

  return (
    <div className='space-y-4'>
      {/* Resumo geral */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <div className='text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg'>
          <FileText className='h-8 w-8 mx-auto mb-2 text-blue-600' />
          <p className='text-2xl font-bold text-blue-600'>
            {attachments.length}
          </p>
          <p className='text-xs text-blue-600'>Anexos</p>
        </div>

        <div className='text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg'>
          <TrendingUp className='h-8 w-8 mx-auto mb-2 text-green-600' />
          <p className='text-2xl font-bold text-green-600'>
            {formatFileSize(totalSize)}
          </p>
          <p className='text-xs text-green-600'>Tamanho Total</p>
        </div>

        <div className='text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg'>
          <Users className='h-8 w-8 mx-auto mb-2 text-purple-600' />
          <p className='text-2xl font-bold text-purple-600'>
            {Object.keys(uploaders).length}
          </p>
          <p className='text-xs text-purple-600'>Colaboradores</p>
        </div>

        <div className='text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg'>
          <Upload className='h-8 w-8 mx-auto mb-2 text-orange-600' />
          <p className='text-2xl font-bold text-orange-600'>
            {attachments.length > 0
              ? formatDate(attachments[0].uploadedAt, 'dd/MM')
              : '-'}
          </p>
          <p className='text-xs text-orange-600'>Último Upload</p>
        </div>
      </div>

      {/* Distribuição por tipo */}
      <div className='space-y-2'>
        <h4 className='text-sm font-medium'>Distribuição por Tipo</h4>
        <div className='space-y-2'>
          {imageCount > 0 && (
            <div className='flex items-center justify-between text-sm'>
              <span className='flex items-center'>
                <div className='w-3 h-3 bg-green-500 rounded-full mr-2'></div>
                Imagens
              </span>
              <span className='font-medium'>{imageCount}</span>
            </div>
          )}

          {pdfCount > 0 && (
            <div className='flex items-center justify-between text-sm'>
              <span className='flex items-center'>
                <div className='w-3 h-3 bg-red-500 rounded-full mr-2'></div>
                PDFs
              </span>
              <span className='font-medium'>{pdfCount}</span>
            </div>
          )}

          {otherCount > 0 && (
            <div className='flex items-center justify-between text-sm'>
              <span className='flex items-center'>
                <div className='w-3 h-3 bg-gray-500 rounded-full mr-2'></div>
                Outros
              </span>
              <span className='font-medium'>{otherCount}</span>
            </div>
          )}
        </div>
      </div>

      {/* Colaboradores */}
      {Object.keys(uploaders).length > 0 && (
        <div className='space-y-2'>
          <h4 className='text-sm font-medium'>Colaboradores</h4>
          <div className='flex flex-wrap gap-1'>
            {Object.values(uploaders).map((name, index) => (
              <Badge key={index} variant='secondary' className='text-xs'>
                {name}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ================================
// COMPONENTE PRINCIPAL
// ================================

export default function AttachmentsModal({
  open,
  onOpenChange,
  expurgo,
  readOnly = false,
}: AttachmentsModalProps) {
  // ================================
  // ESTADOS
  // ================================

  const [activeTab, setActiveTab] = useState<'attachments' | 'statistics'>(
    'attachments'
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ================================
  // HOOKS DE DADOS
  // ================================

  const {
    attachments,
    isLoading,
    error,
    statistics,
    uploadFile,
    isUploading,
    deleteAttachment,
    isDeleting,
    downloadAttachment,
    previewAttachment,
    refetch,
  } = useAttachmentModal({
    expurgoId: expurgo?.id || 0,
    autoRefresh: open, // Só fazer auto-refresh quando modal estiver aberto
    onUploadSuccess: (attachment) => {
      toast.success(
        `Anexo "${attachment.originalFileName}" enviado com sucesso!`
      );
    },
    onDeleteSuccess: (attachmentId) => {
      toast.success('Anexo removido com sucesso!');
    },
  });

  // ================================
  // HANDLERS
  // ================================

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success('Anexos atualizados!');
    } catch (error) {
      toast.error('Erro ao atualizar anexos');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClose = () => {
    setActiveTab('attachments'); // Reset tab ao fechar
    onOpenChange(false);
  };

  const handleDeleteWithConfirmation = (attachment: AttachmentEntity) => {
    const reason = prompt(
      `Tem certeza que deseja remover "${attachment.originalFileName}"?\n\nDigite o motivo da remoção:`
    );

    if (reason && reason.trim()) {
      deleteAttachment({ attachmentId: attachment.id, reason: reason.trim() });
    }
  };

  // ================================
  // DADOS COMPUTADOS
  // ================================

  const canEdit = !readOnly && expurgo?.status === 'PENDENTE';
  const hasAttachments = attachments.length > 0;

  // ================================
  // RENDER
  // ================================

  if (!expurgo) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-[900px] max-h-[90vh] flex flex-col'>
        {/* Header */}
        <DialogHeader className='flex-shrink-0'>
          <div className='flex items-start justify-between'>
            <div className='space-y-2'>
              <DialogTitle className='flex items-center gap-2'>
                <Paperclip className='h-5 w-5' />
                Anexos do Expurgo #{expurgo.id}
              </DialogTitle>

              <DialogDescription className='space-y-1'>
                <div className='flex items-center gap-4 text-sm'>
                  <span>
                    <strong>Evento:</strong> {expurgo.descricaoEvento}
                  </span>
                  <span>
                    <strong>Data:</strong> {formatDate(expurgo.dataEvento)}
                  </span>
                </div>

                <div className='flex items-center gap-4 text-sm'>
                  <span>
                    <strong>Setor:</strong> {expurgo.sector?.nome}
                  </span>
                  <span>
                    <strong>Critério:</strong> {expurgo.criterion?.nome}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Badge
                    variant={
                      expurgo.status === 'PENDENTE' ? 'secondary' : 'default'
                    }
                    className='text-xs'
                  >
                    {expurgo.status}
                  </Badge>

                  {hasAttachments && (
                    <Badge variant='outline' className='text-xs'>
                      {attachments.length} anexo(s)
                    </Badge>
                  )}

                  {readOnly && (
                    <Badge variant='destructive' className='text-xs'>
                      Somente Leitura
                    </Badge>
                  )}
                </div>
              </DialogDescription>
            </div>

            <div className='flex items-center gap-2'>
              {/* Botão de refresh */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className='h-8 w-8 p-0'
                  >
                    <RefreshCw
                      className={cn('h-4 w-4', isRefreshing && 'animate-spin')}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Atualizar anexos</TooltipContent>
              </Tooltip>

              {/* Botão de fechar */}
              <Button
                variant='ghost'
                size='sm'
                onClick={handleClose}
                className='h-8 w-8 p-0'
              >
                <X className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* Conteúdo principal */}
        <div className='flex-1 overflow-hidden'>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as any)}
          >
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger
                value='attachments'
                className='flex items-center gap-2'
              >
                <FileText className='h-4 w-4' />
                Anexos
                {hasAttachments && (
                  <Badge variant='secondary' className='ml-1 text-xs'>
                    {attachments.length}
                  </Badge>
                )}
              </TabsTrigger>

              <TabsTrigger
                value='statistics'
                className='flex items-center gap-2'
              >
                <TrendingUp className='h-4 w-4' />
                Estatísticas
              </TabsTrigger>
            </TabsList>

            {/* Tab de Anexos */}
            <TabsContent value='attachments' className='h-full mt-4'>
              <AttachmentList
                expurgoId={expurgo.id}
                attachments={attachments}
                loading={isLoading}
                error={error}
                onUpload={
                  canEdit
                    ? (files) => {
                        // O AttachmentList usa o componente AttachmentUpload internamente
                        // que já faz o upload automaticamente
                      }
                    : undefined
                }
                onDelete={canEdit ? handleDeleteWithConfirmation : undefined}
                onDownload={downloadAttachment}
                showUpload={canEdit}
                showActions={true}
                maxHeight='400px'
              />
            </TabsContent>

            {/* Tab de Estatísticas */}
            <TabsContent value='statistics' className='h-full mt-4'>
              <div className='max-h-[400px] overflow-y-auto'>
                {hasAttachments ? (
                  <AttachmentStatistics
                    attachments={attachments}
                    statistics={statistics}
                  />
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <TrendingUp className='mx-auto h-12 w-12 mb-4 text-gray-300' />
                    <p className='text-sm'>
                      Nenhum anexo para gerar estatísticas
                    </p>
                    {canEdit && (
                      <p className='text-xs mt-1'>
                        Adicione alguns anexos para ver as estatísticas
                      </p>
                    )}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Rodapé com ações */}
        <div className='flex-shrink-0 border-t pt-4'>
          <div className='flex items-center justify-between'>
            {/* Informações */}
            <div className='text-xs text-gray-500'>
              {isLoading ? (
                <span>Carregando anexos...</span>
              ) : error ? (
                <span className='text-red-500'>Erro ao carregar anexos</span>
              ) : hasAttachments ? (
                <span>
                  {attachments.length} anexo(s) •
                  {formatFileSize(
                    attachments.reduce((sum, att) => sum + att.fileSize, 0)
                  )}
                </span>
              ) : (
                <span>Nenhum anexo adicionado</span>
              )}
            </div>

            {/* Ações */}
            <div className='flex items-center gap-2'>
              {/* Download todos */}
              {hasAttachments && (
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    attachments.forEach((att) => downloadAttachment(att));
                    toast.success(
                      `Download iniciado para ${attachments.length} arquivo(s)`
                    );
                  }}
                  disabled={isLoading}
                >
                  <Download className='h-4 w-4 mr-2' />
                  Baixar Todos
                </Button>
              )}

              {/* Status de upload */}
              {isUploading && (
                <div className='flex items-center text-sm text-blue-600'>
                  <Upload className='h-4 w-4 mr-1 animate-pulse' />
                  Enviando...
                </div>
              )}

              {/* Status de remoção */}
              {isDeleting && (
                <div className='flex items-center text-sm text-red-600'>
                  <X className='h-4 w-4 mr-1 animate-pulse' />
                  Removendo...
                </div>
              )}

              {/* Fechar */}
              <Button onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
