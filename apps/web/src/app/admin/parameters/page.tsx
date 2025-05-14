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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  AlertCircle,
  Badge,
  Edit,
  History,
  MoreHorizontal,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ParameterValueAPI, useParameters } from '@/hooks/useParameters';
import { columnsParameters } from './_components/columns-parameters';
import { ParameterForm } from './_components/parameter-form';

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

// Funções de Fetch para Dropdowns (COMO NO SEU CÓDIGO)
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
    data: competitionPeriods,
    isLoading: isLoadingPeriods,
    error: periodsError,
  } = useQuery<CompetitionPeriodForSelect[]>({
    queryKey: ['competitionPeriodsForAdminParamsPage'],
    queryFn: fetchCompetitionPeriodsForSelect,
    staleTime: 1000 * 60 * 5,
  });
  useEffect(() => {
    if (competitionPeriods && competitionPeriods.length > 0) {
      if (typeof window !== 'undefined') {
        const savedPeriod = localStorage.getItem(
          'selectedAdminParameterPeriod'
        );
        if (
          savedPeriod &&
          competitionPeriods.find((p) => p.mesAno === savedPeriod)
        ) {
          if (selectedPeriodMesAno !== savedPeriod)
            setSelectedPeriodMesAno(savedPeriod); // Evita loop
          return;
        }
      }
      if (!selectedPeriodMesAno) {
        // Só seta se ainda não tiver um selectedPeriodMesAno
        const planningPeriod = competitionPeriods.find(
          (p) => p.status === 'PLANEJAMENTO'
        );
        const activePeriod = competitionPeriods.find(
          (p) => p.status === 'ATIVA'
        );
        const sortedPeriods = [...competitionPeriods].sort(
          (a, b) =>
            new Date(b.dataInicio || 0).getTime() -
            new Date(a.dataInicio || 0).getTime()
        );
        const defaultPeriod =
          planningPeriod ||
          activePeriod ||
          (sortedPeriods.length > 0 ? sortedPeriods[0] : null);
        if (defaultPeriod && selectedPeriodMesAno !== defaultPeriod.mesAno) {
          // Evita loop
          setSelectedPeriodMesAno(defaultPeriod.mesAno);
        }
      }
    }
  }, [competitionPeriods, selectedPeriodMesAno]);

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
      error: (err: any) => err.message || 'Falha ao salvar meta.',
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
      error: (err: any) => err.message || 'Falha ao atualizar meta.',
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
        error: (err: any) => err.message || 'Falha ao expirar meta.',
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
    } catch (e: any) {
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
          {' '}
          <Skeleton className='h-8 w-48' />{' '}
          <Skeleton className='h-10 w-32' />{' '}
        </div>
        <div className='flex flex-wrap gap-4 items-center pb-4 border-b'>
          {' '}
          <Skeleton className='h-10 w-48' />{' '}
        </div>
        <Card>
          {' '}
          <CardHeader>
            <Skeleton className='h-6 w-1/2' />
          </CardHeader>{' '}
          <CardContent>
            <Skeleton className='h-40 w-full' />
          </CardContent>{' '}
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
            <DialogContent className='sm:max-w-[550px]'>
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Meta</DialogTitle>
                <DialogDescription>
                  Defina os valores para a nova meta. A justificativa é
                  obrigatória.
                </DialogDescription>
              </DialogHeader>
              <ParameterForm
                isLoading={isCreatingParameter}
                onSubmit={handleCreateParameter}
                competitionPeriods={
                  competitionPeriods?.filter(
                    (p) => p.status === 'PLANEJAMENTO'
                  ) || []
                }
                criteria={activeCriteria || []}
                sectors={activeSectors || []}
                onClose={() => setIsCreateModalOpen(false)}
                isUpdate={false}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className='flex flex-wrap gap-4 items-center pb-4 border-b'>
          <div className='flex items-center space-x-2'>
            <Label htmlFor='period-select-page'>Período:</Label>
            <Select
              value={selectedPeriodMesAno}
              onValueChange={(value) => setSelectedPeriodMesAno(value || '')}
              disabled={isLoadingPeriods}
              name='period-select-page'
            >
              <SelectTrigger className='w-[200px]'>
                <SelectValue
                  placeholder={
                    isLoadingPeriods ? 'Carregando...' : 'Selecione o Período'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {competitionPeriods && competitionPeriods.length > 0 ? (
                  competitionPeriods.map((period) => (
                    <SelectItem key={period.id} value={period.mesAno}>
                      {period.mesAno} ({period.status})
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value='loading' disabled>
                    Carregando...
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Metas para o período:{' '}
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
                <AlertCircle className='h-4 w-4' />{' '}
                <AlertTitle>Erro ao Carregar Metas!</AlertTitle>
                <AlertDescription>{parametersError.message}</AlertDescription>
              </Alert>
            )}
            {/* Exibição da Tabela de Metas */}
            {!isLoadingParameters && !parametersError && parameters && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-[250px]'>
                      Nome do Parâmetro
                    </TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Critério</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Início Vigência</TableHead>
                    <TableHead>Fim Vigência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className='max-w-[200px]'>
                      Justificativa
                    </TableHead>
                    <TableHead className='text-right w-[120px]'>
                      Ações
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameters.length === 0 && !isLoadingParameters && (
                    <TableRow>
                      <TableCell colSpan={9} className='h-24 text-center'>
                        Nenhuma meta encontrada para o período selecionado.
                      </TableCell>
                    </TableRow>
                  )}
                  {isLoadingParameters && (
                    <>
                      {[...Array(5)].map((_, i) => (
                        <TableRow key={`skel-${i}`}>
                          <TableCell>
                            <Skeleton className='h-5 w-full' />
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-5 w-12' />
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-5 w-24' />
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-5 w-24' />
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-5 w-20' />
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-5 w-20' />
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-5 w-16' />
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-5 w-28' />
                          </TableCell>
                          <TableCell>
                            <Skeleton className='h-5 w-20' />
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                  {!isLoadingParameters &&
                    parameters.map((param) => {
                      // Determina se a meta está vigente
                      const isCurrentlyActive =
                        !param.dataFimEfetivo ||
                        new Date(param.dataFimEfetivo) >= new Date(todayStr);

                      // Determina se as ações de editar/deletar devem estar habilitadas
                      const periodOfParam = competitionPeriods?.find(
                        (p) => p.id === param.competitionPeriodId
                      );
                      const canModify =
                        periodOfParam?.status === 'PLANEJAMENTO' &&
                        isCurrentlyActive;

                      return (
                        <TableRow
                          key={param.id}
                          className={
                            !param.dataFimEfetivo
                              ? 'bg-sky-50 dark:bg-sky-900/30'
                              : ''
                          }
                        >
                          <TableCell className='font-medium'>
                            {param.nomeParametro}
                          </TableCell>
                          <TableCell>{param.valor}</TableCell>
                          <TableCell>{param.criterio?.nome || '-'}</TableCell>
                          <TableCell>{param.setor?.nome || 'Geral'}</TableCell>
                          <TableCell>
                            {formatDate(param.dataInicioEfetivo)}
                          </TableCell>
                          <TableCell>
                            {param.dataFimEfetivo ? (
                              formatDate(param.dataFimEfetivo)
                            ) : (
                              <span className='italic text-slate-500'>
                                Vigente
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                isCurrentlyActive
                                  ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700'
                                  : 'border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400'
                              }
                            >
                              {isCurrentlyActive ? 'Ativa' : 'Expirada'}
                            </Badge>
                          </TableCell>
                          <TableCell className='max-w-[150px] truncate text-xs'>
                            <Tooltip>
                              <TooltipTrigger className='cursor-help hover:underline'>
                                {param.justificativa
                                  ? `${param.justificativa.substring(0, 30)}${param.justificativa.length > 30 ? '...' : ''}`
                                  : '-'}
                              </TooltipTrigger>
                              <TooltipContent className='max-w-xs whitespace-pre-wrap bg-background p-2 shadow-lg border rounded-md'>
                                <p>
                                  {param.justificativa || 'Sem justificativa.'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className='text-right'>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant='ghost' className='h-8 w-8 p-0'>
                                  <span className='sr-only'>Abrir menu</span>
                                  <MoreHorizontal className='h-4 w-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end'>
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => handleShowHistory(param)}
                                >
                                  <History className='mr-2 h-4 w-4' /> Ver
                                  Histórico
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleOpenEditModal(param)}
                                  disabled={!canModify}
                                >
                                  <Edit className='mr-2 h-4 w-4' /> Editar Meta
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenDeleteModal(param)}
                                  disabled={!canModify}
                                  className='text-red-600 focus:text-red-600 dark:focus:text-red-400 dark:focus:bg-red-900/50'
                                >
                                  <Trash2 className='mr-2 h-4 w-4' /> Expirar
                                  Meta
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
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
                competitionPeriods={competitionPeriods || []}
                criteria={activeCriteria || []}
                sectors={activeSectors || []}
                initialData={{
                  id: editingParameter.id,
                  nomeParametro: editingParameter.nomeParametro,
                  valor: editingParameter.valor,
                  dataInicioEfetivo: todayStr,
                  criterionId: editingParameter.criterionId,
                  sectorId: editingParameter.sectorId,
                  competitionPeriodId: editingParameter.competitionPeriodId,
                  justificativa: '',
                }}
                isUpdate={true}
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
                    {' '}
                    <TableRow>
                      {' '}
                      <TableHead>Valor</TableHead>
                      <TableHead>Início Vigência</TableHead>
                      <TableHead>Fim Vigência</TableHead>{' '}
                      <TableHead>Criado Por</TableHead>
                      <TableHead>Justificativa</TableHead>
                      <TableHead>Data Criação</TableHead>{' '}
                    </TableRow>{' '}
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
