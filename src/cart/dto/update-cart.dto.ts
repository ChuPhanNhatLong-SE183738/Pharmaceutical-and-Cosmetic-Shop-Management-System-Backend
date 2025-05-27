import { PartialType } from '@nestjs/mapped-types';
import { CreateCartDto } from './create-cart.dto';
import { IsNotEmpty, IsNumber, IsString, IsMongoId, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartDto extends PartialType(CreateCartDto) {}

export class AddToCartDto {
  @IsNotEmpty()
  @IsMongoId({ message: 'productId must be a mongodb id' })
  productId: string;

  @IsNotEmpty()
  @IsNumber({}, { message: 'quantity must be a number' })
  @Min(1, { message: 'quantity must be at least 1' })
  @Type(() => Number) // This ensures string numbers are converted to numbers before validation
  quantity: number;
}
