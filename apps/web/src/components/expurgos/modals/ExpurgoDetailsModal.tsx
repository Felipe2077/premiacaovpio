'use client';

import { useAuth } from '@/components/providers/AuthProvider'; // 🎯 CORREÇÃO: Importar useAuth
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
import { formatDate } from '@/lib/utils';
import {
  Calendar,
  Check,
  Clock,
  Eye,
  FileText,
  MapPin,
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
// COMPONENTES AUXILIARES OTIMIZADOS
// ===================================

// Card com padding e margens reduzidas
const InfoCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <div className='rounded-lg border bg-white p-3'>
    <div className='flex items-center gap-2 mb-2'>
      <div className='text-gray-500'>{icon}</div>
      <h3 className='font-semibold text-gray-800'>{title}</h3>
    </div>
    <div className='space-y-3'>{children}</div>
  </div>
);

// Linha de info já estava otimizada
const InfoRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className='flex justify-between items-start'>
    <span className='text-sm text-gray-600 font-medium min-w-0 mr-2'>
      {label}:
    </span>
    <span className='text-sm text-gray-900 font-semibold text-right'>
      {value}
    </span>
  </div>
);

// Componente para exibir justificativas de forma mais compacta
const JustificationBlock: React.FC<{
  title: string;
  content: string | null | undefined;
  colorClasses: string;
}> = ({ title, content, colorClasses }) => {
  if (!content) return null;
  return (
    <div className={`p-2.5 rounded-md border ${colorClasses}`}>
      <p className='text-xs font-semibold mb-1'>{title}</p>
      <p className='text-sm leading-relaxed'>{content}</p>
    </div>
  );
};

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
  const { user } = useAuth();

  const statusConfig = getStatusConfig(expurgo.status);
  const isPendente = expurgo.status === 'PENDENTE';
  const isAprovado =
    expurgo.status === 'APROVADO' || expurgo.status === 'APROVADO_PARCIAL';
  const isRejeitado = expurgo.status === 'REJEITADO';
  const isDirector = user?.roles?.includes('DIRETOR');
  const canActuallyManage = canManage && isDirector;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* O DialogContent agora tem menos padding vertical e não força mais um scroll */}
      <DialogContent className='sm:max-w-[800px] p-4'>
        <DialogHeader className='pb-2'>
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

        {/* Espaçamento entre os cards foi reduzido de space-y-6 para space-y-4 */}
        <div className='space-y-4 max-h-[80vh] overflow-y-auto pr-2'>
          {/* INFORMAÇÕES BÁSICAS */}
          <InfoCard
            title='Informações Básicas'
            icon={<FileText className='h-4 w-4' />}
          >
            <div className='grid grid-cols-2 gap-x-4 gap-y-2'>
              <InfoRow
                label='Critério'
                value={
                  <div className='flex items-center justify-end gap-2 text-right'>
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
            <Separator className='my-2' />
            <div>
              <span className='text-sm text-gray-600 font-medium'>
                Descrição do Evento:
              </span>
              <p className='mt-1 text-sm text-gray-800 leading-relaxed bg-gray-50 p-2.5 rounded-md'>
                {expurgo.descricaoEvento}
              </p>
            </div>
          </InfoCard>

          {/* VALORES E CÁLCULOS */}
          <InfoCard
            title='Valores e Cálculos'
            icon={<Target className='h-4 w-4' />}
          >
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
              <div className='text-center p-2 bg-blue-50 rounded-lg border border-blue-200'>
                <div className='text-xs text-blue-600 font-medium'>
                  Valor Solicitado
                </div>
                <div className='text-base font-bold text-blue-700 mt-0.5'>
                  {(expurgo.valorSolicitado || 0).toLocaleString('pt-BR')}
                </div>
              </div>
              <div
                className={`text-center p-2 rounded-lg border ${
                  isAprovado
                    ? 'bg-green-50 border-green-200'
                    : isRejeitado
                      ? 'bg-red-50 border-red-200'
                      : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div
                  className={`text-xs font-medium ${isAprovado ? 'text-green-600' : isRejeitado ? 'text-red-600' : 'text-gray-600'}`}
                >
                  Valor Aprovado
                </div>
                <div
                  className={`text-base font-bold mt-0.5 ${isAprovado ? 'text-green-700' : isRejeitado ? 'text-red-700' : 'text-gray-700'}`}
                >
                  {expurgo.valorAprovado?.toLocaleString('pt-BR') || '0'}
                </div>
              </div>
              {expurgo.percentualAprovacao !== null &&
                expurgo.percentualAprovacao !== undefined && (
                  <div className='text-center p-2 bg-purple-50 rounded-lg border border-purple-200'>
                    <div className='text-xs text-purple-600 font-medium'>
                      % Aprovação
                    </div>
                    <div className='text-base font-bold text-purple-700 mt-0.5'>
                      {(expurgo.percentualAprovacao || 0).toFixed(1)}%
                    </div>
                  </div>
                )}
            </div>
            {expurgo.houveReducao && (
              <div className='mt-2 p-1.5 bg-amber-50 border border-amber-200 rounded-md'>
                <div className='flex items-center gap-2 text-amber-800 text-sm'>
                  <X className='h-4 w-4' />
                  <span className='font-medium'>Houve redução no valor</span>
                </div>
              </div>
            )}
          </InfoCard>

          {/* PESSOAS ENVOLVIDAS */}
          <InfoCard
            title='Pessoas Envolvidas'
            icon={<User className='h-4 w-4' />}
          >
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              <div className='p-2.5 bg-gray-50 rounded-lg border'>
                <div className='text-xs text-gray-600 font-medium mb-1'>
                  Solicitante
                </div>
                <div className='font-semibold text-sm text-gray-900'>
                  {expurgo.registradoPor?.nome || 'N/A'}
                </div>
                <div className='text-xs text-gray-500'>
                  {expurgo.registradoPor?.email || 'N/A'}
                </div>
              </div>
              {(isAprovado || isRejeitado) && expurgo.aprovadoPor && (
                <div
                  className={`p-2.5 rounded-lg border ${isAprovado ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                >
                  <div
                    className={`text-xs font-medium mb-1 ${isAprovado ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {isAprovado ? 'Aprovado por' : 'Rejeitado por'}
                  </div>
                  <div
                    className={`font-semibold text-sm ${isAprovado ? 'text-green-900' : 'text-red-900'}`}
                  >
                    {expurgo.aprovadoPor.nome}
                  </div>
                  <div
                    className={`text-xs ${isAprovado ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {expurgo.aprovadoPor.email}
                  </div>
                </div>
              )}
            </div>
          </InfoCard>

          {/* JUSTIFICATIVAS */}
          <InfoCard
            title='Justificativas'
            icon={<FileText className='h-4 w-4' />}
          >
            <JustificationBlock
              title='Justificativa da Solicitação:'
              content={expurgo.justificativaSolicitacao}
              colorClasses='bg-gray-50 border-gray-200 text-gray-800'
            />
            <JustificationBlock
              title='Justificativa da Aprovação:'
              content={expurgo.justificativaAprovacao}
              colorClasses='bg-green-50 border-green-200 text-green-900'
            />
            <JustificationBlock
              title='Justificativa da Rejeição:'
              content={expurgo.justificativaRejeicao}
              colorClasses='bg-red-50 border-red-200 text-red-900'
            />
            <JustificationBlock
              title='Observações Adicionais:'
              content={expurgo.observacoes}
              colorClasses='bg-blue-50 border-blue-200 text-blue-900'
            />
          </InfoCard>

          {isPendente && canActuallyManage && (onApprove || onReject) && (
            <div className='!mt-5'>
              <div className='flex gap-3'>
                {onApprove && (
                  <Button
                    onClick={onApprove}
                    className='flex-1 bg-green-600 hover:bg-green-700 text-white'
                  >
                    <Check className='h-4 w-4 mr-2' />
                    Aprovar
                  </Button>
                )}
                {onReject && (
                  <Button
                    onClick={onReject}
                    variant='destructive'
                    className='flex-1'
                  >
                    <X className='h-4 w-4 mr-2' />
                    Rejeitar
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* 🎯 CORREÇÃO: Mensagem informativa para não-diretores */}
          {isPendente && canManage && !isDirector && (
            <div className='!mt-5'>
              <div className='bg-amber-50 border border-amber-200 rounded-lg p-3'>
                <div className='flex items-center gap-2'>
                  <div className='text-amber-600'>⚠️</div>
                  <div className='text-sm text-amber-800'>
                    <strong>Permissão Restrita:</strong> Apenas diretores podem
                    aprovar ou rejeitar expurgos.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
