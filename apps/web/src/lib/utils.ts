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
  return `${(ratio * 100).toFixed(2)}%`; // Formata como porcentagem
};

// --- FUNÇÃO formatDate ---
export const formatDate = (
  isoString: string | Date | undefined | null
): string => {
  if (!isoString) return '-';
  try {
    // Retorna apenas a data no formato DD/MM/AAAA
    return new Date(isoString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return String(isoString); // Retorna string original se falhar
  }
};

// src/lib/utils.ts
export const formatDateToYearMonth = (
  dateInput: Date | string | number
): string => {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    console.error('formatDateToYearMonth: Data inválida fornecida', dateInput);
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`; // Fallback
  }
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
};
