import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Podaj poprawny adres e-mail' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Hasło musi mieć co najmniej 8 znaków' })
  @MaxLength(72, { message: 'Hasło może mieć maksymalnie 72 znaki' })
  @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Hasło musi zawierać małą literę, wielką literę i cyfrę',
  })
  password: string;
}
