import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  DatabaseZap,
  Edit,
  FilePlus2,
  GitCompare,
  HelpCircle,
  Pencil,
  PlusCircle,
  UploadCloud,
  XCircle,
} from 'lucide-react';

interface ActionInfo {
  label: string;
  icon: React.ElementType;
  className: string;
}

// Mapeamento COMPLETO e FINAL dos tipos de ação
const actionMap: Record<string, ActionInfo> = {
  // Ações de Expurgo
  EXPURGO_SOLICITADO: {
    label: 'Expurgo Solicitado',
    icon: FilePlus2,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  EXPURGO_APROVADO_INTEGRAL: {
    label: 'Aprovado Integral',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  EXPURGO_APROVADO_PARCIAL: {
    label: 'Aprovado Parcial',
    icon: CheckCircle2,
    className: 'bg-teal-100 text-teal-800 border-teal-200',
  },
  EXPURGO_REJEITADO: {
    label: 'Expurgo Rejeitado',
    icon: XCircle,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  EXPURGO_ANEXO_ENVIADO: {
    label: 'Anexo Enviado',
    icon: UploadCloud,
    className: 'bg-gray-100 text-gray-800 border-gray-200',
  },

  // Ações de Metas e Parâmetros
  PARAMETRO_ALTERADO: {
    label: 'Parâmetro Alterado',
    icon: Pencil,
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  META_CRIADA_MANUALMENTE: {
    label: 'Meta Manual Criada',
    icon: PlusCircle,
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  META_CRIADA_VIA_CALCULO: {
    label: 'Meta Calculada Criada',
    icon: PlusCircle,
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  META_ATUALIZADA_VIA_CALCULO: {
    label: 'Meta Calculada Atualizada',
    icon: Edit,
    className: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  META_VERSIONADA_TIMESTAMP: {
    label: 'Parâmetro Versionado',
    icon: GitCompare,
    className: 'bg-gray-200 text-gray-800 border-gray-300',
  },

  // Ações de Sistema
  SEED_EXECUTADO: {
    label: 'Seed Executado',
    icon: DatabaseZap,
    className: 'bg-slate-100 text-slate-800 border-slate-200',
  },
};

const defaultAction: ActionInfo = {
  label: 'Ação Desconhecida',
  icon: HelpCircle,
  className: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function ActionBadge({ actionType }: { actionType: string }) {
  // Tratamento especial para agrupar ações similares
  let finalActionType = actionType;
  if (actionType?.startsWith('META_CALCULADA')) {
    finalActionType = 'META_ATUALIZADA_VIA_CALCULO';
  }

  const {
    label,
    icon: Icon,
    className,
  } = actionMap[finalActionType] || defaultAction;

  return (
    <Badge variant='outline' className={`font-normal text-xs ${className}`}>
      <Icon className='h-3 w-3 mr-1.5 flex-shrink-0' />
      <span className='whitespace-nowrap'>
        {actionMap[actionType]?.label || actionType}
      </span>
    </Badge>
  );
}
