import { Type } from 'class-transformer';
import { IsInt, Matches, Min } from 'class-validator';

export class DeleteDailyCheckinDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId: number;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;
}
