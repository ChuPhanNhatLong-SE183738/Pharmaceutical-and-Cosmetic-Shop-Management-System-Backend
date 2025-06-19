import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefundOrderDto {
  @ApiProperty({
    description: 'Optional reason for refunding the order',
    example: 'Customer requested refund after order rejection',
    required: false,
  })
  @IsOptional()
  @IsString()
  refundReason?: string;

  @ApiProperty({
    description: 'Optional note from staff about the refund',
    example: 'Refund processed due to product unavailability',
    required: false,
  })
  @IsOptional()
  @IsString()
  note?: string;
}
