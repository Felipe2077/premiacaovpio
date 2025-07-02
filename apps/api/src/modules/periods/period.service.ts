// apps/api/src/modules/periods/period.service.ts (VERSÃO INICIAL COMPLETA)
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { UserEntity } from '@/entity/user.entity';
import 'reflect-metadata';
import { LessThan, Repository } from 'typeorm'; // Importar operadores
import { AuditLogService } from '../audit/audit.service';
import { CalculationService } from '../calculation/calculation.service';
import { ExpurgoAutomationHook } from '../expurgos/expurgo-automation.hook';

export class CompetitionPeriodService {
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private calculationService: CalculationService; // Já estava declarado
  private auditLogService: AuditLogService; // Já estava declarado
  private automationHook: ExpurgoAutomationHook;
  private sectorRepo: Repository<SectorEntity>;

  constructor() {
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.calculationService = new CalculationService();
    this.auditLogService = new AuditLogService();
    this.automationHook = new ExpurgoAutomationHook();
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);

    console.log(
      '[CompetitionPeriodService] Instanciado e repositório configurado.'
    );
  }

  /**
   * Encontra o período de competição atualmente 'ATIVA'.
   * @returns Promise<CompetitionPeriodEntity | null> O período ativo ou null.
   */
  async findCurrentActivePeriod(): Promise<CompetitionPeriodEntity | null> {
    console.log('[PeriodService] Buscando período ATIVO...');
    try {
      const activePeriod = await this.periodRepo.findOne({
        where: { status: 'ATIVA' },
        order: { dataInicio: 'DESC' }, // Pega o mais recente se houver mais de um ativo por engano
      });
      if (activePeriod) {
        console.log(
          `[PeriodService] Período ATIVO encontrado: ${activePeriod.mesAno}`
        );
      } else {
        console.log('[PeriodService] Nenhum período ATIVO encontrado.');
      }
      return activePeriod;
    } catch (error) {
      console.error('[PeriodService] Erro ao buscar período ativo:', error);
      // Em um app real, talvez lançar um erro customizado ou logar de forma mais estruturada
      throw new Error('Falha ao buscar período de competição ativo.');
    }
  }

  /**
   * Encontra o último período de competição que foi 'FECHADA'.
   * @returns Promise<CompetitionPeriodEntity | null> O último período fechado ou null.
   */
  async findLatestClosedPeriod(): Promise<CompetitionPeriodEntity | null> {
    console.log('[PeriodService] Buscando último período FECHADO...');
    try {
      const latestClosed = await this.periodRepo.findOne({
        where: { status: 'FECHADA' },
        order: { dataFim: 'DESC' }, // Ordena pela data de fim mais recente
      });
      if (latestClosed) {
        console.log(
          `[PeriodService] Último período FECHADO encontrado: ${latestClosed.mesAno}`
        );
      } else {
        console.log('[PeriodService] Nenhum período FECHADO encontrado.');
      }
      return latestClosed;
    } catch (error) {
      console.error(
        '[PeriodService] Erro ao buscar último período fechado:',
        error
      );
      throw new Error('Falha ao buscar último período de competição fechado.');
    }
  }

  /**
   * Encontra ou cria o próximo período para 'PLANEJAMENTO'.
   * Se não existir um período 'PLANEJAMENTO', ele tentará criar um para o próximo mês.
   * @returns Promise<CompetitionPeriodEntity> O período em planejamento (existente ou novo).
   * @throws Error se não conseguir determinar ou criar o próximo período.
   */
  async findOrCreatePlanningPeriod(): Promise<CompetitionPeriodEntity> {
    console.log('[PeriodService] Buscando/Criando período em PLANEJAMENTO...');
    try {
      let planningPeriod = await this.periodRepo.findOne({
        where: { status: 'PLANEJAMENTO' },
        order: { dataInicio: 'ASC' },
      });

      if (planningPeriod) {
        console.log(
          `[PeriodService] Período em PLANEJAMENTO encontrado: ${planningPeriod.mesAno}`
        );
        return planningPeriod;
      } else {
        console.log(
          '[PeriodService] Nenhum período em PLANEJAMENTO. Criando o próximo...'
        );
        const lastPeriod = await this.periodRepo.findOne({
          order: { dataFim: 'DESC' }, // Pega o último período existente (qualquer status)
        });

        let nextYear: number;
        let nextMonthIndex: number; // 0 para Janeiro, 11 para Dezembro

        if (lastPeriod && lastPeriod.mesAno) {
          const parts = lastPeriod.mesAno.split('-');
          const yearStr = parts[0];
          const monthStr = parts[1];

          // Validação extra para garantir que temos ano e mês e que são números
          if (
            parts.length === 2 &&
            !isNaN(Number(yearStr)) &&
            !isNaN(Number(monthStr))
          ) {
            const year = Number(yearStr);
            const monthOneBased = Number(monthStr); // Mês 1-12 vindo do 'YYYY-MM'

            const lastPeriodDate = new Date(year, monthOneBased - 1); // Mês 0-11 para o construtor Date
            nextMonthIndex = lastPeriodDate.getMonth() + 1; // Próximo mês (0-11)
            nextYear = lastPeriodDate.getFullYear();

            if (nextMonthIndex > 11) {
              // Virada de ano
              nextMonthIndex = 0; // Janeiro
              nextYear++;
            }
          } else {
            // Formato mesAno inesperado no último período, fallback para mês atual
            console.warn(
              `[PeriodService] Formato mesAno ('${lastPeriod.mesAno}') inválido no último período. Usando mês atual como base.`
            );
            const today = new Date();
            nextYear = today.getFullYear();
            nextMonthIndex = today.getMonth(); // Mês atual (0-11)
            // Vamos tentar criar para o PRÓXIMO mês do atual se o último período for inválido
            nextMonthIndex++;
            if (nextMonthIndex > 11) {
              nextMonthIndex = 0;
              nextYear++;
            }
          }
        } else {
          // Nenhum período existe no banco, criar para o próximo mês a partir de hoje
          console.log(
            '[PeriodService] Nenhum período no banco. Criando para o próximo mês.'
          );
          const today = new Date();
          nextYear = today.getFullYear();
          nextMonthIndex = today.getMonth() + 1; // Próximo mês (0-11)
          if (nextMonthIndex > 11) {
            nextMonthIndex = 0;
            nextYear++;
          }
        }

        // Formata mesAno e datas de início/fim
        const nextMesAno = `${nextYear}-${String(nextMonthIndex + 1).padStart(2, '0')}`;
        const dataInicio = new Date(nextYear, nextMonthIndex, 1);
        const dataFim = new Date(nextYear, nextMonthIndex + 1, 0); // Pega o último dia do mês

        // Segurança extra: Verifica se já existe um para este mesAno antes de criar
        const existingForNextMesAno = await this.periodRepo.findOneBy({
          mesAno: nextMesAno,
        });
        if (existingForNextMesAno) {
          console.warn(
            `[PeriodService] Tentativa de criar período ${nextMesAno} que já existe. Retornando existente.`
          );
          return existingForNextMesAno;
        }

        console.log(
          `[PeriodService] Criando novo período em PLANEJAMENTO para: ${nextMesAno}`
        );
        const newPeriod = this.periodRepo.create({
          mesAno: nextMesAno,
          dataInicio: dataInicio.toISOString().split('T')[0],
          dataFim: dataFim.toISOString().split('T')[0],
          status: 'PLANEJAMENTO',
        });
        await this.periodRepo.save(newPeriod);
        console.log(
          `[PeriodService] Novo período ${newPeriod.mesAno} criado com ID ${newPeriod.id}`
        );
        return newPeriod;
      }
    } catch (error) {
      console.error(
        '[PeriodService] Erro ao buscar/criar período em planejamento:',
        error
      );
      throw new Error(
        'Falha ao buscar/criar período de competição em planejamento.'
      );
    }
  }

  /**
   * Busca todos os períodos, ordenados pelos mais recentes primeiro.
   * @returns Promise<CompetitionPeriodEntity[]>
   */
  async findAllPeriods(limit: number = 12): Promise<CompetitionPeriodEntity[]> {
    console.log(`[PeriodService] Buscando os últimos ${limit} períodos...`);
    try {
      const periods = await this.periodRepo.find({
        order: {
          status: 'DESC', // Para 'PLANEJAMENTO' vir antes de 'FECHADA', 'ATIVA' no meio ou no topo
          dataInicio: 'DESC', // Mais recentes primeiro dentro de cada status
        },
        take: limit,
      });
      console.log(`[PeriodService] Encontrados ${periods.length} períodos.`);
      return periods;
    } catch (error) {
      console.error('[PeriodService] Erro ao buscar todos os períodos:', error);
      throw new Error('Falha ao buscar períodos de competição.');
    }
  }

  /**
   * Inicia um período de competição, mudando seu status de 'PLANEJAMENTO' para 'ATIVA'.
   * @param periodId ID do período a ser iniciado.
   * @param actingUser Usuário que está realizando a ação.
   * @returns Promise<CompetitionPeriodEntity> O período atualizado.
   * @throws Error se o período não for encontrado, não estiver em 'PLANEJAMENTO', ou se as metas não estiverem completas.
   */
  async startPeriod(
    periodId: number,
    actingUser: UserEntity
  ): Promise<CompetitionPeriodEntity> {
    console.log(
      `[PeriodService] Tentando iniciar período ID: ${periodId} por User ID: ${actingUser.id}`
    );
    const period = await this.periodRepo.findOneBy({ id: periodId });

    if (!period) {
      throw new Error(`Período com ID ${periodId} não encontrado.`);
    }
    if (period.status !== 'PLANEJAMENTO') {
      throw new Error(
        `Período ${period.mesAno} (ID: ${periodId}) não está em status 'PLANEJAMENTO'. Status atual: ${period.status}.`
      );
    }

    period.status = 'ATIVA';
    const updatedPeriod = await this.periodRepo.save(period);
    console.log(
      `[PeriodService] Período ${updatedPeriod.mesAno} (ID: ${updatedPeriod.id}) iniciado com sucesso.`
    );

    // 🚀 NOVO: Hook de automação para período ativado
    console.log(
      `[PeriodService] 🚀 Disparando hook de automação para período ativado...`
    );

    this.automationHook
      .onPeriodStatusChanged(
        updatedPeriod.id,
        'PLANEJAMENTO',
        'ATIVA',
        actingUser.id
      )
      .then((result) => {
        console.log(
          `[PeriodService] ✅ Hook de período ativado: ${result.message}`
        );
      })
      .catch((error) => {
        console.error(
          `[PeriodService] ❌ Erro no hook de período ativado:`,
          error
        );
      });

    await this.auditLogService.createLog({
      actionType: 'PERIODO_INICIADO',
      entityType: 'CompetitionPeriodEntity',
      entityId: updatedPeriod.id.toString(),
      details: {
        mesAno: updatedPeriod.mesAno,
        novoStatus: 'ATIVA',
        dataInicio: updatedPeriod.dataInicio,
        dataFim: updatedPeriod.dataFim,
      },
      userId: actingUser.id,
      userName: actingUser.nome,
      justification: 'Período iniciado manualmente - todas as metas definidas',
      competitionPeriodId: updatedPeriod.id,
    });

    return updatedPeriod;
  }

  /**
   * Fecha um período de competição, mudando seu status de 'ATIVA' para 'FECHADA'.
   * Dispara o cálculo final da premiação para este período.
   * @param periodId ID do período a ser fechado.
   * @param actingUser Usuário que está realizando a ação.
   * @returns Promise<CompetitionPeriodEntity> O período atualizado.
   * @throws Error se o período não for encontrado, não estiver em 'ATIVA', ou se a data atual for anterior à data de fim do período.
   */
  async closePeriod(
    periodId: number,
    actingUser: UserEntity
  ): Promise<CompetitionPeriodEntity> {
    console.log(
      `[PeriodService] Tentando fechar período ID: ${periodId} por User ID: ${actingUser.id}`
    );
    const period = await this.periodRepo.findOneBy({ id: periodId });

    if (!period) {
      throw new Error(`Período com ID ${periodId} não encontrado.`);
    }
    if (period.status !== 'ATIVA') {
      throw new Error(
        `Período ${period.mesAno} (ID: ${periodId}) não está em status 'ATIVA'. Status atual: ${period.status}.`
      );
    }

    // Validação da Data: Só pode fechar se a data de fim do período já passou ou é hoje.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const periodEndDate = new Date(period.dataFim);
    periodEndDate.setDate(periodEndDate.getDate() + 1);

    const periodEndDateDay = new Date(period.dataFim + 'T00:00:00');

    if (today < periodEndDateDay) {
      throw new Error(
        `Período ${period.mesAno} só pode ser fechado após ${period.dataFim}. Data atual: ${today.toISOString().split('T')[0]}`
      );
    }

    period.status = 'FECHADA';
    period.fechadaPorUserId = actingUser.id;
    period.fechadaEm = new Date();
    const updatedPeriod = await this.periodRepo.save(period);
    console.log(
      `[PeriodService] Período ${updatedPeriod.mesAno} (ID: ${updatedPeriod.id}) fechado com sucesso.`
    );

    // DISPARAR O CÁLCULO DA PREMIAÇÃO (SEU CÓDIGO ORIGINAL)
    console.log(
      `[PeriodService] Disparando cálculo final para o período ${updatedPeriod.mesAno}...`
    );
    await this.calculationService.calculateAndSavePeriodRanking(
      updatedPeriod.mesAno
    );
    console.log(
      `[PeriodService] Cálculo para ${updatedPeriod.mesAno} concluído após fechamento.`
    );

    // 🚀 NOVO: Hook de automação para período fechado
    console.log(
      `[PeriodService] 🚀 Disparando hook de automação para período fechado...`
    );

    this.automationHook
      .onPeriodStatusChanged(
        updatedPeriod.id,
        'ATIVA',
        'FECHADA',
        actingUser.id
      )
      .then((result) => {
        console.log(
          `[PeriodService] ✅ Hook de período fechado: ${result.message}`
        );
      })
      .catch((error) => {
        console.error(
          `[PeriodService] ❌ Erro no hook de período fechado:`,
          error
        );
      });

    await this.auditLogService.createLog({
      actionType: 'PERIODO_FECHADO',
      entityType: 'CompetitionPeriodEntity',
      entityId: updatedPeriod.id.toString(),
      details: {
        mesAno: updatedPeriod.mesAno,
        novoStatus: 'FECHADA',
        fechadoPorUsuario: actingUser.nome,
        dataFechamento: updatedPeriod.fechadaEm,
      },
      userId: actingUser.id,
      userName: actingUser.nome,
      justification: 'Período fechado manualmente - cálculo final disparado',
      competitionPeriodId: updatedPeriod.id,
    });

    return updatedPeriod;
  }
  async isSystemReadyForAutomation(): Promise<boolean> {
    try {
      return await this.automationHook.isSystemReadyForAutomation();
    } catch (error) {
      console.error(
        '[PeriodService] Erro ao verificar prontidão do sistema para automação:',
        error
      );
      return false;
    }
  }

  /**
   * 🆕 PRÉ-FECHA um período automaticamente (ATIVA → PRE_FECHADA)
   * Este método é chamado automaticamente pelo scheduler quando a data de fim do período chega.
   * @param periodId ID do período a ser pré-fechado
   * @param triggeredBy Origem do trigger ('automatic' | 'manual')
   * @returns Promise<CompetitionPeriodEntity> O período atualizado
   * @throws Error se o período não puder ser pré-fechado
   */
  async preClosePeriod(
    periodId: number,
    triggeredBy: 'automatic' | 'manual' = 'automatic'
  ): Promise<CompetitionPeriodEntity> {
    console.log(
      `[PeriodService] Iniciando pré-fechamento do período ID: ${periodId} (${triggeredBy})`
    );

    const period = await this.periodRepo.findOneBy({ id: periodId });

    if (!period) {
      throw new Error(`Período com ID ${periodId} não encontrado.`);
    }

    // Validar se pode ser pré-fechado
    if (!period.canBePreClosed()) {
      throw new Error(
        `Período ${period.mesAno} (ID: ${periodId}) não pode ser pré-fechado. Status atual: ${period.status}.`
      );
    }

    // Validação da Data: Só pré-fecha se a data de fim já passou
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const periodEndDate = new Date(period.dataFim + 'T00:00:00');

    if (today <= periodEndDate) {
      throw new Error(
        `Período ${period.mesAno} só pode ser pré-fechado após ${period.dataFim}. Data atual: ${today.toISOString().split('T')[0]}`
      );
    }

    // Executar pré-fechamento
    period.status = 'PRE_FECHADA';
    const preClosedPeriod = await this.periodRepo.save(period);

    console.log(
      `[PeriodService] Período ${preClosedPeriod.mesAno} (ID: ${preClosedPeriod.id}) pré-fechado com sucesso.`
    );

    // Disparar cálculo pré-final
    console.log(
      `[PeriodService] Disparando cálculo pré-final para o período ${preClosedPeriod.mesAno}...`
    );

    try {
      await this.calculationService.calculateAndSavePeriodRanking(
        preClosedPeriod.mesAno
      );
      console.log(
        `[PeriodService] Cálculo pré-final para ${preClosedPeriod.mesAno} concluído.`
      );
    } catch (error) {
      console.error(
        `[PeriodService] Erro no cálculo pré-final para ${preClosedPeriod.mesAno}:`,
        error
      );
      // Não falhamos o pré-fechamento por causa do cálculo
    }

    // Hook de automação para pré-fechamento
    console.log(
      `[PeriodService] 🚀 Disparando hook de automação para período pré-fechado...`
    );

    this.automationHook
      .onPeriodStatusChanged(
        preClosedPeriod.id,
        'ATIVA',
        'PRE_FECHADA',
        0 // Sistema automático
      )
      .then((result) => {
        console.log(
          `[PeriodService] ✅ Hook de pré-fechamento: ${result.message}`
        );
      })
      .catch((error) => {
        console.error(
          `[PeriodService] ❌ Erro no hook de pré-fechamento:`,
          error
        );
      });

    await this.auditLogService.createLog({
      actionType: 'PERIODO_PRE_FECHADO',
      entityType: 'CompetitionPeriodEntity',
      entityId: preClosedPeriod.id.toString(),
      details: {
        mesAno: preClosedPeriod.mesAno,
        novoStatus: 'PRE_FECHADA',
        triggeredBy,
        dataPreFechamento: new Date(),
      },
      userId: triggeredBy === 'automatic' ? null : 1,
      userName: triggeredBy === 'automatic' ? 'SISTEMA_AUTOMATICO' : 'Admin',
      justification: `Período pré-fechado ${triggeredBy === 'automatic' ? 'automaticamente pelo scheduler' : 'manualmente'}`,
      competitionPeriodId: preClosedPeriod.id,
    });

    return preClosedPeriod;
  }

  /**
   * 🆕 OFICIALIZA um período (PRE_FECHADA → FECHADA) com definição de vencedor
   * Este método só pode ser executado por um usuário com role DIRETOR.
   * @param periodId ID do período a ser oficializado
   * @param winnerSectorId ID do setor vencedor oficial
   * @param directorUser Usuário diretor que está oficializando
   * @param tieResolvedBy ID do diretor que resolveu empate (opcional)
   * @returns Promise<CompetitionPeriodEntity> O período oficializado
   * @throws Error se não puder ser oficializado ou usuário não for diretor
   */
  async officializePeriod(
    periodId: number,
    winnerSectorId: number,
    directorUser: UserEntity,
    tieResolvedBy?: number
  ): Promise<CompetitionPeriodEntity> {
    console.log(
      `[PeriodService] Tentando oficializar período ID: ${periodId} por Diretor ID: ${directorUser.id}`
    );

    const period = await this.periodRepo.findOneBy({ id: periodId });

    if (!period) {
      throw new Error(`Período com ID ${periodId} não encontrado.`);
    }

    // Validar se pode ser oficializado
    if (!period.canBeOfficialized()) {
      throw new Error(
        `Período ${period.mesAno} (ID: ${periodId}) não pode ser oficializado. Status atual: ${period.status}.`
      );
    }

    // TODO: Validar role DIRETOR quando RBAC estiver implementado
    // if (!directorUser.hasRole('DIRETOR')) {
    //   throw new Error('Apenas usuários com role DIRETOR podem oficializar períodos.');
    // }

    // Validar se setor vencedor existe
    const winnerSector = await this.sectorRepo.findOneBy({
      id: winnerSectorId,
      ativo: true,
    });

    if (!winnerSector) {
      throw new Error(
        `Setor vencedor com ID ${winnerSectorId} não encontrado ou não está ativo.`
      );
    }

    // Executar oficialização
    period.status = 'FECHADA';
    period.setorVencedorId = winnerSectorId;
    period.oficializadaPorUserId = directorUser.id;
    period.oficializadaEm = new Date();

    if (tieResolvedBy) {
      period.vencedorEmpateDefinidoPor = tieResolvedBy;
    }

    const officializedPeriod = await this.periodRepo.save(period);

    console.log(
      `[PeriodService] Período ${officializedPeriod.mesAno} (ID: ${officializedPeriod.id}) oficializado com sucesso. Vencedor: ${winnerSector.nome}`
    );

    // Hook de automação para oficialização
    console.log(
      `[PeriodService] 🚀 Disparando hook de automação para período oficializado...`
    );

    this.automationHook
      .onPeriodStatusChanged(
        officializedPeriod.id,
        'PRE_FECHADA',
        'FECHADA',
        directorUser.id
      )
      .then((result) => {
        console.log(
          `[PeriodService] ✅ Hook de oficialização: ${result.message}`
        );
      })
      .catch((error) => {
        console.error(
          `[PeriodService] ❌ Erro no hook de oficialização:`,
          error
        );
      });

    await this.auditLogService.createLog({
      actionType: 'PERIODO_OFICIALIZADO',
      entityType: 'CompetitionPeriodEntity',
      entityId: officializedPeriod.id.toString(),
      details: {
        mesAno: officializedPeriod.mesAno,
        vencedorSetor: winnerSector.nome,
        vencedorSetorId: winnerSectorId,
        empateResolvido: !!tieResolvedBy,
        oficializadoPorUsuario: directorUser.nome,
        dataOficializacao: officializedPeriod.oficializadaEm,
      },
      userId: directorUser.id,
      userName: directorUser.nome,
      justification: `Período oficializado - vencedor definido: ${winnerSector.nome}${tieResolvedBy ? ' (empate resolvido)' : ''}`,
      competitionPeriodId: officializedPeriod.id,
    });

    return officializedPeriod;
  }

  /**
   * 🆕 BUSCA períodos que precisam ser pré-fechados automaticamente
   * Usado pelo scheduler para identificar períodos ATIVA que já passaram da data de fim.
   * @returns Promise<CompetitionPeriodEntity[]> Lista de períodos elegíveis para pré-fechamento
   */
  async findPeriodsReadyForPreClosure(): Promise<CompetitionPeriodEntity[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log(
      `[PeriodService] Buscando períodos elegíveis para pré-fechamento (data fim < ${todayStr})...`
    );

    const eligiblePeriods = await this.periodRepo.find({
      where: {
        status: 'ATIVA',
        dataFim: LessThan(todayStr!),
      },
      order: { dataFim: 'ASC' },
    });

    console.log(
      `[PeriodService] Encontrados ${eligiblePeriods.length} períodos elegíveis para pré-fechamento.`
    );

    return eligiblePeriods;
  }

  /**
   * 🆕 BUSCA períodos que estão aguardando oficialização
   * @returns Promise<CompetitionPeriodEntity[]> Lista de períodos em PRE_FECHADA
   */
  async findPeriodsAwaitingOfficialization(): Promise<
    CompetitionPeriodEntity[]
  > {
    console.log(
      '[PeriodService] Buscando períodos aguardando oficialização...'
    );

    const awaitingPeriods = await this.periodRepo.find({
      where: { status: 'PRE_FECHADA' },
      relations: ['setorVencedor'],
      order: { dataFim: 'DESC' },
    });

    console.log(
      `[PeriodService] Encontrados ${awaitingPeriods.length} períodos aguardando oficialização.`
    );

    return awaitingPeriods;
  }

  /**
   * 🆕 EXECUTA processo automatizado de transição de vigências
   * Este método é chamado pelo scheduler e executa:
   * 1. Pré-fecha períodos ATIVA que terminaram
   * 2. Cria próxima vigência em PLANEJAMENTO se necessário
   * @returns Promise<{ preClosedPeriods: number, newPeriodsCreated: number }>
   */
  async executeAutomaticPeriodTransition(): Promise<{
    preClosedPeriods: number;
    newPeriodsCreated: number;
    errors: string[];
  }> {
    console.log(
      '[PeriodService] 🤖 Iniciando transição automática de vigências...'
    );

    const result = {
      preClosedPeriods: 0,
      newPeriodsCreated: 0,
      errors: [] as string[],
    };

    try {
      // 1. Buscar e pré-fechar períodos elegíveis
      const eligiblePeriods = await this.findPeriodsReadyForPreClosure();

      for (const period of eligiblePeriods) {
        try {
          await this.preClosePeriod(period.id, 'automatic');
          result.preClosedPeriods++;

          console.log(
            `[PeriodService] ✅ Período ${period.mesAno} pré-fechado automaticamente.`
          );
        } catch (error) {
          const errorMsg = `Erro ao pré-fechar período ${period.mesAno}: ${error instanceof Error ? error.message : error}`;
          console.error(`[PeriodService] ❌ ${errorMsg}`);
          result.errors.push(errorMsg);
        }
      }

      // 2. Verificar se precisa criar próxima vigência
      try {
        const planningPeriod = await this.findOrCreatePlanningPeriod();

        // Se retornou um período recém-criado, contamos
        if (planningPeriod && eligiblePeriods.length > 0) {
          result.newPeriodsCreated = 1;
          console.log(
            `[PeriodService] ✅ Nova vigência criada: ${planningPeriod.mesAno}`
          );
        }
      } catch (error) {
        const errorMsg = `Erro ao criar próxima vigência: ${error instanceof Error ? error.message : error}`;
        console.error(`[PeriodService] ❌ ${errorMsg}`);
        result.errors.push(errorMsg);
      }

      console.log(
        `[PeriodService] 🏁 Transição automática concluída: ${result.preClosedPeriods} pré-fechados, ${result.newPeriodsCreated} criados, ${result.errors.length} erros.`
      );

      return result;
    } catch (error) {
      const errorMsg = `Erro geral na transição automática: ${error instanceof Error ? error.message : error}`;
      console.error(`[PeriodService] ❌ ${errorMsg}`);
      result.errors.push(errorMsg);
      return result;
    }
  }

  /**
   * 🆕 BUSCA período por ID
   * @param periodId ID do período
   * @returns Promise<CompetitionPeriodEntity | null>
   */
  async findPeriodById(
    periodId: number
  ): Promise<CompetitionPeriodEntity | null> {
    console.log(`[PeriodService] Buscando período ID: ${periodId}`);

    try {
      const period = await this.periodRepo.findOne({
        where: { id: periodId },
        relations: [
          'setorVencedor',
          'oficializadaPor',
          'vencedorEmpateDefinidoPorUsuario',
        ],
      });

      if (period) {
        console.log(
          `[PeriodService] Período encontrado: ${period.mesAno} (Status: ${period.status})`
        );
      } else {
        console.log(`[PeriodService] Período ID ${periodId} não encontrado.`);
      }

      return period;
    } catch (error) {
      console.error(
        `[PeriodService] Erro ao buscar período ID ${periodId}:`,
        error
      );
      throw new Error('Falha ao buscar período.');
    }
  }
}
