import { IsInt, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CheckinReflectionDto {
  @IsInt()
  @Min(1)
  projectId: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsString()
  @MaxLength(120)
  question: string;

  @IsString()
  @MaxLength(200)
  answer: string;
}
