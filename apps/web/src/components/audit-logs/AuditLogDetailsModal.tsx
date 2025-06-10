import type { AuditLogEntity } from '@/entity/audit-log.entity';
import { formatDate } from '@/lib/utils';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ActionBadge } from './ActionBadge';
import { LogDetailRenderer } from './LogDetailRenderer';

interface AuditLogDetailsModalProps {
  log: AuditLogEntity | null;
  onClose: () => void;
}

export function AuditLogDetailsModal({
  log,
  onClose,
}: AuditLogDetailsModalProps) {
  if (!log) return null;

  return (
    <Dialog open={!!log} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className='sm:max-w-[650px]'>
        <DialogHeader>
          <DialogTitle>Detalhes do Evento de Auditoria</DialogTitle>
          <DialogDescription className='flex items-center flex-wrap gap-x-4 gap-y-2 text-xs pt-2'>
            <span className='font-mono text-black dark:text-white'>
              ID: {log.id}
            </span>
            <ActionBadge actionType={log.actionType} />
            <span>
              <strong>Usuário:</strong>{' '}
              {log.user?.nome ?? log.userName ?? 'Sistema'}
            </span>
            <span>
              <strong>Em:</strong> {formatDate(log.timestamp)}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className='py-4 max-h-[60vh] overflow-y-auto pr-3'>
          {log.justificativa && (
            <div className='mb-4'>
              <h4 className='font-semibold mb-1'>Justificativa do Usuário:</h4>
              <blockquote className='mt-2 border-l-2 pl-3 text-sm italic'>
                "{log.justificativa}"
              </blockquote>
            </div>
          )}

          <div>
            <h4 className='font-semibold mb-2'>Dados Técnicos Registrados:</h4>
            <LogDetailRenderer details={log.details} />
          </div>
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
  );
}
