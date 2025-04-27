// apps/api/src/entity/expurgo-event.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Define possíveis status (Enum seria melhor no futuro)
export type ExpurgoStatus =
  | 'REGISTRADO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'APLICADO_MVP'; // APLICADO_MVP para mocks

@Entity({ name: 'expurgo_events' }) // Nome da tabela no banco
@Index(['criterionId', 'sectorId', 'dataEvento']) // Índice para buscas comuns
export class ExpurgoEventEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  criterionId!: number; // FK para criteria.id

  @Column({ type: 'int' })
  sectorId!: number; // FK para sectors.id

  @Column({ type: 'date' }) // Data do evento original que está sendo expurgado/ajustado
  dataEvento!: string; // Usando string 'YYYY-MM-DD', mas pode ser Date

  @Column({ type: 'text', nullable: true }) // Descrição opcional do evento específico
  descricaoEvento?: string;

  // Poderíamos ter um campo para o valor exato do ajuste, mas para o MVP
  // o simples registro do evento com justificativa pode ser suficiente.

  @Column({ type: 'text' }) // Justificativa OBRIGATÓRIA (ex: "Autorizado por Diretor X - Falha Sensor Y")
  justificativa!: string;

  @Column({ type: 'varchar', length: 20, default: 'APLICADO_MVP' }) // Status - Default para mocks
  status!: ExpurgoStatus;

  @Column({ type: 'int' }) // Quem registrou o expurgo no sistema
  registradoPorUserId!: number; // FK para users.id

  @CreateDateColumn({ type: 'timestamp with time zone' }) // Quando o registro foi criado
  registradoEm!: Date;

  // Campos para fluxo de aprovação futuro (nullable por enquanto)
  @Column({ type: 'int', nullable: true })
  aprovadoPorUserId?: number | null; // FK para users.id

  @Column({ type: 'timestamp with time zone', nullable: true })
  aprovadoEm?: Date | null;

  // --- Relações (Descomentar/Implementar depois) ---
  // @ManyToOne(() => CriterionEntity)
  // @JoinColumn({ name: 'criterionId' })
  // criterio!: CriterionEntity;

  // @ManyToOne(() => SectorEntity)
  // @JoinColumn({ name: 'sectorId' })
  // setor!: SectorEntity;

  // @ManyToOne(() => UserEntity)
  // @JoinColumn({ name: 'registradoPorUserId' })
  // registradoPor!: UserEntity;

  // @ManyToOne(() => UserEntity, { nullable: true })
  // @JoinColumn({ name: 'aprovadoPorUserId' })
  // aprovadoPor?: UserEntity;
  // --------------------------------------------------
}
