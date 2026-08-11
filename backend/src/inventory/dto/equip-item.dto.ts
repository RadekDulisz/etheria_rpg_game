import { EquipmentSlot } from '@prisma/client';
import { IsEnum, IsUUID } from 'class-validator';

export class EquipItemDto {
  @IsUUID()
  ownedItemId: string;

  @IsEnum(EquipmentSlot, { message: 'Wybrano nieprawidłowe miejsce wyposażenia' })
  slot: EquipmentSlot;
}
