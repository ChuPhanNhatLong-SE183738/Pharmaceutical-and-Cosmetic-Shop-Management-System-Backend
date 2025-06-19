import { ApiProperty } from '@nestjs/swagger';

export class RevenueResponseDto {
  @ApiProperty({ description: 'Total revenue from successful transactions' })
  totalRevenue: number;

  @ApiProperty({ description: 'Total number of successful transactions' })
  transactionCount: number;
}
