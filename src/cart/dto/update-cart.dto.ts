import { PartialType } from '@nestjs/mapped-types';
import { CreateCartDto } from './create-cart.dto';
import { IsNotEmpty, IsNumber, IsString, IsMongoId, Min, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export class CartItemDto {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class UpdateCartDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items?: CartItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;
}

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
