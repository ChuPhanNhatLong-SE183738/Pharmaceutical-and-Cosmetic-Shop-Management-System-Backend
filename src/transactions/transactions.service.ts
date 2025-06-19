import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async create(createTransactionDto: any): Promise<Transaction> {
    const newTransaction = new this.transactionModel(createTransactionDto);
    return newTransaction.save();
  }

  async findByOrderId(orderId: string): Promise<TransactionDocument | null> {
    // Find the most recent transaction for this orderId
    return this.transactionModel.findOne({ orderId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(): Promise<Transaction[]> {
    return this.transactionModel.find().sort({ createdAt: -1 }).exec();
  }

  async updateStatus(id: string, status: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(id).exec();
    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    transaction.status = status;
    return transaction.save();
  }

  async update(id: string, updateData: any): Promise<TransactionDocument> {
    const transaction = await this.transactionModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
    
  }
  async getRevenue(
    startDate?: Date, 
    endDate?: Date,
  ): Promise<{ totalRevenue: number; transactionCount: number }> {
    this.logger.log(`Calculating revenue from ${startDate} to ${endDate}`);
    
    const query: any = { 
      status: 'success' 
    };
    
    if (startDate || endDate) {
      query['createdAt'] = {};
      
      if (startDate) {
        query['createdAt']['$gte'] = startDate;
      }
      
      if (endDate) {
        query['createdAt']['$lte'] = endDate;
      }
    }
    
    const transactions = await this.transactionModel.find(query).exec();
    
    const totalRevenue = transactions.reduce(
      (sum, transaction) => sum + transaction.totalAmount, 
      0
    );
    return {
      totalRevenue,
      transactionCount: transactions.length,
    };
  }
}
