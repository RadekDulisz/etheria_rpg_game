import { IsUUID } from 'class-validator';

export class OwnedItemDto {
  @IsUUID()
  ownedItemId: string;
}
