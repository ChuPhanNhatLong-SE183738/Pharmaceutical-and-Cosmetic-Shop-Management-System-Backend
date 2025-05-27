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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@Controller('inventory-logs')
export class InventoryLogsController {
  private readonly logger = new Logger(InventoryLogsController.name);
  constructor(private readonly inventoryLogsService: InventoryLogsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
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
  @ApiOperation({ summary: 'Review (approve/reject) an inventory request' })
  @ApiParam({ name: 'id', description: 'Inventory Log ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Inventory request reviewed successfully' })
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
