// apps/web/src/app/admin/users/components/UserStatisticsCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { UserStatistics } from '@sistema-premiacao/shared-types';
import {
  Building2,
  Clock,
  Eye,
  Shield,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';

interface UserStatisticsCardsProps {
  statistics?: UserStatistics;
  isLoading: boolean;
  error?: Error | null;
}

export function UserStatisticsCards({
  statistics,
  isLoading,
  error,
}: UserStatisticsCardsProps) {
  if (error) {
    return (
      <Card className='border-red-200 bg-red-50'>
        <CardContent className='pt-6'>
          <div className='flex items-center gap-2 text-red-800'>
            <UserX className='h-5 w-5' />
            <span>Erro ao carregar estatísticas: {error.message}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !statistics) {
    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <Skeleton className='h-4 w-24' />
              <Skeleton className='h-4 w-4' />
            </CardHeader>
            <CardContent>
              <Skeleton className='h-8 w-16 mb-1' />
              <Skeleton className='h-3 w-32' />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const mainCards = [
    {
      title: 'Total de Usuários',
      value: statistics.totalUsers,
      description: 'Usuários cadastrados',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Usuários Ativos',
      value: statistics.activeUsers,
      description: 'Contas habilitadas',
      icon: UserCheck,
      color: 'text-green-600',
    },
    {
      title: 'Usuários Inativos',
      value: statistics.inactiveUsers,
      description: 'Contas desabilitadas',
      icon: UserX,
      color: 'text-gray-600',
    },
    {
      title: 'Contas Bloqueadas',
      value: statistics.lockedUsers,
      description: 'Por tentativas de login',
      icon: Shield,
      color: statistics.lockedUsers > 0 ? 'text-red-600' : 'text-gray-600',
    },
  ];

  const roleCards = [
    {
      title: 'Diretores',
      value: statistics.byRole.DIRETOR || 0,
      description: 'Acesso total',
      icon: UserCog,
      color: 'text-purple-600',
    },
    {
      title: 'Gerentes',
      value: statistics.byRole.GERENTE || 0,
      description: 'Acesso operacional',
      icon: Building2,
      color: 'text-blue-600',
    },
    {
      title: 'Visualizadores',
      value: statistics.byRole.VISUALIZADOR || 0,
      description: 'Apenas leitura',
      icon: Eye,
      color: 'text-gray-600',
    },
  ];

  const activityCards = [
    {
      title: 'Logins Recentes',
      value: statistics.recentLogins,
      description: 'Últimas 24 horas',
      icon: Clock,
      color: 'text-green-600',
    },
    {
      title: 'Registros Recentes',
      value: statistics.recentRegistrations,
      description: 'Últimos 7 dias',
      icon: UserPlus,
      color: 'text-blue-600',
    },
  ];

  return (
    <div className='space-y-4'>
      {/* Cards principais */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        {mainCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-gray-600'>
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{card.value}</div>
                <p className='text-xs text-gray-600'>{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cards de roles e atividade */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4'>
        {roleCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-gray-600'>
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{card.value}</div>
                <p className='text-xs text-gray-600'>{card.description}</p>
              </CardContent>
            </Card>
          );
        })}

        {activityCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium text-gray-600'>
                  {card.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{card.value}</div>
                <p className='text-xs text-gray-600'>{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Distribuição por setor */}
      {Object.keys(statistics.bySector).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Distribuição por Setor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
              {Object.entries(statistics.bySector).map(
                ([sectorName, count]) => (
                  <div key={sectorName} className='text-center'>
                    <div className='text-lg font-semibold text-gray-900'>
                      {count}
                    </div>
                    <div className='text-sm text-gray-600'>{sectorName}</div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
