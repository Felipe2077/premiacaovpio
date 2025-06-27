// apps/web/src/app/admin/vigencias/periodos/[id]/analise/page.tsx - PÁGINA DE ANÁLISE
'use client';

import { useAuth, usePermissions } from '@/components/providers/AuthProvider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PeriodStatusBadge } from '@/components/vigencias/PeriodStatusBadge';
import { TieIndicator } from '@/components/vigencias/TieIndicator';
import { usePeriodRankingAnalysis } from '@/hooks/useVigencias';
import { formatDate, formatScore } from '@/lib/utils';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  Clock,
  Info,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function AnalyzePeriodPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { isDirector, isManager } = usePermissions();
  const periodId = parseInt(params.id as string);

  const {
    data: analysisData,
    isLoading,
    error,
    refetch,
  } = usePeriodRankingAnalysis(periodId);

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-48 w-full' />
        <Skeleton className='h-64 w-full' />
      </div>
    );
  }

  if (error) {
    return (
      <div className='space-y-6'>
        <Button variant='ghost' onClick={() => router.back()} className='gap-2'>
          <ArrowLeft className='h-4 w-4' />
          Voltar
        </Button>

        <Alert className='border-red-200 bg-red-50'>
          <AlertTriangle className='h-4 w-4 text-red-600' />
          <AlertDescription className='text-red-800'>
            Erro ao carregar análise: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!analysisData) {
    return (
      <div className='space-y-6'>
        <Button variant='ghost' onClick={() => router.back()} className='gap-2'>
          <ArrowLeft className='h-4 w-4' />
          Voltar
        </Button>
        <div className='text-center py-8 text-muted-foreground'>
          <Info className='h-12 w-12 mx-auto mb-4 opacity-50' />
          <p>Análise não disponível para este período</p>
        </div>
      </div>
    );
  }

  const { period, ranking, tieAnalysis, metadata } = analysisData;

  return (
    <div className='space-y-6 max-w-5xl'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button
            variant='ghost'
            onClick={() => router.back()}
            className='gap-2'
          >
            <ArrowLeft className='h-4 w-4' />
            Voltar
          </Button>

          <div>
            <h1 className='text-3xl font-bold tracking-tight'>
              Análise do Período
            </h1>
            <p className='text-muted-foreground'>
              Ranking detalhado e detecção de empates
            </p>
          </div>
        </div>

        {/* Ações do diretor */}
        {isDirector() && period.status === 'PRE_FECHADA' && (
          <Button
            onClick={() =>
              router.push(`/admin/vigencias/periodos/${periodId}/oficializar`)
            }
            className='bg-red-600 hover:bg-red-700 text-white gap-2'
          >
            <Trophy className='h-4 w-4' />
            Oficializar Período
          </Button>
        )}
      </div>

      {/* Informações do período */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-xl'>Período {period.mesAno}</CardTitle>
            <PeriodStatusBadge status={period.status} size='lg' />
          </div>
          <CardDescription className='grid grid-cols-3 gap-4 mt-4'>
            <div className='flex items-center gap-2'>
              <Calendar className='h-4 w-4' />
              <span>Início: {formatDate(period.dataInicio)}</span>
            </div>
            <div className='flex items-center gap-2'>
              <Clock className='h-4 w-4' />
              <span>Fim: {formatDate(period.dataFim)}</span>
            </div>
            <div className='flex items-center gap-2'>
              <BarChart3 className='h-4 w-4' />
              <span>Calculado: {formatDate(metadata.calculatedAt)}</span>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Análise de empates */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Users className='h-5 w-5' />
            Análise de Empates
          </CardTitle>
          <CardDescription>
            Detecção automática de empates no ranking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TieIndicator tieData={tieAnalysis} />

          {metadata.requiresDirectorDecision && (
            <Alert className='mt-4 border-red-200 bg-red-50'>
              <AlertTriangle className='h-4 w-4 text-red-600' />
              <AlertDescription className='text-red-800'>
                <strong>Decisão diretorial necessária:</strong> Este período
                requer intervenção manual para resolução de empates antes da
                oficialização.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Ranking completo */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Trophy className='h-5 w-5' />
            Ranking Completo
          </CardTitle>
          <CardDescription>
            Classificação final de todos os setores ({metadata.totalSectors}{' '}
            setores)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            {ranking.map((sector, index) => {
              const isWinner = sector.rank === 1;
              const isTied = tieAnalysis.tiedGroups.some((group) =>
                group.sectors.some((s) => s.nome === sector.nome)
              );

              return (
                <div
                  key={sector.id}
                  className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    isWinner
                      ? 'bg-yellow-50 border-yellow-200 shadow-sm'
                      : isTied
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className='flex items-center gap-4'>
                    <Badge
                      variant={isWinner ? 'default' : 'outline'}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        isWinner
                          ? 'bg-yellow-500 text-white shadow-lg'
                          : isTied
                            ? 'bg-orange-100 text-orange-700 border-orange-300'
                            : ''
                      }`}
                    >
                      {sector.rank}º
                    </Badge>
                    <div>
                      <div className='font-semibold text-lg'>{sector.nome}</div>
                      {isTied && (
                        <div className='text-sm text-orange-600 font-medium'>
                          Empate detectado
                        </div>
                      )}
                    </div>
                  </div>

                  <div className='text-right'>
                    <div className='text-2xl font-bold'>
                      {formatScore(sector.pontuacao)}
                    </div>
                    <div className='text-sm text-muted-foreground'>pontos</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas rápidas */}
      <div className='grid gap-4 md:grid-cols-3'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Maior Pontuação
            </CardTitle>
            <TrendingUp className='h-4 w-4 text-green-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {formatScore(ranking[0]?.pontuacao || 0)}
            </div>
            <p className='text-xs text-muted-foreground'>{ranking[0]?.nome}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Setores Avaliados
            </CardTitle>
            <Users className='h-4 w-4 text-blue-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-blue-600'>
              {metadata.totalSectors}
            </div>
            <p className='text-xs text-muted-foreground'>
              Total de participantes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Empates</CardTitle>
            <AlertTriangle className='h-4 w-4 text-orange-600' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-orange-600'>
              {tieAnalysis.tiedGroups.length}
            </div>
            <p className='text-xs text-muted-foreground'>Grupos empatados</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
