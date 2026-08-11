import { TavernProvisionType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UseProvisionDto {
  @IsEnum(TavernProvisionType)
  type: TavernProvisionType;
}
