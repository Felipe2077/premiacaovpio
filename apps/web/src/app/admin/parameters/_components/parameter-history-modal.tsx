// src/app/admin/parameters/_components/parameter-history-modal.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ParameterValueAPI } from '@/hooks/useParameters';
import { formatDate } from '@/lib/utils';

interface ParameterHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  parameter: ParameterValueAPI | null;
  historyData: ParameterValueAPI[];
  isLoading: boolean;
}

export function ParameterHistoryModal({
  isOpen,
  onClose,
  parameter,
  historyData,
  isLoading,
}: ParameterHistoryModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-4xl'>
        <DialogHeader>
          <DialogTitle>Histórico: {parameter?.nomeParametro}</DialogTitle>
        </DialogHeader>
        <div className='py-4 max-h-[400px] overflow-y-auto border rounded-md overflow-x-auto w-full'>
          {isLoading ? (
            <div className='flex justify-center items-center h-32'>
              <p>Carregando histórico...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Valor</TableHead>
                  <TableHead>Início Vigência</TableHead>
                  <TableHead>Fim Vigência</TableHead>
                  <TableHead>Criado Por</TableHead>
                  <TableHead>Justificativa</TableHead>
                  <TableHead>Data Criação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className='text-center h-24'>
                      Nenhum histórico encontrado para este parâmetro.
                    </TableCell>
                  </TableRow>
                )}
                {historyData.map((histParam) => (
                  <TableRow
                    key={histParam.id}
                    className={!histParam.dataFimEfetivo ? 'bg-sky-50' : ''}
                  >
                    <TableCell
                      className={
                        !histParam.dataFimEfetivo ? 'font-semibold' : ''
                      }
                    >
                      {histParam.valor}
                    </TableCell>
                    <TableCell>
                      {formatDate(histParam.dataInicioEfetivo)}
                    </TableCell>
                    <TableCell>
                      {histParam.dataFimEfetivo
                        ? formatDate(histParam.dataFimEfetivo)
                        : 'Vigente'}
                    </TableCell>
                    <TableCell>{histParam.criadoPor?.nome ?? '-'}</TableCell>
                    <TableCell className='text-xs max-w-[200px] truncate'>
                      <Tooltip>
                        <TooltipTrigger className='cursor-help'>
                          {histParam.justificativa
                            ? `${histParam.justificativa.substring(0, 30)}${histParam.justificativa.length > 30 ? '...' : ''}`
                            : '-'}
                        </TooltipTrigger>
                        <TooltipContent>
                          {histParam.justificativa}
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell className='text-xs text-muted-foreground'>
                      {new Date(histParam.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
