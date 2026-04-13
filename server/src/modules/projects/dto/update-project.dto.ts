import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slogan?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  colorTheme?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate?: string;

  @IsOptional()
  @IsIn(['daily', 'weekly-custom'])
  scheduleType?: 'daily' | 'weekly-custom';

  @IsOptional()
  @IsArray()
  scheduleDays?: number[];

  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @IsArray()
  reminderTimes?: string[];

  @IsOptional()
  @IsBoolean()
  moodEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  scoreEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  metricEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  metricUnit?: string;
}
