import { MissionMorality } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class EmbarkMissionDto {
  @IsEnum(MissionMorality)
  morality: MissionMorality;
}

