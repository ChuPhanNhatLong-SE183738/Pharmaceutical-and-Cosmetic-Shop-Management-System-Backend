import { Controller, Get, Post, Body, Param, UseGuards, Query, HttpStatus, Logger } from '@nestjs/common';
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
  ApiBadRequestResponse
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
  @ApiOperation({ summary: 'Create new inventory log', description: 'Create a new inventory log for importing or exporting products' })
  @ApiBody({ type: CreateInventoryLogDto, description: 'Inventory log data to be created' })
  @ApiCreatedResponse({ description: 'Inventory log created successfully' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiForbiddenResponse({ description: 'User does not have required roles' })
  @ApiBadRequestResponse({ description: 'Invalid request data' })
  async create(@Body() createInventoryLogDto: CreateInventoryLogDto) {
    try {
      const inventoryLog = await this.inventoryLogsService.create(createInventoryLogDto);
      return successResponse(inventoryLog, 'Inventory log created successfully', HttpStatus.CREATED);
    } catch (error) {
      this.logger.error(`Failed to create inventory log: ${error.message}`);
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all inventory logs', description: 'Retrieves all inventory logs with optional filtering' })
  @ApiQuery({ name: 'productId', required: false, type: String, description: 'Filter logs by product ID' })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'accepted', 'denied'], description: 'Filter logs by status' })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter logs by user ID' })
  @ApiOkResponse({ description: 'Inventory logs retrieved successfully' })
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
  @ApiOperation({ summary: 'Get pending inventory requests', description: 'Retrieves all pending inventory requests that need admin approval' })
  @ApiOkResponse({ description: 'Pending inventory requests retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiForbiddenResponse({ description: 'User does not have required roles' })
  async getPendingRequests() {
    try {
      const pendingLogs = await this.inventoryLogsService.getPendingRequests();
      return successResponse(pendingLogs, 'Pending inventory requests retrieved successfully');
    } catch (error) {
      this.logger.error(`Failed to retrieve pending requests: ${error.message}`);
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('product/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inventory logs by product', description: 'Retrieves inventory logs for a specific product' })
  @ApiParam({ name: 'productId', description: 'Product ID to filter logs' })
  @ApiOkResponse({ description: 'Product inventory logs retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async getByProduct(@Param('productId') productId: string) {
    try {
      const logs = await this.inventoryLogsService.getInventoryLogsByProduct(productId);
      return successResponse(logs, 'Product inventory logs retrieved successfully');
    } catch (error) {
      this.logger.error(`Failed to retrieve product inventory logs: ${error.message}`);
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inventory logs by user', description: 'Retrieves inventory logs created by a specific user' })
  @ApiParam({ name: 'userId', description: 'User ID to filter logs' })
  @ApiOkResponse({ description: 'User inventory logs retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async getByUser(@Param('userId') userId: string) {
    try {
      const logs = await this.inventoryLogsService.getInventoryLogsByUser(userId);
      return successResponse(logs, 'User inventory logs retrieved successfully');
    } catch (error) {
      this.logger.error(`Failed to retrieve user inventory logs: ${error.message}`);
      return errorResponse(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get inventory log by ID', description: 'Retrieves a specific inventory log by its ID' })
  @ApiParam({ name: 'id', description: 'Inventory log ID' })
  @ApiOkResponse({ description: 'Inventory log retrieved successfully' })
  @ApiNotFoundResponse({ description: 'Inventory log not found' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  async findOne(@Param('id') id: string) {
    try {
      const inventoryLog = await this.inventoryLogsService.findOne(id);
      return successResponse(inventoryLog, 'Inventory log retrieved successfully');
    } catch (error) {
      this.logger.error(`Failed to retrieve inventory log: ${error.message}`);
      return errorResponse(error.message, HttpStatus.NOT_FOUND);
    }
  }

  @Post(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Review inventory request', description: 'Approve or reject a pending inventory request' })
  @ApiParam({ name: 'id', description: 'Inventory Log ID' })
  @ApiBody({ type: ReviewInventoryLogDto, description: 'Review data with approval status and optional rejection reason' })
  @ApiOkResponse({ description: 'Inventory request reviewed successfully' })
  @ApiBadRequestResponse({ description: 'Invalid request or inventory log already processed' })
  @ApiNotFoundResponse({ description: 'Inventory log not found' })
  @ApiUnauthorizedResponse({ description: 'User not authenticated' })
  @ApiForbiddenResponse({ description: 'User does not have required roles' })
  async reviewInventoryRequest(
    @Param('id') id: string,
    @Body() reviewDto: ReviewInventoryLogDto,
  ) {
    try {
      this.logger.debug(`Reviewing inventory request ${id} with data: ${JSON.stringify(reviewDto)}`);
      const reviewedLog = await this.inventoryLogsService.reviewInventoryRequest(id, reviewDto);
      const action = reviewDto.approved ? 'approved' : 'rejected';
      return successResponse(
        reviewedLog, 
        `Inventory request ${action} successfully`
      );
    } catch (error) {
      this.logger.error(`Failed to review inventory request: ${error.message}`);
      return errorResponse(error.message, HttpStatus.BAD_REQUEST);
    }
  }
}
