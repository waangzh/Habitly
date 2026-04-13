import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateCheckinExtrasDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  moodValue?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  scoreValue?: number;

  @IsOptional()
  @IsNumber()
  metricValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  metricUnit?: string;
}
