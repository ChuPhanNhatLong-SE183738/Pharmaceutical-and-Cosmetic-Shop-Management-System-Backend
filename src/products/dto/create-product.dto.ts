import {
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsEnum,
  Min,
  Max,
  IsDate,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SuitableForType } from '../schemas/product.schema';
import { ApiProperty } from '@nestjs/swagger';

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

  @ApiProperty({
    description:
      'Initial stock quantity - Optional, defaults to 0. Stock should be managed through inventory import operations.',
    example: 0,
    minimum: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

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
  @IsEnum(SuitableForType)
  suitableFor: SuitableForType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  salePercentage: number;
}
