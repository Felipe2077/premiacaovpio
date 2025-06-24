// apps/web/src/components/audit-logs/AuditLogDetailsModal.tsx - VERSÃO CORRIGIDA
import type { AuditLogEntity } from '@/entity/audit-log.entity';
import { formatDate } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  FileEdit,
  FileText,
  Hash,
  Info,
  MapPin,
  Settings,
  Target,
  Upload,
  User,
  XCircle,
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ActionBadge } from './ActionBadge';
import { LogDetailRenderer } from './LogDetailRenderer';

interface AuditLogDetailsModalProps {
  log: AuditLogEntity | null;
  onClose: () => void;
}

// Função utilitária para formatação de números
const formatNumber = (value: number | string): string => {
  const num = Number(value);
  if (isNaN(num)) return String(value);

  // Se é número inteiro, não mostra decimais
  if (num % 1 === 0) {
    return num.toLocaleString('pt-BR');
  }

  // Se tem decimais, mostra no máximo 2 casas, removendo zeros desnecessários
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

// Configurações visuais por tipo de ação
const getActionConfig = (actionType: string) => {
  const configs = {
    // Expurgos
    EXPURGO_SOLICITADO: {
      theme: 'blue',
      icon: AlertTriangle,
      title: 'Solicitação de Expurgo',
      bgClass: 'bg-blue-50 border-blue-200',
      headerClass: 'bg-blue-600 text-white',
    },
    EXPURGO_APROVADO_INTEGRAL: {
      theme: 'green',
      icon: CheckCircle2,
      title: 'Expurgo Aprovado Integralmente',
      bgClass: 'bg-green-50 border-green-200',
      headerClass: 'bg-green-600 text-white',
    },
    EXPURGO_APROVADO_PARCIAL: {
      theme: 'teal',
      icon: CheckCircle2,
      title: 'Expurgo Aprovado Parcialmente',
      bgClass: 'bg-teal-50 border-teal-200',
      headerClass: 'bg-teal-600 text-white',
    },
    EXPURGO_REJEITADO: {
      theme: 'red',
      icon: XCircle,
      title: 'Expurgo Rejeitado',
      bgClass: 'bg-red-50 border-red-200',
      headerClass: 'bg-red-600 text-white',
    },
    EXPURGO_ANEXO_ENVIADO: {
      theme: 'gray',
      icon: Upload,
      title: 'Anexo de Expurgo Enviado',
      bgClass: 'bg-gray-50 border-gray-200',
      headerClass: 'bg-gray-600 text-white',
    },
    // Metas
    META_CRIADA_VIA_CALCULO: {
      theme: 'purple',
      icon: Calculator,
      title: 'Meta Calculada Criada',
      bgClass: 'bg-purple-50 border-purple-200',
      headerClass: 'bg-purple-600 text-white',
    },
    META_ATUALIZADA_VIA_CALCULO: {
      theme: 'indigo',
      icon: Calculator,
      title: 'Meta Calculada Atualizada',
      bgClass: 'bg-indigo-50 border-indigo-200',
      headerClass: 'bg-indigo-600 text-white',
    },
    PARAMETRO_ALTERADO: {
      theme: 'orange',
      icon: FileEdit,
      title: 'Meta Versionada',
      bgClass: 'bg-orange-50 border-orange-200',
      headerClass: 'bg-orange-600 text-white',
    },
  };

  return (
    configs[actionType as keyof typeof configs] || {
      theme: 'gray',
      icon: FileEdit,
      title: 'Evento de Sistema',
      bgClass: 'bg-gray-50 border-gray-200',
      headerClass: 'bg-gray-600 text-white',
    }
  );
};

// Componente para informação compacta
const InfoItem = ({
  icon: Icon,
  label,
  value,
  className = '',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  className?: string;
}) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <Icon className='h-4 w-4 text-muted-foreground flex-shrink-0' />
    <div className='min-w-0 flex-1'>
      <span className='text-xs text-muted-foreground block leading-none'>
        {label}
      </span>
      <span className='text-sm font-medium leading-none'>{value}</span>
    </div>
  </div>
);

// Componente para valores numéricos
const ValueDisplay = ({
  label,
  value,
  className = '',
  isMain = false,
}: {
  label: string;
  value: number | string;
  className?: string;
  isMain?: boolean;
}) => (
  <div className={`text-center ${className}`}>
    <p className='text-xs text-muted-foreground mb-1'>{label}</p>
    <div
      className={`font-bold font-mono rounded-lg p-2 ${isMain ? 'text-lg' : 'text-sm'} ${className}`}
    >
      {formatNumber(value)}
    </div>
  </div>
);

// Layout específico para Expurgos - OTIMIZADO
const ExpurgoLayout = ({
  log,
  config,
}: {
  log: AuditLogEntity;
  config: any;
}) => {
  const details = log.details || {};
  const Icon = config.icon;

  return (
    <div className='space-y-4'>
      {/* Header compacto */}
      <div className={`rounded-lg p-3 ${config.bgClass} border`}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <Icon className='h-6 w-6 text-current' />
            <div>
              <h3 className='font-semibold'>{config.title}</h3>
              <p className='text-xs opacity-80'>
                Processo de expurgo do sistema
              </p>
            </div>
          </div>
          {details.expurgoId && (
            <Badge variant='outline' className='font-mono'>
              #{details.expurgoId}
            </Badge>
          )}
        </div>
      </div>

      {/* Grid de informações principais */}
      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <InfoItem
          icon={MapPin}
          label='Setor'
          value={details.sectorName || 'N/A'}
        />
        <InfoItem
          icon={Target}
          label='Critério'
          value={details.criterionName || 'N/A'}
        />
        <InfoItem
          icon={Calendar}
          label='Data'
          value={details.dataEvento || 'N/A'}
        />
        <InfoItem
          icon={User}
          label='Solicitante'
          value={details.originalSolicitante || log.user?.nome || 'N/A'}
        />
      </div>

      {/* Valores - Layout horizontal compacto */}
      {(details.valorSolicitado || details.valorAprovado) && (
        <div className='bg-muted/30 rounded-lg p-4'>
          <h4 className='text-sm font-medium mb-3 flex items-center gap-2'>
            <Hash className='h-4 w-4' />
            Valores do Expurgo
          </h4>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {details.valorSolicitado && (
              <ValueDisplay
                label='Solicitado'
                value={details.valorSolicitado}
                className='bg-blue-100 text-blue-700'
              />
            )}
            {details.valorAprovado && (
              <ValueDisplay
                label='Aprovado'
                value={details.valorAprovado}
                className='bg-green-100 text-green-700'
                isMain={true}
              />
            )}
            {details.percentualAprovacao && (
              <ValueDisplay
                label='% Aprovação'
                value={`${details.percentualAprovacao}%`}
                className='bg-purple-100 text-purple-700'
              />
            )}
          </div>
        </div>
      )}

      {/* Arquivo anexado (se aplicável) */}
      {details.fileName && (
        <div className='bg-gray-50 rounded-lg p-3 border border-dashed'>
          <div className='flex items-center gap-3'>
            <FileText className='h-5 w-5 text-gray-600' />
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium truncate'>{details.fileName}</p>
              <div className='flex gap-4 text-xs text-muted-foreground'>
                {details.fileSize && (
                  <span>{(details.fileSize / 1024).toFixed(1)} KB</span>
                )}
                {details.mimeType && <span>{details.mimeType}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Layout específico para Metas - ULTRA COMPACTO SEM SCROLL
const MetaLayout = ({ log, config }: { log: AuditLogEntity; config: any }) => {
  const details = log.details || {};
  const Icon = config.icon;
  const userName = log.user?.nome ?? log.userName ?? 'Sistema';

  // Extrair dados específicos do tipo de evento
  const isVersionamento = log.actionType === 'META_VERSIONADA_TIMESTAMP';
  const isCriacaoCalculada = log.actionType === 'META_CRIADA_VIA_CALCULO';
  const isAtualizacaoCalculada =
    log.actionType === 'META_ATUALIZADA_VIA_CALCULO';

  // Dados para versionamento
  const newParameter = details.newParameter;
  const oldVersion = details.oldVersion;
  const newVersion = details.newVersion;

  // Dados para criação/atualização calculada
  const appliedData = details.appliedData;
  const savedMetadata = details.savedMetadata;
  const savedValue = details.savedValue;

  return (
    <div className='space-y-3'>
      {/* Header ultra compacto com descrição inline */}
      <div className={`rounded-lg p-2 ${config.bgClass} border`}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Icon className='h-5 w-5 text-current' />
            <div>
              <h3 className='font-semibold text-sm'>{config.title}</h3>
              <p className='text-xs opacity-70'>
                {isVersionamento
                  ? 'Nova versão criada'
                  : isCriacaoCalculada
                    ? 'Meta criada via cálculo'
                    : isAtualizacaoCalculada
                      ? 'Meta atualizada via cálculo'
                      : 'Meta alterada'}
              </p>
            </div>
          </div>
          {/* Valor principal em destaque */}
          {(newParameter?.valor || savedValue || appliedData?.finalValue) && (
            <div className='text-center'>
              <span className='font-mono text-lg font-bold text-green-700 bg-green-100 px-2 py-1 rounded'>
                {formatNumber(
                  newParameter?.valor || savedValue || appliedData?.finalValue
                )}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* VERSIONAMENTO - Layout ultra compacto */}
      {isVersionamento && newParameter && (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          {/* Identificação */}
          <div className='bg-blue-50 rounded-lg p-3 border border-blue-200'>
            <h4 className='text-xs font-medium mb-2 flex items-center gap-1'>
              <Target className='h-3 w-3' />
              Meta Versionada
            </h4>
            <div className='space-y-1'>
              <div className='text-xs'>
                <span className='text-muted-foreground'>Nome:</span>
                <p
                  className='font-mono text-xs bg-white p-1 rounded mt-0.5 truncate'
                  title={newParameter.nomeParametro}
                >
                  {newParameter.nomeParametro}
                </p>
              </div>
              <div className='grid grid-cols-3 gap-2 text-xs'>
                <div>
                  <span className='text-muted-foreground block'>Versão:</span>
                  <span className='font-medium'>
                    {oldVersion} → {newVersion}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground block'>Vigência:</span>
                  <span className='font-medium'>
                    {new Date(
                      newParameter.dataInicioEfetivo
                    ).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground block'>ID:</span>
                  <span className='font-mono'>{newParameter.id}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cálculo compacto */}
          {newParameter.metadata && (
            <div className='bg-purple-50 rounded-lg p-3 border border-purple-200'>
              <h4 className='text-xs font-medium mb-2 flex items-center gap-1'>
                <Calculator className='h-3 w-3' />
                Cálculo Aplicado
              </h4>
              <div className='grid grid-cols-2 gap-2 text-xs'>
                {newParameter.metadata.calculationMethod && (
                  <div>
                    <span className='text-muted-foreground block'>Método:</span>
                    <span className='font-medium'>
                      {newParameter.metadata.calculationMethod}
                    </span>
                  </div>
                )}
                {newParameter.metadata.baseValue && (
                  <div>
                    <span className='text-muted-foreground block'>Base:</span>
                    <span className='font-mono'>
                      {formatNumber(newParameter.metadata.baseValue)}
                    </span>
                  </div>
                )}
                {newParameter.metadata.adjustmentPercentage !== undefined && (
                  <div>
                    <span className='text-muted-foreground block'>Ajuste:</span>
                    <span className='font-medium'>
                      {newParameter.metadata.adjustmentPercentage}%
                    </span>
                  </div>
                )}
                {newParameter.metadata.roundingMethod && (
                  <div>
                    <span className='text-muted-foreground block'>
                      Arredond.:
                    </span>
                    <span className='font-medium'>
                      {newParameter.metadata.roundingMethod}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CRIAÇÃO/ATUALIZAÇÃO CALCULADA - Layout ultra compacto */}
      {(isCriacaoCalculada || isAtualizacaoCalculada) && appliedData && (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
          {/* Cálculo aplicado */}
          <div className='bg-purple-50 rounded-lg p-3 border border-purple-200'>
            <h4 className='text-xs font-medium mb-2 flex items-center gap-1'>
              <Calculator className='h-3 w-3' />
              Parâmetros do Cálculo
            </h4>
            <div className='grid grid-cols-2 gap-2 text-xs'>
              {appliedData.calculationMethod && (
                <div>
                  <span className='text-muted-foreground block'>Método:</span>
                  <span className='font-medium'>
                    {appliedData.calculationMethod}
                  </span>
                </div>
              )}
              {savedMetadata?.baseValue && (
                <div>
                  <span className='text-muted-foreground block'>Base:</span>
                  <span className='font-mono'>
                    {formatNumber(savedMetadata.baseValue)}
                  </span>
                </div>
              )}
              {appliedData.adjustmentPercentage !== undefined && (
                <div>
                  <span className='text-muted-foreground block'>Ajuste:</span>
                  <span className='font-medium'>
                    {appliedData.adjustmentPercentage}%
                  </span>
                </div>
              )}
              {appliedData.roundingMethod && (
                <div>
                  <span className='text-muted-foreground block'>
                    Arredond.:
                  </span>
                  <span className='font-medium'>
                    {appliedData.roundingMethod}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Localização */}
          <div className='bg-blue-50 rounded-lg p-3 border border-blue-200'>
            <h4 className='text-xs font-medium mb-2 flex items-center gap-1'>
              <Target className='h-3 w-3' />
              Localização
            </h4>
            <div className='grid grid-cols-2 gap-2 text-xs'>
              <div>
                <span className='text-muted-foreground block'>
                  Critério ID:
                </span>
                <span className='font-mono'>{appliedData.criterionId}</span>
              </div>
              <div>
                <span className='text-muted-foreground block'>Setor ID:</span>
                <span className='font-mono'>
                  {appliedData.sectorId || 'Geral'}
                </span>
              </div>
              <div>
                <span className='text-muted-foreground block'>
                  Arredondado:
                </span>
                <span className='font-medium'>
                  {appliedData.wasRounded ? 'Sim' : 'Não'}
                </span>
              </div>
              <div>
                <span className='text-muted-foreground block'>Casas Dec.:</span>
                <span className='font-mono'>
                  {appliedData.roundingDecimalPlaces || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informações básicas - linha única */}
      <div className='bg-muted/30 rounded-lg p-3'>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-xs'>
          <div className='flex items-center gap-1'>
            <User className='h-3 w-3 text-muted-foreground' />
            <div>
              <span className='text-muted-foreground block'>Usuário:</span>
              <span className='font-medium'>{userName}</span>
            </div>
          </div>
          <div className='flex items-center gap-1'>
            <Clock className='h-3 w-3 text-muted-foreground' />
            <div>
              <span className='text-muted-foreground block'>Data:</span>
              <span className='font-medium'>
                {formatDate(log.timestamp).split(' ')[0]}
              </span>
            </div>
          </div>
          {log.competitionPeriod && (
            <div className='flex items-center gap-1'>
              <Calendar className='h-3 w-3 text-muted-foreground' />
              <div>
                <span className='text-muted-foreground block'>Período:</span>
                <span className='font-medium'>
                  {log.competitionPeriod.mesAno}
                </span>
              </div>
            </div>
          )}
          {log.ipAddress && (
            <div className='flex items-center gap-1'>
              <MapPin className='h-3 w-3 text-muted-foreground' />
              <div>
                <span className='text-muted-foreground block'>IP:</span>
                <span className='font-mono text-xs'>{log.ipAddress}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fallback para outros tipos - ultra compacto */}
      {!isVersionamento && !isCriacaoCalculada && !isAtualizacaoCalculada && (
        <>
          {/* Alteração de valores - compacta */}
          {details.valorAntigo !== undefined &&
            details.valorNovo !== undefined && (
              <div className='bg-orange-50 rounded-lg p-3 border border-orange-200'>
                <h4 className='text-xs font-medium mb-2 flex items-center gap-1'>
                  <ArrowRight className='h-3 w-3' />
                  Alteração
                </h4>
                <div className='flex items-center justify-center gap-3'>
                  <span className='font-mono text-sm bg-red-100 text-red-700 px-2 py-1 rounded'>
                    {formatNumber(details.valorAntigo)}
                  </span>
                  <ArrowRight className='h-3 w-3 text-muted-foreground' />
                  <span className='font-mono text-sm bg-green-100 text-green-700 px-2 py-1 rounded font-bold'>
                    {formatNumber(details.valorNovo)}
                  </span>
                </div>
              </div>
            )}

          {/* Se não há detalhes específicos */}
          {Object.keys(details).length === 0 && (
            <div className='bg-gray-50 rounded-lg p-3 border border-gray-200 text-center'>
              <Info className='h-6 w-6 mx-auto mb-1 text-gray-400' />
              <p className='text-xs text-gray-600'>
                Evento registrado: {userName} executou {log.actionType}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Layout padrão otimizado e mais informativo
const DefaultLayout = ({
  log,
  config,
}: {
  log: AuditLogEntity;
  config: any;
}) => {
  const Icon = config.icon;
  const userName = log.user?.nome ?? log.userName ?? 'Sistema';
  const hasDetails = log.details && Object.keys(log.details).length > 0;

  return (
    <div className='space-y-4'>
      {/* Header com descrição específica */}
      <div className={`rounded-lg p-3 ${config.bgClass} border`}>
        <div className='flex items-center gap-3'>
          <Icon className='h-6 w-6 text-current' />
          <div>
            <h3 className='font-semibold'>{config.title}</h3>
            <p className='text-xs opacity-80'>
              {log.actionType.includes('SEED')
                ? 'Execução de script de inicialização do banco de dados'
                : log.actionType.includes('LOGIN')
                  ? 'Evento de autenticação de usuário'
                  : log.actionType.includes('LOGOUT')
                    ? 'Evento de finalização de sessão'
                    : log.actionType.includes('SISTEMA')
                      ? 'Evento interno do sistema'
                      : 'Evento registrado pelo sistema'}
            </p>
          </div>
        </div>
      </div>

      {/* Informações básicas sempre disponíveis */}
      <div className='bg-muted/30 rounded-lg p-4'>
        <h4 className='text-sm font-medium mb-3 flex items-center gap-2'>
          <Info className='h-4 w-4' />
          Detalhes do Evento
        </h4>

        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <InfoItem icon={User} label='Executado por' value={userName} />
          <InfoItem
            icon={Clock}
            label='Data/Hora'
            value={formatDate(log.timestamp)}
          />
          <InfoItem
            icon={Settings}
            label='Tipo de Ação'
            value={log.actionType}
          />
        </div>

        {/* Informações adicionais se disponíveis */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
          {log.ipAddress && (
            <InfoItem icon={MapPin} label='Endereço IP' value={log.ipAddress} />
          )}
          {log.competitionPeriod && (
            <InfoItem
              icon={Calendar}
              label='Período'
              value={log.competitionPeriod.mesAno}
            />
          )}
        </div>
      </div>

      {/* Detalhes técnicos (se disponíveis) ou mensagem informativa */}
      {hasDetails ? (
        <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
          <h4 className='text-sm font-medium mb-3 flex items-center gap-2'>
            <Database className='h-4 w-4' />
            Dados Técnicos
          </h4>
          <LogDetailRenderer log={log} />
        </div>
      ) : (
        <div className='bg-blue-50 rounded-lg p-4 border border-blue-200 text-center'>
          <CheckCircle2 className='h-8 w-8 mx-auto mb-2 text-blue-500' />
          <p className='text-sm text-blue-700 font-medium'>
            Evento registrado com sucesso
          </p>
          <p className='text-xs text-blue-600 mt-1'>
            Esta ação foi executada por {userName} e registrada automaticamente
            pelo sistema de auditoria.
          </p>
        </div>
      )}
    </div>
  );
};

export function AuditLogDetailsModal({
  log,
  onClose,
}: AuditLogDetailsModalProps) {
  if (!log) return null;

  const config = getActionConfig(log.actionType);
  const userName = log.user?.nome ?? log.userName ?? 'Sistema';

  // Renderizar layout específico baseado no tipo
  const renderContent = () => {
    if (log.actionType.startsWith('EXPURGO_')) {
      return <ExpurgoLayout log={log} config={config} />;
    }
    if (
      log.actionType.includes('META_') ||
      log.actionType.includes('PARAMETRO_')
    ) {
      return <MetaLayout log={log} config={config} />;
    }
    return <DefaultLayout log={log} config={config} />;
  };

  return (
    <Dialog open={!!log} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className='sm:max-w-[900px] max-h-[90vh] overflow-hidden flex flex-col'>
        {/* Header personalizado compacto */}
        <DialogHeader
          className={`rounded-t-lg mx-[-24px] mt-[-24px] px-6 py-2 ${config.headerClass} flex-shrink-0`}
        >
          <DialogTitle className='flex items-center gap-3 text-white'>
            <config.icon className='h-4 w-4' />
            Detalhes do Evento de Auditoria
          </DialogTitle>
          <div className='text-white/80 text-xs'>
            <div className='flex items-center gap-4 mt-1'>
              <Badge
                variant='secondary'
                className='bg-white/20 text-white border-white/30 text-xs'
              >
                ID: {log.id}
              </Badge>
              <span className='flex items-center gap-1'>
                <User className='h-3 w-3' />
                <span className='text-xs'>{userName}</span>
              </span>
              <span className='flex items-center gap-1'>
                <Clock className='h-3 w-3' />
                <span className='text-xs'>{formatDate(log.timestamp)}</span>
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo sem scroll - altura fixa */}
        <div className='flex-1 min-h-0 px-1'>
          {/* Justificativa (se existir) - inline */}
          {log.justification && (
            <div className='mb-3 bg-blue-50 border-l-2 border-blue-400 p-2 rounded-r-lg'>
              <span className='text-xs font-medium text-blue-900'>
                Justificativa:
              </span>
              <span className='text-xs text-blue-800 italic ml-2'>
                &quot;{log.justification}&quot;
              </span>
            </div>
          )}

          {/* Conteúdo específico */}
          {renderContent()}
        </div>

        <DialogFooter className='flex justify-between items-center pt-2 border-t flex-shrink-0'>
          <ActionBadge actionType={log.actionType} size='sm' />
          <DialogClose asChild>
            <Button type='button' variant='outline' size='sm'>
              Fechar
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
