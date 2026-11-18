import { Equals, IsBoolean, IsIn, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class DataAuthorizationDto {
  @Equals(true)
  personalData!: boolean;

  @Equals(true)
  truthfulness!: boolean;

  @IsBoolean()
  sensitiveData!: boolean;

  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(2)
  @MaxLength(160)
  signerName!: string;

  @IsIn(['titular', 'representante'])
  signerRole!: 'titular' | 'representante';

  @ValidateIf((data: DataAuthorizationDto) => data.signerRole === 'representante')
  @IsString()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @MinLength(10)
  @MaxLength(300)
  representativeBasis?: string;

  @IsString()
  version!: string;

  @Matches(/^[a-f0-9]{64}$/)
  noticeHash!: string;
}
