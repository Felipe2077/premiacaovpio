// apps/api/src/entity/raw-data/raw-oracle-fleet-performance.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'raw_oracle_fleet_performance' })
@Index(['metricMonth', 'sectorName'])
export class RawOracleFleetPerformanceEntity {
  @PrimaryGeneratedColumn() id!: number;
  @Column({ type: 'varchar', length: 7, comment: 'Mês da métrica (YYYY-MM)' })
  metricMonth!: string;
  @Column({ type: 'varchar', length: 100 }) sectorName!: string;
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    comment: 'KM Total Operacional (da função FC_ARR_KMBCO_VIAGENS)',
  })
  totalKm!: number;
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    comment: 'Litros Totais de Combustível Consumidos',
  })
  totalFuelLiters!: number;
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 4,
    comment: 'Média KM/L Calculada (KM/Litros)',
  })
  avgKmL!: number;
  @CreateDateColumn({ type: 'timestamp with time zone' }) etlTimestamp!: Date;
}
