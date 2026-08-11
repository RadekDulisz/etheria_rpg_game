import { IsInt, Max, Min } from 'class-validator';

export class PurchaseProvisionDto {
  @IsInt()
  @Min(1)
  @Max(10)
  quantity: number;
}
