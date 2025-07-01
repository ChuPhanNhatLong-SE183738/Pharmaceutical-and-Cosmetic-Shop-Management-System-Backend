import { IsString, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBatchStockDto {
  @ApiProperty({
    description: 'Inventory log item ID',
    example: '6123456789abcdef12345678',
  })
  @IsString()
  @IsNotEmpty()
  inventoryLogItemId: string;

  @ApiProperty({
    description:
      'Stock quantity change (positive for increase, negative for decrease)',
    example: -5,
  })
  @IsNumber()
  @IsNotEmpty()
  quantityChange: number;
}
