import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ReportInsightDto {
  @IsIn(['week', 'month'])
  periodType: 'week' | 'month';

  @IsString()
  periodKey: string;

  @IsIn(['project', 'all'])
  scope: 'project' | 'all';

  @IsString()
  @MaxLength(50)
  title: string;

  @IsInt()
  totalCheckins: number;

  @IsInt()
  currentStreak: number;

  @IsOptional()
  averageScore?: number;

  @IsOptional()
  @IsInt()
  lowEnergyCount?: number;

  @IsBoolean()
  reminderEnabled: boolean;

  @IsArray()
  reminderTimes: string[];

  @IsBoolean()
  metricEnabled: boolean;

  @IsOptional()
  @IsString()
  metricUnit?: string;
}
