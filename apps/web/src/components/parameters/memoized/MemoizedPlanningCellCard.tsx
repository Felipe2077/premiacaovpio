// apps/web/src/components/parameters/memoized/MemoizedPlanningCellCard.tsx
'use client';
import { TableCell, TableRow } from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import React from 'react';
import { PlanningCellCard } from '../PlanningCellCard';
import { SectorProgressIndicator } from '../progress/SectorProgressIndicator';
import { MemoizedTableCell } from './MemoizedTableCell';

// Props tipadas para melhor performance
interface MemoizedPlanningCellCardProps {
  criterionId: number;
  sectorId: number;
  criterionName: string;
  sectorName: string;
  hasParameter: boolean;
  parameterValue: number | null;
  suggestedValue: number | null;
  previousValue: number | null;
  previousPeriod: string | null;
  appliedRules: string | null;
  onEdit: (criterionId: number, sectorId: number) => void;
  onCalculate: (
    criterionId: number,
    sectorId: number,
    criterionName: string,
    sectorName: string
  ) => void;
  onHistory: (data: {
    criterionId: number;
    sectorId: number;
    criterionName: string;
    sectorName: string;
  }) => void;
  onAcceptSuggestion: (
    criterionId: number,
    sectorId: number,
    value: number
  ) => void;
}

// Componente memoizado com comparação customizada
export const MemoizedPlanningCellCard =
  React.memo<MemoizedPlanningCellCardProps>(
    (props) => {
      return <PlanningCellCard {...props} />;
    },
    (prevProps, nextProps) => {
      // Comparação otimizada - apenas props que realmente importam
      return (
        prevProps.criterionId === nextProps.criterionId &&
        prevProps.sectorId === nextProps.sectorId &&
        prevProps.hasParameter === nextProps.hasParameter &&
        prevProps.parameterValue === nextProps.parameterValue &&
        prevProps.suggestedValue === nextProps.suggestedValue &&
        prevProps.previousValue === nextProps.previousValue &&
        prevProps.previousPeriod === nextProps.previousPeriod &&
        prevProps.appliedRules === nextProps.appliedRules
        // Não comparamos callbacks - eles devem ser memoizados externamente
      );
    }
  );

MemoizedPlanningCellCard.displayName = 'MemoizedPlanningCellCard';

// apps/web/src/components/parameters/memoized/MemoizedSectorProgressIndicator.tsx
('use client');

interface MemoizedSectorProgressIndicatorProps {
  setorNome: string;
  definidas: number;
  total: number;
  percentual: number;
  isLoading?: boolean;
}

export const MemoizedSectorProgressIndicator =
  React.memo<MemoizedSectorProgressIndicatorProps>(
    (props) => {
      return <SectorProgressIndicator {...props} />;
    },
    (prevProps, nextProps) => {
      // Comparação precisa para evitar re-renders desnecessários
      return (
        prevProps.setorNome === nextProps.setorNome &&
        prevProps.definidas === nextProps.definidas &&
        prevProps.total === nextProps.total &&
        prevProps.percentual === nextProps.percentual &&
        prevProps.isLoading === nextProps.isLoading
      );
    }
  );

MemoizedSectorProgressIndicator.displayName = 'MemoizedSectorProgressIndicator';

// apps/web/src/components/parameters/memoized/MemoizedTableCell.tsx
('use client');

interface MemoizedTableCellProps {
  children: React.ReactNode;
  className?: string;
  key?: string;
  // Qualquer outra prop do TableCell
  [key: string]: any;
}

export const MemoizedTableCell = React.memo<MemoizedTableCellProps>(
  ({ children, className, ...props }) => {
    return (
      <TableCell className={className} {...props}>
        {children}
      </TableCell>
    );
  },
  (prevProps, nextProps) => {
    // Comparação shallow para props simples
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);

    if (prevKeys.length !== nextKeys.length) return false;

    for (const key of prevKeys) {
      if (key === 'children') {
        // Para children, fazemos comparação mais cuidadosa
        continue;
      }
      if (prevProps[key] !== nextProps[key]) return false;
    }

    // Comparação especial para children
    return prevProps.children === nextProps.children;
  }
);

MemoizedTableCell.displayName = 'MemoizedTableCell';

// apps/web/src/components/parameters/memoized/MemoizedCriterionRow.tsx
('use client');

interface CriterionData {
  id: number;
  nome: string;
  descricao?: string;
  sentido_melhor?: string;
  unidade_medida?: string;
}

interface MemoizedCriterionRowProps {
  criterion: CriterionData;
  resultsBySector: Record<string, any>;
  renderCellContent: (
    criterion: CriterionData,
    sectorId: string,
    sectorData: any
  ) => React.ReactNode;
  isEven: boolean;
}

export const MemoizedCriterionRow = React.memo<MemoizedCriterionRowProps>(
  ({ criterion, resultsBySector, renderCellContent, isEven }) => {
    return (
      <TableRow className={`group ${isEven ? 'bg-muted/20' : ''}`}>
        <MemoizedTableCell className='font-medium sticky left-0 bg-slate-50 dark:bg-slate-800/50 backdrop-blur-sm z-10 group-hover:bg-white dark:group-hover:bg-slate-900'>
          <TooltipProvider>
            <Tooltip delayDuration={200}>
              <TooltipTrigger className='flex items-center gap-1 cursor-help text-left w-full'>
                <div>{criterion.nome}</div>
                {criterion.descricao && (
                  <Info className='h-3 w-3 text-muted-foreground opacity-70 flex-shrink-0' />
                )}
              </TooltipTrigger>
              <TooltipContent className='max-w-xs bg-slate-800 text-white p-2 rounded shadow-lg'>
                <div className='space-y-1'>
                  <p className='font-medium'>{criterion.nome}</p>
                  {criterion.descricao && (
                    <p className='text-xs'>{criterion.descricao}</p>
                  )}
                  {criterion.sentido_melhor && (
                    <p className='text-xs'>
                      Sentido:
                      {criterion.sentido_melhor === 'MAIOR'
                        ? 'Maior é melhor'
                        : 'Menor é melhor'}
                    </p>
                  )}
                  {criterion.unidade_medida && (
                    <p className='text-xs'>
                      Unidade: {criterion.unidade_medida}
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </MemoizedTableCell>
        {resultsBySector &&
          Object.entries(resultsBySector).map(([sectorIdStr, sectorData]) => (
            <MemoizedTableCell
              key={`${criterion.id}-${sectorIdStr}`}
              className='p-1 align-top'
            >
              {renderCellContent(criterion, sectorIdStr, sectorData)}
            </MemoizedTableCell>
          ))}
      </TableRow>
    );
  },
  (prevProps, nextProps) => {
    // Comparação otimizada para linha da tabela
    if (prevProps.criterion.id !== nextProps.criterion.id) return false;
    if (prevProps.isEven !== nextProps.isEven) return false;

    // Comparação shallow dos resultados por setor
    const prevSectors = Object.keys(prevProps.resultsBySector || {});
    const nextSectors = Object.keys(nextProps.resultsBySector || {});

    if (prevSectors.length !== nextSectors.length) return false;

    for (const sectorId of prevSectors) {
      if (!nextProps.resultsBySector[sectorId]) return false;
      // Comparação mais específica se necessário
    }

    return true;
  }
);

MemoizedCriterionRow.displayName = 'MemoizedCriterionRow';
