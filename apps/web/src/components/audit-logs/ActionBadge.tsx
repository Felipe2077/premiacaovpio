// apps/web/src/components/audit-logs/ActionBadge.tsx - VERSÃO MELHORADA
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Activity,
  Archive,
  Calculator,
  CheckCircle,
  CheckCircle2,
  Clock,
  DatabaseZap,
  Edit,
  FilePlus2,
  GitCompare,
  HelpCircle,
  Pencil,
  PlusCircle,
  RefreshCw,
  Shield,
  Target,
  Trash2,
  TrendingUp,
  UploadCloud,
  XCircle,
  Zap,
} from 'lucide-react';

interface ActionInfo {
  label: string;
  description: string;
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

// Mapeamento COMPLETO e DETALHADO dos tipos de ação
const actionMap: Record<string, ActionInfo> = {
  // === EXPURGOS ===
  EXPURGO_SOLICITADO: {
    label: 'Expurgo Solicitado',
    description: 'Solicitação de expurgo enviada para análise',
    icon: FilePlus2,
    variant: 'outline',
    className: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100',
    priority: 'medium',
  },
  EXPURGO_APROVADO_INTEGRAL: {
    label: 'Expurgo Aprovado Integral',
    description: 'Expurgo aprovado em sua totalidade',
    icon: CheckCircle2,
    variant: 'outline',
    className: 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100',
    priority: 'high',
  },
  EXPURGO_APROVADO_PARCIAL: {
    label: 'Expurgo Aprovado Parcial',
    description: 'Expurgo aprovado parcialmente',
    icon: CheckCircle,
    variant: 'outline',
    className: 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100',
    priority: 'high',
  },
  EXPURGO_REJEITADO: {
    label: 'Expurgo Rejeitado',
    description: 'Solicitação de expurgo foi rejeitada',
    icon: XCircle,
    variant: 'outline',
    className: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100',
    priority: 'high',
  },
  EXPURGO_ANEXO_ENVIADO: {
    label: 'Anexo Enviado',
    description: 'Arquivo anexado ao processo de expurgo',
    icon: UploadCloud,
    variant: 'outline',
    className:
      'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100',
    priority: 'low',
  },

  // === METAS E PARÂMETROS ===
  META_CRIADA_MANUALMENTE: {
    label: 'Meta Manual Criada',
    description: 'Meta criada manualmente pelo usuário',
    icon: PlusCircle,
    variant: 'outline',
    className:
      'bg-indigo-50 text-indigo-700 border-indigo-300 hover:bg-indigo-100',
    priority: 'medium',
  },
  META_CRIADA_VIA_CALCULO: {
    label: 'Meta Calculada Criada',
    description:
      'Meta criada através de cálculo automático baseado em histórico',
    icon: Calculator,
    variant: 'outline',
    className:
      'bg-violet-50 text-violet-700 border-violet-300 hover:bg-violet-100',
    priority: 'medium',
  },
  META_ATUALIZADA_VIA_CALCULO: {
    label: 'Meta Calculada Atualizada',
    description: 'Meta existente atualizada via cálculo automático',
    icon: RefreshCw,
    variant: 'outline',
    className:
      'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100',
    priority: 'medium',
  },
  META_CALCULADA_ATUALIZADA: {
    label: 'Meta Calculada Atualizada',
    description:
      'Meta recalculada e atualizada automaticamente usando histórico de performance',
    icon: TrendingUp,
    variant: 'outline',
    className:
      'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100',
    priority: 'medium',
  },
  PARAMETRO_ALTERADO: {
    label: 'Meta Alterada',
    description: 'Meta do sistema foi modificada',
    icon: Edit,
    variant: 'outline',
    className:
      'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100',
    priority: 'medium',
  },
  META_VERSIONADA_TIMESTAMP: {
    label: 'Meta Versionada',
    description: 'Nova versão da meta criada',
    icon: GitCompare,
    variant: 'outline',
    className: 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100',
    priority: 'medium',
  },

  // === SISTEMA ===
  SEED_EXECUTADO: {
    label: 'Seed Executado',
    description: 'Script de inicialização do banco executado',
    icon: DatabaseZap,
    variant: 'outline',
    className: 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100',
    priority: 'low',
  },
  SISTEMA_INICIADO: {
    label: 'Sistema Iniciado',
    description: 'Sistema foi inicializado',
    icon: Activity,
    variant: 'outline',
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100',
    priority: 'low',
  },

  // === USUÁRIOS E AUTENTICAÇÃO ===
  LOGIN_REALIZADO: {
    label: 'Login Realizado',
    description: 'Usuário fez login no sistema',
    icon: Shield,
    variant: 'outline',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-300 hover:bg-cyan-100',
    priority: 'low',
  },
  LOGOUT_REALIZADO: {
    label: 'Logout Realizado',
    description: 'Usuário fez logout do sistema',
    icon: Archive,
    variant: 'outline',
    className: 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100',
    priority: 'low',
  },
  USUARIO_CRIADO: {
    label: 'Usuário Criado',
    description: 'Novo usuário foi registrado no sistema',
    icon: PlusCircle,
    variant: 'outline',
    className: 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100',
    priority: 'high',
  },
  USUARIO_ATUALIZADO: {
    label: 'Usuário Atualizado',
    description: 'Dados do usuário foram modificados',
    icon: Pencil,
    variant: 'outline',
    className:
      'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100',
    priority: 'medium',
  },
  USUARIO_DESATIVADO: {
    label: 'Usuário Desativado',
    description: 'Conta de usuário foi desativada',
    icon: Trash2,
    variant: 'outline',
    className: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100',
    priority: 'critical',
  },

  // === AGENDAMENTOS ===
  SCHEDULE_CREATED: {
    label: 'Agendamento Criado',
    description: 'Um novo job foi agendado para execução automática.',
    icon: Clock,
    variant: 'outline',
    className: 'bg-cyan-50 text-cyan-700 border-cyan-300 hover:bg-cyan-100',
    priority: 'medium',
  },
  SCHEDULE_DELETED: {
    label: 'Agendamento Removido',
    description: 'Um job agendado foi removido do sistema.',
    icon: Trash2,
    variant: 'outline',
    className: 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100',
    priority: 'medium',
  },
  SCHEDULED_JOB_EXECUTED: {
    label: 'Execução Agendada',
    description: 'Um job agendado foi executado automaticamente.',
    icon: Zap,
    variant: 'outline',
    className: 'bg-sky-50 text-sky-700 border-sky-300 hover:bg-sky-100',
    priority: 'high',
  },

  // === AUTOMAÇÃO ===
  ETL_INICIADO: {
    label: 'Início de atualização completa',
    description: 'O processo de Atualização Completa (ETL) foi iniciado.',
    icon: RefreshCw,
    variant: 'outline',
    className:
      'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100',
    priority: 'medium',
  },
  ETL_CONCLUIDO: {
    label: 'Atualização completa Concluída',
    description: 'O processo de Atualização Completa (ETL) foi finalizado.',
    icon: CheckCircle2,
    variant: 'outline',
    className: 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100',
    priority: 'medium',
  },
  RECALCULO_INICIADO: {
    label: 'Início de Recálculo',
    description: 'O processo de Recálculo de Resultados foi iniciado.',
    icon: RefreshCw,
    variant: 'outline',
    className:
      'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100',
    priority: 'medium',
  },
  RECALCULO_CONCLUIDO: {
    label: 'Recálculo Concluído',
    description: 'O processo de Recálculo de Resultados foi finalizado.',
    icon: CheckCircle,
    variant: 'outline',
    className: 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100',
    priority: 'medium',
  },

  // === PERÍODOS ===
  PERIODO_CRIADO: {
    label: 'Período Criado',
    description: 'Novo período de competição criado',
    icon: Clock,
    variant: 'outline',
    className: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100',
    priority: 'medium',
  },
  PERIODO_INICIADO: {
    label: 'Período Iniciado',
    description: 'Período de competição foi iniciado',
    icon: Target,
    variant: 'outline',
    className: 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100',
    priority: 'high',
  },
  PERIODO_FECHADO: {
    label: 'Período Fechado',
    description: 'Período de competição foi encerrado',
    icon: Archive,
    variant: 'outline',
    className: 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100',
    priority: 'high',
  },

  // === CÁLCULOS ===
  CALCULO_EXECUTADO: {
    label: 'Cálculo Executado',
    description: 'Processo de cálculo foi executado',
    icon: Zap,
    variant: 'outline',
    className:
      'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100',
    priority: 'medium',
  },
  RANKING_ATUALIZADO: {
    label: 'Ranking Atualizado',
    description: 'Ranking foi recalculado e atualizado',
    icon: TrendingUp,
    variant: 'outline',
    className: 'bg-pink-50 text-pink-700 border-pink-300 hover:bg-pink-100',
    priority: 'medium',
  },
  // === AÇÕES DE USUÁRIO  ===
  CREATE_USER: {
    label: 'Criação de Usuário',
    description: 'Um novo usuário foi registrado no sistema.',
    icon: PlusCircle,
    variant: 'outline',
    className: 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100',
    priority: 'high',
  },
  RESET_USER_PASSWORD: {
    label: 'Reset de Senha',
    description: 'A senha de um usuário foi resetada por um administrador.',
    icon: Shield,
    variant: 'outline',
    className:
      'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100',
    priority: 'critical',
  },
  DEACTIVATE_USER: {
    label: 'Usuário Desativado',
    description: 'A conta de um usuário foi desativada.',
    icon: XCircle,
    variant: 'outline',
    className: 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100',
    priority: 'high',
  },
  DELETE_USER: {
    label: 'Usuário Removido',
    description: 'Um usuário foi permanentemente removido do sistema.',
    icon: Trash2,
    variant: 'destructive', // Variante destrutiva para chamar atenção
    className: 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200',
    priority: 'critical',
  },
  ACTIVATE_USER: {
    label: 'Usuário Ativado',
    description: 'A conta de um usuário foi reativada.',
    icon: CheckCircle,
    variant: 'outline',
    className: 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100',
    priority: 'high',
  },
  UPDATE_USER: {
    label: 'Usuário Atualizado',
    description: 'Os dados de um usuário foram modificados.',
    icon: Pencil,
    variant: 'outline',
    className:
      'bg-yellow-50 text-yellow-700 border-yellow-300 hover:bg-yellow-100',
    priority: 'medium',
  },
};

const defaultAction: ActionInfo = {
  label: 'Ação Desconhecida',
  description: 'Tipo de ação não catalogada no sistema',
  icon: HelpCircle,
  variant: 'outline',
  className: 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100',
  priority: 'low',
};

// Função para obter cor de prioridade
const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'critical':
      return 'text-red-500';
    case 'high':
      return 'text-orange-500';
    case 'medium':
      return 'text-blue-500';
    case 'low':
    default:
      return 'text-gray-500';
  }
};

interface ActionBadgeProps {
  actionType: string;
  showTooltip?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ActionBadge({
  actionType,
  showTooltip = true,
  size = 'md',
}: ActionBadgeProps) {
  // Tratamento especial para agrupar ações similares
  let finalActionType = actionType;
  if (actionType?.startsWith('META_CALCULADA')) {
    finalActionType = 'META_ATUALIZADA_VIA_CALCULO';
  }

  const actionInfo = actionMap[finalActionType] || defaultAction;
  const { label, description, icon: Icon, className, priority } = actionInfo;

  // Tamanhos baseados na prop size
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const iconSizes = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3 w-3',
    lg: 'h-4 w-4',
  };

  const badge = (
    <Badge
      variant='outline'
      className={`
        font-medium inline-flex items-center gap-1.5 transition-all duration-200 cursor-help
        ${className} 
        ${sizeClasses[size]}
        hover:shadow-sm
      `}
    >
      <Icon
        className={`${iconSizes[size]} flex-shrink-0 ${getPriorityColor(priority)}`}
      />
      <span className='whitespace-nowrap truncate'>
        {actionMap[actionType]?.label || actionType}
      </span>
      {/* Indicador de prioridade */}
      {priority === 'critical' && (
        <div className='w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse' />
      )}
      {priority === 'high' && (
        <div className='w-1.5 h-1.5 bg-orange-500 rounded-full' />
      )}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side='top' className='max-w-xs'>
          <div className='space-y-1'>
            <p className='font-medium text-xs'>{label}</p>
            <p className='text-xs text-muted-foreground'>{description}</p>
            <div className='flex items-center gap-2 pt-1'>
              <div
                className={`text-xs font-medium ${getPriorityColor(priority)}`}
              >
                Prioridade:{' '}
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </div>
              {actionType !== finalActionType && (
                <div className='text-xs text-muted-foreground font-mono'>
                  {actionType}
                </div>
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
