// apps/web/src/components/vigencias/TieIndicator.tsx
'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';

interface TiedGroup {
  pontuacao: number;
  sectors: Array<{
    rank: number;
    nome: string;
    pontuacao: number;
  }>;
}

interface TieIndicatorProps {
  tieData: {
    hasGlobalTies: boolean;
    winnerTieGroup?: TiedGroup;
    tiedGroups: TiedGroup[];
  };
  compact?: boolean;
  className?: string;
}

export function TieIndicator({
  tieData,
  compact = false,
  className,
}: TieIndicatorProps) {
  const { hasGlobalTies, winnerTieGroup, tiedGroups } = tieData;

  if (!hasGlobalTies) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <CheckCircle className='h-4 w-4 text-green-600' />
        <span className='text-sm text-green-700 font-medium'>
          Sem empates detectados
        </span>
      </div>
    );
  }

  const hasWinnerTie = !!winnerTieGroup;

  if (compact) {
    return (
      <Badge
        variant={hasWinnerTie ? 'destructive' : 'outline'}
        className={`inline-flex items-center gap-1 ${className}`}
      >
        <AlertTriangle className='h-3 w-3' />
        {hasWinnerTie ? 'Empate na 1ª posição' : 'Empates detectados'}
      </Badge>
    );
  }

  return (
    <Alert
      className={`${hasWinnerTie ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'} ${className}`}
    >
      <AlertTriangle
        className={`h-4 w-4 ${hasWinnerTie ? 'text-red-600' : 'text-orange-600'}`}
      />
      <AlertDescription className='space-y-2'>
        <div className='font-medium'>
          {hasWinnerTie
            ? 'Empate na primeira posição detectado!'
            : 'Empates detectados no ranking'}
        </div>

        {winnerTieGroup && (
          <div className='text-sm'>
            <span className='font-medium'>Setores empatados em 1º lugar:</span>
            <div className='flex flex-wrap gap-1 mt-1'>
              {winnerTieGroup.sectors.map((sector) => (
                <Badge key={sector.nome} variant='outline' className='text-xs'>
                  {sector.nome} ({sector.pontuacao} pts)
                </Badge>
              ))}
            </div>
          </div>
        )}

        {tiedGroups.length > 0 && !hasWinnerTie && (
          <div className='text-sm space-y-1'>
            {tiedGroups.map((group, index) => (
              <div key={index}>
                <span className='font-medium'>
                  Empate com {group.pontuacao} pontos:
                </span>
                <div className='flex flex-wrap gap-1 mt-1'>
                  {group.sectors.map((sector) => (
                    <Badge
                      key={sector.nome}
                      variant='outline'
                      className='text-xs'
                    >
                      {sector.nome}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {hasWinnerTie && (
          <div className='text-xs text-red-700 font-medium'>
            🎯 Resolução manual pelo diretor necessária
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
