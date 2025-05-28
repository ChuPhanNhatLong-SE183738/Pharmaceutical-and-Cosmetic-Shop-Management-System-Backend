import { CreateTransactionDto } from './create-transaction.dto';

export class UpdateTransactionDto {
  readonly orderId?: string;
  readonly status?: string;
  readonly totalAmount?: number;
  readonly paymentMethod?: string;
  readonly paymentDetails?: any;
}
