import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  CheckCircle,
  Clock,
  Gavel,
  Settings,
  Trophy,
} from 'lucide-react';

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

interface VigenciaStatusIndicatorProps {
  currentPeriod: Period | null;
  lastUpdateTime?: Date | null;
  isLoading?: boolean;
}

// Configurações de cada status
const statusConfig = {
  PLANEJAMENTO: {
    label: 'Planejamento',
    description: 'As metas estão sendo definidas para este período',
    color: 'bg-blue-50 border-blue-200',
    badgeVariant: 'default' as const,
    badgeColor: 'bg-blue-100 text-blue-800',
    icon: Settings,
    iconColor: 'text-blue-600',
    message:
      '🔧 As metas ainda estão sendo definidas. A competição não iniciou.',
    showData: false,
  },
  ATIVA: {
    label: 'Competição Ativa',
    description: 'A premiação está acontecendo neste momento',
    color: 'bg-green-50 border-green-200',
    badgeVariant: 'default' as const,
    badgeColor: 'bg-green-100 text-green-800',
    icon: Trophy,
    iconColor: 'text-green-600',
    message:
      '🏆 Competição em andamento! Os dados são atualizados em tempo real.',
    showData: true,
  },
  PRE_FECHADA: {
    label: 'Aguardando Oficialização',
    description: 'Período encerrado, aguardando confirmação da diretoria',
    color: 'bg-orange-50 border-orange-200',
    badgeVariant: 'secondary' as const,
    badgeColor: 'bg-orange-100 text-orange-800',
    icon: Gavel,
    iconColor: 'text-orange-600',
    message: '⏳ Período finalizado. Aguardando oficialização dos resultados.',
    showData: true,
  },
  FECHADA: {
    label: 'Finalizada',
    description: 'Período oficialmente encerrado',
    color: 'bg-gray-50 border-gray-200',
    badgeVariant: 'outline' as const,
    badgeColor: 'bg-gray-100 text-gray-800',
    icon: CheckCircle,
    iconColor: 'text-gray-600',
    message: '✅ Período finalizado. Dados históricos para consulta.',
    showData: true,
  },
};

// Função para formatar período
const formatPeriod = (mesAno: string) => {
  if (!mesAno || !mesAno.includes('-')) return 'Período Indisponível';
  const [ano, mes] = mesAno.split('-');
  const date = new Date(Number(ano), Number(mes) - 1);
  return date.toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
};

// Função para formatar data
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function VigenciaStatusIndicator({
  currentPeriod,
  lastUpdateTime,
  isLoading = false,
}: VigenciaStatusIndicatorProps) {
  if (isLoading) {
    return (
      <Card className='mb-6'>
        <CardContent className='pt-6'>
          <div className='animate-pulse space-y-3'>
            <div className='h-4 bg-gray-200 rounded w-1/3'></div>
            <div className='h-6 bg-gray-200 rounded w-2/3'></div>
            <div className='h-4 bg-gray-200 rounded w-1/2'></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!currentPeriod) {
    return (
      <Card className='mb-6 border-yellow-200 bg-yellow-50'>
        <CardContent className='pt-6'>
          <div className='flex items-center gap-3'>
            <Clock className='h-5 w-5 text-yellow-600' />
            <div>
              <p className='font-medium text-yellow-900'>
                Nenhuma vigência ativa
              </p>
              <p className='text-sm text-yellow-700'>
                Aguardando definição do próximo período
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const config = statusConfig[currentPeriod.status];
  const IconComponent = config.icon;

  return (
    <Card className={`mb-6 ${config.color}`}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg flex items-center gap-2'>
            <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
            Status da Vigência
          </CardTitle>
          <Badge className={config.badgeColor}>{config.label}</Badge>
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Período Atual */}
        <div className='flex items-center gap-2'>
          <Calendar className='h-4 w-4 text-muted-foreground' />
          <span className='font-semibold text-lg'>
            {formatPeriod(currentPeriod.mesAno)}
          </span>
        </div>

        {/* Mensagem de Status */}
        <div className='bg-white/60 rounded-lg p-3 border border-white/40'>
          <p className='text-sm font-medium text-gray-800'>{config.message}</p>
        </div>

        {/* Informações do Período */}
        <div className='grid grid-cols-2 gap-4 text-sm'>
          <div>
            <span className='text-muted-foreground'>Início:</span>
            <p className='font-medium'>
              {formatDate(currentPeriod.dataInicio)}
            </p>
          </div>
          <div>
            <span className='text-muted-foreground'>Fim:</span>
            <p className='font-medium'>{formatDate(currentPeriod.dataFim)}</p>
          </div>
        </div>

        {/* Informações Específicas por Status */}
        {currentPeriod.status === 'FECHADA' && currentPeriod.setorVencedor && (
          <div className='bg-white/60 rounded-lg p-3 border border-white/40'>
            <div className='flex items-center gap-2'>
              <Trophy className='h-4 w-4 text-yellow-600' />
              <span className='text-sm'>
                <span className='text-muted-foreground'>Vencedor:</span>
                <span className='font-bold ml-1 text-yellow-700'>
                  {currentPeriod.setorVencedor.nome}
                </span>
              </span>
            </div>
            {currentPeriod.oficializadaEm && (
              <p className='text-xs text-muted-foreground mt-1'>
                Oficializada em {formatDate(currentPeriod.oficializadaEm)}
              </p>
            )}
          </div>
        )}

        {/* Última Atualização (só para vigências ativas) */}
        {currentPeriod.status === 'ATIVA' && lastUpdateTime && (
          <div className='text-xs text-muted-foreground border-t pt-3 mt-3'>
            <Clock className='h-3 w-3 inline mr-1' />
            Última atualização:{' '}
            {lastUpdateTime.toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}

        {/* Call to Action baseado no status */}
        {currentPeriod.status === 'PLANEJAMENTO' && (
          <div className='bg-blue-100 rounded-lg p-3 text-center'>
            <p className='text-sm text-blue-800'>
              📋 Em breve as metas serão definidas e a competição iniciará
            </p>
            <p className='text-xs text-blue-600 mt-1'>
              💡 Você pode consultar resultados de períodos anteriores usando o
              filtro abaixo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
