import { IsInt, IsUUID, Min } from 'class-validator';

export class PurchaseItemDto {
  @IsUUID()
  shopEntryId: string;

  @IsInt()
  @Min(1)
  quantity: number = 1;
}
