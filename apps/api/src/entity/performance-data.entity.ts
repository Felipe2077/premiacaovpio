// apps/api/src/entity/performance-data.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'performance_data' })
// Índices para otimizar buscas por setor/critério/data
@Index(['sectorId', 'criterionId', 'metricDate'])
export class PerformanceDataEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' }) // Usar bigint se esperar muitos dados
  id!: string; // TypeORM recomenda string para bigint

  @Column({ type: 'int' })
  sectorId!: number;

  @Column({ type: 'int' })
  criterionId!: number;

  // Data a que se refere a métrica
  @Column({ type: 'date' })
  metricDate!: string; // Ou Date

  // Valor numérico do desempenho (ajustar precisão/escala)
  @Column({ type: 'numeric', precision: 18, scale: 4, nullable: true })
  valor!: number | null;

  // Quando este registro foi carregado pelo ETL
  @CreateDateColumn({ type: 'timestamp with time zone' })
  loadTimestamp!: Date;

  // --- Relações (Podemos adicionar depois) ---
  // @ManyToOne(() => SectorEntity)
  // @JoinColumn({ name: 'sectorId' })
  // setor: SectorEntity;

  // @ManyToOne(() => CriterionEntity)
  // @JoinColumn({ name: 'criterionId' })
  // criterio: CriterionEntity;
  // ---------------------------------------------
}
