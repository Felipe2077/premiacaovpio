// apps/web/src/app/admin/parameters/page.tsx (VERSÃO COMPLETA CORRIGIDA V3)
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
} from '@/components/ui/table'; // Removido TableCaption não usado aqui
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { formatDate } from '@/lib/utils';
import type { Criterio, Setor } from '@sistema-premiacao/shared-types';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, History } from 'lucide-react';
import React, { useState } from 'react';
import { Toaster, toast } from 'sonner';

// --- Funções de Fetch COMPLETAS ---
const fetchCurrentParameters = async (): Promise<ParameterValueEntity[]> => {
  const url = 'http://localhost:3001/api/parameters/current';
  console.log(`Workspace: Chamando ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Workspace: Status para ${url}: ${res.status}`);
    if (!res.ok) {
      throw new Error(`Erro ${res.status} ao buscar parâmetros`);
    }
    const data = await res.json();
    console.log(`Workspace OK Parsed para ${url}: ${data?.length} items`);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Workspace EXCEPTION para ${url}:`, error);
    if (error instanceof Error) throw error;
    throw new Error('Erro desconhecido durante fetch ou parse de parâmetros.');
  }
};

const fetchActiveCriteriaSimple = async (): Promise<
  Pick<Criterio, 'id' | 'nome'>[]
> => {
  const url = 'http://localhost:3001/api/criteria/active';
  console.log(`Workspace: Chamando ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Workspace: Status para ${url}: ${res.status}`);
    if (!res.ok) {
      throw new Error(`Erro ${res.status} ao buscar critérios ativos`);
    }
    const data = await res.json();
    console.log(`Workspace OK Parsed para ${url}: ${data?.length} items`);
    if (
      !Array.isArray(data) ||
      !data.every(
        (item) => typeof item.id === 'number' && typeof item.nome === 'string'
      )
    ) {
      throw new Error('Resposta inválida da API de critérios.');
    }
    return data;
  } catch (error) {
    console.error(`Workspace EXCEPTION para ${url}:`, error);
    if (error instanceof Error) throw error;
    throw new Error('Erro desconhecido durante fetch ou parse de critérios.');
  }
};

const fetchActiveSectorsSimple = async (): Promise<
  Pick<Setor, 'id' | 'nome'>[]
> => {
  const url = 'http://localhost:3001/api/sectors/active';
  console.log(`Workspace: Chamando ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Workspace: Status para ${url}: ${res.status}`);
    if (!res.ok) {
      throw new Error(`Erro ${res.status} ao buscar setores ativos`);
    }
    const data = await res.json();
    console.log(`Workspace OK Parsed para ${url}: ${data?.length} items`);
    if (
      !Array.isArray(data) ||
      !data.every(
        (item) => typeof item.id === 'number' && typeof item.nome === 'string'
      )
    ) {
      throw new Error('Resposta inválida da API de setores.');
    }
    return data;
  } catch (error) {
    console.error(`Workspace EXCEPTION para ${url}:`, error);
    if (error instanceof Error) throw error;
    throw new Error('Erro desconhecido durante fetch ou parse de setores.');
  }
};

// --- Componente da Página ---
export default function ParametersPage() {
  // Estados dos Modais
  const [isParamModalOpen, setIsParamModalOpen] = useState(false);
  const [historyParam, setHistoryParam] = useState<ParameterValueEntity | null>(
    null
  );

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

  // Handler Fake para Salvar Parâmetro
  const handleSaveParameter = (event: React.FormEvent) => {
    event.preventDefault();
    toast.success('Parâmetro salvo! (Simulação)');
    setIsParamModalOpen(false);
  };

  // Handler para abrir modal de histórico
  const handleShowHistory = (param: ParameterValueEntity) => {
    setHistoryParam(param);
  };

  const todayStr = new Date().toISOString().split('T')[0];
  // Prioriza erro dos parâmetros para a tabela principal, mas considera outros para loading geral talvez
  const isLoading = isLoadingParams; // Loading principal é o da tabela
  const error = errorParams;

  return (
    <TooltipProvider>
      {/* Toaster precisa estar em algum lugar (aqui ou no layout) */}
      <Toaster position='top-right' richColors />
      <div className='space-y-6'>
        <h1 className='text-2xl font-bold'>Gerenciamento de Parâmetros</h1>
        {/* Mostra erro principal se houver */}
        {error && !isLoading && (
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
                  {/* Conteúdo do Dialog Novo Parâmetro ... */}
                  <DialogHeader>
                    <DialogTitle>Definir Novo Parâmetro/Meta</DialogTitle>
                    <DialogDescription> ... </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveParameter}>
                    <div className='grid gap-4 py-4'>
                      {/* ... Campos ... */}
                    </div>
                    <DialogFooter>
                      <Button type='submit'>Salvar (Simulação)</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              {/* --- FIM Botão/Modal NOVO PARÂMETRO --- */}
            </div>
            {/* Filtros Placeholders */}
            <div className='flex gap-2 pt-4'>
              <Input placeholder='Buscar...' className='max-w-xs' disabled />
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
          {/* ========================================================== */}
          {/* GARANTIR QUE A TABELA ESTEJA DENTRO DO CardContent    */}
          {/* ========================================================== */}
          <CardContent>
            {isLoadingParams && (
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
            {!isLoadingParams && errorParams && (
              /* Erro já tratado acima, pode remover aqui se quiser */ <p className='text-red-500'>
                Erro ao carregar.
              </p>
            )}
            {!isLoadingParams &&
              !errorParams &&
              parameters && ( // Renderiza a tabela AQUI DENTRO
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parâmetro</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Critério</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Justificativa</TableHead>
                      <TableHead>Hist.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parameters.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className='text-center h-24'>
                          Nenhum parâmetro.
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
                              className={isVigente ? 'bg-green-600...' : ''}
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
                            {/* Botão que abre o modal de Histórico */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  onClick={() => handleShowHistory(param)}
                                  aria-label='Ver histórico'
                                >
                                  <History className='h-4 w-4 text-muted-foreground hover:text-primary' />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver histórico</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
          </CardContent>
          {/* ========================================================== */}
          {/* FIM CardContent                                       */}
          {/* ========================================================== */}
        </Card>
        {/* Fim do Card Principal */}
        {/* --- MODAL DE HISTÓRICO DE PARÂMETRO (FAKE) --- */}
        {/* Estrutura do modal permanece a mesma, fora do Card */}
        <Dialog
          open={!!historyParam}
          onOpenChange={(isOpen) => {
            if (!isOpen) setHistoryParam(null);
          }}
        >
          {/* Aumentar largura máxima do modal em telas sm ou maiores */}
          <DialogContent className='sm:max-w-2xl'>
            {/* <-- MUDANÇA AQUI (ex: 2xl) */}
            <DialogHeader>
              <DialogTitle>
                Histórico de Alterações: {historyParam?.nomeParametro}
              </DialogTitle>
              <DialogDescription>
                Visualização (simulada para MVP) das mudanças aplicadas.
              </DialogDescription>
            </DialogHeader>
            {/* Adicionar overflow e talvez borda/rounded ao redor da tabela */}
            <div className='py-4 max-h-[400px] overflow-y-auto border rounded-md overflow-x-auto w-full'>
              {/* <-- MUDANÇA AQUI */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Valor Antigo</TableHead>
                    <TableHead>Valor Novo</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Justificativa</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Linha 1 (Mostra transição do valor anterior para o ATUAL) */}
                  <TableRow>
                    <TableCell className='text-muted-foreground'>
                      {/* Valor anterior FAKE - Idealmente viria do penúltimo registro real */}
                      {(parseFloat(historyParam?.valor ?? '0') - 0.1).toFixed(
                        2
                      )}{' '}
                      {/* Exemplo Fake */}
                    </TableCell>
                    <TableCell>{historyParam?.valor ?? '-'}</TableCell>
                    <TableCell>
                      {formatDate(historyParam?.dataInicioEfetivo)}
                    </TableCell>
                    <TableCell>
                      {historyParam?.dataFimEfetivo
                        ? formatDate(historyParam.dataFimEfetivo)
                        : 'Vigente'}
                    </TableCell>
                    <TableCell>
                      {historyParam?.criadoPor?.nome ?? 'Admin Sistema'}
                    </TableCell>
                    <TableCell className='text-xs max-w-[150px] truncate'>
                      <Tooltip>
                        <TooltipTrigger className='hover:underline cursor-help'>
                          {historyParam?.justificativa
                            ? `${historyParam.justificativa.substring(0, 30)}...`
                            : '-'}
                        </TooltipTrigger>
                        <TooltipContent>
                          {historyParam?.justificativa}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  {/* Linha 2 (Mock Hardcoded - Exemplo) */}
                  <TableRow className='bg-muted/30'>
                    <TableCell className='text-muted-foreground'>
                      2.90
                    </TableCell>
                    <TableCell className='text-muted-foreground'>
                      3.00
                    </TableCell>
                    <TableCell>01/01/2025</TableCell>
                    {/* CORRIGIDO: Mostra a data de início do registro ATUAL como FIM do anterior */}
                    <TableCell>
                      {formatDate(historyParam?.dataInicioEfetivo)}
                    </TableCell>
                    <TableCell>Diretor Exemplo</TableCell>
                    <TableCell className='text-xs max-w-[150px] truncate text-muted-foreground'>
                      <Tooltip>
                        <TooltipTrigger className='hover:underline cursor-help'>
                          Ajuste Q2...
                        </TooltipTrigger>
                        <TooltipContent>
                          Ajuste início Q2 conforme planejamento
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  {/* Linha 3 (Mock Hardcoded - Exemplo) */}
                  <TableRow>
                    <TableCell className='text-muted-foreground'>-</TableCell>
                    <TableCell className='text-muted-foreground'>
                      2.90
                    </TableCell>
                    <TableCell>01/10/2024</TableCell>
                    <TableCell>31/12/2024</TableCell>
                    <TableCell>Sistema</TableCell>
                    <TableCell className='text-xs max-w-[150px] truncate text-muted-foreground'>
                      <Tooltip>
                        <TooltipTrigger className='hover:underline cursor-help'>
                          Criação inicial...
                        </TooltipTrigger>
                        <TooltipContent>
                          Definição inicial do parâmetro para Q4 2024
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
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
        {/* --- FIM MODAL HISTÓRICO --- */}
      </div>
      {/* Fim div space-y-6 */}
    </TooltipProvider>
  );
}
