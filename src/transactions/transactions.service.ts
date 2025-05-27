import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './entities/transaction.entity';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
  ) {}

  async create(transactionData: {
    orderId: string;
    status: string;
    totalAmount: number;
    paymentMethod?: string;
    paymentDetails?: Record<string, any>;
  }): Promise<Transaction> {
    const newTransaction = new this.transactionModel({
      ...transactionData,
    });
    
    this.logger.debug('Creating new transaction:', JSON.stringify(newTransaction, null, 2));
    return newTransaction.save();
  }

  async findByOrderId(orderId: string): Promise<Transaction | null> {
    return this.transactionModel.findOne({ orderId }).exec();
  }

  async findAll(): Promise<Transaction[]> {
    return this.transactionModel.find().sort({ createdAt: -1 }).exec();
  }
}
