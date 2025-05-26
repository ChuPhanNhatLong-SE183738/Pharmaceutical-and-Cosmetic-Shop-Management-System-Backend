import { IsArray, IsMongoId, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { Types } from 'mongoose';

// CartItemDto represents an item in the cart with its price
export class CartItemDto {
  @ApiProperty({ description: 'Product ID' })
  @IsMongoId()
  productId: Types.ObjectId;

  @ApiProperty({ description: 'Product quantity', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
  
  @ApiProperty({ description: 'Product price' })
  @IsNumber()
  @Min(0)
  price: number;
}

// CreateCartDto represents the entire cart creation
// Used for initial cart creation or complete cart replacement
export class CreateCartDto {
  @ApiProperty({ description: 'User ID' })
  @IsMongoId()
  userId: Types.ObjectId;

  @ApiProperty({ description: 'Cart items', type: [CartItemDto], required: false })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items?: CartItemDto[];
  
  @ApiProperty({ description: 'Total cart price', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  totalPrice?: number;
}
