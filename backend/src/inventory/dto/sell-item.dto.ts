import { IsInt, Max, Min } from 'class-validator';

export class SellItemDto {
  @IsInt()
  @Min(1)
  @Max(1)
  quantity: number = 1;
}
