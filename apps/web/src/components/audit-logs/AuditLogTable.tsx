import type { AuditLogEntity } from '@/entity/audit-log.entity';
import { formatDate } from '@/lib/utils';
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

export function AuditLogTable({ logs, onRowClick }: AuditLogTableProps) {
  return (
    <Table>
      <TableCaption>Trilha de auditoria das ações no sistema.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead className='w-[160px]'>Timestamp</TableHead>
          <TableHead>Usuário</TableHead>
          <TableHead>Ação</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className='text-center h-24'>
              Nenhum evento encontrado.
            </TableCell>
          </TableRow>
        ) : (
          logs.map((log) => {
            const hasDetails = !!log.details || !!log.justificativa;
            return (
              <TableRow
                key={log.id}
                onClick={() => hasDetails && onRowClick(log)}
                className={hasDetails ? 'cursor-pointer hover:bg-muted/50' : ''}
              >
                <TableCell className='font-mono text-xs'>
                  {formatDate(log.timestamp)}
                </TableCell>
                <TableCell>
                  {log.user?.nome ?? log.userName ?? 'Sistema'}
                </TableCell>
                <TableCell>
                  <ActionBadge actionType={log.actionType} />
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
