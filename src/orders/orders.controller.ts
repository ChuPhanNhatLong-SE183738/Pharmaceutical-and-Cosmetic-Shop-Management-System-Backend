import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { RefundOrderDto } from './dto/refund-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { successResponse, errorResponse } from '../helper/response.helper';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() createOrderDto: CreateOrderDto) {
    try {
      const order = await this.ordersService.createOrder(createOrderDto);
      return successResponse(order, 'Order created successfully');
    } catch (error) {
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  async findAll(@Query() query: any) {
    try {
      // Thêm query params để lọc theo status nếu cần
      const { status } = query;
      let orders;

      if (status) {
        orders = await this.ordersService.findAllByStatus(status);
        return successResponse(
          orders,
          `Orders with status ${status} retrieved successfully`,
        );
      }

      orders = await this.ordersService.findAll();
      return successResponse(orders, 'All orders retrieved successfully');
    } catch (error) {
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('by-user')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user orders' })
  @ApiResponse({ status: 200, description: 'Returns user orders' })
  @ApiBearerAuth()
  async findOrdersByUser(@Request() req) {
    try {
      const userId = req.user.sub || req.user.id;

      const orders = await this.ordersService.findOrdersByUserId(userId);
      return successResponse(orders, 'Orders for user retrieved successfully');
    } catch (error) {
      return errorResponse(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    try {
      const order = await this.ordersService.findOne(id);
      return successResponse(order, 'Order retrieved successfully');
    } catch (error) {
      return errorResponse(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    try {
      const order = await this.ordersService.update(id, updateOrderDto);
      return successResponse(order, 'Order updated successfully');
    } catch (error) {
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    try {
      const order = await this.ordersService.updateOrderStatus(id, status);
      return successResponse(order, `Order status updated to ${status}`);
    } catch (error) {
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // API để admin/staff xử lý đơn hàng
  @Patch(':id/process')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  async processOrder(
    @Param('id') id: string,
    @Body()
    data: {
      status: 'approved' | 'rejected';
      note?: string;
      rejectionReason?: string;
    },
    @Request() req,
  ) {
    try {
      // Lấy userId của admin/staff từ JWT token
      const processedBy = req.user.userId || req.user.sub;

      const order = await this.ordersService.processOrder(id, {
        ...data,
        processedBy,
      });

      let message = `Order ${data.status === 'approved' ? 'approved' : 'rejected'}`;
      if (data.note) message += ' with note';
      if (data.rejectionReason) message += ` (Reason: ${data.rejectionReason})`;

      return successResponse(order, message);
    } catch (error) {
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  // API để admin/staff refund đơn hàng đã bị reject
  @Patch(':id/refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Refund a rejected order' })
  @ApiResponse({
    status: 200,
    description: 'Order has been successfully refunded',
  })
  @ApiResponse({
    status: 409,
    description: 'Order cannot be refunded (not in rejected status)',
  })
  @ApiBearerAuth()
  async refundOrder(
    @Param('id') id: string,
    @Body() refundData: RefundOrderDto,
    @Request() req,
  ) {
    try {
      // Lấy userId của admin/staff từ JWT token
      const processedBy = req.user.userId || req.user.sub;

      const order = await this.ordersService.refundOrder(id, {
        ...refundData,
        processedBy,
      });

      let message = 'Order has been refunded successfully';
      if (refundData.refundReason) {
        message += ` (Reason: ${refundData.refundReason})`;
      }

      return successResponse(order, message);
    } catch (error) {
      const statusCode = error.status || HttpStatus.BAD_REQUEST;
      return errorResponse(error.message, statusCode);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const order = await this.ordersService.remove(id);
      return successResponse(order, 'Order deleted successfully');
    } catch (error) {
      return errorResponse(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('revenue/admin')
  @ApiOperation({ summary: 'Get revenue from orders' })
  @ApiResponse({
    status: 200,
    description: 'Returns total revenue from all orders',
  })
  async getRevenue() {
    try {
      const revenue = await this.ordersService.getRevenueFromOrders();
      return successResponse(revenue, 'Total revenue retrieved successfully');
    } catch (error) {
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  @Get(':id/batch-details')
  @ApiOperation({ summary: 'Get batch reduction details for an order' })
  @ApiResponse({
    status: 200,
    description: 'Returns detailed information about which batches were used for stock reduction',
  })
  async getOrderBatchDetails(@Param('id') id: string) {
    try {
      const batchDetails = await this.ordersService.getOrderBatchDetails(id);
      return successResponse(batchDetails, 'Order batch details retrieved successfully');
    } catch (error) {
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
