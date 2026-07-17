import { IsInt, Min } from 'class-validator';

export class AllocateStatsDto {
  @IsInt()
  @Min(0)
  strength: number;

  @IsInt()
  @Min(0)
  agility: number;

  @IsInt()
  @Min(0)
  endurance: number;

  @IsInt()
  @Min(0)
  intelligence: number;
}
