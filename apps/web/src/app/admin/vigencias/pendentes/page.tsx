'use client';

import { usePermissions } from '@/components/providers/AuthProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodCard } from '@/components/vigencias/PeriodCard';
import { useVigencias } from '@/hooks/useVigencias';
import { AlertTriangle, ArrowLeft, Clock, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function PendingPeriodsPage() {
  const router = useRouter();
  const { hasRole, hasPermission } = usePermissions();
  const [refreshing, setRefreshing] = useState(false);

  // 🎯 CORREÇÃO: Usar como valores booleanos diretos
  const isDirector = hasRole('DIRETOR');
  const isManager = hasRole('GERENTE');
  const canViewReports = hasPermission('VIEW_REPORTS');

  const {
    pendingPeriods,
    pendingCount,
    isLoadingPending,
    pendingError,
    refetchPending,
  } = useVigencias();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchPending();
      toast.success('Lista atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar lista');
    } finally {
      setRefreshing(false);
    }
  };

  const handleOfficialize = (periodId: number) => {
    router.push(`/admin/vigencias/periodos/${periodId}/oficializar`);
  };

  const handleAnalyze = (periodId: number) => {
    router.push(`/admin/vigencias/periodos/${periodId}/analise`);
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            onClick={() => router.push('/admin/vigencias')}
            className='gap-2'
          >
            <ArrowLeft className='h-4 w-4' />
            Voltar
          </Button>

          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Períodos Pendentes
            </h1>
            <p className='text-muted-foreground'>
              {isDirector
                ? 'Períodos aguardando sua oficialização'
                : 'Períodos em processo de finalização'}
            </p>
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <Button
            variant='outline'
            onClick={handleRefresh}
            disabled={refreshing}
            className='gap-2'
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Contador */}
      <Card className='border-orange-200 bg-orange-50'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Clock className='h-5 w-5 text-orange-600' />
            {pendingCount} período(s) pendente(s)
          </CardTitle>
          <CardDescription>
            {isDirector
              ? 'Clique em "Oficializar" para definir o vencedor'
              : 'Use "Analisar" para visualizar o ranking detalhado'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Erro */}
      {pendingError && (
        <Alert className='border-red-200 bg-red-50'>
          <AlertTriangle className='h-4 w-4 text-red-600' />
          <AlertDescription className='text-red-700'>
            Erro ao carregar períodos pendentes: {pendingError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de períodos */}
      {isLoadingPending ? (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className='h-48' />
          ))}
        </div>
      ) : pendingPeriods.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <Clock className='h-12 w-12 text-muted-foreground mb-4' />
            <h3 className='text-lg font-semibold mb-2'>
              Nenhum período pendente
            </h3>
            <p className='text-muted-foreground text-center'>
              Todos os períodos foram oficializados.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {pendingPeriods.map((period) => (
            <PeriodCard
              key={period.id}
              period={period}
              onOfficialize={isDirector ? handleOfficialize : undefined}
              onAnalyze={canViewReports ? handleAnalyze : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
