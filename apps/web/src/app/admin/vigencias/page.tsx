// ============================================================================
// 1. apps/web/src/app/admin/vigencias/page.tsx - CORRIGIDO
// ============================================================================

'use client';

import { useAuth, usePermissions } from '@/components/providers/AuthProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodCard } from '@/components/vigencias/PeriodCard';
import { PeriodsByYearView } from '@/components/vigencias/PeriodsByYearView'; // 🎯 NOVO: Componente de paginação por ano
import { useVigencias } from '@/hooks/useVigencias';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Clock,
  Gavel,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function VigenciasPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { hasRole, hasPermission } = usePermissions();
  const [refreshing, setRefreshing] = useState(false);

  // 🎯 CORREÇÃO: hasRole retorna uma FUNÇÃO, não um valor booleano
  const isDirector = hasRole('DIRETOR');
  const isManager = hasRole('GERENTE');
  const isViewer = hasRole('VISUALIZADOR');
  const canViewReports = hasPermission('VIEW_REPORTS');
  const canClosePeriods = hasPermission('CLOSE_PERIODS');

  const {
    pendingPeriods,
    pendingCount,
    allPeriods,
    isLoadingPending,
    isLoadingAll,
    isOfficializing,
    isStarting,
    pendingError,
    allPeriodsError,
    refetchPending,
    officializePeriod,
    startPeriod,
  } = useVigencias();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchPending();
      toast.success('Dados atualizados com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar dados');
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

  const handleStart = (periodId: number) => {
    router.push(`/admin/vigencias/periodos/${periodId}/iniciar`);
  };

  const handleViewAll = () => {
    router.push('/admin/vigencias/pendentes');
  };

  if (isLoadingPending && isLoadingAll) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-8 w-64' />
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <Skeleton className='h-32' />
          <Skeleton className='h-32' />
          <Skeleton className='h-32' />
        </div>
        <Skeleton className='h-64' />
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Gestão de Vigências
          </h1>
          <p className='text-muted-foreground'>
            {isDirector
              ? 'Gerencie o ciclo completo de vigências e oficializações'
              : isManager
                ? 'Monitore períodos e prepare análises para oficialização'
                : 'Acompanhe o status dos períodos de vigência'}
          </p>
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

      {/* Cards de status */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        {/* Card de períodos pendentes */}
        <Card className='border-orange-200 bg-orange-50'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Períodos Pendentes
            </CardTitle>
            <Clock className='h-4 w-4 text-orange-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-orange-700'>
              {pendingCount}
            </div>
            <p className='text-xs text-orange-600 mt-1'>
              {isDirector ? 'Aguardando sua oficialização' : 'Em análise'}
            </p>
          </CardContent>
        </Card>

        {/* Card de total de períodos */}
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Períodos
            </CardTitle>
            <Calendar className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{allPeriods.length}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              Todos os períodos
            </p>
          </CardContent>
        </Card>

        {/* Card de ações rápidas */}
        <Card className='border-blue-200 bg-blue-50'>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Ações Rápidas</CardTitle>
            <TrendingUp className='h-4 w-4 text-blue-600' />
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              {isDirector && pendingCount > 0 && (
                <Button
                  size='sm'
                  onClick={handleViewAll}
                  className='w-full gap-2'
                >
                  <Gavel className='h-3 w-3' />
                  Oficializar
                </Button>
              )}
              {(isManager || isDirector) && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => router.push('/admin/vigencias/pendentes')}
                  className='w-full gap-2'
                >
                  <BarChart3 className='h-3 w-3' />
                  Analisar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Erros */}
      {(pendingError || allPeriodsError) && (
        <Alert className='border-red-200 bg-red-50'>
          <AlertTriangle className='h-4 w-4 text-red-600' />
          <AlertDescription className='text-red-700'>
            Erro ao carregar dados:{' '}
            {pendingError?.message || allPeriodsError?.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Conteúdo principal com tabs */}
      <Tabs defaultValue='pending' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='pending' className='gap-2'>
            <Clock className='h-4 w-4' />
            Pendentes ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value='all' className='gap-2'>
            <Calendar className='h-4 w-4' />
            Todos ({allPeriods.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab de períodos pendentes */}
        <TabsContent value='pending' className='space-y-4'>
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
                  Não há períodos aguardando oficialização no momento.
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
                  onAnalyze={handleAnalyze} // 🎯 CORREÇÃO: Sempre passar handleAnalyze para períodos pendentes
                  onStart={isDirector ? handleStart : undefined}
                  loading={isOfficializing || isStarting}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tab de todos os períodos */}
        <TabsContent value='all' className='space-y-4'>
          {isLoadingAll ? (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className='h-48' />
              ))}
            </div>
          ) : allPeriods.length === 0 ? (
            <Card>
              <CardContent className='flex flex-col items-center justify-center py-12'>
                <Calendar className='h-12 w-12 text-muted-foreground mb-4' />
                <h3 className='text-lg font-semibold mb-2'>
                  Nenhum período encontrado
                </h3>
                <p className='text-muted-foreground text-center'>
                  Não há períodos cadastrados no sistema.
                </p>
              </CardContent>
            </Card>
          ) : (
            <PeriodsByYearView
              periods={allPeriods}
              onOfficialize={isDirector ? handleOfficialize : undefined}
              onAnalyze={handleAnalyze}
              onStart={isDirector ? handleStart : undefined}
              loading={isOfficializing || isStarting}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
