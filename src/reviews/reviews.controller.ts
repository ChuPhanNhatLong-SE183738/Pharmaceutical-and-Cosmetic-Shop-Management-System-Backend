import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  HttpStatus,
  Logger,
  Patch,
  Delete,
  Req,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { successResponse, errorResponse } from '../helper/response.helper';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}
  private readonly logger = new Logger(ReviewsController.name);
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new product review' })
  @ApiBody({ type: CreateReviewDto })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid data or user already reviewed this product',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only customers can create reviews',
  })
  async create(@Body() createReviewDto: CreateReviewDto, @Req() req) {
    try {
      const userId = req.user.userId || req.user.sub || req.user._id;

      createReviewDto.userId = userId;

      const review = await this.reviewsService.create(createReviewDto);
      return successResponse(review, 'Review created successfully');
    } catch (error) {
      this.logger.error(`Failed to create review: ${error.message}`);
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }  @Get()
  @ApiOperation({ summary: 'Get all reviews or reviews for a specific product' })
  @ApiQuery({ 
    name: 'productId', 
    description: 'Filter reviews by product ID', 
    required: false, 
    type: 'string' 
  })
  @ApiQuery({ 
    name: 'userId', 
    description: 'Filter reviews by user ID', 
    required: false, 
    type: 'string' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Reviews retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              productId: { type: 'string' },
              userId: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  fullName: { type: 'string' },
                  email: { type: 'string' }
                }
              },
              rating: { type: 'number', minimum: 1, maximum: 5 },
              content: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findAll(@Query('productId') productId?: string, @Query('userId') userId?: string) {
    try {
      const reviews = await this.reviewsService.findAll(productId, userId);
      return successResponse(reviews, 'Reviews retrieved successfully');
    } catch (error) {
      this.logger.error(`Failed to retrieve reviews: ${error.message}`);
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Get(':id')
  @ApiOperation({ summary: 'Get a review by ID' })
  @ApiParam({ name: 'id', description: 'Review ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Review retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findOne(@Param('id') id: string) {
    try {
      const review = await this.reviewsService.findOne(id);
      if (!review) {
        return errorResponse('Review not found', HttpStatus.NOT_FOUND);
      }
      return successResponse(review, 'Review retrieved successfully');
    } catch (error) {
      this.logger.error(`Failed to retrieve review: ${error.message}`);
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a review' })
  @ApiParam({ name: 'id', description: 'Review ID', type: 'string' })
  @ApiBody({ type: UpdateReviewDto })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only the review author can update the review',
  })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Req() req,
  ) {
    try {
      const userId = req.user?.userId;
      const updatedReview = await this.reviewsService.update(
        id,
        updateReviewDto,
        userId,
      );
      if (!updatedReview) {
        return errorResponse('Review not found', HttpStatus.NOT_FOUND);
      }
      return successResponse(updatedReview, 'Review updated successfully');
    } catch (error) {
      this.logger.error(`Failed to update review: ${error.message}`);
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiParam({ name: 'id', description: 'Review ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only the review author can delete the review',
  })
  @ApiResponse({ status: 404, description: 'Review not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async remove(@Param('id') id: string, @Req() req) {
    try {
      const userId = req.user?.userId;
      const deletedReview = await this.reviewsService.remove(id, userId);
      if (!deletedReview) {
        return errorResponse('Review not found', HttpStatus.NOT_FOUND);
      }
      return successResponse(deletedReview, 'Review deleted successfully');
    } catch (error) {
      this.logger.error(`Failed to delete review: ${error.message}`);
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);    }
  }

  @Get('can-review/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if user can review a product' })
  @ApiParam({ name: 'productId', description: 'Product ID', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Check result returned',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            canReview: { type: 'boolean' },
            reason: {
              type: 'string',
              enum: ['already_reviewed', 'not_purchased'],
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async canReviewProduct(@Param('productId') productId: string, @Req() req) {
    try {
      const userId = req.user.userId || req.user.sub || req.user._id;

      const existingReview = await this.reviewsService.findUserReviewForProduct(
        userId,
        productId,
      );

      if (existingReview) {
        return successResponse(
          { canReview: false, reason: 'already_reviewed' },
          'You have already reviewed this product',
        );
      }

      const hasPurchased = await this.reviewsService.hasUserPurchasedProduct(
        userId,
        productId,
      );

      if (!hasPurchased) {
        return successResponse(
          { canReview: false, reason: 'not_purchased' },
          'You can only review products you have purchased',
        );
      }

      return successResponse(
        { canReview: true },
        'You can review this product',
      );
    } catch (error) {
      this.logger.error(`Error checking review eligibility: ${error.message}`);
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
