// components/parameters/ParametersMatrix.tsx
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ResultData } from '@/hooks/useParametersData';
import { formatNumber } from '@/lib/utils';
import { Edit, PlusCircle } from 'lucide-react';

interface ParametersMatrixProps {
  uniqueCriteria: Array<{ id: number; name: string }>;
  resultsBySector: Record<
    string,
    { setorNome: string; criteriaResults: Record<number, ResultData> }
  >;
  onEdit: (result: ResultData) => void;
  onCreate: (
    criterionId: number,
    sectorId: number,
    criterionName: string
  ) => void;
  isLoading: boolean;
}

export function ParametersMatrix({
  uniqueCriteria,
  resultsBySector,
  onEdit,
  onCreate,
  isLoading,
}: ParametersMatrixProps) {
  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className='overflow-x-auto'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='sticky left-0 bg-background z-10 font-semibold'>
              Critério / Setor
            </TableHead>
            {Object.entries(resultsBySector).map(([sectorId, sectorData]) => (
              <TableHead key={sectorId} className='font-semibold text-center'>
                {sectorData.setorNome}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {uniqueCriteria.map((criterion) => (
            <TableRow key={criterion.id}>
              <TableCell className='font-medium sticky left-0 bg-background z-10'>
                {criterion.name}
              </TableCell>
              {Object.entries(resultsBySector).map(([sectorId, sectorData]) => {
                const result = sectorData.criteriaResults[criterion.id];
                return (
                  <TableCell key={sectorId} className='text-center'>
                    {result ? (
                      <div className='flex flex-col items-center gap-1'>
                        <span className='font-semibold'>
                          {formatNumber(result.valorMeta)}
                        </span>
                        <Button
                          variant='ghost'
                          size='sm'
                          className='h-6 px-2'
                          onClick={() => onEdit(result)}
                        >
                          <Edit className='h-3 w-3 mr-1' />
                          Editar
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-6 px-2'
                        onClick={() =>
                          onCreate(
                            criterion.id,
                            parseInt(sectorId, 10),
                            criterion.name
                          )
                        }
                      >
                        <PlusCircle className='h-3 w-3 mr-1' />
                        Criar
                      </Button>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
