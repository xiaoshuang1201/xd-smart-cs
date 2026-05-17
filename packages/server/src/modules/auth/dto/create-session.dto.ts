import { IsString, IsOptional, IsObject } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  fingerprint?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sourcePage?: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  sourceContext?: Record<string, unknown>;
}
