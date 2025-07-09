'use client';

import { AdminPageHeader, StatsGrid } from '@/components/admin/AdminComponents';
import { useAuth } from '@/components/providers/AuthProvider';
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
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Settings,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import Link from 'next/link';

// ===== INTERFACES =====
interface CompetitionPeriod {
  id: number;
  mesAno: string;
  status: 'PLANEJAMENTO' | 'ATIVA' | 'PRE_FECHADA' | 'FECHADA';
  dataInicio: string;
  dataFim: string;
}

interface RankingEntry {
  RANK: number;
  SETOR: string;
  PONTUACAO: number;
}

interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  lockedUsers: number;
  byRole: {
    DIRETOR: number;
    GERENTE: number;
    VISUALIZADOR: number;
  };
  bySector: {
    [key: string]: number;
  };
  recentLogins: number;
  recentRegistrations: number;
}

interface ExpurgoSummary {
  total: number;
  pendentes: number;
  aprovados: number;
  rejeitados: number;
}

interface ExpurgoItem {
  id: number;
  status: 'PENDENTE' | 'APROVADO' | 'REJEITADO';
  periodo: string;
  // outros campos...
}

// ===== FUNÇÕES DE FETCH =====
const fetchCurrentPeriod = async (): Promise<CompetitionPeriod | null> => {
  try {
    const res = await fetch('/api/periods');
    if (!res.ok) return null;
    const periods = await res.json();
    return periods.find((p: CompetitionPeriod) => p.status === 'ATIVA') || null;
  } catch {
    return null;
  }
};

const fetchCurrentRanking = async (
  activePeriod: string | null
): Promise<RankingEntry[]> => {
  if (!activePeriod) return [];
  try {
    const res = await fetch(`/api/ranking?period=${activePeriod}`);
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
};

const fetchUserStatistics = async (): Promise<UserStatistics | null> => {
  try {
    const res = await fetch('/api/admin/users/statistics');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
};

const fetchExpurgoSummary = async (
  activePeriod: string | null
): Promise<ExpurgoSummary> => {
  if (!activePeriod) {
    return { total: 0, pendentes: 0, aprovados: 0, rejeitados: 0 };
  }

  try {
    // Busca expurgos apenas do período ativo
    const res = await fetch(`/api/expurgos?period=${activePeriod}`);
    if (!res.ok) {
      return { total: 0, pendentes: 0, aprovados: 0, rejeitados: 0 };
    }

    const expurgos: ExpurgoItem[] = await res.json();

    // Filtra apenas expurgos do período ativo e conta por status
    const activePeriodExpurgos = expurgos.filter(
      (exp) => exp.periodo === activePeriod
    );

    const summary = {
      total: activePeriodExpurgos.length,
      pendentes: activePeriodExpurgos.filter((exp) => exp.status === 'PENDENTE')
        .length,
      aprovados: activePeriodExpurgos.filter((exp) => exp.status === 'APROVADO')
        .length,
      rejeitados: activePeriodExpurgos.filter(
        (exp) => exp.status === 'REJEITADO'
      ).length,
    };

    return summary;
  } catch (error) {
    console.error('Erro ao buscar expurgos:', error);
    return { total: 0, pendentes: 0, aprovados: 0, rejeitados: 0 };
  }
};

// ===== COMPONENTE PRINCIPAL =====
export default function AdminDashboard() {
  const { user } = useAuth();

  // Queries - TODAS DEPENDEM DO PERÍODO ATIVO
  const { data: currentPeriod, isLoading: loadingPeriod } = useQuery({
    queryKey: ['currentPeriod'],
    queryFn: fetchCurrentPeriod,
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  const { data: ranking, isLoading: loadingRanking } = useQuery({
    queryKey: ['currentRanking', currentPeriod?.mesAno],
    queryFn: () => fetchCurrentRanking(currentPeriod?.mesAno || null),
    enabled: !!currentPeriod?.mesAno, // Só executa se tiver período ativo
    refetchInterval: 60000, // Atualiza a cada 1min
  });

  const { data: userStats, isLoading: loadingUserStats } = useQuery({
    queryKey: ['userStatistics'],
    queryFn: fetchUserStatistics,
    refetchInterval: 300000, // Atualiza a cada 5min
  });

  const { data: expurgoSummary, isLoading: loadingExpurgos } = useQuery({
    queryKey: ['expurgoSummary', currentPeriod?.mesAno],
    queryFn: () => fetchExpurgoSummary(currentPeriod?.mesAno || null),
    enabled: !!currentPeriod?.mesAno, // Só executa se tiver período ativo
    refetchInterval: 60000, // Atualiza a cada 1min
  });

  // ===== UTILITÁRIOS =====
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'ATIVA':
        return 'success';
      case 'FECHADA':
        return 'secondary';
      case 'PRE_FECHADA':
        return 'warning';
      case 'PLANEJAMENTO':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ATIVA':
        return 'Período Ativo';
      case 'FECHADA':
        return 'Período Fechado';
      case 'PRE_FECHADA':
        return 'Pré-Fechamento';
      case 'PLANEJAMENTO':
        return 'Planejamento';
      default:
        return status;
    }
  };

  const getDaysUntilEnd = (dataFim: string) => {
    const endDate = new Date(dataFim);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // ===== CARDS DE MÉTRICAS =====
  const statsData = [
    // Card 1: Período Atual
    {
      id: 'current-period',
      title: 'Período Atual',
      value: currentPeriod ? currentPeriod.mesAno : 'N/A',
      description: currentPeriod
        ? getStatusLabel(currentPeriod.status)
        : 'Nenhum período ativo',
      icon: Calendar,
      variant: currentPeriod
        ? getStatusVariant(currentPeriod.status)
        : 'secondary',
      trend:
        currentPeriod && currentPeriod.status === 'ATIVA'
          ? {
              value: getDaysUntilEnd(currentPeriod.dataFim),
              type: 'neutral' as const,
              period: 'dias restantes',
            }
          : undefined,
      isLoading: loadingPeriod,
    },

    // Card 2: Líder Atual
    {
      id: 'current-leader',
      title: 'Líder Atual',
      value: ranking && ranking.length > 0 ? ranking[0].SETOR : 'N/A',
      description:
        ranking && ranking.length > 0
          ? `${ranking[0].PONTUACAO.toFixed(2)} pontos`
          : 'Quando a próxima premiação iniciar, você verá aqui.',
      icon: Trophy,
      variant: 'primary' as const,
      trend:
        ranking && ranking.length > 1
          ? {
              value: Math.abs(ranking[0].PONTUACAO - ranking[1].PONTUACAO),
              type: 'up' as const,
              period: 'pts de vantagem',
            }
          : undefined,
      isLoading: loadingRanking,
    },

    // Card 3: Expurgos Pendentes
    {
      id: 'pending-expurgos',
      title: 'Expurgos Pendentes',
      value: expurgoSummary?.pendentes || 0,
      description: `${expurgoSummary?.total || 0} total no sistema`,
      icon: AlertTriangle,
      variant: (expurgoSummary?.pendentes || 0) > 0 ? 'warning' : 'success',
      isLoading: loadingExpurgos,
    },

    // Card 4: Usuários Ativos
    {
      id: 'active-users',
      title: 'Usuários Ativos',
      value: userStats?.activeUsers || 0,
      description: `${userStats?.totalUsers || 0} usuários cadastrados`,
      icon: Users,
      variant: 'success' as const,
      trend: userStats?.recentLogins
        ? {
            value: userStats.recentLogins,
            type: 'up' as const,
            period: 'logins recentes',
          }
        : undefined,
      isLoading: loadingUserStats,
    },
  ];

  return (
    <div className='space-y-8'>
      {/* Header */}
      <AdminPageHeader
        title={`Bem-vindo, ${user?.nome || 'Administrador'}`}
        description='Painel executivo do Sistema de Premiação por Desempenho'
        actions={
          <Link href={'/'} about='true'>
            Tela de competição 🏆
          </Link>
        }
      />

      {/* Métricas Principais */}
      <section>
        <h2 className='text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2'>
          <BarChart3 className='h-5 w-5 text-amber-600' />
          Métricas Principais
        </h2>
        <StatsGrid stats={statsData} columns={4} />
      </section>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Ranking Atual */}
        <Card>
          <CardHeader className='pb-3'>
            <div className='flex items-center justify-between'>
              <div>
                <CardTitle className='flex items-center gap-2'>
                  <Award className='h-5 w-5 text-amber-600' />
                  Ranking Atual
                </CardTitle>
                <CardDescription>
                  Classificação geral das filiais no período
                </CardDescription>
              </div>
              <Link href='/admin/vigencias'>
                <Button variant='ghost' size='sm'>
                  <Eye className='h-4 w-4 mr-2' />
                  Ver Detalhes
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRanking ? (
              <div className='space-y-3'>
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className='h-12 w-full' />
                ))}
              </div>
            ) : ranking && ranking.length > 0 ? (
              <div className='space-y-3'>
                {ranking.slice(0, 4).map((entry, index) => (
                  <div
                    key={entry.SETOR}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      index === 0
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className='flex items-center gap-3'>
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                          index === 0
                            ? 'bg-amber-500 text-white'
                            : index === 1
                              ? 'bg-slate-400 text-white'
                              : index === 2
                                ? 'bg-orange-400 text-white'
                                : 'bg-slate-300 text-slate-600'
                        }`}
                      >
                        {entry.RANK}°
                      </div>
                      <span className='font-medium text-slate-900'>
                        {entry.SETOR}
                      </span>
                      {index === 0 && (
                        <Trophy className='h-4 w-4 text-amber-500' />
                      )}
                    </div>
                    <Badge variant='outline' className='font-mono'>
                      {entry.PONTUACAO.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-8 text-slate-500'>
                <BarChart3 className='h-12 w-12 mx-auto mb-3 text-slate-300' />
                <p>Nenhum ranking disponível</p>
                <p className='text-sm'>Execute o cálculo do período</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='flex items-center gap-2'>
              <Activity className='h-5 w-5 text-amber-600' />
              Ações Rápidas
            </CardTitle>
            <CardDescription>
              Acesso direto às funcionalidades principais
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='grid grid-cols-1 gap-3'>
              <Link href='/admin/parameters' className='block'>
                <Button variant='outline' className='w-full justify-start'>
                  <Target className='h-4 w-4 mr-3' />
                  Gerenciar Metas
                </Button>
              </Link>

              <Link href='/admin/expurgos' className='block'>
                <Button variant='outline' className='w-full justify-start'>
                  <AlertTriangle className='h-4 w-4 mr-3' />
                  Gestão de Expurgos
                  {currentPeriod?.status === 'ATIVA' &&
                    (expurgoSummary?.pendentes || 0) > 0 && (
                      <Badge className='ml-auto bg-orange-500'>
                        {expurgoSummary?.pendentes}
                      </Badge>
                    )}
                </Button>
              </Link>

              <Link href='/admin/users' className='block'>
                <Button variant='outline' className='w-full justify-start'>
                  <Users className='h-4 w-4 mr-3' />
                  Gerenciar Usuários
                </Button>
              </Link>

              <Link href='/admin/vigencias' className='block'>
                <Button variant='outline' className='w-full justify-start'>
                  <Clock className='h-4 w-4 mr-3' />
                  Gestão de Vigências
                </Button>
              </Link>

              <Link href='/admin/audit-logs' className='block'>
                <Button variant='outline' className='w-full justify-start'>
                  <FileText className='h-4 w-4 mr-3' />
                  Logs de Auditoria
                </Button>
              </Link>
            </div>

            {/* Alertas Importantes - APENAS PARA PERÍODO ATIVO */}
            {currentPeriod?.status === 'ATIVA' &&
              (expurgoSummary?.pendentes || 0) > 0 && (
                <Alert className='mt-4'>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertDescription>
                    <strong>{expurgoSummary?.pendentes} expurgo(s)</strong>{' '}
                    pendente(s) no período{' '}
                    <strong>{currentPeriod.mesAno}</strong>.
                    <Link href='/admin/expurgos' className='ml-1 underline'>
                      Revisar agora
                    </Link>
                  </AlertDescription>
                </Alert>
              )}

            {currentPeriod?.status === 'PLANEJAMENTO' && (
              <Alert>
                <Clock className='h-4 w-4' />
                <AlertDescription>
                  Período <strong>{currentPeriod.mesAno}</strong> em
                  planejamento.
                  <Link href='/admin/vigencias' className='ml-1 underline'>
                    Iniciar período
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            {!currentPeriod && (
              <Alert variant='destructive'>
                <AlertTriangle className='h-4 w-4' />
                <AlertDescription>
                  <strong>Nenhum período ativo encontrado.</strong> Configure um
                  período para visualizar os dados.
                  <Link href='/admin/vigencias' className='ml-1 underline'>
                    Gerenciar vigências
                  </Link>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status Operacional */}
      <section>
        <h2 className='text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2'>
          <Settings className='h-5 w-5 text-amber-600' />
          Status Operacional
        </h2>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {/* ETL Status */}
          <Card>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-slate-600'>
                    Última Atualização ETL
                  </p>
                  <p className='text-lg font-semibold text-slate-900'>
                    Hoje, 02:30
                  </p>
                </div>
                <CheckCircle className='h-8 w-8 text-green-500' />
              </div>
            </CardContent>
          </Card>

          {/* Metas Configuradas */}
          <Card>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-slate-600'>
                    Metas Configuradas
                  </p>
                  <p className='text-lg font-semibold text-slate-900'>
                    52 / 52
                  </p>
                </div>
                <Target className='h-8 w-8 text-blue-500' />
              </div>
            </CardContent>
          </Card>

          {/* Sistema Online */}
          <Card>
            <CardContent className='p-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-slate-600'>Sistema</p>
                  <p className='text-lg font-semibold text-green-700'>Online</p>
                </div>
                <div className='w-3 h-3 bg-green-500 rounded-full animate-pulse'></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
