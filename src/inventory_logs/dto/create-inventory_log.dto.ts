import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InventoryLogItemDto {
  @ApiProperty({
    description: 'Product ID (MongoDB ObjectId)',
    example: '6123456789abcdef12345678',
  })
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @ApiProperty({
    description: 'Quantity of the product to import/export',
    example: 50,
    minimum: 1,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    description: 'Expiry date of the product (ISO format)',
    example: '2025-12-31T23:59:59.000Z',
  })
  @IsNotEmpty()
  @IsDateString()
  expiryDate: string;

  @ApiProperty({
    description: 'Import price of the product at the time of inventory',
    example: 25.99,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description:
      'Batch number - Optional for imports (will be auto-generated if not provided), Optional for exports (specific batch selection, uses FIFO if not specified)',
    example: 'SKINCARE-2025-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  batch?: string;
}

export class CreateInventoryLogDto {
  @ApiProperty({
    description:
      'List of products with quantities, expiry dates, and optional batch numbers for this inventory operation. For imports, batch numbers will be auto-generated if not provided.',
    type: [InventoryLogItemDto],
    example: [
      {
        productId: '6123456789abcdef12345678',
        quantity: 50,
        expiryDate: '2025-12-31T23:59:59.000Z',
        price: 25.99,
      },
      {
        productId: '6123456789abcdef87654321',
        quantity: 25,
        expiryDate: '2026-01-15T23:59:59.000Z',
        price: 15.5,
        batch: 'MAKEUP-2025-045',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryLogItemDto)
  products: InventoryLogItemDto[];

  @ApiProperty({
    description: 'Type of inventory operation',
    enum: ['import', 'export'],
    example: 'import',
  })
  @IsNotEmpty()
  @IsString()
  @IsEnum(['import', 'export'])
  action: string;

  @ApiProperty({
    description:
      'User ID who created the inventory log (will be set automatically from JWT token)',
    example: '6123456789abcdef11111111',
  })
  @IsNotEmpty()
  @IsString()
  @IsMongoId()
  userId: string;
}
