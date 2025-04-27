// apps/web/src/app/admin/audit-logs/page.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCaption,
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
} from '@/components/ui/tooltip';
import type { AuditLogEntity } from '@/entity/audit-log.entity'; // Usando entidade por enquanto
import { formatDate } from '@/lib/utils'; // Importar formatador
import { useQuery } from '@tanstack/react-query';

// Fetch function
const fetchAuditLogs = async (): Promise<AuditLogEntity[]> => {
  const res = await fetch('http://localhost:3001/api/audit-logs');
  if (!res.ok) throw new Error(`Erro ${res.status} ao buscar logs`);
  try {
    return await res.json();
  } catch {
    throw new Error('Resposta inválida da API de logs');
  }
};

// Componente da Página
export default function AuditLogsPage() {
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
        <h1 className='text-2xl font-bold'>Logs de Auditoria</h1>

        {/* Card de Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Logs de Auditoria Recentes</CardTitle>
            <CardDescription>
              Últimas ações importantes registradas no sistema (dados mock).
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
              {/* Poderia ter DatePicker aqui */}
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingLogs && <p>Carregando logs...</p>}
            {errorLogs && (
              <p className='text-red-500'>Erro: {errorLogs.message}</p>
            )}
            {auditLogs && (
              <Table>
                <TableCaption>
                  Trilha de auditoria das ações no sistema.
                </TableCaption>
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
                        Nenhum log.
                      </TableCell>
                    </TableRow>
                  )}
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className='text-xs'>
                        {formatDate(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        {log.user?.nome ?? log.userName ?? 'Sistema'}
                      </TableCell>
                      <TableCell>
                        <Badge variant='secondary'>{log.actionType}</Badge>
                      </TableCell>
                      {/* Usei secondary */}
                      <TableCell className='text-xs max-w-[300px] truncate'>
                        {/* Aumentei max-w */}
                        <Tooltip>
                          <TooltipTrigger className='hover:underline cursor-help'>
                            {log.justificativa ||
                              (log.details
                                ? JSON.stringify(log.details).substring(0, 50) +
                                  '...'
                                : '-')}
                          </TooltipTrigger>
                          <TooltipContent className='text-xs bg-white text-gray-900 border border-gray-200 shadow-md p-2 rounded dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700'>
                            {log.justificativa && (
                              <p className='mb-1'>
                                <strong>Just.:</strong> {log.justificativa}
                              </p>
                            )}
                            {log.details && (
                              <pre className='text-xs bg-muted p-1 rounded max-w-md overflow-auto'>
                                Detalhes: {JSON.stringify(log.details, null, 2)}
                              </pre>
                            )}
                            {!log.justificativa &&
                              !log.details &&
                              'Sem detalhes.'}
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
      </div>
    </TooltipProvider>
  );
}
