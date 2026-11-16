import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateClientDto {
  @IsOptional()
  @IsString()
  visitDate?: string;

  @IsOptional()
  @IsString()
  visitTime?: string;

  @IsOptional()
  @IsString()
  visitLocation?: string;

  @IsOptional()
  @IsString()
  visitAgentName?: string;

  @IsString()
  fullName!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  approximateAge?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  requesterName?: string;

  @IsOptional()
  @IsString()
  requesterRelationship?: string;

  @IsOptional()
  @IsString()
  payerName?: string;

  @IsOptional()
  @IsBoolean()
  knowsVisit?: boolean;
}
