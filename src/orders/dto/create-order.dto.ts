import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class OrderItemDto {
  @IsMongoId()
  productId: string;

  @IsNumber()
  quantity: number;
}

export class CreateOrderDto {
  @IsMongoId()
  userId: string;

  @IsMongoId()
  transactionId: string;

  @IsEnum(['pending', 'approved', 'rejected'])
  status: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  orderItems: OrderItemDto[];
}
