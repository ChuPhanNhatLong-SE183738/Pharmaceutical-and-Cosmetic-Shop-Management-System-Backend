import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Transaction,
  TransactionDocument,
} from './entities/transaction.entity';
import { Orders, OrdersDocument, Order_Items, Order_ItemsDocument } from '../orders/entities/order.entity';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Category, CategoryDocument } from '../categories/entities/category.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Orders.name)
    private ordersModel: Model<OrdersDocument>,
    @InjectModel(Order_Items.name)
    private orderItemsModel: Model<Order_ItemsDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(Category.name)
    private categoryModel: Model<CategoryDocument>,
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

  async getRevenueByCategory(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    categoryRevenue: {
      categoryId: string;
      categoryName: string;
      totalRevenue: number;
      transactionCount: number;
      orderCount: number;
    }[];
    totalRevenue: number;
  }> {
    this.logger.log(`Calculating revenue by category from ${startDate} to ${endDate}`);

    try {
      // Build the match query for transactions
      const transactionQuery: any = { status: 'success' };
      
      if (startDate || endDate) {
        transactionQuery['createdAt'] = {};
        
        if (startDate) {
          transactionQuery['createdAt']['$gte'] = startDate;
        }
        
        if (endDate) {
          transactionQuery['createdAt']['$lte'] = endDate;
        }
      }

      // Aggregate pipeline to get revenue by category
      const pipeline = [
        // Match successful transactions within date range
        { $match: transactionQuery },
        
        // Lookup orders for each transaction
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order',
          },
        },
        { $unwind: '$order' },
        
        // Lookup order items for each order
        {
          $lookup: {
            from: 'order_items',
            localField: 'order._id',
            foreignField: 'orderId',
            as: 'orderItems',
          },
        },
        { $unwind: '$orderItems' },
        
        // Lookup product for each order item
        {
          $lookup: {
            from: 'products',
            localField: 'orderItems.productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        
        // Unwind product categories (since category is an array)
        { $unwind: '$product.category' },
        
        // Lookup category details
        {
          $lookup: {
            from: 'categories',
            localField: 'product.category',
            foreignField: '_id',
            as: 'categoryInfo',
          },
        },
        { $unwind: '$categoryInfo' },
        
        // Group by category to calculate revenue
        {
          $group: {
            _id: '$categoryInfo._id',
            categoryName: { $first: '$categoryInfo.categoryName' },
            totalRevenue: {
              $sum: {
                $multiply: ['$orderItems.quantity', '$orderItems.price'],
              },
            },
            transactionCount: { $addToSet: '$_id' },
            orderCount: { $addToSet: '$order._id' },
          },
        },
        
        // Add transaction and order counts
        {
          $addFields: {
            transactionCount: { $size: '$transactionCount' },
            orderCount: { $size: '$orderCount' },
          },
        },
        
        // Sort by total revenue descending
        { $sort: { totalRevenue: -1 } },
      ] as any[];

      const result = await this.transactionModel.aggregate(pipeline).exec();

      // Calculate total revenue across all categories
      const totalRevenue = result.reduce(
        (sum, category) => sum + category.totalRevenue,
        0,
      );

      // Format the response
      const categoryRevenue = result.map((category) => ({
        categoryId: category._id.toString(),
        categoryName: category.categoryName,
        totalRevenue: category.totalRevenue,
        transactionCount: category.transactionCount,
        orderCount: category.orderCount,
      }));

      return {
        categoryRevenue,
        totalRevenue,
      };
    } catch (error) {
      this.logger.error(`Error calculating revenue by category: ${error.message}`);
      throw error;
    }
  }

  async getRevenueBySpecificCategory(
    categoryId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    categoryId: string;
    categoryName: string;
    totalRevenue: number;
    transactionCount: number;
    orderCount: number;
    products: {
      productId: string;
      productName: string;
      totalRevenue: number;
      quantitySold: number;
    }[];
  }> {
    this.logger.log(`Calculating revenue for category ${categoryId} from ${startDate} to ${endDate}`);

    try {
      // Build the match query for transactions
      const transactionQuery: any = { status: 'success' };
      
      if (startDate || endDate) {
        transactionQuery['createdAt'] = {};
        
        if (startDate) {
          transactionQuery['createdAt']['$gte'] = startDate;
        }
        
        if (endDate) {
          transactionQuery['createdAt']['$lte'] = endDate;
        }
      }

      // First, get category information
      const categoryInfo = await this.categoryModel.findById(categoryId).exec();
      if (!categoryInfo) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }

      // Aggregate pipeline for specific category
      const pipeline = [
        // Match successful transactions within date range
        { $match: transactionQuery },
        
        // Lookup orders for each transaction
        {
          $lookup: {
            from: 'orders',
            localField: 'orderId',
            foreignField: '_id',
            as: 'order',
          },
        },
        { $unwind: '$order' },
        
        // Lookup order items for each order
        {
          $lookup: {
            from: 'order_items',
            localField: 'order._id',
            foreignField: 'orderId',
            as: 'orderItems',
          },
        },
        { $unwind: '$orderItems' },
        
        // Lookup product for each order item
        {
          $lookup: {
            from: 'products',
            localField: 'orderItems.productId',
            foreignField: '_id',
            as: 'product',
          },
        },
        { $unwind: '$product' },
        
        // Filter products that belong to the specified category
        {
          $match: {
            'product.category': new Types.ObjectId(categoryId),
          },
        },
        
        // Group by product to calculate revenue per product
        {
          $group: {
            _id: '$product._id',
            productName: { $first: '$product.productName' },
            totalRevenue: {
              $sum: {
                $multiply: ['$orderItems.quantity', '$orderItems.price'],
              },
            },
            quantitySold: { $sum: '$orderItems.quantity' },
            transactionIds: { $addToSet: '$_id' },
            orderIds: { $addToSet: '$order._id' },
          },
        },
        
        // Sort by total revenue descending
        { $sort: { totalRevenue: -1 } },
      ] as any[];

      const productResults = await this.transactionModel.aggregate(pipeline).exec();

      // Calculate totals for the category
      const totalRevenue = productResults.reduce(
        (sum, product) => sum + product.totalRevenue,
        0,
      );

      const allTransactionIds = new Set();
      const allOrderIds = new Set();
      
      productResults.forEach((product) => {
        product.transactionIds.forEach((id: any) => allTransactionIds.add(id.toString()));
        product.orderIds.forEach((id: any) => allOrderIds.add(id.toString()));
      });

      // Format the response
      const products = productResults.map((product) => ({
        productId: product._id.toString(),
        productName: product.productName,
        totalRevenue: product.totalRevenue,
        quantitySold: product.quantitySold,
      }));

      return {
        categoryId: categoryId,
        categoryName: categoryInfo.categoryName,
        totalRevenue,
        transactionCount: allTransactionIds.size,
        orderCount: allOrderIds.size,
        products,
      };
    } catch (error) {
      this.logger.error(`Error calculating revenue for category ${categoryId}: ${error.message}`);
      throw error;
    }
  }
}
