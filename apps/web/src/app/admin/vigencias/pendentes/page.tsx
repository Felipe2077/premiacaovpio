// apps/web/src/app/admin/vigencias/pendentes/page.tsx - PÁGINA DE PENDENTES
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
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  Gavel,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function PendingPeriodsPage() {
  const router = useRouter();
  const { isDirector, isManager } = usePermissions();
  const [refreshing, setRefreshing] = useState(false);

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
              {isDirector()
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

      {/* Estatística */}
      <Card className='border-orange-200 bg-orange-50'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-orange-700'>
            <AlertTriangle className='h-5 w-5' />
            Status Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-3xl font-bold text-orange-700 mb-2'>
            {pendingCount} período(s)
          </div>
          <p className='text-orange-600'>
            aguardando oficialização{' '}
            {isDirector() ? 'por você' : 'pelo diretor'}
          </p>
        </CardContent>
      </Card>

      {/* Lista de períodos pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Clock className='h-5 w-5' />
            Períodos Pré-fechados
          </CardTitle>
          <CardDescription>
            Períodos finalizados aguardando oficialização e definição do
            vencedor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPending ? (
            <div className='space-y-4'>
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className='h-[180px] rounded-lg' />
              ))}
            </div>
          ) : pendingError ? (
            <Alert className='border-red-200 bg-red-50'>
              <AlertTriangle className='h-4 w-4 text-red-600' />
              <AlertDescription className='text-red-800'>
                Erro ao carregar períodos pendentes: {pendingError.message}
              </AlertDescription>
            </Alert>
          ) : pendingPeriods.length === 0 ? (
            <div className='text-center py-12 text-muted-foreground'>
              <Clock className='h-16 w-16 mx-auto mb-4 opacity-30' />
              <h3 className='text-lg font-medium mb-2'>
                Nenhum período pendente
              </h3>
              <p className='text-sm'>Todos os períodos estão em dia! 🎉</p>
              <Button
                variant='outline'
                onClick={() => router.push('/admin/vigencias')}
                className='mt-4'
              >
                Voltar ao Dashboard
              </Button>
            </div>
          ) : (
            <div className='space-y-4'>
              {pendingPeriods.map((period) => (
                <PeriodCard
                  key={period.id}
                  period={period}
                  onOfficialize={isDirector() ? handleOfficialize : undefined}
                  onAnalyze={handleAnalyze}
                  className='border-orange-200 bg-orange-50 hover:shadow-lg transition-all'
                />
              ))}

              {/* Instruções baseadas no perfil */}
              <div className='mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
                <div className='flex items-start gap-3'>
                  <Gavel className='h-5 w-5 text-blue-600 mt-1' />
                  <div className='text-sm text-blue-800'>
                    {isDirector() ? (
                      <>
                        <strong>Como diretor:</strong> Você pode oficializar
                        estes períodos, definindo o vencedor oficial e
                        resolvendo empates se necessário. Clique em
                        "Oficializar" para prosseguir.
                      </>
                    ) : (
                      <>
                        <strong>Aguardando diretor:</strong> Estes períodos
                        foram pré-fechados e aguardam a oficialização pelo
                        diretor. Você pode analisar os rankings e empates, mas
                        apenas o diretor pode finalizar oficialmente.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
