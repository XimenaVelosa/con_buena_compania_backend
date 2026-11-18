import { IsBoolean, IsDefined, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DataAuthorizationDto } from './data-authorization.dto.js';
import { ActivitySelectionDto } from './activity-selection.dto.js';

export class CreateClientDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => DataAuthorizationDto)
  authorization!: DataAuthorizationDto;

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
  @IsNumber()
  visitLatitude?: number;

  @IsOptional()
  @IsNumber()
  visitLongitude?: number;

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
  @IsString()
  @MaxLength(40)
  guardianIdNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  guardianAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  guardianPhone?: string;

  @IsOptional()
  @IsBoolean()
  knowsVisit?: boolean;

  @IsOptional()
  @IsString()
  mobilityNeeds?: string;

  @IsOptional()
  @IsString()
  mobilityNotes?: string;

  @IsOptional()
  @IsString()
  independentActivities?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ActivitySelectionDto)
  activitySelection?: ActivitySelectionDto;

  @IsOptional()
  @IsString()
  independenceNotes?: string;

  @IsOptional()
  @IsString()
  homeAccessConditions?: string;

  @IsOptional()
  @IsString()
  homeSafetyNotes?: string;

  @IsOptional()
  @IsString()
  medicationSupport?: string;

  @IsOptional()
  @IsString()
  personalCareSupport?: string;

  @IsOptional()
  @IsString()
  outingConditions?: string;

  @IsOptional()
  @IsString()
  transportPlan?: string;

  @IsOptional()
  @IsString()
  homeSafetyConditions?: string;

  @IsOptional()
  @IsString()
  emergencyContacts?: string;

  @IsOptional()
  @IsString()
  preferences?: string;

  @IsOptional()
  @IsString()
  visitConclusion?: string;

  @IsOptional()
  @IsString()
  recommendedServices?: string;

  @IsOptional()
  @IsString()
  nextContact?: string;

  @IsOptional()
  @IsString()
  finalNotes?: string;
}
