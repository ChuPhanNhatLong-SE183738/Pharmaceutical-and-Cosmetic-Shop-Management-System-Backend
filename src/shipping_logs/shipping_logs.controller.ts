import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Logger,
  UseGuards,
  ParseIntPipe,
  Request,
  HttpStatus,
} from '@nestjs/common';
import { ShippingLogsService } from './shipping_logs.service';
import { CreateShippingLogDto } from './dto/create-shipping-log.dto';
import { UpdateShippingLogDto } from './dto/update-shipping-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ShippingStatus } from './entities/shipping_log.entity';
import { successResponse } from '../helper/response.helper';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Role } from 'src/users/enums/role.enum';

@Controller('shipping-logs')
export class ShippingLogsController {
  private readonly logger = new Logger(ShippingLogsController.name);

  constructor(private readonly shippingLogsService: ShippingLogsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  async create(
    @Body() createShippingLogDto: CreateShippingLogDto,
    @Request() req,
  ) {
    this.logger.log(
      `Creating shipping log for order: ${createShippingLogDto.orderId} by user: ${req.user.userId}`,
    );
    const shippingLog =
      await this.shippingLogsService.create(createShippingLogDto);
    return successResponse(
      shippingLog,
      'Shipping log created successfully',
      HttpStatus.CREATED,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req) {
    this.logger.log(`Retrieving all shipping logs by user: ${req.user.userId}`);

    const logs = await this.shippingLogsService.findAll();

    // Transform the data to a more friendly format with full order details
    const formattedLogs = await Promise.all(
      logs.map(async (log) => {
        const order = log.orderId as any;
        const user = order?.userId as any;
        const transaction = order?.transactionId as any;
        const logObj = log.toObject ? log.toObject() : log;

        // Get order items for each order
        let items: any[] = []; // Explicitly type as any[]
        if (order && order._id) {
          try {
            items =
              await this.shippingLogsService.getOrderItemsWithProductDetails(
                order._id,
              );
          } catch (error) {
            this.logger.error(`Failed to fetch order items: ${error.message}`);
          }
        }

        // Create a product summary for quick reference
        const productSummary =
          items.length > 0
            ? items
                .map((item: any) => `${item.quantity}x ${item.productName}`)
                .join(', ')
            : 'No items';

        return {
          id: log._id,
          status: log.status,
          totalAmount: log.totalAmount,
          createdAt: logObj.createdAt,
          updatedAt: logObj.updatedAt,
          productSummary,
          itemCount: items.length,
          totalQuantity: items.reduce(
            (sum: number, item: any) => sum + (item.quantity || 0),
            0,
          ),
          order: order
            ? {
                id: order._id,
                status: order.status,
                totalAmount: order.totalAmount,
                shippingAddress: order.shippingAddress,
                contactPhone: order.contactPhone,
                createdAt: order.createdAt,
                updatedAt: order.updatedAt,
                notes: order.notes,
              }
            : null,
          customer: user
            ? {
                id: user._id,
                name: user.name || user.fullName,
                email: user.email,
                phone: user.phone,
                address: user.address,
              }
            : null,
          transaction: transaction
            ? {
                id: transaction._id,
                amount: transaction.amount,
                status: transaction.status,
                paymentMethod: transaction.paymentMethod,
                createdAt: transaction.createdAt,
              }
            : null,
          items: items,
        };
      }),
    );

    return successResponse(
      formattedLogs,
      'Shipping logs retrieved successfully',
    );
  }

  @Get('/order-items/:orderId')
  @UseGuards(JwtAuthGuard)
  async getOrderItems(@Param('orderId') orderId: string) {
    this.logger.log(`Retrieving order items for order: ${orderId}`);

    const items =
      await this.shippingLogsService.getOrderItemsWithProductDetails(orderId);

    return successResponse(
      {
        items,
        count: items.length,
        totalQuantity: items.reduce(
          (sum: number, item: any) => sum + (item.quantity || 0),
          0,
        ),
      },
      'Order items retrieved successfully',
    );
  }

  @Get('order/:orderId')
  async findByOrderId(@Param('orderId') orderId: string) {
    this.logger.log(`Retrieving shipping log for order: ${orderId}`);
    const log = await this.shippingLogsService.findByOrderId(orderId);

    // Get the fully populated log data
    const order = log.orderId as any;
    const user = order?.userId as any;
    const transaction = order?.transactionId as any;
    const items = order?.items || [];
    const logObj = log.toObject ? log.toObject() : log;

    const formattedLog = {
      id: log._id,
      status: log.status,
      totalAmount: log.totalAmount,
      createdAt: logObj.createdAt,
      updatedAt: logObj.updatedAt,
      order: order
        ? {
            id: order._id,
            status: order.status,
            totalAmount: order.totalAmount,
            shippingAddress: order.shippingAddress,
            contactPhone: order.contactPhone,
            notes: order.notes,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: items.map((item) => ({
              id: item._id,
              productName: item.productName || item.productDetails?.productName,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              productImage:
                item.productImage ||
                item.productDetails?.productImages?.[0] ||
                '',
              productDetails: item.productDetails,
            })),
          }
        : null,
      customer: user
        ? {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address,
          }
        : null,
      transaction: transaction
        ? {
            id: transaction._id,
            amount: transaction.amount,
            status: transaction.status,
            paymentMethod: transaction.paymentMethod,
            createdAt: transaction.createdAt,
          }
        : null,
    };

    return successResponse(formattedLog, 'Shipping log retrieved successfully');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string) {
    this.logger.log(`Retrieving shipping log with ID: ${id}`);
    const log = await this.shippingLogsService.findOne(+id);

    // Format response similar to findByOrderId
    const order = log.orderId as any;
    const user = order?.userId as any;
    const transaction = order?.transactionId as any;
    const items = order?.items || [];
    const logObj = log.toObject ? log.toObject() : log;

    const formattedLog = {
      id: log._id,
      status: log.status,
      totalAmount: log.totalAmount,
      createdAt: logObj.createdAt,
      updatedAt: logObj.updatedAt,
      order: order
        ? {
            id: order._id,
            status: order.status,
            totalAmount: order.totalAmount,
            shippingAddress: order.shippingAddress,
            contactPhone: order.contactPhone,
            notes: order.notes,
            createdAt: order.createdAt,
            updatedAt: order.updatedAt,
            items: items.map((item) => ({
              id: item._id,
              productName: item.productName || item.productDetails?.productName,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              productImage:
                item.productImage ||
                item.productDetails?.productImages?.[0] ||
                '',
              productDetails: item.productDetails,
            })),
          }
        : null,
      customer: user
        ? {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address,
          }
        : null,
      transaction: transaction
        ? {
            id: transaction._id,
            amount: transaction.amount,
            status: transaction.status,
            paymentMethod: transaction.paymentMethod,
            createdAt: transaction.createdAt,
          }
        : null,
    };

    return successResponse(formattedLog, 'Shipping log retrieved successfully');
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  async update(
    @Param('id') id: string,
    @Body() updateShippingLogDto: UpdateShippingLogDto,
    @Request() req,
  ) {
    this.logger.log(
      `Updating shipping log with ID: ${id} by user: ${req.user.userId}`,
    );
    const updatedLog = await this.shippingLogsService.update(
      +id,
      updateShippingLogDto,
    );
    return successResponse(updatedLog, 'Shipping log updated successfully');
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF, Role.CUSTOMER) // Allow all authenticated users
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ShippingStatus,
    @Request() req,
  ) {
    const userId = req.user.userId;
    const roles = req.user.roles || [];
    const userRole = req.user.role;

    this.logger.log(
      `Updating status of shipping log with ID: ${id} to ${status} by user: ${userId} with role: ${userRole || roles.join(', ')}`,
    );

    // Special validation for status updates
    // Only allow users to set to RECEIVED status, staff/admin can set any status
    if (
      status !== ShippingStatus.RECEIVED &&
      !['admin', 'staff'].includes(userRole) &&
      !roles.some((role) => ['admin', 'staff'].includes(role))
    ) {
      return {
        success: false,
        message: 'Users can only confirm receipt of orders',
        errorCode: HttpStatus.FORBIDDEN,
      };
    }

    const updatedLog = await this.shippingLogsService.updateStatus(id, status);
    return successResponse(updatedLog, 'Shipping status updated successfully');
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id') id: string) {
    this.logger.log(`Deleting shipping log with ID: ${id}`);
    const deletedLog = await this.shippingLogsService.remove(+id);
    return successResponse(deletedLog, 'Shipping log deleted successfully');
  }
}
