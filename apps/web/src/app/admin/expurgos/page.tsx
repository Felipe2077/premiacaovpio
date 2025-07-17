// apps/web/src/app/admin/expurgos/page.tsx - VERSÃO CORRIGIDA E COMPLETA
'use client';
import ExpurgoModal from '@/components/expurgos/ExpurgoModal';
import ExpurgosTable from '@/components/expurgos/ExpurgosTable';
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
import { Input } from '@/components/ui/input';
import { useExpurgosData } from '@/hooks/useExpurgosData'; // Assumindo que este hook foi atualizado para aceitar 'enabled'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

// Função para formatar período (ex: "2025-06" -> "Junho 2025")
const formatPeriod = (mesAno: string) => {
  if (!mesAno || !mesAno.includes('-')) return 'Data inválida';
  const [ano, mes] = mesAno.split('-');
  const date = new Date(Number(ano), Number(mes) - 1);
  return date.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
};

export default function ExpurgosPage() {
  const { user, isAuthenticated, isLoading: isLoadingAuth } = useAuth();
  const [isExpurgoModalOpen, setIsExpurgoModalOpen] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState<string>('');
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Determinar roles do usuário
  const isManager = user?.roles?.includes('GERENTE');
  const isDirector = user?.roles?.includes('DIRETOR');

  // Filtros de segurança baseados na role do usuário
  const securityFilters = useMemo(() => {
    if (!isAuthenticated || !user) {
      return {};
    }

    if (isManager) {
      if (user.sectorId !== undefined && user.sectorId !== null) {
        return { sectorId: user.sectorId };
      }
      return {};
    }
    return {};
  }, [isManager, user?.sectorId, user, isAuthenticated]);

  // Combina os filtros de segurança com o filtro de período
  const filtersWithPeriod = useMemo(() => {
    const filters = { ...securityFilters };
    if (currentPeriod) {
      filters.periodMesAno = currentPeriod;
    }
    return filters;
  }, [securityFilters, currentPeriod]);

  // 🎯 CORREÇÃO: Lógica para determinar se a busca de dados está pronta para ser executada.
  const isQueryEnabled = useMemo(() => {
    // Condição 1: A autenticação deve ter sido concluída.
    if (isLoadingAuth) {
      return false;
    }

    // Condição 2: O período de vigência deve ter sido carregado.
    if (!currentPeriod) {
      return false;
    }

    // Condição 3: Se for um gerente, o sectorId DEVE existir.
    if (isManager && user?.sectorId === undefined) {
      return false;
    }

    // Se todas as condições passarem, a query pode ser executada.
    return true;
  }, [isLoadingAuth, currentPeriod, isManager, user?.sectorId]);

  // 🎯 CORREÇÃO: Passar o flag `isQueryEnabled` para o hook de dados.
  const {
    expurgos,
    criterios,
    setores,
    isLoadingExpurgos,
    isLoadingCriterios,
    isLoadingSetores,
    errorExpurgos,
    refetchExpurgos,
  } = useExpurgosData(filtersWithPeriod, isQueryEnabled);

  // Buscar período ativo na inicialização
  useEffect(() => {
    // AbortController cancela a chamada fetch se o componente for desmontado
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchActivePeriod = async () => {
      console.log('[EFFECT] Iniciando busca de período...');
      try {
        const response = await fetch('/api/periods/active', {
          credentials: 'include',
          signal, // Passa o sinal para a chamada fetch
        });

        if (!response.ok) {
          // Se não há período ativo, busca todos os períodos
          const allPeriodsResponse = await fetch('/api/periods', {
            credentials: 'include',
            signal,
          });
          if (allPeriodsResponse.ok) {
            const allPeriods = (await allPeriodsResponse.json())
              .map((p: any) => p.mesAno)
              .sort();
            // Apenas atualiza o estado se o componente ainda estiver "vivo"
            if (!signal.aborted && allPeriods.length > 0) {
              const latestPeriod = allPeriods[allPeriods.length - 1];
              console.log(
                '[EFFECT] Período definido (fallback):',
                latestPeriod
              );
              setCurrentPeriod(latestPeriod);
            }
          }
          return; // Sai da função principal
        }

        const period = await response.json();
        // Apenas atualiza o estado se o componente ainda estiver "vivo"
        if (!signal.aborted) {
          console.log('[EFFECT] Período definido (ativo):', period.mesAno);
          setCurrentPeriod(period.mesAno);
        }
      } catch (error) {
        // Ignora o erro de "AbortError" que é esperado quando cancelamos
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Erro ao buscar período ativo:', error);
        }
      }
    };

    fetchActivePeriod();

    // Esta é a função de "limpeza": ela é chamada quando o React desmonta o componente
    return () => {
      console.log('[EFFECT] Limpando e abortando chamada fetch...');
      controller.abort();
    };
  }, []); // A dependência vazia está correta, pois só deve rodar na montagem.

  // Buscar todos os períodos disponíveis assim que um período atual for definido
  useEffect(() => {
    const fetchAllPeriods = async () => {
      try {
        const response = await fetch('/api/periods', {
          credentials: 'include',
        });
        if (response.ok) {
          const periods = await response.json();
          const sortedPeriods = periods.map((p: any) => p.mesAno).sort();
          setAvailablePeriods(sortedPeriods);
          const index = sortedPeriods.indexOf(currentPeriod);
          setCurrentIndex(index >= 0 ? index : sortedPeriods.length - 1);
        }
      } catch (error) {
        console.error('Erro ao buscar períodos:', error);
      }
    };

    if (currentPeriod) {
      fetchAllPeriods();
    }
  }, [currentPeriod]);

  // Navegação entre períodos
  const navigatePeriod = (direction: 'prev' | 'next') => {
    if (availablePeriods.length === 0) return;
    let newIndex = currentIndex;
    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (
      direction === 'next' &&
      currentIndex < availablePeriods.length - 1
    ) {
      newIndex = currentIndex + 1;
    }
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
      setCurrentPeriod(availablePeriods[newIndex]);
    }
  };

  // Filtrar critérios elegíveis para expurgo
  const eligibleCriteria = useMemo(() => {
    return (
      criterios?.filter((criterio) =>
        [
          'QUEBRA',
          'DEFEITO',
          'KM OCIOSA',
          'FALTA FUNC',
          'ATRASO',
          'PEÇAS',
          'PNEUS',
        ].includes(criterio.nome.toUpperCase())
      ) || []
    );
  }, [criterios]);

  // Handler para registrar novo expurgo
  const handleRegisterExpurgo = async (expurgoData: any) => {
    try {
      const response = await fetch('/api/expurgos/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(expurgoData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao registrar expurgo');
      }

      toast.success('Expurgo registrado com sucesso!');
      setIsExpurgoModalOpen(false);
      await refetchExpurgos();
    } catch (error) {
      console.error('Erro ao registrar expurgo:', error);
      toast.error(
        error instanceof Error ? error.message : 'Erro ao registrar expurgo'
      );
    }
  };

  // Informações de segurança para o usuário
  const securityInfo = useMemo(() => {
    if (!user?.id && isLoadingAuth) {
      return { isFiltered: false, message: 'Carregando...', sectorName: '' };
    }
    if (isManager && user?.sectorId) {
      const userSector = setores?.find((s) => s.id === user.sectorId);
      const sectorName = userSector?.nome || 'seu setor';
      return {
        isFiltered: true,
        sectorName,
        message: `Exibindo apenas expurgos do setor: ${sectorName}`,
      };
    }
    return {
      isFiltered: false,
      message: 'Exibindo todos os expurgos do sistema',
      sectorName: 'Todos',
    };
  }, [isManager, user?.id, user?.sectorId, setores, isLoadingAuth]);

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-3xl font-bold tracking-tight'>
            Gestão de Expurgos
          </h2>
          <p className='text-muted-foreground'>
            Visualize e gerencie solicitações de expurgo do sistema
          </p>
        </div>
        {currentPeriod && availablePeriods.length > 1 && (
          <div className='flex items-center space-x-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => navigatePeriod('prev')}
              disabled={currentIndex === 0}
              title='Período anterior'
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <Badge
              variant='secondary'
              className='text-sm font-medium px-4 py-2'
            >
              {formatPeriod(currentPeriod)}
            </Badge>
            <Button
              variant='outline'
              size='sm'
              onClick={() => navigatePeriod('next')}
              disabled={currentIndex === availablePeriods.length - 1}
              title='Próximo período'
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        )}
      </div>

      {/* Alerta de Segurança */}

      {/* Estatísticas */}
      {expurgos && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card>
            <CardContent className='p-4'>
              <div className='text-2xl font-bold'>{expurgos.length}</div>
              <p className='text-sm text-muted-foreground'>Total de Expurgos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <div className='text-2xl font-bold text-yellow-600'>
                {expurgos.filter((e) => e.status === 'PENDENTE').length}
              </div>
              <p className='text-sm text-muted-foreground'>Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <div className='text-2xl font-bold text-green-600'>
                {expurgos.filter((e) => e.status === 'APROVADO').length}
              </div>
              <p className='text-sm text-muted-foreground'>Aprovados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='p-4'>
              <div className='text-2xl font-bold text-red-600'>
                {expurgos.filter((e) => e.status === 'REJEITADO').length}
              </div>
              <p className='text-sm text-muted-foreground'>Rejeitados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Erro */}
      {errorExpurgos && (
        <p className='text-red-500'>
          Erro ao carregar expurgos:{' '}
          {errorExpurgos instanceof Error
            ? errorExpurgos.message
            : 'Erro desconhecido'}
        </p>
      )}

      {/* Tabela principal */}
      <Card>
        <CardHeader>
          <div className='flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2'>
            <div>
              <CardTitle>Expurgos Registrados</CardTitle>
              <CardDescription className='mt-1'>
                {securityInfo.isFiltered
                  ? `Expurgos do setor ${securityInfo.sectorName}`
                  : 'Todos os expurgos do sistema'}
              </CardDescription>
            </div>
            <Button
              size='sm'
              variant='outline'
              className='cursor-pointer bg-amber-400 text-neutral-900'
              disabled={isLoadingExpurgos}
              onClick={() => setIsExpurgoModalOpen(true)}
            >
              <Plus className='h-4 w-4 mr-2' />
              Registrar Novo Expurgo
            </Button>
          </div>
          <div className='flex gap-2 pt-4'>
            <Input placeholder='Filtrar...' className='max-w-xs' disabled />
          </div>
        </CardHeader>
        <CardContent>
          <ExpurgosTable expurgos={expurgos} loading={isLoadingExpurgos} />
        </CardContent>
      </Card>

      {/* Modal de novo expurgo */}
      <ExpurgoModal
        open={isExpurgoModalOpen}
        onOpenChange={setIsExpurgoModalOpen}
        setores={setores || []}
        criterios={eligibleCriteria}
        isLoadingSetores={isLoadingSetores}
        isLoadingCriterios={isLoadingCriterios}
        onSubmit={handleRegisterExpurgo}
      />
    </div>
  );
}
