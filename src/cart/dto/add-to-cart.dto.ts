import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class AddToCartDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  quantity: number;
}
