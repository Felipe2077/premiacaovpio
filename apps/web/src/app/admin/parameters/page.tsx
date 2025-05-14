// apps/web/src/app/admin/parameters/page.tsx (AJUSTADO PARA USAR useParameters)
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
// A entidade ParameterValueEntity do backend não deve ser importada diretamente no frontend.
// Usaremos ParameterValueAPI do nosso hook ou uma interface local.
// import type { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { formatDate } from '@/lib/utils'; // Mantenha sua função formatDate
import type { Criterio, Setor } from '@sistema-premiacao/shared-types'; // Bom!
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Edit, History, PlusCircle, Trash2 } from 'lucide-react'; // Importar PlusCircle
import React, { useState } from 'react'; // Adicionar useEffect se necessário
import { CreateParameterDto } from 'shared-types'; // Importar DTO de shared-types
import { Toaster, toast } from 'sonner';

// --- Importar o hook e o tipo de retorno da API ---
import { ParameterValueAPI, useParameters } from '@/hooks/useParameters'; // Ajuste o path se o hook estiver em outro lugar
import { CompetitionPeriod } from '@/types'; // Supondo que você tem um tipo para Período no frontend

// --- Funções de Fetch para Dropdowns (MANTENHA AS SUAS SE JÁ FUNCIONAM BEM) ---
// Ou mova-as para um hook dedicado (ex: useDropdownData.ts)
const fetchActiveCriteriaSimple = async (): Promise<
  Pick<Criterio, 'id' | 'nome'>[]
> => {
  const url = 'http://localhost:3001/api/criteria/active';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar critérios`);
  return res.json();
};

const fetchActiveSectorsSimple = async (): Promise<
  Pick<Setor, 'id' | 'nome'>[]
> => {
  const url = 'http://localhost:3001/api/sectors/active';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar setores`);
  return res.json();
};

// Função para buscar períodos (para o formulário e seletor de período da página)
const fetchCompetitionPeriods = async (): Promise<CompetitionPeriod[]> => {
  const url = 'http://localhost:3001/api/periods'; // Endpoint que lista períodos
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar períodos`);
  return res.json();
};

// --- Componente da Página ---
export default function ParametersPage() {
  const [isParamModalOpen, setIsParamModalOpen] = useState(false);
  const [historyParam, setHistoryParam] = useState<ParameterValueAPI | null>(
    null
  ); // Usar ParameterValueAPI

  // Estado para o período selecionado para exibição das metas
  const [selectedPeriodMesAno, setSelectedPeriodMesAno] =
    useState<string>('2025-04'); // Mês/Ano inicial

  // Busca dados para os dropdowns do formulário e seletor de período da página
  const { data: activeCriteria, isLoading: isLoadingCriteria } = useQuery({
    queryKey: ['activeCriteriaSimple'],
    queryFn: fetchActiveCriteriaSimple,
    staleTime: Infinity,
  });
  const { data: activeSectors, isLoading: isLoadingSectors } = useQuery({
    queryKey: ['activeSectorsSimple'],
    queryFn: fetchActiveSectorsSimple,
    staleTime: Infinity,
  });
  const { data: competitionPeriods, isLoading: isLoadingPeriods } = useQuery({
    queryKey: ['competitionPeriods'],
    queryFn: fetchCompetitionPeriods,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
  });

  // --- USAR O NOVO HOOK useParameters ---
  const {
    parameters, // Esta será a lista de ParameterValueAPI
    isLoadingParameters,
    parametersError,
    // refetchParameters, // Para atualizar a lista
    createParameter,
    isCreatingParameter,
    // createParameterError // Para mostrar erros da criação
  } = useParameters(
    selectedPeriodMesAno, // Passa o período selecionado
    undefined, // sectorId filter (opcional)
    undefined, // criterionId filter (opcional)
    true // onlyActive (listar apenas metas vigentes por padrão)
  );
  // Remover a query antiga:
  // const { data: parameters, isLoading: isLoadingParams, error: errorParams } = useQuery<ParameterValueEntity[]> ...

  // Estados para o formulário (mantenha ou adapte para react-hook-form)
  const [formNomeParametro, setFormNomeParametro] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formCriterionId, setFormCriterionId] = useState<string | undefined>();
  const [formSectorId, setFormSectorId] = useState<string | undefined>(); // 'null' para geral, ID para específico
  const [formCompetitionPeriodId, setFormCompetitionPeriodId] = useState<
    string | undefined
  >(
    competitionPeriods?.find((p) => p.status === 'PLANEJAMENTO')?.id.toString() // Tenta pré-selecionar período em PLANEJAMENTO
  );
  const [formJustificativa, setFormJustificativa] = useState('');
  const [formDataInicio, setFormDataInicio] = useState(
    new Date().toISOString().split('T')[0]
  );

  const handleSaveParameter = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !formCompetitionPeriodId ||
      !formCriterionId ||
      !formValor ||
      !formDataInicio ||
      !formJustificativa
    ) {
      toast.error('Preencha todos os campos obrigatórios para a meta.');
      return;
    }

    const dataToSave: CreateParameterDto = {
      nomeParametro: formNomeParametro || undefined, // Opcional, serviço pode gerar
      valor: formValor,
      dataInicioEfetivo: formDataInicio,
      criterionId: parseInt(formCriterionId, 10),
      sectorId:
        formSectorId === 'null' || formSectorId === undefined
          ? null
          : parseInt(formSectorId, 10),
      competitionPeriodId: parseInt(formCompetitionPeriodId, 10),
      justificativa: formJustificativa,
    };

    try {
      toast.promise(createParameter(dataToSave), {
        // Usa o createParameter do hook
        loading: 'Salvando nova meta...',
        success: (savedParam) => {
          setIsParamModalOpen(false);
          // Limpar formulário
          setFormNomeParametro('');
          setFormValor('');
          setFormCriterionId(undefined);
          setFormSectorId(undefined); /* ... etc ... */
          return `Meta "${savedParam.nomeParametro}" salva com sucesso!`;
        },
        error: (err: any) => err.message || 'Falha ao salvar meta.',
      });
    } catch (error) {
      // O hook useMutation já lida com o log do erro, o toast acima mostra ao usuário.
    }
  };

  const handleShowHistory = (param: ParameterValueAPI) => {
    // Usar ParameterValueAPI
    setHistoryParam(param);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const isLoading =
    isLoadingParameters ||
    isLoadingCriteria ||
    isLoadingSectors ||
    isLoadingPeriods;
  const error = parametersError; // Focar no erro de carregar a lista de parâmetros

  return (
    <TooltipProvider>
      <Toaster position='top-right' richColors />
      <div className='space-y-6'>
        <h1 className='text-2xl font-bold'>Gerenciamento de Parâmetros</h1>

        {/* Seletor de Período para a Tabela */}
        <div className='mb-4 flex items-center space-x-2'>
          <Label htmlFor='period-selector-page'>Período da Premiação:</Label>
          <Select
            value={selectedPeriodMesAno}
            onValueChange={(value) => setSelectedPeriodMesAno(value)}
            disabled={isLoadingPeriods}
            name='period-selector-page'
          >
            <SelectTrigger className='w-[180px]'>
              <SelectValue
                placeholder={
                  isLoadingPeriods ? 'Carregando...' : 'Selecione o Período'
                }
              />
            </SelectTrigger>
            <SelectContent>
              {competitionPeriods?.map((period) => (
                <SelectItem key={period.id} value={period.mesAno}>
                  {period.mesAno} ({period.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error &&
          !isLoadingParameters && ( // Mostra erro se houver ao carregar lista
            <Alert variant='destructive' className='mb-4'>
              <AlertCircle className='h-4 w-4' />
              <AlertTitle>Erro ao Carregar Metas do Período</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

        <Card>
          <CardHeader>
            <div className='flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2'>
              <div>
                <CardTitle>
                  Metas para {selectedPeriodMesAno || '...'}
                </CardTitle>
                <CardDescription>
                  Regras de negócio e metas vigentes para a premiação no período
                  selecionado.
                </CardDescription>
              </div>
              <Dialog
                open={isParamModalOpen}
                onOpenChange={setIsParamModalOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    size='sm'
                    disabled={
                      isLoadingCriteria ||
                      isLoadingSectors ||
                      isLoadingPeriods ||
                      isCreatingParameter
                    }
                  >
                    <PlusCircle className='mr-2 h-4 w-4' /> Nova Meta
                  </Button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-[500px]'>
                  <DialogHeader>
                    <DialogTitle>Definir Nova Meta</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes. A vigência começará na data de
                      início informada.
                    </DialogDescription>
                  </DialogHeader>
                  {/* --- FORMULÁRIO --- */}
                  <form onSubmit={handleSaveParameter}>
                    <div className='grid gap-4 py-4'>
                      {/* Período de Competição (Select) */}
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-period' className='text-right'>
                          Período
                        </Label>
                        <Select
                          name='param-period'
                          required
                          value={formCompetitionPeriodId}
                          onValueChange={setFormCompetitionPeriodId}
                          disabled={isLoadingPeriods}
                        >
                          <SelectTrigger className='col-span-3'>
                            <SelectValue
                              placeholder={
                                isLoadingPeriods
                                  ? 'Carregando...'
                                  : 'Selecione...'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {competitionPeriods
                              ?.filter((p) => p.status === 'PLANEJAMENTO')
                              .map(
                                (
                                  p // Sugere apenas períodos em PLANEJAMENTO
                                ) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.mesAno} ({p.status})
                                  </SelectItem>
                                )
                              )}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Nome Parâmetro (Opcional, pode ser gerado) */}
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-name' className='text-right'>
                          Nome (Opc)
                        </Label>
                        <Input
                          id='param-name'
                          value={formNomeParametro}
                          onChange={(e) => setFormNomeParametro(e.target.value)}
                          placeholder='Ex: META_IPK_GAMA'
                          className='col-span-3'
                        />
                      </div>
                      {/* Valor */}
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-value' className='text-right'>
                          Valor*
                        </Label>
                        <Input
                          id='param-value'
                          value={formValor}
                          onChange={(e) => setFormValor(e.target.value)}
                          placeholder='Ex: 3.1, 150'
                          className='col-span-3'
                          required
                        />
                      </div>
                      {/* Critério (Select) */}
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-crit' className='text-right'>
                          Critério*
                        </Label>
                        <Select
                          name='param-crit'
                          required
                          value={formCriterionId}
                          onValueChange={setFormCriterionId}
                          disabled={isLoadingCriteria}
                        >
                          <SelectTrigger className='col-span-3'>
                            <SelectValue
                              placeholder={
                                isLoadingCriteria
                                  ? 'Carregando...'
                                  : 'Selecione...'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {activeCriteria?.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Setor (Select) */}
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-setor' className='text-right'>
                          Setor (Opc)
                        </Label>
                        <Select
                          name='param-setor'
                          value={formSectorId}
                          onValueChange={setFormSectorId}
                          disabled={isLoadingSectors}
                        >
                          <SelectTrigger className='col-span-3'>
                            <SelectValue
                              placeholder={
                                isLoadingSectors
                                  ? 'Carregando...'
                                  : 'Geral ou Específico...'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='null'>Nenhum (Geral)</SelectItem>
                            {activeSectors?.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {/* Início Vigência */}
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-date' className='text-right'>
                          Início Vigência*
                        </Label>
                        <Input
                          id='param-date'
                          type='date'
                          value={formDataInicio}
                          onChange={(e) => setFormDataInicio(e.target.value)}
                          className='col-span-3'
                          required
                        />
                      </div>
                      {/* Justificativa */}
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-just' className='text-right'>
                          Justificativa*
                        </Label>
                        <Textarea
                          id='param-just'
                          value={formJustificativa}
                          onChange={(e) => setFormJustificativa(e.target.value)}
                          placeholder='Detalhe o motivo...'
                          className='col-span-3'
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => setIsParamModalOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type='submit' disabled={isCreatingParameter}>
                        {isCreatingParameter
                          ? 'Salvando...'
                          : 'Salvar Parâmetro'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {/* Filtros Placeholders - TODO: Implementar */}
            {/* ... */}
          </CardHeader>
          <CardContent>
            {isLoadingParameters && (
              <div className='space-y-3 mt-2'>
                <Skeleton className='h-8 w-1/4 mb-2' />
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className='h-10 w-full mb-1' />
                ))}
              </div>
            )}
            {!isLoadingParameters && parametersError && (
              <Alert variant='destructive'>
                <AlertCircle className='h-4 w-4' />{' '}
                <AlertTitle>Erro!</AlertTitle>{' '}
                <AlertDescription>{parametersError.message}</AlertDescription>
              </Alert>
            )}
            {!isLoadingParameters && !parametersError && parameters && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead> <TableHead>Valor</TableHead>{' '}
                    <TableHead>Critério</TableHead> <TableHead>Setor</TableHead>
                    <TableHead>Início</TableHead> <TableHead>Fim</TableHead>{' '}
                    <TableHead>Status</TableHead>
                    <TableHead>Justificativa</TableHead>{' '}
                    <TableHead className='text-right'>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parameters.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className='text-center h-24'>
                        Nenhuma meta encontrada para este período.
                      </TableCell>
                    </TableRow>
                  )}
                  {parameters.map((param) => {
                    const isVigente =
                      !param.dataFimEfetivo ||
                      new Date(param.dataFimEfetivo) >= new Date(todayStr);
                    return (
                      <TableRow key={param.id}>
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
                          {param.dataFimEfetivo
                            ? formatDate(param.dataFimEfetivo)
                            : 'Vigente'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isVigente ? 'default' : 'outline'}>
                            {isVigente ? 'Ativa' : 'Expirada'}
                          </Badge>
                        </TableCell>
                        <TableCell className='max-w-[150px] truncate'>
                          <Tooltip>
                            <TooltipTrigger className='cursor-help'>
                              {param.justificativa?.substring(0, 20) || '-'}
                              {param.justificativa &&
                              param.justificativa.length > 20
                                ? '...'
                                : ''}
                            </TooltipTrigger>
                            <TooltipContent>
                              {param.justificativa}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className='text-right'>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => handleShowHistory(param)}
                            aria-label='Histórico'
                          >
                            <History className='h-4 w-4' />
                          </Button>
                          {/* TODO: Adicionar botões de Editar e Deletar que abrem modais/chamam funções */}
                          <Button
                            variant='ghost'
                            size='icon'
                            disabled
                            /* onClick={() => handleOpenEditModal(param)} */ aria-label='Editar'
                          >
                            <Edit className='h-4 w-4' />
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            disabled
                            /* onClick={() => handleOpenDeleteModal(param)} */ aria-label='Deletar'
                          >
                            <Trash2 className='h-4 w-4 text-red-500' />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        {/* Modal de Histórico (mantenha sua lógica atual com dados fake ou adapte para buscar histórico real) */}
        <Dialog
          open={!!historyParam}
          onOpenChange={(isOpen) => {
            if (!isOpen) setHistoryParam(null);
          }}
        >
          <DialogContent className='sm:max-w-4xl'>
            <DialogHeader>
              <DialogTitle>
                Histórico: {historyParam?.nomeParametro}
              </DialogTitle>
            </DialogHeader>
            <div className='py-4 max-h-[400px] overflow-y-auto'>
              {' '}
              Placeholder para Tabela de Histórico{' '}
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
