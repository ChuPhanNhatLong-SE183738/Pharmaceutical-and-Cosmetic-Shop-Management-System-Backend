import { IsEnum, IsMongoId, IsNumber, IsOptional } from 'class-validator';
import { ShippingStatus } from '../entities/shipping_log.entity';

export class CreateShippingLogDto {
  @IsMongoId()
  orderId: string;

  @IsEnum(ShippingStatus)
  @IsOptional()
  status?: ShippingStatus;

  @IsNumber()
  totalAmount: number;
}
