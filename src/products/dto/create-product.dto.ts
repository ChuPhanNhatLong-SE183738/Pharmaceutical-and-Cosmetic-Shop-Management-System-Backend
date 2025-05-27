import { IsString, IsNumber, IsArray, IsOptional, IsEnum, Min, Max, IsDate, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { SuitableFor } from '../entities/product.entity';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  productDescription: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  stock: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  category: string[];

  @IsOptional()
  @IsString()
  brand: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productImages: string[];

  @IsOptional()
  @IsString()
  ingredients: string;

  @IsOptional()
  @IsEnum(SuitableFor)
  suitableFor: SuitableFor;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  salePercentage: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiryDate: Date;
}