// apps/web/src/app/admin/parameters/page.tsx (VERSÃO COMPLETA COM MODAL FAKE)
'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // Para erros
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'; // Card completo
import {
  Dialog,
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
import { Skeleton } from '@/components/ui/skeleton'; // Para loading
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
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, History } from 'lucide-react'; // Importar ícones
import React, { useState } from 'react'; // Importar React e useState
import { Toaster, toast } from 'sonner'; // Importar Toaster e toast
// Tipos - Usando entidade por enquanto
import type { ParameterValueEntity } from '@/entity/parameter-value.entity';
import type { Criterio, Setor } from '@sistema-premiacao/shared-types';
// Funções Helper
import { formatDate } from '@/lib/utils';

// --- Funções de Fetch COMPLETAS ---
const fetchCurrentParameters = async (): Promise<ParameterValueEntity[]> => {
  const res = await fetch('http://localhost:3001/api/parameters/current');
  if (!res.ok) {
    const errorText = await res.text().catch(() => `Erro ${res.status}`);
    console.error('Erro API Parâmetros:', errorText);
    throw new Error(`Erro ${res.status} ao buscar parâmetros`);
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error('Resposta inválida da API de parâmetros');
  }
};

const fetchActiveCriteriaSimple = async (): Promise<
  Pick<Criterio, 'id' | 'nome'>[]
> => {
  const res = await fetch('http://localhost:3001/api/criteria/active');
  if (!res.ok) {
    const errorText = await res.text().catch(() => `Erro ${res.status}`);
    console.error('Erro API Critérios:', errorText);
    throw new Error(`Erro ${res.status} ao buscar critérios ativos`);
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error('Resposta inválida da API de critérios.');
  }
};

const fetchActiveSectorsSimple = async (): Promise<
  Pick<Setor, 'id' | 'nome'>[]
> => {
  const res = await fetch('http://localhost:3001/api/sectors/active');
  if (!res.ok) {
    const errorText = await res.text().catch(() => `Erro ${res.status}`);
    console.error('Erro API Setores:', errorText);
    throw new Error(`Erro ${res.status} ao buscar setores ativos`);
  }
  try {
    return await res.json();
  } catch (e) {
    throw new Error('Resposta inválida da API de setores.');
  }
};

// --- Componente da Página ---
export default function ParametersPage() {
  // Estado do Modal
  const [isParamModalOpen, setIsParamModalOpen] = useState(false);

  // Queries para buscar dados
  const {
    data: parameters,
    isLoading: isLoadingParams,
    error: errorParams,
  } = useQuery<ParameterValueEntity[]>({
    queryKey: ['currentParameters'],
    queryFn: fetchCurrentParameters,
  });
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

  // Handler Fake COMPLETO
  const handleSaveParameter = (event: React.FormEvent) => {
    event.preventDefault();
    console.log('Simulando salvar parâmetro...');
    toast.success('Parâmetro salvo com sucesso! (Simulação MVP)');
    setIsParamModalOpen(false); // Fecha o modal
  };

  // Determina data atual
  const todayStr = new Date().toISOString().split('T')[0];
  // Combina estados de loading e erro
  const isLoading = isLoadingParams || isLoadingCriteria || isLoadingSectors;
  const error = errorParams; // Prioriza erro de parâmetros para a tabela principal

  return (
    <TooltipProvider>
      {/* Toaster precisa estar no layout ou aqui */}
      <Toaster position='top-right' richColors />
      <div className='space-y-6'>
        <h1 className='text-2xl font-bold'>Gerenciamento de Parâmetros</h1>

        {/* Mostra erro principal se houver */}
        {error && (
          <Alert variant='destructive' className='mb-4'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Erro ao Carregar Parâmetros</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Erro desconhecido'}
            </AlertDescription>
          </Alert>
        )}

        {/* Card de Parâmetros */}
        <Card>
          <CardHeader>
            <div className='flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2'>
              <div>
                <CardTitle>Parâmetros Atuais</CardTitle>
                <CardDescription>
                  Regras de negócio e metas vigentes para a premiação.
                </CardDescription>
              </div>
              {/* --- Botão e Modal para Novo Parâmetro --- */}
              <Dialog
                open={isParamModalOpen}
                onOpenChange={setIsParamModalOpen}
              >
                <DialogTrigger asChild>
                  {/* Desabilitar botão se dados dos selects ainda não carregaram */}
                  <Button
                    size='sm'
                    disabled={isLoadingCriteria || isLoadingSectors}
                  >
                    + Novo Parâmetro/Meta
                  </Button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-[500px]'>
                  <DialogHeader>
                    <DialogTitle>Definir Novo Parâmetro/Meta</DialogTitle>
                    <DialogDescription>
                      Preencha os detalhes. A vigência começará na data de
                      início informada. A justificativa é obrigatória.
                    </DialogDescription>
                  </DialogHeader>
                  {/* Formulário Fake */}
                  <form onSubmit={handleSaveParameter}>
                    <div className='grid gap-4 py-4'>
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-name' className='text-right'>
                          Nome
                        </Label>
                        <Input
                          id='param-name'
                          placeholder='Ex: META_IPK_GAMA, PESO_CRITERIO_X'
                          className='col-span-3'
                          required
                        />
                      </div>
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-value' className='text-right'>
                          Valor
                        </Label>
                        <Input
                          id='param-value'
                          placeholder='Ex: 3.1, 150, true'
                          className='col-span-3'
                          required
                        />
                      </div>
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-crit' className='text-right'>
                          Critério (Opc)
                        </Label>
                        <Select name='param-crit' disabled={isLoadingCriteria}>
                          <SelectTrigger className='col-span-3'>
                            <SelectValue
                              placeholder={
                                isLoadingCriteria
                                  ? 'Carregando...'
                                  : 'Geral ou Específico...'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='null'>Nenhum (Geral)</SelectItem>
                            {activeCriteria?.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-setor' className='text-right'>
                          Setor (Opc)
                        </Label>
                        <Select name='param-setor' disabled={isLoadingSectors}>
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
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-date' className='text-right'>
                          Início Vigência
                        </Label>
                        <Input
                          id='param-date'
                          type='date'
                          defaultValue={todayStr}
                          className='col-span-3'
                          required
                        />
                      </div>
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='param-just' className='text-right'>
                          Justificativa
                        </Label>
                        <Textarea
                          id='param-just'
                          placeholder='Detalhe o motivo da criação/alteração...'
                          className='col-span-3'
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type='submit'>Salvar (Simulação)</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              {/* --- FIM BOTÃO/MODAL --- */}
            </div>
            {/* Filtros Placeholders */}
            <div className='flex gap-2 pt-4'>
              <Input
                placeholder='Buscar parâmetro...'
                className='max-w-xs'
                disabled
              />
              <Select disabled>
                <SelectTrigger className='w-[180px]'>
                  <SelectValue placeholder='Filtrar...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='null'>...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {/* Seção da Tabela */}
            {isLoadingParams && (
              // Skeleton Loader para a tabela
              <div className='space-y-3 mt-2'>
                <div className='flex justify-between space-x-2'>
                  <Skeleton className='h-5 flex-1' />
                  <Skeleton className='h-5 flex-1' />
                  <Skeleton className='h-5 flex-1' />
                  <Skeleton className='h-5 flex-1' />
                </div>
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className='h-8 w-full' />
                ))}
              </div>
            )}
            {!isLoadingParams &&
              parameters && ( // Só renderiza tabela se não estiver carregando e tiver dados
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parâmetro</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Critério</TableHead>
                      <TableHead>Setor</TableHead> <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead> <TableHead>Status</TableHead>
                      <TableHead>Justificativa</TableHead>
                      <TableHead>Hist.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parameters.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className='text-center h-24'>
                          Nenhum parâmetro vigente encontrado.
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
                          <TableCell>{param.criterio?.nome ?? '-'}</TableCell>
                          <TableCell>{param.setor?.nome ?? '-'}</TableCell>
                          <TableCell>
                            {formatDate(param.dataInicioEfetivo)}
                          </TableCell>
                          <TableCell>
                            {param.dataFimEfetivo
                              ? formatDate(param.dataFimEfetivo)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={isVigente ? 'default' : 'outline'}
                              className={
                                isVigente
                                  ? 'bg-green-600 hover:bg-green-700 text-white dark:bg-green-700 dark:text-green-100'
                                  : ''
                              }
                            >
                              {isVigente ? 'Vigente' : 'Expirado'}
                            </Badge>
                          </TableCell>
                          <TableCell className='max-w-[150px] truncate'>
                            <Tooltip>
                              <TooltipTrigger className='hover:underline cursor-help'>
                                {param.justificativa ?? '-'}
                              </TooltipTrigger>
                              <TooltipContent>
                                {param.justificativa}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger>
                                <History className='h-4 w-4 text-gray-400 cursor-pointer hover:text-primary' />
                              </TooltipTrigger>
                              <TooltipContent>
                                Ver histórico (Em breve)
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

// Não esqueça export default se usar import default
// export default ParametersPage;
