// apps/web/src/components/expurgos/modals/ExpurgoDetailsModal.tsx
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
import { TooltipProvider } from '@/components/ui/tooltip';
import { formatDate } from '@/lib/utils';
import {
  Calendar,
  Check,
  Clock,
  Eye,
  FileText,
  MapPin,
  Paperclip,
  Percent,
  Target,
  User,
  X,
} from 'lucide-react';

// ===================================
// INTERFACES E TIPOS
// ===================================

interface ExpurgoData {
  id: number;
  status: 'PENDENTE' | 'APROVADO' | 'APROVADO_PARCIAL' | 'REJEITADO';
  dataEvento: string;
  descricaoEvento: string;
  justificativaSolicitacao: string;
  valorSolicitado: number;
  valorAprovado?: number | null;
  sector?: {
    id: number;
    nome: string;
  };
  criterion?: {
    id: number;
    nome: string;
    unidade_medida?: string;
  };
  registradoPor?: {
    id: number;
    nome: string;
    email: string;
  };
  aprovadoPor?: {
    id: number;
    nome: string;
    email: string;
  } | null;
  quantidadeAnexos?: number;
  percentualAprovacao?: number | null;
  valorEfetivo?: number;
  houveReducao?: boolean;
  createdAt: Date | string;
  aprovadoEm?: Date | string | null;
  justificativaAprovacao?: string;
  justificativaRejeicao?: string;
  observacoes?: string;
}

interface ExpurgoDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expurgo: ExpurgoData | null;
  onViewAttachments?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  canManage?: boolean;
}

// ===================================
// HELPERS E UTILITÁRIOS
// ===================================

function getStatusConfig(status: ExpurgoData['status']) {
  const configs = {
    PENDENTE: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: <Clock className='h-4 w-4' />,
      label: 'Pendente de Análise',
    },
    APROVADO: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <Check className='h-4 w-4' />,
      label: 'Aprovado Integralmente',
    },
    APROVADO_PARCIAL: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: <Percent className='h-4 w-4' />,
      label: 'Aprovado Parcialmente',
    },
    REJEITADO: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: <X className='h-4 w-4' />,
      label: 'Rejeitado',
    },
  };

  return configs[status] || configs.PENDENTE;
}

// ===================================
// COMPONENTES AUXILIARES
// ===================================

interface InfoCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({
  title,
  icon,
  children,
  className = '',
}) => (
  <div className={`rounded-lg border bg-white p-4 ${className}`}>
    <div className='flex items-center gap-2 mb-3'>
      <div className='text-gray-600'>{icon}</div>
      <h3 className='font-semibold text-gray-900'>{title}</h3>
    </div>
    <div className='space-y-2'>{children}</div>
  </div>
);

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, className = '' }) => (
  <div className={`flex justify-between items-start ${className}`}>
    <span className='text-sm text-gray-600 font-medium min-w-0 mr-2'>
      {label}:
    </span>
    <span className='text-sm text-gray-900 font-semibold text-right'>
      {value}
    </span>
  </div>
);

// ===================================
// COMPONENTE PRINCIPAL
// ===================================

export default function ExpurgoDetailsModal({
  open,
  onOpenChange,
  expurgo,
  onViewAttachments,
  onApprove,
  onReject,
  canManage = false,
}: ExpurgoDetailsModalProps) {
  if (!expurgo) return null;

  const statusConfig = getStatusConfig(expurgo.status);
  const isPendente = expurgo.status === 'PENDENTE';
  const isAprovado =
    expurgo.status === 'APROVADO' || expurgo.status === 'APROVADO_PARCIAL';
  const isRejeitado = expurgo.status === 'REJEITADO';

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='sm:max-w-[800px] max-h-[90vh] overflow-y-auto'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-3'>
              <Eye className='h-5 w-5 text-blue-600' />
              <span>Detalhes do Expurgo #{expurgo.id}</span>
              <Badge className={`${statusConfig.color} border`}>
                {statusConfig.icon}
                <span className='ml-1'>{statusConfig.label}</span>
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Visualização completa das informações da solicitação de expurgo.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-6'>
            {/* ===================================
                INFORMAÇÕES BÁSICAS
                =================================== */}

            <InfoCard
              title='Informações Básicas'
              icon={<FileText className='h-4 w-4' />}
            >
              <div className='grid grid-cols-2 gap-4'>
                <InfoRow
                  label='Critério'
                  value={
                    <div className='flex items-center gap-2'>
                      <span>{expurgo.criterion?.nome || 'N/A'}</span>
                      {expurgo.criterion?.unidade_medida && (
                        <Badge variant='outline' className='text-xs'>
                          {expurgo.criterion.unidade_medida}
                        </Badge>
                      )}
                    </div>
                  }
                />
                <InfoRow
                  label='Setor'
                  value={
                    <div className='flex items-center gap-1'>
                      <MapPin className='h-3 w-3 text-gray-500' />
                      {expurgo.sector?.nome || 'N/A'}
                    </div>
                  }
                />
                <InfoRow
                  label='Data do Evento'
                  value={
                    <div className='flex items-center gap-1'>
                      <Calendar className='h-3 w-3 text-gray-500' />
                      {formatDate(expurgo.dataEvento)}
                    </div>
                  }
                />
                <InfoRow
                  label='Data de Criação'
                  value={formatDate(expurgo.createdAt)}
                />
              </div>

              <Separator className='my-3' />

              <div>
                <span className='text-sm text-gray-600 font-medium'>
                  Descrição do Evento:
                </span>
                <p className='mt-1 text-sm text-gray-900 leading-relaxed bg-gray-50 p-3 rounded-md'>
                  {expurgo.descricaoEvento}
                </p>
              </div>
            </InfoCard>

            {/* ===================================
                VALORES E CÁLCULOS
                =================================== */}

            <InfoCard
              title='Valores e Cálculos'
              icon={<Target className='h-4 w-4' />}
            >
              <div className='grid grid-cols-3 gap-4'>
                <div className='text-center p-3 bg-blue-50 rounded-lg border border-blue-200'>
                  <div className='text-xs text-blue-600 font-medium mb-1'>
                    Valor Solicitado
                  </div>
                  <div className='text-lg font-bold text-blue-700'>
                    {expurgo.valorSolicitado.toLocaleString()}
                  </div>
                  {expurgo.criterion?.unidade_medida && (
                    <div className='text-xs text-blue-600'>
                      {expurgo.criterion.unidade_medida}
                    </div>
                  )}
                </div>

                <div
                  className={`text-center p-3 rounded-lg border ${
                    isAprovado
                      ? 'bg-green-50 border-green-200'
                      : isRejeitado
                        ? 'bg-red-50 border-red-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div
                    className={`text-xs font-medium mb-1 ${
                      isAprovado
                        ? 'text-green-600'
                        : isRejeitado
                          ? 'text-red-600'
                          : 'text-gray-600'
                    }`}
                  >
                    Valor Aprovado
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      isAprovado
                        ? 'text-green-700'
                        : isRejeitado
                          ? 'text-red-700'
                          : 'text-gray-700'
                    }`}
                  >
                    {expurgo.valorAprovado?.toLocaleString() || '0'}
                  </div>
                  {expurgo.criterion?.unidade_medida && (
                    <div
                      className={`text-xs ${
                        isAprovado
                          ? 'text-green-600'
                          : isRejeitado
                            ? 'text-red-600'
                            : 'text-gray-600'
                      }`}
                    >
                      {expurgo.criterion.unidade_medida}
                    </div>
                  )}
                </div>

                {expurgo.percentualAprovacao !== null && (
                  <div className='text-center p-3 bg-purple-50 rounded-lg border border-purple-200'>
                    <div className='text-xs text-purple-600 font-medium mb-1'>
                      % Aprovação
                    </div>
                    <div className='text-lg font-bold text-purple-700'>
                      {expurgo.percentualAprovacao.toFixed(1)}%
                    </div>
                    <div className='text-xs text-purple-600'>
                      {expurgo.percentualAprovacao === 100
                        ? 'Total'
                        : 'Parcial'}
                    </div>
                  </div>
                )}
              </div>

              {expurgo.houveReducao && (
                <div className='mt-3 p-2 bg-amber-50 border border-amber-200 rounded-md'>
                  <div className='flex items-center gap-2 text-amber-800 text-sm'>
                    <X className='h-4 w-4' />
                    <span className='font-medium'>
                      Houve redução no valor solicitado
                    </span>
                  </div>
                </div>
              )}
            </InfoCard>

            {/* ===================================
                PESSOAS ENVOLVIDAS
                =================================== */}

            <InfoCard
              title='Pessoas Envolvidas'
              icon={<User className='h-4 w-4' />}
            >
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {/* Solicitante */}
                <div className='p-3 bg-blue-50 rounded-lg border border-blue-200'>
                  <div className='text-xs text-blue-600 font-medium mb-2'>
                    Solicitante
                  </div>
                  <div className='space-y-1'>
                    <div className='font-semibold text-blue-900'>
                      {expurgo.registradoPor?.nome || 'N/A'}
                    </div>
                    <div className='text-sm text-blue-700'>
                      {expurgo.registradoPor?.email || 'N/A'}
                    </div>
                    <div className='text-xs text-blue-600'>
                      Registrado em {formatDate(expurgo.createdAt)}
                    </div>
                  </div>
                </div>

                {/* Aprovador/Rejeitador */}
                {(isAprovado || isRejeitado) && expurgo.aprovadoPor && (
                  <div
                    className={`p-3 rounded-lg border ${
                      isAprovado
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div
                      className={`text-xs font-medium mb-2 ${
                        isAprovado ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {isAprovado ? 'Aprovado por' : 'Rejeitado por'}
                    </div>
                    <div className='space-y-1'>
                      <div
                        className={`font-semibold ${
                          isAprovado ? 'text-green-900' : 'text-red-900'
                        }`}
                      >
                        {expurgo.aprovadoPor.nome}
                      </div>
                      <div
                        className={`text-sm ${
                          isAprovado ? 'text-green-700' : 'text-red-700'
                        }`}
                      >
                        {expurgo.aprovadoPor.email}
                      </div>
                      {expurgo.aprovadoEm && (
                        <div
                          className={`text-xs ${
                            isAprovado ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {formatDate(expurgo.aprovadoEm)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </InfoCard>

            {/* ===================================
                JUSTIFICATIVAS
                =================================== */}

            <InfoCard
              title='Justificativas'
              icon={<FileText className='h-4 w-4' />}
            >
              {/* Justificativa da Solicitação */}
              <div>
                <div className='text-sm font-medium text-gray-700 mb-2'>
                  Justificativa da Solicitação:
                </div>
                <div className='p-3 bg-gray-50 rounded-md border'>
                  <p className='text-sm text-gray-900 leading-relaxed'>
                    {expurgo.justificativaSolicitacao}
                  </p>
                </div>
              </div>

              {/* Justificativa de Aprovação */}
              {isAprovado && expurgo.justificativaAprovacao && (
                <div>
                  <div className='text-sm font-medium text-green-700 mb-2'>
                    Justificativa da Aprovação:
                  </div>
                  <div className='p-3 bg-green-50 rounded-md border border-green-200'>
                    <p className='text-sm text-green-900 leading-relaxed'>
                      {expurgo.justificativaAprovacao}
                    </p>
                  </div>
                </div>
              )}

              {/* Justificativa de Rejeição */}
              {isRejeitado && expurgo.justificativaRejeicao && (
                <div>
                  <div className='text-sm font-medium text-red-700 mb-2'>
                    Justificativa da Rejeição:
                  </div>
                  <div className='p-3 bg-red-50 rounded-md border border-red-200'>
                    <p className='text-sm text-red-900 leading-relaxed'>
                      {expurgo.justificativaRejeicao}
                    </p>
                  </div>
                </div>
              )}

              {/* Observações */}
              {expurgo.observacoes && (
                <div>
                  <div className='text-sm font-medium text-gray-700 mb-2'>
                    Observações Adicionais:
                  </div>
                  <div className='p-3 bg-blue-50 rounded-md border border-blue-200'>
                    <p className='text-sm text-blue-900 leading-relaxed'>
                      {expurgo.observacoes}
                    </p>
                  </div>
                </div>
              )}
            </InfoCard>

            {/* ===================================
                ANEXOS
                =================================== */}

            {expurgo.quantidadeAnexos && expurgo.quantidadeAnexos > 0 && (
              <InfoCard title='Anexos' icon={<Paperclip className='h-4 w-4' />}>
                <div className='flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200'>
                  <div className='flex items-center gap-2'>
                    <Paperclip className='h-4 w-4 text-blue-600' />
                    <span className='text-sm font-medium text-blue-900'>
                      {expurgo.quantidadeAnexos} arquivo(s) anexado(s)
                    </span>
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={onViewAttachments}
                    className='text-blue-600 border-blue-300 hover:bg-blue-100'
                  >
                    <Eye className='h-3 w-3 mr-1' />
                    Ver Anexos
                  </Button>
                </div>
              </InfoCard>
            )}

            {/* ===================================
                AÇÕES DISPONÍVEIS
                =================================== */}

            {isPendente && canManage && (onApprove || onReject) && (
              <InfoCard
                title='Ações Disponíveis'
                icon={<Target className='h-4 w-4' />}
              >
                <div className='flex gap-3'>
                  {onApprove && (
                    <Button
                      onClick={onApprove}
                      className='bg-green-600 hover:bg-green-700 text-white'
                    >
                      <Check className='h-4 w-4 mr-2' />
                      Aprovar Expurgo
                    </Button>
                  )}
                  {onReject && (
                    <Button onClick={onReject} variant='destructive'>
                      <X className='h-4 w-4 mr-2' />
                      Rejeitar Expurgo
                    </Button>
                  )}
                </div>
              </InfoCard>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
