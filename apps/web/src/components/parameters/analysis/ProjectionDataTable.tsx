// apps/web/src/components/parameters/analysis/ProjectionDataTable.tsx - VERSÃO CORRIGIDA
'use client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CompetitionPeriod, Sector } from '@/hooks/useParametersData';
import { useMemo } from 'react';

interface ProjectionDataTableProps {
  projectionData: {
    sectorName: string;
    realizadoNoPeriodo: number | null;
    valorProjetado: number;
  }[];
  period: CompetitionPeriod;
  criterionName: string;
  formattedPeriod: string;
  sectors: Sector[]; // ✅ NOVA PROP: Lista completa de setores
}

export const ProjectionDataTable = ({
  projectionData,
  period,
  criterionName,
  formattedPeriod,
  sectors, // ✅ RECEBE A LISTA COMPLETA DE SETORES
}: ProjectionDataTableProps) => {
  // ✅ DADOS FORMATADOS: Sempre inclui todos os setores
  const formattedData = useMemo(() => {
    return sectors.map((sector) => {
      // Procura dados do setor na API
      const apiData = projectionData.find(
        (item) => item.sectorName === sector.nome
      );

      return {
        sectorName: sector.nome,
        realizadoNoPeriodo: apiData?.realizadoNoPeriodo ?? 0,
        valorProjetado: apiData?.valorProjetado ?? 0,
      };
    });
  }, [projectionData, sectors]);

  return (
    <div>
      {/* ✅ TÍTULO ATUALIZADO PARA MAIOR CLAREZA */}
      <h3 className='text-lg font-semibold mb-2'>
        Projeção de <span className='text-amber-600'>{criterionName}</span> para{' '}
        <span className='capitalize'>{formattedPeriod}</span>
      </h3>
      <div className='rounded-md border'>
        <Table>
          <TableHeader className='bg-amber-300/80 dark:bg-amber-950/20'>
            <TableRow>
              <TableHead className='font-bold'>Filial</TableHead>
              <TableHead className='text-center font-bold'>
                Realizado Atual
              </TableHead>
              <TableHead className='text-center font-bold'>
                Projeção Fim do Mês
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {formattedData.map((row) => (
              <TableRow key={row.sectorName}>
                <TableCell>{row.sectorName}</TableCell>
                <TableCell className='text-center'>
                  {row.realizadoNoPeriodo > 0
                    ? row.realizadoNoPeriodo.toLocaleString('pt-BR')
                    : '0'}
                </TableCell>
                <TableCell className='text-center font-semibold'>
                  {row.valorProjetado > 0
                    ? Math.round(row.valorProjetado).toLocaleString('pt-BR')
                    : '0'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
