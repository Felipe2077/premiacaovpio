// apps/web/src/components/admin/AdminComponents.tsx
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { companyClasses } from '@/lib/theme';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  Clock,
  ExternalLink,
  Minus,
  XCircle,
} from 'lucide-react';
import { ReactNode } from 'react';

// ===== STATUS BADGES =====
interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'pending' | 'error' | 'success' | 'warning';
  children: ReactNode;
  size?: 'sm' | 'default' | 'lg';
}

export function StatusBadge({
  status,
  children,
  size = 'default',
}: StatusBadgeProps) {
  const variants = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  const icons = {
    active: CheckCircle,
    inactive: XCircle,
    pending: Clock,
    error: AlertCircle,
    success: CheckCircle,
    warning: AlertCircle,
  };

  const Icon = icons[status];

  return (
    <Badge
      className={cn(
        'flex items-center space-x-1 border font-medium',
        variants[status],
        size === 'sm' && 'text-xs px-2 py-0.5',
        size === 'lg' && 'text-sm px-3 py-1'
      )}
    >
      <Icon className='h-3 w-3' />
      <span>{children}</span>
    </Badge>
  );
}

// ===== CARDS DE ESTATÍSTICAS =====
interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<any>;
  trend?: {
    value: number;
    type: 'up' | 'down' | 'neutral';
    period: string;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  isLoading?: boolean;
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  variant = 'default',
  isLoading,
}: StatsCardProps) {
  const variants = {
    default: 'border-slate-200 bg-white',
    primary: 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50',
    success: 'border-green-200 bg-gradient-to-br from-green-50 to-emerald-50',
    warning: 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50',
    error: 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50',
  };

  const iconColors = {
    default: 'text-slate-600',
    primary: 'text-yellow-600',
    success: 'text-green-600',
    warning: 'text-orange-600',
    error: 'text-red-600',
  };

  const getTrendIcon = (type: 'up' | 'down' | 'neutral') => {
    switch (type) {
      case 'up':
        return ArrowUp;
      case 'down':
        return ArrowDown;
      default:
        return Minus;
    }
  };

  const getTrendColor = (type: 'up' | 'down' | 'neutral') => {
    switch (type) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-slate-600';
    }
  };

  if (isLoading) {
    return (
      <Card className='border border-slate-200'>
        <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
          <Skeleton className='h-4 w-24' />
          <Skeleton className='h-4 w-4' />
        </CardHeader>
        <CardContent>
          <Skeleton className='h-8 w-16 mb-2' />
          <Skeleton className='h-3 w-32' />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'border shadow-sm transition-all hover:shadow-md',
        variants[variant]
      )}
    >
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium text-slate-700'>
          {title}
        </CardTitle>
        <Icon className={cn('h-4 w-4', iconColors[variant])} />
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold text-slate-900 mb-1'>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>

        <div className='flex items-center justify-between'>
          {description && (
            <p className='text-sm text-slate-600'>{description}</p>
          )}

          {trend && (
            <div
              className={cn(
                'flex items-center space-x-1 text-xs',
                getTrendColor(trend.type)
              )}
            >
              {(() => {
                const TrendIcon = getTrendIcon(trend.type);
                return <TrendIcon className='h-3 w-3' />;
              })()}
              <span className='font-medium'>{Math.abs(trend.value)}%</span>
              <span className='text-slate-500'>{trend.period}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ===== GRID DE ESTATÍSTICAS =====
interface StatsGridProps {
  stats: Array<Omit<StatsCardProps, 'isLoading'> & { id: string }>;
  isLoading?: boolean;
  columns?: 2 | 3 | 4;
}

export function StatsGrid({ stats, isLoading, columns = 4 }: StatsGridProps) {
  // Calcula o número real de colunas baseado na quantidade de stats
  const actualColumns = Math.min(stats.length, columns);

  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[actualColumns])}>
      {stats.map((stat) => (
        <StatsCard key={stat.id} {...stat} isLoading={isLoading} />
      ))}
    </div>
  );
}

// ===== HEADER DE PÁGINA ADMIN =====
interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function AdminPageHeader({
  title,
  description,
  actions,
}: AdminPageHeaderProps) {
  return (
    <div className='mb-8'>
      {/* Header principal */}
      <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
        <div>
          <h1 className='text-3xl font-bold text-slate-900 mb-2'>{title}</h1>
          {description && (
            <p className='text-slate-600 text-lg'>{description}</p>
          )}
        </div>

        {actions && (
          <div className='flex items-center space-x-3 bg-amber-300 p-3 rounded-lg hover:bg-amber-200 cursor-pointer'>
            {actions}
            <ExternalLink className='h-5 w-5 text-yellow-600' />
          </div>
        )}
      </div>
    </div>
  );
}

// ===== BOTÃO DE AÇÃO PRIMÁRIO =====
interface PrimaryActionButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'primary' | 'secondary';
  icon?: React.ComponentType<any>;
}

export function PrimaryActionButton({
  children,
  onClick,
  href,
  disabled,
  loading,
  size = 'default',
  variant = 'primary',
  icon: Icon,
}: PrimaryActionButtonProps) {
  const variants = {
    primary: companyClasses.button.primary,
    secondary: companyClasses.button.secondary,
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  const buttonClass = cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed',
    variants[variant],
    sizes[size]
  );

  const content = (
    <>
      {loading && (
        <div className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
      )}
      {Icon && !loading && <Icon className='mr-2 h-4 w-4' />}
      {children}
    </>
  );

  if (href) {
    return (
      <a href={href} className={buttonClass}>
        {content}
      </a>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className={buttonClass}
    >
      {content}
    </Button>
  );
}

// ===== INDICADOR DE STATUS DO SISTEMA =====
export function SystemStatusIndicator() {
  return (
    <div className='flex items-center space-x-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full'>
      <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse' />
      <span className='text-xs font-medium text-green-700'>Sistema Online</span>
    </div>
  );
}

// ===== LOADING SKELETON PARA TABELAS =====
export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className='space-y-3'>
      {/* Header */}
      <div className='flex space-x-4'>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className='h-4 flex-1' />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className='flex space-x-4'>
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className='h-8 flex-1' />
          ))}
        </div>
      ))}
    </div>
  );
}
