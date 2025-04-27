// apps/web/src/app/admin/page.tsx (VERSÃO TURBINADA V1)
'use client';

import { Badge } from '@/components/ui/badge'; // <-- Badge para Status
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'; // <-- Card
import { Input } from '@/components/ui/input'; // <-- Input (placeholder)
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'; // Para justificativa/histórico
import { useQuery } from '@tanstack/react-query';
import { History } from 'lucide-react'; // <-- Ícone de Histórico
// Importar tipos - ATENÇÃO: API agora retorna entidades com relações!
// Idealmente, criar DTOs em shared-types para não expor entidade inteira?
// Por ora, vamos usar um tipo local mais flexível ou assumir a estrutura da entidade.
import { AuditLogEntity } from '@/entity/audit-log.entity'; // <-- IMPORTANTE: Usando a entidade diretamente
import { ExpurgoEventEntity } from '@/entity/expurgo-event.entity'; // <-- IMPORTANTE: Usando a entidade diretamente
import { ParameterValueEntity } from '@/entity/parameter-value.entity'; // <-- IMPORTANTE: Usando a entidade diretamente por enquanto
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@radix-ui/react-select';

// --- Funções de Fetch ---
// Busca Parâmetros (API agora retorna entidades com 'criterio', 'setor', 'criadoPor' aninhados)
const fetchCurrentParameters = async (): Promise<ParameterValueEntity[]> => {
  // Retorna tipo da entidade com relações
  const res = await fetch('http://localhost:3001/api/parameters/current');
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar parâmetros`);
  try {
    return await res.json();
  } catch {
    throw new Error('Resposta inválida da API de parâmetros');
  }
};

// Busca Logs (API agora retorna entidades com 'user' aninhado)
const fetchAuditLogs = async (): Promise<AuditLogEntity[]> => {
  // Retorna tipo da entidade com relações
  const res = await fetch('http://localhost:3001/api/audit-logs');
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar logs`);
  try {
    return await res.json();
  } catch {
    throw new Error('Resposta inválida da API de logs');
  }
};

// Busca Expurgos (API agora retorna entidades com 'criterio', 'setor', 'registradoPor' aninhados)
const fetchExpurgos = async (): Promise<ExpurgoEventEntity[]> => {
  // Retorna tipo da entidade com relações
  const res = await fetch('http://localhost:3001/api/expurgos');
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar expurgos`);
  try {
    return await res.json();
  } catch {
    throw new Error('Resposta inválida da API de expurgos');
  }
};

// --- Componente da Página ---
export default function AdminConceptPage() {
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

  // Função de formatação (pode vir de utils)
  const formatDateTime = (isoString: string | Date | undefined | null) => {
    /* ... como antes ... */
  };
  const formatDate = (isoString: string | Date | undefined | null) => {
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

  return (
    <TooltipProvider>
      <main className='container mx-auto p-4 lg:p-6 space-y-6'>
        {' '}
        {/* Diminuído space-y */}
        <h1 className='text-2xl font-bold mb-4'>
          Área Gerencial - Visão Conceitual (MVP)
        </h1>
        <p className='mb-6 text-sm text-gray-600 italic dark:text-gray-400'>
          Esta página demonstra a visibilidade planejada para parâmetros, logs e
          expurgos. A funcionalidade de edição e os controles de acesso
          completos serão implementados nas próximas fases. Os dados exibidos
          são exemplos (mock).
        </p>
        {/* Layout em Grid para os Cards */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Card de Parâmetros */}
          <Card className='col-span-1 lg:col-span-2'>
            {' '}
            {/* Ocupa largura total */}
            <CardHeader>
              <CardTitle>Parâmetros Atuais</CardTitle>
              <CardDescription>
                Regras de negócio e metas vigentes para a premiação.
              </CardDescription>
              {/* Filtros Placeholders */}
              <div className='flex gap-2 pt-2'>
                <Input
                  placeholder='Buscar parâmetro...'
                  className='max-w-xs'
                  disabled
                />
                <Select disabled>
                  <SelectTrigger className='w-[180px]'>
                    {' '}
                    <SelectValue placeholder='Filtrar por Critério...' />{' '}
                  </SelectTrigger>
                  <SelectContent>
                    {' '}
                    <SelectItem value='null'>...</SelectItem>{' '}
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
                          Nenhum parâmetro encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {parameters.map((param) => {
                      const isVigente =
                        param.dataFimEfetivo === null ||
                        new Date(param.dataFimEfetivo) >= new Date(targetDate); // Lógica simples de vigente
                      const targetDate = new Date().toISOString().split('T')[0]; // Pega data atual para comparar vigência
                      return (
                        <TableRow key={param.id}>
                          <TableCell className='font-medium'>
                            {param.nomeParametro}
                          </TableCell>
                          <TableCell>{param.valor}</TableCell>
                          {/* Acessa nomes das relações com optional chaining */}
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
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : ''
                              }
                            >
                              {isVigente ? 'Vigente' : 'Expirado'}
                            </Badge>
                          </TableCell>
                          <TableCell className='max-w-[200px] truncate'>
                            {' '}
                            {/* Trunca justificativa longa */}
                            <Tooltip>
                              <TooltipTrigger className='hover:underline cursor-help'>
                                {param.justificativa
                                  ? `${param.justificativa.substring(0, 30)}...`
                                  : '-'}
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
              <div className='flex gap-2 pt-2'>
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
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Detalhes / Justificativa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className='text-center h-24'>
                          Nenhum log encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className='text-xs'>
                          {formatDateTime(log.timestamp)}
                        </TableCell>
                        {/* Usa nome do usuário vindo da relação */}
                        <TableCell>
                          {log.user?.nome ?? log.userName ?? 'Sistema'}
                        </TableCell>
                        <TableCell>{log.actionType}</TableCell>
                        <TableCell className='text-xs max-w-[300px] truncate'>
                          <Tooltip>
                            <TooltipTrigger className='hover:underline cursor-help'>
                              {log.justificativa ||
                                (log.details
                                  ? JSON.stringify(log.details).substring(
                                      0,
                                      50
                                    ) + '...'
                                  : '-')}
                            </TooltipTrigger>
                            <TooltipContent>
                              {log.justificativa && (
                                <p>Just.: {log.justificativa}</p>
                              )}
                              {log.details && (
                                <pre>
                                  Detalhes:{' '}
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
              <CardTitle>Expurgos Registrados (MVP)</CardTitle>
              <CardDescription>
                Demonstração do registro auditado de expurgos autorizados.
              </CardDescription>
              {/* Filtros Placeholders */}
              <div className='flex gap-2 pt-2'>
                <Input
                  placeholder='Filtrar por Critério...'
                  className='max-w-xs'
                  disabled
                />
                <Select disabled>
                  <SelectTrigger className='w-[180px]'>
                    {' '}
                    <SelectValue placeholder='Filtrar por Filial...' />{' '}
                  </SelectTrigger>
                  <SelectContent>
                    {' '}
                    <SelectItem value='null'>...</SelectItem>{' '}
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
                          Nenhum expurgo encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {expurgos.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>{formatDate(exp.dataEvento)}</TableCell>
                        {/* Acessa nomes das relações */}
                        <TableCell>{exp.setor?.nome ?? '-'}</TableCell>
                        <TableCell>{exp.criterio?.nome ?? '-'}</TableCell>
                        <TableCell className='text-xs max-w-[250px] truncate'>
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
                                ? 'secondary'
                                : 'outline'
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
        </div>{' '}
        {/* Fim do Grid */}
      </main>
    </TooltipProvider>
  );
}
