import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
// Poderíamos importar Setor de shared-types, mas para entidade é comum definir aqui
// import { Setor } from '@sistema-premiacao/shared-types';

@Entity({ name: 'sectors' }) // Nome da tabela no DB
export class SectorEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  nome!: string;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  // Colunas de auditoria automática do TypeORM
  @CreateDateColumn({ type: 'timestamp with time zone' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updatedAt!: Date;
}
