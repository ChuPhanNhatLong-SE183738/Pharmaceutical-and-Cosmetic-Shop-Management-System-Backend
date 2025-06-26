import { IsArray, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CartItemDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;
}

class CartDto {
  @IsNotEmpty()
  @IsString()
  _id: string;

  @IsOptional()
  @IsString()
  userId?: string;  // Make userId optional since we'll get it from JWT

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @IsNotEmpty()
  @IsNumber()
  totalPrice: number;
}

export class CartPaymentDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CartDto)
  cart: CartDto;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsString()
  language?: string;
}

export class SelectedCartPaymentDto {
  @IsObject()
  @ValidateNested()
  @Type(() => CartDto)
  cartPaymentDto: CartPaymentDto;

  @IsArray()
  @IsString({ each: true })
  selectedProductIds: string[];
}