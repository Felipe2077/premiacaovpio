// apps/web/src/components/expurgos/ExpurgosTable.tsx (REFATORADA - SEM SCROLL HORIZONTAL)
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useExpurgoActions } from '@/hooks/useExpurgoActions';
import { formatDate } from '@/lib/utils';
import {
  Calendar,
  Check,
  Eye,
  FileText,
  MoreHorizontal,
  Paperclip,
  Percent,
  User,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import AttachmentsModal from './attachments/AttachmentsModal';
import ApproveExpurgoModal from './modals/ApproveExpurgoModal';
import ExpurgoDetailsModal from './modals/ExpurgoDetailsModal';
import RejectExpurgoModal from './modals/RejectExpurgoModal';

// ===================================
// INTERFACES E TIPOS (SEPARAÇÃO DE RESPONSABILIDADES)
// ===================================

interface ExpurgoData {
  id: number;
  status: 'PENDENTE' | 'APROVADO' | 'APROVADO_PARCIAL' | 'REJEITADO';
  dataEvento: string;
  descricaoEvento: string;
  justificativaSolicitacao: string;
  valorSolicitado: number;
  valorAprovado?: number | null;
  sector?: { id: number; nome: string };
  criterion?: { id: number; nome: string; unidade_medida?: string };
  registradoPor?: { id: number; nome: string; email: string };
  aprovadoPor?: { id: number; nome: string; email: string } | null;
  quantidadeAnexos?: number;
  percentualAprovacao?: number | null;
  valorEfetivo?: number;
  houveReducao?: boolean;
  createdAt: Date | string;
  aprovadoEm?: Date | string | null;
}

interface ExpurgosTableProps {
  expurgos?: ExpurgoData[];
  loading?: boolean;
  error?: Error | null;
}

interface StatusInfo {
  className: string;
  icon: string;
  label: string;
}

interface ModalState<T = ExpurgoData | null> {
  open: boolean;
  expurgo: T;
}

// ===================================
// UTILITÁRIOS DE ORDENAÇÃO
// ===================================

class ExpurgoSortHelper {
  /**
   * Ordena expurgos do mais recente para o mais antigo
   * Prioridade: 1) Data de criação, 2) ID (caso de empate)
   */
  static sortByMostRecent(expurgos: ExpurgoData[]): ExpurgoData[] {
    return [...expurgos].sort((a, b) => {
      // Converter datas de criação para comparação
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      // Ordenar por data de criação (mais recente primeiro)
      if (dateB !== dateA) {
        return dateB - dateA;
      }

      // Em caso de empate na data, usar ID (maior ID = mais recente)
      return b.id - a.id;
    });
  }
}

class ExpurgoStatusHelper {
  private static readonly STATUS_CONFIG: Record<
    ExpurgoData['status'],
    StatusInfo
  > = {
    APROVADO: {
      className: 'bg-green-600 hover:bg-green-700 text-white border-0',
      icon: '✅',
      label: 'APROVADO',
    },
    APROVADO_PARCIAL: {
      className: 'bg-blue-600 hover:bg-blue-700 text-white border-0',
      icon: '🔄',
      label: 'APROV. PARCIAL',
    },
    PENDENTE: {
      className: 'bg-yellow-500 hover:bg-yellow-600 text-white border-0',
      icon: '⏳',
      label: 'PENDENTE',
    },
    REJEITADO: {
      className: 'bg-red-600 hover:bg-red-700 text-white border-0',
      icon: '❌',
      label: 'REJEITADO',
    },
  };

  static getStatusInfo(status: ExpurgoData['status']): StatusInfo {
    return (
      this.STATUS_CONFIG[status] || {
        className: 'bg-gray-500 text-white border-0',
        icon: '❓',
        label: status,
      }
    );
  }

  static canApproveReject(status: ExpurgoData['status']): boolean {
    return status === 'PENDENTE';
  }
}

class ExpurgoDisplayHelper {
  static formatSolicitanteTooltip(expurgo: ExpurgoData): string {
    return [
      `Solicitante: ${expurgo.registradoPor?.nome || 'N/A'}`,
      `Email: ${expurgo.registradoPor?.email || 'N/A'}`,
      `Registrado em: ${formatDate(expurgo.createdAt)}`,
    ].join('\n');
  }

  static formatCriterioTooltip(expurgo: ExpurgoData): string {
    return [
      `Critério: ${expurgo.criterion?.nome || 'N/A'}`,
      `Unidade: ${expurgo.criterion?.unidade_medida || 'N/A'}`,
    ].join('\n');
  }

  static truncateText(text: string, maxLength: number = 100): string {
    return text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  }
}

// ===================================
// COMPONENTES GRANULARES (SEPARAÇÃO DE RESPONSABILIDADES)
// ===================================

interface DataEventoCellProps {
  dataEvento: string;
}

const DataEventoCell: React.FC<DataEventoCellProps> = ({ dataEvento }) => (
  <TableCell className='py-3 w-[90px]'>
    <div className='flex items-center space-x-1'>
      <Calendar className='h-3 w-3 text-gray-400 flex-shrink-0' />
      <span className='text-sm font-medium'>{formatDate(dataEvento)}</span>
    </div>
  </TableCell>
);

interface SetorCellProps {
  setor?: { nome: string };
}

const SetorCell: React.FC<SetorCellProps> = ({ setor }) => (
  <TableCell className='py-3 w-[80px]'>
    <Badge variant='outline' className='text-xs font-medium px-2 py-1'>
      {setor?.nome || 'N/A'}
    </Badge>
  </TableCell>
);

interface CriterioCellProps {
  criterion?: { nome: string; unidade_medida?: string };
}

const CriterioCell: React.FC<CriterioCellProps> = ({ criterion }) => (
  <TableCell className='py-3 w-[110px]'>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className='space-y-1 cursor-help'>
          <div className='font-medium text-sm'>{criterion?.nome || 'N/A'}</div>
          {criterion?.unidade_medida && (
            <Badge variant='secondary' className='text-xs px-1 py-0'>
              {criterion.unidade_medida}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Critério: {criterion?.nome}</p>
        <p>Unidade: {criterion?.unidade_medida}</p>
      </TooltipContent>
    </Tooltip>
  </TableCell>
);

interface ValoresCellProps {
  valorSolicitado: number;
  valorAprovado?: number | null;
  percentualAprovacao?: number | null;
}

const ValoresCell: React.FC<ValoresCellProps> = ({
  valorSolicitado,
  valorAprovado,
  percentualAprovacao,
}) => (
  <TableCell className='py-3 w-[120px]'>
    <div className='space-y-1'>
      <div className='flex items-center justify-between text-xs'>
        <span className='text-gray-600 font-medium'>Solic:</span>
        <span className='font-semibold'>{valorSolicitado}</span>
      </div>
      <div className='flex items-center justify-between text-xs'>
        <span className='text-gray-600 font-medium'>Aprov:</span>
        <span className='font-semibold text-green-600'>
          {valorAprovado ?? 0}
        </span>
      </div>
      {percentualAprovacao !== null && (
        <div className='flex items-center justify-center mt-1'>
          <Badge
            variant='secondary'
            className='text-xs px-1 py-0 bg-blue-100 text-blue-800 border-blue-200'
          >
            <Percent className='h-2 w-2 mr-1' />
            {percentualAprovacao.toFixed(0)}%
          </Badge>
        </div>
      )}
    </div>
  </TableCell>
);

interface StatusCellProps {
  status: ExpurgoData['status'];
}

const StatusCell: React.FC<StatusCellProps> = ({ status }) => {
  const statusInfo = ExpurgoStatusHelper.getStatusInfo(status);

  return (
    <TableCell className='py-3 w-[120px]'>
      <Badge className={`text-xs px-2 py-1 ${statusInfo.className}`}>
        <span className='mr-1'>{statusInfo.icon}</span>
        {statusInfo.label}
      </Badge>
    </TableCell>
  );
};

interface SolicitanteCellProps {
  registradoPor?: { nome: string; email: string };
  createdAt: Date | string;
}

const SolicitanteCell: React.FC<SolicitanteCellProps> = ({
  registradoPor,
  createdAt,
}) => (
  <TableCell className='py-3 w-[110px]'>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className='flex items-center space-x-1 cursor-help'>
          <User className='h-3 w-3 text-gray-400 flex-shrink-0' />
          <span className='text-sm truncate max-w-[80px]'>
            {registradoPor?.nome || 'N/A'}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Solicitante: {registradoPor?.nome}</p>
        <p>Email: {registradoPor?.email}</p>
        <p>Registrado em: {formatDate(createdAt)}</p>
      </TooltipContent>
    </Tooltip>
  </TableCell>
);

interface JustificativaCellProps {
  justificativa: string;
}

const JustificativaCell: React.FC<JustificativaCellProps> = ({
  justificativa,
}) => (
  <TableCell className='py-3 w-[250px]'>
    <div className='flex items-start space-x-1'>
      <FileText className='h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0' />
      <p className='text-sm text-gray-700 leading-relaxed whitespace-normal break-words'>
        {justificativa}
      </p>
    </div>
  </TableCell>
);

interface AnexosCellProps {
  quantidadeAnexos?: number;
  onViewAttachments: () => void;
}

const AnexosCell: React.FC<AnexosCellProps> = ({
  quantidadeAnexos,
  onViewAttachments,
}) => (
  <TableCell className='py-3 w-[70px] text-center'>
    {quantidadeAnexos && quantidadeAnexos > 0 ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            className='h-8 w-8 p-0 relative'
            onClick={onViewAttachments}
          >
            <Paperclip className='h-4 w-4 text-blue-600' />
            <Badge className='absolute -top-2 -right-2 h-4 w-4 p-0 text-xs bg-blue-600 text-white flex items-center justify-center border-0'>
              {quantidadeAnexos}
            </Badge>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{quantidadeAnexos} anexo(s)</p>
        </TooltipContent>
      </Tooltip>
    ) : (
      <span className='text-gray-400 text-xs'>Sem anexos</span>
    )}
  </TableCell>
);

interface AcoesCellProps {
  expurgo: ExpurgoData;
  onView: (expurgo: ExpurgoData) => void;
  onApprove: (expurgo: ExpurgoData) => void;
  onReject: (expurgo: ExpurgoData) => void;
  onViewAttachments: (expurgo: ExpurgoData) => void;
}

const AcoesCell: React.FC<AcoesCellProps> = ({
  expurgo,
  onView,
  onApprove,
  onReject,
  onViewAttachments,
}) => {
  const canApproveReject = ExpurgoStatusHelper.canApproveReject(expurgo.status);

  return (
    <TableCell className='py-3 w-[140px] text-center'>
      <div className='flex items-center justify-center gap-1'>
        {/* Botões de Aprovação/Rejeição diretos (visíveis) */}
        {canApproveReject ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 w-7 p-0 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300'
                  onClick={() => onApprove(expurgo)}
                >
                  <Check className='h-3 w-3' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Aprovar expurgo</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 w-7 p-0 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300'
                  onClick={() => onReject(expurgo)}
                >
                  <X className='h-3 w-3' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Rejeitar expurgo</p>
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          // Para registros já processados, mostrar apenas visualizar
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                className='h-7 w-7 p-0 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300'
                onClick={() => onView(expurgo)}
              >
                <Eye className='h-3 w-3' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Visualizar detalhes</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Menu dropdown para ações secundárias */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='sm' className='h-7 w-7 p-0'>
              <MoreHorizontal className='h-3 w-3' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end' className='w-44'>
            <DropdownMenuItem
              onClick={() => onView(expurgo)}
              className='flex items-center space-x-2 cursor-pointer'
            >
              <Eye className='h-4 w-4' />
              <span>Ver Detalhes</span>
            </DropdownMenuItem>

            {expurgo.quantidadeAnexos && expurgo.quantidadeAnexos > 0 && (
              <DropdownMenuItem
                onClick={() => onViewAttachments(expurgo)}
                className='flex items-center space-x-2 cursor-pointer'
              >
                <Paperclip className='h-4 w-4' />
                <span>Ver Anexos ({expurgo.quantidadeAnexos})</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TableCell>
  );
};

// ===================================
// HOOK CUSTOMIZADO PARA GESTÃO DE MODAIS (ABSTRAÇÃO)
// ===================================

const useExpurgoModals = () => {
  const [approveModal, setApproveModal] = useState<ModalState>({
    open: false,
    expurgo: null,
  });

  const [rejectModal, setRejectModal] = useState<ModalState>({
    open: false,
    expurgo: null,
  });

  const [attachmentsModal, setAttachmentsModal] = useState<ModalState>({
    open: false,
    expurgo: null,
  });

  const [detailsModal, setDetailsModal] = useState<ModalState>({
    open: false,
    expurgo: null,
  });

  const openApproveModal = (expurgo: ExpurgoData) => {
    setApproveModal({ open: true, expurgo });
  };

  const closeApproveModal = () => {
    setApproveModal({ open: false, expurgo: null });
  };

  const openRejectModal = (expurgo: ExpurgoData) => {
    setRejectModal({ open: true, expurgo });
  };

  const closeRejectModal = () => {
    setRejectModal({ open: false, expurgo: null });
  };

  const openAttachmentsModal = (expurgo: ExpurgoData) => {
    setAttachmentsModal({ open: true, expurgo });
  };

  const closeAttachmentsModal = () => {
    setAttachmentsModal({ open: false, expurgo: null });
  };

  const openDetailsModal = (expurgo: ExpurgoData) => {
    setDetailsModal({ open: true, expurgo });
  };

  const closeDetailsModal = () => {
    setDetailsModal({ open: false, expurgo: null });
  };

  return {
    // Estados
    approveModal,
    rejectModal,
    attachmentsModal,
    detailsModal,
    // Actions
    openApproveModal,
    closeApproveModal,
    openRejectModal,
    closeRejectModal,
    openAttachmentsModal,
    closeAttachmentsModal,
    openDetailsModal,
    closeDetailsModal,
  };
};

// ===================================
// COMPONENTE PRINCIPAL (COMPOSIÇÃO E ORQUESTRAÇÃO)
// ===================================

export default function ExpurgosTable({
  expurgos = [],
  loading = false,
  error = null,
}: ExpurgosTableProps) {
  console.log('Dados recebidos pela tabela:', expurgos);

  // ===================================
  // HOOKS E ESTADOS
  // ===================================
  // <-- 2. CRIAR UMA VERSÃO "LIMPA" DOS DADOS USANDO useMemo
  // Isso garante que os dados sejam convertidos para os tipos corretos (números)
  // assim que chegam ao componente, e de forma otimizada.

  const sanitizedExpurgos = useMemo(() => {
    if (!expurgos) return [];
    return expurgos.map((expurgo) => ({
      ...expurgo,
      // Converte strings em números. Se a conversão falhar, usa 0 como padrão.
      valorSolicitado: parseFloat(String(expurgo.valorSolicitado)) || 0,
      // Faz o mesmo para valorAprovado, mas preserva o 'null' se for o caso.
      valorAprovado: expurgo.valorAprovado
        ? parseFloat(String(expurgo.valorAprovado))
        : null,
    }));
  }, [expurgos]);

  const {
    approveModal,
    rejectModal,
    attachmentsModal,
    detailsModal,
    openApproveModal,
    closeApproveModal,
    openRejectModal,
    closeRejectModal,
    openAttachmentsModal,
    closeAttachmentsModal,
    openDetailsModal,
    closeDetailsModal,
  } = useExpurgoModals();

  const {
    handleApprove,
    handleReject,
    isLoading: isActionLoading,
  } = useExpurgoActions();

  // ===================================
  // HANDLERS DE AÇÕES (ORQUESTRAÇÃO)
  // ===================================

  const handleViewExpurgo = (expurgo: ExpurgoData) => {
    openDetailsModal(expurgo);
  };

  const handleConfirmApprove = async (data: {
    valorAprovado: number;
    justificativaAprovacao: string;
    observacoes?: string;
  }) => {
    if (!approveModal.expurgo) return;

    try {
      await handleApprove(approveModal.expurgo.id, data);
      closeApproveModal();
    } catch (error) {
      console.error('Erro ao aprovar expurgo:', error);
      // Toast de erro será tratado pelo hook useExpurgoActions
    }
  };

  const handleConfirmReject = async (data: {
    justificativaRejeicao: string;
    observacoes?: string;
  }) => {
    if (!rejectModal.expurgo) return;

    try {
      await handleReject(rejectModal.expurgo.id, data);
      closeRejectModal();
    } catch (error) {
      console.error('Erro ao rejeitar expurgo:', error);
      // Toast de erro será tratado pelo hook useExpurgoActions
    }
  };

  // ===================================
  // ESTADOS DE LOADING E ERRO
  // ===================================

  if (loading) {
    return (
      <div className='flex items-center justify-center h-32'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900'></div>
        <span className='ml-2'>Carregando expurgos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center text-red-600 p-4'>
        <p>Erro ao carregar expurgos: {error.message}</p>
      </div>
    );
  }

  // ===================================
  // PREPARAÇÃO DOS DADOS
  // ===================================

  // Ordenar expurgos do mais recente para o mais antigo
  const sortedExpurgos = ExpurgoSortHelper.sortByMostRecent(sanitizedExpurgos);

  // ===================================
  // RENDER PRINCIPAL
  // ===================================

  return (
    <TooltipProvider>
      <div className='w-full'>
        {/* Container otimizado para evitar scroll horizontal */}
        <div className='border rounded-lg bg-white shadow-sm overflow-hidden'>
          <div className='overflow-x-auto'>
            <Table className='min-w-[1300px] table-fixed'>
              <TableCaption className='py-4'>
                Lista de eventos expurgados com aprovação/rejeição.
              </TableCaption>

              <TableHeader>
                <TableRow className='bg-gray-50 hover:bg-gray-50'>
                  <TableHead className='w-[90px] font-semibold text-xs uppercase tracking-wide'>
                    Data Evento
                  </TableHead>
                  <TableHead className='w-[80px] font-semibold text-xs uppercase tracking-wide'>
                    Setor
                  </TableHead>
                  <TableHead className='w-[110px] font-semibold text-xs uppercase tracking-wide'>
                    Critério
                  </TableHead>
                  <TableHead className='w-[120px] font-semibold text-xs uppercase tracking-wide'>
                    Valores
                  </TableHead>
                  <TableHead className='w-[120px] font-semibold text-xs uppercase tracking-wide'>
                    Status
                  </TableHead>
                  <TableHead className='w-[110px] font-semibold text-xs uppercase tracking-wide'>
                    Solicitante
                  </TableHead>
                  <TableHead className='w-[250px] font-semibold text-xs uppercase tracking-wide'>
                    Justificativa
                  </TableHead>
                  <TableHead className='w-[70px] font-semibold text-xs uppercase tracking-wide text-center'>
                    Anexos
                  </TableHead>
                  <TableHead className='w-[140px] font-semibold text-xs uppercase tracking-wide text-center'>
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {sortedExpurgos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className='text-center h-24 text-gray-500'
                    >
                      Nenhum expurgo registrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedExpurgos.map((expurgo) => (
                    <TableRow
                      key={expurgo.id}
                      className='hover:bg-gray-50 transition-colors'
                    >
                      {/* Componentes granulares para cada célula */}
                      <DataEventoCell dataEvento={expurgo.dataEvento} />

                      <SetorCell setor={expurgo.sector} />

                      <CriterioCell criterion={expurgo.criterion} />

                      <ValoresCell
                        valorSolicitado={expurgo.valorSolicitado}
                        valorAprovado={expurgo.valorAprovado}
                        percentualAprovacao={expurgo.percentualAprovacao}
                      />

                      <StatusCell status={expurgo.status} />

                      <SolicitanteCell
                        registradoPor={expurgo.registradoPor}
                        createdAt={expurgo.createdAt}
                      />

                      <JustificativaCell
                        justificativa={expurgo.justificativaSolicitacao}
                      />

                      <AnexosCell
                        quantidadeAnexos={expurgo.quantidadeAnexos}
                        onViewAttachments={() => openAttachmentsModal(expurgo)}
                      />

                      <AcoesCell
                        expurgo={expurgo}
                        onView={handleViewExpurgo}
                        onApprove={openApproveModal}
                        onReject={openRejectModal}
                        onViewAttachments={openAttachmentsModal}
                      />
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Modais centralizados */}
        <ApproveExpurgoModal
          open={approveModal.open}
          onOpenChange={closeApproveModal}
          expurgo={approveModal.expurgo}
          onApprove={handleConfirmApprove}
          isLoading={isActionLoading}
        />

        <RejectExpurgoModal
          open={rejectModal.open}
          onOpenChange={closeRejectModal}
          expurgo={rejectModal.expurgo}
          onReject={handleConfirmReject}
          isLoading={isActionLoading}
        />

        <AttachmentsModal
          open={attachmentsModal.open}
          onOpenChange={closeAttachmentsModal}
          expurgo={attachmentsModal.expurgo}
          readOnly={false}
        />

        <ExpurgoDetailsModal
          open={detailsModal.open}
          onOpenChange={closeDetailsModal}
          expurgo={detailsModal.expurgo}
          onViewAttachments={() => {
            if (detailsModal.expurgo) {
              closeDetailsModal();
              openAttachmentsModal(detailsModal.expurgo);
            }
          }}
          onApprove={() => {
            if (detailsModal.expurgo) {
              closeDetailsModal();
              openApproveModal(detailsModal.expurgo);
            }
          }}
          onReject={() => {
            if (detailsModal.expurgo) {
              closeDetailsModal();
              openRejectModal(detailsModal.expurgo);
            }
          }}
          canManage={true}
        />
      </div>

      {/* Estilos customizados para melhorias */}
      <style jsx>{`
        .break-words {
          word-wrap: break-word;
          word-break: break-word;
          hyphens: auto;
        }

        .table-fixed {
          table-layout: fixed;
        }

        /* Garantir que tooltips não quebrem o layout */
        .tooltip-content {
          max-width: 300px;
          word-wrap: break-word;
        }

        /* Melhorar responsividade em telas menores */
        @media (max-width: 1024px) {
          .min-w-\\[1200px\\] {
            min-width: 1100px;
          }
        }

        @media (max-width: 768px) {
          .min-w-\\[1200px\\] {
            min-width: 1000px;
          }
        }
      `}</style>
    </TooltipProvider>
  );
}
