import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNumber = (
  num: number | string | null | undefined,
  decimals = 2
): string => {
  if (num === null || num === undefined) return '-'; // Retorna '-' para nulo ou indefinido

  let numericValue: number;

  // Tenta converter se for string
  if (typeof num === 'string') {
    numericValue = parseFloat(num);
  } else {
    numericValue = num; // Assume que já é número
  }

  // Verifica se a conversão falhou ou se não é um número finito
  if (isNaN(numericValue) || !isFinite(numericValue)) return '-';

  // Formata o número válido
  return numericValue.toFixed(decimals);
};

export const formatPercent = (ratio: number | null | undefined): string => {
  if (ratio === null || ratio === undefined || !isFinite(ratio)) return '-';
  if (!isFinite(ratio)) return 'N/A'; // Trata Infinity
  return `${(ratio * 100).toFixed(1)}%`; // Formata como porcentagem
};
