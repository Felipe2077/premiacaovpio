// apps/web/src/components/parameters/ProgressCards.tsx - VERSÃO COM BADGE DESTACADO
'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sector } from '@/hooks/useParametersData';
import { cn } from '@/lib/utils';
import { CheckCircle2, Target } from 'lucide-react';
import { useMemo } from 'react';

interface ProgressCardsProps {
  resultsBySector: any;
  sectors: Sector[];
  totalCriteriaCount: number;
}

const getProgressColorClass = (percentage: number): string => {
  if (percentage === 100) {
    return 'bg-green-500';
  }
  if (percentage >= 50) {
    return 'bg-amber-500';
  }
  return 'bg-blue-500';
};

const DynamicProgressBar = ({
  value,
  colorClass,
}: {
  value: number;
  colorClass: string;
}) => (
  <div className='w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2'>
    <div
      className={`h-2 rounded-full transition-all duration-500 ${colorClass}`}
      style={{ width: `${value}%` }}
    />
  </div>
);

export const ProgressCards = ({
  resultsBySector,
  sectors,
  totalCriteriaCount,
}: ProgressCardsProps) => {
  const progressData = useMemo(() => {
    if (!sectors || !resultsBySector || totalCriteriaCount === 0) return [];

    return sectors.map((sector) => {
      const sectorResults = resultsBySector[sector.id];
      let definedCount = 0;

      if (sectorResults?.criterios) {
        definedCount = Object.values(sectorResults.criterios).filter(
          (c: any) => c.isMetaDefinida === true
        ).length;
      }

      const percentage =
        totalCriteriaCount > 0 ? (definedCount / totalCriteriaCount) * 100 : 0;

      return {
        id: sector.id,
        name: sector.nome,
        defined: definedCount,
        total: totalCriteriaCount,
        percentage,
        colorClass: getProgressColorClass(percentage),
      };
    });
  }, [resultsBySector, sectors, totalCriteriaCount]);

  if (progressData.length === 0) {
    return null;
  }

  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
      {progressData.map((progress) => (
        <Card key={progress.id}>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              {progress.name}
            </CardTitle>
            {/* ✅ SUBSTITUÍDO O SPAN POR UM BADGE DINÂMICO */}
            <Badge
              variant='outline'
              className={cn(
                'text-xs',
                progress.percentage === 100
                  ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                  : 'dark:bg-slate-800'
              )}
            >
              <Target className='mr-1 h-3 w-3' />
              {progress.defined} de {progress.total} metas
            </Badge>
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-2'>
              {progress.percentage === 100 && (
                <CheckCircle2 className='h-7 w-7 text-green-500' />
              )}
              <div className='text-2xl font-bold'>
                {`${Math.round(progress.percentage)}%`}
              </div>
            </div>
            <DynamicProgressBar
              value={progress.percentage}
              colorClass={progress.colorClass}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
