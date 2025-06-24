import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InventoryLogFilterDto {
  @ApiProperty({
    description: 'Filter by product ID',
    example: '6123456789abcdef12345678',
    required: false,
  })
  @IsString()
  @IsOptional()
  productId?: string;

  @ApiProperty({
    description: 'Filter by inventory log status',
    enum: ['pending', 'completed', 'denied'],
    example: 'pending',
    required: false,
  })
  @IsOptional()
  @IsEnum(['pending', 'completed', 'denied'])
  status?: 'pending' | 'completed' | 'denied';

  @ApiProperty({
    description: 'Filter by user ID who created the log',
    example: '6123456789abcdef11111111',
    required: false,
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'Filter by action type',
    enum: ['import', 'export'],
    example: 'import',
    required: false,
  })
  @IsOptional()
  @IsEnum(['import', 'export'])
  action?: 'import' | 'export';

  @ApiProperty({
    description: 'Filter by batch identifier',
    example: 'BATCH-2025-001',
    required: false,
  })
  @IsString()
  @IsOptional()
  batch?: string;
}
