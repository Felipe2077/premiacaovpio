// apps/web/src/components/parameters/memoized/SimpleMemoized.tsx
'use client';
import React from 'react';
import { PlanningCellCard } from '../PlanningCellCard';
import { SectorProgressIndicator } from '../progress/SectorProgressIndicator';

// ✅ MEMOIZAÇÃO SIMPLES - SEM COMPARAÇÕES CUSTOMIZADAS
export const MemoizedPlanningCellCard = React.memo(PlanningCellCard);
export const MemoizedSectorProgressIndicator = React.memo(
  SectorProgressIndicator
);

// ✅ MEMOIZAÇÃO DO HEADER DA TABELA - ESTÁTICO
export const MemoizedTableHeader = React.memo(
  ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  }
);

// ✅ MEMOIZAÇÃO SIMPLES PARA INPUTS COM DEBOUNCE
interface DebouncedInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  type?: string;
}

export const DebouncedInput = React.memo<DebouncedInputProps>(
  ({ value, onChange, placeholder, className, type = 'text' }) => {
    const [localValue, setLocalValue] = React.useState(value);
    const timeoutRef = React.useRef<NodeJS.Timeout>();

    // Atualizar valor local quando prop externa mudar
    React.useEffect(() => {
      setLocalValue(value);
    }, [value]);

    // Debounce da mudança
    const handleChange = React.useCallback(
      (newValue: string) => {
        setLocalValue(newValue);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          onChange(newValue);
        }, 300);
      },
      [onChange]
    );

    // Cleanup
    React.useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <input
        type={type}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    );
  }
);

DebouncedInput.displayName = 'DebouncedInput';
