import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEnum, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PaymentDetailsDto {
  @ApiProperty({ description: 'User ID associated with this transaction', example: '65f4a1b2c3d4e5f6a7b8c9d0' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiProperty({ description: 'Cart ID associated with this transaction', example: '65f4a1b2c3d4e5f6a7b8c9d1' })
  @IsString()
  @IsOptional()
  cartId?: string;

  @ApiProperty({ description: 'IP address of the user', example: '127.0.0.1' })
  @IsString()
  @IsOptional()
  ipAddr?: string;

  @ApiProperty({ description: 'Bank code for the payment', example: 'NCB' })
  @IsString()
  @IsOptional()
  bankCode?: string;

  @ApiProperty({ description: 'Card type used for payment', example: 'ATM' })
  @IsString()
  @IsOptional()
  cardType?: string;

  @ApiProperty({ description: 'Transaction number from payment provider', example: '13649557' })
  @IsString()
  @IsOptional()
  transactionNo?: string;

  @ApiProperty({ description: 'Date of payment', example: '20230525213053' })
  @IsString()
  @IsOptional()
  payDate?: string;

  @ApiProperty({ description: 'Response code from payment provider', example: '00' })
  @IsString()
  @IsOptional()
  responseCode?: string;

  @ApiProperty({ description: 'List of product IDs included in this transaction', type: [String], example: ['65f4a1b2c3d4e5f6a7b8c9d2', '65f4a1b2c3d4e5f6a7b8c9d3'] })
  @IsOptional()
  @IsString({ each: true })
  selectedProductIds?: string[];
}

export class CreateTransactionDto {
  @ApiProperty({ description: 'Order reference ID', example: '1684994433981' })
  @IsString()
  orderId: string;

  @ApiProperty({ description: 'Transaction status', example: 'pending', enum: ['pending', 'success', 'failed', 'cancelled'] })
  @IsEnum(['pending', 'success', 'failed', 'cancelled'])
  status: string;

  @ApiProperty({ description: 'Total amount of the transaction', example: 250000 })
  @IsNumber()
  totalAmount: number;

  @ApiProperty({ description: 'Payment method used', example: 'VNPAY', enum: ['VNPAY', 'COD', 'MOMO'] })
  @IsString()
  paymentMethod: string;

  @ApiProperty({ description: 'Additional payment details', type: PaymentDetailsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => PaymentDetailsDto)
  @IsOptional()
  paymentDetails?: PaymentDetailsDto;
}
