import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/utils/decimal.transformer';
import { HabitProjectEntity } from './habit-project.entity';
import { UserEntity } from './user.entity';

@Entity('habit_checkins')
@Unique('uk_user_project_date', ['userId', 'projectId', 'checkinDate'])
export class HabitCheckinEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @Column({ name: 'project_id', type: 'bigint', unsigned: true })
  projectId: string;

  @Column({ name: 'checkin_date', type: 'date' })
  checkinDate: string;

  @Column({
    type: 'enum',
    enum: ['done', 'supplemented', 'missed'],
    default: 'done',
  })
  status: 'done' | 'supplemented' | 'missed';

  @Column({ name: 'checked_at', type: 'datetime' })
  checkedAt: Date;

  @Column({ name: 'mood_value', type: 'varchar', length: 32, default: '' })
  moodValue: string;

  @Column({ name: 'score_value', type: 'tinyint', default: 0 })
  scoreValue: number;

  @Column({
    name: 'metric_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  metricValue: number;

  @Column({ name: 'metric_unit', type: 'varchar', length: 32, default: '' })
  metricUnit: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  note: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.checkins, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @ManyToOne(() => HabitProjectEntity, (project) => project.checkins, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: HabitProjectEntity;
}
