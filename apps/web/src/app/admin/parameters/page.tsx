// apps/web/src/app/admin/parameters/page.tsx (COMPLETO COM CRUD E HISTÓRICO)
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatDate } from '@/lib/utils';
import {
  CreateParameterDto,
  UpdateParameterDto,
} from '@sistema-premiacao/shared-types';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, PlusCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';

import { PeriodSelector } from '@/components/shared/period-selector';
import { ParameterValueAPI, useParameters } from '@/hooks/useParameters';
import { columnsParameters } from './_components/columns-parameters';
import { CreateEditParameterModal } from './_components/modals/CreateEditParameterModal';
import { ParameterForm } from './_components/parameter-form';
import { ParametersTable } from './_components/parameters-table';

// Tipos para os dados dos dropdowns
interface CompetitionPeriodForSelect {
  id: number;
  mesAno: string;
  status: string;
  dataInicio?: string;
  dataFim?: string;
}
interface CriterionForSelect {
  id: number;
  nome: string;
}
interface SectorForSelect {
  id: number;
  nome: string;
}

// Funções de Fetch para Dropdowns
const fetchActiveCriteriaSimple = async (): Promise<CriterionForSelect[]> => {
  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/criteria/active`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Erro ${res.status} ao buscar critérios`);
  }
  const data = await res.json();
  return Array.isArray(data)
    ? data.map((c) => ({ id: c.id, nome: c.nome }))
    : [];
};

const fetchActiveSectorsSimple = async (): Promise<SectorForSelect[]> => {
  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/sectors/active`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Erro ${res.status} ao buscar setores`);
  }
  const data = await res.json();
  return Array.isArray(data)
    ? data.map((s) => ({ id: s.id, nome: s.nome }))
    : [];
};

const fetchCompetitionPeriodsForSelect = async (): Promise<
  CompetitionPeriodForSelect[]
> => {
  const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/periods`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Erro ${res.status} ao buscar períodos`);
  }
  const data = await res.json();
  return Array.isArray(data)
    ? data.map((p) => ({
        id: p.id,
        mesAno: p.mesAno,
        status: p.status,
        dataInicio: p.dataInicio,
        dataFim: p.dataFim,
      }))
    : [];
};

export default function ParametersPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingParameter, setEditingParameter] =
    useState<ParameterValueAPI | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [parameterToDelete, setParameterToDelete] =
    useState<ParameterValueAPI | null>(null);
  const [deleteJustification, setDeleteJustification] = useState('');

  const [historyParam, setHistoryParam] = useState<ParameterValueAPI | null>(
    null
  );
  const [parameterHistoryData, setParameterHistoryData] = useState<
    ParameterValueAPI[]
  >([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedPeriodMesAno, setSelectedPeriodMesAno] = useState<string>(
    () => {
      // Tenta pegar do localStorage na inicialização
      if (typeof window !== 'undefined') {
        const savedPeriod = localStorage.getItem(
          'selectedAdminParameterPeriod'
        );
        if (savedPeriod) return savedPeriod;
      }
      return ''; // Default inicial vazio
    }
  );

  const {
    data: competitionPeriodsData,
    isLoading: isLoadingPeriods,
    error: periodsError,
  } = useQuery<CompetitionPeriodForSelect[]>({
    queryKey: ['competitionPeriodsForAdminParamsPage'],
    queryFn: fetchCompetitionPeriodsForSelect,
    staleTime: 1000 * 60 * 15, // 15 minutos
  });
  const competitionPeriods = useMemo(
    () => competitionPeriodsData || [],
    [competitionPeriodsData]
  );
  // Efeito para definir o período inicial ou quando o usuário ainda não selecionou um
  useEffect(() => {
    // Só roda se os períodos foram carregados e NENHUM período está selecionado ainda
    if (competitionPeriods.length > 0 && !selectedPeriodMesAno) {
      let initialPeriodToSet = '';
      // Tenta pegar do localStorage
      if (typeof window !== 'undefined') {
        const savedPeriod = localStorage.getItem(
          'selectedAdminParameterPeriod'
        );
        if (
          savedPeriod &&
          competitionPeriods.find((p) => p.mesAno === savedPeriod)
        ) {
          initialPeriodToSet = savedPeriod;
        }
      }
      // Se não achou no localStorage ou não é válido, define um default
      if (!initialPeriodToSet) {
        const planningPeriod = competitionPeriods.find(
          (p) => p.status === 'PLANEJAMENTO'
        );
        const activePeriod = competitionPeriods.find(
          (p) => p.status === 'ATIVA'
        );
        // Fallback para o período mais recente (pela data de início)
        const sortedPeriods = [...competitionPeriods].sort(
          (a, b) =>
            new Date(b.dataInicio || 0).getTime() -
            new Date(a.dataInicio || 0).getTime()
        );
        const defaultPeriod =
          planningPeriod ||
          activePeriod ||
          (sortedPeriods.length > 0 ? sortedPeriods[0] : null);
        if (defaultPeriod) {
          initialPeriodToSet = defaultPeriod.mesAno;
        }
      }
      // Define o estado APENAS SE encontrou um período válido para setar
      if (initialPeriodToSet) {
        setSelectedPeriodMesAno(initialPeriodToSet);
      }
    }
  }, [competitionPeriods]);

  const {
    data: activeCriteria,
    isLoading: isLoadingCriteria,
    error: criteriaError,
  } = useQuery<CriterionForSelect[]>({
    queryKey: ['activeCriteriaSimpleForParams'],
    queryFn: fetchActiveCriteriaSimple,
    staleTime: Infinity,
  });
  const {
    data: activeSectors,
    isLoading: isLoadingSectors,
    error: sectorsError,
  } = useQuery<SectorForSelect[]>({
    queryKey: ['activeSectorsSimpleForParams'],
    queryFn: fetchActiveSectorsSimple,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && selectedPeriodMesAno) {
      localStorage.setItem(
        'selectedAdminParameterPeriod',
        selectedPeriodMesAno
      );
    }
  }, [selectedPeriodMesAno]);

  const {
    parameters,
    isLoadingParameters,
    parametersError,
    createParameter,
    isCreatingParameter,
    updateParameter,
    isUpdatingParameter,
    deleteParameter,
    isDeletingParameter,
    getParameterHistory,
  } = useParameters(selectedPeriodMesAno, undefined, undefined, false);

  const handleCreateParameter = async (data: CreateParameterDto) => {
    toast.promise(createParameter(data), {
      loading: 'Salvando nova meta...',
      success: (savedParam) => {
        setIsCreateModalOpen(false);
        return `Meta "${savedParam.nomeParametro || `ID ${savedParam.id}`}" criada!`;
      },
      error: (err) => err.message || 'Falha ao salvar meta.',
    });
  };

  const handleOpenEditModal = (parameter: ParameterValueAPI) => {
    const periodOfParam = competitionPeriods?.find(
      (p) => p.id === parameter.competitionPeriodId
    );
    if (periodOfParam && periodOfParam.status !== 'PLANEJAMENTO') {
      toast.error(
        `Metas do período ${periodOfParam.mesAno} (${periodOfParam.status}) não podem ser editadas. Apenas de períodos em PLANEJAMENTO.`
      );
      return;
    }
    if (
      parameter.dataFimEfetivo &&
      new Date(parameter.dataFimEfetivo) < new Date(todayStr)
    ) {
      toast.error(
        'Esta meta já está expirada e não pode ser editada. Crie uma nova se necessário.'
      );
      return;
    }
    setEditingParameter(parameter);
    setIsEditModalOpen(true);
  };

  const handleUpdateParameter = async (data: UpdateParameterDto) => {
    if (!editingParameter) return;
    if (!data.justificativa || data.justificativa.trim() === '') {
      toast.error('Justificativa é obrigatória para atualizar a meta.');
      return;
    }
    toast.promise(updateParameter({ id: editingParameter.id, data }), {
      loading: 'Atualizando meta...',
      success: (updatedParam) => {
        setIsEditModalOpen(false);
        setEditingParameter(null);
        return `Meta "${updatedParam.nomeParametro || `ID ${updatedParam.id}`}" atualizada! (Nova ID: ${updatedParam.id}, Anterior ID: ${updatedParam.previousVersionId || 'N/A'})`;
      },
      error: (err) => err.message || 'Falha ao atualizar meta.',
    });
  };

  const handleOpenDeleteModal = (parameter: ParameterValueAPI) => {
    const periodOfParam = competitionPeriods?.find(
      (p) => p.id === parameter.competitionPeriodId
    );
    if (periodOfParam && periodOfParam.status !== 'PLANEJAMENTO') {
      toast.error(
        `Metas do período ${periodOfParam.mesAno} (${periodOfParam.status}) não podem ser deletadas (expiradas). Apenas de períodos em PLANEJAMENTO.`
      );
      return;
    }
    if (
      parameter.dataFimEfetivo &&
      new Date(parameter.dataFimEfetivo) < new Date(todayStr)
    ) {
      toast.error(
        'Esta meta já está expirada e não pode ser deletada novamente.'
      );
      return;
    }
    setParameterToDelete(parameter);
    setDeleteJustification('');
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteParameter = async () => {
    if (!parameterToDelete || !deleteJustification.trim()) {
      toast.error(
        !deleteJustification.trim()
          ? 'Justificativa é obrigatória para expirar a meta.'
          : 'Meta para expiração inválida.'
      );
      return;
    }
    toast.promise(
      deleteParameter({
        id: parameterToDelete.id,
        justificativa: deleteJustification,
      }),
      {
        loading: 'Expirando meta...',
        success: (deletedParam) => {
          setIsDeleteConfirmOpen(false);
          setParameterToDelete(null);
          return `Meta "${deletedParam.nomeParametro}" expirada com sucesso!`;
        },
        error: (err) => err.message || 'Falha ao expirar meta.',
      }
    );
  };

  const handleShowHistory = async (param: ParameterValueAPI) => {
    if (!param.competitionPeriodId || !param.criterionId) {
      toast.error(
        'Informações da meta estão incompletas para buscar histórico.'
      );
      setHistoryParam(param);
      setParameterHistoryData([]);
      return;
    }
    setIsLoadingHistory(true);
    setHistoryParam(param);
    try {
      const history = await getParameterHistory(
        param.competitionPeriodId,
        param.criterionId,
        param.sectorId
      );
      setParameterHistoryData(history || []);
    } catch (e) {
      setParameterHistoryData([]);
      console.error('Erro ao carregar histórico:', e.message);
      toast.error(e.message || 'Falha ao buscar histórico.');
    }
    setIsLoadingHistory(false);
  };

  const isLoadingPageEssentials =
    isLoadingPeriods || isLoadingCriteria || isLoadingSectors;

  const tableColumns = useMemo(
    () =>
      columnsParameters({
        onEdit: handleOpenEditModal,
        onDelete: handleOpenDeleteModal,
        onShowHistory: handleShowHistory,
        todayStr: todayStr,
        competitionPeriods: competitionPeriods || [],
      }),
    [todayStr, competitionPeriods]
  );

  if (isLoadingPageEssentials && !selectedPeriodMesAno) {
    // Adicionado !selectedPeriodMesAno para mostrar loading inicial
    return (
      <div className='container mx-auto py-6 px-4 md:px-6 space-y-6'>
        <div className='flex items-center justify-between'>
          <Skeleton className='h-8 w-48' />
          <Skeleton className='h-10 w-32' />
        </div>
        <div className='flex flex-wrap gap-4 items-center pb-4 border-b'>
          <Skeleton className='h-10 w-48' />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className='h-6 w-1/2' />
          </CardHeader>
          <CardContent>
            <Skeleton className='h-40 w-full' />
          </CardContent>
        </Card>
      </div>
    );
  }
  if (periodsError)
    return (
      <div className='container mx-auto p-6'>
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>Erro ao Carregar Períodos!</AlertTitle>
          <AlertDescription>{periodsError.message}</AlertDescription>
        </Alert>
      </div>
    );
  if (criteriaError)
    return (
      <div className='container mx-auto p-6'>
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>Erro ao Carregar Critérios!</AlertTitle>
          <AlertDescription>{criteriaError.message}</AlertDescription>
        </Alert>
      </div>
    );
  if (sectorsError)
    return (
      <div className='container mx-auto p-6'>
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>Erro ao Carregar Setores!</AlertTitle>
          <AlertDescription>{sectorsError.message}</AlertDescription>
        </Alert>
      </div>
    );

  return (
    <TooltipProvider>
      <Toaster position='top-right' richColors />
      <div className='container mx-auto py-6 px-4 md:px-6 space-y-6'>
        <div className='flex items-center justify-between'>
          <h1 className='text-2xl font-bold'>Gerenciamento de Metas</h1>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button
                size='sm'
                disabled={isLoadingPageEssentials || isCreatingParameter}
              >
                <PlusCircle className='mr-2 h-4 w-4' /> Nova Meta
              </Button>
            </DialogTrigger>
            <CreateEditParameterModal
              isOpen={isCreateModalOpen}
              onOpenChange={setIsCreateModalOpen}
              isUpdate={false}
              isLoadingSubmit={isCreatingParameter}
              onSubmit={handleCreateParameter}
              competitionPeriods={competitionPeriods || []}
              criteria={activeCriteria || []}
              sectors={activeSectors || []}
              todayStr={todayStr}
              // initialData não é necessário para criação
            />
          </Dialog>
        </div>

        <div className='flex flex-wrap gap-4 items-center pb-4 border-b'>
          <div className='flex items-center space-x-2'>
            <Label htmlFor='period-select-page'>Período:</Label>
            <PeriodSelector
              id='period-select-page' // Passa um ID para o label interno
              label='Período:' // O label que você quer
              periods={competitionPeriods || []} // Sua lista de períodos
              selectedPeriodMesAno={selectedPeriodMesAno}
              onPeriodChange={setSelectedPeriodMesAno} // Passa a função de setState diretamente
              isLoading={isLoadingPeriods}
              triggerClassName='w-[200px]' // Mantém a largura que você tinha
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Metas para o período:
              {selectedPeriodMesAno || 'Nenhum período selecionado'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingParameters && (
              <div className='space-y-2 mt-2'>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full mb-1' />
                ))}
              </div>
            )}
            {!isLoadingParameters && parametersError && (
              <Alert variant='destructive' className='mt-4'>
                <AlertCircle className='h-4 w-4' />
                <AlertTitle>Erro ao Carregar Metas!</AlertTitle>
                <AlertDescription>{parametersError.message}</AlertDescription>
              </Alert>
            )}
            {/* Exibição da Tabela de Metas */}
            {!isLoadingParameters && !parametersError && parameters && (
              <ParametersTable
                parameters={parameters}
                isLoading={isLoadingParameters}
                error={parametersError}
                selectedPeriodMesAno={selectedPeriodMesAno}
                todayStr={todayStr}
                competitionPeriods={competitionPeriods || []} // Garante que é um array
                onEdit={handleOpenEditModal}
                onDelete={handleOpenDeleteModal}
                onShowHistory={handleShowHistory}
              />
            )}
          </CardContent>
        </Card>

        {/* Modal de Edição */}
        <Dialog
          open={isEditModalOpen}
          onOpenChange={(isOpen) => {
            if (!isOpen) setEditingParameter(null);
            setIsEditModalOpen(isOpen);
          }}
        >
          <DialogContent className='sm:max-w-[550px]'>
            <DialogHeader>
              <DialogTitle>
                Editar Meta: {editingParameter?.nomeParametro}
              </DialogTitle>
              <DialogDescription>
                Altere os dados. Uma nova versão será criada e a atual expirada.
                Justificativa obrigatória.
              </DialogDescription>
            </DialogHeader>
            {editingParameter && (
              <ParameterForm
                isLoading={isUpdatingParameter}
                onSubmit={handleUpdateParameter}
                competitionPeriods={competitionPeriods || []} // Passa todos, form desabilita
                criteria={activeCriteria || []} // Passa todos, form desabilita
                sectors={activeSectors || []} // Passa todos, form desabilita
                initialData={{
                  // Mapeia os dados de ParameterValueAPI para ParameterFormValues
                  id: editingParameter.id,
                  nomeParametro: editingParameter.nomeParametro,
                  valor: editingParameter.valor,
                  dataInicioEfetivo: todayStr, // Data de início da NOVA VERSÃO
                  criterionId: editingParameter.criterionId, // ID para desabilitar
                  sectorId: editingParameter.sectorId, // ID para desabilitar
                  competitionPeriodId: editingParameter.competitionPeriodId, // ID para desabilitar
                  justificativa: '', // Justificativa da ALTERAÇÃO
                }}
                isUpdate={true} // Modo de Edição
                onClose={() => {
                  setIsEditModalOpen(false);
                  setEditingParameter(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* AlertDialog para Confirmação de Deleção */}
        <AlertDialog
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Expiração da Meta</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja expirar a meta
                {parameterToDelete?.nomeParametro}? Esta ação definirá a data de
                fim da vigência para hoje. A meta permanecerá no histórico.
                Forneça uma justificativa.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className='grid gap-4 py-4'>
              <Label
                htmlFor='delete-justification-textarea'
                className='text-left font-semibold'
              >
                Justificativa*
              </Label>
              <Textarea
                id='delete-justification-textarea'
                value={deleteJustification}
                onChange={(e) => setDeleteJustification(e.target.value)}
                placeholder='Motivo da expiração da meta...'
                rows={3}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setParameterToDelete(null);
                  setDeleteJustification('');
                }}
              >
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteParameter}
                disabled={isDeletingParameter || !deleteJustification.trim()}
              >
                {isDeletingParameter
                  ? 'Expirando...'
                  : 'Confirmar e Expirar Meta'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de Histórico */}
        <Dialog
          open={!!historyParam}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setHistoryParam(null);
              setParameterHistoryData([]);
            }
          }}
        >
          <DialogContent className='sm:max-w-4xl'>
            <DialogHeader>
              <DialogTitle>
                Histórico de Alterações: {historyParam?.nomeParametro}
              </DialogTitle>
            </DialogHeader>
            <div className='py-4 max-h-[400px] overflow-y-auto border rounded-md'>
              {isLoadingHistory ? (
                <div className='text-center p-4'>Carregando histórico...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Valor</TableHead>
                      <TableHead>Início Vigência</TableHead>
                      <TableHead>Fim Vigência</TableHead>
                      <TableHead>Criado Por</TableHead>
                      <TableHead>Justificativa</TableHead>
                      <TableHead>Data Criação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parameterHistoryData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className='text-center h-24'>
                          Nenhum histórico.
                        </TableCell>
                      </TableRow>
                    )}
                    {parameterHistoryData.map((histParam) => (
                      <TableRow
                        key={histParam.id}
                        className={
                          !histParam.dataFimEfetivo
                            ? 'bg-sky-100 dark:bg-sky-900 font-semibold'
                            : ''
                        }
                      >
                        <TableCell>{histParam.valor}</TableCell>
                        <TableCell>
                          {formatDate(histParam.dataInicioEfetivo)}
                        </TableCell>
                        <TableCell>
                          {histParam.dataFimEfetivo
                            ? formatDate(histParam.dataFimEfetivo)
                            : 'Vigente'}
                        </TableCell>
                        <TableCell>
                          {histParam.criadoPor?.nome ?? '-'}
                        </TableCell>
                        <TableCell className='text-xs max-w-[200px]'>
                          <Tooltip>
                            <TooltipTrigger className='cursor-help'>
                              {histParam.justificativa?.substring(0, 30) || '-'}
                              {histParam.justificativa &&
                              histParam.justificativa.length > 30
                                ? '...'
                                : ''}
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className='max-w-xs whitespace-pre-wrap'>
                                {histParam.justificativa}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className='text-xs text-muted-foreground'>
                          {new Date(histParam.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type='button' variant='outline'>
                  Fechar
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
