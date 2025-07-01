import { Controller, Get, UseGuards, Query, Param } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { GetRevenueDto } from './dto/get-revenue.dto';
import { RevenueResponseDto } from './dto/revenue-response.dto';
import { CategoryRevenueResponseDto, CategoryDetailRevenueResponseDto } from './dto/category-revenue-response.dto';

@ApiTags('transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @Roles('admin', 'staff')
  findAll() {
    return this.transactionsService.findAll();
  }
  
  @Get('revenue')
  @Roles('admin')
  @ApiOperation({ summary: 'Get total revenue from successful transactions' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns total revenue and transaction count',
    type: RevenueResponseDto
  })
  async getRevenue(@Query() getRevenueDto: GetRevenueDto) {
    const startDate = getRevenueDto.startDate ? new Date(getRevenueDto.startDate) : undefined;
    const endDate = getRevenueDto.endDate ? new Date(getRevenueDto.endDate) : undefined;
    
    return this.transactionsService.getRevenue(startDate, endDate);
  }

  @Get('revenue/categories')
  @Roles('admin')
  @ApiOperation({ 
    summary: 'Get revenue breakdown by product categories',
    description: 'Returns revenue statistics for each product category based on successful transactions'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns revenue breakdown by categories',
    type: CategoryRevenueResponseDto
  })
  @ApiQuery({ 
    name: 'startDate', 
    required: false, 
    description: 'Start date for filtering (ISO 8601 format)',
    example: '2024-01-01'
  })
  @ApiQuery({ 
    name: 'endDate', 
    required: false, 
    description: 'End date for filtering (ISO 8601 format)',
    example: '2024-12-31'
  })
  async getRevenueByCategories(@Query() getRevenueDto: GetRevenueDto) {
    const startDate = getRevenueDto.startDate ? new Date(getRevenueDto.startDate) : undefined;
    const endDate = getRevenueDto.endDate ? new Date(getRevenueDto.endDate) : undefined;
    
    return this.transactionsService.getRevenueByCategory(startDate, endDate);
  }

  @Get('revenue/categories/:categoryId')
  @Roles('admin')
  @ApiOperation({ 
    summary: 'Get detailed revenue for a specific category',
    description: 'Returns detailed revenue statistics for a specific category including product breakdown'
  })
  @ApiParam({
    name: 'categoryId',
    description: 'Category ID to get revenue details for',
    example: '60f7b3b3b3b3b3b3b3b3b3b3'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns detailed revenue for the specified category',
    type: CategoryDetailRevenueResponseDto
  })
  @ApiQuery({ 
    name: 'startDate', 
    required: false, 
    description: 'Start date for filtering (ISO 8601 format)',
    example: '2024-01-01'
  })
  @ApiQuery({ 
    name: 'endDate', 
    required: false, 
    description: 'End date for filtering (ISO 8601 format)',
    example: '2024-12-31'
  })
  async getRevenueBySpecificCategory(
    @Param('categoryId') categoryId: string,
    @Query() getRevenueDto: GetRevenueDto
  ) {
    const startDate = getRevenueDto.startDate ? new Date(getRevenueDto.startDate) : undefined;
    const endDate = getRevenueDto.endDate ? new Date(getRevenueDto.endDate) : undefined;
    
    return this.transactionsService.getRevenueBySpecificCategory(categoryId, startDate, endDate);
  }
}
