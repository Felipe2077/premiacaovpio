// apps/web/src/app/admin/audit-logs/page.tsx - VERSÃO MELHORADA
'use client';

import { AuditLogDetailsModal } from '@/components/audit-logs/AuditLogDetailsModal';
import { AuditLogTable } from '@/components/audit-logs/AuditLogTable';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AuditLogEntity } from '@/entity/audit-log.entity';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Download,
  Filter,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntity[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntity[]>([]);
  const [detailLog, setDetailLog] = useState<AuditLogEntity | null>(null);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [errorLogs, setErrorLogs] = useState<Error | null>(null);

  // Estados de filtro
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedActionType, setSelectedActionType] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('all');

  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  // Buscar logs de auditoria
  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    setErrorLogs(null);
    try {
      const response = await fetch('/api/audit-logs', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setAuditLogs(data || []);
      setTotalItems(data?.length || 0);
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      setErrorLogs(error as Error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // Estatísticas computadas
  const statistics = useMemo(() => {
    const total = auditLogs.length;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const todayCount = auditLogs.filter(
      (log) => new Date(log.timestamp).toDateString() === today.toDateString()
    ).length;

    const thisWeekCount = auditLogs.filter(
      (log) => new Date(log.timestamp) >= lastWeek
    ).length;

    const uniqueUsers = new Set(
      auditLogs.map((log) => log.user?.nome || log.userName || 'Sistema')
    ).size;

    const actionTypeCounts = auditLogs.reduce(
      (acc, log) => {
        acc[log.actionType] = (acc[log.actionType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const topAction = Object.entries(actionTypeCounts).sort(
      ([, a], [, b]) => b - a
    )[0];

    const criticalActions = auditLogs.filter((log) =>
      ['EXPURGO_REJEITADO', 'PARAMETRO_ALTERADO'].includes(log.actionType)
    ).length;

    return {
      total,
      todayCount,
      thisWeekCount,
      uniqueUsers,
      topAction: topAction ? { type: topAction[0], count: topAction[1] } : null,
      criticalActions,
      actionTypeCounts,
    };
  }, [auditLogs]);

  // Obter opções de filtro
  const filterOptions = useMemo(() => {
    const actionTypes = [
      ...new Set(auditLogs.map((log) => log.actionType)),
    ].sort();
    const users = [
      ...new Set(
        auditLogs.map((log) => log.user?.nome || log.userName || 'Sistema')
      ),
    ].sort();

    return { actionTypes, users };
  }, [auditLogs]);

  // Aplicar filtros E paginação
  useEffect(() => {
    let filtered = auditLogs;

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.actionType.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.user?.nome || log.userName || 'Sistema')
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          (log.justification || '')
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por tipo de ação
    if (selectedActionType !== 'all') {
      filtered = filtered.filter(
        (log) => log.actionType === selectedActionType
      );
    }

    // Filtro por usuário
    if (selectedUser !== 'all') {
      filtered = filtered.filter(
        (log) => (log.user?.nome || log.userName || 'Sistema') === selectedUser
      );
    }

    // Filtro por período
    if (selectedTimeRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();

      switch (selectedTimeRange) {
        case 'today':
          cutoffDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoffDate.setDate(cutoffDate.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(cutoffDate.getMonth() - 1);
          break;
      }

      filtered = filtered.filter(
        (log) => new Date(log.timestamp) >= cutoffDate
      );
    }

    // Atualizar total e resetar página se necessário
    const newTotal = filtered.length;
    setTotalItems(newTotal);

    const maxPage = Math.ceil(newTotal / itemsPerPage);
    if (currentPage > maxPage) {
      setCurrentPage(1);
    }

    // Aplicar paginação
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResults = filtered.slice(startIndex, endIndex);

    setFilteredLogs(paginatedResults);
  }, [
    auditLogs,
    searchTerm,
    selectedActionType,
    selectedUser,
    selectedTimeRange,
    currentPage,
    itemsPerPage,
  ]);

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedActionType('all');
    setSelectedUser('all');
    setSelectedTimeRange('all');
    setCurrentPage(1);
  };

  // Calcular informações de paginação
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Função para mudar página
  const handlePageChange = (page: number) => {
    console.log('Mudando para página:', page, 'Total pages:', totalPages);
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Função para mudar itens por página
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset para primeira página
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Auditoria do Sistema
          </h1>
          <p className='text-muted-foreground'>
            Monitore todas as ações e eventos do sistema em tempo real
          </p>
        </div>
        <div className='flex gap-2'>
          <Button
            variant='outline'
            onClick={fetchAuditLogs}
            disabled={isLoadingLogs}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoadingLogs ? 'animate-spin' : ''}`}
            />
            Atualizar
          </Button>
          <Button variant='outline' disabled>
            <Download className='h-4 w-4 mr-2' />
            Exportar
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total de Eventos
            </CardTitle>
            <Activity className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{statistics.total}</div>
            <p className='text-xs text-muted-foreground'>
              +{statistics.todayCount} hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Esta Semana</CardTitle>
            <TrendingUp className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{statistics.thisWeekCount}</div>
            <p className='text-xs text-muted-foreground'>Últimos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Usuários Ativos
            </CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{statistics.uniqueUsers}</div>
            <p className='text-xs text-muted-foreground'>Usuários únicos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Ações Críticas
            </CardTitle>
            <AlertTriangle className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-orange-600'>
              {statistics.criticalActions}
            </div>
            <p className='text-xs text-muted-foreground'>Requerem atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Erro */}
      {errorLogs && (
        <Alert variant='destructive'>
          <AlertTriangle className='h-4 w-4' />
          <AlertDescription>
            Erro ao carregar logs: {errorLogs.message || 'Erro desconhecido'}
          </AlertDescription>
        </Alert>
      )}

      {/* Ações mais frequentes */}
      {statistics.topAction && (
        <Card>
          <CardHeader>
            <CardTitle className='text-sm'>Ação Mais Frequente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-2'>
              <Badge variant='secondary'>{statistics.topAction.type}</Badge>
              <span className='text-sm text-muted-foreground'>
                {statistics.topAction.count} ocorrências
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Conteúdo Principal */}
      <Tabs defaultValue='table' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='table'>
            <Activity className='h-4 w-4 mr-2' />
            Tabela de Eventos
          </TabsTrigger>
          <TabsTrigger value='stats'>
            <BarChart3 className='h-4 w-4 mr-2' />
            Estatísticas
          </TabsTrigger>
        </TabsList>

        <TabsContent value='table' className='space-y-4'>
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className='text-lg'>Filtros</CardTitle>
              <CardDescription>
                Filtre os eventos por diferentes critérios para análise
                específica
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
                {/* Busca */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>Buscar</label>
                  <div className='relative'>
                    <Search className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
                    <Input
                      placeholder='Buscar em ações, usuários...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className='pl-10'
                    />
                  </div>
                </div>

                {/* Tipo de Ação */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>Tipo de Ação</label>
                  <Select
                    value={selectedActionType}
                    onValueChange={setSelectedActionType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Todas as ações' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Todas as ações</SelectItem>
                      {filterOptions.actionTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Usuário */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>Usuário</label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder='Todos os usuários' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Todos os usuários</SelectItem>
                      {filterOptions.users.map((user) => (
                        <SelectItem key={user} value={user}>
                          {user}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Período */}
                <div className='space-y-2'>
                  <label className='text-sm font-medium'>Período</label>
                  <Select
                    value={selectedTimeRange}
                    onValueChange={setSelectedTimeRange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder='Todos os períodos' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='all'>Todos os períodos</SelectItem>
                      <SelectItem value='today'>Hoje</SelectItem>
                      <SelectItem value='week'>Última semana</SelectItem>
                      <SelectItem value='month'>Último mês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className='flex items-center justify-between mt-4'>
                <div className='flex items-center gap-4'>
                  <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                    <Filter className='h-4 w-4' />
                    <span>
                      Mostrando {startItem} a {endItem} de {totalItems} eventos
                      {(searchTerm ||
                        selectedActionType !== 'all' ||
                        selectedUser !== 'all' ||
                        selectedTimeRange !== 'all') && (
                        <span className='text-blue-600 ml-1'>(filtrados)</span>
                      )}
                    </span>
                  </div>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) =>
                      handleItemsPerPageChange(Number(value))
                    }
                  >
                    <SelectTrigger className='w-[180px]'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='5'>5 por página</SelectItem>
                      <SelectItem value='10'>10 por página</SelectItem>
                      <SelectItem value='25'>25 por página</SelectItem>
                      <SelectItem value='50'>50 por página</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(searchTerm ||
                  selectedActionType !== 'all' ||
                  selectedUser !== 'all' ||
                  selectedTimeRange !== 'all') && (
                  <Button variant='outline' size='sm' onClick={clearFilters}>
                    Limpar Filtros
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle>Eventos de Auditoria</CardTitle>
              <CardDescription>
                Histórico completo de ações realizadas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className='space-y-2'>
                  {[...Array(itemsPerPage)].map((_, i) => (
                    <Skeleton key={i} className='h-12 w-full' />
                  ))}
                </div>
              ) : (
                <>
                  <AuditLogTable
                    logs={filteredLogs}
                    onRowClick={setDetailLog}
                  />

                  {/* Paginação Simplificada */}
                  {totalPages > 1 && (
                    <div className='flex items-center justify-between mt-6'>
                      <div className='text-sm text-muted-foreground'>
                        Página {currentPage} de {totalPages}
                      </div>

                      <div className='flex items-center gap-2'>
                        {/* Botão Anterior */}
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                        >
                          Anterior
                        </Button>

                        {/* Páginas numéricas */}
                        <div className='flex items-center gap-1'>
                          {totalPages <= 7 ? (
                            // Mostrar todas as páginas se forem poucas
                            Array.from(
                              { length: totalPages },
                              (_, i) => i + 1
                            ).map((pageNum) => (
                              <Button
                                key={pageNum}
                                variant={
                                  pageNum === currentPage
                                    ? 'default'
                                    : 'outline'
                                }
                                size='sm'
                                onClick={() => handlePageChange(pageNum)}
                                className='w-8 h-8 p-0'
                              >
                                {pageNum}
                              </Button>
                            ))
                          ) : (
                            // Lógica para muitas páginas
                            <>
                              {/* Primeira página */}
                              {currentPage > 3 && (
                                <>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => handlePageChange(1)}
                                    className='w-8 h-8 p-0'
                                  >
                                    1
                                  </Button>
                                  {currentPage > 4 && (
                                    <span className='px-2'>...</span>
                                  )}
                                </>
                              )}

                              {/* Páginas ao redor da atual */}
                              {[currentPage - 1, currentPage, currentPage + 1]
                                .filter(
                                  (page) => page >= 1 && page <= totalPages
                                )
                                .map((pageNum) => (
                                  <Button
                                    key={pageNum}
                                    variant={
                                      pageNum === currentPage
                                        ? 'default'
                                        : 'outline'
                                    }
                                    size='sm'
                                    onClick={() => handlePageChange(pageNum)}
                                    className='w-8 h-8 p-0'
                                  >
                                    {pageNum}
                                  </Button>
                                ))}

                              {/* Última página */}
                              {currentPage < totalPages - 2 && (
                                <>
                                  {currentPage < totalPages - 3 && (
                                    <span className='px-2'>...</span>
                                  )}
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() => handlePageChange(totalPages)}
                                    className='w-8 h-8 p-0'
                                  >
                                    {totalPages}
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                        </div>

                        {/* Botão Próximo */}
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                        >
                          Próximo
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='stats' className='space-y-4'>
          {/* Distribuição por tipo */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Tipo de Ação</CardTitle>
              <CardDescription>
                Visualização da frequência de cada tipo de evento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {Object.entries(statistics.actionTypeCounts)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([type, count]) => {
                    const percentage = (
                      (count / statistics.total) *
                      100
                    ).toFixed(1);
                    return (
                      <div key={type} className='space-y-2'>
                        <div className='flex justify-between text-sm'>
                          <span className='font-medium'>{type}</span>
                          <span className='text-muted-foreground'>
                            {count} ({percentage}%)
                          </span>
                        </div>
                        <div className='w-full bg-secondary rounded-full h-2'>
                          <div
                            className='bg-primary h-2 rounded-full transition-all'
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de detalhes */}
      <AuditLogDetailsModal
        log={detailLog}
        onClose={() => setDetailLog(null)}
      />
    </div>
  );
}
