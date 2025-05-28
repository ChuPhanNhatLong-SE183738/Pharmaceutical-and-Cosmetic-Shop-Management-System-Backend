import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
  ) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<TransactionDocument> {
    const newTransaction = new this.transactionModel(createTransactionDto);
    this.logger.debug('Creating new transaction:', JSON.stringify(newTransaction, null, 2));
    return newTransaction.save();
  }

  async findByOrderId(orderId: string): Promise<TransactionDocument | null> {
    return this.transactionModel.findOne({ orderId }).exec();
  }

  async findAll(): Promise<Transaction[]> {
    return this.transactionModel.find().sort({ createdAt: -1 }).exec();
  }
}
