import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { GetRevenueDto } from './dto/get-revenue.dto';
import { RevenueResponseDto } from './dto/revenue-response.dto';

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
}
