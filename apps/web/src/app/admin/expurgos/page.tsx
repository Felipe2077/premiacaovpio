// apps/web/src/app/admin/expurgos/page.tsx
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
import type { ExpurgoEventEntity } from '@/entity/expurgo-event.entity';
import { formatDate } from '@/lib/utils';
import type { Criterio, Setor } from '@sistema-premiacao/shared-types';
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import { toast } from 'sonner'; // Só toast é necessário aqui

// --- Funções de Fetch ---
const fetchExpurgos = async (): Promise<ExpurgoEventEntity[]> => {
  /* ... como antes ... */
};
const fetchActiveCriteriaSimple = async (): Promise<
  Pick<Criterio, 'id' | 'nome' | 'index'>[]
> => {
  /* ... como antes ... */
};
const fetchActiveSectorsSimple = async (): Promise<
  Pick<Setor, 'id' | 'nome'>[]
> => {
  /* ... como antes ... */
};

// --- Componente da Página ---
export default function ExpurgosPage() {
  // Estado do Modal
  const [isExpurgoModalOpen, setIsExpurgoModalOpen] = useState(false);

  // Queries para buscar dados
  const {
    data: expurgos,
    isLoading: isLoadingExpurgos,
    error: errorExpurgos,
  } = useQuery<ExpurgoEventEntity[]>({
    queryKey: ['expurgos'],
    queryFn: fetchExpurgos,
  });
  const { data: activeCriteria } = useQuery({
    queryKey: ['activeCriteriaSimple'],
    queryFn: fetchActiveCriteriaSimple,
    staleTime: Infinity,
  });
  const { data: activeSectors } = useQuery({
    queryKey: ['activeSectorsSimple'],
    queryFn: fetchActiveSectorsSimple,
    staleTime: Infinity,
  });

  // Handler Fake
  const handleRegisterExpurgo = (event: React.FormEvent) => {
    event.preventDefault();
    console.log('Simulando registrar expurgo...');
    toast.info('Registro de Expurgo enviado! (Simulação MVP)');
    setIsExpurgoModalOpen(false);
  };

  // Filtra critérios elegíveis para expurgo (exemplo)
  const eligibleCriteria = activeCriteria?.filter(
    (c) =>
      // Usando IDs que definimos como elegíveis (QUEBRA=3, DEFEITO=4, KM OCIOSA=11)
      // ATENÇÃO: Se mudou o ID de KM OCIOSA no criteriaMock, ajuste aqui!
      [3, 4, 11].includes(c.id)
    // Ou [3, 4, 16] se o ID de KM Ociosa for 11 e seu index for 16 no mock? VERIFICAR SEED.
    // Assumindo que os IDs dos critérios são 3, 4, 11 para Quebra, Defeito, KmOciosa.
  );

  return (
    // Provider é necessário para tooltips nesta página
    <TooltipProvider>
      <div className='space-y-6'>
        <h1 className='text-2xl font-bold'>Gestão de Expurgos</h1>

        {/* Card de Expurgos */}
        <Card>
          <CardHeader>
            <div className='flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2'>
              <div>
                <CardTitle>Expurgos Registrados (MVP)</CardTitle>
                <CardDescription>
                  Registro auditado de expurgos autorizados para eventos
                  excepcionais.
                </CardDescription>
              </div>
              <Dialog
                open={isExpurgoModalOpen}
                onOpenChange={setIsExpurgoModalOpen}
              >
                <DialogTrigger asChild>
                  <Button size='sm' variant='outline'>
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
                        <Select required name='exp-setor'>
                          <SelectTrigger className='col-span-3'>
                            <SelectValue placeholder='Selecione...' />
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
                        <Select required name='exp-crit'>
                          <SelectTrigger className='col-span-3'>
                            <SelectValue placeholder='Selecione elegível...' />
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
              <Input
                placeholder='Filtrar por Critério...'
                className='max-w-xs'
                disabled
              />
              <Select disabled>
                <SelectTrigger className='w-[180px]'>
                  <SelectValue placeholder='Filtrar por Filial...' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='null'>...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingExpurgos && <p>Carregando expurgos...</p>}
            {errorExpurgos && (
              <p className='text-red-500'>Erro: {errorExpurgos.message}</p>
            )}
            {expurgos && (
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
                      <TableCell>{exp.setor?.nome ?? '-'}</TableCell>
                      <TableCell>{exp.criterio?.nome ?? '-'}</TableCell>
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
                      <TableCell>{exp.registradoPor?.nome ?? '-'}</TableCell>
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
                      {/* Poderíamos adicionar botões de Ação desabilitados aqui */}
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

// Não esqueça do export default se usar import default em outro lugar
// export default ExpurgosPage;
