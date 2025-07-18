// apps/api/src/modules/operational-goals/holiday-management.service.ts
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import {
  HolidayClassificationEntity,
  HolidayClassificationType,
} from '@/entity/holiday-classification.entity';
import { UserEntity } from '@/entity/user.entity';
import { AuditLogService } from '@/modules/audit/audit.service';
import { IsNull, Repository } from 'typeorm';

interface Holiday {
  date: string;
  name: string;
  type: 'NACIONAL' | 'ESTADUAL' | 'MUNICIPAL';
}

interface HolidayClassificationRequest {
  date: string;
  classification: HolidayClassificationType;
  justification?: string;
}

interface HolidayStatus {
  hasUnclassifiedHolidays: boolean;
  holidays: Array<{
    date: string;
    name: string;
    type: string;
    isClassified: boolean;
    classification?: HolidayClassificationType;
  }>;
  allClassified: boolean;
}

export class HolidayManagementService {
  private holidayRepo: Repository<HolidayClassificationEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private userRepo: Repository<UserEntity>;
  private auditService: AuditLogService;

  constructor() {
    this.holidayRepo = AppDataSource.getRepository(HolidayClassificationEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.userRepo = AppDataSource.getRepository(UserEntity);
    this.auditService = new AuditLogService();

    console.log(
      '[HolidayManagementService] Instanciado e repositórios configurados.'
    );
  }

  /**
   * Detecta feriados automaticamente para um período e salva como não classificados
   */
  async detectHolidaysForPeriod(
    competitionPeriodId: number
  ): Promise<Holiday[]> {
    const period = await this.periodRepo.findOne({
      where: { id: competitionPeriodId },
    });

    if (!period) {
      throw new Error(
        `Período de competição ${competitionPeriodId} não encontrado`
      );
    }

    // Extrair ano e mês do período (formato: YYYY-MM)
    const [year, month] = period.mesAno.split('-');

    console.log(
      `[HolidayManagementService] Detectando feriados para ${year}-${month}`
    );

    try {
      // Buscar feriados nacionais do Brasil via API
      const nationalHolidays = await this.fetchNationalHolidays(year);

      // Filtrar apenas os feriados do mês específico
      const monthHolidays = nationalHolidays.filter((holiday) => {
        const holidayMonth = holiday.date.substring(5, 7);
        return holidayMonth === month;
      });

      // Buscar feriados locais (Brasília-DF) se necessário
      const localHolidays = await this.fetchLocalHolidays(year, month);

      // Combinar todos os feriados
      const allHolidays = [...monthHolidays, ...localHolidays];

      // Salvar como não classificados (apenas se não existirem)
      for (const holiday of allHolidays) {
        const existing = await this.holidayRepo.findOne({
          where: {
            competitionPeriodId,
            holidayDate: holiday.date,
          },
        });

        if (!existing) {
          await this.holidayRepo.save({
            competitionPeriodId,
            holidayDate: holiday.date,
            holidayName: holiday.name,
            holidayType: holiday.type,
            classification: null, // Aguardando classificação
          });
        }
      }

      console.log(
        `[HolidayManagementService] ${allHolidays.length} feriados detectados para ${period.mesAno}`
      );

      return allHolidays;
    } catch (error) {
      console.error(
        '[HolidayManagementService] Erro ao detectar feriados:',
        error
      );
      throw new Error('Falha ao detectar feriados automaticamente');
    }
  }

  /**
   * Busca feriados nacionais via Brasil API
   */
  private async fetchNationalHolidays(year: string): Promise<Holiday[]> {
    try {
      const response = await fetch(
        `https://brasilapi.com.br/api/feriados/v1/${year}`
      );

      if (!response.ok) {
        throw new Error(`Brasil API retornou status ${response.status}`);
      }

      const holidays = await response.json();

      return holidays.map((holiday: any) => ({
        date: holiday.date,
        name: holiday.name,
        type: 'NACIONAL' as const,
      }));
    } catch (error) {
      console.error(
        '[HolidayManagementService] Erro ao buscar feriados nacionais:',
        error
      );

      // Fallback: feriados fixos mais comuns se a API falhar
      return this.getFallbackNationalHolidays(year);
    }
  }

  /**
   * Busca feriados locais de Brasília-DF (estaduais/municipais)
   */
  private async fetchLocalHolidays(
    year: string,
    month: string
  ): Promise<Holiday[]> {
    // Feriados específicos de Brasília-DF
    const localHolidays: Array<{
      month: string;
      day: string;
      name: string;
      type: 'ESTADUAL' | 'MUNICIPAL';
    }> = [
      {
        month: '04',
        day: '21',
        name: 'Fundação de Brasília',
        type: 'MUNICIPAL',
      },
      { month: '11', day: '30', name: 'Dia do Evangélico', type: 'MUNICIPAL' },
    ];

    return localHolidays
      .filter((holiday) => holiday.month === month)
      .map((holiday) => ({
        date: `${year}-${holiday.month}-${holiday.day}`,
        name: holiday.name,
        type: holiday.type,
      }));
  }

  /**
   * Feriados fixos nacionais para fallback
   */
  private getFallbackNationalHolidays(year: string): Holiday[] {
    return [
      {
        date: `${year}-01-01`,
        name: 'Confraternização Universal',
        type: 'NACIONAL',
      },
      { date: `${year}-04-21`, name: 'Tiradentes', type: 'NACIONAL' },
      { date: `${year}-05-01`, name: 'Dia do Trabalhador', type: 'NACIONAL' },
      {
        date: `${year}-09-07`,
        name: 'Independência do Brasil',
        type: 'NACIONAL',
      },
      {
        date: `${year}-10-12`,
        name: 'Nossa Senhora Aparecida',
        type: 'NACIONAL',
      },
      { date: `${year}-11-02`, name: 'Finados', type: 'NACIONAL' },
      {
        date: `${year}-11-15`,
        name: 'Proclamação da República',
        type: 'NACIONAL',
      },
      { date: `${year}-12-25`, name: 'Natal', type: 'NACIONAL' },
    ];
  }

  /**
   * Verifica se um período requer classificação de feriados
   */
  async requiresClassification(competitionPeriodId: number): Promise<boolean> {
    const unclassifiedCount = await this.holidayRepo.count({
      where: {
        competitionPeriodId,
        classification: IsNull(),
      },
    });

    return unclassifiedCount > 0;
  }

  /**
   * Busca status completo dos feriados de um período
   */
  async getHolidaysStatus(competitionPeriodId: number): Promise<HolidayStatus> {
    const holidays = await this.holidayRepo.find({
      where: { competitionPeriodId },
      order: { holidayDate: 'ASC' },
    });

    const unclassifiedCount = holidays.filter((h) => !h.classification).length;

    return {
      hasUnclassifiedHolidays: unclassifiedCount > 0,
      allClassified: unclassifiedCount === 0,
      holidays: holidays.map((holiday) => ({
        date: holiday.holidayDate,
        name: holiday.holidayName,
        type: holiday.holidayType,
        isClassified: !!holiday.classification,
        classification: holiday.classification || undefined,
      })),
    };
  }

  /**
   * Salva classificações de feriados feitas pelo diretor
   */
  async saveClassifications(
    competitionPeriodId: number,
    classifications: HolidayClassificationRequest[],
    userId: number
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const savedClassifications: HolidayClassificationEntity[] = [];

    for (const classification of classifications) {
      const holiday = await this.holidayRepo.findOne({
        where: {
          competitionPeriodId,
          holidayDate: classification.date,
        },
      });

      if (!holiday) {
        throw new Error(`Feriado ${classification.date} não encontrado`);
      }

      const previousClassification = holiday.classification;

      // Atualizar classificação
      holiday.classification = classification.classification;
      holiday.classifiedByUserId = userId;
      holiday.classifiedAt = new Date();
      holiday.justification = classification.justification || null;

      const saved = await this.holidayRepo.save(holiday);
      savedClassifications.push(saved);

      // Log de auditoria
      await this.auditService.createLog({
        userId,
        userName: user.nome,
        actionType: 'HOLIDAY_CLASSIFIED',
        entityType: 'HolidayClassificationEntity',
        entityId: holiday.id.toString(),
        details: {
          holidayDate: holiday.holidayDate,
          holidayName: holiday.holidayName,
          previousClassification,
          newClassification: classification.classification,
          competitionPeriodId,
        },
        justification: classification.justification,
      });
    }

    console.log(
      `[HolidayManagementService] ${savedClassifications.length} feriados classificados pelo usuário ${user.nome}`
    );
  }

  /**
   * Busca feriados classificados para uso nos cálculos
   */
  async getClassifiedHolidays(competitionPeriodId: number): Promise<
    Array<{
      date: string;
      name: string;
      classification: HolidayClassificationType;
    }>
  > {
    const holidays = await this.holidayRepo.find({
      where: {
        competitionPeriodId,
        classification: Not(IsNull()),
      },
      order: { holidayDate: 'ASC' },
    });

    return holidays.map((holiday) => ({
      date: holiday.holidayDate,
      name: holiday.holidayName,
      classification: holiday.classification!,
    }));
  }

  /**
   * Valida se todos os feriados de um período foram classificados
   */
  async validateAllClassified(competitionPeriodId: number): Promise<{
    isValid: boolean;
    message?: string;
  }> {
    const requiresClassification =
      await this.requiresClassification(competitionPeriodId);

    if (requiresClassification) {
      const unclassifiedCount = await this.holidayRepo.count({
        where: {
          competitionPeriodId,
          classification: IsNull(),
        },
      });

      return {
        isValid: false,
        message: `Existem ${unclassifiedCount} feriado(s) não classificado(s). Classifique todos antes de calcular as metas.`,
      };
    }

    return { isValid: true };
  }
}
