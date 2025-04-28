// apps/web/src/app/admin/page.tsx (CORRIGIDO com TooltipProvider)
'use client';

import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip'; // Importar o Provider aqui também
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarClock,
  History,
  ShieldAlert,
  User,
  Wrench,
} from 'lucide-react'; // Importar CalendarClock
import Link from 'next/link';
// Tipos das entidades
import type { AuditLogEntity } from '@/entity/audit-log.entity';
import type { ExpurgoEventEntity } from '@/entity/expurgo-event.entity';
import type { ParameterValueEntity } from '@/entity/parameter-value.entity';

// --- Funções de Fetch ---
// ... (fetchCurrentParameters, fetchAuditLogs, fetchExpurgos - como definidas antes) ...
// --- Funções de Fetch (simplificadas para esta página) ---
// Idealmente, teríamos endpoints de contagem na API, mas para o MVP buscamos tudo e contamos no front
const fetchCurrentParameters = async (): Promise<ParameterValueEntity[]> => {
  const res = await fetch('http://localhost:3001/api/parameters/current');
  if (!res.ok) throw new Error('Falha ao buscar parâmetros');
  return res.json();
};
const fetchAuditLogs = async (): Promise<AuditLogEntity[]> => {
  const res = await fetch('http://localhost:3001/api/audit-logs'); // Pega últimos 50 por padrão
  if (!res.ok) throw new Error('Falha ao buscar logs');
  return res.json();
};
const fetchExpurgos = async (): Promise<ExpurgoEventEntity[]> => {
  const res = await fetch('http://localhost:3001/api/expurgos');
  if (!res.ok) throw new Error('Falha ao buscar expurgos');
  return res.json();
};

// --- Componente da Página ---
export default function AdminOverviewPage() {
  // Usuário Mockado
  const mockUser = { nome: 'Admin Sistema', role: 'Diretor' };

  // Queries para buscar dados
  const {
    data: parameters,
    isLoading: isLoadingParams,
    error: errorParams,
  } = useQuery<ParameterValueEntity[]>({
    queryKey: ['currentParameters'],
    queryFn: fetchCurrentParameters,
  });
  const {
    data: auditLogs,
    isLoading: isLoadingLogs,
    error: errorLogs,
  } = useQuery<AuditLogEntity[]>({
    queryKey: ['auditLogs'],
    queryFn: fetchAuditLogs,
  });
  const {
    data: expurgos,
    isLoading: isLoadingExpurgos,
    error: errorExpurgos,
  } = useQuery<ExpurgoEventEntity[]>({
    queryKey: ['expurgos'],
    queryFn: fetchExpurgos,
  });

  // Calcula stats
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const numParametrosVigentes =
    parameters?.filter(
      (p) =>
        !p.dataFimEfetivo || new Date(p.dataFimEfetivo) >= new Date(todayStr)
    ).length ?? 0;
  const numLogsRecentes = auditLogs?.length ?? 0;
  const numExpurgosRegistrados = expurgos?.length ?? 0;

  // **NOVO: Cálculo Dias Restantes**
  const fimDoMes = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Pega o último dia do mês atual
  const diffTime = fimDoMes.getTime() - today.getTime();
  const diasRestantes = Math.max(
    0,
    Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  ); // Arredonda para cima e garante >= 0

  // Estado geral de loading e erro
  const isLoading = isLoadingParams || isLoadingLogs || isLoadingExpurgos;
  const error = errorParams || errorLogs || errorExpurgos;

  return (
    // --- CORREÇÃO: TooltipProvider envolvendo tudo ---
    <TooltipProvider>
      <div className='space-y-6'>
        {/* Saudação ao Usuário */}
        <div className='flex items-center gap-2 text-lg font-medium text-muted-foreground'>
          <User className='h-5 w-5' />
          <span>
            Bem-vindo(a), {mockUser.nome} ({mockUser.role})!
          </span>
        </div>

        <h1 className='text-2xl font-bold'>Visão Geral - Admin</h1>
        <p className='text-sm text-muted-foreground'>
          Resumo rápido do estado atual do sistema de premiação.
        </p>

        {/* Exibição de Erro Geral */}
        {error && !isLoading && (
          <Alert variant='destructive' className='mb-4'>
            {/* ... Alert JSX ... */}
          </Alert>
        )}

        {/* Grid para os Cards de Stats */}
        {/* Ajustado para 4 colunas em telas maiores */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6'>
          {/* Card Parâmetros */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle>Parâmetros Vigentes</CardTitle>
              <Wrench className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {isLoadingParams ? (
                <Skeleton className='h-8 w-1/3' />
              ) : (
                <div className='text-2xl font-bold'>
                  {numParametrosVigentes}
                </div>
              )}
              <p className='text-xs text-muted-foreground'>
                Regras e metas ativas.
              </p>
            </CardContent>
            <CardFooter>
              <Link href='/admin/parameters'>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-full cursor-pointer'
                >
                  Gerenciar <ArrowRight className='ml-auto h-4 w-4' />
                </Button>
              </Link>
            </CardFooter>
          </Card>
          {/* Card Logs / Eventos */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle>Eventos Recentes</CardTitle>
              <History className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <Skeleton className='h-8 w-1/3' />
              ) : (
                <div className='text-2xl font-bold'>{numLogsRecentes}</div>
              )}
              <p className='text-xs text-muted-foreground'>
                Últimos logs de auditoria.
              </p>
            </CardContent>
            <CardFooter>
              <Link href='/admin/audit-logs'>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-full cursor-pointer'
                >
                  Ver Eventos <ArrowRight className='ml-auto h-4 w-4' />
                </Button>
              </Link>
            </CardFooter>
          </Card>
          {/* Card Expurgos */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle>Expurgos Registrados</CardTitle>
              <ShieldAlert className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              {isLoadingExpurgos ? (
                <Skeleton className='h-8 w-1/3' />
              ) : (
                <div className='text-2xl font-bold'>
                  {numExpurgosRegistrados}
                </div>
              )}
              <p className='text-xs text-muted-foreground'>
                Eventos excepcionais tratados.
              </p>
            </CardContent>
            <CardFooter>
              <Link href='/admin/expurgos'>
                <Button
                  variant='outline'
                  size='sm'
                  className='w-full cursor-pointer'
                >
                  Gerenciar Expurgos <ArrowRight className='ml-auto h-4 w-4' />
                </Button>
              </Link>
            </CardFooter>
          </Card>
          {/* **NOVO:** Card Dias Restantes */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Fim do Período
              </CardTitle>
              <CalendarClock className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {diasRestantes}
                {diasRestantes === 1 ? 'dia restante' : 'dias restantes'}
              </div>
              <p className='text-xs text-muted-foreground'>
                Para o fim do mês atual ({fimDoMes.toLocaleDateString('pt-BR')}
                ).
              </p>
            </CardContent>
            {/* Sem footer neste card talvez */}
          </Card>
        </div>
      </div>
    </TooltipProvider>
    // --- FIM DA CORREÇÃO TooltipProvider ---
  );
}
