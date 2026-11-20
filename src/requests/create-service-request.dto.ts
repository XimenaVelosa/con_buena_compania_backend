import { Transform } from 'class-transformer';
import {
  ArrayMaxSize, ArrayNotEmpty, ArrayUnique, Equals, IsArray, IsEmail, IsIn,
  IsNumber, IsOptional, IsString, IsUUID, Length, Matches, Max, Min,
} from 'class-validator';
import { ACTIVITY_IDS } from '../clients/activities-catalog.js';

export const REQUEST_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const REQUEST_NOTICE_VERSION = 'CBC-SOLICITUD-2026-11-20-v1';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const mobile = /^\+?[0-9]{7,15}$/;

export class CreateServiceRequestDto {
  @IsUUID('4')
  id!: string;

  @Transform(trim)
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @Transform(trim)
  @IsEmail()
  @Length(3, 254)
  email!: string;

  @Matches(mobile)
  phone!: string;

  @IsOptional()
  @Matches(mobile)
  alternatePhone?: string;

  @Matches(/^\d{2}$/)
  departmentCode!: string;

  @Matches(/^\d{5}$/)
  municipalityCode!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.25)
  @Max(24)
  hoursPerDay!: number;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsIn(REQUEST_DAYS, { each: true })
  days!: string[];

  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(ACTIVITY_IDS.length)
  @ArrayUnique()
  @IsIn(ACTIVITY_IDS, { each: true })
  activities!: string[];

  @Equals(true)
  authorized!: boolean;

  @Equals(REQUEST_NOTICE_VERSION)
  noticeVersion!: string;
}
