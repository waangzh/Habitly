import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { HabitCheckinEntity } from './habit-checkin.entity';
import { UserEntity } from './user.entity';

@Entity('habit_projects')
export class HabitProjectEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: string;

  @Column({ name: 'user_id', type: 'bigint', unsigned: true })
  userId: string;

  @Column({ type: 'varchar', length: 50 })
  title: string;

  @Column({ type: 'varchar', length: 16 })
  icon: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  slogan: string;

  @Column({ name: 'color_theme', type: 'varchar', length: 32, default: 'blue' })
  colorTheme: string;

  @Column({
    type: 'enum',
    enum: ['active', 'paused', 'archived'],
    default: 'active',
  })
  status: 'active' | 'paused' | 'archived';

  @Column({
    name: 'schedule_type',
    type: 'enum',
    enum: ['daily', 'weekly-custom'],
    default: 'daily',
  })
  scheduleType: 'daily' | 'weekly-custom';

  @Column({ name: 'schedule_days', type: 'json' })
  scheduleDays: number[];

  @Column({
    name: 'target_type',
    type: 'enum',
    enum: ['forever', 'days', 'times'],
    default: 'forever',
  })
  targetType: 'forever' | 'days' | 'times';

  @Column({ name: 'target_value', type: 'int', default: 0 })
  targetValue: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate: string | null;

  @Column({ name: 'reminder_enabled', type: 'tinyint', default: 1 })
  reminderEnabled: boolean;

  @Column({ name: 'reminder_times', type: 'json' })
  reminderTimes: string[];

  @Column({ name: 'mood_enabled', type: 'tinyint', default: 0 })
  moodEnabled: boolean;

  @Column({ name: 'score_enabled', type: 'tinyint', default: 0 })
  scoreEnabled: boolean;

  @Column({ name: 'metric_enabled', type: 'tinyint', default: 0 })
  metricEnabled: boolean;

  @Column({ name: 'metric_unit', type: 'varchar', length: 32, default: '' })
  metricUnit: string;

  @Column({ name: 'paused_at', type: 'datetime', nullable: true })
  pausedAt: Date | null;

  @Column({ name: 'archived_at', type: 'datetime', nullable: true })
  archivedAt: Date | null;

  @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
  deletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, (user) => user.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @OneToMany(() => HabitCheckinEntity, (checkin) => checkin.project)
  checkins: HabitCheckinEntity[];
}
