import { IsInt, Min } from 'class-validator';

export class AddExperienceDto {
  @IsInt()
  @Min(1)
  amount: number;
}
