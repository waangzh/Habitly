import { IsOptional, Matches } from 'class-validator';

export class HistoryGroupedQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  month?: string;
}
