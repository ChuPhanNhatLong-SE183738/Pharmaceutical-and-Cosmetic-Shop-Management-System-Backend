import { PartialType } from '@nestjs/swagger';
import { IsMongoId, IsNumber, Min } from 'class-validator';
import { CreateCartDto } from './create-cart.dto';
import { Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class UpdateCartDto extends PartialType(CreateCartDto) {}

export class AddToCartDto {
  @ApiProperty({ description: 'Product ID to add to cart' })
  @IsMongoId()
  // Ensure consistent ObjectId transformation
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return new Types.ObjectId(value);
    }
    return value;
  })
  productId: Types.ObjectId;

  @ApiProperty({ description: 'Quantity to add', minimum: 1 })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
  
  @ApiProperty({ description: 'Product price' })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;
}
