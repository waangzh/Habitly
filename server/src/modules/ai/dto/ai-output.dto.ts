import { IsArray, IsBoolean, IsIn, IsString } from 'class-validator';

export class HomeNudgeOutputDto {
  @IsIn(['gentle', 'steady', 'recover', 'celebrate'])
  tone: 'gentle' | 'steady' | 'recover' | 'celebrate';

  @IsString()
  message: string;

  @IsString()
  suggestionTag: string;
}

export class ReportInsightOutputDto {
  @IsString()
  summary: string;

  @IsString()
  blockerHypothesis: string;

  @IsString()
  nextStep: string;
}

export class ProjectDraftOutputDto {
  @IsString()
  title: string;

  @IsString()
  slogan: string;

  @IsArray()
  reminderTimes: string[];

  @IsBoolean()
  moodEnabled: boolean;

  @IsBoolean()
  scoreEnabled: boolean;

  @IsBoolean()
  metricEnabled: boolean;

  @IsString()
  metricUnit: string;

  @IsIn(['daily', 'weekly-custom'])
  scheduleType: 'daily' | 'weekly-custom';

  @IsArray()
  scheduleDays: number[];

  @IsString()
  icon: string;

  @IsString()
  colorTheme: string;
}

export class CheckinCoachOutputDto {
  @IsString()
  question: string;

  @IsString()
  hint: string;
}

export class CheckinReflectionOutputDto {
  @IsString()
  reflection: string;

  @IsString()
  suggestion: string;
}
