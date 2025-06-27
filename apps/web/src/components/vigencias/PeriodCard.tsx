// apps/web/src/components/vigencias/PeriodCard.tsx - CORREÇÃO TAMBÉM NO CARD
'use client';

import { usePermissions } from '@/components/providers/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { Calendar, Clock, User } from 'lucide-react';
import { ActionButton } from './ActionButton';
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
  const { permissions } = usePermissions();

  const isPreClosed = period.status === 'PRE_FECHADA';
  const isClosed = period.status === 'FECHADA';
  const isPlanning = period.status === 'PLANEJAMENTO';

  return (
    <Card className={`transition-all hover:shadow-md ${className}`}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-lg font-semibold'>
            {period.mesAno}
          </CardTitle>
          <PeriodStatusBadge status={period.status} />
        </div>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Informações do período */}
        <div className='grid grid-cols-2 gap-4 text-sm'>
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
          </div>
        )}

        {/* Ações */}
        <div className='flex gap-2 pt-2'>
          {isPreClosed && onOfficialize && (
            <ActionButton
              action='officialize'
              permissions={['RESOLVE_TIES', 'CLOSE_PERIODS']}
              userPermissions={permissions}
              onClick={() => onOfficialize(period.id)}
              loading={loading}
              size='sm'
            />
          )}

          {isPlanning && onStart && (
            <ActionButton
              action='start'
              permissions={['START_PERIODS']}
              userPermissions={permissions}
              onClick={() => onStart(period.id)}
              loading={loading}
              size='sm'
            />
          )}

          {(isPreClosed || isClosed) && onAnalyze && (
            <ActionButton
              action='analyze'
              permissions={['VIEW_REPORTS']}
              userPermissions={permissions}
              onClick={() => onAnalyze(period.id)}
              size='sm'
              variant='outline'
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
