import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('ai_call_logs')
export class AiCallLogEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true, nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 50 })
  scene: string;

  @Column({ name: 'request_id', type: 'varchar', length: 64 })
  requestId: string;

  @Column({ name: 'model_name', type: 'varchar', length: 50 })
  modelName: string;

  @Column({ name: 'cache_hit', type: 'tinyint', default: 0 })
  cacheHit: boolean;

  @Column({ name: 'input_tokens', type: 'int', default: 0 })
  inputTokens: number;

  @Column({ name: 'output_tokens', type: 'int', default: 0 })
  outputTokens: number;

  @Column({ name: 'latency_ms', type: 'int', default: 0 })
  latencyMs: number;

  @Column({ type: 'varchar', length: 20, default: 'success' })
  status: string;

  @Column({ name: 'prompt_hash', type: 'char', length: 64 })
  promptHash: string;

  @Column({ name: 'result_preview', type: 'text', nullable: true })
  resultPreview: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.aiCallLogs, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity | null;
}
