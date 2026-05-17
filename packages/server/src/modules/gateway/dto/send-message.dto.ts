import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: '800公斤钢料用多大功率的中频炉？' })
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  conversationId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  sourcePage?: string;
}
