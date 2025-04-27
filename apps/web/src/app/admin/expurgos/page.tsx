// apps/web/src/app/admin/expurgos/page.tsx (VERSÃO REALMENTE COMPLETA E CORRIGIDA)
'use client';

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
import {
  Table,
  TableBody,
  TableCaption,
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
import type { ExpurgoEventEntity } from '@/entity/expurgo-event.entity'; // OK, frontend usa entidade diretamente por ora
import { formatDate } from '@/lib/utils'; // OK
import type { Criterio, Setor } from '@sistema-premiacao/shared-types'; // OK
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { toast } from 'sonner';

// --- Funções de Fetch COMPLETAS ---

const fetchExpurgos = async (): Promise<ExpurgoEventEntity[]> => {
  const url = 'http://localhost:3001/api/expurgos';
  console.log(`Workspace: Chamando ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Workspace: Status para ${url}: ${res.status}`);
    if (!res.ok) {
      const errorBody = await res.text().catch(() => `Erro ${res.status}`);
      console.error(`Workspace failed for ${url}:`, errorBody);
      throw new Error(`Erro ${res.status} ao buscar expurgos`);
    }
    const text = await res.text();
    if (!text) {
      console.log(`Workspace: Resposta OK para ${url} mas corpo vazio.`);
      return [];
    }
    const data = JSON.parse(text);
    console.log(`Workspace OK Parsed para ${url}:`, data);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Workspace EXCEPTION para ${url}:`, error);
    if (error instanceof Error) throw error;
    throw new Error('Erro desconhecido durante fetch ou parse de expurgos.');
  }
};

const fetchActiveCriteriaSimple = async (): Promise<
  Pick<Criterio, 'id' | 'nome' | 'index'>[]
> => {
  const url = 'http://localhost:3001/api/criteria/active';
  console.log(`Workspace: Chamando ${url}`);
  try {
    const res = await fetch(url);
    console.log(`Workspace: Status para ${url}: ${res.status}`);
    if (!res.ok) {
      const errorBody = await res.text().catch(() => `Erro ${res.status}`);
      console.error(`Workspace failed for ${url}:`, errorBody);
      throw new Error(`Erro ${res.status} ao buscar critérios ativos`);
    }
    const text = await res.text();
    if (!text) {
      console.log(`Workspace: Resposta OK para ${url} mas corpo vazio.`);
      return [];
    }
    const data = JSON.parse(text);
    console.log(`Workspace OK Parsed para ${url}:`, data);
    // Adicionar validação mínima se quiser
    if (
      !Array.isArray(data) ||
      !data.every(
        (item) =>
          typeof item.id === 'number' &&
          typeof item.nome ===
            'string' /*&& (typeof item.index === 'number' || item.index === null)*/
      )
    ) {
      console.error(
        'Formato inesperado recebido de /api/criteria/active:',
        data
      );
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
      const errorBody = await res.text().catch(() => `Erro ${res.status}`);
      console.error(`Workspace failed for ${url}:`, errorBody);
      throw new Error(`Erro ${res.status} ao buscar setores ativos`);
    }
    const text = await res.text();
    if (!text) {
      console.log(`Workspace: Resposta OK para ${url} mas corpo vazio.`);
      return [];
    }
    const data = JSON.parse(text);
    console.log(`Workspace OK Parsed para ${url}:`, data);
    // Adicionar validação mínima se quiser
    if (
      !Array.isArray(data) ||
      !data.every(
        (item) => typeof item.id === 'number' && typeof item.nome === 'string'
      )
    ) {
      console.error(
        'Formato inesperado recebido de /api/sectors/active:',
        data
      );
      throw new Error('Resposta inválida da API de setores.');
    }
    return data;
  } catch (error) {
    console.error(`Workspace EXCEPTION para ${url}:`, error);
    if (error instanceof Error) throw error;
    throw new Error('Erro desconhecido durante fetch ou parse de setores.');
  }
};
// -----------------------------

// --- Componente da Página ---
export default function ExpurgosPage() {
  const [isExpurgoModalOpen, setIsExpurgoModalOpen] = useState(false);

  // Queries - AGORA COM FETCHERS COMPLETOS
  const {
    data: expurgos,
    isLoading: isLoadingExpurgos,
    error: errorExpurgos,
  } = useQuery<ExpurgoEventEntity[]>({
    queryKey: ['expurgos'],
    queryFn: fetchExpurgos,
  });
  const {
    data: activeCriteria,
    isLoading: isLoadingCriteria,
    error: errorCriteria,
  } = useQuery({
    queryKey: ['activeCriteriaSimple'],
    queryFn: fetchActiveCriteriaSimple,
    staleTime: Infinity,
  });
  const {
    data: activeSectors,
    isLoading: isLoadingSectors,
    error: errorSectors,
  } = useQuery({
    queryKey: ['activeSectorsSimple'],
    queryFn: fetchActiveSectorsSimple,
    staleTime: Infinity,
  });

  // Handler Fake COMPLETO
  const handleRegisterExpurgo = (event: React.FormEvent) => {
    event.preventDefault();
    console.log('Simulando registrar expurgo...');
    toast.info('Registro de Expurgo enviado! (Simulação MVP)');
    setIsExpurgoModalOpen(false);
  };

  // Filtra critérios elegíveis
  const eligibleCriteria = activeCriteria?.filter((c) =>
    [3, 4, 11].includes(c.id)
  ); // CONFIRA OS IDs!

  // Combina estados de loading e erro
  const isLoading = isLoadingExpurgos || isLoadingCriteria || isLoadingSectors;
  const error = errorExpurgos || errorCriteria || errorSectors;

  return (
    <TooltipProvider>
      <div>
        {/* Toaster precisa estar em algum lugar do layout pai ou aqui */}
        {/* <Toaster position="top-right" richColors /> */}
        <h1 className='text-2xl font-bold'>Gestão de Expurgos</h1>

        {error && (
          <p className='text-red-500 font-semibold mb-4'>
            Erro: {error instanceof Error ? error.message : 'Erro desconhecido'}
          </p>
        )}

        {/* Card de Expurgos */}
        <Card>
          <CardHeader>
            <div className='flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2'>
              <div>
                <CardTitle>Expurgos Registrados (MVP)</CardTitle>
                <CardDescription>
                  Demonstração do registro auditado de expurgos autorizados.
                </CardDescription>
              </div>
              {/* Botão e Modal */}
              <Dialog
                open={isExpurgoModalOpen}
                onOpenChange={setIsExpurgoModalOpen}
              >
                <DialogTrigger asChild>
                  <Button size='sm' variant='outline' disabled={isLoading}>
                    Registrar Novo Expurgo
                  </Button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-[500px]'>
                  <DialogHeader>
                    <DialogTitle>Registrar Expurgo</DialogTitle>
                    <DialogDescription>
                      Informe dados do evento e justificativa/autorização.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleRegisterExpurgo}>
                    <div className='grid gap-4 py-4'>
                      {/* Formulário Expurgo */}
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='exp-setor' className='text-right'>
                          Filial
                        </Label>
                        <Select
                          required
                          name='exp-setor'
                          disabled={!activeSectors}
                        >
                          <SelectTrigger className='col-span-3'>
                            <SelectValue
                              placeholder={
                                isLoadingSectors
                                  ? 'Carregando...'
                                  : 'Selecione...'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {activeSectors?.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='exp-crit' className='text-right'>
                          Critério
                        </Label>
                        <Select
                          required
                          name='exp-crit'
                          disabled={!eligibleCriteria}
                        >
                          <SelectTrigger className='col-span-3'>
                            <SelectValue
                              placeholder={
                                isLoadingCriteria
                                  ? 'Carregando...'
                                  : 'Selecione elegível...'
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {eligibleCriteria?.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='exp-date' className='text-right'>
                          Data Evento
                        </Label>
                        <Input
                          id='exp-date'
                          type='date'
                          className='col-span-3'
                          required
                        />
                      </div>
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='exp-desc' className='text-right'>
                          Descrição (Opc)
                        </Label>
                        <Textarea
                          id='exp-desc'
                          placeholder='Descreva o evento específico...'
                          className='col-span-3'
                        />
                      </div>
                      <div className='grid grid-cols-4 items-center gap-4'>
                        <Label htmlFor='exp-just' className='text-right'>
                          Justificativa
                        </Label>
                        <Textarea
                          id='exp-just'
                          placeholder='Detalhe o motivo e a autorização...'
                          className='col-span-3'
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type='submit'>Registrar (Simulação)</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {/* Filtros Placeholders */}
            <div className='flex gap-2 pt-4'>
              <Input placeholder='Filtrar...' className='max-w-xs' disabled />
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
            {/* Usa isLoading combinado para tabela */}
            {isLoading && <p>Carregando dados...</p>}
            {!isLoading && error && (
              <p className='text-red-500'>
                Falha ao carregar alguns dados necessários.
              </p>
            )}
            {/* Mensagem genérica se houver erro */}
            {/* Renderiza tabela apenas se não estiver carregando E não houver erro GERAL E tiver dados de expurgo */}
            {!isLoading && !error && expurgos && (
              <Table>
                <TableCaption>
                  Lista de eventos expurgados manualmente com autorização.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Evento</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead>Critério</TableHead>
                    <TableHead>Justificativa</TableHead>
                    <TableHead>Registrado Por</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expurgos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className='text-center h-24'>
                        Nenhum expurgo registrado.
                      </TableCell>
                    </TableRow>
                  )}
                  {expurgos.map((exp) => (
                    <TableRow key={exp.id}>
                      <TableCell>{formatDate(exp.dataEvento)}</TableCell>
                      <TableCell>
                        {exp.setor?.nome ?? `ID ${exp.sectorId}`}
                      </TableCell>
                      <TableCell>
                        {exp.criterio?.nome ?? `ID ${exp.criterionId}`}
                      </TableCell>
                      <TableCell className='text-xs max-w-[200px] truncate'>
                        <Tooltip>
                          <TooltipTrigger className='hover:underline cursor-help'>
                            {exp.justificativa
                              ? `${exp.justificativa.substring(0, 40)}...`
                              : '-'}
                          </TooltipTrigger>
                          <TooltipContent>{exp.justificativa}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {exp.registradoPor?.nome ??
                          `ID ${exp.registradoPorUserId}`}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            exp.status === 'APLICADO_MVP'
                              ? 'default'
                              : 'secondary'
                          }
                          className={
                            exp.status === 'APLICADO_MVP'
                              ? 'bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:text-blue-100'
                              : ''
                          }
                        >
                          {exp.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
