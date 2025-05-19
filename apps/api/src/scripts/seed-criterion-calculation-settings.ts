// apps/api/src/scripts/seed-criterion-calculation-settings.ts

import * as dotenv from 'dotenv';
import * as path from 'path';
import { DataSource } from 'typeorm';

// Carregar variáveis de ambiente
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Importar entidades diretamente com caminhos relativos
import { CriterionCalculationSettingsEntity } from '../entity/criterion-calculation-settings.entity';
import { CriterionEntity } from '../entity/criterion.entity';

// Criar uma conexão temporária apenas para este script
const tempDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5433,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false, // Não sincronizar para não modificar o schema
  logging: true,
  entities: [CriterionEntity, CriterionCalculationSettingsEntity],
});

async function seedCriterionCalculationSettings() {
  try {
    // Inicializar a conexão temporária
    await tempDataSource.initialize();
    console.log('Conexão temporária inicializada com sucesso');

    // Repositórios
    const criterionRepo = tempDataSource.getRepository(CriterionEntity);
    const settingsRepo = tempDataSource.getRepository(
      CriterionCalculationSettingsEntity
    );

    // Buscar todos os critérios
    const criteria = await criterionRepo.find();
    console.log(`Encontrados ${criteria.length} critérios`);

    // Para cada critério, criar uma configuração padrão se não existir
    for (const criterion of criteria) {
      // Verificar se já existe configuração para este critério
      const existingSettings = await settingsRepo.findOne({
        where: { criterionId: criterion.id },
      });

      if (!existingSettings) {
        console.log(
          `Criando configuração padrão para critério ID: ${criterion.id} (${criterion.nome})`
        );

        // Criar nova configuração
        const newSettings = settingsRepo.create({
          criterionId: criterion.id,
          calculationMethod: 'media3',
          adjustmentPercentage: 0,
          requiresRounding: true,
          roundingMethod: 'nearest',
          roundingDecimalPlaces: 0,
        });

        // Salvar a configuração
        await settingsRepo.save(newSettings);
        console.log(
          `Configuração criada com sucesso para critério ID: ${criterion.id}`
        );
      } else {
        console.log(`Configuração já existe para critério ID: ${criterion.id}`);
      }
    }

    console.log('Processo de seed concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o seed de configurações de cálculo:', error);
  } finally {
    // Fechar a conexão temporária
    if (tempDataSource.isInitialized) {
      await tempDataSource.destroy();
      console.log('Conexão temporária fechada');
    }
  }
}

// Executar o script
seedCriterionCalculationSettings()
  .then(() => console.log('Script finalizado'))
  .catch((error) => console.error('Erro no script:', error));
