// apps/web/src/components/vigencias/PeriodStatusBadge.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Calendar, CheckCircle, Clock, PlayCircle } from 'lucide-react';

interface PeriodStatusBadgeProps {
  status: 'PLANEJAMENTO' | 'ATIVA' | 'PRE_FECHADA' | 'FECHADA';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  PLANEJAMENTO: {
    label: 'Planejamento',
    icon: Calendar,
    variant: 'secondary' as const,
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  ATIVA: {
    label: 'Ativa',
    icon: PlayCircle,
    variant: 'default' as const,
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  PRE_FECHADA: {
    label: 'Pré-fechada',
    icon: Clock,
    variant: 'outline' as const,
    className: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  FECHADA: {
    label: 'Fechada',
    icon: CheckCircle,
    variant: 'destructive' as const,
    className: 'bg-purple-100 text-purple-700 border-purple-200',
  },
};

export function PeriodStatusBadge({
  status,
  size = 'md',
  showIcon = true,
  className,
}: PeriodStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        config.className,
        sizeClasses[size],
        'inline-flex items-center gap-1.5 font-medium',
        className
      )}
    >
      {showIcon && <Icon className='h-3 w-3' />}
      {config.label}
    </Badge>
  );
}
