import { IsInt, IsUUID, Max, Min } from 'class-validator';

export class PurchaseCatalogItemDto {
  @IsUUID()
  itemId: string;

  @IsInt()
  @Min(1)
  @Max(99)
  quantity: number = 1;
}
