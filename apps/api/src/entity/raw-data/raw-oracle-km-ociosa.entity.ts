// apps/api/src/entity/raw-data/raw-oracle-km-ociosa-components.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'raw_oracle_km_ociosa_components' })
@Index(['metricMonth', 'sectorName'], { unique: true })
export class RawOracleKmOciosaComponentsEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'varchar', length: 7 }) metricMonth!: string;
  @Column({ type: 'varchar', length: 100 }) sectorName!: string;
  @Column({ type: 'decimal', precision: 18, scale: 4 }) kmOperacional!: number;
  @Column({ type: 'decimal', precision: 18, scale: 4 })
  kmHodometroAjustado!: number; // KM_HOD2
  @CreateDateColumn({ type: 'timestamp with time zone' }) etlTimestamp!: Date;
}
