import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateCharacterDto {
  @IsString()
  @MinLength(3, { message: 'Nazwa postaci musi mieć co najmniej 3 znaki' })
  @MaxLength(20, { message: 'Nazwa postaci może mieć maksymalnie 20 znaków' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Nazwa postaci może zawierać tylko litery, cyfry i podkreślenia',
  })
  name: string;
}
