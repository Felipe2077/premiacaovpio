import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CheckCircle, Gavel, Settings, Trophy } from 'lucide-react';

// Tipos baseados no código real
type VigenciaStatus = 'PLANEJAMENTO' | 'ATIVA' | 'PRE_FECHADA' | 'FECHADA';

interface Period {
  id: number;
  mesAno: string;
  status: VigenciaStatus;
  dataInicio: string;
  dataFim: string;
  setorVencedor?: {
    id: number;
    nome: string;
  };
  oficializadaEm?: string;
}

interface VigenciaStatusBadgeProps {
  selectedPeriod: Period | null;
  className?: string;
}

// Configurações de cada status
const statusConfig = {
  PLANEJAMENTO: {
    label: 'Planejamento',
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Settings,
    tooltip: 'As metas estão sendo definidas para este período',
  },
  ATIVA: {
    label: 'Ativa',
    variant: 'default' as const,
    className: 'bg-green-100 text-green-800 border-green-300',
    icon: Trophy,
    tooltip: 'Competição em andamento - dados atualizados em tempo real',
  },
  PRE_FECHADA: {
    label: 'Pré-fechada',
    variant: 'secondary' as const,
    className: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: Gavel,
    tooltip: 'Período encerrado, aguardando oficialização da diretoria',
  },
  FECHADA: {
    label: 'Finalizada',
    variant: 'outline' as const,
    className: 'bg-gray-100 text-gray-700 border-gray-400',
    icon: CheckCircle,
    tooltip: 'Período oficialmente encerrado',
  },
};

// Função para formatar data
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function VigenciaStatusBadge({
  selectedPeriod,
  className = '',
}: VigenciaStatusBadgeProps) {
  if (!selectedPeriod) {
    return null;
  }

  const config = statusConfig[selectedPeriod.status];
  const IconComponent = config.icon;

  // Conteúdo do tooltip com informações detalhadas
  const tooltipContent = (
    <div className='space-y-2 max-w-xs'>
      <div className='font-medium'>Status: {config.label}</div>
      <div className='text-xs text-muted-foreground'>{config.tooltip}</div>
      <div className='text-xs border-t pt-2'>
        <div>
          Período: {formatDate(selectedPeriod.dataInicio)} -{' '}
          {formatDate(selectedPeriod.dataFim)}
        </div>
        {selectedPeriod.status === 'FECHADA' &&
          selectedPeriod.setorVencedor && (
            <div className='mt-1'>
              Vencedor:{' '}
              <span className='font-medium'>
                {selectedPeriod.setorVencedor.nome}
              </span>
            </div>
          )}
        {selectedPeriod.oficializadaEm && (
          <div className='mt-1'>
            Oficializada em: {formatDate(selectedPeriod.oficializadaEm)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={config.variant}
            className={`${config.className} ${className} cursor-help transition-all hover:scale-105`}
          >
            <IconComponent className='h-3 w-3 mr-1' />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side='bottom' className='max-w-xs'>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
