// apps/web/src/hooks/useDebounce.ts
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook de debounce para otimizar performance de inputs
 * Retorna valor com delay e função para atualização imediata
 */
export function useDebounce<T>(value: T, delay: number = 300) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Limpar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Definir novo timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedValue;
}

/**
 * Hook para input com estado local otimista + debounce
 * Fornece feedback imediato ao usuário
 */
export function useDebouncedInput(
  initialValue: string = '',
  onDebouncedChange?: (value: string) => void,
  delay: number = 300
) {
  const [localValue, setLocalValue] = useState(initialValue);
  const [isTyping, setIsTyping] = useState(false);
  const debouncedValue = useDebounce(localValue, delay);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Callback para mudança local (imediata)
  const handleLocalChange = useCallback(
    (value: string) => {
      setLocalValue(value);
      setIsTyping(true);

      // Limpar timeout anterior
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Definir que parou de digitar após delay + 50ms
      timeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, delay + 50);
    },
    [delay]
  );

  // Efeito para chamar callback quando valor estabilizar
  useEffect(() => {
    if (onDebouncedChange && debouncedValue !== initialValue) {
      onDebouncedChange(debouncedValue);
    }
  }, [debouncedValue, onDebouncedChange, initialValue]);

  // Atualizar valor local quando prop externa mudar
  useEffect(() => {
    if (initialValue !== localValue && !isTyping) {
      setLocalValue(initialValue);
    }
  }, [initialValue, localValue, isTyping]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    value: localValue,
    debouncedValue,
    isTyping,
    onChange: handleLocalChange,
    setValue: setLocalValue,
  };
}

/**
 * Hook específico para inputs numéricos com validação
 */
export function useDebouncedNumberInput(
  initialValue: number | null = null,
  onDebouncedChange?: (value: number | null) => void,
  delay: number = 300,
  options: {
    min?: number;
    max?: number;
    allowDecimals?: boolean;
  } = {}
) {
  const { min, max, allowDecimals = true } = options;

  const [localValue, setLocalValue] = useState(initialValue?.toString() || '');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedValue = useDebounce(localValue, delay);
  const timeoutRef = useRef<NodeJS.Timeout>();

  // Validar valor numérico
  const validateNumber = useCallback(
    (value: string): number | null => {
      if (!value.trim()) return null;

      const num = allowDecimals ? parseFloat(value) : parseInt(value, 10);

      if (isNaN(num)) {
        setError('Valor deve ser um número válido');
        return null;
      }

      if (min !== undefined && num < min) {
        setError(`Valor deve ser maior ou igual a ${min}`);
        return null;
      }

      if (max !== undefined && num > max) {
        setError(`Valor deve ser menor ou igual a ${max}`);
        return null;
      }

      setError(null);
      return num;
    },
    [min, max, allowDecimals]
  );

  // Callback para mudança local
  const handleLocalChange = useCallback(
    (value: string) => {
      setLocalValue(value);
      setIsTyping(true);
      setError(null); // Limpar erro enquanto digita

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, delay + 50);
    },
    [delay]
  );

  // Efeito para processar valor quando estabilizar
  useEffect(() => {
    if (!isTyping && debouncedValue !== (initialValue?.toString() || '')) {
      const validatedNumber = validateNumber(debouncedValue);
      if (onDebouncedChange) {
        onDebouncedChange(validatedNumber);
      }
    }
  }, [
    debouncedValue,
    isTyping,
    onDebouncedChange,
    validateNumber,
    initialValue,
  ]);

  // Atualizar quando prop externa mudar
  useEffect(() => {
    const newValue = initialValue?.toString() || '';
    if (newValue !== localValue && !isTyping) {
      setLocalValue(newValue);
      setError(null);
    }
  }, [initialValue, localValue, isTyping]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    value: localValue,
    numericValue: validateNumber(localValue),
    debouncedValue,
    isTyping,
    error,
    isValid: error === null && localValue.trim() !== '',
    onChange: handleLocalChange,
    setValue: setLocalValue,
  };
}
