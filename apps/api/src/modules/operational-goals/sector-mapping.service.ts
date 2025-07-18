// apps/api/src/modules/operational-goals/sector-mapping.service.ts
import { AppDataSource } from '@/database/data-source';
import { SectorEntity } from '@/entity/sector.entity';
import { In, Repository } from 'typeorm';

interface SectorMapping {
  oracleGarageName: string;
  sectorName: string;
  sectorId: number;
  isActive: boolean;
}

export class SectorMappingService {
  private sectorRepo: Repository<SectorEntity>;

  // Mapeamento Oracle → Sistema (baseado no código real existente)
  private readonly ORACLE_TO_SECTOR_MAPPING: Record<string, string> = {
    'GARAGEM GAMA': 'GAMA',
    'GARAGEM PARANOA': 'PARANOÁ',
    'GARAGEM SANTA MARIA': 'SANTA MARIA',
    'GARAGEM SAO SEBASTIAO': 'SÃO SEBASTIÃO',
    // Possíveis variações de nome
    GAMA: 'GAMA',
    PARANOA: 'PARANOÁ',
    'SANTA MARIA': 'SANTA MARIA',
    'SAO SEBASTIAO': 'SÃO SEBASTIÃO',
    // Códigos numéricos como fallback
    '240': 'GAMA',
    '31': 'PARANOÁ',
    '124': 'SANTA MARIA',
    '239': 'SÃO SEBASTIÃO',
  };

  // Mapeamento reverso Sistema → Oracle
  private readonly SECTOR_TO_ORACLE_MAPPING: Record<string, string> = {
    GAMA: 'GARAGEM GAMA',
    PARANOÁ: 'GARAGEM PARANOA',
    'SANTA MARIA': 'GARAGEM SANTA MARIA',
    'SÃO SEBASTIÃO': 'GARAGEM SAO SEBASTIAO',
  };

  // Códigos Oracle por setor
  private readonly ORACLE_CODES: Record<string, string> = {
    GAMA: '240',
    PARANOÁ: '31',
    'SANTA MARIA': '124',
    'SÃO SEBASTIÃO': '239',
  };

  // Cache de setores para performance
  private sectorCache: Map<string, SectorEntity> = new Map();
  private cacheExpiration: number = 10 * 60 * 1000; // 10 minutos
  private lastCacheUpdate: Date = new Date(0);

  constructor() {
    this.sectorRepo = AppDataSource.getRepository(SectorEntity);

    console.log(
      '[SectorMappingService] Instanciado com mapeamento Oracle existente.'
    );
  }

  /**
   * Mapeia nome da garagem Oracle para entidade Sector
   */
  async mapOracleToSector(
    oracleGarageName: string
  ): Promise<SectorEntity | null> {
    // Limpar e normalizar nome
    const cleanName = this.cleanOracleName(oracleGarageName);

    // Buscar no mapeamento
    const sectorName = this.ORACLE_TO_SECTOR_MAPPING[cleanName];

    if (!sectorName) {
      console.warn(
        `[SectorMappingService] Nome Oracle não mapeado: '${oracleGarageName}' (clean: '${cleanName}')`
      );
      return null;
    }

    // Buscar no cache primeiro
    if (this.isCacheValid() && this.sectorCache.has(sectorName)) {
      return this.sectorCache.get(sectorName)!;
    }

    // Buscar no banco de dados
    const sector = await this.sectorRepo.findOne({
      where: {
        nome: sectorName,
        ativo: true,
      },
    });

    if (sector) {
      this.sectorCache.set(sectorName, sector);
    } else {
      console.error(
        `[SectorMappingService] Setor '${sectorName}' não encontrado no banco de dados`
      );
    }

    return sector;
  }

  /**
   * Versão síncrona do mapeamento (para uso em loops)
   */
  mapOracleToSectorSync(
    oracleGarageName: string
  ): { id: number; nome: string } | null {
    const cleanName = this.cleanOracleName(oracleGarageName);
    const sectorName = this.ORACLE_TO_SECTOR_MAPPING[cleanName];

    if (!sectorName) {
      return null;
    }

    // IDs fixos baseados no seed da aplicação
    const sectorIds: Record<string, number> = {
      GAMA: 1,
      PARANOÁ: 2,
      'SANTA MARIA': 3,
      'SÃO SEBASTIÃO': 4,
    };

    const sectorId = sectorIds[sectorName];

    return sectorId ? { id: sectorId, nome: sectorName } : null;
  }

  /**
   * Mapeia setor do sistema para nome Oracle
   */
  mapSectorToOracle(sectorName: string): string | null {
    return this.SECTOR_TO_ORACLE_MAPPING[sectorName] || null;
  }

  /**
   * Busca código Oracle de um setor
   */
  getOracleCode(sectorName: string): string | null {
    return this.ORACLE_CODES[sectorName] || null;
  }

  /**
   * Busca todos os códigos Oracle válidos
   */
  getAllOracleCodes(): string[] {
    return Object.values(this.ORACLE_CODES);
  }

  /**
   * Busca todos os setores válidos para cálculo
   */
  async getAllValidSectors(): Promise<SectorEntity[]> {
    const validSectorNames = Object.keys(this.SECTOR_TO_ORACLE_MAPPING);

    return await this.sectorRepo.find({
      where: {
        nome: In(validSectorNames),
        ativo: true,
      },
      order: { nome: 'ASC' },
    });
  }

  /**
   * Valida se todos os setores necessários existem
   */
  async validateSectorMapping(): Promise<{
    isValid: boolean;
    missingSectors: string[];
    availableSectors: SectorMapping[];
  }> {
    const expectedSectors = Object.keys(this.SECTOR_TO_ORACLE_MAPPING);
    const missingSectors: string[] = [];
    const availableSectors: SectorMapping[] = [];

    for (const sectorName of expectedSectors) {
      const sector = await this.sectorRepo.findOne({
        where: { nome: sectorName },
      });

      if (!sector) {
        missingSectors.push(sectorName);
      } else {
        availableSectors.push({
          oracleGarageName: this.SECTOR_TO_ORACLE_MAPPING[sectorName]!,
          sectorName: sector.nome,
          sectorId: sector.id,
          isActive: sector.ativo,
        });
      }
    }

    return {
      isValid: missingSectors.length === 0,
      missingSectors,
      availableSectors,
    };
  }

  /**
   * Testa mapeamento com dados Oracle reais
   */
  async testMappingWithOracleData(oracleGarageNames: string[]): Promise<{
    totalNames: number;
    mappedCount: number;
    unmappedNames: string[];
    mappingResults: Array<{
      oracleName: string;
      cleanName: string;
      mappedTo: string | null;
      found: boolean;
    }>;
  }> {
    const unmappedNames: string[] = [];
    const mappingResults: Array<{
      oracleName: string;
      cleanName: string;
      mappedTo: string | null;
      found: boolean;
    }> = [];

    let mappedCount = 0;

    for (const oracleName of oracleGarageNames) {
      const cleanName = this.cleanOracleName(oracleName);
      const mappedTo = this.ORACLE_TO_SECTOR_MAPPING[cleanName] || null;
      const found = mappedTo !== null;

      if (found) {
        mappedCount++;
      } else {
        unmappedNames.push(oracleName);
      }

      mappingResults.push({
        oracleName,
        cleanName,
        mappedTo,
        found,
      });
    }

    return {
      totalNames: oracleGarageNames.length,
      mappedCount,
      unmappedNames,
      mappingResults,
    };
  }

  /**
   * Limpa e normaliza nome Oracle
   */
  private cleanOracleName(oracleName: string): string {
    return oracleName
      .toString()
      .trim()
      .toUpperCase()
      .replace(/[ÀÁÂÃÄÅ]/g, 'A')
      .replace(/[ÈÉÊË]/g, 'E')
      .replace(/[ÌÍÎÏ]/g, 'I')
      .replace(/[ÒÓÔÕÖ]/g, 'O')
      .replace(/[ÙÚÛÜ]/g, 'U')
      .replace(/[Ç]/g, 'C')
      .replace(/\s+/g, ' ');
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
   * Atualiza cache com todos os setores
   */
  async refreshCache(): Promise<void> {
    const sectors = await this.getAllValidSectors();

    this.sectorCache.clear();
    sectors.forEach((sector) => {
      this.sectorCache.set(sector.nome, sector);
    });

    this.lastCacheUpdate = new Date();

    console.log(
      `[SectorMappingService] Cache atualizado com ${sectors.length} setores`
    );
  }

  /**
   * Força invalidação do cache
   */
  invalidateCache(): void {
    this.sectorCache.clear();
    this.lastCacheUpdate = new Date(0);
    console.log('[SectorMappingService] Cache invalidado');
  }

  /**
   * Busca estatísticas do mapeamento
   */
  getMappingStatistics(): {
    totalOracleNames: number;
    totalSectorNames: number;
    totalOracleCodes: number;
    cacheSize: number;
    lastCacheUpdate: Date;
  } {
    return {
      totalOracleNames: Object.keys(this.ORACLE_TO_SECTOR_MAPPING).length,
      totalSectorNames: Object.keys(this.SECTOR_TO_ORACLE_MAPPING).length,
      totalOracleCodes: Object.keys(this.ORACLE_CODES).length,
      cacheSize: this.sectorCache.size,
      lastCacheUpdate: this.lastCacheUpdate,
    };
  }
}
