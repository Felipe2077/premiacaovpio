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
    let dateObj: Date;

    if (typeof isoString === 'string') {
      // 🎯 CORREÇÃO: Se a string é apenas uma data (YYYY-MM-DD),
      // tratar como data local para evitar problemas de fuso horário
      if (isoString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Data no formato YYYY-MM-DD (sem horário)
        const [year, month, day] = isoString.split('-').map(Number);
        dateObj = new Date(year, month - 1, day); // Cria data local
      } else {
        // Data com horário ou outro formato
        dateObj = new Date(isoString);
      }
    } else {
      dateObj = isoString;
    }

    // Verifica se a data é válida
    if (isNaN(dateObj.getTime())) {
      return String(isoString);
    }

    // Retorna formatação brasileira
    return dateObj.toLocaleDateString('pt-BR', {
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

/**
 * Formatar data e hora para exibição
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Calcular tempo decorrido desde uma data
 */
export function getTimeAgo(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `${diffMinutes} min atrás`;
  } else if (diffHours < 24) {
    return `${diffHours}h atrás`;
  } else if (diffDays < 7) {
    return `${diffDays}d atrás`;
  } else {
    return formatDate(dateObj);
  }
}

/**
 * Verificar se uma data está no passado
 */
export function isPastDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
}

/**
 * Verificar se uma data está no futuro
 */
export function isFutureDate(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > new Date();
}

/**
 * Obter cor do status do período
 */
export function getPeriodStatusColor(status: string): string {
  const colors = {
    PLANEJAMENTO: 'text-blue-700 bg-blue-100',
    ATIVA: 'text-green-700 bg-green-100',
    PRE_FECHADA: 'text-orange-700 bg-orange-100',
    FECHADA: 'text-purple-700 bg-purple-100',
  };

  return colors[status as keyof typeof colors] || 'text-gray-700 bg-gray-100';
}

/**
 * Formatar pontuação com precisão adequada
 */
export function formatScore(score: number): string {
  return score.toFixed(2).replace('.', ',');
}

/**
 * Truncar texto com reticências
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Converte formato técnico de período (YYYY-MM) para nome amigável
 * @param mesAno Período no formato "2025-06"
 * @returns String formatada como "Junho 2025"
 */
export const formatPeriodName = (mesAno: string | undefined | null): string => {
  if (!mesAno) return 'Período Indefinido';

  try {
    // Verifica se está no formato YYYY-MM
    if (!mesAno.match(/^\d{4}-\d{2}$/)) {
      return mesAno; // Retorna original se não está no formato esperado
    }

    const [year, month] = mesAno.split('-');

    if (!year || !month) return mesAno;

    const monthNumber = parseInt(month, 10);

    // Array com nomes dos meses em português
    const monthNames = [
      'Janeiro',
      'Fevereiro',
      'Março',
      'Abril',
      'Maio',
      'Junho',
      'Julho',
      'Agosto',
      'Setembro',
      'Outubro',
      'Novembro',
      'Dezembro',
    ];

    // Valida se o mês está no range correto
    if (monthNumber < 1 || monthNumber > 12) {
      return mesAno; // Retorna original se mês inválido
    }

    const monthName = monthNames[monthNumber - 1];

    return `${monthName} ${year}`;
  } catch {
    return mesAno; // Retorna original em caso de erro
  }
};
