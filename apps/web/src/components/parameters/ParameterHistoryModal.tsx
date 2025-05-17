// components/parameters/ParameterHistoryModal.tsx
import { Button } from '@/components/ui/button';
import {
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
  historyParam: ParameterValueAPI | null;
  parameterHistoryData: ParameterValueAPI[];
  isLoadingHistory: boolean;
  onClose: () => void;
}

export function ParameterHistoryModal({
  historyParam,
  parameterHistoryData,
  isLoadingHistory,
  onClose,
}: ParameterHistoryModalProps) {
  if (!historyParam) return null;

  return (
    <DialogContent className='sm:max-w-4xl'>
      <DialogHeader>
        <DialogTitle>
          Histórico de Alterações: {historyParam?.nomeParametro}
        </DialogTitle>
      </DialogHeader>
      <div className='py-4 max-h-[400px] overflow-y-auto border rounded-md'>
        {isLoadingHistory ? (
          <div className='text-center p-4'>Carregando histórico...</div>
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
              {parameterHistoryData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className='text-center h-24'>
                    Nenhum histórico.
                  </TableCell>
                </TableRow>
              )}
              {parameterHistoryData.map((histParam) => (
                <TableRow
                  key={histParam.id}
                  className={
                    !histParam.dataFimEfetivo
                      ? 'bg-sky-100 dark:bg-sky-900 font-semibold'
                      : ''
                  }
                >
                  <TableCell>{histParam.valor}</TableCell>
                  <TableCell>
                    {formatDate(histParam.dataInicioEfetivo)}
                  </TableCell>
                  <TableCell>
                    {histParam.dataFimEfetivo
                      ? formatDate(histParam.dataFimEfetivo)
                      : 'Vigente'}
                  </TableCell>
                  <TableCell>{histParam.criadoPor?.nome ?? '-'}</TableCell>
                  <TableCell className='text-xs max-w-[200px]'>
                    <Tooltip>
                      <TooltipTrigger className='cursor-help'>
                        {histParam.justificativa?.substring(0, 30) || '-'}
                        {histParam.justificativa &&
                        histParam.justificativa.length > 30
                          ? '...'
                          : ''}
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className='max-w-xs whitespace-pre-wrap'>
                          {histParam.justificativa}
                        </div>
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
          <Button type='button' variant='outline' onClick={onClose}>
            Fechar
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}
