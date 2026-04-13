import { IsInt, IsNumber, IsObject, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ProjectSignalDto {
  @IsString()
  title: string;

  @IsInt()
  currentStreak: number;
}

export class HomeNudgeDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  selectedDate: string;

  @IsInt()
  projectCount: number;

  @IsInt()
  completedCount: number;

  @IsInt()
  pendingCount: number;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectSignalDto)
  focusProject?: ProjectSignalDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProjectSignalDto)
  topStreakProject?: ProjectSignalDto;

  @IsOptional()
  @IsInt()
  lowEnergyCount?: number;

  @IsOptional()
  @IsNumber()
  averageScore?: number;

  @IsOptional()
  @IsInt()
  recentCheckins?: number;
}
