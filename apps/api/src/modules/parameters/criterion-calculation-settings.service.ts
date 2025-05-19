import { AppDataSource } from '@/database/data-source';
import { CriterionCalculationSettingsEntity } from '@/entity/criterion-calculation-settings.entity';
import { CriterionCalculationSettingsDto } from '@sistema-premiacao/shared-types';
import { Repository } from 'typeorm';

export class CriterionCalculationSettingsService {
  private settingsRepo: Repository<CriterionCalculationSettingsEntity>;

  constructor() {
    this.settingsRepo = AppDataSource.getRepository(
      CriterionCalculationSettingsEntity
    );
    console.log(
      '[CriterionCalculationSettingsService] Instanciado e repositório configurado.'
    );
  }

  async getSettingsForCriterion(
    criterionId: number
  ): Promise<CriterionCalculationSettingsEntity | null> {
    console.log(
      `[CriterionCalculationSettingsService] Buscando configurações para critério ID: ${criterionId}`
    );
    return this.settingsRepo.findOne({
      where: { criterionId },
    });
  }

  async saveSettings(
    data: CriterionCalculationSettingsDto
  ): Promise<CriterionCalculationSettingsEntity> {
    console.log(
      `[CriterionCalculationSettingsService] Salvando configurações para critério ID: ${data.criterionId}`
    );

    // Verificar se já existem configurações para este critério
    const existingSettings = await this.getSettingsForCriterion(
      data.criterionId
    );

    if (existingSettings) {
      // Atualizar configurações existentes
      existingSettings.calculationMethod = data.calculationMethod;
      existingSettings.adjustmentPercentage = data.adjustmentPercentage || null;
      existingSettings.requiresRounding =
        data.requiresRounding !== undefined ? data.requiresRounding : true;
      existingSettings.roundingMethod = data.roundingMethod || 'nearest';
      existingSettings.roundingDecimalPlaces = data.roundingDecimalPlaces || 0;

      return this.settingsRepo.save(existingSettings);
    } else {
      // Criar novas configurações
      const newSettings = this.settingsRepo.create({
        criterionId: data.criterionId,
        calculationMethod: data.calculationMethod,
        adjustmentPercentage: data.adjustmentPercentage || null,
        requiresRounding:
          data.requiresRounding !== undefined ? data.requiresRounding : true,
        roundingMethod: data.roundingMethod || 'nearest',
        roundingDecimalPlaces: data.roundingDecimalPlaces || 0,
      });

      return this.settingsRepo.save(newSettings);
    }
  }

  async getAllSettings(): Promise<CriterionCalculationSettingsEntity[]> {
    console.log(
      `[CriterionCalculationSettingsService] Buscando todas as configurações`
    );
    return this.settingsRepo.find({
      relations: ['criterion'],
    });
  }

  async deleteSettings(criterionId: number): Promise<boolean> {
    console.log(
      `[CriterionCalculationSettingsService] Removendo configurações para critério ID: ${criterionId}`
    );
    const result = await this.settingsRepo.delete({ criterionId });

    // Corrigir o problema de null/undefined
    return (
      result.affected !== undefined &&
      result.affected !== null &&
      result.affected > 0
    );
  }
}
