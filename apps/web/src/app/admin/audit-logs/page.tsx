// apps/web/src/app/admin/audit-logs/page.tsx (VERSÃO CORRIGIDA E COMPLETA)
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
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react'; // Importar React e useState
// --- CORREÇÃO IMPORTS DIALOG/LABEL ---
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'; // Importar de ui/dialog
import { Label } from '@/components/ui/label'; // Importar de ui/label
// --- FIM CORREÇÃO ---
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AuditLogEntity } from '@/entity/audit-log.entity'; // Usar tipo da entidade
import { formatDate } from '@/lib/utils'; // Usar formatDateTime
import { AlertCircle } from 'lucide-react'; // Ícones necessários

// --- Função Fetch --- (Assumindo correta)
const fetchAuditLogs = async (): Promise<AuditLogEntity[]> => {
  const url = 'http://localhost:3001/api/audit-logs';
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Erro ${res.status} ao buscar logs`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`Workspace EXCEPTION para ${url}:`, error);
    if (error instanceof Error) throw error;
    throw new Error('Erro desconhecido durante fetch ou parse de logs.');
  }
};

// --- Componente da Página ---
export default function AuditLogsPage() {
  // Estado para controlar o modal de detalhes
  const [detailLog, setDetailLog] = useState<AuditLogEntity | null>(null);

  // Query para buscar os logs
  const {
    data: auditLogs,
    isLoading: isLoadingLogs,
    error: errorLogs,
  } = useQuery<AuditLogEntity[]>({
    queryKey: ['auditLogs'],
    queryFn: fetchAuditLogs,
  });

  return (
    <TooltipProvider>
      <div className='space-y-6'>
        <h1 className='text-2xl font-bold'>Histórico de Eventos</h1>
        {/* Nome Ajustado */}
        {/* Mostra erro principal se houver */}
        {errorLogs && !isLoadingLogs && (
          <Alert variant='destructive' className='mb-4'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Erro ao Carregar Logs</AlertTitle>
            <AlertDescription>
              {errorLogs instanceof Error
                ? errorLogs.message
                : 'Erro desconhecido'}
            </AlertDescription>
          </Alert>
        )}
        {/* Card de Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos Recentes</CardTitle> {/* Nome Ajustado */}
            <CardDescription>
              Últimas ações importantes registradas no sistema. Clique em uma
              linha com detalhes para expandir.
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
            {isLoadingLogs && (
              // Skeleton Loader
              <div className='space-y-3 mt-2'>
                <div className='flex justify-between space-x-2'>
                  <Skeleton className='h-5 flex-1' />
                  <Skeleton className='h-5 flex-1' />
                  <Skeleton className='h-5 flex-1' />
                  <Skeleton className='h-5 flex-1' />
                </div>
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className='h-8 w-full' />
                ))}
              </div>
            )}
            {!isLoadingLogs &&
              auditLogs && ( // Renderiza tabela se não carrega E tem dados
                <Table>
                  <TableCaption>
                    Trilha de auditoria das ações no sistema.
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-[180px]'>Timestamp</TableHead>
                      {/* Aumentei um pouco */}
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Detalhes / Justificativa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className='text-center h-24'>
                          Nenhum evento encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {auditLogs.map((log) => {
                      // --- CORREÇÃO: Calcula hasDetails DENTRO do map ---
                      const hasDetails = !!log.details || !!log.justificativa;
                      return (
                        <TableRow
                          key={log.id}
                          // Abre o modal SOMENTE se tiver detalhes
                          onClick={() => hasDetails && setDetailLog(log)}
                          // Aplica estilo de clique SOMENTE se tiver detalhes
                          className={
                            hasDetails
                              ? 'cursor-pointer hover:bg-amber-50 dark:hover:bg-muted/20'
                              : ''
                          }
                        >
                          <TableCell className='text-xs font-mono'>
                            {/* Fonte mono para data/hora */}
                            {/* --- CORREÇÃO: Usar formatDateTime --- */}
                            {formatDate(log.timestamp)}
                          </TableCell>
                          <TableCell>
                            {log.user?.nome ?? log.userName ?? 'Sistema'}
                          </TableCell>
                          <TableCell>
                            <Badge variant='secondary'>{log.actionType}</Badge>
                            {/* Usei secondary */}
                          </TableCell>
                          <TableCell className='text-xs max-w-[300px] truncate'>
                            {/* Preview simples ou tooltip */}
                            {log.justificativa
                              ? `Just.: ${log.justificativa.substring(0, 40)}...`
                              : log.details
                                ? `Detalhes: ${JSON.stringify(log.details).substring(0, 40)}...`
                                : '-'}
                            {/* O Tooltip interno original também funcionava bem aqui */}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
          </CardContent>
        </Card>
        {/* --- MODAL DE DETALHES DO LOG (usa componentes Shadcn corretos) --- */}
        <Dialog
          open={!!detailLog}
          onOpenChange={(isOpen) => {
            if (!isOpen) setDetailLog(null);
          }}
        >
          <DialogContent className='sm:max-w-[650px]'>
            <DialogHeader>
              <DialogTitle>Detalhes do Evento de Auditoria</DialogTitle>
              {detailLog && (
                <DialogDescription className='flex flex-wrap gap-x-4 text-xs pt-1'>
                  <span>
                    <strong>ID Log:</strong> {detailLog.id}
                  </span>
                  <span>
                    <strong>Timestamp:</strong>
                    {formatDate(detailLog.timestamp)}
                  </span>
                  <span>
                    <strong>Usuário:</strong>
                    {detailLog.user?.nome ?? detailLog.userName ?? 'Sistema'}
                  </span>
                  <span>
                    <strong>Ação:</strong> {detailLog.actionType}
                  </span>
                </DialogDescription>
              )}
            </DialogHeader>
            <div className='py-4 max-h-[50vh] overflow-y-auto text-sm'>
              {detailLog?.justificativa && (
                <div className='mb-4'>
                  <h4 className='font-semibold mb-1'>
                    Justificativa Registrada:
                  </h4>
                  {/* Usando Label e Textarea desabilitado para visualização */}
                  <Label htmlFor='log-just' className='sr-only'>
                    Justificativa
                  </Label>
                  <Textarea
                    id='log-just'
                    value={detailLog.justificativa}
                    readOnly
                    rows={3}
                    className='text-xs text-muted-foreground bg-muted/50'
                  />
                </div>
              )}
              {detailLog?.details && (
                <div>
                  <h4 className='font-semibold mb-1'>Dados Detalhados:</h4>
                  {typeof detailLog.details === 'object' &&
                  detailLog.details !== null &&
                  ('valorAntigo' in detailLog.details ||
                    'valorNovo' in detailLog.details) ? (
                    <div className='grid grid-cols-2 gap-2 text-xs border rounded p-2'>
                      {/* ... (Exibição Old/New Value como antes) ... */}
                      <div>
                        <Label className='font-medium'>Valor Antigo:</Label>
                        <pre className='mt-1 bg-red-100 dark:bg-red-900/30 p-1 rounded text-xs'>
                          {JSON.stringify(
                            detailLog.details.valorAntigo ?? 'N/A',
                            null,
                            2
                          )}
                        </pre>
                      </div>
                      <div>
                        <Label className='font-medium'>Valor Novo:</Label>
                        <pre className='mt-1 bg-green-100 dark:bg-green-900/30 p-1 rounded text-xs'>
                          {JSON.stringify(
                            detailLog.details.valorNovo ?? 'N/A',
                            null,
                            2
                          )}
                        </pre>
                      </div>
                      {Object.entries(detailLog.details)
                        .filter(
                          ([key]) =>
                            key !== 'valorAntigo' && key !== 'valorNovo'
                        )
                        .map(([key, value]) => (
                          <div key={key} className='col-span-2'>
                            <Label className='font-medium'>{key}:</Label>
                            <pre className='mt-1 bg-muted p-1 rounded text-xs'>
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <pre className='text-xs bg-muted p-2 rounded max-w-full overflow-x-auto'>
                      {JSON.stringify(detailLog.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}
              {!detailLog?.justificativa && !detailLog?.details && (
                <p className='text-sm text-muted-foreground'>
                  Sem detalhes adicionais.
                </p>
              )}
            </div>
            <DialogFooter>
              {/* Usar DialogClose aqui */}
              <DialogClose asChild>
                <Button type='button' variant='secondary'>
                  Fechar
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* --- FIM MODAL DETALHES --- */}
      </div>
    </TooltipProvider>
  );
}
