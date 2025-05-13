// apps/api/src/modules/parameters/parameter.service.ts (VERSÃO CORRIGIDA)
import { AppDataSource } from '@/database/data-source';
import { CompetitionPeriodEntity } from '@/entity/competition-period.entity';
import { CriterionEntity } from '@/entity/criterion.entity';
import { ParameterValueEntity } from '@/entity/parameter-value.entity';
import { SectorEntity } from '@/entity/sector.entity';
import { UserEntity } from '@/entity/user.entity';
import 'reflect-metadata';
import {
  FindManyOptions,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Or,
  Repository,
} from 'typeorm'; // Importar IsNull e Or
import { AuditLogService } from '../audit/audit.service';

// DTO para criação de parâmetro (Meta)
export interface CreateParameterDto {
  nomeParametro?: string; // Tornar opcional, pois podemos gerar
  valor: string;
  dataInicioEfetivo: string; // YYYY-MM-DD
  criterionId: number;
  sectorId?: number | null; // Pode ser null
  competitionPeriodId: number;
  justificativa: string;
}

export interface UpdateParameterDto extends Partial<CreateParameterDto> {
  // Para update, podemos querer permitir alterar apenas alguns campos.
  // A justificativa para update deve ser obrigatória.
  justificativa: string;
  dataFimEfetivoAnterior?: string; // Para a lógica de versionamento
}

export class ParameterService {
  private parameterRepo: Repository<ParameterValueEntity>;
  private periodRepo: Repository<CompetitionPeriodEntity>;
  private criterionRepo: Repository<CriterionEntity>;
  private sectorRepo: Repository<SectorEntity>;
  private auditLogService: AuditLogService;

  constructor() {
    this.parameterRepo = AppDataSource.getRepository(ParameterValueEntity);
    this.periodRepo = AppDataSource.getRepository(CompetitionPeriodEntity);
    this.criterionRepo = AppDataSource.getRepository(CriterionEntity);
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);
    this.auditLogService = new AuditLogService();
    console.log('[ParameterService] Instanciado e repositórios configurados.');
  }

  async createParameter(
    data: CreateParameterDto,
    actingUser: UserEntity
  ): Promise<ParameterValueEntity> {
    console.log(`[ParameterService] Tentando criar parâmetro:`, data);

    if (
      !data.criterionId ||
      !data.competitionPeriodId ||
      !data.valor ||
      !data.dataInicioEfetivo ||
      !data.justificativa
    ) {
      throw new Error(
        'Campos obrigatórios (criterionId, competitionPeriodId, valor, dataInicioEfetivo, justificativa) estão faltando.'
      );
    }

    const criterion = await this.criterionRepo.findOneBy({
      id: data.criterionId,
    });
    if (!criterion)
      throw new Error(`Critério com ID ${data.criterionId} não encontrado.`);

    const competitionPeriod = await this.periodRepo.findOneBy({
      id: data.competitionPeriodId,
    });
    if (!competitionPeriod)
      throw new Error(
        `Período de competição com ID ${data.competitionPeriodId} não encontrado.`
      );

    // Idealmente, metas só são criadas para períodos em PLANEJAMENTO
    // if (competitionPeriod.status !== 'PLANEJAMENTO') {
    //      console.warn(`[ParameterService] Alerta: Criando meta para período ${competitionPeriod.mesAno} que não está em PLANEJAMENTO (status: ${competitionPeriod.status}).`);
    // }

    if (data.sectorId !== undefined && data.sectorId !== null) {
      // Checa se sectorId foi fornecido e não é explicitamente null
      const sector = await this.sectorRepo.findOneBy({ id: data.sectorId });
      if (!sector)
        throw new Error(`Setor com ID ${data.sectorId} não encontrado.`);
    }

    const parameterToCreate = this.parameterRepo.create({
      nomeParametro:
        data.nomeParametro ||
        `META_${criterion.nome.toUpperCase().replace(/\s+/g, '_')}${data.sectorId ? `_SETOR${data.sectorId}` : '_GERAL'}`,
      valor: data.valor,
      dataInicioEfetivo: data.dataInicioEfetivo,
      dataFimEfetivo: null,
      criterionId: data.criterionId,
      sectorId: data.sectorId, // Passa undefined ou null se não fornecido
      competitionPeriodId: data.competitionPeriodId, // Agora existe na entidade
      justificativa: data.justificativa,
      createdByUserId: actingUser.id,
    });

    const savedParameter = await this.parameterRepo.save(parameterToCreate); // Salva um único objeto
    console.log(
      `[ParameterService] Parâmetro/Meta criado com ID: ${savedParameter.id}`
    );
    // O tipo de savedParameter aqui é ParameterValueEntity, então .id existe.

    // TODO: Registrar no AuditLog
    // await this.auditLogService.registerLog({ /* ... */ });

    return savedParameter; // Retorna ParameterValueEntity
  }

  async findParametersForPeriod(
    periodMesAno: string,
    sectorId?: number,
    criterionId?: number
  ): Promise<ParameterValueEntity[]> {
    console.log(
      `[ParameterService] Buscando parâmetros para período ${periodMesAno}, setor ${sectorId}, critério ${criterionId}`
    );
    const competitionPeriod = await this.periodRepo.findOneBy({
      mesAno: periodMesAno,
    });
    if (!competitionPeriod) {
      console.warn(
        `[ParameterService] Período ${periodMesAno} não encontrado ao buscar parâmetros.`
      );
      return [];
    }

    // Lógica para buscar metas vigentes no período
    const findOptions: FindManyOptions<ParameterValueEntity> = {
      where: {
        competitionPeriodId: competitionPeriod.id, // Agora a propriedade existe
        dataInicioEfetivo: LessThanOrEqual(competitionPeriod.dataFim), // Começou antes ou durante o fim do período
        // E (não tem data de fim OU a data de fim é depois ou durante o início do período)
        dataFimEfetivo: Or(
          IsNull(),
          MoreThanOrEqual(competitionPeriod.dataInicio)
        ),
      },
      relations: ['criterio', 'setor', 'criadoPor'], // Usa os nomes das PROPRIEDADES da relação
      order: { criterionId: 'ASC', sectorId: 'ASC', dataInicioEfetivo: 'DESC' },
    };

    if (sectorId !== undefined) {
      (findOptions.where as any).sectorId = sectorId;
    }
    if (criterionId !== undefined) {
      (findOptions.where as any).criterionId = criterionId;
    }

    const parameters = await this.parameterRepo.find(findOptions);
    console.log(
      `[ParameterService] ${parameters.length} parâmetros encontrados para o período ${periodMesAno}.`
    );
    return parameters;
  }

  // TODO: Implementar findParameterById(id: number)
  // TODO: Implementar updateParameter(id: number, data: UpdateParameterDto, actingUser: UserEntity)
  // TODO: Implementar deleteParameter(id: number, actingUser: UserEntity)
}
