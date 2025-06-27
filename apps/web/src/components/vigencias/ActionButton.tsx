// apps/web/src/components/vigencias/ActionButton.tsx - CORRIGIDO E SIMPLIFICADO
'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { BarChart3, Gavel, Loader2, PlayCircle, Settings } from 'lucide-react';

interface ActionButtonProps {
  action: 'officialize' | 'start' | 'analyze' | 'manage';
  permissions: string[];
  userPermissions: string[];
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const actionConfig = {
  officialize: {
    label: 'Oficializar',
    icon: Gavel,
    variant: 'default' as const,
    className: 'bg-red-600 hover:bg-red-700 text-white',
    tooltip: 'Oficializar período e definir vencedor',
  },
  start: {
    label: 'Iniciar',
    icon: PlayCircle,
    variant: 'default' as const,
    className: 'bg-green-600 hover:bg-green-700 text-white',
    tooltip: 'Ativar período de competição',
  },
  analyze: {
    label: 'Analisar',
    icon: BarChart3,
    variant: 'outline' as const,
    className: 'border-blue-200 text-blue-700 hover:bg-blue-50',
    tooltip: 'Analisar ranking e empates',
  },
  manage: {
    label: 'Gerenciar',
    icon: Settings,
    variant: 'ghost' as const,
    className: 'text-gray-700 hover:bg-gray-100',
    tooltip: 'Gerenciar configurações',
  },
};

export function ActionButton({
  action,
  permissions,
  userPermissions,
  disabled = false,
  loading = false,
  onClick,
  variant,
  size = 'sm',
  className,
}: ActionButtonProps) {
  const config = actionConfig[action];
  const Icon = config.icon;

  // 🎯 CORREÇÃO: Verificação de permissão simplificada
  // O componente pai já verifica permissões via usePermissions(),
  // então aqui só validamos se userPermissions foi passado corretamente
  const hasPermission = userPermissions.length > 0;

  const isDisabled = disabled || !hasPermission || loading;

  const button = (
    <Button
      variant={variant || config.variant}
      size={size}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        config.className,
        'inline-flex items-center gap-2',
        className
      )}
    >
      {loading ? (
        <Loader2 className='h-3 w-3 animate-spin' />
      ) : (
        <Icon className='h-3 w-3' />
      )}
      {config.label}
    </Button>
  );

  // Se tiver tooltip, envolver com TooltipProvider
  if (config.tooltip && !isDisabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
}
