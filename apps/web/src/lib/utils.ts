import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatNumber = (
  num: number | null | undefined,
  decimals = 2
): string => {
  if (num === null || num === undefined || !isFinite(num)) return '-';
  // Use toLocaleString para formato PT-BR se desejar (ex: 1.500,50)
  // return num.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return num.toFixed(decimals); // Simples com ponto decimal
};

export const formatPercent = (ratio: number | null | undefined): string => {
  if (ratio === null || ratio === undefined || !isFinite(ratio)) return '-';
  if (!isFinite(ratio)) return 'N/A'; // Trata Infinity
  return `${(ratio * 100).toFixed(1)}%`; // Formata como porcentagem
};
