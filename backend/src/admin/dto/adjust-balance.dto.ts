import { IsInt, IsOptional, IsString, MaxLength, NotEquals } from 'class-validator';

export class AdjustBalanceDto {
  @IsInt()
  @NotEquals(0)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}
