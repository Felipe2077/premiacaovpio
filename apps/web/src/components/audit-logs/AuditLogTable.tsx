// apps/web/src/components/audit-logs/AuditLogTable.tsx - VERSÃO MELHORADA
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { AuditLogEntity } from '@/entity/audit-log.entity';
import { formatDate } from '@/lib/utils';
import { Clock, Database, FileText, Settings, User } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { ActionBadge } from './ActionBadge';

interface AuditLogTableProps {
  logs: AuditLogEntity[];
  onRowClick: (log: AuditLogEntity) => void;
}

// Função para extrair iniciais do nome
const getInitials = (name?: string) => {
  if (!name) return 'S'; // Sistema
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

// Função para determinar a criticidade da ação
const getActionCriticality = (actionType: string) => {
  const critical = ['EXPURGO_REJEITADO', 'META_VERSIONADA_TIMESTAMP'];
  const warning = [
    'EXPURGO_SOLICITADO',
    'PARAMETRO_ALTERADO',
    'META_ATUALIZADA_VIA_CALCULO',
  ];
  const info = ['EXPURGO_APROVADO_INTEGRAL', 'META_CRIADA_VIA_CALCULO'];

  if (critical.includes(actionType)) return 'critical';
  if (warning.includes(actionType)) return 'warning';
  if (info.includes(actionType)) return 'info';
  return 'default';
};

// Função para extrair informações contextuais dos detalhes
const getContextInfo = (log: AuditLogEntity) => {
  const details = log.details || {};
  const context: string[] = [];

  if (details.sectorName || details.setorNome) {
    context.push(`📍 ${details.sectorName || details.setorNome}`);
  }

  if (details.criterionName || details.criterioNome) {
    context.push(`🎯 ${details.criterionName || details.criterioNome}`);
  }

  if (details.valorNovo !== undefined && details.valorAntigo !== undefined) {
    context.push(`💰 ${details.valorAntigo} → ${details.valorNovo}`);
  }

  if (details.valorAprovado !== undefined) {
    context.push(`✅ R$ ${details.valorAprovado}`);
  }

  return context;
};

export function AuditLogTable({ logs, onRowClick }: AuditLogTableProps) {
  return (
    <TooltipProvider>
      <Table>
        <TableCaption>
          Trilha de auditoria completa das ações no sistema.
          <span className='text-muted-foreground text-xs block mt-1'>
            Clique em qualquer linha para visualizar detalhes completos
          </span>
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[180px]'>
              <div className='flex items-center gap-2'>
                <Clock className='h-4 w-4' />
                Timestamp
              </div>
            </TableHead>
            <TableHead className='w-[200px]'>
              <div className='flex items-center gap-2'>
                <User className='h-4 w-4' />
                Usuário
              </div>
            </TableHead>
            <TableHead className='min-w-[220px]'>
              <div className='flex items-center gap-2'>
                <Settings className='h-4 w-4' />
                Ação
              </div>
            </TableHead>
            <TableHead className='w-[300px]'>
              <div className='flex items-center gap-2'>
                <FileText className='h-4 w-4' />
                Contexto
              </div>
            </TableHead>
            <TableHead className='w-[100px] text-center'>
              <div className='flex items-center gap-2 justify-center'>
                <Database className='h-4 w-4' />
                ID
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className='text-center h-24'>
                <div className='flex flex-col items-center gap-2 text-muted-foreground'>
                  <Database className='h-8 w-8 opacity-50' />
                  <p>Nenhum evento de auditoria encontrado</p>
                  <p className='text-xs'>
                    Os eventos aparecerão aqui conforme as ações são realizadas
                  </p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => {
              const hasDetails = !!log.details || !!log.justification;
              const contextInfo = getContextInfo(log);
              const criticality = getActionCriticality(log.actionType);
              const userName = log.user?.nome ?? log.userName ?? 'Sistema';

              return (
                <TableRow
                  key={log.id}
                  onClick={() => hasDetails && onRowClick(log)}
                  className={`
                    ${hasDetails ? 'cursor-pointer hover:bg-muted/50' : 'opacity-75'}
                    ${criticality === 'critical' ? 'border-l-4 border-l-red-400' : ''}
                    ${criticality === 'warning' ? 'border-l-4 border-l-yellow-400' : ''}
                    ${criticality === 'info' ? 'border-l-4 border-l-green-400' : ''}
                    transition-colors
                  `}
                >
                  {/* Timestamp */}
                  <TableCell className='font-mono text-xs'>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className='space-y-1'>
                          <div className='font-medium'>
                            {formatDate(log.timestamp).split(' ')[0]}
                          </div>
                          <div className='text-muted-foreground text-[10px]'>
                            {formatDate(log.timestamp).split(' ')[1]}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{formatDate(log.timestamp)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  {/* Usuário */}
                  <TableCell>
                    <div className='flex items-center gap-3'>
                      <Avatar className='h-8 w-8'>
                        <AvatarFallback
                          className={`
                          text-xs font-medium
                          ${
                            userName === 'Sistema'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }
                        `}
                        >
                          {getInitials(userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className='space-y-1'>
                        <div className='font-medium text-sm leading-none'>
                          {userName}
                        </div>
                        {log.ipAddress && (
                          <div className='text-[10px] text-muted-foreground font-mono'>
                            {log.ipAddress}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Ação */}
                  <TableCell>
                    <div className='space-y-2'>
                      <ActionBadge actionType={log.actionType} />
                      {log.justification && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant='outline'
                              className='text-[10px] bg-blue-50 text-blue-700 cursor-help'
                            >
                              Com justificativa
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent className='max-w-xs'>
                            <p className='text-xs'>"{log.justification}"</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>

                  {/* Contexto */}
                  <TableCell>
                    <div className='space-y-1'>
                      {contextInfo.length > 0 ? (
                        contextInfo.map((info, index) => (
                          <div
                            key={index}
                            className='text-xs text-muted-foreground flex items-center gap-1'
                          >
                            {info}
                          </div>
                        ))
                      ) : (
                        <span className='text-xs text-muted-foreground italic'>
                          {hasDetails
                            ? 'Clique para ver detalhes'
                            : 'Sem contexto adicional'}
                        </span>
                      )}

                      {/* Período de competição */}
                      {log.competitionPeriod && (
                        <Badge variant='secondary' className='text-[10px]'>
                          📅 {log.competitionPeriod.mesAno}
                        </Badge>
                      )}
                    </div>
                  </TableCell>

                  {/* ID */}
                  <TableCell className='text-center'>
                    <Badge variant='outline' className='font-mono text-[10px]'>
                      #{log.id}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
