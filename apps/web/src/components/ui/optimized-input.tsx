// apps/web/src/components/ui/optimized-input.tsx
'use client';
import { Input } from '@/components/ui/input';
import {
  useDebouncedInput,
  useDebouncedNumberInput,
} from '@/hooks/useDebounce';
import { cn } from '@/lib/utils';
import { AlertCircle, Loader2 } from 'lucide-react';
import React, { forwardRef } from 'react';

// Interface para input de texto com debounce
interface OptimizedTextInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value'
  > {
  value?: string;
  onDebouncedChange?: (value: string) => void;
  debounceMs?: number;
  showTypingIndicator?: boolean;
}

// Input de texto otimizado
export const OptimizedTextInput = forwardRef<
  HTMLInputElement,
  OptimizedTextInputProps
>(
  (
    {
      value: externalValue = '',
      onDebouncedChange,
      debounceMs = 300,
      showTypingIndicator = true,
      className,
      ...props
    },
    ref
  ) => {
    const {
      value: localValue,
      isTyping,
      onChange: handleChange,
    } = useDebouncedInput(externalValue, onDebouncedChange, debounceMs);

    return (
      <div className='relative'>
        <Input
          ref={ref}
          {...props}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            className,
            isTyping &&
              showTypingIndicator &&
              'border-blue-400 ring-1 ring-blue-400'
          )}
        />
        {isTyping && showTypingIndicator && (
          <div className='absolute right-2 top-1/2 transform -translate-y-1/2'>
            <Loader2 className='h-3 w-3 animate-spin text-blue-500' />
          </div>
        )}
      </div>
    );
  }
);

OptimizedTextInput.displayName = 'OptimizedTextInput';

// Interface para input numérico com debounce
interface OptimizedNumberInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'value' | 'type'
  > {
  value?: number | null;
  onDebouncedChange?: (value: number | null) => void;
  debounceMs?: number;
  showTypingIndicator?: boolean;
  showValidation?: boolean;
  min?: number;
  max?: number;
  allowDecimals?: boolean;
}

// Input numérico otimizado
export const OptimizedNumberInput = forwardRef<
  HTMLInputElement,
  OptimizedNumberInputProps
>(
  (
    {
      value: externalValue = null,
      onDebouncedChange,
      debounceMs = 300,
      showTypingIndicator = true,
      showValidation = true,
      min,
      max,
      allowDecimals = true,
      className,
      ...props
    },
    ref
  ) => {
    const {
      value: localValue,
      numericValue,
      isTyping,
      error,
      isValid,
      onChange: handleChange,
    } = useDebouncedNumberInput(externalValue, onDebouncedChange, debounceMs, {
      min,
      max,
      allowDecimals,
    });

    const hasError = showValidation && error;
    const isInputValid = showValidation && isValid;

    return (
      <div className='relative'>
        <Input
          ref={ref}
          {...props}
          type='text'
          inputMode={allowDecimals ? 'decimal' : 'numeric'}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          className={cn(
            className,
            // Estados visuais
            isTyping &&
              showTypingIndicator &&
              'border-blue-400 ring-1 ring-blue-400',
            hasError && 'border-red-400 ring-1 ring-red-400',
            isInputValid &&
              !isTyping &&
              'border-green-400 ring-1 ring-green-400'
          )}
        />

        {/* Indicadores visuais */}
        <div className='absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1'>
          {isTyping && showTypingIndicator && (
            <Loader2 className='h-3 w-3 animate-spin text-blue-500' />
          )}
          {hasError && <AlertCircle className='h-3 w-3 text-red-500' />}
        </div>

        {/* Mensagem de erro */}
        {hasError && (
          <div className='absolute top-full mt-1 text-xs text-red-600 bg-white px-2 py-1 rounded shadow-sm border border-red-200 z-10'>
            {error}
          </div>
        )}
      </div>
    );
  }
);

OptimizedNumberInput.displayName = 'OptimizedNumberInput';

// Hook para facilitar uso em formulários
export const useOptimizedFormInput = (
  initialValue: string | number | null = '',
  onSubmit?: (value: any) => void,
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: RegExp;
  }
) => {
  const [isDirty, setIsDirty] = React.useState(false);
  const [hasBeenFocused, setHasBeenFocused] = React.useState(false);

  const handleDebouncedChange = React.useCallback(
    (value: any) => {
      setIsDirty(true);
      if (onSubmit) {
        onSubmit(value);
      }
    },
    [onSubmit]
  );

  const handleFocus = React.useCallback(() => {
    setHasBeenFocused(true);
  }, []);

  const handleBlur = React.useCallback(() => {
    // Validação pode ser executada no blur se necessário
  }, []);

  const reset = React.useCallback(() => {
    setIsDirty(false);
    setHasBeenFocused(false);
  }, []);

  return {
    isDirty,
    hasBeenFocused,
    onDebouncedChange: handleDebouncedChange,
    onFocus: handleFocus,
    onBlur: handleBlur,
    reset,
  };
};

// Componente de input para metas especificamente
interface MetaInputProps {
  value?: number | null;
  onChange?: (value: number | null) => void;
  criterionName?: string;
  sectorName?: string;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export const MetaInput = React.memo<MetaInputProps>(
  ({
    value,
    onChange,
    criterionName,
    sectorName,
    isLoading,
    placeholder = 'Digite o valor da meta...',
    className,
  }) => {
    const formInput = useOptimizedFormInput(value, onChange);

    return (
      <div className='space-y-2'>
        {(criterionName || sectorName) && (
          <div className='text-xs text-muted-foreground'>
            {criterionName && <span>Critério: {criterionName}</span>}
            {criterionName && sectorName && <span> • </span>}
            {sectorName && <span>Setor: {sectorName}</span>}
          </div>
        )}

        <OptimizedNumberInput
          value={value}
          onDebouncedChange={formInput.onDebouncedChange}
          onFocus={formInput.onFocus}
          onBlur={formInput.onBlur}
          placeholder={placeholder}
          className={className}
          min={0}
          allowDecimals={true}
          showValidation={formInput.hasBeenFocused}
          disabled={isLoading}
        />

        {isLoading && (
          <div className='text-xs text-muted-foreground flex items-center gap-1'>
            <Loader2 className='h-3 w-3 animate-spin' />
            Salvando...
          </div>
        )}
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Comparação otimizada para evitar re-renders desnecessários
    return (
      prevProps.value === nextProps.value &&
      prevProps.criterionName === nextProps.criterionName &&
      prevProps.sectorName === nextProps.sectorName &&
      prevProps.isLoading === nextProps.isLoading &&
      prevProps.placeholder === nextProps.placeholder
    );
  }
);

MetaInput.displayName = 'MetaInput';
