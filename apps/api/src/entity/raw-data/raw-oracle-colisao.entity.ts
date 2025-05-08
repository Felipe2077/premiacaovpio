// apps/api/src/entity/raw-data/raw-oracle-colisao.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'raw_oracle_colisoes' })
@Index(['metricDate', 'sectorName'])
export class RawOracleColisaoEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'date' }) metricDate!: string; // Dia da contagem
  @Column({ type: 'varchar', length: 100 }) sectorName!: string; // Nome do setor mapeado
  @Column({ type: 'int' }) totalCount!: number; // Contagem de colisões (CODOCORR=70)
  @CreateDateColumn({ type: 'timestamp with time zone' }) etlTimestamp!: Date;
}
