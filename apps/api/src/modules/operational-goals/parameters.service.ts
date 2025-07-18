// apps/api/src/modules/operational-goals/parameters.service.ts
import { AppDataSource } from '@/database/data-source';
import { OperationalGoalsParametersEntity } from '@/entity/operational-goals-parameters.entity';
import { UserEntity } from '@/entity/user.entity';
import { AuditLogService } from '@/modules/audit/audit.service';
import { Repository } from 'typeorm';

interface ParameterUpdateRequest {
  value: number;
  justification: string;
}

interface ParameterValidationResult {
  isValid: boolean;
  message?: string;
}

export class OperationalGoalsParametersService {
  private parameterRepo: Repository<OperationalGoalsParametersEntity>;
  private userRepo: Repository<UserEntity>;
  private auditService: AuditLogService;

  // Cache para parâmetros frequentemente acessados
  private parameterCache: Map<string, OperationalGoalsParametersEntity> =
    new Map();
  private cacheExpiration: number = 5 * 60 * 1000; // 5 minutos
  private lastCacheUpdate: Date = new Date(0);

  constructor() {
    this.parameterRepo = AppDataSource.getRepository(
      OperationalGoalsParametersEntity
    );
    this.userRepo = AppDataSource.getRepository(UserEntity);
    this.auditService = new AuditLogService();

    console.log(
      '[OperationalGoalsParametersService] Instanciado e repositórios configurados.'
    );
  }

  /**
   * Busca todos os parâmetros ativos
   */
  async getAllParameters(): Promise<OperationalGoalsParametersEntity[]> {
    return await this.parameterRepo.find({
      where: { isActive: true },
      relations: ['updatedBy'],
      order: { parameterName: 'ASC' },
    });
  }

  /**
   * Busca parâmetro específico por nome
   */
  async getParameter(
    parameterName: string
  ): Promise<OperationalGoalsParametersEntity | null> {
    // Verificar cache primeiro
    if (this.isCacheValid() && this.parameterCache.has(parameterName)) {
      return this.parameterCache.get(parameterName)!;
    }

    const parameter = await this.parameterRepo.findOne({
      where: { parameterName, isActive: true },
      relations: ['updatedBy'],
    });

    if (parameter) {
      this.parameterCache.set(parameterName, parameter);
    }

    return parameter;
  }

  /**
   * Busca valor de um parâmetro (método mais usado nos cálculos)
   */
  async getParameterValue(parameterName: string): Promise<number> {
    const parameter = await this.getParameter(parameterName);

    if (!parameter) {
      throw new Error(`Parâmetro '${parameterName}' não encontrado ou inativo`);
    }

    return parameter.value;
  }

  /**
   * Atualiza valor de um parâmetro
   */
  async updateParameter(
    parameterName: string,
    updateData: ParameterUpdateRequest,
    userId: number
  ): Promise<OperationalGoalsParametersEntity> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const parameter = await this.parameterRepo.findOne({
      where: { parameterName, isActive: true },
    });

    if (!parameter) {
      throw new Error(`Parâmetro '${parameterName}' não encontrado`);
    }

    // Validar novo valor
    const validation = this.validateParameterValue(parameter, updateData.value);
    if (!validation.isValid) {
      throw new Error(validation.message);
    }

    const previousValue = parameter.value;

    // Atualizar parâmetro
    parameter.previousValue = previousValue;
    parameter.value = updateData.value;
    parameter.changeJustification = updateData.justification;
    parameter.updatedByUserId = userId;

    const savedParameter = await this.parameterRepo.save(parameter);

    // Invalidar cache
    this.invalidateCache();

    // Log de auditoria
    await this.auditService.createLog({
      userId,
      userName: user.nome,
      actionType: 'OPERATIONAL_PARAMETER_UPDATED',
      entityType: 'OperationalGoalsParametersEntity',
      entityId: parameter.id.toString(),
      details: {
        parameterName,
        previousValue,
        newValue: updateData.value,
        valueChange: updateData.value - previousValue,
        valueChangePercent:
          ((updateData.value - previousValue) / previousValue) * 100,
      },
      justification: updateData.justification,
    });

    console.log(
      `[OperationalGoalsParametersService] Parâmetro ${parameterName} atualizado: ${previousValue} → ${updateData.value} por ${user.nome}`
    );

    return savedParameter;
  }

  /**
   * Valida se um valor está dentro da faixa permitida
   */
  private validateParameterValue(
    parameter: OperationalGoalsParametersEntity,
    newValue: number
  ): ParameterValidationResult {
    if (!parameter.isValidValue(newValue)) {
      const range = parameter.getValidRange();
      return {
        isValid: false,
        message: `Valor ${newValue} está fora da faixa permitida (${range}) para o parâmetro ${parameter.parameterName}`,
      };
    }

    // Validações específicas por tipo de parâmetro
    switch (parameter.parameterName) {
      case 'FATOR_REDUCAO_COMBUSTIVEL':
        if (newValue > 0.05) {
          // Mais que 5%
          return {
            isValid: false,
            message:
              'Fator de redução muito alto. Valores acima de 5% podem ser irrealistas.',
          };
        }
        break;

      case 'PERCENTUAL_TOLERANCIA_SALDO':
        if (newValue > 0.15) {
          // Mais que 15%
          return {
            isValid: false,
            message:
              'Tolerância muito alta. Valores acima de 15% podem comprometer o controle de gastos.',
          };
        }
        break;

      case 'PRECO_COMBUSTIVEL_POR_LITRO':
        if (newValue < 2.0 || newValue > 8.0) {
          return {
            isValid: false,
            message:
              'Preço do combustível fora da faixa realista (R$ 2,00 - R$ 8,00).',
          };
        }
        break;
    }

    return { isValid: true };
  }

  /**
   * Busca múltiplos parâmetros de uma vez (otimizado para cálculos)
   */
  async getMultipleParameters(
    parameterNames: string[]
  ): Promise<Record<string, number>> {
    const result: Record<string, number> = {};

    for (const parameterName of parameterNames) {
      result[parameterName] = await this.getParameterValue(parameterName);
    }

    return result;
  }

  /**
   * Busca todos os parâmetros necessários para cálculos
   */
  async getCalculationParameters(): Promise<{
    FATOR_REDUCAO_COMBUSTIVEL: number;
    PERCENTUAL_PREMIACAO_PNEUS: number;
    PERCENTUAL_PREMIACAO_PECAS: number;
    PERCENTUAL_TOLERANCIA_SALDO: number;
    PRECO_COMBUSTIVEL_POR_LITRO: number;
  }> {
    const parameterNames = [
      'FATOR_REDUCAO_COMBUSTIVEL',
      'PERCENTUAL_PREMIACAO_PNEUS',
      'PERCENTUAL_PREMIACAO_PECAS',
      'PERCENTUAL_TOLERANCIA_SALDO',
      'PRECO_COMBUSTIVEL_POR_LITRO',
    ];

    const parameters = await this.getMultipleParameters(parameterNames);

    return {
      FATOR_REDUCAO_COMBUSTIVEL: parameters.FATOR_REDUCAO_COMBUSTIVEL,
      PERCENTUAL_PREMIACAO_PNEUS: parameters.PERCENTUAL_PREMIACAO_PNEUS,
      PERCENTUAL_PREMIACAO_PECAS: parameters.PERCENTUAL_PREMIACAO_PECAS,
      PERCENTUAL_TOLERANCIA_SALDO: parameters.PERCENTUAL_TOLERANCIA_SALDO,
      PRECO_COMBUSTIVEL_POR_LITRO: parameters.PRECO_COMBUSTIVEL_POR_LITRO,
    };
  }

  /**
   * Cria snapshot dos parâmetros para auditoria de cálculos
   */
  async createParametersSnapshot(): Promise<any> {
    const parameters = await this.getAllParameters();

    return parameters.reduce((snapshot, param) => {
      snapshot[param.parameterName] = {
        value: param.value,
        description: param.description,
        valueType: param.valueType,
        formattedValue: param.getFormattedValue(),
        lastUpdated: param.updatedAt,
        updatedBy: param.updatedBy?.nome || 'Sistema',
      };
      return snapshot;
    }, {} as any);
  }

  /**
   * Valida se todos os parâmetros necessários estão configurados
   */
  async validateRequiredParameters(): Promise<{
    isValid: boolean;
    missingParameters: string[];
  }> {
    const requiredParameters = [
      'FATOR_REDUCAO_COMBUSTIVEL',
      'PERCENTUAL_PREMIACAO_PNEUS',
      'PERCENTUAL_PREMIACAO_PECAS',
      'PERCENTUAL_TOLERANCIA_SALDO',
    ];

    const missingParameters: string[] = [];

    for (const parameterName of requiredParameters) {
      try {
        await this.getParameterValue(parameterName);
      } catch (error) {
        missingParameters.push(parameterName);
      }
    }

    return {
      isValid: missingParameters.length === 0,
      missingParameters,
    };
  }

  /**
   * Reseta parâmetro para valor padrão
   */
  async resetToDefault(
    parameterName: string,
    userId: number,
    justification: string
  ): Promise<OperationalGoalsParametersEntity> {
    const defaultValues: Record<string, number> = {
      FATOR_REDUCAO_COMBUSTIVEL: 0.015,
      PERCENTUAL_PREMIACAO_PNEUS: 0.03,
      PERCENTUAL_PREMIACAO_PECAS: 0.03,
      PERCENTUAL_TOLERANCIA_SALDO: 0.08,
      PRECO_COMBUSTIVEL_POR_LITRO: 4.5,
    };

    const defaultValue = defaultValues[parameterName];
    if (defaultValue === undefined) {
      throw new Error(
        `Valor padrão não definido para o parâmetro '${parameterName}'`
      );
    }

    return await this.updateParameter(
      parameterName,
      {
        value: defaultValue,
        justification: `Reset para valor padrão. ${justification}`,
      },
      userId
    );
  }

  /**
   * Busca histórico de alterações de um parâmetro
   */
  async getParameterHistory(
    parameterName: string,
    limit: number = 10
  ): Promise<any[]> {
    // Buscar logs de auditoria relacionados ao parâmetro
    const auditLogs = await this.auditService.findLogs({
      actionType: 'OPERATIONAL_PARAMETER_UPDATED',
      entityType: 'OperationalGoalsParametersEntity',
      limit,
      orderBy: 'createdAt',
      orderDirection: 'DESC',
    });

    return auditLogs
      .filter((log) => log.details?.parameterName === parameterName)
      .map((log) => ({
        date: log.createdAt,
        userName: log.userName,
        previousValue: log.details?.previousValue,
        newValue: log.details?.newValue,
        valueChange: log.details?.valueChange,
        justification: log.justification,
      }));
  }

  /**
   * Verifica se o cache está válido
   */
  private isCacheValid(): boolean {
    const now = new Date();
    return (
      now.getTime() - this.lastCacheUpdate.getTime() < this.cacheExpiration
    );
  }

  /**
   * Invalida o cache
   */
  private invalidateCache(): void {
    this.parameterCache.clear();
    this.lastCacheUpdate = new Date(0);
  }

  /**
   * Atualiza o cache com todos os parâmetros
   */
  private async refreshCache(): Promise<void> {
    const parameters = await this.getAllParameters();

    this.parameterCache.clear();
    parameters.forEach((param) => {
      this.parameterCache.set(param.parameterName, param);
    });

    this.lastCacheUpdate = new Date();
  }
}
