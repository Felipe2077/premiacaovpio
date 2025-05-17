// app/admin/parameters/page.tsx
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, PlusCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';

import { CreateParameterModal } from '@/components/parameters/CreateParameterModal';
import { DeleteParameterModal } from '@/components/parameters/DeleteParameterModal';
import { EditParameterModal } from '@/components/parameters/EditParameterModal';
import { ParametersMatrix } from '@/components/parameters/ParametersMatrix';
import { PeriodSelector } from '@/components/shared/period-selector';
import { ResultData, useParametersData } from '@/hooks/useParametersData';
import { useParametersForms } from '@/hooks/useParametersForms';
import { useParametersMutations } from '@/hooks/useParametersMutations';

// Função para buscar parâmetros por período, critério e setor
async function fetchParametersByCriterionAndSector(
  period: string,
  criterionId?: number,
  sectorId?: number
): Promise<any[]> {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  let url = `${API_BASE_URL}/api/parameters?period=${period}`;

  if (criterionId) {
    url += `&criterionId=${criterionId}`;
  }

  if (sectorId) {
    url += `&sectorId=${sectorId}`;
  }

  console.log(`Buscando parâmetros com URL: ${url}`);

  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`Erro ${res.status} ao buscar parâmetros`);
    }

    const parameters = await res.json();
    console.log('Parâmetros recebidos:', parameters);
    return parameters;
  } catch (error) {
    console.error('Erro ao buscar parâmetros:', error);
    throw error;
  }
}

export default function ParametersPage() {
  // Estado para o período selecionado
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ResultData | null>(null);

  // Hooks personalizados
  const {
    periods,
    results,
    criteria,
    sectors,
    uniqueCriteria,
    resultsBySector,
    isLoading,
    error,
    refetchResults,
  } = useParametersData(selectedPeriod);

  const { createMutation, updateMutation, deleteMutation } =
    useParametersMutations(selectedPeriod);

  const { createForm, updateForm, deleteForm, resetCreateForm, todayStr } =
    useParametersForms(selectedPeriod, periods);

  // Definir período inicial quando os períodos forem carregados
  useEffect(() => {
    if (periods && periods.length > 0 && !selectedPeriod) {
      // Tenta encontrar um período em PLANEJAMENTO ou ATIVA
      const planningPeriod = periods.find((p) => p.status === 'PLANEJAMENTO');
      const activePeriod = periods.find((p) => p.status === 'ATIVA');

      // Ou usa o primeiro período
      const defaultPeriod = planningPeriod || activePeriod || periods[0];

      if (defaultPeriod) {
        console.log('Definindo período inicial:', defaultPeriod.mesAno);
        setSelectedPeriod(defaultPeriod.mesAno);
      }
    }
  }, [periods, selectedPeriod]);

  // Função para lidar com a criação de uma meta
  const handleCreateMeta = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
  };

  // Função para lidar com a criação de uma meta específica
  const handleCreateSpecificMeta = (
    criterionId: number,
    sectorId: number,
    criterionName: string
  ) => {
    if (!periods) {
      toast.error('Carregando períodos. Tente novamente em instantes.');
      return;
    }

    resetCreateForm(criterionId, sectorId);
    createForm.setValue('nomeParametro', criterionName);
    setIsCreateModalOpen(true);
  };

  // Função para lidar com a edição de uma meta
  const handleEditMeta = async (item: ResultData) => {
    if (!periods) {
      toast.error('Carregando períodos. Tente novamente em instantes.');
      return;
    }

    const periodObj = periods.find((p) => p.mesAno === selectedPeriod);
    if (!periodObj) {
      toast.error('Período não encontrado.');
      return;
    }

    // Mostrar loading
    toast.loading('Buscando informações do parâmetro...');

    try {
      // Buscar parâmetros para este critério e setor no período selecionado
      const parameters = await fetchParametersByCriterionAndSector(
        selectedPeriod,
        item.criterioId,
        item.setorId
      );

      // Remover loading
      toast.dismiss();

      // Verificar se encontramos algum parâmetro
      if (!parameters || parameters.length === 0) {
        // Se não encontrarmos parâmetros, precisamos criar um novo
        toast.info(
          'Não há meta cadastrada para este critério e setor. Criando uma nova meta...'
        );

        // Configurar o formulário de criação com TODOS os campos obrigatórios
        resetCreateForm(item.criterioId, item.setorId);
        createForm.setValue('nomeParametro', item.criterioNome);
        createForm.setValue('valor', item.valorMeta);
        createForm.setValue('dataInicioEfetivo', todayStr);
        createForm.setValue('criterionId', item.criterioId);
        createForm.setValue('sectorId', item.setorId);
        createForm.setValue('competitionPeriodId', periodObj.id);
        createForm.setValue('justificativa', 'Criação inicial da meta'); // Adicionando justificativa padrão

        // Abrir o modal de criação
        setIsCreateModalOpen(true);
        return;
      }

      // Usar o primeiro parâmetro encontrado (deve ser único para o critério/setor/período)
      const parameter = parameters[0];

      // Configurar o formulário
      updateForm.reset({
        id: parameter.id,
        nomeParametro: parameter.nomeParametro,
        valor: parameter.valor,
        dataInicioEfetivo: parameter.dataInicioEfetivo,
        criterionId: item.criterioId,
        sectorId: item.setorId,
        competitionPeriodId: periodObj.id,
        justificativa: '',
      });

      setSelectedItem(item);
      setIsEditModalOpen(true);
    } catch (error) {
      // Remover loading
      toast.dismiss();
      toast.error('Erro ao buscar informações do parâmetro.');
      console.error('Erro ao buscar parâmetro:', error);
    }
  };

  // Função para lidar com a exclusão de uma meta
  const handleDeleteMeta = async (item: ResultData) => {
    if (!periods) {
      toast.error('Carregando períodos. Tente novamente em instantes.');
      return;
    }

    const periodObj = periods.find((p) => p.mesAno === selectedPeriod);
    if (!periodObj) {
      toast.error('Período não encontrado.');
      return;
    }

    // Mostrar loading
    toast.loading('Buscando informações do parâmetro...');

    try {
      // Buscar parâmetros para este critério e setor no período selecionado
      const parameters = await fetchParametersByCriterionAndSector(
        selectedPeriod,
        item.criterioId,
        item.setorId
      );

      // Remover loading
      toast.dismiss();

      // Verificar se encontramos algum parâmetro
      if (!parameters || parameters.length === 0) {
        toast.error(
          'Não há meta cadastrada para este critério e setor. Não é possível excluir.'
        );
        return;
      }

      // Usar o primeiro parâmetro encontrado (deve ser único para o critério/setor/período)
      const parameter = parameters[0];

      // Configurar o formulário
      deleteForm.reset({
        id: parameter.id,
        justificativa: '',
      });

      setSelectedItem(item);
      setIsDeleteModalOpen(true);
    } catch (error) {
      // Remover loading
      toast.dismiss();
      toast.error('Erro ao buscar informações do parâmetro.');
      console.error('Erro ao buscar parâmetro:', error);
    }
  };

  // Função para submeter o formulário de criação
  const onSubmitCreate = (data: any) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setIsCreateModalOpen(false);
        refetchResults(); // Recarregar os resultados após criar
      },
    });
  };

  // Função para submeter o formulário de edição
  const onSubmitUpdate = (data: any) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        setIsEditModalOpen(false);
        refetchResults(); // Recarregar os resultados após atualizar
      },
    });
  };

  // Função para submeter o formulário de exclusão
  const onSubmitDelete = (data: any) => {
    deleteMutation.mutate(data, {
      onSuccess: () => {
        setIsDeleteModalOpen(false);
        refetchResults(); // Recarregar os resultados após excluir
      },
    });
  };

  // Renderização de estados de carregamento
  if (isLoading) {
    return (
      <div className='container mx-auto p-6'>
        <Skeleton className='h-8 w-48 mb-4' />
        <Skeleton className='h-10 w-full mb-2' />
        <Skeleton className='h-10 w-full mb-2' />
        <Skeleton className='h-10 w-full mb-2' />
      </div>
    );
  }

  // Renderização de erros
  if (error) {
    return (
      <div className='container mx-auto p-6'>
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>Erro ao Carregar Dados</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Erro desconhecido'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Renderização principal
  return (
    <div className='container mx-auto p-6'>
      <Toaster position='top-right' richColors />

      <div className='flex justify-between items-center mb-6'>
        <h1 className='text-2xl font-bold'>Gerenciamento de Metas</h1>

        <div className='flex space-x-2'>
          <Button onClick={handleCreateMeta} size='sm'>
            <PlusCircle className='mr-2 h-4 w-4' /> Nova Meta
          </Button>

          <Button
            onClick={() => {
              console.log('Forçando refetch para período:', selectedPeriod);
              refetchResults();
            }}
            size='sm'
            variant='outline'
          >
            <RefreshCw className='mr-2 h-4 w-4' /> Atualizar
          </Button>
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-4 mb-6'>
        <div className='flex items-center space-x-2'>
          <Label htmlFor='period-select'>Período:</Label>
          <PeriodSelector
            id='period-select'
            label='Período:'
            periods={periods || []}
            selectedPeriodMesAno={selectedPeriod}
            onPeriodChange={(period) => {
              console.log('Mudando período para:', period);
              setSelectedPeriod(period);
            }}
            isLoading={isLoading}
            triggerClassName='w-[200px]'
          />
        </div>

        <div className='flex-1'></div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Metas para o período:{' '}
            {selectedPeriod || 'Nenhum período selecionado'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {results && results.length > 0 ? (
            <ParametersMatrix
              uniqueCriteria={uniqueCriteria}
              resultsBySector={resultsBySector}
              onEdit={handleEditMeta}
              onCreate={handleCreateSpecificMeta}
              isLoading={isLoading}
            />
          ) : (
            <div className='text-center py-8'>
              <p className='text-muted-foreground'>
                {selectedPeriod
                  ? `Nenhuma meta encontrada para o período ${selectedPeriod}.`
                  : 'Selecione um período para visualizar as metas.'}
              </p>
              {selectedPeriod && (
                <Button className='mt-4' onClick={handleCreateMeta}>
                  <PlusCircle className='mr-2 h-4 w-4' /> Criar Nova Meta
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <CreateParameterModal
        isOpen={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        form={createForm}
        onSubmit={onSubmitCreate}
        criteria={criteria}
        sectors={sectors}
        selectedPeriod={selectedPeriod}
        isSubmitting={createMutation.isPending}
      />

      <EditParameterModal
        isOpen={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        form={updateForm}
        onSubmit={onSubmitUpdate}
        selectedItem={selectedItem}
        selectedPeriod={selectedPeriod}
        isSubmitting={updateMutation.isPending}
      />

      <DeleteParameterModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        form={deleteForm}
        onSubmit={onSubmitDelete}
        selectedItem={selectedItem}
        isSubmitting={deleteMutation.isPending}
      />
    </div>
  );
}
