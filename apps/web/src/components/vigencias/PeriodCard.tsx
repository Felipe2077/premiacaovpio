// apps/web/src/components/vigencias/PeriodCard.tsx - CORRIGIDO COM TÍTULO AMIGÁVEL
'use client';

import { usePermissions } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate, formatPeriodName } from '@/lib/utils'; // 🎯 CORREÇÃO: Importar formatPeriodName
import {
  BarChart3,
  Calendar,
  Clock,
  Gavel,
  PlayCircle,
  User,
} from 'lucide-react';
import { PeriodStatusBadge } from './PeriodStatusBadge';

interface CompetitionPeriod {
  id: number;
  mesAno: string;
  dataInicio: string;
  dataFim: string;
  status: 'PLANEJAMENTO' | 'ATIVA' | 'PRE_FECHADA' | 'FECHADA';
  setorVencedorId?: number;
  oficializadaPorUserId?: number;
  oficializadaEm?: string;
}

interface PeriodCardProps {
  period: CompetitionPeriod;
  onOfficialize?: (periodId: number) => void;
  onAnalyze?: (periodId: number) => void;
  onStart?: (periodId: number) => void;
  loading?: boolean;
  className?: string;
}

export function PeriodCard({
  period,
  onOfficialize,
  onAnalyze,
  onStart,
  loading = false,
  className,
}: PeriodCardProps) {
  // 🎯 CORREÇÃO: Usar hook de permissões do sistema existente
  const { hasPermission, hasRole } = usePermissions();

  const isPreClosed = period.status === 'PRE_FECHADA';
  const isClosed = period.status === 'FECHADA';
  const isPlanning = period.status === 'PLANEJAMENTO';
  const isActive = period.status === 'ATIVA';

  // 🎯 CORREÇÃO: Verificações de permissão simplificadas e diretas
  const canOfficialize = hasRole('DIRETOR') || hasPermission('CLOSE_PERIODS');
  const canStart = hasRole('DIRETOR') || hasPermission('START_PERIODS');
  const canAnalyze =
    hasRole('DIRETOR') || hasRole('GERENTE') || hasPermission('VIEW_REPORTS');

  return (
    <Card className={`transition-all hover:shadow-md ${className}`}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg font-semibold'>
            {/* 🎯 CORREÇÃO: Usar formatPeriodName para título amigável */}
            {formatPeriodName(period.mesAno)}
          </CardTitle>
          <PeriodStatusBadge status={period.status} />
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Informações do período */}
        <div className='grid grid-cols-1 gap-3 text-sm'>
          <div className='flex items-center gap-2'>
            <Calendar className='h-4 w-4 text-muted-foreground' />
            <span>Início: {formatDate(period.dataInicio)}</span>
          </div>
          <div className='flex items-center gap-2'>
            <Clock className='h-4 w-4 text-muted-foreground' />
            <span>Fim: {formatDate(period.dataFim)}</span>
          </div>
        </div>

        {/* Informações de oficialização (se aplicável) */}
        {isClosed && period.oficializadaEm && (
          <div className='bg-purple-50 rounded-lg p-3 border border-purple-200'>
            <div className='flex items-center gap-2 text-sm text-purple-700'>
              <User className='h-4 w-4' />
              <span>Oficializado em {formatDate(period.oficializadaEm)}</span>
            </div>
            {period.setorVencedorId && (
              <div className='text-xs text-purple-600 mt-1'>
                Setor vencedor: #{period.setorVencedorId}
              </div>
            )}
          </div>
        )}

        {/* Status específicos */}
        {isActive && (
          <div className='bg-green-50 rounded-lg p-3 border border-green-200'>
            <div className='flex items-center gap-2 text-sm text-green-700'>
              <Clock className='h-4 w-4' />
              <span>Período em andamento</span>
            </div>
          </div>
        )}

        {/* 🎯 CORREÇÃO: Botões simplificados usando Button diretamente */}
        <div className='flex flex-wrap gap-2 pt-2'>
          {/* Botão Oficializar */}
          {isPreClosed && onOfficialize && canOfficialize && (
            <Button
              size='sm'
              onClick={() => onOfficialize(period.id)}
              disabled={loading}
              className='bg-red-600 hover:bg-red-700 text-white gap-2'
            >
              <Gavel className='h-3 w-3' />
              Oficializar
            </Button>
          )}

          {/* Botão Iniciar */}
          {isPlanning && onStart && canStart && (
            <Button
              size='sm'
              onClick={() => onStart(period.id)}
              disabled={loading}
              className='bg-green-600 hover:bg-green-700 text-white gap-2'
            >
              <PlayCircle className='h-3 w-3' />
              Iniciar
            </Button>
          )}

          {/* Botão Analisar - Disponível para períodos fechados e pré-fechados */}
          {(isPreClosed || isClosed) && onAnalyze && canAnalyze && (
            <Button
              size='sm'
              variant='outline'
              onClick={() => onAnalyze(period.id)}
              className='border-blue-200 text-blue-700 hover:bg-blue-50 gap-2'
            >
              <BarChart3 className='h-3 w-3' />
              Analisar
            </Button>
          )}
        </div>

        {/* Mensagem se não há ações disponíveis */}
        {isPlanning && !canStart && (
          <div className='text-xs text-muted-foreground bg-gray-50 rounded p-2'>
            Aguardando início pelo diretor
          </div>
        )}

        {isPreClosed && !canOfficialize && (
          <div className='text-xs text-muted-foreground bg-gray-50 rounded p-2'>
            Aguardando oficialização pelo diretor
          </div>
        )}
      </CardContent>
    </Card>
  );
}
