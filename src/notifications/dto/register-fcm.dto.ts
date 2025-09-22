import { IsString, IsNotEmpty } from 'class-validator';

export class RegisterFcmDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
