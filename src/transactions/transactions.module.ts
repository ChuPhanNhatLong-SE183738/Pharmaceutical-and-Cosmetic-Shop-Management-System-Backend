import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { Transaction, TransactionSchema } from './entities/transaction.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Transaction.name,
        schema: TransactionSchema,
        collection: 'transactions', // Đảm bảo tên collection là số nhiều
      },
    ]),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService, MongooseModule], // Export MongooseModule để các module khác có thể sử dụng model
})
export class TransactionsModule {}
