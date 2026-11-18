import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf, ValidateNested } from 'class-validator';
import { ACTIVITY_IDS } from '../activities-catalog.js';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class TaxiContactDto {
  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(160)
  name!: string;

  @IsString()
  @Transform(trim)
  @Matches(/^\+?[\d\s().-]{7,40}$/)
  phone!: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(160)
  company?: string;

  @IsOptional()
  @IsString()
  @Transform(trim)
  @MaxLength(20)
  plate?: string;
}

export class ActivitySelectionDto {
  @IsString()
  catalogVersion!: string;

  @Matches(/^[a-f0-9]{64}$/)
  catalogHash!: string;

  @IsArray()
  @ArrayMaxSize(8)
  @ArrayUnique()
  @IsIn(ACTIVITY_IDS, { each: true })
  selectedIds!: string[];

  @IsIn(['pending', 'trusted-taxi', 'authorize-taxi', 'not-needed'])
  transportMode!: 'pending' | 'trusted-taxi' | 'authorize-taxi' | 'not-needed';

  @IsArray()
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => TaxiContactDto)
  taxiContacts!: TaxiContactDto[];

  @IsBoolean()
  taxiCoordinationAuthorized!: boolean;

  @ValidateIf((data: ActivitySelectionDto) => data.transportMode === 'authorize-taxi')
  @IsString()
  @Transform(trim)
  @MinLength(2)
  @MaxLength(160)
  taxiAuthorizationName?: string;
}
