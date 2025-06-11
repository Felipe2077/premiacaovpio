// // apps/web/src/app/admin/page.tsx (CORRIGIDO com TooltipProvider)
// 'use client';

// import { Alert } from '@/components/ui/alert';
// import { Button } from '@/components/ui/button';
// import {
//   Card,
//   CardContent,
//   CardFooter,
//   CardHeader,
//   CardTitle,
// } from '@/components/ui/card';
// import { Skeleton } from '@/components/ui/skeleton';
// import { TooltipProvider } from '@/components/ui/tooltip'; // Importar o Provider aqui também
// import { useQuery } from '@tanstack/react-query';
// import {
//   ArrowRight,
//   CalendarClock,
//   History,
//   ShieldAlert,
//   User,
//   Wrench,
// } from 'lucide-react'; // Importar CalendarClock
// import Link from 'next/link';
// // Tipos das entidades
// import type { AuditLogEntity } from '@/entity/audit-log.entity';
// import type { ExpurgoEventEntity } from '@/entity/expurgo-event.entity';
// import type { ParameterValueEntity } from '@/entity/parameter-value.entity';

// // --- Funções de Fetch ---
// // ... (fetchCurrentParameters, fetchAuditLogs, fetchExpurgos - como definidas antes) ...
// // --- Funções de Fetch (simplificadas para esta página) ---
// // Idealmente, teríamos endpoints de contagem na API, mas para o MVP buscamos tudo e contamos no front
// const fetchCurrentParameters = async (): Promise<ParameterValueEntity[]> => {
//   const res = await fetch('http://localhost:3001/api/parameters/current');
//   if (!res.ok) throw new Error('Falha ao buscar parâmetros');
//   return res.json();
// };
// const fetchAuditLogs = async (): Promise<AuditLogEntity[]> => {
//   const res = await fetch('http://localhost:3001/api/audit-logs'); // Pega últimos 50 por padrão
//   if (!res.ok) throw new Error('Falha ao buscar logs');
//   return res.json();
// };
// const fetchExpurgos = async (): Promise<ExpurgoEventEntity[]> => {
//   const res = await fetch('http://localhost:3001/api/expurgos');
//   if (!res.ok) throw new Error('Falha ao buscar expurgos');
//   return res.json();
// };

// // --- Componente da Página ---
// export default function AdminOverviewPage() {
//   // Usuário Mockado
//   const mockUser = { nome: 'Admin Sistema', role: 'Diretor' };

//   // Queries para buscar dados
//   const {
//     data: parameters,
//     isLoading: isLoadingParams,
//     error: errorParams,
//   } = useQuery<ParameterValueEntity[]>({
//     queryKey: ['currentParameters'],
//     queryFn: fetchCurrentParameters,
//   });
//   const {
//     data: auditLogs,
//     isLoading: isLoadingLogs,
//     error: errorLogs,
//   } = useQuery<AuditLogEntity[]>({
//     queryKey: ['auditLogs'],
//     queryFn: fetchAuditLogs,
//   });
//   const {
//     data: expurgos,
//     isLoading: isLoadingExpurgos,
//     error: errorExpurgos,
//   } = useQuery<ExpurgoEventEntity[]>({
//     queryKey: ['expurgos'],
//     queryFn: fetchExpurgos,
//   });

//   // Calcula stats
//   const today = new Date();
//   const todayStr = today.toISOString().split('T')[0];
//   const numParametrosVigentes =
//     parameters?.filter(
//       (p) =>
//         !p.dataFimEfetivo || new Date(p.dataFimEfetivo) >= new Date(todayStr)
//     ).length ?? 0;
//   const numLogsRecentes = auditLogs?.length ?? 0;
//   const numExpurgosRegistrados = expurgos?.length ?? 0;

//   // **NOVO: Cálculo Dias Restantes**
//   const fimDoMes = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Pega o último dia do mês atual
//   const diffTime = fimDoMes.getTime() - today.getTime();
//   const diasRestantes = Math.max(
//     0,
//     Math.ceil(diffTime / (1000 * 60 * 60 * 24))
//   ); // Arredonda para cima e garante >= 0

//   // Estado geral de loading e erro
//   const isLoading = isLoadingParams || isLoadingLogs || isLoadingExpurgos;
//   const error = errorParams || errorLogs || errorExpurgos;

//   return (
//     // --- CORREÇÃO: TooltipProvider envolvendo tudo ---
//     <TooltipProvider>
//       <div className='space-y-6'>
//         {/* Saudação ao Usuário */}
//         <div className='flex items-center gap-2 text-lg font-medium text-muted-foreground'>
//           <User className='h-5 w-5' />
//           <span>
//             Bem-vindo(a), {mockUser.nome} ({mockUser.role})!
//           </span>
//         </div>

//         <h1 className='text-2xl font-bold'>Visão Geral - Admin</h1>
//         <p className='text-sm text-muted-foreground'>
//           Resumo rápido do estado atual do sistema de premiação.
//         </p>

//         {/* Exibição de Erro Geral */}
//         {error && !isLoading && (
//           <Alert variant='destructive' className='mb-4'>
//             {/* ... Alert JSX ... */}
//           </Alert>
//         )}

//         {/* Grid para os Cards de Stats */}
//         {/* Ajustado para 4 colunas em telas maiores */}
//         <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6'>
//           {/* Card Parâmetros */}
//           <Card>
//             <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
//               <CardTitle>Parâmetros Vigentes</CardTitle>
//               <Wrench className='h-4 w-4 text-muted-foreground' />
//             </CardHeader>
//             <CardContent>
//               {isLoadingParams ? (
//                 <Skeleton className='h-8 w-1/3' />
//               ) : (
//                 <div className='text-2xl font-bold'>
//                   {numParametrosVigentes}
//                 </div>
//               )}
//               <p className='text-xs text-muted-foreground'>
//                 Regras e metas ativas.
//               </p>
//             </CardContent>
//             <CardFooter>
//               <Link href='/admin/parameters'>
//                 <Button
//                   variant='outline'
//                   size='sm'
//                   className='w-full cursor-pointer'
//                 >
//                   Gerenciar <ArrowRight className='ml-auto h-4 w-4' />
//                 </Button>
//               </Link>
//             </CardFooter>
//           </Card>
//           {/* Card Logs / Eventos */}
//           <Card>
//             <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
//               <CardTitle>Eventos Recentes</CardTitle>
//               <History className='h-4 w-4 text-muted-foreground' />
//             </CardHeader>
//             <CardContent>
//               {isLoadingLogs ? (
//                 <Skeleton className='h-8 w-1/3' />
//               ) : (
//                 <div className='text-2xl font-bold'>{numLogsRecentes}</div>
//               )}
//               <p className='text-xs text-muted-foreground'>
//                 Últimos logs de auditoria.
//               </p>
//             </CardContent>
//             <CardFooter>
//               <Link href='/admin/audit-logs'>
//                 <Button
//                   variant='outline'
//                   size='sm'
//                   className='w-full cursor-pointer'
//                 >
//                   Ver Eventos <ArrowRight className='ml-auto h-4 w-4' />
//                 </Button>
//               </Link>
//             </CardFooter>
//           </Card>
//           {/* Card Expurgos */}
//           <Card>
//             <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
//               <CardTitle>Expurgos Registrados</CardTitle>
//               <ShieldAlert className='h-4 w-4 text-muted-foreground' />
//             </CardHeader>
//             <CardContent>
//               {isLoadingExpurgos ? (
//                 <Skeleton className='h-8 w-1/3' />
//               ) : (
//                 <div className='text-2xl font-bold'>
//                   {numExpurgosRegistrados}
//                 </div>
//               )}
//               <p className='text-xs text-muted-foreground'>
//                 Eventos excepcionais tratados.
//               </p>
//             </CardContent>
//             <CardFooter>
//               <Link href='/admin/expurgos'>
//                 <Button
//                   variant='outline'
//                   size='sm'
//                   className='w-full cursor-pointer'
//                 >
//                   Gerenciar Expurgos <ArrowRight className='ml-auto h-4 w-4' />
//                 </Button>
//               </Link>
//             </CardFooter>
//           </Card>
//           {/* **NOVO:** Card Dias Restantes */}
//           <Card>
//             <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
//               <CardTitle className='text-sm font-medium'>
//                 Fim do Período
//               </CardTitle>
//               <CalendarClock className='h-4 w-4 text-muted-foreground' />
//             </CardHeader>
//             <CardContent>
//               <div className='text-2xl font-bold'>
//                 {diasRestantes}
//                 {diasRestantes === 1 ? 'dia restante' : 'dias restantes'}
//               </div>
//               <p className='text-xs text-muted-foreground'>
//                 Para o fim do mês atual ({fimDoMes.toLocaleDateString('pt-BR')}
//                 ).
//               </p>
//             </CardContent>
//             {/* Sem footer neste card talvez */}
//           </Card>
//         </div>
//       </div>
//     </TooltipProvider>
//     // --- FIM DA CORREÇÃO TooltipProvider ---
//   );
// }
// apps/web/src/app/admin/page.tsx
'use client';

import { useComponentAccess } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/providers/AuthProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Settings,
  Shield,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const { user } = useAuth();
  const {
    canManageUsers,
    canManageParameters,
    canApproveExpurgos,
    isDirector,
    canViewReports,
  } = useComponentAccess();

  // Simular dados do dashboard (em produção, viria de APIs)
  const dashboardStats = {
    totalUsers: 25,
    activeUsers: 23,
    pendingExpurgos: 3,
    activePeriods: 1,
    lastLogin: new Date().toLocaleString('pt-BR'),
    systemHealth: 'excellent' as 'excellent' | 'good' | 'warning' | 'critical',
  };

  const quickActions = [
    {
      title: 'Gerenciar Metas',
      description: 'Definir e ajustar metas dos critérios',
      href: '/admin/parameters',
      icon: FileText,
      show: canManageParameters(),
      color: 'bg-blue-500',
    },
    {
      title: 'Expurgos Pendentes',
      description: `${dashboardStats.pendingExpurgos} solicitações aguardando`,
      href: '/admin/expurgos',
      icon: AlertTriangle,
      show: canApproveExpurgos(),
      color: 'bg-orange-500',
      badge:
        dashboardStats.pendingExpurgos > 0
          ? dashboardStats.pendingExpurgos
          : undefined,
    },
    {
      title: 'Gerenciar Usuários',
      description: `${dashboardStats.totalUsers} usuários no sistema`,
      href: '/admin/users',
      icon: Users,
      show: canManageUsers(),
      color: 'bg-green-500',
    },
    {
      title: 'Controlar Períodos',
      description: 'Iniciar, fechar e gerenciar períodos',
      href: '/admin/periods',
      icon: Calendar,
      show: isDirector(),
      color: 'bg-purple-500',
    },
    {
      title: 'Relatórios',
      description: 'Visualizar relatórios detalhados',
      href: '/admin/reports',
      icon: BarChart3,
      show: canViewReports(),
      color: 'bg-indigo-500',
    },
    {
      title: 'Auditoria',
      description: 'Logs de segurança e auditoria',
      href: '/admin/audit',
      icon: Shield,
      show: isDirector(),
      color: 'bg-red-500',
    },
  ];

  const visibleActions = quickActions.filter((action) => action.show);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent':
        return 'text-green-600 bg-green-100';
      case 'good':
        return 'text-blue-600 bg-blue-100';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100';
      case 'critical':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'excellent':
        return CheckCircle;
      case 'good':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return XCircle;
      default:
        return Activity;
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='md:flex md:items-center md:justify-between'>
        <div className='flex-1 min-w-0'>
          <h2 className='text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate'>
            Painel Administrativo
          </h2>
          <div className='mt-1 flex flex-col sm:flex-row sm:flex-wrap sm:mt-0 sm:space-x-6'>
            <div className='mt-2 flex items-center text-sm text-gray-500'>
              <Users className='flex-shrink-0 mr-1.5 h-4 w-4' />
              Bem-vindo, {user?.nome}
            </div>
            <div className='mt-2 flex items-center text-sm text-gray-500'>
              <Badge variant='secondary'>{user?.roles?.join(', ')}</Badge>
            </div>
          </div>
        </div>
        <div className='mt-4 flex md:mt-0 md:ml-4'>
          <Button asChild>
            <Link href='/admin/settings'>
              <Settings className='mr-2 h-4 w-4' />
              Configurações
            </Link>
          </Button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className='grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4'>
        {/* Usuários Ativos */}
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <Users className='h-6 w-6 text-blue-600' />
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>
                    Usuários Ativos
                  </dt>
                  <dd className='text-lg font-medium text-gray-900'>
                    {dashboardStats.activeUsers}/{dashboardStats.totalUsers}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expurgos Pendentes */}
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <AlertTriangle className='h-6 w-6 text-orange-600' />
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>
                    Expurgos Pendentes
                  </dt>
                  <dd className='text-lg font-medium text-gray-900'>
                    {dashboardStats.pendingExpurgos}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Períodos Ativos */}
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                <Calendar className='h-6 w-6 text-green-600' />
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>
                    Períodos Ativos
                  </dt>
                  <dd className='text-lg font-medium text-gray-900'>
                    {dashboardStats.activePeriods}
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status do Sistema */}
        <Card>
          <CardContent className='p-6'>
            <div className='flex items-center'>
              <div className='flex-shrink-0'>
                {(() => {
                  const HealthIcon = getHealthIcon(dashboardStats.systemHealth);
                  return <HealthIcon className='h-6 w-6 text-green-600' />;
                })()}
              </div>
              <div className='ml-5 w-0 flex-1'>
                <dl>
                  <dt className='text-sm font-medium text-gray-500 truncate'>
                    Status do Sistema
                  </dt>
                  <dd className='text-lg font-medium text-gray-900'>
                    <Badge
                      className={getHealthColor(dashboardStats.systemHealth)}
                    >
                      Excelente
                    </Badge>
                  </dd>
                </dl>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <div>
        <h3 className='text-lg leading-6 font-medium text-gray-900 mb-4'>
          Ações Rápidas
        </h3>
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.href}
                className='hover:shadow-md transition-shadow'
              >
                <CardContent className='p-6'>
                  <Link href={action.href} className='block'>
                    <div className='flex items-start space-x-4'>
                      <div className={`${action.color} p-3 rounded-lg`}>
                        <Icon className='h-6 w-6 text-white' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center justify-between'>
                          <h4 className='text-sm font-medium text-gray-900'>
                            {action.title}
                          </h4>
                          {action.badge && (
                            <Badge variant='destructive' className='ml-2'>
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        <p className='text-sm text-gray-500 mt-1'>
                          {action.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Atividades Recentes */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Atividades do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-medium text-gray-900'>
              Atividades Recentes
            </CardTitle>
            <CardDescription>
              Últimas ações realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flow-root'>
              <ul className='-mb-8'>
                <li>
                  <div className='relative pb-8'>
                    <span className='absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200' />
                    <div className='relative flex space-x-3'>
                      <div>
                        <span className='bg-green-500 h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white'>
                          <CheckCircle className='h-4 w-4 text-white' />
                        </span>
                      </div>
                      <div className='min-w-0 flex-1 pt-1.5 flex justify-between space-x-4'>
                        <div>
                          <p className='text-sm text-gray-500'>
                            Meta atualizada para{' '}
                            <span className='font-medium text-gray-900'>
                              Critério KM
                            </span>
                          </p>
                        </div>
                        <div className='text-right text-sm whitespace-nowrap text-gray-500'>
                          <time>2h atrás</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className='relative pb-8'>
                    <span className='absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200' />
                    <div className='relative flex space-x-3'>
                      <div>
                        <span className='bg-blue-500 h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white'>
                          <Users className='h-4 w-4 text-white' />
                        </span>
                      </div>
                      <div className='min-w-0 flex-1 pt-1.5 flex justify-between space-x-4'>
                        <div>
                          <p className='text-sm text-gray-500'>
                            Novo usuário{' '}
                            <span className='font-medium text-gray-900'>
                              João Silva
                            </span>{' '}
                            criado
                          </p>
                        </div>
                        <div className='text-right text-sm whitespace-nowrap text-gray-500'>
                          <time>5h atrás</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className='relative'>
                    <div className='relative flex space-x-3'>
                      <div>
                        <span className='bg-orange-500 h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white'>
                          <AlertTriangle className='h-4 w-4 text-white' />
                        </span>
                      </div>
                      <div className='min-w-0 flex-1 pt-1.5 flex justify-between space-x-4'>
                        <div>
                          <p className='text-sm text-gray-500'>
                            Expurgo solicitado para{' '}
                            <span className='font-medium text-gray-900'>
                              Filial Centro
                            </span>
                          </p>
                        </div>
                        <div className='text-right text-sm whitespace-nowrap text-gray-500'>
                          <time>1d atrás</time>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
            <div className='mt-6'>
              <Button variant='outline' size='sm' asChild>
                <Link href='/admin/audit'>Ver todos os logs</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-medium text-gray-900'>
              Status do Sistema
            </CardTitle>
            <CardDescription>
              Informações sobre a saúde e performance do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              {/* API Status */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  <div className='bg-green-100 p-2 rounded-full'>
                    <Activity className='h-4 w-4 text-green-600' />
                  </div>
                  <span className='text-sm font-medium text-gray-900'>API</span>
                </div>
                <Badge className='bg-green-100 text-green-800'>Online</Badge>
              </div>

              {/* Database Status */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  <div className='bg-green-100 p-2 rounded-full'>
                    <Activity className='h-4 w-4 text-green-600' />
                  </div>
                  <span className='text-sm font-medium text-gray-900'>
                    Banco de Dados
                  </span>
                </div>
                <Badge className='bg-green-100 text-green-800'>Conectado</Badge>
              </div>

              {/* ETL Status */}
              <div className='flex items-center justify-between'>
                <div className='flex items-center space-x-3'>
                  <div className='bg-blue-100 p-2 rounded-full'>
                    <TrendingUp className='h-4 w-4 text-blue-600' />
                  </div>
                  <span className='text-sm font-medium text-gray-900'>ETL</span>
                </div>
                <Badge className='bg-blue-100 text-blue-800'>Executando</Badge>
              </div>

              {/* Última atualização */}
              <div className='pt-4 border-t border-gray-200'>
                <div className='flex items-center justify-between text-sm'>
                  <span className='text-gray-500'>Última atualização:</span>
                  <div className='flex items-center text-gray-900'>
                    <Clock className='h-4 w-4 mr-1' />
                    {dashboardStats.lastLogin}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Links úteis */}
      <Card>
        <CardHeader>
          <CardTitle className='text-lg font-medium text-gray-900'>
            Links Úteis
          </CardTitle>
          <CardDescription>
            Acesso rápido a funcionalidades importantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            <Button variant='outline' size='sm' asChild>
              <Link href='/'>
                <BarChart3 className='mr-2 h-4 w-4' />
                Ver Ranking Público
              </Link>
            </Button>
            <Button variant='outline' size='sm' asChild>
              <Link href='/admin/reports'>
                <FileText className='mr-2 h-4 w-4' />
                Gerar Relatório
              </Link>
            </Button>
            <Button variant='outline' size='sm' asChild>
              <Link href='/admin/backup'>
                <Shield className='mr-2 h-4 w-4' />
                Backup do Sistema
              </Link>
            </Button>
            <Button variant='outline' size='sm' asChild>
              <Link href='/help'>
                <Settings className='mr-2 h-4 w-4' />
                Ajuda e Suporte
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
