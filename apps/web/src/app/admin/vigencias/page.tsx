// apps/web/src/app/admin/vigencias/page.tsx - VERSÃO CORRIGIDA
'use client';

import { useAuth, usePermissions } from '@/components/providers/AuthProvider';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodCard } from '@/components/vigencias/PeriodCard';
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
  const { hasRole, permissions } = usePermissions();
  const [refreshing, setRefreshing] = useState(false);

  // Verificar roles usando hasRole do hook de permissões
  const isDirector = hasRole('DIRETOR');
  const isManager = hasRole('GERENTE');
  const isViewer = hasRole('VISUALIZADOR');

  const {
    pendingPeriods,
    pendingCount,
    allPeriods,
    isLoadingPending,
    isLoadingAll,
    isOfficializing,
    pendingError,
    allPeriodsError,
    refetchPending,
    officializePeriod,
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

  // Estatísticas rápidas
  const activePeriods = allPeriods.filter((p) => p.status === 'ATIVA');
  const planningPeriods = allPeriods.filter((p) => p.status === 'PLANEJAMENTO');
  const closedPeriods = allPeriods.filter((p) => p.status === 'FECHADA');

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Gestão de Vigências
          </h1>
          <p className='text-muted-foreground'>
            Controle do ciclo de vida dos períodos de premiação
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

      {/* Cards de estatísticas rápidas */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Pendentes</CardTitle>
            <AlertTriangle className='h-4 w-4 text-orange-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-orange-600'>
              {pendingCount}
            </div>
            <p className='text-xs text-muted-foreground'>
              Aguardando oficialização
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Ativas</CardTitle>
            <TrendingUp className='h-4 w-4 text-green-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {activePeriods.length}
            </div>
            <p className='text-xs text-muted-foreground'>Em execução</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Planejamento</CardTitle>
            <Calendar className='h-4 w-4 text-blue-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>
              {planningPeriods.length}
            </div>
            <p className='text-xs text-muted-foreground'>Sendo configuradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Fechadas</CardTitle>
            <BarChart3 className='h-4 w-4 text-purple-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-purple-600'>
              {closedPeriods.length}
            </div>
            <p className='text-xs text-muted-foreground'>Oficializadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas para diretor - CORRIGIDO */}
      {isDirector && pendingCount > 0 && (
        <Alert className='border-red-200 bg-red-50'>
          <Gavel className='h-4 w-4 text-red-600' />
          <AlertDescription className='text-red-800'>
            <strong>Ação necessária:</strong> {pendingCount} período(s)
            aguardando sua oficialização.
            <Button
              variant='link'
              className='p-0 h-auto text-red-800 underline ml-2'
              onClick={() => router.push('/admin/vigencias/pendentes')}
            >
              Ver detalhes →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Conteúdo principal com tabs */}
      <Tabs defaultValue='dashboard' className='space-y-4'>
        <TabsList className='grid w-full grid-cols-3'>
          <TabsTrigger value='dashboard'>Dashboard</TabsTrigger>
          {(isDirector || isManager) && (
            <TabsTrigger value='pending'>
              Pendentes {pendingCount > 0 && `(${pendingCount})`}
            </TabsTrigger>
          )}
          <TabsTrigger value='history'>Histórico</TabsTrigger>
        </TabsList>

        {/* Tab Dashboard */}
        <TabsContent value='dashboard' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <BarChart3 className='h-5 w-5' />
                Visão Geral das Vigências
              </CardTitle>
              <CardDescription>
                Status atual de todos os períodos de premiação
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAll ? (
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className='h-[200px] rounded-lg' />
                  ))}
                </div>
              ) : allPeriodsError ? (
                <Alert className='border-red-200 bg-red-50'>
                  <AlertTriangle className='h-4 w-4 text-red-600' />
                  <AlertDescription className='text-red-800'>
                    Erro ao carregar períodos: {allPeriodsError.message}
                  </AlertDescription>
                </Alert>
              ) : allPeriods.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  <Calendar className='h-12 w-12 mx-auto mb-4 opacity-50' />
                  <p>Nenhum período encontrado</p>
                </div>
              ) : (
                <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
                  {allPeriods.slice(0, 9).map((period) => (
                    <PeriodCard
                      key={period.id}
                      period={period}
                      onOfficialize={handleOfficialize}
                      onAnalyze={handleAnalyze}
                      onStart={handleStart}
                      loading={isOfficializing}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Pendentes (apenas para Diretor/Gerente) - CORRIGIDO */}
        {(isDirector || isManager) && (
          <TabsContent value='pending' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <AlertTriangle className='h-5 w-5 text-orange-600' />
                  Períodos Pendentes de Oficialização
                </CardTitle>
                <CardDescription>
                  {isDirector
                    ? 'Períodos que requerem sua aprovação para finalização oficial'
                    : 'Períodos aguardando oficialização pelo diretor'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingPending ? (
                  <div className='space-y-4'>
                    {[...Array(3)].map((_, i) => (
                      <Skeleton key={i} className='h-[150px] rounded-lg' />
                    ))}
                  </div>
                ) : pendingError ? (
                  <Alert className='border-red-200 bg-red-50'>
                    <AlertTriangle className='h-4 w-4 text-red-600' />
                    <AlertDescription className='text-red-800'>
                      Erro ao carregar períodos pendentes:{' '}
                      {pendingError.message}
                    </AlertDescription>
                  </Alert>
                ) : pendingPeriods.length === 0 ? (
                  <div className='text-center py-8 text-muted-foreground'>
                    <Clock className='h-12 w-12 mx-auto mb-4 opacity-50' />
                    <p>Nenhum período pendente de oficialização</p>
                    <p className='text-sm mt-2'>
                      Todos os períodos estão em dia! 🎉
                    </p>
                  </div>
                ) : (
                  <div className='space-y-4'>
                    {pendingPeriods.map((period) => (
                      <PeriodCard
                        key={period.id}
                        period={period}
                        onOfficialize={
                          isDirector ? handleOfficialize : undefined
                        }
                        onAnalyze={handleAnalyze}
                        loading={isOfficializing}
                        className='border-orange-200 bg-orange-50'
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab Histórico */}
        <TabsContent value='history' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Calendar className='h-5 w-5' />
                Histórico de Períodos
              </CardTitle>
              <CardDescription>
                Períodos anteriores e seus resultados oficiais
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAll ? (
                <div className='space-y-4'>
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className='h-[120px] rounded-lg' />
                  ))}
                </div>
              ) : (
                <div className='space-y-4'>
                  {closedPeriods.length === 0 ? (
                    <div className='text-center py-8 text-muted-foreground'>
                      <BarChart3 className='h-12 w-12 mx-auto mb-4 opacity-50' />
                      <p>Nenhum período finalizado ainda</p>
                    </div>
                  ) : (
                    closedPeriods
                      .sort(
                        (a, b) =>
                          new Date(b.oficializadaEm || b.updatedAt).getTime() -
                          new Date(a.oficializadaEm || a.updatedAt).getTime()
                      )
                      .map((period) => (
                        <PeriodCard
                          key={period.id}
                          period={period}
                          onAnalyze={handleAnalyze}
                          className='border-purple-200 bg-purple-50'
                        />
                      ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
