// apps/web/src/app/admin/vigencias/periodos/[id]/analise/page.tsx - CORRIGIDO COMPLETO
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PeriodStatusBadge } from '@/components/vigencias/PeriodStatusBadge';
import { TieIndicator } from '@/components/vigencias/TieIndicator';
import { usePeriodRankingAnalysis } from '@/hooks/useVigencias';
import { formatDate, formatPeriodName } from '@/lib/utils'; // 🎯 CORREÇÃO: Importar formatPeriodName
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Calendar,
  Clock,
  Gavel,
  Info,
  RefreshCw,
  Trophy,
  Users,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AnalyzePeriodPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { hasRole, hasPermission } = usePermissions();
  const [refreshing, setRefreshing] = useState(false);

  const periodId = parseInt(params.id as string);

  // 🎯 CORREÇÃO: Verificações de permissão baseadas no sistema real
  const isDirector = hasRole('DIRETOR');
  const isManager = hasRole('GERENTE');
  const canViewReports = hasPermission('VIEW_REPORTS');

  const {
    data: analysisData,
    isLoading,
    error,
    refetch,
  } = usePeriodRankingAnalysis(periodId);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
      toast.success('Análise atualizada com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar análise');
    } finally {
      setRefreshing(false);
    }
  };

  const handleOfficialize = () => {
    router.push(`/admin/vigencias/periodos/${periodId}/oficializar`);
  };

  if (isLoading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center gap-4'>
          <Skeleton className='h-10 w-20' />
          <Skeleton className='h-8 w-64' />
        </div>
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
          <AlertDescription className='text-red-700'>
            Erro ao carregar análise do período: {error.message}
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

        <Alert>
          <Info className='h-4 w-4' />
          <AlertDescription>
            Dados de análise não encontrados para este período.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { period, ranking, tieAnalysis, metadata } = analysisData;

  // 🔍 DEBUG: Log dos dados recebidos para investigar os campos
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Analysis Data completa:', analysisData);
    console.log('🔍 Period data:', period);
    console.log('🔍 Metadata:', metadata);
    console.log('🔍 Ranking length:', ranking?.length);
  }

  return (
    <div className='space-y-6'>
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
              Ranking detalhado e análise de empates
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

          {/* Botão de oficializar (só para diretores) */}
          {isDirector && period.status === 'PRE_FECHADA' && (
            <Button onClick={handleOfficialize} className='gap-2'>
              <Gavel className='h-4 w-4' />
              Oficializar Período
            </Button>
          )}
        </div>
      </div>

      {/* Informações do período */}
      <Card className='border-blue-200 bg-blue-50'>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <CardTitle className='text-xl'>
              {formatPeriodName(period.mesAno)}
            </CardTitle>{' '}
            {/* 🎯 CORREÇÃO: Título amigável */}
            <PeriodStatusBadge status={period.status} size='lg' />
          </div>
          <CardDescription className='grid grid-cols-2 md:grid-cols-4 gap-4 mt-4'>
            <div className='flex items-center gap-2'>
              <Calendar className='h-4 w-4' />
              <span>Início: {formatDate(period.dataInicio)}</span>
            </div>
            <div className='flex items-center gap-2'>
              <Clock className='h-4 w-4' />
              <span>Fim: {formatDate(period.dataFim)}</span>
            </div>
            <div className='flex items-center gap-2'>
              <Users className='h-4 w-4' />
              <span>
                Setores: {ranking?.length || metadata?.totalSectors || 'N/A'}
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <BarChart3 className='h-4 w-4' />
              <span>
                Calculado em:{' '}
                {formatDate(
                  metadata?.generatedAt ||
                    metadata?.calculatedAt ||
                    new Date().toISOString()
                )}
              </span>
            </div>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Indicador de empates */}
      <TieIndicator tieData={tieAnalysis} />

      {/* Alertas específicos */}
      {metadata.requiresDirectorDecision && (
        <Alert className='border-orange-200 bg-orange-50'>
          <AlertTriangle className='h-4 w-4 text-orange-600' />
          <AlertDescription className='text-orange-700'>
            <div className='font-medium mb-1'>
              Decisão do diretor necessária
            </div>
            <div className='text-sm'>
              Este período possui empates que requerem resolução manual antes da
              oficialização.
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Ranking detalhado */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Trophy className='h-5 w-5' />
            Ranking Final
          </CardTitle>
          <CardDescription>
            Classificação dos setores por pontuação total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className='w-16'>Posição</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead className='text-right'>Pontuação</TableHead>
                <TableHead className='text-center'>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((sector, index) => {
                const isWinner = index === 0;
                const isTied = tieAnalysis.tiedGroups.some((group) =>
                  group.sectors.some(
                    (s) => s.SETOR === sector.SETOR || s.nome === sector.nome
                  )
                );
                const isWinnerTied = tieAnalysis.winnerTieGroup?.sectors.some(
                  (s) => s.SETOR === sector.SETOR || s.nome === sector.nome
                );

                return (
                  <TableRow
                    key={sector.SETOR || sector.nome || index}
                    className={isWinner ? 'bg-yellow-50' : ''}
                  >
                    <TableCell>
                      <div className='flex items-center gap-2'>
                        <Badge
                          variant={isWinner ? 'default' : 'outline'}
                          className={
                            isWinner
                              ? 'bg-yellow-500 text-white'
                              : 'text-muted-foreground'
                          }
                        >
                          {sector.RANK || sector.rank || index + 1}º
                        </Badge>
                        {isWinner && (
                          <Trophy className='h-4 w-4 text-yellow-600' />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className='font-medium'>
                      {sector.SETOR || sector.nome}
                    </TableCell>
                    <TableCell className='text-right font-mono'>
                      {(sector.PONTUACAO || sector.pontuacao || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className='text-center'>
                      {isWinnerTied ? (
                        <Badge variant='destructive' className='text-xs'>
                          Empate 1º
                        </Badge>
                      ) : isTied ? (
                        <Badge variant='outline' className='text-xs'>
                          Empate
                        </Badge>
                      ) : isWinner ? (
                        <Badge
                          variant='default'
                          className='text-xs bg-green-600'
                        >
                          Vencedor
                        </Badge>
                      ) : (
                        <span className='text-muted-foreground text-xs'>—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Análise detalhada de empates */}
      {tieAnalysis.hasGlobalTies && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <AlertTriangle className='h-5 w-5 text-orange-600' />
              Análise de Empates
            </CardTitle>
            <CardDescription>
              Detalhamento dos empates detectados no ranking
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* Empate na primeira posição */}
            {tieAnalysis.winnerTieGroup && (
              <div className='border border-red-200 rounded-lg p-4 bg-red-50'>
                <h4 className='font-semibold text-red-800 mb-2'>
                  Empate na Primeira Posição
                </h4>
                <p className='text-sm text-red-700 mb-3'>
                  Os seguintes setores estão empatados com{' '}
                  <span className='font-bold'>
                    {tieAnalysis.winnerTieGroup.pontuacao.toFixed(2)} pontos
                  </span>
                  :
                </p>
                <div className='flex flex-wrap gap-2'>
                  {tieAnalysis.winnerTieGroup.sectors.map((sector) => (
                    <Badge
                      key={sector.nome}
                      variant='destructive'
                      className='text-sm'
                    >
                      {sector.nome}
                    </Badge>
                  ))}
                </div>
                {isDirector && (
                  <div className='mt-3 pt-3 border-t border-red-200'>
                    <p className='text-xs text-red-600 font-medium'>
                      🎯 Como diretor, você deve oficializar este período e
                      escolher o vencedor manualmente.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Outros empates */}
            {tieAnalysis.tiedGroups.length > 0 && (
              <div className='space-y-3'>
                <h4 className='font-semibold text-orange-800'>
                  Outros Empates Detectados
                </h4>
                {tieAnalysis.tiedGroups.map((group, index) => (
                  <div
                    key={index}
                    className='border border-orange-200 rounded-lg p-3 bg-orange-50'
                  >
                    <p className='text-sm text-orange-700 mb-2'>
                      Empate com{' '}
                      <span className='font-bold'>
                        {group.pontuacao.toFixed(2)} pontos
                      </span>
                      :
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {group.sectors.map((sector) => (
                        <Badge
                          key={sector.nome}
                          variant='outline'
                          className='text-sm border-orange-300 text-orange-700'
                        >
                          {sector.nome}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metadata e informações técnicas */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Info className='h-5 w-5' />
            Informações Técnicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
            <div>
              <dt className='font-medium text-muted-foreground'>
                Total de setores
              </dt>
              <dd className='font-mono'>
                {ranking?.length || metadata?.totalSectors || 'N/A'}
              </dd>
            </div>
            <div>
              <dt className='font-medium text-muted-foreground'>
                Requer decisão manual
              </dt>
              <dd>
                <Badge
                  variant={
                    metadata?.requiresDirectorDecision
                      ? 'destructive'
                      : 'default'
                  }
                >
                  {metadata?.requiresDirectorDecision ? 'Sim' : 'Não'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className='font-medium text-muted-foreground'>
                Calculado em
              </dt>
              <dd className='font-mono'>
                {formatDate(
                  metadata?.generatedAt ||
                    metadata?.calculatedAt ||
                    new Date().toISOString()
                )}
              </dd>
            </div>
            <div>
              <dt className='font-medium text-muted-foreground'>Usuário</dt>
              <dd>{user?.nome || 'N/A'}</dd>
            </div>
            <div>
              <dt className='font-medium text-muted-foreground'>Período</dt>
              <dd className='font-mono'>{period.mesAno}</dd>
            </div>
            <div>
              <dt className='font-medium text-muted-foreground'>Status</dt>
              <dd>
                <PeriodStatusBadge status={period.status} size='sm' />
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
