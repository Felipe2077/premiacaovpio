// apps/api/src/entity/parameter-value.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'parameter_values' })
export class ParameterValueEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  // Que parâmetro é esse? Ex: 'META_IPK', 'PESO_ATRASO'
  // Poderíamos ter uma tabela parameter_definitions, mas para simplificar:
  @Column({ type: 'varchar', length: 100 })
  nomeParametro!: string;

  // Guardar como texto para flexibilidade (converter na lógica de negócio)
  @Column({ type: 'text' })
  valor!: string;

  // Data de início da validade deste valor
  @Column({ type: 'date' })
  dataInicioEfetivo!: string; // Ou Date

  // Data de fim da validade (NULL = vigente)
  @Column({ type: 'date', nullable: true })
  dataFimEfetivo!: string | null; // Ou Date | null

  // Relações opcionais (um parâmetro pode ser geral ou específico)
  @Column({ type: 'int', nullable: true })
  criterionId?: number;

  @Column({ type: 'int', nullable: true })
  sectorId?: number;

  @Column({ type: 'int', nullable: true }) // Quem criou/alterou?
  createdByUserId?: number;

  // Campo para justificativa da mudança - MUITO IMPORTANTE
  @Column({ type: 'text', nullable: true })
  justificativa?: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date; // Quando o registro foi criado no DB

  // --- Relações (Opcional para agora, mas bom definir) ---
  // @ManyToOne(() => CriterionEntity, { nullable: true, onDelete: 'SET NULL' })
  // @JoinColumn({ name: 'criterionId' })
  // criterio?: CriterionEntity;

  // @ManyToOne(() => SectorEntity, { nullable: true, onDelete: 'SET NULL' })
  // @JoinColumn({ name: 'sectorId' })
  // setor?: SectorEntity;

  // @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  // @JoinColumn({ name: 'createdByUserId' })
  // criadoPor?: UserEntity;
  // --------------------------------------------------------
}
