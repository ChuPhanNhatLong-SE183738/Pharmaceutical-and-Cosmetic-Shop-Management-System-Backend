import { IsString, IsArray, IsNumber, IsOptional, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CartItemDto } from './update-cart.dto';

export class CreateCartDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items?: CartItemDto[];

  @IsNumber()
  @Min(0)
  totalAmount: number = 0;
}
