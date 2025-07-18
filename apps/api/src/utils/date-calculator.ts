// apps/api/src/utils/date-calculator.ts
import { HolidayClassificationType } from '@/entity/holiday-classification.entity';

interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface MonthlyCalendar {
  year: number;
  month: number; // 1-12
  totalDays: number;
  weekdays: number; // Segunda a sexta
  saturdays: number;
  sundays: number;
  holidays: number;
  workingDays: number; // Considerando feriados classificados
}

interface HolidayClassification {
  date: string; // YYYY-MM-DD
  classification: HolidayClassificationType;
}

interface DailyPattern {
  dayType: 'UTIL' | 'SABADO' | 'DOMINGO_FERIADO';
  count: number;
  percentage: number;
}

export class DateCalculator {
  constructor() {
    console.log(
      '[DateCalculator] Utilitário de cálculos de calendário inicializado'
    );
  }

  /**
   * Calcula estatísticas de um mês específico
   */
  calculateMonthlyStats(
    year: number,
    month: number,
    holidayClassifications: HolidayClassification[] = []
  ): MonthlyCalendar {
    const daysInMonth = new Date(year, month, 0).getDate();
    let weekdays = 0;
    let saturdays = 0;
    let sundays = 0;
    let holidays = 0;

    // Mapear feriados classificados por data
    const holidayMap = new Map<string, HolidayClassificationType>();
    holidayClassifications.forEach((holiday) => {
      holidayMap.set(holiday.date, holiday.classification);
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay(); // 0=domingo, 6=sábado
      const dateString = this.formatDateAsString(date);

      // Verificar se é feriado classificado
      const holidayClassification = holidayMap.get(dateString);

      if (holidayClassification) {
        holidays++;
        // Contar conforme classificação do feriado
        switch (holidayClassification) {
          case 'UTIL':
            weekdays++;
            break;
          case 'SABADO':
            saturdays++;
            break;
          case 'DOMINGO_FERIADO':
            sundays++;
            break;
        }
      } else {
        // Dia normal sem feriado
        if (dayOfWeek === 0) {
          // Domingo
          sundays++;
        } else if (dayOfWeek === 6) {
          // Sábado
          saturdays++;
        } else {
          // Segunda a sexta
          weekdays++;
        }
      }
    }

    const workingDays = weekdays; // Considerar apenas dias úteis como working days

    return {
      year,
      month,
      totalDays: daysInMonth,
      weekdays,
      saturdays,
      sundays,
      holidays,
      workingDays,
    };
  }

  /**
   * Analisa padrões diários de um período
   */
  analyzeDailyPatterns(
    startDate: string,
    endDate: string,
    holidayClassifications: HolidayClassification[] = []
  ): DailyPattern[] {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const patterns = {
      UTIL: 0,
      SABADO: 0,
      DOMINGO_FERIADO: 0,
    };

    // Mapear feriados
    const holidayMap = new Map<string, HolidayClassificationType>();
    holidayClassifications.forEach((holiday) => {
      holidayMap.set(holiday.date, holiday.classification);
    });

    let totalDays = 0;
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateString = this.formatDateAsString(currentDate);
      const dayOfWeek = currentDate.getDay();

      const holidayClassification = holidayMap.get(dateString);

      if (holidayClassification) {
        patterns[holidayClassification]++;
      } else {
        if (dayOfWeek === 0) {
          patterns.DOMINGO_FERIADO++;
        } else if (dayOfWeek === 6) {
          patterns.SABADO++;
        } else {
          patterns.UTIL++;
        }
      }

      totalDays++;
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return Object.entries(patterns).map(([dayType, count]) => ({
      dayType: dayType as 'UTIL' | 'SABADO' | 'DOMINGO_FERIADO',
      count,
      percentage: totalDays > 0 ? (count / totalDays) * 100 : 0,
    }));
  }

  /**
   * Projeta padrões para um mês futuro
   */
  projectPatternsForMonth(
    year: number,
    month: number,
    referencePatterns: DailyPattern[],
    holidayClassifications: HolidayClassification[] = []
  ): {
    projectedDays: Record<string, number>;
    totalProjectedDays: number;
    confidence: number;
  } {
    const monthStats = this.calculateMonthlyStats(
      year,
      month,
      holidayClassifications
    );

    // Mapear padrões de referência
    const patternMap = new Map<string, number>();
    referencePatterns.forEach((pattern) => {
      patternMap.set(pattern.dayType, pattern.count);
    });

    const projectedDays = {
      UTIL: monthStats.weekdays,
      SABADO: monthStats.saturdays,
      DOMINGO_FERIADO: monthStats.sundays,
    };

    const totalProjectedDays = Object.values(projectedDays).reduce(
      (sum, days) => sum + days,
      0
    );

    // Calcular confiança baseada na similaridade dos padrões
    const confidence = this.calculatePatternConfidence(
      referencePatterns,
      monthStats
    );

    return {
      projectedDays,
      totalProjectedDays,
      confidence,
    };
  }

  /**
   * Busca período de referência (mês anterior)
   */
  getPreviousMonthRange(yearMonth: string): DateRange {
    const [year, month] = yearMonth.split('-').map(Number);

    let prevYear = year;
    let prevMonth = month - 1;

    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    const startDate = new Date(prevYear, prevMonth - 1, 1);
    const endDate = new Date(prevYear, prevMonth, 0); // Último dia do mês

    return { startDate, endDate };
  }

  /**
   * Busca período de N meses atrás
   */
  getMonthsAgoRange(yearMonth: string, monthsBack: number): DateRange {
    const [year, month] = yearMonth.split('-').map(Number);

    let targetYear = year;
    let targetMonth = month - monthsBack;

    while (targetMonth <= 0) {
      targetMonth += 12;
      targetYear -= 1;
    }

    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0);

    return { startDate, endDate };
  }

  /**
   * Converte período YYYY-MM para range de datas
   */
  convertPeriodToDateRange(yearMonth: string): DateRange {
    const [year, month] = yearMonth.split('-').map(Number);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return { startDate, endDate };
  }

  /**
   * Formata data como string YYYY-MM-DD
   */
  formatDateAsString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Formata range de datas para queries
   */
  formatDateRangeForQuery(range: DateRange): {
    startDate: string;
    endDate: string;
  } {
    return {
      startDate: this.formatDateAsString(range.startDate),
      endDate: this.formatDateAsString(range.endDate),
    };
  }

  /**
   * Valida se uma data está em formato válido
   */
  isValidDateString(dateString: string): boolean {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Calcula diferença em dias entre duas datas
   */
  calculateDaysDifference(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Verifica se é fim de semana
   */
  isWeekend(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Domingo ou sábado
  }

  /**
   * Busca próximo dia útil
   */
  getNextBusinessDay(date: Date, holidayDates: string[] = []): Date {
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    while (
      this.isWeekend(nextDay) ||
      holidayDates.includes(this.formatDateAsString(nextDay))
    ) {
      nextDay.setDate(nextDay.getDate() + 1);
    }

    return nextDay;
  }

  /**
   * Calcula confiança do padrão baseado na consistência
   */
  private calculatePatternConfidence(
    referencePatterns: DailyPattern[],
    monthStats: MonthlyCalendar
  ): number {
    // Algoritmo simples: quanto mais próximo dos padrões históricos, maior a confiança
    const totalReference = referencePatterns.reduce(
      (sum, p) => sum + p.count,
      0
    );
    const totalMonth = monthStats.totalDays;

    if (totalReference === 0) return 0.5; // Confiança média sem dados

    // Comparar proporções
    const referenceProportion =
      referencePatterns.find((p) => p.dayType === 'UTIL')?.percentage || 0;
    const monthProportion = (monthStats.weekdays / monthStats.totalDays) * 100;

    const proportionDiff = Math.abs(referenceProportion - monthProportion);
    const confidence = Math.max(0, Math.min(1, 1 - proportionDiff / 100));

    return confidence;
  }

  /**
   * Gera relatório de período para debugging
   */
  generatePeriodReport(
    yearMonth: string,
    holidayClassifications: HolidayClassification[] = []
  ): {
    period: string;
    monthStats: MonthlyCalendar;
    dailyBreakdown: Array<{
      date: string;
      dayOfWeek: string;
      dayType: string;
      isHoliday: boolean;
      holidayClassification?: HolidayClassificationType;
    }>;
  } {
    const [year, month] = yearMonth.split('-').map(Number);
    const monthStats = this.calculateMonthlyStats(
      year,
      month,
      holidayClassifications
    );

    const holidayMap = new Map<string, HolidayClassificationType>();
    holidayClassifications.forEach((holiday) => {
      holidayMap.set(holiday.date, holiday.classification);
    });

    const dailyBreakdown: Array<{
      date: string;
      dayOfWeek: string;
      dayType: string;
      isHoliday: boolean;
      holidayClassification?: HolidayClassificationType;
    }> = [];

    const daysInMonth = new Date(year, month, 0).getDate();
    const dayNames = [
      'Domingo',
      'Segunda',
      'Terça',
      'Quarta',
      'Quinta',
      'Sexta',
      'Sábado',
    ];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dateString = this.formatDateAsString(date);
      const dayOfWeek = date.getDay();
      const holidayClassification = holidayMap.get(dateString);

      let dayType: string;
      if (holidayClassification) {
        dayType = holidayClassification;
      } else if (dayOfWeek === 0) {
        dayType = 'DOMINGO_FERIADO';
      } else if (dayOfWeek === 6) {
        dayType = 'SABADO';
      } else {
        dayType = 'UTIL';
      }

      dailyBreakdown.push({
        date: dateString,
        dayOfWeek: dayNames[dayOfWeek],
        dayType,
        isHoliday: !!holidayClassification,
        holidayClassification,
      });
    }

    return {
      period: yearMonth,
      monthStats,
      dailyBreakdown,
    };
  }
}
