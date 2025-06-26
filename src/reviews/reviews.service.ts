import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review, ReviewDocument } from './entities/review.entity';
import { ProductsService } from '../products/products.service';
import { Product } from '../products/schemas/product.schema';
import { Orders } from '../orders/entities/order.entity';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Product.name) private productModel: Model<Product>,
    @InjectModel(Orders.name) private ordersModel: Model<Orders>,
    private readonly productsService: ProductsService,
  ) {}

  async create(createReviewDto: CreateReviewDto): Promise<ReviewDocument> {
    try {
      const product = await this.productsService.findOne(
        createReviewDto.productId,
      );

      const existingReview = await this.reviewModel.findOne({
        productId: new Types.ObjectId(createReviewDto.productId),
        userId: new Types.ObjectId(createReviewDto.userId),
      });

      if (existingReview) {
        throw new BadRequestException('You have already reviewed this product');
      }

      const hasPurchased = await this.verifyUserPurchasedProduct(
        createReviewDto.userId,
        createReviewDto.productId,
      );

      if (!hasPurchased) {
        throw new BadRequestException(
          'You can only review products you have purchased',
        );
      }

      const newReview = new this.reviewModel({
        productId: new Types.ObjectId(createReviewDto.productId),
        userId: new Types.ObjectId(createReviewDto.userId),
        rating: createReviewDto.rating,
        content: createReviewDto.content,
      });

      const savedReview = await newReview.save();

      await this.productModel.findByIdAndUpdate(
        createReviewDto.productId,
        { $push: { reviews: savedReview._id } },
        { new: true },
      );

      this.logger.debug(
        `Added review ${savedReview._id} to product ${createReviewDto.productId}`,
      );

      await this.updateProductAverageRating(createReviewDto.productId);

      return savedReview;
    } catch (error) {
      this.logger.error(`Error creating review: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create review: ${error.message}`,
      );
    }
  }

  private async verifyUserPurchasedProduct(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    try {
      const userOrders = await this.ordersModel
        .find({
          userId: new Types.ObjectId(userId),
          status: { $in: ['approved', 'completed', 'delivered'] },
        })
        .exec();

      if (!userOrders || userOrders.length === 0) {
        this.logger.debug(`No completed orders found for user ${userId}`);
        return false;
      }

      const orderIds = userOrders.map((order) => order._id);

      const orderItemsWithProduct = await this.ordersModel
        .aggregate([
          {
            $match: {
              _id: { $in: orderIds },
            },
          },
          {
            $lookup: {
              from: 'order_items',
              localField: '_id',
              foreignField: 'orderId',
              as: 'items',
            },
          },
          { $unwind: '$items' },
          {
            $match: {
              'items.productId': new Types.ObjectId(productId),
            },
          },
          { $limit: 1 },
        ])
        .exec();

      return orderItemsWithProduct.length > 0;
    } catch (error) {
      this.logger.error(`Error verifying user purchase: ${error.message}`);
      return false;
    }
  }

  async findAll(
    productId?: string,
    userId?: string,
  ): Promise<ReviewDocument[]> {
    try {
      const query: any = {};

      if (productId) {
        query.productId = new Types.ObjectId(productId);
      }

      if (userId) {
        query.userId = new Types.ObjectId(userId);
      }

      return this.reviewModel
        .find(query)
        .populate('userId', 'fullName email photoUrl')
        .populate('productId', 'productName price')
        .sort({ createdAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding reviews: ${error.message}`);
      throw new BadRequestException(
        `Failed to retrieve reviews: ${error.message}`,
      );
    }
  }

  async findOne(id: string): Promise<ReviewDocument> {
    try {
      const review = await this.reviewModel
        .findById(id)
        .populate('userId', 'fullName email photoUrl')
        .populate('productId', 'productName price')
        .exec();

      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      return review;
    } catch (error) {
      this.logger.error(`Error finding review: ${error.message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to retrieve review: ${error.message}`,
      );
    }
  }

  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    userId: string,
  ): Promise<ReviewDocument> {
    try {
      const review = await this.reviewModel.findById(id);

      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      if (review.userId.toString() !== userId) {
        throw new BadRequestException('You can only update your own reviews');
      }

      if (updateReviewDto.rating) {
        review.rating = updateReviewDto.rating;
      }

      if (updateReviewDto.content !== undefined) {
        review.content = updateReviewDto.content;
      }

      const updatedReview = await review.save();

      await this.updateProductAverageRating(review.productId.toString());

      return updatedReview;
    } catch (error) {
      this.logger.error(`Error updating review: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to update review: ${error.message}`,
      );
    }
  }

  async remove(id: string, userId: string): Promise<{ deleted: boolean }> {
    try {
      const review = await this.reviewModel.findById(id);

      if (!review) {
        throw new NotFoundException(`Review with ID ${id} not found`);
      }

      if (review.userId.toString() !== userId) {
        throw new BadRequestException('You can only delete your own reviews');
      }

      const productId = review.productId.toString();

      await this.productModel.findByIdAndUpdate(
        productId,
        { $pull: { reviews: id } },
        { new: true },
      );

      this.logger.debug(`Removed review ${id} from product ${productId}`);

      await this.reviewModel.deleteOne({ _id: id });

      await this.updateProductAverageRating(productId);

      return { deleted: true };
    } catch (error) {
      this.logger.error(`Error removing review: ${error.message}`);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to remove review: ${error.message}`,
      );
    }
  }

  private async updateProductAverageRating(productId: string): Promise<void> {
    try {
      const reviews = await this.reviewModel.find({
        productId: new Types.ObjectId(productId),
      });

      if (reviews.length === 0) {
        await this.productsService.updateRating(productId, 0, 0);
        return;
      }

      const totalRating = reviews.reduce(
        (sum, review) => sum + review.rating,
        0,
      );
      const averageRating = totalRating / reviews.length;

      await this.productsService.updateRating(
        productId,
        parseFloat(averageRating.toFixed(1)),
        reviews.length,
      );
    } catch (error) {
      this.logger.error(
        `Error updating product's average rating: ${error.message}`,
      );
    }
  }

  async hasUserPurchasedProduct(
    userId: string,
    productId: string,
  ): Promise<boolean> {
    return this.verifyUserPurchasedProduct(userId, productId);
  }

  async findUserReviewForProduct(
    userId: string,
    productId: string,
  ): Promise<ReviewDocument | null> {
    return this.reviewModel
      .findOne({
        userId: new Types.ObjectId(userId),
        productId: new Types.ObjectId(productId),
      })
      .exec();
  }
}
