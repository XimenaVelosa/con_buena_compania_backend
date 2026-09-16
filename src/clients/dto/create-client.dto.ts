import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateClientDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  zone?: string;

  @IsOptional()
  @IsString()
  requesterName?: string;

  @IsOptional()
  @IsString()
  payerName?: string;

  @IsOptional()
  @IsBoolean()
  acceptsService?: boolean;
}