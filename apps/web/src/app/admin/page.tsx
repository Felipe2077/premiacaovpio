// apps/web/src/app/admin/page.tsx (VERSÃO TURBINADA COMPLETA)
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
import { History } from 'lucide-react'; // Importar ícone
import React, { useState } from 'react';
import { Toaster, toast } from 'sonner'; // Importar Toaster e toast

// Importar tipos - Usando diretamente das Entidades por enquanto (API retorna com relações)
// Idealmente, criar DTOs em shared-types depois para não expor tudo da entidade
import type { AuditLogEntity } from '@/entity/audit-log.entity';
import type { ExpurgoEventEntity } from '@/entity/expurgo-event.entity';
import type { ParameterValueEntity } from '@/entity/parameter-value.entity';
// Importar tipos auxiliares se necessário de shared-types
import type { Criterio, Setor } from '@sistema-premiacao/shared-types';

// --- Funções de Fetch ---

const fetchCurrentParameters = async (): Promise<ParameterValueEntity[]> => {
  const res = await fetch('http://localhost:3001/api/parameters/current');
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar parâmetros`);
  try {
    return await res.json();
  } catch {
    throw new Error('Resposta inválida da API de parâmetros');
  }
};

const fetchAuditLogs = async (): Promise<AuditLogEntity[]> => {
  const res = await fetch('http://localhost:3001/api/audit-logs');
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar logs`);
  try {
    return await res.json();
  } catch {
    throw new Error('Resposta inválida da API de logs');
  }
};

const fetchExpurgos = async (): Promise<ExpurgoEventEntity[]> => {
  const res = await fetch('http://localhost:3001/api/expurgos');
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar expurgos`);
  try {
    return await res.json();
  } catch {
    throw new Error('Resposta inválida da API de expurgos');
  }
};

// Busca Critérios Ativos (simplificado, para Selects) - Assume que endpoint existe!
const fetchActiveCriteriaSimple = async (): Promise<
  Pick<Criterio, 'id' | 'nome'>[]
> => {
  const res = await fetch('http://localhost:3001/api/criteria/active');
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar critérios ativos`);
  try {
    return await res.json();
  } catch {
    throw new Error('Resposta inválida da API de critérios.');
  }
};
// Busca Setores Ativos (simplificado, para Selects) - !! Endpoint NOVO a ser criado na API !!
const fetchActiveSectorsSimple = async (): Promise<
  Pick<Setor, 'id' | 'nome'>[]
> => {
  const res = await fetch('http://localhost:3001/api/sectors/active'); // <-- Endpoint NOVO!
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar setores ativos`);
  try {
    return await res.json();
  } catch {
    throw new Error('Resposta inválida da API de setores.');
  }
};

// --- Componente da Página ---
export default function AdminConceptPage() {
  // Estados dos Modais
  const [isParamModalOpen, setIsParamModalOpen] = useState(false);
  const [isExpurgoModalOpen, setIsExpurgoModalOpen] = useState(false);

  // Queries para buscar dados
  const {
    data: parameters,
    isLoading: isLoadingParams,
    error: errorParams,
  } = useQuery<ParameterValueEntity[]>({
    queryKey: ['currentParameters'],
    queryFn: fetchCurrentParameters,
  });
  const {
    data: auditLogs,
    isLoading: isLoadingLogs,
    error: errorLogs,
  } = useQuery<AuditLogEntity[]>({
    queryKey: ['auditLogs'],
    queryFn: fetchAuditLogs,
  });
  const {
    data: expurgos,
    isLoading: isLoadingExpurgos,
    error: errorExpurgos,
  } = useQuery<ExpurgoEventEntity[]>({
    queryKey: ['expurgos'],
    queryFn: fetchExpurgos,
  });
  // Queries para popular selects nos modais
  const { data: activeCriteria } = useQuery({
    queryKey: ['activeCriteriaSimple'],
    queryFn: fetchActiveCriteriaSimple,
    staleTime: Infinity,
  }); // Cache infinito para lista simples
  const { data: activeSectors } = useQuery({
    queryKey: ['activeSectorsSimple'],
    queryFn: fetchActiveSectorsSimple,
    staleTime: Infinity,
  }); // Cache infinito

  // Handlers Fake para os Modais
  const handleSaveParameter = (event: React.FormEvent) => {
    event.preventDefault();
    console.log('Simulando salvar parâmetro...');
    toast.success('Parâmetro salvo com sucesso! (Simulação MVP)');
    setIsParamModalOpen(false);
  };
  const handleRegisterExpurgo = (event: React.FormEvent) => {
    event.preventDefault();
    console.log('Simulando registrar expurgo...');
    toast.info('Registro de Expurgo enviado! (Simulação MVP)');
    setIsExpurgoModalOpen(false);
  };

  // Funções de Formatação
  const formatDateTime = (
    isoString: string | Date | undefined | null
  ): string => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(isoString);
    }
  };
  const formatDate = (isoString: string | Date | undefined | null): string => {
    if (!isoString) return '-';
    try {
      return new Date(isoString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return String(isoString);
    }
  };

  // Determina data atual para lógica de 'Vigente'
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <TooltipProvider>
      <main className='container mx-auto p-4 lg:p-6 space-y-6'>
        <Toaster position='top-right' richColors /> {/* Para notificações */}
        <h1 className='text-2xl font-bold mb-4'>
          Área Gerencial - Visão Conceitual (MVP)
        </h1>
        <p className='mb-6 text-sm text-gray-600 italic dark:text-gray-400'>
          Esta página demonstra a visibilidade planejada para parâmetros, logs e
          expurgos... (etc.)
        </p>
        {/* Layout em Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Card de Parâmetros */}
          <Card className='col-span-1 lg:col-span-2'>
            <CardHeader>
              <div className='flex justify-between items-start sm:items-center flex-col sm:flex-row gap-2'>
                <div>
                  <CardTitle>Parâmetros Atuais</CardTitle>
                  <CardDescription>
                    Regras de negócio e metas vigentes para a premiação.
                  </CardDescription>
                </div>
                <Dialog
                  open={isParamModalOpen}
                  onOpenChange={setIsParamModalOpen}
                >
                  <DialogTrigger asChild>
                    <Button size='sm' className='cursor-pointer'>
                      {' '}
                      + Novo Parâmetro/Meta{' '}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className='sm:max-w-[500px]'>
                    <DialogHeader>
                      <DialogTitle>Definir Novo Parâmetro/Meta</DialogTitle>
                      <DialogDescription> ... </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSaveParameter}>
                      <div className='grid gap-4 py-4'>
                        {/* Campos do Formulário (Inputs, Selects, Textarea) */}
                        <div className='grid grid-cols-4 items-center gap-4'>
                          <Label htmlFor='param-name' className='text-right'>
                            Nome
                          </Label>
                          <Input
                            id='param-name'
                            placeholder='Ex: META_IPK_GAMA'
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
                            placeholder='Ex: 3.1'
                            className='col-span-3'
                            required
                          />
                        </div>
                        {/* Selects para Critério e Setor (populados pelas queries) */}
                        <div className='grid grid-cols-4 items-center gap-4'>
                          <Label htmlFor='param-crit' className='text-right'>
                            Critério (Opc)
                          </Label>
                          <Select name='param-crit'>
                            <SelectTrigger className='col-span-3'>
                              <SelectValue placeholder='Geral ou Específico...' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='null'>
                                Nenhum (Geral)
                              </SelectItem>
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
                          <Select name='param-setor'>
                            <SelectTrigger className='col-span-3'>
                              <SelectValue placeholder='Geral ou Específico...' />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value='null'>
                                Nenhum (Geral)
                              </SelectItem>
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
                            placeholder='Detalhe o motivo...'
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
              {isLoadingParams && <p>Carregando parâmetros...</p>}
              {errorParams && (
                <p className='text-red-500'>Erro: {errorParams.message}</p>
              )}
              {parameters && (
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
                                <History className='h-4 w-4 text-gray-400' />
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

          {/* Card de Logs */}
          <Card>
            <CardHeader>
              <CardTitle>Logs de Auditoria Recentes</CardTitle>
              <CardDescription>
                Últimas ações importantes registradas no sistema.
              </CardDescription>
              {/* Filtros Placeholders */}
              <div className='flex gap-2 pt-4'>
                <Input
                  placeholder='Filtrar por Ação...'
                  className='max-w-xs'
                  disabled
                />
                <Input
                  placeholder='Filtrar por Usuário...'
                  className='max-w-xs'
                  disabled
                />
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingLogs && <p>Carregando logs...</p>}
              {errorLogs && (
                <p className='text-red-500'>Erro: {errorLogs.message}</p>
              )}
              {auditLogs && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Usuário</TableHead> <TableHead>Ação</TableHead>
                      <TableHead>Detalhes / Justificativa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className='text-center h-24'>
                          Nenhum log.
                        </TableCell>
                      </TableRow>
                    )}
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className='text-xs'>
                          {formatDateTime(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          {log.user?.nome ?? log.userName ?? 'Sistema'}
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline'>{log.actionType}</Badge>
                        </TableCell>
                        <TableCell className='text-xs max-w-[200px] truncate'>
                          <Tooltip>
                            <TooltipTrigger className='hover:underline cursor-help'>
                              {log.justificativa ||
                                (log.details
                                  ? JSON.stringify(log.details).substring(
                                      0,
                                      40
                                    ) + '...'
                                  : '-')}
                            </TooltipTrigger>
                            <TooltipContent className='text-xs bg-white text-gray-900 border border-gray-200 shadow-md p-2 rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'>
                              {log.justificativa && (
                                <p className='mb-1'>
                                  <strong>Just.:</strong> {log.justificativa}
                                </p>
                              )}
                              {log.details && (
                                <pre className='text-xs bg-muted p-1 rounded'>
                                  Detalhes:
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
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
                              <SelectValue placeholder='Selecione...' />
                            </SelectTrigger>
                            <SelectContent>
                              {activeCriteria
                                ?.filter((c) => [3, 4, 11].includes(c.id))
                                .map((c) => (
                                  <SelectItem key={c.id} value={String(c.id)}>
                                    {c.nome}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Filtra critérios elegíveis */}
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
                          Nenhum expurgo.
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
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
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
        {/* Fim do Grid */}
      </main>
    </TooltipProvider>
  );
}
