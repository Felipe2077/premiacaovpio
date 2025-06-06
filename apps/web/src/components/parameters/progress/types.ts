export interface SectorProgressProps {
  setorNome: string;
  definidas: number;
  total: number;
  percentual: number;
  isLoading?: boolean;
}

export interface ProgressBarVariant {
  color: 'neutral' | 'progress' | 'complete';
}

export const getProgressBarColor = (
  percentual: number
): ProgressBarVariant['color'] => {
  if (percentual === 0) return 'neutral';
  if (percentual === 100) return 'complete';
  return 'progress';
};
