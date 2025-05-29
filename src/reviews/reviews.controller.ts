import { Controller, Get, Post, Body, Param, UseGuards, Query, HttpStatus, Logger, Patch, Delete, Req } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { successResponse, errorResponse } from '../helper/response.helper';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) { }
  private readonly logger = new Logger(ReviewsController.name);

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  async create(@Body() createReviewDto: CreateReviewDto) {
    try {
      const review = await this.reviewsService.create(createReviewDto);
      return successResponse(review, 'Review created successfully');
    } catch (error) {
      this.logger.error(`Failed to create review: ${error.message}`);
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll() {
    try {
      const reviews = await this.reviewsService.findAll();
      return successResponse(reviews, 'Reviews retrieved successfully');
    } catch (error) {
      this.logger.error(`Failed to retrieve reviews: ${error.message}`);
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
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
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Req() req
  ) {
    try {
      const userId = req.user?.userId;
      const updatedReview = await this.reviewsService.update(id, updateReviewDto, userId);
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
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
