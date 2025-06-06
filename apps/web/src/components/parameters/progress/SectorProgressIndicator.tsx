import { cn } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { SectorProgressProps, getProgressBarColor } from './types';

export const SectorProgressIndicator: React.FC<SectorProgressProps> = ({
  setorNome,
  definidas,
  total,
  percentual,
  isLoading = false,
}) => {
  const [animatedPercentual, setAnimatedPercentual] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const progressColor = getProgressBarColor(percentual);
  const isComplete = percentual === 100;

  // Animação do progresso
  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
      setAnimatedPercentual(percentual);

      // Trigger celebration quando chega a 100%
      if (percentual === 100 && animatedPercentual < 100) {
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 600);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [percentual, isLoading, animatedPercentual]);

  if (isLoading) {
    return (
      <div className='flex flex-col gap-1 mt-2'>
        <div className='h-3 w-12 bg-muted animate-pulse rounded mx-auto' />
        <div className='h-1 w-full bg-muted animate-pulse rounded-full' />
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-1.5 mt-2 px-1 relative'>
      {/* Contador de metas */}
      <div className='flex items-center justify-center gap-1'>
        <span
          className={cn(
            'text-xs font-medium transition-colors duration-300',
            progressColor === 'neutral' && 'text-muted-foreground',
            progressColor === 'progress' && 'text-blue-600 dark:text-blue-400',
            progressColor === 'complete' && 'text-green-600 dark:text-green-400'
          )}
        >
          {definidas}/{total}
        </span>

        {/* Ícone de celebração */}
        {isComplete && (
          <span
            className={cn(
              'text-xs transition-all duration-300',
              showCelebration && 'animate-bounce'
            )}
          >
            🎉
          </span>
        )}
      </div>

      {/* Barra de progresso */}
      <div className='w-full h-1.5 bg-muted/40 dark:bg-slate-700/50 rounded-full overflow-hidden relative'>
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden',
            progressColor === 'neutral' && 'bg-muted-foreground/30',
            progressColor === 'progress' &&
              'bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500',
            progressColor === 'complete' &&
              'bg-gradient-to-r from-green-500 to-green-600 dark:from-green-400 dark:to-green-500',
            showCelebration && 'animate-pulse'
          )}
          style={{ width: `${animatedPercentual}%` }}
        >
          {/* Shimmer effect para progresso ativo */}
          {progressColor === 'progress' && animatedPercentual > 0 && (
            <div
              className='absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12'
              style={{
                animation: 'shimmer 2s infinite',
                animationDelay: '0.5s',
              }}
            />
          )}
        </div>
      </div>

      {/* Celebração quando completa */}
      {showCelebration && (
        <div className='absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs text-green-600 dark:text-green-400 font-medium animate-bounce whitespace-nowrap bg-white/90 dark:bg-slate-800/90 px-2 py-1 rounded shadow-sm border border-green-200 dark:border-green-700'>
          Completo!
        </div>
      )}
    </div>
  );
};
