import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRevenueDto {
  @ApiProperty({
    description: 'Start date for revenue calculation (ISO format)',
    required: false,
    example: '2025-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for revenue calculation (ISO format)',
    required: false,
    example: '2025-06-19',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
