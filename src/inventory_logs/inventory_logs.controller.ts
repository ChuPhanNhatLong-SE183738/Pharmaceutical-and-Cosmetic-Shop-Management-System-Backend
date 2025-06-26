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
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../users/enums/role.enum';
import { InventoryLogsService } from './inventory_logs.service';
import { CreateInventoryLogDto } from './dto/create-inventory_log.dto';
import { ReviewInventoryLogDto } from './dto/review-inventory_request.dto';
import { InventoryLogFilterDto } from './dto/inventory_log-filter.dto';
import { successResponse, errorResponse } from '../helper/response.helper';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiQuery,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';

@ApiTags('inventory-logs')
@Controller('inventory-logs')
export class InventoryLogsController {
  private readonly logger = new Logger(InventoryLogsController.name);
  constructor(private readonly inventoryLogsService: InventoryLogsService) {}
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new inventory log',
    description:
      'Create a new inventory log for importing or exporting products',
  })
  @ApiBody({
    type: CreateInventoryLogDto,
    description: 'Inventory log data to be created',
  })
  @ApiCreatedResponse({
    description: 'Inventory log created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            batch: { type: 'string' },
            action: { type: 'string', enum: ['import', 'export'] },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'denied'],
            },
            userId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiForbiddenResponse({ description: 'User does not have required roles' })
  @ApiBadRequestResponse({
    description: 'Invalid request data or products not found',
  })
  async create(@Body() createInventoryLogDto: CreateInventoryLogDto) {
    try {
      const inventoryLog = await this.inventoryLogsService.create(
        createInventoryLogDto,
      );
      return successResponse(
        inventoryLog,
        'Inventory log created successfully',
        HttpStatus.CREATED,
      );
    } catch (error) {
      this.logger.error(`Failed to create inventory log: ${error.message}`);
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get all inventory logs',
    description: 'Retrieves all inventory logs with optional filtering',
  })
  @ApiQuery({
    name: 'productId',
    required: false,
    type: String,
    description: 'Filter logs by product ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'completed', 'denied'],
    description: 'Filter logs by status',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter logs by user ID',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: ['import', 'export'],
    description: 'Filter logs by action type',
  })
  @ApiQuery({
    name: 'batch',
    required: false,
    type: String,
    description: 'Filter logs by batch identifier',
  })
  @ApiOkResponse({
    description: 'Inventory logs retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            logs: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  batch: { type: 'string' },
                  action: { type: 'string', enum: ['import', 'export'] },
                  status: {
                    type: 'string',
                    enum: ['pending', 'completed', 'denied'],
                  },
                  userId: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      fullName: { type: 'string' },
                      email: { type: 'string' },
                    },
                  },
                  reason: { type: 'string' },
                  items: {
                    type: 'array',
                    description: 'Inventory log items with product details',
                    items: {
                      type: 'object',
                      properties: {
                        _id: { type: 'string' },
                        inventoryLogId: { type: 'string' },
                        productId: {
                          type: 'object',
                          properties: {
                            _id: { type: 'string' },
                            productName: { type: 'string' },
                            price: {
                              type: 'number',
                              description: 'Current product price',
                            },
                            stock: { type: 'number' },
                          },
                        },
                        quantity: { type: 'number' },
                        expiryDate: { type: 'string', format: 'date-time' },
                        price: {
                          type: 'number',
                          description: 'Price at time of import',
                        },
                      },
                    },
                  },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'number' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  async findAll(@Query() filterDto: InventoryLogFilterDto) {
    try {
      const result = await this.inventoryLogsService.findAll(filterDto);
      return successResponse(result, 'Inventory logs retrieved successfully');
    } catch (error) {
      this.logger.error(`Failed to retrieve inventory logs: ${error.message}`);
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get pending inventory requests',
    description:
      'Retrieves all pending inventory requests that need admin approval',
  })
  @ApiOkResponse({
    description: 'Pending inventory requests retrieved successfully',
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiForbiddenResponse({ description: 'User does not have required roles' })
  async getPendingRequests() {
    try {
      const pendingLogs = await this.inventoryLogsService.getPendingRequests();
      return successResponse(
        pendingLogs,
        'Pending inventory requests retrieved successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to retrieve pending requests: ${error.message}`,
      );
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('product/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get inventory logs by product',
    description: 'Retrieves inventory logs for a specific product',
  })
  @ApiParam({ name: 'productId', description: 'Product ID to filter logs' })
  @ApiOkResponse({
    description: 'Product inventory logs retrieved successfully',
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async getByProduct(@Param('productId') productId: string) {
    try {
      const logs =
        await this.inventoryLogsService.getInventoryLogsByProduct(productId);
      return successResponse(
        logs,
        'Product inventory logs retrieved successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to retrieve product inventory logs: ${error.message}`,
      );
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get inventory logs by user',
    description: 'Retrieves inventory logs created by a specific user',
  })
  @ApiParam({ name: 'userId', description: 'User ID to filter logs' })
  @ApiOkResponse({ description: 'User inventory logs retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getByUser(@Param('userId') userId: string) {
    try {
      const logs =
        await this.inventoryLogsService.getInventoryLogsByUser(userId);
      return successResponse(
        logs,
        'User inventory logs retrieved successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to retrieve user inventory logs: ${error.message}`,
      );
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get inventory log by ID',
    description: 'Retrieves a specific inventory log by its ID',
  })
  @ApiParam({ name: 'id', description: 'Inventory log ID' })
  @ApiOkResponse({
    description: 'Inventory log retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            batch: { type: 'string' },
            action: { type: 'string', enum: ['import', 'export'] },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'denied'],
            },
            userId: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                fullName: { type: 'string' },
                email: { type: 'string' },
              },
            },
            reason: { type: 'string' },
            items: {
              type: 'array',
              description: 'Inventory log items with product details',
              items: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  inventoryLogId: { type: 'string' },
                  productId: {
                    type: 'object',
                    properties: {
                      _id: { type: 'string' },
                      productName: { type: 'string' },
                      price: {
                        type: 'number',
                        description: 'Current product price',
                      },
                      stock: { type: 'number' },
                    },
                  },
                  quantity: { type: 'number' },
                  expiryDate: { type: 'string', format: 'date-time' },
                  price: {
                    type: 'number',
                    description: 'Price at time of import',
                  },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Inventory log not found' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  async findOne(@Param('id') id: string) {
    try {
      const inventoryLog = await this.inventoryLogsService.findOne(id);
      return successResponse(
        inventoryLog,
        'Inventory log retrieved successfully',
      );
    } catch (error) {
      this.logger.error(`Failed to retrieve inventory log: ${error.message}`);
      return errorResponse(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Get(':id/items')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get inventory log items',
    description: 'Retrieves all items for a specific inventory log',
  })
  @ApiParam({ name: 'id', description: 'Inventory log ID' })
  @ApiOkResponse({
    description: 'Inventory log items retrieved successfully',
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
              inventoryLogId: { type: 'string' },
              productId: {
                type: 'object',
                properties: {
                  _id: { type: 'string' },
                  productName: { type: 'string' },
                  price: { type: 'number' },
                },
              },
              quantity: { type: 'number' },
              expiryDate: { type: 'string', format: 'date-time' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Inventory log not found' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  async getInventoryLogItems(@Param('id') id: string) {
    try {
      const items = await this.inventoryLogsService.getInventoryLogItems(id);
      return successResponse(
        items,
        'Inventory log items retrieved successfully',
      );
    } catch (error) {
      this.logger.error(
        `Failed to retrieve inventory log items: ${error.message}`,
      );
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  @Post(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Review inventory request',
    description:
      'Approve or reject a pending inventory request. When approved, stock levels will be updated automatically.',
  })
  @ApiParam({ name: 'id', description: 'Inventory Log ID' })
  @ApiBody({
    type: ReviewInventoryLogDto,
    description:
      'Review data with approval status and optional rejection reason',
  })
  @ApiOkResponse({
    description: 'Inventory request reviewed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            batch: { type: 'string' },
            action: { type: 'string', enum: ['import', 'export'] },
            status: { type: 'string', enum: ['completed', 'denied'] },
            userId: { type: 'string' },
            reason: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description:
      'Invalid request, inventory log already processed, or stock update failed',
  })
  @ApiNotFoundResponse({ description: 'Inventory log not found' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiForbiddenResponse({ description: 'User does not have required roles' })
  async reviewInventoryRequest(
    @Param('id') id: string,
    @Body() reviewDto: ReviewInventoryLogDto,
  ) {
    try {
      this.logger.debug(
        `Reviewing inventory request ${id} with data: ${JSON.stringify(reviewDto)}`,
      );
      const reviewedLog =
        await this.inventoryLogsService.reviewInventoryRequest(id, reviewDto);
      const action = reviewDto.approved ? 'approved' : 'rejected';
      return successResponse(
        reviewedLog,
        `Inventory request ${action} successfully`,
      );
    } catch (error) {
      this.logger.error(`Failed to review inventory request: ${error.message}`);
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('process-expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Process expired products',
    description:
      'Check for expired products and decrease their stock based on expiry date and quantity in inventory logs',
  })
  @ApiBody({
    description: 'Optional date to check against (defaults to current date)',
    required: false,
    schema: {
      type: 'object',
      properties: {
        checkDate: {
          type: 'string',
          format: 'date-time',
          description: 'Date to check against for expiry (ISO 8601 format)',
          example: '2024-01-15T00:00:00.000Z',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Expired products processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            processedItems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  productName: { type: 'string' },
                  expiredQuantity: { type: 'number' },
                  quantityRemoved: { type: 'number' },
                  currentStockBefore: { type: 'number' },
                  currentStockAfter: { type: 'number' },
                  expiredItems: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        itemId: { type: 'string' },
                        quantity: { type: 'number' },
                        expiryDate: { type: 'string', format: 'date-time' },
                        price: {
                          type: 'number',
                          description: 'Price at time of import',
                        },
                        inventoryLogId: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            totalExpiredItems: { type: 'number' },
            totalQuantityRemoved: { type: 'number' },
            summary: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  productName: { type: 'string' },
                  totalQuantityRemoved: { type: 'number' },
                },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Failed to process expired products',
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiForbiddenResponse({ description: 'User does not have required roles' })
  async processExpiredProducts(@Body() body?: { checkDate?: string }) {
    try {
      const checkDate = body?.checkDate ? new Date(body.checkDate) : undefined;
      this.logger.debug(
        `Processing expired products with check date: ${checkDate?.toISOString() || 'current date'}`,
      );

      const result =
        await this.inventoryLogsService.processExpiredProducts(checkDate);

      return successResponse(
        result,
        `Processed ${result.totalExpiredItems} expired items, removed ${result.totalQuantityRemoved} units from stock`,
      );
    } catch (error) {
      this.logger.error(`Failed to process expired products: ${error.message}`);
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('expired')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get expired products',
    description:
      'Get list of expired inventory log items without processing them (for reporting/preview)',
  })
  @ApiQuery({
    name: 'checkDate',
    required: false,
    type: 'string',
    format: 'date-time',
    description: 'Date to check against for expiry (ISO 8601 format)',
    example: '2024-01-15T00:00:00.000Z',
  })
  @ApiOkResponse({
    description: 'Expired products retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string' },
              productId: { type: 'string' },
              productName: { type: 'string' },
              quantity: { type: 'number' },
              expiryDate: { type: 'string', format: 'date-time' },
              price: { type: 'number', description: 'Price at time of import' },
              daysPastExpiry: { type: 'number' },
              inventoryLogInfo: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  batch: { type: 'string' },
                  status: { type: 'string' },
                  action: { type: 'string' },
                },
              },
              currentStock: { type: 'number' },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Failed to get expired products',
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiForbiddenResponse({ description: 'User does not have required roles' })
  async getExpiredProducts(@Query('checkDate') checkDate?: string) {
    try {
      const date = checkDate ? new Date(checkDate) : undefined;
      this.logger.debug(
        `Getting expired products with check date: ${date?.toISOString() || 'current date'}`,
      );

      const expiredProducts =
        await this.inventoryLogsService.getExpiredProducts(date);

      return successResponse(
        expiredProducts,
        `Found ${expiredProducts.length} expired inventory log items`,
      );
    } catch (error) {
      this.logger.error(`Failed to get expired products: ${error.message}`);
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Post('process-expired/manual')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Manually trigger expired products processing',
    description:
      'Manually trigger the automatic expired products processing for testing or immediate execution',
  })
  @ApiOkResponse({
    description: 'Manual processing triggered successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            result: {
              type: 'object',
              properties: {
                processedItems: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      productId: { type: 'string' },
                      productName: { type: 'string' },
                      expiredQuantity: { type: 'number' },
                      quantityRemoved: { type: 'number' },
                      currentStockBefore: { type: 'number' },
                      currentStockAfter: { type: 'number' },
                    },
                  },
                },
                totalExpiredItems: { type: 'number' },
                totalQuantityRemoved: { type: 'number' },
                summary: {
                  type: 'object',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      productName: { type: 'string' },
                      totalQuantityRemoved: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
        message: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Failed to process expired products',
  })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiForbiddenResponse({ description: 'User does not have required roles' })
  async triggerManualExpiredProductsProcessing() {
    try {
      this.logger.debug(
        'Manual expired products processing triggered by admin',
      );

      const result =
        await this.inventoryLogsService.triggerManualExpiredProductsProcessing();

      return successResponse(
        result,
        result.success
          ? result.message
          : 'Manual processing completed with errors',
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger manual expired products processing: ${error.message}`,
      );
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
